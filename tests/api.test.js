const { hasRecentExecution, fetchWorkflowData } = require('../src/api');

global.chrome = {
  storage: { sync: { get: jest.fn() } },
};

global.fetch = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('hasRecentExecution', () => {
  test('returns true when API returns data', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key',
    });
    global.fetch.mockResolvedValue({
      json: async () => ({ data: [{ id: 'exec1' }] }),
    });

    const result = await hasRecentExecution('workflow-123');
    expect(result).toBe(true);
  });

  test('returns false when API returns empty data', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key',
    });
    global.fetch.mockResolvedValue({
      json: async () => ({ data: [] }),
    });

    const result = await hasRecentExecution('workflow-123');
    expect(result).toBe(false);
  });

  test('returns null when apiKey missing', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      baseUrl: 'https://n8n.example.com',
      apiKey: undefined,
    });

    const result = await hasRecentExecution('workflow-123');
    expect(result).toBeNull();
  });

  test('returns null when fetch throws', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key',
    });
    global.fetch.mockRejectedValue(new Error('Network error'));

    const result = await hasRecentExecution('workflow-123');
    expect(result).toBeNull();
  });
});

describe('fetchWorkflowData', () => {
  test('returns nodes when response has data.nodes', async () => {
    const nodes = [{ name: 'NodeA' }];
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { nodes } }),
    });

    const result = await fetchWorkflowData('workflow-123', 'https://n8n.example.com');
    expect(result.nodes).toEqual(nodes);
  });

  test('throws on non-ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchWorkflowData('workflow-123', 'https://n8n.example.com')).rejects.toThrow('HTTP 404');
  });
});
