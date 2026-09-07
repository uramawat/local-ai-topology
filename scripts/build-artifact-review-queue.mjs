import { mkdir, readFile, writeFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.v1.json", import.meta.url), "utf8"));
const reviewDocument = JSON.parse(await readFile(new URL("../data/artifact-reviews.v1.json", import.meta.url), "utf8"));
const policy = JSON.parse(await readFile(new URL("../data/license-policy.v1.json", import.meta.url), "utf8"));
const states = new Set(policy.policy.allowedReviewStates);
const modelIds = new Set(catalog.models.map((model) => model.id));
const reviewsByArtifact = new Map();

for (const review of reviewDocument.reviews) {
  if (!review.artifactId || !modelIds.has(review.artifactId)) throw new Error(`Review points to an unknown artifact: ${review.artifactId}`);
  if (!states.has(review.state)) throw new Error(`Review ${review.artifactId} has an unsupported state`);
  if (reviewsByArtifact.has(review.artifactId)) throw new Error(`Artifact ${review.artifactId} has more than one review record`);
  if (!review.reviewedAt || Number.isNaN(Date.parse(review.reviewedAt))) throw new Error(`Review ${review.artifactId} has an invalid reviewedAt timestamp`);
  if (!review.source || !review.license) throw new Error(`Review ${review.artifactId} must include source and license data`);
  if (!URL.canParse(review.source.artifactUrl) || !URL.canParse(review.license.sourceUrl)) throw new Error(`Review ${review.artifactId} contains an invalid source URL`);
  if (review.state === "approved") {
    if (!review.source.revision || review.source.revision.length < 7) throw new Error(`Approved artifact ${review.artifactId} needs an immutable source revision`);
    if (!Array.isArray(review.files) || review.files.length === 0 || review.files.some((file) => !file.path || !Number.isInteger(file.sizeBytes) || file.sizeBytes <= 0)) throw new Error(`Approved artifact ${review.artifactId} needs exact files and byte sizes`);
    if (review.license.status !== "reviewed") throw new Error(`Approved artifact ${review.artifactId} needs a reviewed license`);
  }
  reviewsByArtifact.set(review.artifactId, review);
}

const missingFor = (review) => {
  if (!review) return ["review record", "immutable revision", "exact file list", "license decision"];
  const missing = [];
  if (!review.source.revision) missing.push("immutable revision");
  if (!Array.isArray(review.files) || review.files.length === 0) missing.push("exact file list");
  if (review.license.status !== "reviewed") missing.push("reviewed license");
  return missing;
};

const queue = catalog.models.map((model) => {
  const review = reviewsByArtifact.get(model.id);
  const state = review?.state ?? "needs_review";
  return {
    artifactId: model.id,
    name: model.name,
    format: model.format,
    sourceUrl: model.sourceUrl,
    state,
    missing: state === "approved" ? [] : missingFor(review),
    reviewedAt: review?.reviewedAt ?? null,
  };
});
const counts = Object.fromEntries([...states].map((state) => [state, queue.filter((item) => item.state === state).length]));
const output = { schemaVersion: "1.0.0", generatedAt: catalog.generatedAt, policyVersion: reviewDocument.policyVersion, counts, queue };
await mkdir(new URL("../data/generated/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/generated/artifact-review-queue.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Validated ${reviewDocument.reviews.length} artifact review records; ${counts.approved} approved and ${counts.needs_review} awaiting review.`);
