# n8nCurlExporter
A simple chrome extension, that helps you exporting curls from http request node.

It also adds a **🔗 References** button on the workflow canvas. It reads the
current workflow and scans every node's parameters for expression references
to other nodes (`$('NodeName')`, `$node["NodeName"]`, `$items('NodeName')`),
then shows which nodes reference which — as a sortable list or a graph. Handy
before pulling a piece of a workflow out into a sub-workflow: check who else
references those nodes first.

## Setup

```
npm install
npm run build
```

`npm install` installs the dependencies. `npm run build` bundles the source files into `n8nCurlExporter/content.js`, which is required for the extension to work in the browser.

Then load the `n8nCurlExporter/` folder as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Configuration

Open the extension popup and set:

- **n8n Base URL** — the URL of your n8n instance (e.g. `https://your-n8n.example.com`)
- **API Key** — required for loading workflow data and the References feature. Find it in n8n → Settings → API.
