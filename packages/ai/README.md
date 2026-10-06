# slotsmith-ai

An [MCP](https://modelcontextprotocol.io) server that teaches AI coding agents the [slotsmith](https://www.npmjs.com/package/slotsmith) React components: every prop with its type and default, every slot with its props and fallback, ready-made adapters for MUI, shadcn/ui, Chakra UI, Ant Design and Radix Themes, and setup notes per framework.

Everything it knows is generated from the library's source, so the agent reads the real API instead of guessing prop names.

**[Setup guide on the docs site → slotsmith.dev/ai-tools/](https://slotsmith.dev/ai-tools/)**

## Setup

The server runs over stdio with `npx`; nothing needs to be installed in the project. Node 20 or later.

### Claude Code

```bash
claude mcp add slotsmith -- npx -y slotsmith-ai mcp
```

Add `--scope project` to write it to the project's `.mcp.json` and share it with the team.

### Cursor

`.cursor/mcp.json` in the project (or `~/.cursor/mcp.json` for every project):

```json
{
  "mcpServers": {
    "slotsmith": {
      "command": "npx",
      "args": ["-y", "slotsmith-ai", "mcp"]
    }
  }
}
```

### VS Code

`.vscode/mcp.json` in the project. VS Code uses a `servers` key, not `mcpServers`:

```json
{
  "servers": {
    "slotsmith": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "slotsmith-ai", "mcp"]
    }
  }
}
```

### Claude Desktop

`claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "slotsmith": {
      "command": "npx",
      "args": ["-y", "slotsmith-ai", "mcp"]
    }
  }
}
```

On Windows, if the client cannot start `npx` directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "slotsmith-ai", "mcp"]`.

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `list_components` | — | Each component's entry point, CSS import, required and optional peers, and a one-line summary |
| `get_component_api` | `component` | Props grouped as in the docs, with types and defaults; controlled / uncontrolled pairs; labels |
| `list_slots` | `component` | Every slot's name, kind (element or widget) and summary |
| `get_slot` | `component`, `slot` | The props a slot receives, its fallback markup, and a snippet that replaces it |
| `get_adapter_example` | `component`, `library` (`mui` \| `shadcn` \| `chakra` \| `antd` \| `radix`) | A ready-made `components` map. `radix` is Radix Themes; an app on the bare Radix primitives uses `shadcn` |
| `get_setup` | `component`, `framework?` (`next` \| `vite` \| `remix`), `virtual?` | The install command, imports, CSS import and framework notes |
| `search_docs` | `query`, `limit?` | Ranked matches across props, slots, labels, guides and adapters, with anchors |

`component` is one of `data-table`, `autocomplete`, `file-uploader`, `date-picker`.

Every result is Markdown for the model, with the same facts as structured JSON for clients that read it.

## Resources and prompts

- `slotsmith://components/{name}`: a component's full reference (import, API, labels, slots), as Markdown.
- `slotsmith://guides/{name}`: the hand-written guides: `setup`, `slots`, `theming`, `i18n`, `adapters`, and one per component.
- Prompt `build-component` (`component`, `library?`): build a feature with a component, following its real API.
- Prompt `adapt-slots-to-library` (`component`, `library`): write a slot map for a component library.

## Adding an adapter

`slotsmith-ai add` copies a ready-made adapter into the project as source you own, so you can edit it like any other component:

```bash
npx slotsmith-ai add date-picker --ui mui
npx slotsmith-ai add data-table --ui antd --out src/ui/slotsmith
npx slotsmith-ai add --all --ui shadcn
```

```
slotsmith-ai add <component...> --ui <library> [--out <dir>] [--force] [--dry-run]
slotsmith-ai add --all --ui <library>

  <component>   data-table | autocomplete | file-uploader | date-picker
  --ui          mui | shadcn | chakra | antd | radix
                (ant-design is accepted for antd, radix-themes for radix)
  --out         where to write. Default: src/components/slotsmith when src/ exists,
                else components/slotsmith
  --force       overwrite a file that differs from what would be written
  --dry-run     print what would happen, write nothing
```

- Each component becomes `<out>/<component>.tsx`, starting with a one-line comment naming the library and the `slotsmith-ai` version it came from.
- After writing, it prints the import and usage (`<DatePicker components={muiDatePicker} />`), one `npm install …` line with the packages the project's `package.json` does not list yet, and, for shadcn/ui, one `npx shadcn@latest add …` line with the shadcn/ui components the adapter uses. It never installs anything itself.
- Running it again is safe. A file that already matches is reported `unchanged`; the header line is not compared, so a file from an older `slotsmith-ai` whose body is untouched is left as it is. A file you have edited is left alone: the command names it, says how many lines differ, and exits with code `1`; pass `--force` to replace it. `--dry-run` reports the same outcome, and exits with code `1` when the real run would refuse.
- `--out` must be inside the project, also after following symbolic links and junctions, and a file that is itself a symbolic link is never written through.
- `radix` is Radix Themes (`@radix-ui/themes`), the styled library. An app built on the bare Radix primitives uses `shadcn`.
- Editing the file afterward is expected — from that point on it is the project's own code, not something `slotsmith-ai` still owns.
- To skin every component of a kind at once, pass the maps to `SlotsmithProvider` instead of to each component: `<SlotsmithProvider components={{ datePicker: muiDatePicker, dataTable: muiDataTable }}>`. The `adapters` and `slots` guides teach agents this.

## The shadcn registry

The same shadcn/ui adapters are also built as a [shadcn/ui registry](https://ui.shadcn.com/docs/registry) (serve the files from any static host):

```bash
pnpm build      # regenerates knowledge, bundles the CLI, then builds the registry
pnpm registry   # or just the registry, from knowledge already on disk
```

writes one `registry-item.json`-shaped file per component to `registry/<component>.json`, plus a `registry.json` index. Nothing under `registry/` is committed — it is gitignored and rebuilt from the generated knowledge on demand.

Serve that folder from any static host and install a component with shadcn's own CLI:

```bash
npx shadcn@latest add https://<your-host>/date-picker.json
```

It writes the file to the same path `slotsmith-ai add --ui shadcn` uses, installs the adapter's peers automatically, and adds any shadcn/ui components the adapter depends on. One difference: shadcn's CLI strips a file's leading doc comment when it installs a `registry:component`, so a file placed this way is missing the adapter's short header comment — every slot and prop is otherwise the same file either way.

## Versions

`slotsmith-ai` shares its major and minor version with `slotsmith`: `slotsmith-ai@1.4.x` describes `slotsmith@1.4.x`. On start, the server looks for `node_modules/slotsmith` in the directory the client runs it from (and its parents). When the installed major or minor differs, every tool result starts with a one-line warning, so the agent knows to double-check against the installed types.

## Developing

The knowledge is generated from `../../src` with the TypeScript compiler API:

```bash
pnpm --filter slotsmith-ai generate   # writes knowledge/components/*.json|md and knowledge/index.json
pnpm --filter slotsmith-ai test       # regenerates, then runs the tool and drift tests
pnpm --filter slotsmith-ai build      # regenerates, then bundles dist/cli.js
```

Hand-written inputs live next to the generated output: `knowledge/guides/*.md` and `knowledge/groups.json`. The adapters in `knowledge/adapters/<component>.<library>.tsx` are generated from the integration skins the library is tested with (`src/<component>/__tests__/integrations/<library>/components.tsx`); edit the skin, never the adapter. The drift tests fail when a component has no guide, when a slot in the source is missing from the knowledge, when an adapter is missing or differs from its skin, when an adapter uses a slot that no longer exists, or when a prop is not placed in a group.

## Changelog

- **1.7.0** — `1.5.0` and `1.6.0` were version bumps in git only and were never published; this release describes everything an upgrading agent gains since the last published version, `1.4.0`:
  - `list_components` names the locale packs available for each component's `locale` prop.
  - The `i18n` and `theming` guides now cover locale packs, the shared tokens and the six themes; a new `adapters` guide covers the `add` command, the libraries and the registry. Reordering knowledge is folded into the `data-table` guide.
  - Twenty ready-made adapters, generated from tested integration suites: every component times `mui`, `shadcn`, `chakra`, `antd` and `radix`. `get_adapter_example` takes `antd` and `radix` alongside the three libraries it already had.
  - A new `add` command that copies any of those adapters into the project as source to own; see [Adding an adapter](#adding-an-adapter).
  - A [shadcn/ui registry](#the-shadcn-registry) built from the same adapters, for installing one with shadcn's own CLI instead.

## License

ISC
