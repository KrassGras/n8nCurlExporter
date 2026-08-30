const { findReferencedNames, collectStrings, buildReferenceGraph } = require('../src/reference-graph');

describe('findReferencedNames', () => {
  test('finds $() syntax', () => {
    const names = findReferencedNames("$('MyNode').json");
    expect([...names]).toContain('MyNode');
  });

  test('finds $node[] syntax', () => {
    const names = findReferencedNames('$node["AnotherNode"].data');
    expect([...names]).toContain('AnotherNode');
  });

  test('finds $items() syntax', () => {
    const names = findReferencedNames("$items('ItemNode', 0)");
    expect([...names]).toContain('ItemNode');
  });

  test('finds multiple references in one string', () => {
    const names = findReferencedNames("$('NodeA').json + $node[\"NodeB\"].value");
    expect([...names]).toContain('NodeA');
    expect([...names]).toContain('NodeB');
  });

  test('returns empty set when no references', () => {
    const names = findReferencedNames('no references here');
    expect(names.size).toBe(0);
  });

  test('handles double and single quotes', () => {
    const single = findReferencedNames("$('SingleQuote')");
    const double = findReferencedNames('$("DoubleQuote")');
    expect([...single]).toContain('SingleQuote');
    expect([...double]).toContain('DoubleQuote');
  });
});

describe('collectStrings', () => {
  test('collects strings with $ from flat object', () => {
    const acc = [];
    collectStrings({ url: "$('Node').json.url", name: 'static' }, acc);
    expect(acc).toContain("$('Node').json.url");
    expect(acc).not.toContain('static');
  });

  test('collects from nested object', () => {
    const acc = [];
    collectStrings({ a: { b: { c: "$('Deep').value" } } }, acc);
    expect(acc).toContain("$('Deep').value");
  });

  test('collects from array', () => {
    const acc = [];
    collectStrings(["$('ArrayNode').data", 'plain'], acc);
    expect(acc).toContain("$('ArrayNode').data");
    expect(acc).not.toContain('plain');
  });

  test('ignores strings without $', () => {
    const acc = [];
    collectStrings({ a: 'hello', b: 'world' }, acc);
    expect(acc).toHaveLength(0);
  });
});

describe('buildReferenceGraph', () => {
  test('builds references map', () => {
    const nodes = [
      { name: 'NodeA', parameters: { expr: "$('NodeB').json" } },
      { name: 'NodeB', parameters: {} },
    ];
    const graph = buildReferenceGraph(nodes);
    expect(graph.references.get('NodeA').has('NodeB')).toBe(true);
  });

  test('builds referencedBy map', () => {
    const nodes = [
      { name: 'NodeA', parameters: { expr: "$('NodeB').json" } },
      { name: 'NodeB', parameters: {} },
    ];
    const graph = buildReferenceGraph(nodes);
    expect(graph.referencedBy.get('NodeB').has('NodeA')).toBe(true);
  });

  test('excludes self-references', () => {
    const nodes = [
      { name: 'NodeA', parameters: { expr: "$('NodeA').json" } },
    ];
    const graph = buildReferenceGraph(nodes);
    expect(graph.references.get('NodeA').has('NodeA')).toBe(false);
  });

  test('tracks unresolved names', () => {
    const nodes = [
      { name: 'NodeA', parameters: { expr: "$('NonExistent').json" } },
    ];
    const graph = buildReferenceGraph(nodes);
    expect(graph.unresolved.get('NodeA').has('NonExistent')).toBe(true);
  });

  test('handles nodes with no parameters', () => {
    const nodes = [
      { name: 'NodeA', parameters: undefined },
      { name: 'NodeB', parameters: null },
    ];
    expect(() => buildReferenceGraph(nodes)).not.toThrow();
    const graph = buildReferenceGraph(nodes);
    expect(graph.nodeNames).toContain('NodeA');
    expect(graph.nodeNames).toContain('NodeB');
  });
});
