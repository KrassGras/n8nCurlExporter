const { getWorkflowId } = require('./utils');
const { buildCurl } = require('./curl-builder');
const { buildReferenceGraph } = require('./reference-graph');
const { hasRecentExecution, fetchWorkflowData } = require('./api');
const { findPanel, getMethod, getUrl, parseParameters } = require('./dom-reader');
const { showToast, renderReferenceModal, injectCurlButton, injectReferenceButton } = require('./ui');

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
    const workflowId = getWorkflowId();
    const executed = await hasRecentExecution(workflowId);
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

async function handleShowReferences() {
  const workflowId = getWorkflowId();
  if (!workflowId) {
    showToast('Open a workflow to see its references.', true);
    return;
  }

  let workflow;
  try {
    workflow = await fetchWorkflowData(workflowId, location.origin);
  } catch (err) {
    if (err.message === 'NO_API_KEY') {
      showToast('Set your n8n API key in the extension popup first.', true);
    } else {
      showToast('Could not load workflow data.', true);
    }
    return;
  }

  if (!workflow?.nodes?.length) {
    showToast('No nodes found in this workflow.', true);
    return;
  }

  const graph = buildReferenceGraph(workflow.nodes);
  renderReferenceModal(workflow.name ?? 'Workflow', graph);
}

function syncUI() {
  injectCurlButton(handleExport);
  injectReferenceButton(handleShowReferences);
}

async function init() {
  const { baseUrl } = await chrome.storage.sync.get('baseUrl');
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
