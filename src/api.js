async function hasRecentExecution(workflowId) {
  const { baseUrl, apiKey } = await chrome.storage.sync.get(['baseUrl', 'apiKey']);
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

async function fetchWorkflowData(workflowId, origin) {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (!apiKey) throw new Error('NO_API_KEY');

  const res = await fetch(`${origin}/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data?.nodes ? json.data : json;
}

module.exports = { hasRecentExecution, fetchWorkflowData };
