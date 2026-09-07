export type ModelArtifact = {
  id: string;
  name: string;
  family: string;
  artifact: string;
  weights: number;
  kv: number;
  badge: string;
};

export type HardwarePreset = {
  id: string;
  name: string;
  chip: string;
  kind: "Apple Silicon" | "NVIDIA CUDA";
  usable: number;
  color: "lime" | "cyan" | "violet";
};

// Seed catalog: estimates are versioned here until artifact manifests and
// measured benchmark records replace them.
export const modelCatalog: ModelArtifact[] = [
  { id: "gemma3-4b", name: "Gemma 3 4B", family: "Google Gemma", artifact: "GGUF · Q4_K_M", weights: 3.1, kv: 0.6, badge: "compact" },
  { id: "gemma3-12b", name: "Gemma 3 12B", family: "Google Gemma", artifact: "GGUF · Q4_K_M", weights: 7.7, kv: 1.0, badge: "vision-ready" },
  { id: "gemma27", name: "Gemma 3 27B", family: "Google Gemma", artifact: "GGUF · Q4_K_M", weights: 17.1, kv: 1.7, badge: "vision-ready" },
  { id: "gptoss20", name: "gpt-oss 20B", family: "OpenAI gpt-oss", artifact: "GGUF · MXFP4", weights: 12.5, kv: 1.2, badge: "reasoning" },
  { id: "gptoss120", name: "gpt-oss 120B", family: "OpenAI gpt-oss", artifact: "GGUF · MXFP4", weights: 65.2, kv: 2.1, badge: "frontier class" },
  { id: "llama31-8b", name: "Llama 3.1 8B", family: "Meta Llama", artifact: "GGUF · Q4_K_M", weights: 5.0, kv: 0.8, badge: "general" },
  { id: "llama33-70b", name: "Llama 3.3 70B", family: "Meta Llama", artifact: "GGUF · Q4_K_M", weights: 42.5, kv: 2.0, badge: "large" },
  { id: "mistral-nemo", name: "Mistral Nemo 12B", family: "Mistral", artifact: "GGUF · Q4_K_M", weights: 7.5, kv: 1.0, badge: "efficient" },
  { id: "mistral-small", name: "Mistral Small 3.1 24B", family: "Mistral", artifact: "GGUF · Q4_K_M", weights: 15.0, kv: 1.6, badge: "vision-ready" },
  { id: "ministral-8b", name: "Ministral 8B", family: "Mistral", artifact: "GGUF · Q4_K_M", weights: 5.1, kv: 0.8, badge: "compact" },
  { id: "qwen25coder-7b", name: "Qwen2.5-Coder 7B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 4.6, kv: 0.8, badge: "code" },
  { id: "qwen25coder-14b", name: "Qwen2.5-Coder 14B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 9.0, kv: 1.1, badge: "code" },
  { id: "qwen25coder-32b", name: "Qwen2.5-Coder 32B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 20.3, kv: 1.4, badge: "code" },
  { id: "qwen3-4b", name: "Qwen3 4B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 2.9, kv: 0.6, badge: "compact" },
  { id: "qwen3-8b", name: "Qwen3 8B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 5.2, kv: 0.8, badge: "general" },
  { id: "qwen3-14b", name: "Qwen3 14B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 9.0, kv: 1.1, badge: "general" },
  { id: "qwen32", name: "Qwen3 32B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 20.3, kv: 1.4, badge: "balanced" },
  { id: "qwen235", name: "Qwen3 235B-A22B", family: "Qwen", artifact: "GGUF · Q4_K_M", weights: 130.8, kv: 2.6, badge: "large MoE" },
  { id: "deepseek-r1-14b", name: "DeepSeek-R1-Distill-Qwen 14B", family: "DeepSeek", artifact: "GGUF · Q4_K_M", weights: 9.0, kv: 1.1, badge: "reasoning" },
  { id: "deepseek-r1-32b", name: "DeepSeek-R1-Distill-Qwen 32B", family: "DeepSeek", artifact: "GGUF · Q4_K_M", weights: 20.3, kv: 1.4, badge: "reasoning" },
];

// These are editable seed presets—not a claim that a Mac/NVIDIA mix pools
// memory by default.
export const hardwareCatalog: HardwarePreset[] = [
  { id: "mac-mini-m4", name: "Mac mini", chip: "M4 · 24 GB", kind: "Apple Silicon", usable: 19, color: "cyan" },
  { id: "mac-mini-m4-pro", name: "Mac mini", chip: "M4 Pro · 64 GB", kind: "Apple Silicon", usable: 58, color: "cyan" },
  { id: "mbp-m3-max", name: "MacBook Pro", chip: "M3 Max · 128 GB", kind: "Apple Silicon", usable: 120, color: "cyan" },
  { id: "mbp-m4-max", name: "MacBook Pro", chip: "M4 Max · 64 GB", kind: "Apple Silicon", usable: 58, color: "cyan" },
  { id: "mac-studio-m2-ultra", name: "Mac Studio", chip: "M2 Ultra · 192 GB", kind: "Apple Silicon", usable: 184, color: "lime" },
  { id: "mac-studio-m3-ultra", name: "Mac Studio", chip: "M3 Ultra · 192 GB", kind: "Apple Silicon", usable: 184, color: "lime" },
  { id: "mac-studio-m3-ultra-512", name: "Mac Studio", chip: "M3 Ultra · 512 GB", kind: "Apple Silicon", usable: 500, color: "lime" },
  { id: "rtx-3090", name: "RTX workstation", chip: "RTX 3090 · 24 GB", kind: "NVIDIA CUDA", usable: 21, color: "violet" },
  { id: "rtx-4090", name: "RTX workstation", chip: "RTX 4090 · 24 GB", kind: "NVIDIA CUDA", usable: 21, color: "violet" },
  { id: "rtx-5090", name: "RTX workstation", chip: "RTX 5090 · 32 GB", kind: "NVIDIA CUDA", usable: 29, color: "violet" },
  { id: "rtx-6000-ada", name: "RTX workstation", chip: "RTX 6000 Ada · 48 GB", kind: "NVIDIA CUDA", usable: 44, color: "violet" },
];

export const starterTopology = [
  hardwareCatalog.find((item) => item.id === "mac-studio-m3-ultra")!,
  hardwareCatalog.find((item) => item.id === "mbp-m4-max")!,
  hardwareCatalog.find((item) => item.id === "rtx-5090")!,
];
