function escSingleQuotes(s) {
  return s.replace(/'/g, "'\\''");
}

function buildCurl(method, url, headers, body) {
  const lines = [
    `curl --request ${method} \\`,
    `  --url '${escSingleQuotes(url)}'`,
  ];

  for (const [name, value] of headers) {
    lines[lines.length - 1] += ' \\';
    lines.push(`  --header '${escSingleQuotes(name)}: ${escSingleQuotes(value)}'`);
  }

  if (body) {
    lines[lines.length - 1] += ' \\';
    lines.push(`  --data '${escSingleQuotes(body)}'`);
  }

  return lines.join('\n');
}

module.exports = { escSingleQuotes, buildCurl };
