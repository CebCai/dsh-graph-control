/**
 * Exact service contracts observed in the current official DSH baseline.
 * Entry and plugin names deliberately fail closed when upstream renames them.
 */
export const CURRENT_OFFICIAL_SERVICE_PROVIDERS = [
  {
    entryId: 'web-startup',
    pluginName: '@deepseek-ai/dsh-web-app/startup',
    service: 'webStartup',
    note: 'official dsh-web-app startup contract for the current baseline',
  },
  {
    entryId: 'web-runtime',
    pluginName: '@deepseek-ai/dsh-web-app',
    service: 'webRuntime',
    note: 'official dsh-web-app runtime contract for the current baseline',
  },
  {
    entryId: 'fs-sandbox',
    pluginName: '@deepseek-ai/dsh-fs-sandbox',
    service: 'fs',
    note: 'official sandboxed ctx.fs provider contract for the current baseline',
  },
  {
    entryId: 'fs-local',
    pluginName: '@deepseek-ai/dsh-fs-local',
    service: 'fs',
    note: 'official bare local ctx.fs provider contract for the current baseline',
  },
  {
    entryId: 'fs-e2b',
    pluginName: '@deepseek-ai/dsh-fs-e2b',
    service: 'fs',
    note: 'official E2B-backed ctx.fs provider contract for the current baseline',
  },
  {
    entryId: 'subprocess',
    pluginName: '@deepseek-ai/dsh-subprocess-local',
    service: 'subprocess',
    note: 'official host-local ctx.subprocess provider contract for the current baseline',
  },
  {
    entryId: 'subprocess-e2b',
    pluginName: '@deepseek-ai/dsh-subprocess-e2b',
    service: 'subprocess',
    note: 'official E2B-backed ctx.subprocess provider contract for the current baseline',
  },
  {
    entryId: 'e2b',
    pluginName: '@deepseek-ai/dsh-e2b',
    service: 'e2b',
    note: 'official shared E2B execution-world owner contract for the current baseline',
  },
  {
    entryId: 'directory-picker',
    pluginName: '@deepseek-ai/dsh-host-directory-picker-auto',
    service: 'directoryPicker',
    note: 'official adaptive directory-picker contract that mounts one concrete backend at boot',
  },
  {
    entryId: 'directory-picker-browse',
    pluginName: '@deepseek-ai/dsh-host-directory-picker-browse',
    service: 'directoryPicker',
    note: 'official in-app browse directory-picker provider contract for the current baseline',
  },
] as const

/**
 * Exact cross-version Web startup/runtime spine proven against both accepted
 * official refs. Keep semantic ids independent of resolved-array positions;
 * the adapter view links each one back to the disposable graph node.
 */
export const CURRENT_OFFICIAL_WEB_SPINE_COMPONENTS = [
  {
    role: 'startup',
    semanticId: 'web-spine:component:web-startup',
    entryId: 'web-startup',
    pluginName: '@deepseek-ai/dsh-web-app/startup',
  },
  {
    role: 'server',
    semanticId: 'web-spine:component:webserver',
    entryId: 'webserver',
    pluginName: '@deepseek-ai/dsh-host-webserver',
  },
  {
    role: 'runtime',
    semanticId: 'web-spine:component:web-runtime',
    entryId: 'web-runtime',
    pluginName: '@deepseek-ai/dsh-web-app',
  },
  {
    role: 'connection',
    semanticId: 'web-spine:component:connection',
    entryId: 'connection',
    pluginName: '@deepseek-ai/dsh-client-connection',
  },
] as const

export const CURRENT_OFFICIAL_WEB_SPINE_SERVICES = [
  {
    semanticId: 'web-spine:service:webStartup',
    name: 'webStartup',
  },
  {
    semanticId: 'web-spine:service:webRuntime',
    name: 'webRuntime',
  },
] as const

export const CURRENT_OFFICIAL_WEB_SPINE_RELATIONS = [
  {
    semanticId: 'web-spine:relation:web-startup:provides:webStartup',
    kind: 'provides-service',
    evidence: 'current-official-contract',
    entryId: 'web-startup',
    service: 'webStartup',
  },
  {
    semanticId: 'web-spine:relation:webserver:requires:webStartup',
    kind: 'requires-service',
    evidence: 'resolved-inject',
    entryId: 'webserver',
    service: 'webStartup',
  },
  {
    semanticId: 'web-spine:relation:web-runtime:requires:webStartup',
    kind: 'requires-service',
    evidence: 'resolved-inject',
    entryId: 'web-runtime',
    service: 'webStartup',
  },
  {
    semanticId: 'web-spine:relation:web-runtime:provides:webRuntime',
    kind: 'provides-service',
    evidence: 'current-official-contract',
    entryId: 'web-runtime',
    service: 'webRuntime',
  },
  {
    semanticId: 'web-spine:relation:connection:requires:webRuntime',
    kind: 'requires-service',
    evidence: 'resolved-inject',
    entryId: 'connection',
    service: 'webRuntime',
  },
] as const

