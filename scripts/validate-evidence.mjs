import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.v1.json", import.meta.url), "utf8"));
const reviews = JSON.parse(await readFile(new URL("../data/artifact-reviews.v1.json", import.meta.url), "utf8"));
const evidence = JSON.parse(await readFile(new URL("../data/evidence.v1.json", import.meta.url), "utf8"));
const artifactIds = new Set(catalog.models.map((model) => model.id));
const hardware = new Map(catalog.hardware.map((item) => [item.id, item]));
const revisions = new Map(reviews.reviews.filter((review) => review.state === "approved").map((review) => [review.artifactId, review.source.revision]));
const required = (value, fields, label) => fields.forEach((field) => { if (value?.[field] === undefined || value[field] === "") throw new Error(`${label} is missing ${field}`); });
const validDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const sensitive = /(?:api[_-]?key|authorization|bearer\s|token\s*=|password\s*=|\/Users\/|\/home\/)/i;

if (evidence.schemaVersion !== "1.1.0") throw new Error("evidence.schemaVersion must be 1.1.0");
if (!Array.isArray(evidence.records)) throw new Error("evidence.records must be an array");
const ids = new Set();
for (const record of evidence.records) {
  required(record, ["id", "artifact", "topology", "runtime", "workload", "metrics", "outcome", "recordedAt", "provenance", "review"], "evidence record");
  if (!/^[a-z0-9-]+$/.test(record.id) || ids.has(record.id)) throw new Error(`evidence record has invalid or duplicate id ${record.id}`);
  ids.add(record.id);
  required(record.artifact, ["id", "revision"], `evidence ${record.id}.artifact`);
  if (!artifactIds.has(record.artifact.id)) throw new Error(`evidence ${record.id} references an unknown artifact`);
  if (revisions.get(record.artifact.id) !== record.artifact.revision) throw new Error(`evidence ${record.id} must use an approved artifact revision`);
  required(record.topology, ["nodeIds", "mode", "links", "allocation"], `evidence ${record.id}.topology`);
  if (!Array.isArray(record.topology.nodeIds) || !record.topology.nodeIds.length || new Set(record.topology.nodeIds).size !== record.topology.nodeIds.length || !record.topology.nodeIds.every((id) => hardware.has(id))) throw new Error(`evidence ${record.id} has invalid topology nodes`);
  if (!["single", "mlx", "rpc", "remote"].includes(record.topology.mode) || !Array.isArray(record.topology.links)) throw new Error(`evidence ${record.id} has invalid topology`);
  if (!record.topology.links.every((link) => typeof link === "string" && link.split("::").length === 2 && link.split("::").every((id) => record.topology.nodeIds.includes(id)))) throw new Error(`evidence ${record.id} has invalid topology links`);
  required(record.runtime, ["name", "version", "backend", "command"], `evidence ${record.id}.runtime`);
  if (sensitive.test(record.runtime.command)) throw new Error(`evidence ${record.id} command includes sensitive or private data`);
  required(record.workload, ["contextTokens", "parallelRequests", "warmupRuns", "measuredRuns"], `evidence ${record.id}.workload`);
  if (!Number.isInteger(record.workload.contextTokens) || record.workload.contextTokens < 1 || !Number.isInteger(record.workload.parallelRequests) || record.workload.parallelRequests < 1 || !Number.isInteger(record.workload.warmupRuns) || record.workload.warmupRuns < 0 || !Number.isInteger(record.workload.measuredRuns) || record.workload.measuredRuns < 1) throw new Error(`evidence ${record.id} has invalid workload`);
  required(record.metrics, ["promptTokensPerSecond", "decodeTokensPerSecond"], `evidence ${record.id}.metrics`);
  if (![record.metrics.promptTokensPerSecond, record.metrics.decodeTokensPerSecond, record.metrics.timeToFirstTokenMs].filter((value) => value !== undefined).every((value) => typeof value === "number" && value >= 0)) throw new Error(`evidence ${record.id} has invalid measurements`);
  if (record.metrics.peakMemoryGiBByNode && !Object.entries(record.metrics.peakMemoryGiBByNode).every(([id, value]) => record.topology.nodeIds.includes(id) && typeof value === "number" && value >= 0 && value <= hardware.get(id).usableGiB)) throw new Error(`evidence ${record.id} has invalid peak-memory measurements`);
  if (record.outcome !== "success" || record.provenance?.license !== "CC0-1.0" || record.review?.status !== "accepted" || !validDate(record.recordedAt) || !validDate(record.review.reviewedAt)) throw new Error(`evidence ${record.id} is not an accepted, attributable result`);
}
console.log(`Validated ${evidence.records.length} evidence records.`);
