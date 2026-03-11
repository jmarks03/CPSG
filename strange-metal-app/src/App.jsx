import { useState, useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

var NODE_TYPES = {
  lattice: { color: "#4a9eff", icon: "\u25C7", label: "Lattice / Structure" },
  interaction: { color: "#b44aff", icon: "\u2662", label: "Interaction Channel" },
  order: { color: "#ff4a8a", icon: "\u2727", label: "Order Parameter" },
  transport: { color: "#22c55e", icon: "\u223F", label: "Transport Signature" },
  symmetry: { color: "#f59e0b", icon: "\u2206", label: "Symmetry / Topology" },
  material: { color: "#06b6d4", icon: "\u2B23", label: "Material / Compound" },
  mechanism: { color: "#ec4899", icon: "\u2699", label: "Mechanism" },
  predicted: { color: "#ff9f43", icon: "\u2605", label: "Predicted / Novel" },
};

var EDGE_DEPTHS = {
  coupling: { color: "#4a9eff", label: "Direct Coupling" },
  emergent: { color: "#b44aff", label: "Emergent Correlation" },
  holographic: { color: "#ff4a8a", label: "Holographic / Substrate" },
};

var PHASE_COLORS = { fermi_liquid: "#4a9eff", quantum_critical: "#b44aff", strange_metal: "#ff4a8a" };
var PHASE_LABELS = { fermi_liquid: "Fermi Liquid", quantum_critical: "Quantum Critical", strange_metal: "Strange Metal" };
var PHASE_TEMPS = { fermi_liquid: "T \u226A T*", quantum_critical: "T \u2248 T*", strange_metal: "T > T*" };

function buildPrompt(materialContext, seedNodes, seedNodeTypes, seedPhase, targetObservable) {
  var seedDesc = seedNodes.map(function(n, i) {
    return '"' + n + '" (type: ' + (seedNodeTypes[i] || "lattice") + ')';
  }).join(", ");

  var phaseNames = {
    fermi_liquid: "FERMI LIQUID (T << T*, quasiparticles well-defined)",
    quantum_critical: "QUANTUM CRITICAL (T ~ T*, coherence breaking down)",
    strange_metal: "STRANGE METAL (T > T*, Planckian dissipation, no quasiparticles)"
  };

  var goalSection = targetObservable ? [
    "",
    "TARGET OBSERVABLE (future boundary condition):",
    targetObservable,
    "",
    "The strange metal phase MUST exhibit this observable. Work backward:",
    "- What lattice/interaction/symmetry configuration is NECESSARY to produce this?",
    "- What intermediate states at the quantum critical point enable the transition?",
    "- What novel materials or doping strategies could realize this?",
    "- The STRANGE METAL phase should feel like a deterministic resolution: this specific topology produces this specific observable.",
    ""
  ].join("\n") : "";

  return [
    "You are a condensed matter physics discovery engine operating under Causal Probability Substrate (CPS) ontology.",
    "",
    "DOMAIN: STRANGE METAL PHYSICS",
    "Strange metals violate Fermi liquid theory. They exhibit:",
    "- Linear-in-T resistivity (rho ~ T) down to lowest temperatures",
    "- Planckian dissipation rate (tau ~ hbar/k_B T)",
    "- No well-defined quasiparticles",
    "- Often found near quantum critical points in cuprates, heavy fermions, twisted bilayer graphene, etc.",
    "",
    "CPS INSIGHT: Strange metals ARE a CPS phenomenon. The strange metal state is what happens when quasiparticle nodes dissolve and only relational edges (entanglement, scattering correlations) remain. Your job is to find novel configurations where this happens.",
    "",
    "AXIOMS:",
    "1. RELATIONSHIPS PRIMARY: Interaction channels and correlations are more fundamental than particle descriptions.",
    "2. PROBABILISTIC: Assign coupling strengths (0.1-1.0) to edges. These are relative interaction strengths.",
    "3. FLUCTUATION CORRELATIONS: Look for resonances between different interaction channels that could produce non-Fermi liquid behavior.",
    "4. INVERSION: Given the seed structure, work backward to find what additional ingredients are needed.",
    "5. PHYSICAL TEMPERATURE: The three phases are literal physical regimes, not metaphors.",
    "",
    "MATERIAL CONTEXT: " + materialContext,
    "SEED NODES: " + seedDesc,
    "SEEDED PHASE: " + phaseNames[seedPhase],
    goalSection,
    "NODE TYPES (every node MUST have one):",
    "- lattice: Crystal structure, layer geometry, moire pattern, bond network",
    "- interaction: Coulomb repulsion, spin exchange, phonon coupling, Kondo, Hund's",
    "- order: Superconducting, magnetic, charge density wave, nematic, topological",
    "- transport: Resistivity signature, Hall effect, optical conductivity, thermal",
    "- symmetry: Point group, time-reversal, gauge symmetry, topological invariant",
    "- material: Specific compound, alloy, heterostructure, doping strategy",
    "- mechanism: Scattering mechanism, pairing glue, spectral weight transfer",
    "- predicted: NOVEL prediction - material, mechanism, or observable not yet known",
    "",
    "EDGE TYPES (every edge MUST have one):",
    "- coupling: Direct physical coupling (e.g. electron-phonon, spin-orbit)",
    "- emergent: Correlation that emerges from collective behavior (e.g. Kondo breakdown -> critical Fermi surface)",
    "- holographic: Deep substrate connection (e.g. AdS/CFT-motivated, entanglement structure, SYK-like)",
    "",
    "THREE PHASES:",
    "",
    "FERMI LIQUID (T << T*):",
    "- Well-defined quasiparticles. Coherent Fermi surface.",
    "- Mostly coupling-type edges. Lattice + interaction nodes dominate.",
    "- Standard Landau paradigm applies. Rigid structure.",
    "",
    "QUANTUM CRITICAL (T ~ T*):",
    "- Quasiparticle coherence breaking down. Critical fluctuations.",
    "- New emergent-type edges appearing. Order parameter nodes fluctuating.",
    "- 2-4 NEW discovered nodes: mechanisms/materials that emerge at criticality.",
    "- This is where the interesting physics lives. Maximum reorganization.",
    "",
    "STRANGE METAL (T > T*):",
    "- No quasiparticles. Planckian-limited transport.",
    "- Holographic-type edges dominate. Transport signature nodes prominent.",
    "- Additional predicted nodes: novel materials, untested mechanisms.",
    "- If a target observable is set, this phase must achieve it.",
    "",
    "ALSO GENERATE:",
    "- experimental_predictions: 2-4 specific experiments that could test or discover the predicted strange metal",
    "- synthesis_pathway: If novel materials are predicted, how might they be synthesized?",
    "- key_question: The single most important open question this topology reveals",
    "",
    "Respond ONLY with valid JSON, no markdown:",
    "{",
    '  "fermi_liquid":{"nodes":[{"id":"x","label":"Name","node_type":"lattice","domain":"condensed matter","description":"brief","seed":true}],"edges":[{"source":"id","target":"id","weight":0.7,"description":"text","depth":"coupling|emergent|holographic"}]},',
    '  "quantum_critical":{"nodes":[...],"edges":[...]},',
    '  "strange_metal":{"nodes":[...],"edges":[...]},',
    '  "evolution_narrative":"How the topology reorganizes across the phase diagram",',
    '  "inversions":[{"insight":"text","confidence":0.8,"phase":"fermi_liquid|quantum_critical|strange_metal"}],',
    '  "experimental_predictions":["specific testable prediction 1","prediction 2"],',
    '  "synthesis_pathway":"How to make the predicted materials",',
    '  "key_question":"The most important open question revealed"',
    targetObservable ? '  ,"goal_pathway":"Causal chain from seed to target observable achievement"' : "",
    "}"
  ].join("\n");
}

function GraphView({ data, onSelect, width, height }) {
  var ref = useRef(null);
  useEffect(function() {
    if (!data || !data.nodes.length || !ref.current) return;
    var svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    var defs = svg.append("defs");
    var glow = defs.append("filter").attr("id", "glow2");
    glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "b");
    var mg = glow.append("feMerge");
    mg.append("feMergeNode").attr("in", "b");
    mg.append("feMergeNode").attr("in", "SourceGraphic");

    var g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.2, 4]).on("zoom", function(event) {
      g.attr("transform", event.transform);
    }));

    var nodes = data.nodes.map(function(d) { return Object.assign({}, d); });
    var edges = data.edges.map(function(d) { return Object.assign({}, d); });

    var sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id(function(d) { return d.id; }).distance(function(d) { return 100 / d.weight; }))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(44));

    var lines = g.append("g").selectAll("line").data(edges).enter().append("line")
      .attr("stroke", function(d) { return EDGE_DEPTHS[d.depth] ? EDGE_DEPTHS[d.depth].color : "#4a9eff"; })
      .attr("stroke-width", function(d) { return 1 + d.weight * 4; })
      .attr("stroke-opacity", function(d) { return 0.2 + d.weight * 0.5; })
      .attr("filter", "url(#glow2)")
      .style("cursor", "pointer")
      .on("click", function(event, d) { event.stopPropagation(); onSelect(d); })
      .on("mouseenter", function() {
        d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", function(d) { return 3 + d.weight * 5; });
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke-opacity", function(d) { return 0.2 + d.weight * 0.5; })
          .attr("stroke-width", function(d) { return 1 + d.weight * 4; });
      });

    var nodeG = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .style("cursor", "grab")
      .call(d3.drag()
        .on("start", function(event, d) { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", function(event, d) { d.fx = event.x; d.fy = event.y; })
        .on("end", function(event, d) { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeG.append("circle")
      .attr("r", function(d) {
        return (d.node_type === "predicted") ? 9 : d.seed ? 6 : 7;
      })
      .attr("fill", "#0a0a1a")
      .attr("stroke", function(d) {
        var nt = NODE_TYPES[d.node_type];
        return nt ? nt.color : "#8899bb";
      })
      .attr("stroke-width", function(d) { return d.node_type === "predicted" ? 2.5 : d.seed ? 1.5 : 2; })
      .attr("filter", "url(#glow2)")
      .attr("opacity", 0.9);

    nodeG.filter(function(d) { return d.node_type === "predicted"; })
      .append("circle").attr("r", 14).attr("fill", "none")
      .attr("stroke", "#ff9f43").attr("stroke-width", 0.6).attr("stroke-dasharray", "3,3").attr("opacity", 0.4);

    nodeG.append("text")
      .text(function(d) {
        var nt = NODE_TYPES[d.node_type];
        var icon = nt ? nt.icon + " " : "";
        return icon + d.label;
      })
      .attr("dx", 14).attr("dy", 4)
      .attr("fill", function(d) {
        var nt = NODE_TYPES[d.node_type];
        return nt ? nt.color : "#99aabb";
      })
      .attr("font-size", "10px").attr("font-family", "monospace").attr("pointer-events", "none")
      .attr("font-weight", function(d) { return d.node_type === "predicted" ? "600" : "400"; });

    nodeG.append("text")
      .text(function(d) {
        var nt = NODE_TYPES[d.node_type];
        return nt ? nt.label : d.node_type;
      })
      .attr("dx", 14).attr("dy", 16)
      .attr("fill", function(d) {
        var nt = NODE_TYPES[d.node_type];
        return nt ? nt.color + "77" : "#445566";
      })
      .attr("font-size", "7px").attr("font-family", "monospace").attr("pointer-events", "none");

    sim.on("tick", function() {
      lines.attr("x1", function(d) { return d.source.x; }).attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; }).attr("y2", function(d) { return d.target.y; });
      nodeG.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    svg.on("click", function() { onSelect(null); });
    return function() { sim.stop(); };
  }, [data, width, height]);

  return <svg ref={ref} width={width} height={height} style={{ background: "transparent" }} />;
}

function Bar({ weight, depth }) {
  var ed = EDGE_DEPTHS[depth];
  var c = ed ? ed.color : "#4a9eff";
  var pct = Math.round(weight * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 3, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: c, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 9, color: c }}>{pct}%</span>
    </div>
  );
}

