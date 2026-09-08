# Contributing to Local topology planner

Thank you for helping make local-AI planning more reproducible. Data changes
are accepted through pull requests so every estimate, source, and benchmark can
be reviewed in public.

## What to contribute

- **Model artifacts:** exact upstream revision, runtime format, quantization,
  file size, supported context, license, and source URL.
- **Hardware presets:** exact SKU/configuration, usable accelerator memory,
  operating system/runtime assumptions, and manufacturer source URL.
- **Benchmark evidence:** exact artifact, runtime version and command,
  topology/link, context, parallelism, prompt/decode throughput, and failure
  notes.

Do not submit API keys, hostnames, IP addresses, private filesystem paths,
customer data, raw prompts, or unredacted logs.

## Catalog changes

Edit `data/catalog.v1.json`; do not edit `public/catalog/v1.json` by hand. The
generated file is checked into the repository so it can be served as static,
auditable data.

Every model and hardware record needs a stable `id`, a source URL, a confidence
level, and non-negative memory fields. Mark values as `estimated` unless an
exact reproducible measurement supports a stronger claim.

For mixed hardware, state which topology applies:

- `remote serving`: the Mac is a client/control machine; model memory remains
  on NVIDIA/DGX infrastructure.
- `request routing`: requests go to separate nodes; memories do not pool.
- `model sharding`: one model crosses nodes through an explicitly supported
  runtime and link.

## Verify your change

```bash
npm run catalog:build
npm run evidence:validate
npm run build
```

The catalog workflow runs the same checks in CI. If `catalog:build` changes a
generated file, include that file in your pull request.

## Benchmark evidence

Start from `public/evidence/template.v1.json`. Accepted records must name a
source-locked artifact revision, catalog hardware IDs, topology links, exact
runtime/backend, one-request workload, and measured prompt/decode throughput.
The validator rejects private paths and credential-like text in commands. A
measurement only verifies the exact artifact, topology links, runtime, and
context it records; a different context remains an inference.

## Licensing

Project code is intended for MIT licensing. First-party measurement records are
intended for CC0. Do not import data or benchmarks unless their license,
attribution, and redistribution terms permit it; preserve those terms in the
submission.
