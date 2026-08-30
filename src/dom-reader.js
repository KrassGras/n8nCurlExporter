const { normalizeValue } = require('./utils');

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
  if (hint?.textContent.trim()) return normalizeValue(hint.textContent);

  // Fall back to CodeMirror line content (raw / static value)
  const cmLine = container.querySelector('.cm-line');
  if (cmLine) return normalizeValue(cmLine.textContent);

  // Last resort: plain input or textarea
  const input = container.querySelector('input:not([type=hidden]), textarea');
  return normalizeValue(input?.value ?? '');
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
      // Labels are "Name FixedExpression" / "Value FixedExpression" — match by first word
      if (label.startsWith('name')) {
        pendingName = getFieldValue(c);
      } else if (label.startsWith('value') && pendingName !== null) {
        const val = getFieldValue(c);
        if (pendingName && val) headers.push([pendingName, val]);
        pendingName = null;
      }
    }

    if (section === 'body') {
      // Skip type-selector and unrelated settings containers
      if (
        label.includes('body content type') ||
        label.includes('specify body') ||
        label.includes('ssl') ||
        label.includes('always output') ||
        label.includes('execute once') ||
        label.includes('retry') ||
        label.includes('on error') ||
        label.includes('notes') ||
        label.includes('display note')
      ) continue;
      const val = getFieldValue(c);
      if (val && !body) body = val;
    }
  }

  return { headers, body };
}

module.exports = { findPanel, getContainerLabel, getFieldValue, getMethod, getUrl, parseParameters };
