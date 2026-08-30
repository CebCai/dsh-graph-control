# Architecture

DSH GraphControl is a local control console built around one rule: official DeepSeek Harness configuration and composition remain authoritative. The console derives a graph and presentation state from DSH; it does not save a second Harness document.

## System shape

```text
official DSH installation + selected DSH Home/profile
                         |
                         v
                 packages/dsh-adapter
                  |               |
          declared sources   official composition
                  \               /
                   v             v
                  derived Harness graph
                            |
                  supported user actions
                            |
                  apps/studio + apps/cli
```

The standalone Studio host is used for local development and profile initialization. The same console can also be mounted on the local DSH Web origin at `/harness-studio/`. Both surfaces use the same request handlers and bind to loopback.

## Packages

| Package | Responsibility |
| --- | --- |
| `packages/dsh-adapter` | Discover the selected installation, read sources, invoke official composition, project known facts, and implement focused DSH-native writes |
| `packages/harness-graph` | Represent declared, resolved, and future observed graph facts used by current features |
| `packages/constraint-engine` | Explain bounded dependency and Provider consequences for supported actions |
| `packages/profile-edit` | Connect user intent to preview and apply operations |
| `packages/edit-transaction` | Detect a changed source and atomically replace one selected file |
| `apps/studio` | Product UI and loopback HTTP handlers |
| `apps/cli` | Maintainer inspection and direct supported edit commands |

## Read path

1. Select a built official DSH installation, DSH Home, profile, and workspace.
2. Read the declared bundle, profile, home, and explicit overlay sources as text.
3. Ask the selected official DSH CLI for its composed result.
4. Build graph facts with their source provenance.
5. Render known capabilities and retain unknown official data as read-only information.

Ordinary composition uses a temporary projection so expected DSH preparation does not modify the selected Home. This isolates normal side effects; it is not a sandbox for untrusted local code.

## Write path

```text
supported action
  -> candidate source mutation
  -> user Preview
  -> official DSH parses and composes the candidate
  -> selected source is checked again
  -> user Apply
  -> atomic one-file replacement
  -> official result is reloaded
```

Supported edits target one selected profile patch. Presentation-only actions such as moving graph items never change Harness semantics. Computed and runtime facts remain read-only unless an action maps to a supported declared-source mutation.

## Graph view

The graph keeps three kinds of facts distinct:

- **Declared** — source entries and provenance.
- **Resolved** — the result composed by official DSH.
- **Observed** — reserved for future runtime facts.

Feature-specific TypeScript types describe only the data required by current user actions. Unknown rows and attributes stay in the graph rather than being forced into a closed universal schema.

## Compatibility boundary

Official DSH evolves quickly. Integration details live in `packages/dsh-adapter`, and the default bootstrap resolves the newest published official release, including prereleases. An upstream change should normally require a focused adapter update instead of changes throughout the console.

## Trust boundary

The selected DSH installation is trusted local code and may execute while composing configuration or starting DSH Web. GraphControl remains loopback-only, never evaluates `!!js`, and requires a fresh Preview before Apply. See the root [security policy](../SECURITY.md) for reporting vulnerabilities.
