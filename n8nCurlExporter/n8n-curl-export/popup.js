'use strict';

const baseUrlInput = document.getElementById('baseUrl');
const apiKeyInput  = document.getElementById('apiKey');
const saveBtn      = document.getElementById('save');
const status       = document.getElementById('status');

chrome.storage.sync.get(['baseUrl', 'apiKey'], ({ baseUrl, apiKey }) => {
  if (baseUrl) baseUrlInput.value = baseUrl;
  if (apiKey)  apiKeyInput.value  = apiKey;
});

saveBtn.addEventListener('click', () => {
  const baseUrl = baseUrlInput.value.trim().replace(/\/$/, '');
  const apiKey  = apiKeyInput.value.trim();

  if (!baseUrl) {
    status.textContent = 'Base URL is required.';
    status.className = 'error';
    return;
  }

  try {
    new URL(baseUrl);
  } catch {
    status.textContent = 'Please enter a valid URL.';
    status.className = 'error';
    return;
  }

  chrome.storage.sync.set({ baseUrl, apiKey }, () => {
    status.textContent = 'Saved!';
    status.className = 'success';
    setTimeout(() => { status.textContent = ''; status.className = ''; }, 2000);
  });
});