/** Exact directory-picker consumer in the current official Web composition. */
export const CURRENT_OFFICIAL_DIRECTORY_PICKER_CONSUMERS = [
  {
    entryId: 'workspace-controller',
    pluginName: '@deepseek-ai/dsh-api-workspace-controller',
    service: 'directoryPicker',
    note: 'current official WorkspaceController-owned directoryPicker remote seam',
  },
] as const

export const CURRENT_OFFICIAL_REQUIRED_SERVICE_CONSUMERS = [
  {
    entryId: 'tool-fs',
    pluginName: '@deepseek-ai/dsh-tool-fs',
    service: 'fs',
    note: 'official dsh-tool-fs static injection contract for the current baseline',
  },
  {
    entryId: 'tool-str-replace-editor',
    pluginName: '@deepseek-ai/dsh-tool-str-replace-editor',
    service: 'fs',
    note: 'official str-replace-editor static injection contract for the current baseline',
  },
  {
    entryId: 'bash-sandbox',
    pluginName: '@deepseek-ai/dsh-bash-sandbox',
    service: 'subprocess',
    note: 'official sandboxed Bash static subprocess injection for the current baseline',
  },
  {
    entryId: 'pwsh-sandbox',
    pluginName: '@deepseek-ai/dsh-pwsh-sandbox',
    service: 'subprocess',
    note: 'official sandboxed PowerShell static subprocess injection for the current baseline',
  },
  {
    entryId: 'tool-fs-search',
    pluginName: '@deepseek-ai/dsh-tool-fs-search',
    service: 'subprocess',
    note: 'official filesystem-search static subprocess injection for the current baseline',
  },
  {
    entryId: 'bash',
    pluginName: '@deepseek-ai/dsh-bash-local',
    service: 'subprocess',
    note: 'official portable Bash static subprocess injection for the current baseline',
  },
  {
    entryId: 'terminal-bash',
    pluginName: '@deepseek-ai/dsh-terminal-bash',
    service: 'subprocess',
    note: 'official terminal backend static subprocess injection for the current baseline',
  },
  {
    entryId: 'lsp-stdio',
    pluginName: '@deepseek-ai/dsh-lsp-stdio',
    service: 'subprocess',
    note: 'official LSP stdio host static subprocess injection for the current baseline',
  },
  {
    entryId: 'fs-e2b',
    pluginName: '@deepseek-ai/dsh-fs-e2b',
    service: 'e2b',
    note: 'official E2B filesystem provider depends on the shared E2B owner',
  },
  {
    entryId: 'subprocess-e2b',
    pluginName: '@deepseek-ai/dsh-subprocess-e2b',
    service: 'e2b',
    note: 'official E2B subprocess provider depends on the shared E2B owner',
  },
  ...CURRENT_OFFICIAL_DIRECTORY_PICKER_CONSUMERS,
] as const

/** Exact execution-world identities documented by the current official DSH. */
export const CURRENT_OFFICIAL_EXECUTION_WORLDS = [
  {
    id: 'host-local',
    label: 'Host-local execution',
    locality: 'local',
    summary: 'Filesystem paths and subprocesses live on the same machine as the loopback GraphControl control plane.',
    sourcePaths: [
      'packages/bundle/base/cordis.patch.yml',
      'docs/architecture.md',
      'docs/subsystems/filesystem.md',
      'docs/subsystems/subprocess.md',
    ],
  },
  {
    id: 'e2b-remote',
    label: 'E2B remote sandbox',
    locality: 'remote',
    summary: 'One E2B owner supplies a shared remote working directory and runtime to both filesystem and subprocess providers.',
    sourcePaths: [
      'examples/headless-agent/e2b.cordis.yml',
      'packages/e2b/e2b/README.md',
      'packages/e2b/fs-e2b/README.md',
      'packages/e2b/subprocess-e2b/README.md',
    ],
  },
] as const

