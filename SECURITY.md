# Security policy

## Supported versions

Security fixes go into the latest minor release of `slotsmith` and
`slotsmith-ai`, which are always released together with the same version.
Upgrade to the newest version to receive them.

## Reporting a vulnerability

Please report security issues privately, not in a public issue:

1. Open [a private security advisory](https://github.com/tmzm/slotsmith/security/advisories/new)
   on this repository.
2. Describe the problem, the affected versions, and the steps to reproduce it.

Only the maintainer can see the report. You can expect a first reply within
seven days. Once a fix is released, the advisory is published with credit to
you, unless you prefer to stay anonymous.

## Scope

`slotsmith` is a client-side React component library: it does not handle
authentication, store data or make network requests of its own. Reports
about how the components render user-supplied content (for example option
labels or file names), and about the `slotsmith-ai` MCP server and CLI, are
in scope.
