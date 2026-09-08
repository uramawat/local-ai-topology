export type CatalogModel = {
  id: string;
  name: string;
  family: string;
  artifact: string;
  format: "gguf" | "mlx";
  quantization: string;
  weightGiB: number;
  kvGiBAt8K: number;
  confidence: "estimated" | "inferred" | "verified";
  sourceUrl: string;
  provenance?: {
    state: "approved" | "needs_review";
    revision?: string;
    artifactUrl?: string;
    totalSizeBytes?: number;
    license?: string | null;
    reviewedAt?: string;
  };
};

export type CatalogHardware = {
  id: string;
  name: string;
  chip: string;
  kind: "Apple Silicon" | "NVIDIA CUDA";
  usableGiB: number;
  color: "lime" | "cyan" | "violet";
  confidence: "estimated" | "inferred" | "verified";
  sourceUrl: string;
};

export type Catalog = {
  schemaVersion: string;
  catalogVersion: string;
  generatedAt: string;
  coverage: { modelArtifacts: number; hardwarePresets: number; targetModelArtifacts: number; status: string };
  models: CatalogModel[];
  hardware: CatalogHardware[];
};

export type EvidenceRecord = {
  id: string;
  artifact: { id: string; revision: string; fileName?: string };
  topology: { nodeIds: string[]; mode: "single" | "mlx" | "rpc" | "remote"; links: string[]; allocation: string };
  runtime: { name: string; version: string; backend: string; command: string };
  workload: { contextTokens: number; parallelRequests: number; warmupRuns: number; measuredRuns: number };
  metrics: { promptTokensPerSecond: number; decodeTokensPerSecond: number; timeToFirstTokenMs?: number; peakMemoryGiBByNode?: Record<string, number> };
  outcome: "success";
  recordedAt: string;
  provenance: { license: "CC0-1.0"; attestation: string };
  review: { status: "accepted"; reviewedAt: string };
};

export type EvidenceFeed = { schemaVersion: string; records: EvidenceRecord[] };

const isCatalog = (value: unknown): value is Catalog => {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<Catalog>;
  return Array.isArray(catalog.models) && Array.isArray(catalog.hardware) && typeof catalog.catalogVersion === "string";
};

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const url = process.env.NEXT_PUBLIC_CATALOG_URL ?? "/catalog/v1.json";
  const response = await fetch(url, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  const catalog: unknown = await response.json();
  if (!isCatalog(catalog)) throw new Error("Catalog response does not match the expected schema");
  return catalog;
}

export async function loadEvidence(signal?: AbortSignal): Promise<EvidenceFeed> {
  const response = await fetch("/evidence/v1.json", { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`Evidence request failed (${response.status})`);
  const feed: unknown = await response.json();
  if (!feed || typeof feed !== "object" || !Array.isArray((feed as Partial<EvidenceFeed>).records)) throw new Error("Evidence response does not match the expected schema");
  return feed as EvidenceFeed;
}

export const starterTopology = (catalog: Catalog): CatalogHardware[] => {
  const preferred = catalog.hardware.find((item) => item.id === "mac-studio-m3-ultra-192");
  return preferred ? [preferred] : catalog.hardware.slice(0, 1);
};
