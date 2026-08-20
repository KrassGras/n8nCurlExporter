'use strict';

// ── helpers ───────────────────────────────────────────────────────────────────

function getWorkflowId() {
  const m = location.pathname.match(/\/workflow\/([^/]+)/);
  return m?.[1] ?? null;
}

function showToast(msg, isError = false) {
  document.getElementById('n8n-curl-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'n8n-curl-toast';
  Object.assign(t.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '10px 16px',
    borderRadius: '6px',
    background: isError ? '#d03050' : '#18a058',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'sans-serif',
    zIndex: '999999',
    boxShadow: '0 2px 8px rgba(0,0,0,.3)',
    transition: 'opacity .3s',
  });
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, isError ? 4000 : 2500);
}

// ── DOM reading ───────────────────────────────────────────────────────────────

function findPanel() {
  const importBtn = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Import cURL');
  if (!importBtn) return null;

  // Walk up until we find a container with multiple parameter-inputs
  let el = importBtn.parentElement;
  while (el && el !== document.body) {
    if (el.querySelectorAll('[data-test-id="parameter-input"]').length >= 2) return el;
    el = el.parentElement;
  }
  return null;
}

function getContainerLabel(container) {
  const el = container.querySelector('[class*="labelRow"] label, [class*="labelRow"] span, label');
  return el?.textContent?.trim().toLowerCase() ?? '';
}

function getFieldValue(container) {
  // Prefer the evaluated hint (resolved expression)
  const hint = container.querySelector('[data-test-id="parameter-input-hint"]');
  if (hint?.textContent.trim()) return hint.textContent.trim();

  // Fall back to CodeMirror line content (raw / static value)
  const cmLine = container.querySelector('.cm-line');
  if (cmLine) return cmLine.textContent.trim();

  // Last resort: plain input or textarea
  const input = container.querySelector('input:not([type=hidden]), textarea');
  return input?.value?.trim() ?? '';
}

function getMethod(panel) {
  // Element Plus select shows selected label in .el-select__selected-item
  const selectedItem = panel.querySelector('.el-select__selected-item');
  if (selectedItem?.textContent.trim()) return selectedItem.textContent.trim().toUpperCase();

  // Older Element Plus: value in the trigger input
  const triggerInput = panel.querySelector('.el-select .el-input__inner');
  if (triggerInput?.value) return triggerInput.value.trim().toUpperCase();

  // Scan leaf nodes for a bare HTTP method word
  const methods = ['DELETE', 'PATCH', 'POST', 'PUT', 'GET', 'HEAD', 'OPTIONS'];
  for (const method of methods) {
    const found = [...panel.querySelectorAll('span, div')]
      .find(el => el.childElementCount === 0 && el.textContent.trim() === method);
    if (found) return method;
  }

  return 'GET';
}

function getUrl(panel) {
  // Evaluated URL hint always starts with http
  for (const hint of panel.querySelectorAll('[data-test-id="parameter-input-hint"]')) {
    const t = hint.textContent.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
  }

  // Static URL fallback (no expression, no hint)
  for (const input of panel.querySelectorAll('[data-test-id="parameter-input"]')) {
    const t = input.querySelector('.cm-line')?.textContent.trim() ?? '';
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
  }

  return null;
}

function parseParameters(panel) {
  const containers = [...panel.querySelectorAll('[class*="parameterContainer"]')];

  let section = 'other'; // 'headers' | 'body' | 'queryParams' | 'other'
  const headers = [];
  let body = null;
  let pendingName = null;

  for (const c of containers) {
    const label = getContainerLabel(c);

    // Detect section transitions from toggle labels
    if (label.includes('send query')) { section = 'queryParams'; pendingName = null; continue; }
    if (label.includes('send header')) { section = 'headers'; pendingName = null; continue; }
    if (label.includes('send body')) { section = 'body'; pendingName = null; continue; }
    // Skip meta-controls like "Specify Headers" dropdowns
    if (label.includes('specify') || label.includes('authentication')) continue;

    if (section === 'headers') {
      if (label === 'name') {
        pendingName = getFieldValue(c);
      } else if (label === 'value' && pendingName !== null) {
        const val = getFieldValue(c);
        if (pendingName && val) headers.push([pendingName, val]);
        pendingName = null;
      }
    }

    if (section === 'body') {
      // Skip type-selector containers (content-type dropdowns etc.)
      if (label.includes('body content type') || label.includes('specify body')) continue;
      const val = getFieldValue(c);
      if (val && !body) body = val;
    }
  }

  return { headers, body };
}

