# n8nCurlExporter
A simple chrome extension, that helps you exporting curls from http request node.

It also adds a **🔗 References** button on the workflow canvas. It reads the
current workflow and scans every node's parameters for expression references
to other nodes (`$('NodeName')`, `$node["NodeName"]`, `$items('NodeName')`),
then shows which nodes reference which — as a sortable list or a graph. Handy
before pulling a piece of a workflow out into a sub-workflow: check who else
references those nodes first.
