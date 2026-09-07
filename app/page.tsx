"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCatalog, starterTopology } from "./catalog";

type Mode = "single" | "mlx" | "rpc" | "remote";

const modes: Array<{ id: Mode; label: string; note: string }> = [
  { id: "single", label: "One node", note: "Best interactive latency" },
  { id: "mlx", label: "Mac cluster", note: "MLX distributed inference" },
  { id: "rpc", label: "Mac + NVIDIA", note: "llama.cpp RPC · experimental" },
  { id: "remote", label: "Remote NVIDIA", note: "Mac client · NVIDIA serves" },
];

const memory = (n: number) => `${n.toFixed(n >= 100 ? 0 : 1)} GiB`;
const tokenCount = (thousands: number) => thousands >= 1000 ? `${(thousands / 1000).toFixed(thousands >= 10_000 ? 0 : 1)}M` : `${Math.round(thousands)}K`;

export default function Home() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadCatalog>> | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [modelId, setModelId] = useState("");
  const [mode, setMode] = useState<Mode>("rpc");
  const [context, setContext] = useState(32768);
  const [hasFastLink, setHasFastLink] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [allocationMode, setAllocationMode] = useState<"auto" | "manual">("auto");
  const [manualShares, setManualShares] = useState<Record<string, number>>({});
  const [topologyIds, setTopologyIds] = useState(["mac-studio-m3-ultra-192", "macbook-pro-m4-max-64", "rtx-5090-32"]);
  const [hardwareToAdd, setHardwareToAdd] = useState("");
  const [artifactFormat, setArtifactFormat] = useState<"all" | "gguf" | "mlx">("all");
  const [modelQuery, setModelQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then((nextCatalog) => {
        setCatalog(nextCatalog);
        setModelId((currentId) => currentId || nextCatalog.models.find((item) => item.id === "gpt-oss-120b-gguf-mxfp4")?.id || nextCatalog.models[0]?.id || "");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogError(error instanceof Error ? error.message : "Catalog could not be loaded");
      });
    return () => controller.abort();
  }, []);

  const nodes = useMemo(() => {
    if (!catalog) return [];
    const selected = topologyIds.map((id) => catalog.hardware.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    return selected.length ? selected : starterTopology(catalog);
  }, [catalog, topologyIds]);
  const visibleModels = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    return catalog?.models.filter((item) => {
      const matchesFormat = artifactFormat === "all" || item.format === artifactFormat;
      const matchesQuery = !query || [item.name, item.family, item.artifact, item.quantization].some((value) => value.toLowerCase().includes(query));
      return matchesFormat && matchesQuery;
    }) ?? [];
  }, [artifactFormat, catalog, modelQuery]);
  useEffect(() => {
    if (visibleModels.length && !visibleModels.some((item) => item.id === modelId)) setModelId(visibleModels[0].id);
  }, [modelId, visibleModels]);
  const model = catalog?.models.find((item) => item.id === modelId) ?? catalog?.models[0];
  const result = useMemo(() => {
    if (!model || nodes.length === 0) return null;
    const cache = model.kvGiBAt8K * (context / 8192);
    const runtime = mode === "single" ? 2.4 : 4.8;
    const required = model.weightGiB + cache + runtime;
    const selectedNodes =
      mode === "single"
        ? [nodes[0]]
        : mode === "mlx"
          ? nodes.filter((node) => node.kind === "Apple Silicon")
        : mode === "rpc"
            ? nodes
            : mode === "remote"
              ? nodes.filter((node) => node.kind === "NVIDIA CUDA")
            : nodes;
    const capacity = selectedNodes.reduce((sum, node) => sum + node.usableGiB, 0);
    const hasApple = selectedNodes.some((node) => node.kind === "Apple Silicon");
    const hasNvidia = selectedNodes.some((node) => node.kind === "NVIDIA CUDA");
    const compatibility = mode === "mlx"
      ? model.format === "mlx" && selectedNodes.length >= 2
        ? { supported: true, note: "MLX artifact across Apple Silicon nodes" }
        : { supported: false, note: "Mac cluster requires an MLX artifact and at least two Apple Silicon nodes" }
      : mode === "rpc"
        ? model.format === "gguf" && hasApple && hasNvidia
          ? { supported: true, note: "GGUF via experimental llama.cpp RPC" }
          : { supported: false, note: "Mac + NVIDIA requires GGUF plus both Apple Silicon and NVIDIA nodes" }
        : mode === "remote"
          ? model.format === "gguf" && hasNvidia
            ? { supported: true, note: "NVIDIA serves; Macs remain client/control nodes" }
            : { supported: false, note: "Remote NVIDIA serving requires a GGUF artifact and an NVIDIA serving node" }
        : { supported: true, note: "Single-node artifact path" };
    const fits = compatibility.supported && required <= capacity;
    const exact = "estimated";
    const risk = !compatibility.supported ? "Unsupported artifact/topology pair" : mode === "rpc" ? "Experimental runtime path" : mode === "remote" ? "Remote-serving latency" : hasFastLink ? "Low topology risk" : "Network constrained";
    const speedBase = mode === "single" ? 33 : mode === "mlx" ? 46 : mode === "remote" ? 26 : hasFastLink ? 22 : 8;
    const speed = Math.max(3, speedBase - Math.max(0, (model.weightGiB - 20) / 9) - (context / 32768) * 2);
    return { cache, runtime, required, capacity, fits, exact, risk, speed, selectedNodes, compatibility };
  }, [context, hasFastLink, mode, model, nodes]);

  const allocation = useMemo(() => {
    if (!result) return [];
    const shareTotal = result.selectedNodes.reduce((sum, node) => sum + (allocationMode === "manual" ? manualShares[node.id] ?? 0 : node.usableGiB), 0);
    return result.selectedNodes.map((node) => {
      const share = allocationMode === "manual" ? manualShares[node.id] ?? 0 : node.usableGiB;
      return { ...node, amount: shareTotal > 0 ? result.required * (share / shareTotal) : 0, share: shareTotal > 0 ? share / shareTotal * 100 : 0 };
    });
  }, [allocationMode, manualShares, result]);
  const allocationTotal = allocation.reduce((sum, node) => sum + node.amount, 0);
  const allocationFits = allocation.length > 0 && Math.abs(allocationTotal - (result?.required ?? 0)) < 0.01 && allocation.every((node) => node.amount <= node.usableGiB);
  const planFits = Boolean(result?.fits) && allocationFits;
  const enableManualAllocation = () => {
    setManualShares(Object.fromEntries(allocation.map((node) => [node.id, node.share])));
    setAllocationMode("manual");
  };
  const graphNodes = mode === "remote" ? nodes : result?.selectedNodes ?? [];
  const graphLinks = result?.compatibility.supported && graphNodes.length <= 3 ? graphNodes.length === 2 ? ["pair-bridge"] : mode === "rpc" ? ["rpc-studio-rtx", "rpc-macbook-rtx"] : mode === "mlx" ? ["mlx-macs"] : mode === "remote" ? ["remote-client-server"] : [] : [];

  return (
    <main>
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Local topology planner home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Local topology planner</span>
        </a>
        <div className="nav-links">
          <a href="#method">Method</a>
          <a href="#evidence">Evidence</a>
          <a href="#contribute">Contribute</a>
        </div>
        <button className="quiet-button" type="button" onClick={() => setShowDetail((value) => !value)}>
          {showDetail ? "Compact view" : "View methodology"}
        </button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">OPEN-WEIGHT LOCAL AI · TOPOLOGY-AWARE</p>
          <h1>Plan the system,<br /><em>not just the VRAM.</em></h1>
          <p className="hero-subtitle">
            Find the right way to run a model across Macs, NVIDIA hosts, and agent workers—with the evidence behind every answer.
          </p>
          <div className="hero-notes">
            <span><b>01</b> Exact artifacts</span>
            <span><b>02</b> Network-aware</span>
            <span><b>03</b> Measured when possible</span>
          </div>
        </div>
        <div className="hero-topology" aria-label="Illustrative topology graph">
          <div className="constellation-line line-a" /><div className="constellation-line line-b" /><div className="constellation-line line-c" />
          <div className="orb orb-studio"><span>Mac</span><small>192</small></div>
          <div className="orb orb-rtx"><span>RTX</span><small>32</small></div>
          <div className="orb orb-agent"><span>Agent</span><small>×5</small></div>
          <div className="topology-caption">Your machines become<br />a deployable topology.</div>
        </div>
      </section>

      {!catalog || !model || !result ? <section className="catalog-loading" aria-live="polite"><p className="eyebrow">CATALOG</p><h2>{catalogError ? "Catalog unavailable" : "Loading the latest catalog…"}</h2><p>{catalogError ? "The planner stays offline-safe: check the published catalog URL and try again." : "Model artifacts, hardware presets, and provenance are being loaded outside the application bundle."}</p></section> : <>
      <section className="planner-shell" aria-labelledby="planner-title">
        <div className="planner-heading">
          <div>
            <p className="eyebrow">LIVE PLANNER · V0.1</p>
            <h2 id="planner-title">What can this topology do?</h2>
          </div>
          <div className="status-key"><span className="dot verified" /> Verified <span className="dot inferred" /> Inferred <span className="dot estimated" /> Estimated</div>
        </div>

        <div className="formula-explainer" aria-label="Memory fit formula">
          <span>HOW THE FIT IS CALCULATED</span>
          <b>artifact weights <i>+</i> KV cache at target context <i>+</i> runtime reserve <i>≤</i> usable memory of active execution nodes</b>
          <small>Links affect execution speed and support—not a separate pool of memory.</small>
        </div>

        <div className="planner-grid">
          <aside className="control-panel" aria-label="Planner inputs">
            <label className="field-label" htmlFor="model">MODEL ARTIFACT</label>
            <div className="artifact-filter" role="group" aria-label="Artifact format filter"><button type="button" className={artifactFormat === "all" ? "active" : ""} onClick={() => setArtifactFormat("all")}>All</button><button type="button" className={artifactFormat === "gguf" ? "active" : ""} onClick={() => setArtifactFormat("gguf")}>GGUF</button><button type="button" className={artifactFormat === "mlx" ? "active" : ""} onClick={() => setArtifactFormat("mlx")}>MLX</button></div>
            <label className="sr-only" htmlFor="model-search">Search model artifacts</label>
            <input className="model-search" id="model-search" type="search" value={modelQuery} onChange={(event) => setModelQuery(event.target.value)} placeholder="Search name, family, or quant…" />
            <select id="model" value={visibleModels.some((item) => item.id === modelId) ? modelId : ""} onChange={(event) => setModelId(event.target.value)} disabled={!visibleModels.length}>
              {!visibleModels.length ? <option value="">No matching artifacts</option> : visibleModels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.artifact}</option>)}
            </select>
            <p className="catalog-note">{visibleModels.length} shown of {catalog.coverage.modelArtifacts} curated artifacts · {catalog.coverage.hardwarePresets} hardware presets · catalog {catalog.catalogVersion}</p>
            <details className="catalog-review"><summary>What to review in this catalog</summary><p>Check the selected artifact’s source link, format, quantization, and estimate label. A row is only eligible for a stronger confidence level after a reproducible evidence record is accepted.</p></details>

            <div className="field-group topology-editor">
              <span className="field-label">ACTIVE HARDWARE · UP TO 5 NODES</span>
              <div className="hardware-chips">{nodes.map((node) => <button type="button" key={node.id} onClick={() => setTopologyIds((current) => current.filter((id) => id !== node.id))}>{node.name} <span>×</span></button>)}</div>
              <div className="hardware-add"><select aria-label="Hardware preset to add" value={hardwareToAdd} onChange={(event) => setHardwareToAdd(event.target.value)} disabled={nodes.length >= 5}><option value="">Add a preset…</option>{catalog.hardware.filter((item) => !topologyIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.chip}</option>)}</select><button type="button" disabled={!hardwareToAdd || nodes.length >= 5} onClick={() => { setTopologyIds((current) => [...current, hardwareToAdd]); setHardwareToAdd(""); }}>Add</button></div>
            </div>

            <div className="field-group">
              <span className="field-label">DEPLOYMENT MODE</span>
              <div className="mode-list">
                {modes.map((item) => (
                  <button key={item.id} type="button" className={`mode-button ${mode === item.id ? "active" : ""}`} onClick={() => { setMode(item.id); setAllocationMode("auto"); }}>
                    <strong>{item.label}</strong><small>{item.note}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="range-title"><label className="field-label" htmlFor="context">CONTEXT TARGET</label><output>{Math.round(context / 1024)}K tokens</output></div>
              <input id="context" type="range" min="8192" max="131072" step="8192" value={context} onChange={(event) => setContext(Number(event.target.value))} />
              <div className="range-labels"><span>8K</span><span>128K</span></div>
            </div>

            {mode !== "single" && (
              <button className={`link-toggle ${hasFastLink ? "on" : ""}`} type="button" onClick={() => setHasFastLink((value) => !value)} aria-pressed={hasFastLink}>
                <span className="toggle-dot" />
                <span><b>{hasFastLink ? "Fast link enabled" : "10 GbE / unknown link"}</b><small>{hasFastLink ? "Thunderbolt RDMA / equivalent" : "Expect a decode bottleneck"}</small></span>
              </button>
            )}
          </aside>

          <section className="topology-stage" aria-label="Current hardware and network topology">
            <div className="stage-label"><span>HARDWARE TOPOLOGY</span><span>{!result.compatibility.supported ? "INVALID CONFIGURATION · NO LINKS" : graphNodes.length > 3 ? `${graphNodes.length} NODES · LINK MAP NOT YET SET` : mode === "single" ? "1 NODE · LOCAL INFERENCE" : mode === "mlx" ? "2 MACS · DISTRIBUTED" : mode === "remote" ? "MAC CLIENT · NVIDIA SERVING" : "3 NODES · 2 EXECUTION LINKS"}</span></div>
            <div className={`node-map mode-${mode}`}>
              {graphLinks.map((link) => <div className={`map-rail ${link}`} key={link} />)}
              {graphNodes.map((node, index) => <article className={`hardware-node ${node.color} topology-node-${index}`} key={node.id}>
                <span className="node-type">{mode === "remote" && node.kind === "Apple Silicon" ? "CLIENT / CONTROL" : node.kind}</span><strong>{node.name}</strong><small>{node.chip}</small><b>{mode === "remote" && node.kind === "Apple Silicon" ? "not in model capacity" : `${node.usableGiB} GiB usable`}</b>
              </article>)}
            </div>
            <p className="stage-footnote">{!result.compatibility.supported ? result.compatibility.note : graphNodes.length > 3 ? "Five-node selection is supported; per-link editing is the next topology upgrade, so no connection lines are inferred here." : mode === "rpc" ? "This is an experimental, networked execution path—not a generic pooled GPU claim." : mode === "remote" ? "Only the NVIDIA serving nodes count toward the model fit; Macs stay outside the allocation." : "Memory and network assumptions are visible in the result, not hidden behind a green check."}</p>
          </section>

          <section className="result-panel" aria-live="polite">
            <div className="result-header"><span className={`confidence ${result.exact}`}>{result.exact}</span><span>{mode === "rpc" ? "HETEROGENEOUS PLAN" : mode === "mlx" ? "MLX CLUSTER PLAN" : mode === "remote" ? "REMOTE SERVING PLAN" : "SINGLE-NODE PLAN"}</span></div>
            <div className="workload-summary"><span>SELECTED WORKLOAD</span><b>{model.name}</b><small>{model.artifact} · {model.confidence} artifact estimate · <a href={model.sourceUrl} target="_blank" rel="noreferrer">source ↗</a></small></div>
            <div className="verdict-line"><span className={`verdict-symbol ${planFits ? "yes" : "no"}`}>{planFits ? "✓" : "×"}</span><h3>{planFits ? "This can run" : "This does not fit"}</h3></div>
            <p className="result-copy">{!result.fits ? `${model.name} needs ${memory(result.required - result.capacity)} more usable accelerator memory at this context.` : !allocationFits ? "This custom split overfills at least one node. Adjust the allocation or return to automatic." : `${model.name} at ${Math.round(context / 1024)}K fits the selected deployment with ${memory(result.capacity - result.required)} total headroom.`}</p>
            <div className="metric-grid">
              <div><span>DECODE</span><b>~{result.speed.toFixed(0)} tok/s</b><small>{result.exact === "estimated" ? "topology estimate" : "evidence-adjusted"}</small></div>
              <div><span>MAX CONTEXT</span><b>{result.fits ? tokenCount(Math.max(8, Math.floor((result.capacity - model.weightGiB - result.runtime) / model.kvGiBAt8K * 8))) : "—"}</b><small>at selected quant</small></div>
            </div>
            <div className="risk-note"><span className="risk-bar" /><p><b>{result.risk}</b><br />{result.compatibility.note}{mode === "rpc" && result.compatibility.supported ? " Validate with the exact llama.cpp build and link before purchasing hardware." : ""}</p></div>
            <button className="primary-button" type="button" onClick={() => setShowDetail(true)}>Inspect & adjust allocation <span>→</span></button>
          </section>
        </div>

        {showDetail && <section className="details-strip" id="evidence" aria-label="Memory allocation details">
          <div className="details-intro"><p className="eyebrow">ALLOCATION SANDBOX</p><h3>Test a possible split.</h3><p>Automatic uses usable-memory weighting. Manual mode is a what-if tool, not a claim that every runtime accepts the exact split.</p></div>
          <div className="allocation-list">
            <div className="allocation-controls"><span>ALLOCATION MODE</span><div><button className={allocationMode === "auto" ? "active" : ""} type="button" onClick={() => setAllocationMode("auto")}>Automatic</button><button className={allocationMode === "manual" ? "active" : ""} type="button" onClick={enableManualAllocation}>Manual</button></div></div>
            {allocation.map((node) => <div className="allocation-row" key={node.id}><div><b>{node.name}</b><span>{node.chip}</span></div><div><div className="allocation-bar"><i style={{ width: `${Math.min(100, node.amount / node.usableGiB * 100)}%` }} /></div><div className="allocation-slider"><input aria-label={`${node.name} allocation share`} type="range" min="0" max="100" value={Math.round(node.share)} disabled={allocationMode === "auto"} onChange={(event) => setManualShares((current) => ({ ...current, [node.id]: Number(event.target.value) }))} /><output>{Math.round(node.share)}%</output></div></div><strong>{memory(node.amount)} <small>/ {node.usableGiB} GiB</small></strong></div>)}
          </div>
          <div className="formula"><span>MEMORY RECEIPT</span><b>{memory(model.weightGiB)}</b> weights <i>+</i> <b>{memory(result.cache)}</b> KV cache <i>+</i> <b>{memory(result.runtime)}</b> runtime</div>
        </section>}
      </section>

      <section className="method-section" id="method">
        <div><p className="eyebrow">WHY THIS IS DIFFERENT</p><h2>A cluster is not a larger computer.</h2></div>
        <div className="method-cards">
          <article><span>01</span><h3>Select</h3><p>Start with the exact artifact, quantization, and target context—not a generic parameter count.</p></article>
          <article><span>02</span><h3>Shard</h3><p>One model can span compatible machines. Capacity grows, while the slowest stage and link define the experience.</p></article>
          <article><span>03</span><h3>Prove</h3><p>Exact topology measurements outrank generic bandwidth math—and remain inspectable.</p></article>
        </div>
      </section>

      <section className="footer-callout" id="contribute">
        <div><p className="eyebrow">OPEN DATASET · CC0</p><h2>Help turn estimated<br />into verified.</h2></div>
        <div><p>Run a local benchmark, export a sanitized record, and help the next builder make a confident decision.</p><button className="outline-button" type="button" onClick={() => alert("Benchmark contribution workflow ships in the next build.")}>See contribution format <span>↗</span></button></div>
      </section>
      </>}
    </main>
  );
}
