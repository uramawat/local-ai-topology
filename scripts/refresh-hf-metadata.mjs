import { mkdir, readFile, writeFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.v1.json", import.meta.url), "utf8"));
const uniqueSources = [...new Set(catalog.models.map((model) => model.sourceUrl).filter((url) => url.includes("huggingface.co/")))];
const repositoryIds = uniqueSources.map((url) => new URL(url).pathname.split("/").filter(Boolean).slice(0, 2).join("/"));
const records = await Promise.all(repositoryIds.map(async (repositoryId) => {
  const response = await fetch(`https://huggingface.co/api/models/${repositoryId}`);
  if (!response.ok) throw new Error(`Hugging Face metadata request failed for ${repositoryId} (${response.status})`);
  const model = await response.json();
  return { repositoryId, sha: model.sha ?? null, lastModified: model.lastModified ?? null, libraryName: model.library_name ?? null, license: model.cardData?.license ?? null, fetchedAt: new Date().toISOString() };
}));
await mkdir(new URL("../data/imported/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/imported/huggingface-metadata.v1.json", import.meta.url), `${JSON.stringify({ schemaVersion: "1.0.0", records }, null, 2)}\n`);
console.log(`Refreshed metadata for ${records.length} source repositories.`);
