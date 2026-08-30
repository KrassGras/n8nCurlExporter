const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/content.js'],
  bundle: true,
  outfile: 'n8nCurlExporter/content.js',
  format: 'iife',
  platform: 'browser',
}).catch(() => process.exit(1));