// ── curl builder ──────────────────────────────────────────────────────────────

function escSingleQuotes(s) {
  return s.replace(/'/g, "'\\''");
}

function buildCurl(method, url, headers, body) {
  const lines = [`curl -X ${method} '${escSingleQuotes(url)}'`];

  for (const [name, value] of headers) {
    lines[lines.length - 1] += ' \\';
    lines.push(`  -H '${escSingleQuotes(name)}: ${escSingleQuotes(value)}'`);
  }

  if (body) {
    lines[lines.length - 1] += ' \\';
    lines.push(`  --data-raw '${escSingleQuotes(body)}'`);
  }

  return lines.join('\n');
}

// ── execution check ───────────────────────────────────────────────────────────

async function hasRecentExecution() {
  const { baseUrl, apiKey } = await chrome.storage.sync.get(['baseUrl', 'apiKey']);
  const workflowId = getWorkflowId();
  if (!apiKey || !workflowId || !baseUrl) return null; // unknown

  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/v1/executions?workflowId=${workflowId}&limit=1`,
      { headers: { 'X-N8N-API-KEY': apiKey } }
    );
    const json = await res.json();
    return (json.data?.length ?? 0) > 0;
  } catch {
    return null;
  }
}

// ── export handler ────────────────────────────────────────────────────────────

async function handleExport() {
  const panel = findPanel();
  if (!panel) {
    showToast('Could not find the HTTP Request node panel.', true);
    return;
  }

  const hints = panel.querySelectorAll('[data-test-id="parameter-input-hint"]');
  const hasHints = hints.length > 0;
  const hasExpressions = [...panel.querySelectorAll('.cm-line')]
    .some(el => el.textContent.includes('{{'));

  if (hasExpressions && !hasHints) {
    // Expressions present but none resolved — node hasn't been executed
    const executed = await hasRecentExecution();
    if (executed === false) {
      showToast('Execute the workflow first to evaluate expressions.', true);
      return;
    }
    if (executed === null && !hasHints) {
      showToast('No evaluated values found. Execute the workflow first.', true);
      return;
    }
  }

  const method = getMethod(panel);
  const url = getUrl(panel);

  if (!url) {
    showToast('Could not read URL from the node panel.', true);
    return;
  }

  const { headers, body } = parseParameters(panel);
  const curl = buildCurl(method, url, headers, body);

  try {
    await navigator.clipboard.writeText(curl);
    showToast('cURL copied to clipboard!');
  } catch {
    showToast('Clipboard access denied — check browser permissions.', true);
  }
}

// ── button injection ──────────────────────────────────────────────────────────

function injectButton() {
  if (document.getElementById('n8n-curl-export-btn')) return;

  const importBtn = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Import cURL');
  if (!importBtn) return;

  const btn = document.createElement('button');
  btn.id = 'n8n-curl-export-btn';
  btn.textContent = 'Export cURL';
  Object.assign(btn.style, {
    marginLeft: '8px',
    padding: '5px 12px',
    background: '#ff6d5a',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s',
  });
  btn.onmouseenter = () => { btn.style.background = '#e8503f'; };
  btn.onmouseleave = () => { btn.style.background = '#ff6d5a'; };
  btn.onclick = handleExport;

  importBtn.after(btn);
}

// ── init ──────────────────────────────────────────────────────────────────────

async function init() {
  const { baseUrl } = await chrome.storage.sync.get('baseUrl');
  if (!baseUrl) return;

  try {
    if (new URL(baseUrl).origin !== location.origin) return;
  } catch {
    return;
  }

  const observer = new MutationObserver(injectButton);
  observer.observe(document.body, { childList: true, subtree: true });
  injectButton();
}

init();