/** Exact provider-to-world membership; entry/plugin identity changes fail closed. */
export const CURRENT_OFFICIAL_EXECUTION_WORLD_MEMBERS = [
  {
    entryId: 'fs-sandbox',
    pluginName: '@deepseek-ai/dsh-fs-sandbox',
    worldId: 'host-local',
    capability: 'filesystem',
    note: 'official sandboxed filesystem stays in the host-local execution world',
  },
  {
    entryId: 'fs-local',
    pluginName: '@deepseek-ai/dsh-fs-local',
    worldId: 'host-local',
    capability: 'filesystem',
    note: 'official bare filesystem stays in the host-local execution world',
  },
  {
    entryId: 'subprocess',
    pluginName: '@deepseek-ai/dsh-subprocess-local',
    worldId: 'host-local',
    capability: 'subprocess',
    note: 'official local subprocess provider anchors the host-local execution world',
  },
  {
    entryId: 'e2b',
    pluginName: '@deepseek-ai/dsh-e2b',
    worldId: 'e2b-remote',
    capability: 'world-owner',
    note: 'official E2B owner controls the shared remote runtime lifecycle',
  },
  {
    entryId: 'fs-e2b',
    pluginName: '@deepseek-ai/dsh-fs-e2b',
    worldId: 'e2b-remote',
    capability: 'filesystem',
    note: 'official E2B filesystem uses the shared remote runtime',
  },
  {
    entryId: 'subprocess-e2b',
    pluginName: '@deepseek-ai/dsh-subprocess-e2b',
    worldId: 'e2b-remote',
    capability: 'subprocess',
    note: 'official E2B subprocess provider uses the shared remote runtime',
  },
] as const

/** Exact filesystem policy facts evidenced by the current official sources. */
export const CURRENT_OFFICIAL_FS_PROVIDER_POLICIES = [
  {
    entryId: 'fs-sandbox',
    pluginName: '@deepseek-ai/dsh-fs-sandbox',
    id: 'sandbox-confined',
    label: 'Sandbox-confined filesystem',
    executionWorld: 'host-local',
    confinement: 'sandbox-policy',
    summary: 'Enforces per-call read-only or workspace-write policy before delegating to the host-local filesystem implementation.',
    sourcePaths: [
      'packages/fs/fs-sandbox/src/index.ts',
      'packages/fs/README.md',
    ],
  },
  {
    entryId: 'fs-local',
    pluginName: '@deepseek-ai/dsh-fs-local',
    id: 'local-unconfined',
    label: 'Direct host-local filesystem',
    executionWorld: 'host-local',
    confinement: 'none',
    summary: 'Uses the host-local filesystem directly and does not enforce read-only or workspace-write confinement in this provider.',
    sourcePaths: [
      'packages/fs/fs-local/src/index.ts',
      'packages/fs/README.md',
    ],
  },
] as const

/** The first bounded provider replacement proven against official DSH. */
export const FS_SANDBOX_TO_LOCAL_REPLACEMENT = {
  id: 'fs-sandbox-to-local',
  service: 'fs',
  currentEntryId: 'fs-sandbox',
  currentPluginName: '@deepseek-ai/dsh-fs-sandbox',
  replacementEntryId: 'fs-local',
  replacementPluginName: '@deepseek-ai/dsh-fs-local',
  requiredConsumerEntryIds: ['tool-fs', 'tool-str-replace-editor'],
  risk: 'dangerous',
  executionWorldDelta: 'None: both providers use the same host-local filesystem world; only the confinement policy changes.',
  securityDelta: 'Removes ctx.fs write/edit confinement: the bare local provider does not enforce read-only or workspace-write sandbox policy.',
} as const

/** Reverse the proven filesystem-provider pair without removing either declaration. */
export const FS_LOCAL_TO_SANDBOX_SWITCH = {
  id: 'fs-local-to-sandbox',
  service: 'fs',
  currentEntryId: 'fs-local',
  currentPluginName: '@deepseek-ai/dsh-fs-local',
  replacementEntryId: 'fs-sandbox',
  replacementPluginName: '@deepseek-ai/dsh-fs-sandbox',
  requiredConsumerEntryIds: ['tool-fs', 'tool-str-replace-editor'],
  risk: 'review',
  executionWorldDelta: 'None: both providers use the same host-local filesystem world; only the confinement policy changes.',
  securityDelta: 'Restores ctx.fs read-only and workspace-write sandbox policy; operations outside that policy may stop succeeding.',
} as const

