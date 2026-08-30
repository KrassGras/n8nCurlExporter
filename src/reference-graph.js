const NODE_REF_PATTERNS = [
  /\$\(\s*(['"`])((?:(?!\1).)+)\1\s*\)/g,      // $('NodeName')
  /\$node\[\s*(['"`])((?:(?!\1).)+)\1\s*\]/g,  // $node["NodeName"]
  /\$items\(\s*(['"`])((?:(?!\1).)+)\1/g,      // $items('NodeName', ...)
];

function findReferencedNames(text) {
  const names = new Set();
  for (const pattern of NODE_REF_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text))) names.add(m[2]);
  }
  return names;
}

function collectStrings(value, acc) {
  if (typeof value === 'string') {
    if (value.includes('$')) acc.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, acc);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, acc);
  }
}

function buildReferenceGraph(nodes) {
  const nodeNames = new Set(nodes.map(n => n.name));
  const references = new Map();   // node -> Set(nodes it references)
  const referencedBy = new Map(); // node -> Set(nodes that reference it)
  const unresolved = new Map();   // node -> Set(referenced names with no matching node)

  for (const name of nodeNames) {
    references.set(name, new Set());
    referencedBy.set(name, new Set());
    unresolved.set(name, new Set());
  }

  for (const node of nodes) {
    const strings = [];
    collectStrings(node.parameters, strings);

    const found = new Set();
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

module.exports = { NODE_REF_PATTERNS, findReferencedNames, collectStrings, buildReferenceGraph };
