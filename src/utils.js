function normalizeValue(s) {
  // Collapse all whitespace sequences (newlines, tabs, non-breaking spaces) to a single space
  return s.replace(/[\s\u00a0]+/g, ' ').trim();
}

function getWorkflowId() {
  const m = location.pathname.match(/\/workflow\/([^/]+)/);
  return m?.[1] ?? null;
}

module.exports = { normalizeValue, getWorkflowId };