/** Remove only the exact GraphControl-generated pair and inherit the official sandbox default. */
export const FS_PROVIDER_RESET_TO_OFFICIAL_DEFAULT = {
  id: 'fs-provider-reset-official-default',
  service: 'fs',
  currentEntryId: 'fs-sandbox',
  currentPluginName: '@deepseek-ai/dsh-fs-sandbox',
  replacementEntryId: 'fs-local',
  replacementPluginName: '@deepseek-ai/dsh-fs-local',
  requiredConsumerEntryIds: ['tool-fs', 'tool-str-replace-editor'],
  risk: 'review',
  executionWorldDelta: 'None: the current official bundle default remains the host-local sandbox filesystem world.',
  securityDelta: 'Removes only the generated provider overrides and inherits the current official fs-sandbox default with read-only/workspace-write confinement.',
} as const

/** Pin the Web profile to its official in-app directory-browser interaction pair. */
export const DIRECTORY_PICKER_BROWSE_PIN = {
  id: 'directory-picker-pin-browse',
  service: 'directoryPicker',
  currentEntryId: 'directory-picker',
  currentPluginName: '@deepseek-ai/dsh-host-directory-picker-auto',
  replacementEntryId: 'directory-picker-browse',
  replacementPluginName: '@deepseek-ai/dsh-host-directory-picker-browse',
  companionEntryId: 'ui-directory-picker-browse',
  companionPluginName: '@deepseek-ai/dsh-client-ui-directory-picker-browse',
  risk: 'review',
  executionWorldDelta: 'The host remains local; only directory selection moves from boot-time auto detection to an in-browser interaction backed by the same host filesystem.',
  securityDelta: 'The trusted Web client gains host directory listing and child-directory creation through the existing browser-trust-fenced API; it no longer opens an operating-system chooser.',
} as const

/** Remove the exact browse pin and let the official adaptive chooser run again. */
export const DIRECTORY_PICKER_RESET_AUTO = {
  id: 'directory-picker-reset-auto',
  service: 'directoryPicker',
  currentEntryId: 'directory-picker-browse',
  currentPluginName: '@deepseek-ai/dsh-host-directory-picker-browse',
  replacementEntryId: 'directory-picker',
  replacementPluginName: '@deepseek-ai/dsh-host-directory-picker-auto',
  companionEntryId: 'ui-directory-picker-browse',
  companionPluginName: '@deepseek-ai/dsh-client-ui-directory-picker-browse',
  risk: 'review',
  executionWorldDelta: 'The host remains local; current official boot-time detection chooses native or browse interaction from bind, SSH, display, and platform facts.',
  securityDelta: 'Removes the forced browser listing/creation surface and restores the official adaptive chooser; remote launches may still resolve to browse while attended loopback launches may use the OS chooser.',
} as const

/** Add the current official opt-in time context plugin to the selected profile. */
export const TIME_CONTEXT_PLUGIN_ADD = {
  id: 'time-context-add',
  entryId: 'time-context',
  pluginName: '@deepseek-ai/dsh-time-context',
  label: 'Current time context',
  risk: 'safe',
  securityDelta: 'Adds current zoned time, browser time zone, and elapsed-time context; it requests no credentials, remote runtime, or host-file access.',
} as const

/** Remove only the untouched GraphControl-generated time context insert. */
export const TIME_CONTEXT_PLUGIN_REMOVE = {
  ...TIME_CONTEXT_PLUGIN_ADD,
  id: 'time-context-remove',
} as const

/** Add the current official opt-in Session-local Schedule plugin. */
export const SCHEDULE_PLUGIN_ADD = {
  id: 'schedule-add',
  entryId: 'schedule',
  pluginName: '@deepseek-ai/dsh-schedule',
  label: 'Session-local reminders',
  risk: 'review',
  securityDelta: 'Adds future Agent follow-up turns backed by the existing Session log. It requests no credentials, remote runtime, operating-system notification permission, or host-file access.',
} as const

/** Remove only the untouched GraphControl-generated Schedule insert. */
export const SCHEDULE_PLUGIN_REMOVE = {
  ...SCHEDULE_PLUGIN_ADD,
  id: 'schedule-remove',
} as const

/** First configurable component slice backed by the CLI's bundled MCP bridge. */
export const MCP_STREAMABLE_HTTP_COMPONENT = {
  packageName: '@deepseek-ai/dsh-mcp-client',
  transport: 'streamable-http',
  risk: 'review',
  securityDelta: 'Adds tools supplied by one external HTTP endpoint. Tool arguments and results cross that endpoint; this first slice stores no request headers or credentials.',
} as const

export type FsProviderEntryId =
  | typeof FS_SANDBOX_TO_LOCAL_REPLACEMENT.currentEntryId
  | typeof FS_SANDBOX_TO_LOCAL_REPLACEMENT.replacementEntryId
