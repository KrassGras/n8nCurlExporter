const { escSingleQuotes, buildCurl } = require('../src/curl-builder');

describe('escSingleQuotes', () => {
  test('leaves strings without quotes unchanged', () => {
    expect(escSingleQuotes('hello world')).toBe('hello world');
  });

  test('escapes a single quote', () => {
    expect(escSingleQuotes("it's")).toBe("it'\\''s");
  });

  test('escapes multiple single quotes', () => {
    expect(escSingleQuotes("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
  });
});

describe('buildCurl', () => {
  test('minimal GET with no headers or body', () => {
    const result = buildCurl('GET', 'https://example.com', [], null);
    expect(result).toBe(
      "curl --request GET \\\n  --url 'https://example.com'"
    );
  });

  test('POST with headers', () => {
    const result = buildCurl('POST', 'https://example.com', [['Content-Type', 'application/json']], null);
    expect(result).toBe(
      "curl --request POST \\\n  --url 'https://example.com' \\\n  --header 'Content-Type: application/json'"
    );
  });

  test('POST with body', () => {
    const result = buildCurl('POST', 'https://example.com', [], '{"key":"value"}');
    expect(result).toBe(
      "curl --request POST \\\n  --url 'https://example.com' \\\n  --data '{\"key\":\"value\"}'"
    );
  });

  test('GET with multiple headers', () => {
    const result = buildCurl('GET', 'https://example.com', [
      ['Accept', 'application/json'],
      ['Authorization', 'Bearer token'],
    ], null);
    expect(result).toBe(
      "curl --request GET \\\n" +
      "  --url 'https://example.com' \\\n" +
      "  --header 'Accept: application/json' \\\n" +
      "  --header 'Authorization: Bearer token'"
    );
  });

  test('escapes single quotes in URL', () => {
    const result = buildCurl('GET', "https://example.com/it's", [], null);
    expect(result).toContain("--url 'https://example.com/it'\\''s'");
  });

  test('escapes single quotes in header values', () => {
    const result = buildCurl('GET', 'https://example.com', [["X-Custom", "val'ue"]], null);
    expect(result).toContain("--header 'X-Custom: val'\\''ue'");
  });

  test('escapes single quotes in body', () => {
    const result = buildCurl('POST', 'https://example.com', [], "it's data");
    expect(result).toContain("--data 'it'\\''s data'");
  });
});
