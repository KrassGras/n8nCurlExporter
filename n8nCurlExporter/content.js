(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/utils.js
  var require_utils = __commonJS({
    "src/utils.js"(exports, module) {
      function normalizeValue(s) {
        return s.replace(/[\s\u00a0]+/g, " ").trim();
      }
      function getWorkflowId2() {
        const m = location.pathname.match(/\/workflow\/([^/]+)/);
        return m?.[1] ?? null;
      }
      module.exports = { normalizeValue, getWorkflowId: getWorkflowId2 };
    }
  });

  // src/curl-builder.js
  var require_curl_builder = __commonJS({
    "src/curl-builder.js"(exports, module) {
      function escSingleQuotes(s) {
        return s.replace(/'/g, "'\\''");
      }
      function buildCurl2(method, url, headers, body) {
        const lines = [
          `curl --request ${method} \\`,
          `  --url '${escSingleQuotes(url)}'`
        ];
        for (const [name, value] of headers) {
          lines[lines.length - 1] += " \\";
          lines.push(`  --header '${escSingleQuotes(name)}: ${escSingleQuotes(value)}'`);
        }
        if (body) {
          lines[lines.length - 1] += " \\";
          lines.push(`  --data '${escSingleQuotes(body)}'`);
        }
        return lines.join("\n");
      }
      module.exports = { escSingleQuotes, buildCurl: buildCurl2 };
    }
  });

  // src/reference-graph.js
  var require_reference_graph = __commonJS({
    "src/reference-graph.js"(exports, module) {
      var NODE_REF_PATTERNS = [
        /\$\(\s*(['"`])((?:(?!\1).)+)\1\s*\)/g,
        // $('NodeName')
        /\$node\[\s*(['"`])((?:(?!\1).)+)\1\s*\]/g,
        // $node["NodeName"]
        /\$items\(\s*(['"`])((?:(?!\1).)+)\1/g
        // $items('NodeName', ...)
      ];
      function findReferencedNames(text) {
        const names = /* @__PURE__ */ new Set();
        for (const pattern of NODE_REF_PATTERNS) {
          pattern.lastIndex = 0;
          let m;
          while (m = pattern.exec(text)) names.add(m[2]);
        }
        return names;
      }
      function collectStrings(value, acc) {
        if (typeof value === "string") {
          if (value.includes("$")) acc.push(value);
        } else if (Array.isArray(value)) {
          for (const v of value) collectStrings(v, acc);
        } else if (value && typeof value === "object") {
          for (const v of Object.values(value)) collectStrings(v, acc);
        }
      }
      function buildReferenceGraph2(nodes) {
        const nodeNames = new Set(nodes.map((n) => n.name));
        const references = /* @__PURE__ */ new Map();
        const referencedBy = /* @__PURE__ */ new Map();
        const unresolved = /* @__PURE__ */ new Map();
        for (const name of nodeNames) {
          references.set(name, /* @__PURE__ */ new Set());
          referencedBy.set(name, /* @__PURE__ */ new Set());
          unresolved.set(name, /* @__PURE__ */ new Set());
        }
        for (const node of nodes) {
          const strings = [];
          collectStrings(node.parameters, strings);
          const found = /* @__PURE__ */ new Set();
          for (const s of strings) for (const n of findReferencedNames(s)) found.add(n);
          found.delete(node.name);
          for (const refName of found) {
            if (nodeNames.has(refName)) {
              references.get(node.name).add(refName);
              referencedBy.get(refName).add(node.name);
            } else {
              unresolved.get(node.name).add(refName);
            }
          }
        }
        return { nodeNames: [...nodeNames], references, referencedBy, unresolved };
      }
      module.exports = { NODE_REF_PATTERNS, findReferencedNames, collectStrings, buildReferenceGraph: buildReferenceGraph2 };
    }
  });

  // src/api.js
  var require_api = __commonJS({
    "src/api.js"(exports, module) {
      async function hasRecentExecution2(workflowId) {
        const { baseUrl, apiKey } = await chrome.storage.sync.get(["baseUrl", "apiKey"]);
        if (!apiKey || !workflowId || !baseUrl) return null;
        try {
          const res = await fetch(
            `${baseUrl.replace(/\/$/, "")}/api/v1/executions?workflowId=${workflowId}&limit=1`,
            { headers: { "X-N8N-API-KEY": apiKey } }
          );
          const json = await res.json();
          return (json.data?.length ?? 0) > 0;
        } catch {
          return null;
        }
      }
      async function fetchWorkflowData2(workflowId, origin) {
        const res = await fetch(`${origin}/rest/workflows/${workflowId}`, {
          headers: { Accept: "application/json" },
          credentials: "include"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.data?.nodes ? json.data : json;
      }
      module.exports = { hasRecentExecution: hasRecentExecution2, fetchWorkflowData: fetchWorkflowData2 };
    }
  });

  // src/dom-reader.js
  var require_dom_reader = __commonJS({
    "src/dom-reader.js"(exports, module) {
      var { normalizeValue } = require_utils();
      function findPanel2() {
        const importBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Import cURL");
        if (!importBtn) return null;
        let el = importBtn.parentElement;
        while (el && el !== document.body) {
          if (el.querySelectorAll('[data-test-id="parameter-input"]').length >= 2) return el;
          el = el.parentElement;
        }
        return null;
      }
      function getContainerLabel(container) {
        const el = container.querySelector('[class*="labelRow"] label, [class*="labelRow"] span, label');
        return el?.textContent?.trim().toLowerCase() ?? "";
      }
      function getFieldValue(container) {
        const hint = container.querySelector('[data-test-id="parameter-input-hint"]');
        if (hint?.textContent.trim()) return normalizeValue(hint.textContent);
        const cmLine = container.querySelector(".cm-line");
        if (cmLine) return normalizeValue(cmLine.textContent);
        const input = container.querySelector("input:not([type=hidden]), textarea");
        return normalizeValue(input?.value ?? "");
      }
      function getMethod2(panel) {
        const selectedItem = panel.querySelector(".el-select__selected-item");
        if (selectedItem?.textContent.trim()) return selectedItem.textContent.trim().toUpperCase();
        const triggerInput = panel.querySelector(".el-select .el-input__inner");
        if (triggerInput?.value) return triggerInput.value.trim().toUpperCase();
        const methods = ["DELETE", "PATCH", "POST", "PUT", "GET", "HEAD", "OPTIONS"];
        for (const method of methods) {
          const found = [...panel.querySelectorAll("span, div")].find((el) => el.childElementCount === 0 && el.textContent.trim() === method);
          if (found) return method;
        }
        return "GET";
      }
      function getUrl2(panel) {
        for (const hint of panel.querySelectorAll('[data-test-id="parameter-input-hint"]')) {
          const t = hint.textContent.trim();
          if (t.startsWith("http://") || t.startsWith("https://")) return t;
        }
        for (const input of panel.querySelectorAll('[data-test-id="parameter-input"]')) {
          const t = input.querySelector(".cm-line")?.textContent.trim() ?? "";
          if (t.startsWith("http://") || t.startsWith("https://")) return t;
        }
        return null;
      }
      function parseParameters2(panel) {
        const containers = [...panel.querySelectorAll('[class*="parameterContainer"]')];
        let section = "other";
        const headers = [];
        let body = null;
        let pendingName = null;
        for (const c of containers) {
          const label = getContainerLabel(c);
          if (label.includes("send query")) {
            section = "queryParams";
            pendingName = null;
            continue;
          }
          if (label.includes("send header")) {
            section = "headers";
            pendingName = null;
            continue;
          }
          if (label.includes("send body")) {
            section = "body";
            pendingName = null;
            continue;
          }
          if (label.includes("specify") || label.includes("authentication")) continue;
          if (section === "headers") {
            if (label.startsWith("name")) {
              pendingName = getFieldValue(c);
            } else if (label.startsWith("value") && pendingName !== null) {
              const val = getFieldValue(c);
              if (pendingName && val) headers.push([pendingName, val]);
              pendingName = null;
            }
          }
          if (section === "body") {
            if (label.includes("body content type") || label.includes("specify body") || label.includes("ssl") || label.includes("always output") || label.includes("execute once") || label.includes("retry") || label.includes("on error") || label.includes("notes") || label.includes("display note")) continue;
            const val = getFieldValue(c);
            if (val && !body) body = val;
          }
        }
        return { headers, body };
      }
      module.exports = { findPanel: findPanel2, getContainerLabel, getFieldValue, getMethod: getMethod2, getUrl: getUrl2, parseParameters: parseParameters2 };
    }
  });

  // src/ui.js
  var require_ui = __commonJS({
    "src/ui.js"(exports, module) {
      var { getWorkflowId: getWorkflowId2 } = require_utils();
      function showToast2(msg, isError = false) {
        document.getElementById("n8n-curl-toast")?.remove();
        const t = document.createElement("div");
        t.id = "n8n-curl-toast";
        Object.assign(t.style, {
          position: "fixed",
          bottom: "24px",
          right: "24px",
          padding: "10px 16px",
          borderRadius: "6px",
          background: isError ? "#d03050" : "#18a058",
          color: "#fff",
          fontSize: "13px",
          fontFamily: "sans-serif",
          zIndex: "999999",
          boxShadow: "0 2px 8px rgba(0,0,0,.3)",
          transition: "opacity .3s"
        });
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => {
          t.style.opacity = "0";
          setTimeout(() => t.remove(), 300);
        }, isError ? 4e3 : 2500);
      }
      function makeToggleBtn(label) {
        const b = document.createElement("button");
        b.textContent = label;
        Object.assign(b.style, {
          padding: "5px 10px",
          borderRadius: "4px",
          border: "1px solid #ff6d5a",
          background: "transparent",
          color: "#ff6d5a",
          fontSize: "12px",
          cursor: "pointer"
        });
        return b;
      }
      function makeRefLine(label, items, color) {
        const line = document.createElement("div");
        Object.assign(line.style, { fontSize: "12px", marginTop: "3px", color: "#ccc" });
        const strong = document.createElement("span");
        strong.textContent = `${label}: `;
        Object.assign(strong.style, { color, fontWeight: "600" });
        line.appendChild(strong);
        line.appendChild(document.createTextNode(items.join(", ")));
        return line;
      }
      function renderListView(graph, filter) {
        const wrap = document.createElement("div");
        wrap.style.padding = "14px 18px";
        const names = graph.nodeNames.filter((n) => !filter || n.toLowerCase().includes(filter)).sort((a, b) => graph.referencedBy.get(b).size - graph.referencedBy.get(a).size || a.localeCompare(b));
        let shown = 0;
        for (const name of names) {
          const refs = [...graph.references.get(name)];
          const refBy = [...graph.referencedBy.get(name)];
          const bad = [...graph.unresolved.get(name)];
          if (!refs.length && !refBy.length && !bad.length) continue;
          shown++;
          const row = document.createElement("div");
          Object.assign(row.style, { padding: "10px 0", borderBottom: "1px solid #2a2a2a" });
          const nameEl = document.createElement("div");
          nameEl.textContent = name;
          Object.assign(nameEl.style, { fontWeight: "600", fontSize: "13px" });
          row.appendChild(nameEl);
          if (refBy.length) row.appendChild(makeRefLine("Referenced by", refBy, "#5cc8ff"));
          if (refs.length) row.appendChild(makeRefLine("References", refs, "#ffb85c"));
          if (bad.length) row.appendChild(makeRefLine("Unresolved", bad, "#ff5c5c"));
          wrap.appendChild(row);
        }
        if (!shown) {
          const empty = document.createElement("div");
          empty.style.color = "#888";
          empty.textContent = filter ? "No nodes match." : "No node-to-node expression references found in this workflow.";
          wrap.appendChild(empty);
        }
        const untouched = graph.nodeNames.filter((n) => !graph.references.get(n).size && !graph.referencedBy.get(n).size && !graph.unresolved.get(n).size);
        if (untouched.length && !filter) {
          const note = document.createElement("div");
          Object.assign(note.style, { marginTop: "10px", fontSize: "11px", color: "#666" });
          note.textContent = `${untouched.length} node(s) with no expression references are hidden.`;
          wrap.appendChild(note);
        }
        return wrap;
      }
      function renderGraphView(graph, filter) {
        const wrap = document.createElement("div");
        Object.assign(wrap.style, { padding: "14px", height: "100%", boxSizing: "border-box" });
        const involved = graph.nodeNames.filter((n) => graph.references.get(n).size || graph.referencedBy.get(n).size);
        if (!involved.length) {
          wrap.style.color = "#888";
          wrap.textContent = "No node-to-node expression references found in this workflow.";
          return wrap;
        }
        const size = 640;
        const cx = size / 2, cy = size / 2, r = size / 2 - 90;
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        const defs = document.createElementNS(svgNS, "defs");
        const marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", "ref-arrow");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "7");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("orient", "auto-start-reverse");
        const arrowPath = document.createElementNS(svgNS, "path");
        arrowPath.setAttribute("d", "M0,0 L10,5 L0,10 z");
        arrowPath.setAttribute("fill", "#ffb85c");
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svg.appendChild(defs);
        const positions = /* @__PURE__ */ new Map();
        involved.forEach((name, i) => {
          const angle = 2 * Math.PI * i / involved.length - Math.PI / 2;
          positions.set(name, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        });
        const edgesGroup = document.createElementNS(svgNS, "g");
        const nodesGroup = document.createElementNS(svgNS, "g");
        const edgeEls = [];
        for (const source of involved) {
          for (const target of graph.references.get(source)) {
            if (!positions.has(target)) continue;
            const p1 = positions.get(source), p2 = positions.get(target);
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", p1.x);
            line.setAttribute("y1", p1.y);
            line.setAttribute("x2", p2.x);
            line.setAttribute("y2", p2.y);
            line.setAttribute("stroke", "#ffb85c");
            line.setAttribute("stroke-width", "1.4");
            line.setAttribute("opacity", "0.55");
            line.setAttribute("marker-end", "url(#ref-arrow)");
            line.dataset.source = source;
            line.dataset.target = target;
            edgesGroup.appendChild(line);
            edgeEls.push(line);
          }
        }
        let activeNode = null;
        function applyHighlight() {
          if (!activeNode) {
            for (const { circle, label } of nodeEls.values()) {
              circle.setAttribute("opacity", "1");
              circle.setAttribute("stroke", "none");
              circle.setAttribute("stroke-width", "0");
              label.setAttribute("opacity", "1");
            }
            for (const line of edgeEls) line.setAttribute("opacity", "0.55");
            return;
          }
          for (const [name, { circle, label }] of nodeEls) {
            const connected = name === activeNode || graph.references.get(activeNode)?.has(name) || graph.referencedBy.get(activeNode)?.has(name);
            circle.setAttribute("opacity", connected ? "1" : "0.15");
            label.setAttribute("opacity", connected ? "1" : "0.15");
            circle.setAttribute("stroke", name === activeNode ? "#fff" : "none");
            circle.setAttribute("stroke-width", name === activeNode ? "2" : "0");
          }
          for (const line of edgeEls) {
            const connected = line.dataset.source === activeNode || line.dataset.target === activeNode;
            line.setAttribute("opacity", connected ? "0.95" : "0.08");
          }
        }
        const nodeEls = /* @__PURE__ */ new Map();
        for (const name of involved) {
          const { x, y } = positions.get(name);
          const g = document.createElementNS(svgNS, "g");
          g.style.cursor = "pointer";
          const circle = document.createElementNS(svgNS, "circle");
          circle.setAttribute("cx", x);
          circle.setAttribute("cy", y);
          circle.setAttribute("r", "7");
          circle.setAttribute("fill", graph.referencedBy.get(name).size ? "#5cc8ff" : "#888");
          g.appendChild(circle);
          const label = document.createElementNS(svgNS, "text");
          label.textContent = name.length > 22 ? `${name.slice(0, 20)}\u2026` : name;
          label.setAttribute("x", x + (x > cx ? 10 : -10));
          label.setAttribute("y", y + 4);
          label.setAttribute("text-anchor", x > cx ? "start" : "end");
          label.setAttribute("fill", "#eee");
          label.setAttribute("font-size", "11");
          g.appendChild(label);
          const titleEl = document.createElementNS(svgNS, "title");
          titleEl.textContent = name;
          g.appendChild(titleEl);
          g.addEventListener("click", () => {
            activeNode = activeNode === name ? null : name;
            applyHighlight();
          });
          nodesGroup.appendChild(g);
          nodeEls.set(name, { circle, label });
        }
        svg.appendChild(edgesGroup);
        svg.appendChild(nodesGroup);
        wrap.appendChild(svg);
        if (filter) {
          const matches = involved.filter((n) => n.toLowerCase().includes(filter));
          if (matches.length === 1) {
            activeNode = matches[0];
            applyHighlight();
          } else if (matches.length > 1) {
            for (const [name, { circle, label }] of nodeEls) {
              const isMatch = matches.includes(name);
              circle.setAttribute("opacity", isMatch ? "1" : "0.15");
              label.setAttribute("opacity", isMatch ? "1" : "0.15");
            }
            for (const line of edgeEls) line.setAttribute("opacity", "0.08");
          }
        }
        return wrap;
      }
      function renderReferenceModal2(workflowName, graph) {
        document.getElementById("n8n-ref-graph-overlay")?.remove();
        const overlay = document.createElement("div");
        overlay.id = "n8n-ref-graph-overlay";
        Object.assign(overlay.style, {
          position: "fixed",
          inset: "0",
          background: "rgba(0,0,0,.55)",
          zIndex: "999999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif"
        });
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) close();
        });
        const modal = document.createElement("div");
        Object.assign(modal.style, {
          width: "min(1000px, 92vw)",
          height: "min(720px, 88vh)",
          background: "#1e1e1e",
          color: "#eee",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,.5)"
        });
        overlay.appendChild(modal);
        const header = document.createElement("div");
        Object.assign(header.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid #333",
          gap: "12px"
        });
        const title = document.createElement("div");
        title.textContent = `Node References \u2014 ${workflowName}`;
        Object.assign(title.style, { fontWeight: "600", fontSize: "14px" });
        header.appendChild(title);
        const controls = document.createElement("div");
        Object.assign(controls.style, { display: "flex", gap: "8px", alignItems: "center" });
        const search = document.createElement("input");
        search.placeholder = "Filter node\u2026";
        Object.assign(search.style, {
          padding: "5px 8px",
          borderRadius: "4px",
          border: "1px solid #444",
          background: "#111",
          color: "#eee",
          fontSize: "12px",
          width: "160px"
        });
        const listBtn = makeToggleBtn("List");
        const graphBtn = makeToggleBtn("Graph");
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u2715";
        Object.assign(closeBtn.style, {
          background: "transparent",
          border: "none",
          color: "#aaa",
          fontSize: "16px",
          cursor: "pointer"
        });
        closeBtn.onclick = () => close();
        controls.append(search, listBtn, graphBtn, closeBtn);
        header.appendChild(controls);
        modal.appendChild(header);
        const body = document.createElement("div");
        Object.assign(body.style, { flex: "1", overflow: "auto", position: "relative" });
        modal.appendChild(body);
        let mode = "list";
        function renderBody() {
          body.innerHTML = "";
          const filter = search.value.trim().toLowerCase();
          body.appendChild(mode === "list" ? renderListView(graph, filter) : renderGraphView(graph, filter));
          listBtn.style.opacity = mode === "list" ? "1" : ".5";
          graphBtn.style.opacity = mode === "graph" ? "1" : ".5";
        }
        listBtn.onclick = () => {
          mode = "list";
          renderBody();
        };
        graphBtn.onclick = () => {
          mode = "graph";
          renderBody();
        };
        search.oninput = renderBody;
        function close() {
          overlay.remove();
          document.removeEventListener("keydown", escHandler);
        }
        function escHandler(e) {
          if (e.key === "Escape") close();
        }
        document.addEventListener("keydown", escHandler);
        renderBody();
        document.body.appendChild(overlay);
      }
      function injectCurlButton2(handleExport2) {
        if (document.getElementById("n8n-curl-export-btn")) return;
        const importBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Import cURL");
        if (!importBtn) return;
        const btn = document.createElement("button");
        btn.id = "n8n-curl-export-btn";
        btn.textContent = "Export cURL";
        Object.assign(btn.style, {
          marginLeft: "8px",
          padding: "5px 12px",
          background: "#ff6d5a",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "500",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background .15s"
        });
        btn.onmouseenter = () => {
          btn.style.background = "#e8503f";
        };
        btn.onmouseleave = () => {
          btn.style.background = "#ff6d5a";
        };
        btn.onclick = handleExport2;
        importBtn.after(btn);
      }
      function injectReferenceButton2(handleShowReferences2) {
        const existing = document.getElementById("n8n-ref-graph-btn");
        if (!getWorkflowId2()) {
          existing?.remove();
          return;
        }
        if (existing) return;
        const btn = document.createElement("button");
        btn.id = "n8n-ref-graph-btn";
        btn.textContent = "\u{1F517} References";
        Object.assign(btn.style, {
          position: "fixed",
          left: "24px",
          bottom: "24px",
          padding: "8px 14px",
          background: "#1f1f1f",
          color: "#fff",
          border: "1px solid #ff6d5a",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "inherit",
          zIndex: "99998",
          boxShadow: "0 2px 8px rgba(0,0,0,.35)",
          transition: "background .15s"
        });
        btn.onmouseenter = () => {
          btn.style.background = "#333";
        };
        btn.onmouseleave = () => {
          btn.style.background = "#1f1f1f";
        };
        btn.onclick = handleShowReferences2;
        document.body.appendChild(btn);
      }
      module.exports = {
        showToast: showToast2,
        makeToggleBtn,
        makeRefLine,
        renderListView,
        renderGraphView,
        renderReferenceModal: renderReferenceModal2,
        injectCurlButton: injectCurlButton2,
        injectReferenceButton: injectReferenceButton2
      };
    }
  });

  // src/content.js
  var { getWorkflowId } = require_utils();
  var { buildCurl } = require_curl_builder();
  var { buildReferenceGraph } = require_reference_graph();
  var { hasRecentExecution, fetchWorkflowData } = require_api();
  var { findPanel, getMethod, getUrl, parseParameters } = require_dom_reader();
  var { showToast, renderReferenceModal, injectCurlButton, injectReferenceButton } = require_ui();
  async function handleExport() {
    const panel = findPanel();
    if (!panel) {
      showToast("Could not find the HTTP Request node panel.", true);
      return;
    }
    const hints = panel.querySelectorAll('[data-test-id="parameter-input-hint"]');
    const hasHints = hints.length > 0;
    const hasExpressions = [...panel.querySelectorAll(".cm-line")].some((el) => el.textContent.includes("{{"));
    if (hasExpressions && !hasHints) {
      const workflowId = getWorkflowId();
      const executed = await hasRecentExecution(workflowId);
      if (executed === false) {
        showToast("Execute the workflow first to evaluate expressions.", true);
        return;
      }
      if (executed === null && !hasHints) {
        showToast("No evaluated values found. Execute the workflow first.", true);
        return;
      }
    }
    const method = getMethod(panel);
    const url = getUrl(panel);
    if (!url) {
      showToast("Could not read URL from the node panel.", true);
      return;
    }
    const { headers, body } = parseParameters(panel);
    const curl = buildCurl(method, url, headers, body);
    try {
      await navigator.clipboard.writeText(curl);
      showToast("cURL copied to clipboard!");
    } catch {
      showToast("Clipboard access denied \u2014 check browser permissions.", true);
    }
  }
  async function handleShowReferences() {
    const workflowId = getWorkflowId();
    if (!workflowId) {
      showToast("Open a workflow to see its references.", true);
      return;
    }
    let workflow;
    try {
      workflow = await fetchWorkflowData(workflowId, location.origin);
    } catch {
      showToast("Could not load workflow data.", true);
      return;
    }
    if (!workflow?.nodes?.length) {
      showToast("No nodes found in this workflow.", true);
      return;
    }
    const graph = buildReferenceGraph(workflow.nodes);
    renderReferenceModal(workflow.name ?? "Workflow", graph);
  }
  function syncUI() {
    injectCurlButton(handleExport);
    injectReferenceButton(handleShowReferences);
  }
  async function init() {
    const { baseUrl } = await chrome.storage.sync.get("baseUrl");
    if (!baseUrl) return;
    try {
      if (new URL(baseUrl).origin !== location.origin) return;
    } catch {
      return;
    }
    const observer = new MutationObserver(syncUI);
    observer.observe(document.body, { childList: true, subtree: true });
    syncUI();
  }
  init();
})();