function eLabel(e) {
  var s = typeof e.source === "object" ? e.source.label : e.source;
  var t = typeof e.target === "object" ? e.target.label : e.target;
  return s + " \u27F7 " + t;
}
function eShort(e) {
  var s = typeof e.source === "object" ? e.source.label : e.source;
  var t = typeof e.target === "object" ? e.target.label : e.target;
  return s + " \u2192 " + t;
}

export default function App() {
  var mono = "'IBM Plex Mono', monospace";
  var serif = "'Cormorant Garamond', serif";

  var _ctx = useState(""); var ctx = _ctx[0]; var setCtx = _ctx[1];
  var _goal = useState(""); var goal = _goal[0]; var setGoal = _goal[1];
  var _ni = useState(""); var nodeInput = _ni[0]; var setNodeInput = _ni[1];
  var _nt = useState("lattice"); var nodeType = _nt[0]; var setNodeType = _nt[1];
  var _seeds = useState([]); var seeds = _seeds[0]; var setSeeds = _seeds[1];
  var _seedTypes = useState([]); var seedTypes = _seedTypes[0]; var setSeedTypes = _seedTypes[1];
  var _seedPhase = useState("fermi_liquid"); var seedPhase = _seedPhase[0]; var setSeedPhase = _seedPhase[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _allData = useState(null); var allData = _allData[0]; var setAllData = _allData[1];
  var _active = useState("fermi_liquid"); var active = _active[0]; var setActive = _active[1];
  var _sel = useState(null); var sel = _sel[0]; var setSel = _sel[1];
  var _err = useState(null); var err = _err[0]; var setErr = _err[1];
  var _narrative = useState(""); var narrative = _narrative[0]; var setNarrative = _narrative[1];
  var _pathway = useState(""); var pathway = _pathway[0]; var setPathway = _pathway[1];
  var _inv = useState([]); var inv = _inv[0]; var setInv = _inv[1];
  var _exps = useState([]); var exps = _exps[0]; var setExps = _exps[1];
  var _synth = useState(""); var synth = _synth[0]; var setSynth = _synth[1];
  var _keyQ = useState(""); var keyQ = _keyQ[0]; var setKeyQ = _keyQ[1];
  var _status = useState("idle"); var status = _status[0]; var setStatus = _status[1];
  var _panel = useState(false); var panel = _panel[0]; var setPanel = _panel[1];
  var cRef = useRef(null);
  var _dims = useState({ w: 800, h: 500 }); var dims = _dims[0]; var setDims = _dims[1];

  useEffect(function() {
    var link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return function() { try { document.head.removeChild(link); } catch(e) {} };
  }, []);

  useEffect(function() {
    function update() {
      if (cRef.current) { var r = cRef.current.getBoundingClientRect(); setDims({ w: r.width, h: r.height }); }
    }
    update();
    window.addEventListener("resize", update);
    return function() { window.removeEventListener("resize", update); };
  }, []);

  useEffect(function() { if (sel) setPanel(true); }, [sel]);

  function addSeed() {
    var v = nodeInput.trim();
    if (v && seeds.indexOf(v) === -1) {
      setSeeds(seeds.concat([v]));
      setSeedTypes(seedTypes.concat([nodeType]));
      setNodeInput("");
    }
  }
  function removeSeed(i) {
    setSeeds(seeds.filter(function(_, idx) { return idx !== i; }));
    setSeedTypes(seedTypes.filter(function(_, idx) { return idx !== i; }));
  }

  var explore = useCallback(function() {
    if (!ctx.trim() || seeds.length < 2 || loading) return;
    setLoading(true); setErr(null); setSel(null); setAllData(null);
    setNarrative(""); setPathway(""); setInv([]); setExps([]); setSynth(""); setKeyQ(""); setPanel(false);

    var phases = ["probing", "correlating", "resolving"];
    var pi = 0; setStatus(phases[0]);
    var iv = setInterval(function() { pi++; if (pi < phases.length) setStatus(phases[pi]); }, 4500);

    var goalTrimmed = goal.trim() || "";

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 7000,
        thinking: { type: "adaptive" },
        system: buildPrompt(ctx.trim(), seeds, seedTypes, seedPhase, goalTrimmed),
        messages: [{ role: "user", content: "Material context: " + ctx.trim() + ". Seed nodes in " + seedPhase + " phase. " + (goalTrimmed ? "Target observable: " + goalTrimmed + ". Resolve the strange metal phase to achieve this." : "Explore freely.") + " Discover novel strange metal configurations, predict materials, suggest experiments." }],
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(apiData) {
      clearInterval(iv);
      if (apiData.error) throw new Error(apiData.error.message || "API error");
      var txt = "";
      for (var i = 0; i < apiData.content.length; i++) {
        if (apiData.content[i].type === "text") txt += apiData.content[i].text;
      }
      var parsed = JSON.parse(txt.replace(/```json/g, "").replace(/```/g, "").trim());
      setAllData({ fermi_liquid: parsed.fermi_liquid, quantum_critical: parsed.quantum_critical, strange_metal: parsed.strange_metal });
      setNarrative(parsed.evolution_narrative || "");
      setPathway(parsed.goal_pathway || "");
      setInv(parsed.inversions || []);
      setExps(parsed.experimental_predictions || []);
      setSynth(parsed.synthesis_pathway || "");
      setKeyQ(parsed.key_question || "");
      setActive("fermi_liquid");
      setStatus("idle");
      setPanel(true);
      setLoading(false);
    })
    .catch(function(e) {
      clearInterval(iv); setErr(e.message); setStatus("idle"); setLoading(false);
    });
  }, [ctx, goal, seeds, seedTypes, seedPhase, loading]);

  var statusText = {
    idle: "", probing: "Probing Fermi surface topology...",
    correlating: "Computing critical fluctuation channels...", resolving: "Resolving Planckian dissipation landscape..."
  };

  var currentData = allData ? allData[active] : null;
  var byDepth = currentData ? {
    coupling: currentData.edges.filter(function(e) { return e.depth === "coupling"; }),
    emergent: currentData.edges.filter(function(e) { return e.depth === "emergent"; }),
    holographic: currentData.edges.filter(function(e) { return e.depth === "holographic"; }),
  } : null;
  var predicted = currentData ? currentData.nodes.filter(function(n) { return n.node_type === "predicted"; }) : [];
  var phaseInversions = inv.filter(function(item) { return item.phase === active; });
  var hasGoal = goal.trim().length > 0;

  var phaseDelta = null;
  if (allData && active !== "fermi_liquid") {
    var prevKey = active === "quantum_critical" ? "fermi_liquid" : "quantum_critical";
    var prev = allData[prevKey]; var curr = currentData;
    if (prev && curr) {
      var prevIds = prev.nodes.map(function(n) { return n.id; });
      var currIds = curr.nodes.map(function(n) { return n.id; });
      phaseDelta = {
        nn: currIds.filter(function(id) { return prevIds.indexOf(id) === -1; }).length,
        ln: prevIds.filter(function(id) { return currIds.indexOf(id) === -1; }).length,
        ne: curr.edges.length - prev.edges.length
      };
    }
  }

  return (
    <div style={{ width: "100%", height: "100vh", background: "#06060f", color: "#c8d0dd", fontFamily: mono, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ padding: "8px 20px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 10, flexShrink: 0, display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 13, fontWeight: 400, letterSpacing: "0.15em", color: "#667788", textTransform: "uppercase" }}>CPS</h1>
        <span style={{ fontFamily: serif, fontSize: 15, color: "#99aabb", fontStyle: "italic" }}>Strange Metal Discovery Engine</span>
      </div>

      {/* Inputs */}
      <div style={{ padding: "8px 20px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 10, flexShrink: 0 }}>
        {/* Row 1 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#556677", display: "block", marginBottom: 2 }}>Material Context</label>
            <input type="text" value={ctx} onChange={function(e) { setCtx(e.target.value); }}
              placeholder="e.g. cuprate superconductors, twisted bilayer graphene, heavy fermion..."
              style={{ width: "100%", padding: "5px 9px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 3, color: "#c8d0dd", fontFamily: mono, fontSize: 10, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: hasGoal ? "#22c55e" : "#556677", display: "block", marginBottom: 2 }}>
              Target Observable {hasGoal ? "\u2192" : "(opt.)"}
            </label>
            <input type="text" value={goal} onChange={function(e) { setGoal(e.target.value); }}
              placeholder="e.g. linear-in-T resistivity with Planckian tau..."
              style={{ width: "100%", padding: "5px 9px", background: hasGoal ? "#060f0a" : "#0a0a1a", border: "1px solid " + (hasGoal ? "#1a2e1a" : "#1a1a2e"), borderRadius: 3, color: hasGoal ? "#88cc99" : "#c8d0dd", fontFamily: mono, fontSize: 10, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Row 2: Phase + Node input */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 5 }}>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#556677", display: "block", marginBottom: 2 }}>Seeding Phase</label>
            <div style={{ display: "flex", borderRadius: 3, overflow: "hidden", border: "1px solid #1a1a2e" }}>
              {["fermi_liquid", "quantum_critical", "strange_metal"].map(function(p) {
                var a = seedPhase === p;
                return (
                  <button key={p} onClick={function() { setSeedPhase(p); }}
                    style={{ flex: 1, padding: "4px 1px", background: a ? PHASE_COLORS[p] + "22" : "#0a0a1a", border: "none",
                      color: a ? PHASE_COLORS[p] : "#445566", fontFamily: mono, fontSize: 6, cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.03em", borderRight: p !== "strange_metal" ? "1px solid #1a1a2e" : "none" }}>
                    {p === "fermi_liquid" ? "FL" : p === "quantum_critical" ? "QCP" : "SM"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node type */}
          <div>
            <label style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#556677", display: "block", marginBottom: 2 }}>Type</label>
            <select value={nodeType} onChange={function(e) { setNodeType(e.target.value); }}
              style={{ padding: "4px 4px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 3, color: NODE_TYPES[nodeType] ? NODE_TYPES[nodeType].color : "#c8d0dd", fontFamily: mono, fontSize: 9, outline: "none" }}>
              {Object.keys(NODE_TYPES).filter(function(k) { return k !== "predicted"; }).map(function(k) {
                return <option key={k} value={k}>{NODE_TYPES[k].icon + " " + NODE_TYPES[k].label}</option>;
              })}
            </select>
          </div>

          {/* Node name */}
          <div style={{ flex: 1, display: "flex", gap: 4 }}>
            <input type="text" value={nodeInput} onChange={function(e) { setNodeInput(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); addSeed(); } }}
              placeholder="Node name..."
              style={{ flex: 1, padding: "4px 8px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 3, color: "#c8d0dd", fontFamily: mono, fontSize: 10, outline: "none" }} />
            <button onClick={addSeed}
              style={{ padding: "4px 8px", background: "#141428", border: "1px solid #2a2a4e", borderRadius: 3, color: "#8899bb", fontFamily: mono, fontSize: 9, cursor: "pointer" }}>+</button>
          </div>

          <button onClick={explore} disabled={loading || !ctx.trim() || seeds.length < 2}
            style={{ padding: "4px 14px", background: (loading || seeds.length < 2) ? "#1a1a2e" : hasGoal ? "#0a1a10" : "#141428",
              border: "1px solid " + (hasGoal ? "#1a3a2a" : "#2a2a4e"), borderRadius: 3,
              color: (loading || seeds.length < 2) ? "#334455" : hasGoal ? "#55bb77" : "#8899bb",
              fontFamily: mono, fontSize: 9, cursor: (loading || seeds.length < 2) ? "default" : "pointer",
              letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", opacity: seeds.length < 2 ? 0.5 : 1 }}>
            {loading ? "..." : hasGoal ? "\u2192 Resolve" : "Discover"}
          </button>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minHeight: 18 }}>
          {seeds.map(function(s, i) {
            var nt = NODE_TYPES[seedTypes[i]];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 7px", background: "#0f0f22", border: "1px solid " + (nt ? nt.color + "44" : "#2a2a4e"), borderRadius: 10, fontSize: 8 }}>
                <span style={{ color: nt ? nt.color : "#8899bb" }}>{nt ? nt.icon : ""} {s}</span>
                <span onClick={function() { removeSeed(i); }} style={{ cursor: "pointer", color: "#556677", fontSize: 10, marginLeft: 2 }}>{"\u00D7"}</span>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: status === "probing" ? "#4a9eff" : status === "correlating" ? "#b44aff" : "#ff4a8a", animation: "cpsPulse 1.5s ease infinite" }} />
              <span style={{ fontSize: 8, color: "#445566", fontStyle: "italic" }}>{statusText[status]}</span>
            </div>
          )}
        </div>
        {err && <div style={{ marginTop: 3, fontSize: 8, color: "#ff6b6b", padding: "3px 7px", background: "#1a0a0a", borderRadius: 3 }}>{err}</div>}
      </div>

      {/* Phase diagram bar */}
      {allData && (
        <div style={{ padding: "6px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 10, flexShrink: 0, display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", position: "relative" }}>
            <div style={{ position: "absolute", left: "16.6%", right: "16.6%", height: 2, top: "50%", marginTop: -1,
              background: "linear-gradient(to right, " + PHASE_COLORS.fermi_liquid + "44, " + PHASE_COLORS.quantum_critical + "66, " + (hasGoal ? "#22c55e66" : PHASE_COLORS.strange_metal + "44") + ")" }} />

            {["fermi_liquid", "quantum_critical", "strange_metal"].map(function(p) {
              var isActive = active === p;
              var seeded = seedPhase === p;
              var isGoalPhase = p === "strange_metal" && hasGoal;
              var col = isGoalPhase ? "#22c55e" : PHASE_COLORS[p];
              return (
                <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", position: "relative", zIndex: 2 }}
                  onClick={function() { setActive(p); setSel(null); }}>
                  <div style={{ width: isActive ? 12 : 9, height: isActive ? 12 : 9, borderRadius: "50%",
                    background: isActive ? col + "33" : "#0a0a1a", border: "2px solid " + (isActive ? col : "#334455"),
                    boxShadow: isActive ? "0 0 10px " + col + "44" : "none", transition: "all 0.3s" }} />
                  <div style={{ marginTop: 2, fontSize: 8, color: isActive ? col : "#445566", fontWeight: isActive ? "500" : "400", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isGoalPhase ? "\u2192 Resolved" : PHASE_LABELS[p]}
                  </div>
                  <div style={{ fontSize: 7, color: isActive ? col + "88" : "#334455" }}>{PHASE_TEMPS[p]}</div>
                  {seeded && <div style={{ fontSize: 6, color: "#ff9f43" }}>SEEDED</div>}
                </div>
              );
            })}
          </div>
          {phaseDelta && (
            <div style={{ marginLeft: 10, fontSize: 8, color: "#556677", lineHeight: 1.4, textAlign: "right", minWidth: 80 }}>
              {phaseDelta.nn > 0 && <div style={{ color: "#ff9f43" }}>+{phaseDelta.nn} nodes</div>}
              {phaseDelta.ln > 0 && <div>-{phaseDelta.ln} nodes</div>}
              <div style={{ color: phaseDelta.ne > 0 ? "#b44aff" : "#445566" }}>{phaseDelta.ne > 0 ? "+" : ""}{phaseDelta.ne} edges</div>
            </div>
          )}
        </div>
      )}

      {/* Graph */}
      <div ref={cRef} style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
        {!allData && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 480, padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.12, fontFamily: serif }}>{"\u223F"}</div>
              <p style={{ color: "#445566", lineHeight: 1.7, fontFamily: serif, fontStyle: "italic", fontSize: 13, margin: "0 0 10px" }}>
                Strange metals are a CPS phenomenon: quasiparticle nodes dissolve and only relational edges remain. Set a material context, add typed seed nodes, and discover what novel configurations produce non-Fermi liquid behavior.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                {Object.keys(NODE_TYPES).map(function(k) {
                  var nt = NODE_TYPES[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ color: nt.color, fontSize: 10 }}>{nt.icon}</span>
                      <span style={{ fontSize: 8, color: "#556677" }}>{nt.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {Object.keys(EDGE_DEPTHS).map(function(k) {
                  var ed = EDGE_DEPTHS[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 12, height: 2, background: ed.color, borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: "#556677" }}>{ed.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentData && <GraphView data={currentData} onSelect={setSel} width={dims.w} height={dims.h} />}

        {allData && (
          <button onClick={function() { setPanel(!panel); }}
            style={{ position: "absolute", top: 8, right: 8, zIndex: 20, padding: "4px 10px", background: panel ? "#1a1a3e" : "#0f0f22", border: "1px solid #2a2a4e", borderRadius: 3, color: "#8899bb", fontFamily: mono, fontSize: 9, cursor: "pointer" }}>
            {panel ? "\u2715" : "\u25C8"}
          </button>
        )}

        {/* Panel */}
        {allData && panel && (
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 330, maxWidth: "85%", zIndex: 15,
            background: "rgba(6,6,15,0.97)", borderLeft: "1px solid rgba(255,255,255,0.04)",
            overflow: "auto", padding: "34px 12px 20px",
          }}>

            {sel ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: EDGE_DEPTHS[sel.depth] ? EDGE_DEPTHS[sel.depth].color : "#4a9eff", marginBottom: 3 }}>
                  {EDGE_DEPTHS[sel.depth] ? EDGE_DEPTHS[sel.depth].label : sel.depth}
                </div>
                <div style={{ fontSize: 10, color: "#c8d0dd", marginBottom: 4, fontWeight: 500 }}>{eLabel(sel)}</div>
                <Bar weight={sel.weight} depth={sel.depth} />
                <p style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.5, marginTop: 6, fontFamily: serif }}>{sel.description}</p>
              </div>
            ) : (
              <div style={{ fontSize: 8, color: "#445566", fontStyle: "italic", marginBottom: 8 }}>Tap an edge to inspect coupling</div>
            )}

            {/* Goal pathway */}
            {pathway && active === "strange_metal" && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#22c55e", marginBottom: 4 }}>{"\u2192"} Resolution Pathway</div>
                <div style={{ padding: "6px 8px", background: "#060f08", borderRadius: 3, borderLeft: "2px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ fontSize: 11, color: "#88cc99", lineHeight: 1.5, margin: 0, fontFamily: serif }}>{pathway}</p>
                </div>
              </div>
            )}

            {/* Predicted nodes */}
            {predicted.length > 0 && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff9f43", marginBottom: 4 }}>{"\u2605"} Novel Predictions ({predicted.length})</div>
                {predicted.map(function(n, i) {
                  return (
                    <div key={i} style={{ marginBottom: 5, padding: "5px 7px", background: "#100a04", borderRadius: 3, borderLeft: "2px solid rgba(255,159,67,0.25)" }}>
                      <div style={{ fontSize: 10, color: "#ff9f43", fontWeight: 600 }}>{n.label}</div>
                      <div style={{ fontSize: 10, color: "#887766", lineHeight: 1.4, fontFamily: serif, marginTop: 1 }}>{n.description}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Experimental predictions */}
            {exps.length > 0 && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#06b6d4", marginBottom: 4 }}>{"\u2691"} Experimental Tests</div>
                {exps.map(function(exp, i) {
                  return (
                    <div key={i} style={{ padding: "4px 7px", marginBottom: 3, fontSize: 10, color: "#6bb8cc", lineHeight: 1.5, fontFamily: serif, background: "#060a0f", borderRadius: 3, borderLeft: "2px solid rgba(6,182,212,0.2)" }}>
                      {exp}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Synthesis */}
            {synth && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f59e0b", marginBottom: 4 }}>{"\u2697"} Synthesis Pathway</div>
                <p style={{ fontSize: 10, color: "#b8943a", lineHeight: 1.5, margin: 0, fontFamily: serif }}>{synth}</p>
              </div>
            )}

            {/* Key question */}
            {keyQ && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ec4899", marginBottom: 4 }}>? Key Question</div>
                <p style={{ fontSize: 11, color: "#cc6699", lineHeight: 1.5, margin: 0, fontFamily: serif, fontStyle: "italic" }}>{keyQ}</p>
              </div>
            )}

            {/* Edges */}
            {byDepth && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#445566", marginBottom: 4 }}>Coupling Inventory</div>
                {["coupling", "emergent", "holographic"].map(function(depth) {
                  var edges = byDepth[depth];
                  if (!edges || edges.length === 0) return null;
                  var ed = EDGE_DEPTHS[depth];
                  return (
                    <div key={depth} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 8, color: ed.color, marginBottom: 2 }}>{ed.label} ({edges.length})</div>
                      {edges.sort(function(a, b) { return b.weight - a.weight; }).map(function(edge, i) {
                        return (
                          <div key={i} onClick={function() { setSel(edge); }}
                            style={{ padding: "2px 4px", fontSize: 8, color: "#667788", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 4 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eShort(edge)}</span>
                            <span style={{ color: ed.color, opacity: 0.6, flexShrink: 0 }}>{Math.round(edge.weight * 100)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inversions */}
            {phaseInversions.length > 0 && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff4a8a", marginBottom: 4 }}>{"\u21A9"} Inversions</div>
                {phaseInversions.map(function(item, i) {
                  return (
                    <div key={i} style={{ marginBottom: 6, padding: "5px 7px", background: "#0f0a14", borderRadius: 3, borderLeft: "2px solid rgba(255,74,138,0.2)" }}>
                      <p style={{ fontSize: 10, color: "#aa99bb", lineHeight: 1.4, margin: "0 0 3px", fontFamily: serif }}>{item.insight}</p>
                      <Bar weight={item.confidence} depth="holographic" />
                    </div>
                  );
                })}
              </div>
            )}

            {narrative && (
              <div style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#445566", marginBottom: 4 }}>Phase Evolution</div>
                <p style={{ fontSize: 10, color: "#778899", lineHeight: 1.5, margin: 0, fontFamily: serif, fontStyle: "italic" }}>{narrative}</p>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar */}
        {allData && !panel && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
            padding: "7px 16px", background: "linear-gradient(transparent, rgba(6,6,15,0.9) 30%)",
            display: "flex", gap: 10, alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 8, color: (active === "strange_metal" && hasGoal) ? "#22c55e" : PHASE_COLORS[active] }}>
              {(active === "strange_metal" && hasGoal) ? "\u2192 Resolved" : PHASE_LABELS[active]}
            </span>
            {predicted.length > 0 && <span style={{ fontSize: 8, color: "#ff9f43" }}>{"\u2605"}{predicted.length} novel</span>}
            {exps.length > 0 && <span style={{ fontSize: 8, color: "#06b6d4" }}>{"\u2691"}{exps.length} expts</span>}
            {byDepth && ["coupling", "emergent", "holographic"].map(function(d) {
              var e = byDepth[d]; if (!e || !e.length) return null;
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 10, height: 2, background: EDGE_DEPTHS[d].color, borderRadius: 1 }} />
                  <span style={{ fontSize: 8, color: "#556677" }}>{e.length}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{"@keyframes cpsPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }"}</style>
    </div>
  );
}
