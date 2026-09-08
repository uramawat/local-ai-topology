# Local topology planner

An open-source planning tool for running open-weight AI models on hardware you
actually own. It answers a question a VRAM calculator cannot: **which machines
can run a specific model together, by which execution path, and with what
confidence?**

The planner is deliberately topology-aware. A cluster is not automatically one
large memory pool, and a Mac attached to a remote NVIDIA server is not model
sharding. Every result keeps weights, KV cache, runtime reserve, network
assumptions, and evidence level visible.

## What it covers

- Apple Silicon single-node inference and Mac clusters
- Experimental Mac + NVIDIA execution paths, with their caveats surfaced
- Mac as a development/control machine with inference served remotely by NVIDIA
  or DGX hardware
- Agent/request routing, where more nodes increase concurrency but do not pool
  model memory
- Exact model artifacts, quantizations, context targets, and usable-memory
  estimates rather than parameter-count-only recommendations

The current UI is an MVP. Its catalog is a versioned seed dataset—not an
authoritative benchmark database—so estimates are labelled as estimates until a
reproducible record supports them.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` to verify a production build.

## Project layout

- `app/page.tsx` — interactive planner UI and transparent calculation logic
- `data/catalog.v1.json` — source-of-truth, versioned catalog data
- `scripts/build-catalog.mjs` — schema checks and public-catalog generator
- `data/artifact-reviews.v1.json` — source-lock and license-review records; empty is intentional until an exact artifact is reviewed
- `data/generated/artifact-review-queue.v1.json` — generated queue of seed artifacts awaiting immutable file, revision, and license review
- `public/catalog/v1.json` — generated file fetched by the planner at runtime
- `data/evidence.v1.json` — reviewed, reproducible benchmark records
- `public/evidence/v1.json` — generated public evidence feed used by the planner
- `work/DESIGN_SPEC.md` — product/design decisions
- `work/IMPLEMENTATION_SPEC.md` — data model and implementation plan

## Contributing

Contributions are most useful when they make a recommendation more
reproducible—not just more optimistic. The in-product starting point is the
[Contribute section of the planner](https://local-topology-planner.q5tynhntkd.chatgpt.site/#contribute).

You can contribute one of three things:

1. **Artifact metadata** — model revision, runtime format, quantization, weight
   size, and context assumptions.
2. **Hardware presets** — exact machine/GPU configuration, available memory,
   OS/runtime version, and link type where relevant.
3. **Benchmark evidence** — a sanitized, reproducible run with topology,
   command/runtime, model artifact, context, prompt/decode throughput, and any
   failure notes.

For a benchmark record, include the exact configuration and method used, keep
credentials and private host details out of the submission, and distinguish
measured results from estimates. For a heterogeneous topology, explicitly say
whether it is remote serving, request routing, or true model sharding; those
are different claims.

Use the full field guide in [CONTRIBUTING.md](CONTRIBUTING.md). Before opening a pull request, run:

```bash
npm run build
```

Artifact entries start as candidates. They only become source-locked after a
review records the immutable upstream revision, exact selected files and byte
sizes, and the upstream license decision. The target of 200 is a candidate
coverage target, not a promise that 200 artifacts have already been verified.

Benchmark records are deliberately stricter: a `verified` result requires the
same approved artifact revision, mode, hardware IDs, execution links, runtime,
and context target. A related run at another context is labelled `inferred`;
without a match, performance remains an estimate.

Code is licensed under [MIT](LICENSE). First-party measurement records are
dedicated under [CC0](LICENSE-DATA); imported data retains its original license
and attribution.

## Scope and safety notes

The planner does not treat separate machines as pooled memory unless the chosen
runtime and topology genuinely support sharding. In particular, a Mac used for
coding while a DGX/NVIDIA machine serves the model contributes client-side
latency and orchestration—not model capacity. Treat hardware recommendations as
planning input, then validate them with the exact artifact and runtime before a
purchase.
