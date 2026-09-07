import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.v1.json", import.meta.url), "utf8"));
const evidence = JSON.parse(await readFile(new URL("../data/evidence.v1.json", import.meta.url), "utf8"));
const artifactIds = new Set(catalog.models.map((model) => model.id));
const hardwareIds = new Set(catalog.hardware.map((hardware) => hardware.id));

if (!Array.isArray(evidence.records)) throw new Error("evidence.records must be an array");
for (const record of evidence.records) {
  for (const field of ["id", "artifactId", "topology", "runtime", "contextTokens", "promptTokensPerSecond", "decodeTokensPerSecond", "recordedAt", "confidence"]) {
    if (record[field] === undefined) throw new Error(`evidence ${record.id ?? "unknown"} is missing ${field}`);
  }
  if (!artifactIds.has(record.artifactId)) throw new Error(`evidence ${record.id} references an unknown artifact`);
  if (!record.topology.nodeIds.every((id) => hardwareIds.has(id))) throw new Error(`evidence ${record.id} references unknown hardware`);
  if (record.confidence !== "verified") throw new Error(`evidence ${record.id} must be verified`);
  if (record.contextTokens <= 0 || record.promptTokensPerSecond < 0 || record.decodeTokensPerSecond < 0) throw new Error(`evidence ${record.id} has invalid measurements`);
}
console.log(`Validated ${evidence.records.length} evidence records.`);
