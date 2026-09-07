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

const isCatalog = (value: unknown): value is Catalog => {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<Catalog>;
  return Array.isArray(catalog.models) && Array.isArray(catalog.hardware) && typeof catalog.catalogVersion === "string";
};

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const url = process.env.NEXT_PUBLIC_CATALOG_URL ?? "/catalog/v1.json";
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  const catalog: unknown = await response.json();
  if (!isCatalog(catalog)) throw new Error("Catalog response does not match the expected schema");
  return catalog;
}

export const starterTopology = (catalog: Catalog): CatalogHardware[] => {
  const ids = ["mac-studio-m3-ultra-192", "macbook-pro-m4-max-64", "rtx-5090-32"];
  const selected = ids.map((id) => catalog.hardware.find((item) => item.id === id)).filter((item): item is CatalogHardware => Boolean(item));
  return selected.length === ids.length ? selected : catalog.hardware.slice(0, 3);
};
