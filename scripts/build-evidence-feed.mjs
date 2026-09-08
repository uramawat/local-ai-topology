import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../data/evidence.v1.json", import.meta.url), "utf8"));
const publicPath = new URL("../public/evidence/v1.json", import.meta.url);
const indexPath = new URL("../data/generated/evidence-index.v1.json", import.meta.url);
const records = [...source.records].sort((a, b) => a.id.localeCompare(b.id));
await mkdir(new URL("../public/evidence/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/generated/", import.meta.url), { recursive: true });
await writeFile(publicPath, `${JSON.stringify({ schemaVersion: source.schemaVersion, records }, null, 2)}\n`);
await writeFile(indexPath, `${JSON.stringify({ schemaVersion: source.schemaVersion, recordCount: records.length, acceptedRecords: records.filter((record) => record.review.status === "accepted").length }, null, 2)}\n`);
console.log(`Published ${records.length} accepted evidence records.`);
