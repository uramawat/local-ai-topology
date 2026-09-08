import { mkdir, readFile, writeFile } from "node:fs/promises";

const dueOnly = process.argv.includes("--due-only");
const force = process.env.CATALOG_REFRESH_FORCE === "1";
const isoWeek = (date) => {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
};
if (dueOnly && !force && isoWeek(new Date()) % 2 !== 0) {
  console.log("Skipping source refresh: next scheduled biweekly window has not arrived.");
  process.exit(0);
}

const catalog = JSON.parse(await readFile(new URL("../data/catalog.v1.json", import.meta.url), "utf8"));
const watchlist = JSON.parse(await readFile(new URL("../data/discovery-watchlist.v1.json", import.meta.url), "utf8"));
const uniqueSources = [...new Set(catalog.models.map((model) => model.sourceUrl).filter((url) => url.includes("huggingface.co/")))];
const repositoryIds = uniqueSources.map((url) => new URL(url).pathname.split("/").filter(Boolean).slice(0, 2).join("/"));
const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { "user-agent": "local-ai-topology-catalog-refresh" } });
  if (!response.ok) throw new Error(`Hugging Face request failed (${response.status}) for ${url}`);
  return response.json();
};
const records = await Promise.all(repositoryIds.map(async (repositoryId) => {
  const model = await fetchJson(`https://huggingface.co/api/models/${repositoryId}`);
  return { repositoryId, sha: model.sha ?? null, lastModified: model.lastModified ?? null, libraryName: model.library_name ?? null, license: model.cardData?.license ?? null, fetchedAt: new Date().toISOString() };
}));
const familyMatchers = watchlist.families.map((entry) => ({ ...entry, expression: new RegExp(entry.match, "i") }));
const owners = [...new Set([...watchlist.families.flatMap((entry) => entry.upstreamOwners), ...watchlist.conversionOwners])];
const discovery = (await Promise.all(owners.map(async (owner) => {
  const models = await fetchJson(`https://huggingface.co/api/models?author=${encodeURIComponent(owner)}&sort=lastModified&direction=-1&limit=${watchlist.perOwnerLimit}`);
  return models.flatMap((model) => {
    const family = familyMatchers.find((entry) => entry.expression.test(model.id));
    if (!family) return [];
    return [{ family: family.family, repositoryId: model.id, revision: model.sha ?? null, lastModified: model.lastModified ?? null, libraryName: model.library_name ?? null, license: model.cardData?.license ?? null, artifactType: watchlist.conversionOwners.includes(owner) ? "conversion_candidate" : "upstream_candidate", sourceUrl: `https://huggingface.co/${model.id}` }];
  });
}))).flat().sort((a, b) => a.family.localeCompare(b.family) || a.repositoryId.localeCompare(b.repositoryId));
await mkdir(new URL("../data/imported/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/imported/huggingface-metadata.v1.json", import.meta.url), `${JSON.stringify({ schemaVersion: "1.0.0", records }, null, 2)}\n`);
await writeFile(new URL("../data/imported/huggingface-discovery.v1.json", import.meta.url), `${JSON.stringify({ schemaVersion: "1.0.0", fetchedAt: new Date().toISOString(), policy: watchlist.policy, candidates: discovery }, null, 2)}\n`);
console.log(`Refreshed ${records.length} known repositories and discovered ${discovery.length} review candidates.`);
