# DSH GraphControl

English | [简体中文](README.zh-CN.md)

**A local visual console for understanding and configuring DeepSeek Harness.**

[![CI](https://github.com/CebCai/dsh-graph-control/actions/workflows/ci.yml/badge.svg)](https://github.com/CebCai/dsh-graph-control/actions/workflows/ci.yml)

![DSH GraphControl showing a selected capability, its graph connections, and pending changes](docs/assets/console-overview.png)

> Early preview: GraphControl is built from source and supports a focused set of configuration changes. Unsupported official DSH data remains visible and read-only.

GraphControl turns a local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) configuration into an explorable capability graph. It helps you understand providers and dependencies, prepare supported changes, preview their effect, and apply them explicitly without replacing DSH as the source of truth.

GraphControl is an independent project and is not affiliated with or endorsed by DeepSeek.

## What you can do today

- Explore an official DSH profile as a capability and dependency graph.
- Inspect providers, consumers, configuration origins, and execution boundaries.
- Preview supported component, filesystem Provider, directory, Time, Schedule, session-tool, and MCP HTTP changes.
- Review pending changes and dependency conflicts before writing configuration.
- Apply one confirmed profile-patch change and immediately reload the official composition.
- Open or switch local profiles, with a guarded initialization flow for a missing built-in `web` profile.
- Use the console in Chinese or English, with matching light and dark themes.

## Project status

GraphControl is currently a source preview, not a published `dsh plugin` bundle. The same-origin launch mounts the console through a temporary startup overlay for that process; it does not install a UI bundle into the selected profile. Stop the process and the mount is gone.

DeepSeek Harness is itself a developer preview and can introduce compatibility-breaking changes. Review the [official DSH documentation](https://deepseek-harness.github.io/deepseek-harness/) and safety guidance before running either project.

Current limits:

- Editing is available only for the component families listed above; arbitrary composition is not yet supported.
- GraphControl does not create arbitrary custom profiles or repair and migrate existing profiles.
- Live runtime observation, remote execution, and Harness optimization are not part of this source preview.
- There is no installer, npm package, or official DSH bundle yet.

## Requirements

- Windows x64 and PowerShell
- Git
- Node.js `^22.19.0` or `>=24.0.0`
- Corepack
- A local DSH Home, or a directory where the built-in `web` profile can be initialized through GraphControl

## Quick start

Clone the repository, install the workspace, and prepare the newest published official DSH release:

```powershell
git clone https://github.com/CebCai/dsh-graph-control.git
Set-Location dsh-graph-control
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dsh:bootstrap
```

Point GraphControl at your DSH Home and start it on the same local origin as DSH Web:

```powershell
$env:DSH_HOME = 'C:\path\to\your\dsh-home'
corepack pnpm studio:official
```

Open the DSH launch URL printed in the terminal first, then open the printed `/harness-studio/` URL. Both services bind to loopback.

For a missing built-in `web` profile, or for frontend work without the DSH Web shell, start the standalone console:

```powershell
$env:DSH_HOME = 'C:\path\to\your\dsh-home'
corepack pnpm studio
```

The standalone console opens at `http://127.0.0.1:4317` by default. Initialization and configuration writes always require Preview followed by an explicit Apply.

## Safety model

- Official DSH configuration and composition remain authoritative.
- The control plane is loopback-only.
- Supported edits preserve unrelated source text, comments, ordering, aliases, line endings, and `!!js` expressions.
- GraphControl never evaluates `!!js`.
- A write is refused if the selected source changed after Preview.
- Unknown or ambiguous official configuration is shown without inventing an edit.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the runtime trust boundary.

## Compatibility

`pnpm dsh:bootstrap` resolves the newest published release from the official DeepSeek Harness repository, including prereleases, instead of using a permanently pinned fallback. The current source preview has been verified with [`dsh-v0.1.2-alpha.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.2).

Upstream-specific behavior is isolated in `packages/dsh-adapter` so the smallest affected boundary can be updated when DSH changes.

## Repository map

| Path | Purpose |
| --- | --- |
| `apps/studio` | Visual console and loopback host |
| `apps/cli` | Maintainer inspection and supported edit commands |
| `packages/dsh-adapter` | Official DSH discovery, composition, and focused writers |
| `packages/harness-graph` | Derived graph view used by the console |
| `packages/constraint-engine` | Dependency consequences for supported actions |
| `packages/profile-edit` | Preview and apply use cases |
| `packages/edit-transaction` | Stale-source protection and atomic replacement |

For the design boundaries, see [Architecture](docs/ARCHITECTURE.md). Contributions are welcome through [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
