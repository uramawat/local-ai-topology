import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../data/catalog.v1.json", import.meta.url);
const outputPath = new URL("../public/catalog/v1.json", import.meta.url);
const indexPath = new URL("../data/generated/catalog-index.json", import.meta.url);

const required = (record, fields, label) => {
  for (const field of fields) {
    if (record[field] === undefined || record[field] === "") throw new Error(`${label} is missing ${field}`);
  }
};

const unique = (items, label) => {
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new Error(`${label} contains duplicate ids`);
};

const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
const reviewDocument = JSON.parse(await readFile(new URL("../data/artifact-reviews.v1.json", import.meta.url), "utf8"));
required(catalog, ["schemaVersion", "catalogVersion", "generatedAt", "coverage", "models", "hardware"], "catalog");
if (!Array.isArray(catalog.models) || !Array.isArray(catalog.hardware)) throw new Error("models and hardware must be arrays");
unique(catalog.models, "models");
unique(catalog.hardware, "hardware");

for (const model of catalog.models) {
  required(model, ["id", "name", "family", "artifact", "format", "quantization", "weightGiB", "kvGiBAt8K", "confidence", "sourceUrl"], `model ${model.id ?? "unknown"}`);
  if (model.weightGiB <= 0 || model.kvGiBAt8K < 0) throw new Error(`model ${model.id} has invalid memory values`);
  if (!URL.canParse(model.sourceUrl)) throw new Error(`model ${model.id} has an invalid sourceUrl`);
}
for (const hardware of catalog.hardware) {
  required(hardware, ["id", "name", "chip", "kind", "usableGiB", "color", "confidence", "sourceUrl"], `hardware ${hardware.id ?? "unknown"}`);
  if (hardware.usableGiB <= 0) throw new Error(`hardware ${hardware.id} has invalid usableGiB`);
  if (!URL.canParse(hardware.sourceUrl)) throw new Error(`hardware ${hardware.id} has an invalid sourceUrl`);
}
if (catalog.coverage.modelArtifacts !== catalog.models.length || catalog.coverage.hardwarePresets !== catalog.hardware.length) {
  throw new Error("coverage counts must match the catalog");
}

const approvedReviews = new Map(reviewDocument.reviews.filter((review) => review.state === "approved").map((review) => [review.artifactId, review]));
const publishedCatalog = {
  ...catalog,
  models: catalog.models.map((model) => {
    const review = approvedReviews.get(model.id);
    if (!review) return { ...model, provenance: { state: "needs_review" } };
    return {
      ...model,
      provenance: {
        state: "approved",
        revision: review.source.revision,
        artifactUrl: review.source.artifactUrl,
        totalSizeBytes: review.files.reduce((sum, file) => sum + file.sizeBytes, 0),
        license: review.license.spdx,
        reviewedAt: review.reviewedAt,
      },
    };
  }),
};
const published = `${JSON.stringify(publishedCatalog, null, 2)}\n`;
const index = {
  schemaVersion: publishedCatalog.schemaVersion,
  catalogVersion: publishedCatalog.catalogVersion,
  generatedAt: publishedCatalog.generatedAt,
  coverage: { ...publishedCatalog.coverage, sourceLockedArtifacts: approvedReviews.size },
  families: [...new Set(publishedCatalog.models.map((model) => model.family))].sort(),
};
await mkdir(new URL("../public/catalog/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/generated/", import.meta.url), { recursive: true });
await writeFile(outputPath, published);
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Validated ${catalog.models.length} model artifacts and ${catalog.hardware.length} hardware presets.`);
