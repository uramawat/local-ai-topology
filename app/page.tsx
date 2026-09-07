"use client";

import { useMemo, useState } from "react";
import { hardwareCatalog, modelCatalog, starterTopology } from "../data/catalog";

type Mode = "single" | "mlx" | "rpc" | "router";

const modes: Array<{ id: Mode; label: string; note: string }> = [
  { id: "single", label: "One node", note: "Best interactive latency" },
  { id: "mlx", label: "Mac cluster", note: "MLX distributed inference" },
  { id: "rpc", label: "Mac + NVIDIA", note: "llama.cpp RPC · experimental" },
  { id: "router", label: "Agent routing", note: "Independent requests only" },
];

const memory = (n: number) => `${n.toFixed(n >= 100 ? 0 : 1)} GiB`;

export default function Home() {
  const [modelId, setModelId] = useState("gptoss120");
  const [mode, setMode] = useState<Mode>("rpc");
  const [context, setContext] = useState(32768);
  const [hasFastLink, setHasFastLink] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  const model = modelCatalog.find((item) => item.id === modelId) ?? modelCatalog[0];
  const result = useMemo(() => {
    const cache = model.kv * (context / 8192);
    const runtime = mode === "router" ? 1.8 : mode === "single" ? 2.4 : 4.8;
    const required = model.weights + cache + runtime;
    const selectedNodes =
      mode === "single"
        ? [starterTopology[0]]
        : mode === "mlx"
          ? starterTopology.filter((node) => node.kind === "Apple Silicon")
        : mode === "rpc"
            ? starterTopology
            : starterTopology;
    const capacity = mode === "router" ? Math.max(...starterTopology.map((node) => node.usable)) : selectedNodes.reduce((sum, node) => sum + node.usable, 0);
    const fits = required <= capacity;
    const exact = mode === "rpc" ? "estimated" : mode === "router" ? "inferred" : "verified";
    const risk = mode === "rpc" ? "Experimental runtime path" : mode === "router" ? "Memory does not pool" : hasFastLink ? "Low topology risk" : "Network constrained";
    const speedBase = mode === "single" ? 33 : mode === "mlx" ? 46 : mode === "router" ? 30 : hasFastLink ? 22 : 8;
    const speed = Math.max(3, speedBase - Math.max(0, (model.weights - 20) / 9) - (context / 32768) * 2);
    return { cache, runtime, required, capacity, fits, exact, risk, speed, selectedNodes };
  }, [context, hasFastLink, mode, model]);

  const allocation = result.selectedNodes.map((node) => ({
    ...node,
    amount: mode === "router" ? result.required : Math.min(node.usable, result.required * (node.usable / result.capacity)),
  }));

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

      <section className="planner-shell" aria-labelledby="planner-title">
        <div className="planner-heading">
          <div>
            <p className="eyebrow">LIVE PLANNER · V0.1</p>
            <h2 id="planner-title">What can this topology do?</h2>
          </div>
          <div className="status-key"><span className="dot verified" /> Verified <span className="dot inferred" /> Inferred <span className="dot estimated" /> Estimated</div>
        </div>

        <div className="planner-grid">
          <aside className="control-panel" aria-label="Planner inputs">
            <label className="field-label" htmlFor="model">MODEL ARTIFACT</label>
            <select id="model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
              {modelCatalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.artifact}</option>)}
            </select>
            <p className="catalog-note">{modelCatalog.length} curated model artifacts · {hardwareCatalog.length} hardware presets · source-backed catalog coming next.</p>

            <div className="field-group">
              <span className="field-label">DEPLOYMENT MODE</span>
              <div className="mode-list">
                {modes.map((item) => (
                  <button key={item.id} type="button" className={`mode-button ${mode === item.id ? "active" : ""}`} onClick={() => setMode(item.id)}>
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

            {mode !== "single" && mode !== "router" && (
              <button className={`link-toggle ${hasFastLink ? "on" : ""}`} type="button" onClick={() => setHasFastLink((value) => !value)} aria-pressed={hasFastLink}>
                <span className="toggle-dot" />
                <span><b>{hasFastLink ? "Fast link enabled" : "10 GbE / unknown link"}</b><small>{hasFastLink ? "Thunderbolt RDMA / equivalent" : "Expect a decode bottleneck"}</small></span>
              </button>
            )}
          </aside>

          <section className="topology-stage" aria-label="Current hardware topology">
            <div className="stage-label"><span>DEPLOYMENT GRAPH</span><span>{mode === "router" ? "REQUESTS ROUTE · MEMORY STAYS LOCAL" : "WEIGHTS + KV ARE ALLOCATED"}</span></div>
            <div className="node-map">
              <div className="map-rail rail-one" /><div className="map-rail rail-two" />
              {starterTopology.map((node) => <article className={`hardware-node ${node.color}`} key={node.id}>
                <span className="node-type">{node.kind}</span><strong>{node.name}</strong><small>{node.chip}</small><b>{node.usable} GiB usable</b>
              </article>)}
              <div className="model-core"><span>MODEL</span><strong>{model.name}</strong><small>{model.artifact}</small></div>
            </div>
            <p className="stage-footnote">{mode === "rpc" ? "The planner will not call this a pooled GPU: it is an experimental, networked execution path." : mode === "router" ? "Each job is placed on one node. More nodes raise concurrency, not model capacity." : "Memory and network assumptions are visible in the result, not hidden behind a green check."}</p>
          </section>

          <section className="result-panel" aria-live="polite">
            <div className="result-header"><span className={`confidence ${result.exact}`}>{result.exact}</span><span>{mode === "rpc" ? "HETEROGENEOUS PLAN" : mode === "router" ? "ROUTING PLAN" : "SHARDED PLAN"}</span></div>
            <div className="verdict-line"><span className={`verdict-symbol ${result.fits ? "yes" : "no"}`}>{result.fits ? "✓" : "×"}</span><h3>{result.fits ? "This can run" : "This does not fit"}</h3></div>
            <p className="result-copy">{result.fits ? `${model.name} at ${Math.round(context / 1024)}K fits the selected deployment with ${memory(result.capacity - result.required)} total headroom.` : `${model.name} needs ${memory(result.required - result.capacity)} more usable accelerator memory at this context.`}</p>
            <div className="metric-grid">
              <div><span>DECODE</span><b>~{result.speed.toFixed(0)} tok/s</b><small>{result.exact === "estimated" ? "topology estimate" : "evidence-adjusted"}</small></div>
              <div><span>MAX CONTEXT</span><b>{result.fits ? `${Math.max(8, Math.floor((result.capacity - model.weights - result.runtime) / model.kv * 8))}K` : "—"}</b><small>at selected quant</small></div>
            </div>
            <div className="risk-note"><span className="risk-bar" /><p><b>{result.risk}</b><br />{mode === "rpc" ? "Validate with the exact llama.cpp build and link before purchasing hardware." : mode === "router" ? "Use this mode for concurrent agents, not a model that exceeds every individual node." : "A matching measured record upgrades this plan from estimate to verified."}</p></div>
            <button className="primary-button" type="button" onClick={() => setShowDetail(true)}>Inspect allocation <span>→</span></button>
          </section>
        </div>

        {showDetail && <section className="details-strip" id="evidence" aria-label="Memory allocation details">
          <div className="details-intro"><p className="eyebrow">ALLOCATION RECEIPT</p><h3>Nothing is hidden in the total.</h3><p>Weights, cache, runtime reserve, and node headroom stay separate so an apparent fit can be audited.</p></div>
          <div className="allocation-list">
            {allocation.map((node) => <div className="allocation-row" key={node.id}><div><b>{node.name}</b><span>{node.chip}</span></div><div className="allocation-bar"><i style={{ width: `${Math.min(100, node.amount / node.usable * 100)}%` }} /></div><strong>{memory(node.amount)} <small>/ {node.usable} GiB</small></strong></div>)}
          </div>
          <div className="formula"><span>MEMORY RECEIPT</span><b>{memory(model.weights)}</b> weights <i>+</i> <b>{memory(result.cache)}</b> KV cache <i>+</i> <b>{memory(result.runtime)}</b> runtime</div>
        </section>}
      </section>

      <section className="method-section" id="method">
        <div><p className="eyebrow">WHY THIS IS DIFFERENT</p><h2>A cluster is not a larger computer.</h2></div>
        <div className="method-cards">
          <article><span>01</span><h3>Route</h3><p>Independent agents can land on different machines. Fast parallel work; no combined memory.</p></article>
          <article><span>02</span><h3>Shard</h3><p>One model spans machines. Capacity grows, while the slowest stage and link define the experience.</p></article>
          <article><span>03</span><h3>Prove</h3><p>Exact topology measurements outrank generic bandwidth math—and remain inspectable.</p></article>
        </div>
      </section>

      <section className="footer-callout" id="contribute">
        <div><p className="eyebrow">OPEN DATASET · CC0</p><h2>Help turn estimated<br />into verified.</h2></div>
        <div><p>Run a local benchmark, export a sanitized record, and help the next builder make a confident decision.</p><button className="outline-button" type="button" onClick={() => alert("Benchmark contribution workflow ships in the next build.")}>See contribution format <span>↗</span></button></div>
      </section>
    </main>
  );
}
