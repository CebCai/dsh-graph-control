const messages = {
  zh: {
    'accessibility.skip': '跳到主要内容',
    'nav.aria': '页面导航',
    'nav.overview': '概览',
    'nav.composer': '设计',
    'nav.topology': '依赖',
    'nav.changes': '变更',
    'nav.settings': '概览',
    'nav.developer': '系统状态',
    'nav.system': '系统状态',
    'nav.worlds': '执行环境',
    'nav.entities': '组件与服务',
    'nav.sources': '配置层',
    'nav.truth': '官方 DSH 配置',
    'locale.aria': '界面语言',
    'theme.aria': '外观主题',
    'theme.light': '浅色',
    'theme.dark': '深色',
    'header.profile': '配置',
    'header.webProfile': 'Web 配置',
    'header.breadcrumb': '设计 /',
    'header.locationAria': '当前位置',
    'context.trigger': '选择当前 Harness',
    'context.eyebrow': '当前 Harness',
    'context.title': '选择要设计的 DSH 配置',
    'context.intro': '每次切换都会从本机官方 DSH 重新读取，不会修改配置文件。',
    'context.workspace': '工作区',
    'context.version': '官方 DSH',
    'context.warning': '切换或重新读取会丢弃尚未应用的预览。',
    'context.reload': '重新读取当前 Harness',
    'context.settingsTitle': 'Harness 上下文',
    'context.settingsIntro': '确认当前配置、官方 DSH 安装与工作区，或切换已有的本机 Harness。',
    'context.official': '官方 DSH 组合',
    'context.profiles': '本机配置',
    'context.dshHome': 'DSH 数据目录',
    'context.installation': '官方 DSH 安装',
    'context.settingsNote': 'GraphControl 只记住界面布局；Harness 内容始终由所选 DSH 配置决定。',
    'context.openAnother': '打开另一个本机 Harness',
    'context.openIntro': '提供已构建的官方 DSH 安装文件夹和已有的 DSH 数据文件夹。检查只读取版本与已初始化配置，不会创建配置或执行候选 DSH。',
    'context.openOverlayBlocked': '当前 Studio 启动时附加了额外配置层。为避免切换时遗漏这些设置，暂不能检查或打开另一个 Harness。',
    'context.installationFolder': '官方 DSH 安装文件夹',
    'context.installationFolderHelp': '选择已安装依赖并完成构建的官方 DSH 源码目录。',
    'context.dataFolder': '已有 DSH 数据文件夹',
    'context.dataFolderHelp': '检查只发现其中已经初始化的配置；只有后续独立预览和确认才可能初始化缺失的内置 web 配置。',
    'context.check': '检查',
    'context.checking': '正在检查…',
    'context.checkComplete': '检查完成',
    'context.checkedVersion': '已检查的官方 DSH',
    'context.initializedProfiles': '选择已初始化的配置',
    'context.noInitializedProfiles': '没有找到已初始化的配置；GraphControl 未创建任何内容。',
    'context.initializeTitle': '初始化官方 Web 配置',
    'context.initializeIntro': '所选数据目录还没有内置 web 配置。预览会执行你选择并信任的本机官方 DSH，但把 DSH Home 指向临时目录；它只隔离配置写入，不是代码沙箱，也不会写入所选数据目录。',
    'context.initializePreview': '预览官方初始化',
    'context.initializePreviewing': '正在由官方 DSH 预览…',
    'context.initializeReady': '官方 DSH 已确认可以初始化缺失的 web 配置。只有下一步确认后才会写入所选数据目录。',
    'context.initializeApply': '初始化并打开',
    'context.initializing': '正在初始化并打开…',
    'context.initializeConfirm': '将使用所选官方 DSH 在所选数据目录中初始化缺失的内置 web 配置，然后打开它。继续吗？',
    'context.initializePendingConfirm': '这会丢弃当前尚未应用的预览，并使用所选官方 DSH 初始化缺失的内置 web 配置，然后打开它。继续吗？',
    'context.initializePartialWarning': '官方初始化没有成功，并且可能已经留下部分配置文件。GraphControl 没有删除或修复它们；当前 Harness 保持不变。请先检查所选数据目录，再重新检查。',
    'context.openTrustWarning': '打开或初始化预览会执行你所选择并信任的本机官方 DSH 安装与配置代码。成功前不会替换当前 Harness。',
    'context.openPendingWarning': '打开另一个 Harness 会丢弃当前尚未应用的预览；GraphControl 会在需要时再次确认。',
    'context.open': '打开 Harness',
    'context.opening': '正在打开…',
    'context.pathRequired': '请先填写两个本机文件夹。',
    'context.pendingConfirm': '打开另一个 Harness 会丢弃当前尚未应用的预览。继续吗？',
    'context.openError.request-invalid': '无法检查这些文件夹。请确认两个文件夹均已完整填写。',
    'context.openError.explicit-patches': '当前 Studio 启动时附加了额外配置层，暂不能打开另一个 Harness。',
    'context.openError.context-busy': '当前 Harness 正在处理另一项操作。完成后请重新检查。',
    'context.openError.candidate-expired': '检查结果已过期。请重新检查这两个文件夹。',
    'context.openError.candidate-changed': '检查后的本机 Harness 已发生变化。请重新检查。',
    'context.openError.context-changed': '当前 Harness 已在别处切换。请重新检查后再打开。',
    'context.openError.pending-confirmation-required': '当前出现了尚未应用的预览。请复核后再次打开并确认丢弃。',
    'context.openError.profile-missing': '所选配置已不存在。请重新检查。',
    'context.openError.profile-already-exists': '内置 web 配置已经存在或初始化目标不再为空。GraphControl 未覆盖它；请重新检查。',
    'context.openError.initialization-preview-required': '初始化预览已过期。请重新检查并再次预览。',
    'context.openError.initialization-failed': '所选官方 DSH 未能初始化内置 web 配置。当前 Harness 保持不变。',
    'context.openError.installation-unavailable': '找不到可用且已构建的官方 DSH 安装。请检查安装文件夹。',
    'context.openError.home-unavailable': '无法读取所选 DSH 数据文件夹。请检查该文件夹。',
    'context.openError.no-initialized-profiles': '该 DSH 数据文件夹中没有已初始化的配置；未创建任何内容。',
    'context.openError.installation-incompatible': '所选官方 DSH 安装尚不受这个 GraphControl 版本支持。',
    'context.openError.profile-migration-required': '所选配置需要先由该官方 DSH 完成迁移。请在 GraphControl 外使用所选官方 DSH 完成该配置的官方迁移，然后再检查。GraphControl 未修改配置，当前 Harness 保持不变。',
    'context.openError.composition-failed': '所选配置未能通过官方 DSH 组合。当前 Harness 保持不变。',
    'context.openError.source-changed': '组合期间源文件发生变化。当前 Harness 保持不变，请重新检查。',
    'context.openError.unknown': '未能检查或打开所选 Harness。当前 Harness 保持不变，请重新检查。',
    'workspace.aria': 'Harness 控制台',
    'hero.eyebrow': 'Harness 概览',
    'hero.title': '掌握当前 Harness 的配置与运行边界',
    'hero.lead': '从一个位置查看配置上下文、能力关系、执行环境与可用变更。',
    'stats.aria': 'Harness 概览统计',
    'composer.eyebrow': '直接操作',
    'composer.title': '设计 Harness',
    'composer.intro': '选择一个想要的能力，先看官方 DSH 验证结果，再决定是否应用。',
    'composer.service': '能力',
    'composer.viewing': '正在设计',
    'composer.scopeAria': '查看范围',
    'composer.scopeFocus': '当前能力',
    'composer.scopeResolved': '完整配置',
    'composer.guideAria': '修改步骤',
    'composer.step1': '选择组件',
    'composer.step1Help': '先选一个想增加或调整的能力',
    'composer.step2': '预览修改',
    'composer.step2Help': '由官方 DSH 确认能否生效',
    'composer.step3': '应用修改',
    'composer.step3Help': '确认后才会写入所选配置',
    'composer.arrange': '自动整理',
    'composer.fit': '适应画布',
    'composer.reset': '重置布局',
    'composer.canvasAria': 'Harness 图画布',
    'composer.candidates': '添加能力',
    'composer.candidateHelp': '选择想完成的事情；系统会先预览影响，不会直接修改配置。',
    'composer.searchLabel': '添加能力',
    'composer.searchPlaceholder': '添加能力（搜索能力或组件）',
    'composer.dockSearchPlaceholder': '搜索能力或组件',
    'composer.categoriesAria': '能力类别',
    'composer.categoryRecommended': '推荐',
    'composer.categoryContext': '上下文',
    'composer.categoryStorage': '文件与存储',
    'composer.categoryInteraction': '互动',
    'composer.categoryIntegration': '外部工具',
    'composer.categoryTools': '工具',
    'composer.regionProviders': '能力提供者',
    'composer.regionCapability': '当前能力',
    'composer.regionConsumers': '连接的组件',
    'review.eyebrow': '写入前确认',
    'review.title': '待应用的修改',
    'topology.eyebrow': '能力连接',
    'topology.title': '提供与使用关系',
    'topology.intro': '查看能力从哪里来、哪些组件正在使用它，以及当前连接是否完整。',
    'topology.service': '能力',
    'worlds.eyebrow': '运行边界',
    'worlds.title': '执行环境',
    'worlds.intro': '查看文件系统与命令能力位于哪里，以及它们是否组成一致的执行环境。',
    'entities.eyebrow': '配置清单',
    'entities.title': '组件与服务',
    'entities.intro': '查看当前 Harness 中已声明和实际组合的组件、插件与服务。',
    'entities.searchLabel': '搜索组件与服务',
    'entities.searchPlaceholder': '搜索组件、插件或服务…',
    'entities.planeAria': '配置状态筛选',
    'plane.resolved': '实际生效',
    'plane.declared': '配置声明',
    'plane.all': '全部',
    'sources.eyebrow': '配置上下文',
    'sources.title': 'DSH 配置层',
    'sources.intro': '按照实际生效顺序显示当前 Harness 的配置层。',
    'sources.truthTitle': '官方 DSH 配置',
    'sources.truthBody': '控制台从所选 DSH 配置读取并写回受支持的变更，不维护平行配置副本。',
    'details.eyebrow': '当前选中',
    'details.title': '组件详情',
    'details.empty': '选择一个组件，查看它的作用和连接关系。',
    'details.close': '关闭组件详情',
  },
  en: {
    'accessibility.skip': 'Skip to main content',
    'nav.aria': 'Page navigation',
    'nav.overview': 'Overview',
    'nav.composer': 'Design',
    'nav.topology': 'Dependencies',
    'nav.changes': 'Changes',
    'nav.settings': 'Overview',
    'nav.developer': 'System status',
    'nav.system': 'System status',
    'nav.worlds': 'Execution environment',
    'nav.entities': 'Components & services',
    'nav.sources': 'Configuration layers',
    'nav.truth': 'Official DSH configuration',
    'locale.aria': 'Interface language',
    'theme.aria': 'Appearance theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'header.profile': 'Profile',
    'header.webProfile': 'Web profile',
    'header.breadcrumb': 'Design /',
    'header.locationAria': 'Current location',
    'context.trigger': 'Choose current Harness',
    'context.eyebrow': 'Current Harness',
    'context.title': 'Choose the DSH profile to design',
    'context.intro': 'Every switch reloads through the official local DSH and does not modify configuration files.',
    'context.workspace': 'Workspace',
    'context.version': 'Official DSH',
    'context.warning': 'Switching or reloading discards unapplied previews.',
    'context.reload': 'Reload current Harness',
    'context.settingsTitle': 'Harness context',
    'context.settingsIntro': 'Confirm the current profile, official DSH installation, and workspace, or switch to another local Harness.',
    'context.official': 'Official DSH composition',
    'context.profiles': 'Local profiles',
    'context.dshHome': 'DSH data directory',
    'context.installation': 'Official DSH installation',
    'context.settingsNote': 'GraphControl remembers presentation only; Harness content always comes from the selected DSH profile.',
    'context.openAnother': 'Open another local Harness',
    'context.openIntro': 'Provide a built official DSH installation folder and an existing DSH data folder. Check reads only the version and initialized profiles; it neither creates a profile nor executes the candidate DSH.',
    'context.openOverlayBlocked': 'This Studio started with additional configuration layers. To avoid losing those settings during a switch, checking and opening another Harness is unavailable.',
    'context.installationFolder': 'Official DSH installation folder',
    'context.installationFolderHelp': 'Choose an official DSH source directory whose dependencies are installed and build is complete.',
    'context.dataFolder': 'Existing DSH data folder',
    'context.dataFolderHelp': 'Check discovers only initialized profiles. A missing built-in web profile can be initialized only through the later, separate Preview and confirmation.',
    'context.check': 'Check',
    'context.checking': 'Checking…',
    'context.checkComplete': 'Check complete',
    'context.checkedVersion': 'Checked official DSH',
    'context.initializedProfiles': 'Choose an initialized profile',
    'context.noInitializedProfiles': 'No initialized profiles were found; GraphControl created nothing.',
    'context.initializeTitle': 'Initialize the official Web profile',
    'context.initializeIntro': 'The selected data directory has no built-in web profile. Preview executes the local official DSH installation you selected and trust with a temporary DSH Home. That isolates configuration writes, not code, and does not write the selected data directory.',
    'context.initializePreview': 'Preview official initialization',
    'context.initializePreviewing': 'Previewing through official DSH…',
    'context.initializeReady': 'Official DSH confirmed that it can initialize the missing web profile. The selected data directory is written only after the next confirmation.',
    'context.initializeApply': 'Initialize and open',
    'context.initializing': 'Initializing and opening…',
    'context.initializeConfirm': 'Use the selected official DSH to initialize the missing built-in web profile in the selected data directory, then open it. Continue?',
    'context.initializePendingConfirm': 'This discards current unapplied previews, uses the selected official DSH to initialize the missing built-in web profile, then opens it. Continue?',
    'context.initializePartialWarning': 'Official initialization did not succeed and may have left partial profile files. GraphControl did not delete or repair them; the current Harness is unchanged. Inspect the selected data directory before checking again.',
    'context.openTrustWarning': 'Open or initialization Preview executes code from the local official DSH installation and configuration you selected and trust. The current Harness is not replaced unless the operation succeeds.',
    'context.openPendingWarning': 'Opening another Harness discards current unapplied previews; GraphControl asks again when confirmation is needed.',
    'context.open': 'Open Harness',
    'context.opening': 'Opening…',
    'context.pathRequired': 'Enter both local folders before checking.',
    'context.pendingConfirm': 'Opening another Harness discards current unapplied previews. Continue?',
    'context.openError.request-invalid': 'These folders could not be checked. Make sure both folder fields are complete.',
    'context.openError.explicit-patches': 'This Studio started with additional configuration layers and cannot currently open another Harness.',
    'context.openError.context-busy': 'The current Harness is handling another operation. Check again after it finishes.',
    'context.openError.candidate-expired': 'The checked result expired. Check both folders again.',
    'context.openError.candidate-changed': 'The local Harness changed after it was checked. Check it again.',
    'context.openError.context-changed': 'The current Harness was switched elsewhere. Check again before opening.',
    'context.openError.pending-confirmation-required': 'An unapplied preview appeared. Review it, then open again and confirm discarding it.',
    'context.openError.profile-missing': 'The selected profile no longer exists. Check again.',
    'context.openError.profile-already-exists': 'The built-in web profile now exists or its target is no longer empty. GraphControl did not overwrite it; check again.',
    'context.openError.initialization-preview-required': 'The initialization preview expired. Check and preview again.',
    'context.openError.initialization-failed': 'The selected official DSH could not initialize the built-in web profile. The current Harness is unchanged.',
    'context.openError.installation-unavailable': 'A usable built official DSH installation was not found. Check the installation folder.',
    'context.openError.home-unavailable': 'The selected DSH data folder could not be read. Check that folder.',
    'context.openError.no-initialized-profiles': 'This DSH data folder has no initialized profiles; nothing was created.',
    'context.openError.installation-incompatible': 'The selected official DSH installation is not yet supported by this GraphControl version.',
    'context.openError.profile-migration-required': 'The selected profile first requires an official migration by that DSH installation. Complete that migration with the selected official DSH outside GraphControl before checking again. GraphControl changed nothing, and the current Harness is unchanged.',
    'context.openError.composition-failed': 'The selected profile did not compose through official DSH. The current Harness is unchanged.',
    'context.openError.source-changed': 'Source files changed during composition. The current Harness is unchanged; check again.',
    'context.openError.unknown': 'The selected Harness could not be checked or opened. The current Harness is unchanged; check again.',
    'workspace.aria': 'Harness control console',
    'hero.eyebrow': 'Harness overview',
    'hero.title': 'Understand the current Harness configuration and operating boundaries',
    'hero.lead': 'See configuration context, capability relationships, execution environment, and available changes in one place.',
    'stats.aria': 'Harness overview statistics',
    'composer.eyebrow': 'Direct manipulation',
    'composer.title': 'Design Harness',
    'composer.intro': 'Choose a capability, review the official DSH result, then decide whether to apply it.',
    'composer.service': 'Capability',
    'composer.viewing': 'Designing',
    'composer.scopeAria': 'Composer scope',
    'composer.scopeFocus': 'Current capability',
    'composer.scopeResolved': 'Full config',
    'composer.guideAria': 'Change steps',
    'composer.step1': 'Choose component',
    'composer.step1Help': 'Pick a capability to add or adjust',
    'composer.step2': 'Preview change',
    'composer.step2Help': 'Official DSH confirms whether it works',
    'composer.step3': 'Apply change',
    'composer.step3Help': 'Only then is the selected config updated',
    'composer.arrange': 'Auto arrange',
    'composer.fit': 'Fit graph',
    'composer.reset': 'Reset layout',
    'composer.canvasAria': 'Harness graph canvas',
    'composer.candidates': 'Add capability',
    'composer.candidateHelp': 'Choose an outcome. GraphControl previews the impact before changing the configuration.',
    'composer.searchLabel': 'Add capability',
    'composer.searchPlaceholder': 'Add capability (search capabilities or components)',
    'composer.dockSearchPlaceholder': 'Search capabilities or components',
    'composer.categoriesAria': 'Capability categories',
    'composer.categoryRecommended': 'Recommended',
    'composer.categoryContext': 'Context',
    'composer.categoryStorage': 'Files & storage',
    'composer.categoryInteraction': 'Interaction',
    'composer.categoryIntegration': 'Integrations',
    'composer.categoryTools': 'Tools',
    'composer.regionProviders': 'Capability providers',
    'composer.regionCapability': 'Current capability',
    'composer.regionConsumers': 'Connected components',
    'review.eyebrow': 'Confirm before writing',
    'review.title': 'Pending changes',
    'topology.eyebrow': 'Capability connections',
    'topology.title': 'Providers and consumers',
    'topology.intro': 'See where a capability comes from, which components use it, and whether the connection is complete.',
    'topology.service': 'Capability',
    'worlds.eyebrow': 'Operating boundaries',
    'worlds.title': 'Execution environment',
    'worlds.intro': 'See where filesystem and command capabilities run and whether they form one coherent environment.',
    'entities.eyebrow': 'Configuration inventory',
    'entities.title': 'Components and services',
    'entities.intro': 'Inspect the components, plugins, and services declared and composed in the current Harness.',
    'entities.searchLabel': 'Search components and services',
    'entities.searchPlaceholder': 'Search components, plugins, or services…',
    'entities.planeAria': 'Configuration state filter',
    'plane.resolved': 'Effective',
    'plane.declared': 'Declared',
    'plane.all': 'All',
    'sources.eyebrow': 'Configuration context',
    'sources.title': 'DSH configuration layers',
    'sources.intro': 'The current Harness configuration layers in their effective order.',
    'sources.truthTitle': 'Official DSH configuration',
    'sources.truthBody': 'The console reads the selected DSH configuration and writes supported changes back without maintaining a parallel copy.',
    'details.eyebrow': 'Selected',
    'details.title': 'Component details',
    'details.empty': 'Select a component to see what it does and what connects to it.',
    'details.close': 'Close component details',
  },
}

const apiUrl = path => new URL(`./api/${path}`, window.location.href)

const remoteParticipantZh = {
  'local-providers': '将当前 fs-sandbox 与 subprocess-local Provider 作为一个整体禁用。',
  'e2b-provider-trio': '使用同一 POSIX 工作目录，插入 E2B 共享 Owner、文件系统与子进程 Provider。',
  'remote-bash-executor': '使用基于 subprocess-e2b 的可移植 Bash 执行器，替代主机平台沙箱运行器。',
  'remote-policy-surface': '使界面中展示的权限策略与隔离 E2B 执行域内的实际完全访问语义一致。',
  'remote-agent-preset': '选择 Bash 与远程文件系统工具，不携带主机 ripgrep 搜索工具。',
  'remote-workspace': '为 Session 提供远程 POSIX 工作目录，而不是已规范化的主机目录。',
  'host-control-plane': '将 Web、Session、LLM 调用、日志、设置、凭据与 GraphControl 保留在主机。',
}

const remoteBlockerZh = {
  'packages-missing': '所选配置无法解析全部三个官方 E2B 包。',
  'host-workspace-contract': '官方 Web 工作区和 Session cwd 必须是现存主机目录；E2B 需要 POSIX 远程 cwd，且当前不同步主机工作区。',
  'linux-shell-selection': '当前 Web 预设在 Windows 主机选择 PowerShell，而 subprocess-e2b 提供 Linux 执行域，需要选择 Bash。',
  'remote-search-carrier': '可见 glob/grep 工具启动主机平台的 ripgrep；远程执行需要同域 Carrier 或专用搜索后端。',
  'permission-semantics': '官方 E2B POC 在远程沙箱内使用 danger-full-access；界面不应误宣称主机只读/工作区可写边界同样适用。',
  'runtime-authority': '安装包、检查 E2B 凭据、创建沙箱和启动远程运行时都需要分别的明确授权。',
}

const gitMaterializationBlockerZh = {
  'git-unavailable': '本机 Git 当前不可用，无法确认可复现的代码来源。',
  'not-git-repository': '当前 DSH 工作目录不是 Git 仓库。',
  'working-directory-not-root': '首个方案要求 DSH 工作目录就是 Git 仓库根目录。',
  'no-commit': '当前项目还没有 Git 提交，远端没有可固定的代码版本。',
  'no-origin': '当前仓库没有 origin，无法确定远端从哪里取得代码。',
  'origin-not-anonymous-https': 'origin 不是无凭据 HTTPS 地址；首个方案不会读取私仓凭据。',
  'submodules-unsupported': '当前仓库包含 submodule；首个方案不会假装已经支持它。',
  'git-inspection-failed': '本机 Git 未能返回生成安全预览所需的有限元数据。',
}

const remoteFactZh = {
  'host-workspace': 'Web 工作区是一个通过 realpath 规范化的现存主机目录。',
  'session-create': 'session.create 从 workspace.path、request.cwd 或 Host cwd 中选择一项，然后使用主机 mkdir 确保目录存在。',
  'session-header': '同一 cwd 成为持久 Session 标识；只有规范化主机路径一致才属于同一工作区。',
  'agent-tool-routing': '人设、文件系统工具与 Bash 均从 session.header.cwd 解析工作目录。',
  'remote-cwd': 'E2B 独立需要绝对 Linux cwd；fs-e2b 会优先使用 Session 传入的 cwd，而不是 Provider 默认值。',
  'no-workspace-transfer': '官方 POC 不上传、挂载或同步主机工作区。',
  'preset-ownership': '内置预设为只读；支持的编辑路径是将整个预设复制到用户目录，选中 ID 会记录到 Session。',
  'remote-preset-delta': 'Windows 主机上的远程预设必须强制启用 Bash、禁用 PowerShell、保留 fs 工具，并移除主机 ripgrep 搜索。',
}

const presetChangeZh = [
  '为 Linux 远程执行域强制启用 Bash 工具。',
  '禁用由 Windows 主机平台选中的 PowerShell 工具。',
  '保留通过 ctx.fs 解析的文件系统工具。',
  '在远程搜索 Carrier 存在前移除 tool-fs-search。',
]

function readLocalePreference() {
  try {
    return localStorage.getItem('dsh-graph-control.locale') === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

function readThemePreference() {
  try {
    return localStorage.getItem('dsh-graph-control.theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function readComposerScopePreference() {
  try {
    return localStorage.getItem('dsh-graph-control.composer.scope') === 'resolved' ? 'resolved' : 'focus'
  } catch {
    return 'focus'
  }
}

const state = {
  locale: readLocalePreference(),
  theme: readThemePreference(),
  inspection: undefined,
  inspectionUnavailable: false,
  harnessContext: undefined,
  harnessContextOpen: false,
  harnessContextLoading: false,
  harnessContextError: undefined,
  harnessOpen: {
    status: 'idle',
    candidate: undefined,
    selectedProfile: undefined,
    initialization: undefined,
    errorReason: undefined,
    errorDetails: undefined,
  },
  developerDiagnostics: undefined,
  developerDiagnosticsLoading: false,
  developerDiagnosticsError: undefined,
  developerDiagnosticsRequestId: 0,
  nodesById: new Map(),
  selectedNodeId: undefined,
  selectedServiceId: undefined,
  composerScope: readComposerScopePreference(),
  composer: undefined,
  capabilityQuery: '',
  capabilityFilter: 'all',
  activeSection: 'composer',
  plane: 'resolved',
  query: '',
  planEntryId: undefined,
  planValue: undefined,
  planResult: undefined,
  planError: undefined,
  planLoading: false,
  applyLoading: false,
  applySuccess: undefined,
  providerPlanId: undefined,
  providerPlanResult: undefined,
  providerPlanError: undefined,
  providerPlanLoading: false,
  providerApplyLoading: false,
  providerApplySuccess: undefined,
  composerDraft: undefined,
  composerDraftLoading: false,
  composerDraftApplyLoading: false,
  composerDraftError: undefined,
  composerDraftConflict: undefined,
  composerDraftStale: undefined,
  composerDraftNotice: undefined,
  composerDraftApplySuccess: undefined,
  detailSource: 'source',
  detailPanelOpen: true,
}

function localText(zh, en) {
  return state.locale === 'zh' ? zh : en
}

function isProfileAuthoringReadOnly(value) {
  return value?.code === 'PROFILE_AUTHORING_READ_ONLY'
    && ['profile-patch-unavailable', 'higher-precedence-layer-active'].includes(value.reason)
    && value.writePerformed === false
}

function profileAuthoringReadOnlyText(value = state.inspection?.authoring) {
  const reason = value?.reason
  if (reason === 'higher-precedence-layer-active') {
    return localText(
      '检测到更高优先级的配置层。为确保控制台显示与实际结果一致，当前 Harness 可查看，但这些修改暂时只读。',
      'A higher-priority configuration layer is active. The Harness remains visible, but changes are read-only so the console does not produce a different result than the one shown.',
    )
  }
  return localText(
    '当前 Harness 没有可安全更新的配置层。内容仍可查看，但这些修改暂时只读。',
    'This Harness has no configuration layer that can be safely updated. Its contents remain visible, but changes are read-only.',
  )
}

function profileAuthoringIsReadOnly() {
  return state.inspection?.authoring?.state === 'read-only'
}

function makeProfileAuthoringActionReadOnly(button) {
  button.disabled = true
  button.title = profileAuthoringReadOnlyText()
  button.setAttribute('aria-description', button.title)
  return button
}

function installProfileAuthoringReadOnly(error) {
  if (!isProfileAuthoringReadOnly(error) || !state.inspection) return false
  const authoring = { state: 'read-only', reason: error.reason }
  state.inspection = {
    ...state.inspection,
    authoring,
    componentCatalog: state.inspection.componentCatalog.map(component => ({ ...component, canAdd: false })),
  }
  state.nodesById = new Map(state.inspection.nodes.map(node => [node.id, node]))
  if (state.harnessContext) {
    state.harnessContext = {
      ...state.harnessContext,
      authoring,
      profiles: state.harnessContext.profiles.map(profile => ({
        ...profile,
        editable: profile.selected ? false : profile.editable,
      })),
    }
  }
  renderAll()
  return true
}

function serviceLabel(name) {
  return ({
    fs: localText('文件访问', 'File access'),
    directoryPicker: localText('目录选择', 'Directory picker'),
    subprocess: localText('命令执行', 'Command execution'),
    webRuntime: localText('网页运行环境', 'Web runtime'),
    webStartup: localText('网页访问', 'Web access'),
  })[name] ?? name
}

function sessionAidPresentation(entryId) {
  return ({
    'tool-todo': {
      label: localText('任务清单', 'Task list'),
      purpose: localText(
        '让 Agent 在当前会话中维护并展示一份可追踪的多步骤任务清单。',
        'Lets the Agent maintain and show a trackable multi-step task list in the current conversation.',
      ),
      enableSummary: localText(
        '让 Agent 在当前会话中维护可追踪的多步骤任务清单',
        'Let the Agent maintain a trackable multi-step task list in the current conversation',
      ),
      disableSummary: localText(
        '关闭 Agent 的任务清单能力',
        'Turn off the Agent task-list capability',
      ),
      effect: localText(
        '此修改尚未写入。应用后 GraphControl 会更新并重新读取所选配置；重启 DSH 后，新建 Agent 将获得新的任务清单状态。',
        'This change is not written yet. Apply updates and reloads the selected config; newly created Agents receive the new task-list state after DSH is restarted.',
      ),
    },
    'tool-goal': {
      label: localText('持续目标', 'Long-running goal'),
      purpose: localText(
        '让 Agent 在当前会话中创建、读取和更新一个可暂停、恢复的长期目标。',
        'Lets the Agent create, read, and update one long-running goal that can be paused and resumed in the current conversation.',
      ),
      enableSummary: localText(
        '允许 Agent 在当前会话中创建并更新一个可持续推进的长期目标',
        'Let the Agent create and update one long-running goal in the current conversation',
      ),
      disableSummary: localText(
        '关闭 Agent 的目标管理工具；会话中已有的目标记录不会被删除',
        'Turn off Agent goal tools without deleting goals already stored in the conversation',
      ),
      connections: localText(
        '只会改变 Agent 是否可以调用目标工具；不会删除现有目标，也不会移除官方目标栏。',
        'Only Agent access to the goal tools changes; existing goals and the official goal bar remain.',
      ),
      effect: localText(
        '此修改尚未写入。应用并重启 DSH 后，新建 Agent 将获得新的目标工具状态；已有目标仍保留在会话日志中。',
        'This change is not written yet. After Apply and a DSH restart, newly created Agents receive the new goal-tool state; existing goals remain in the conversation log.',
      ),
    },
  })[entryId]
}

function entryLabel(entryId, fallback = entryId) {
  const sessionAid = sessionAidPresentation(entryId)
  if (sessionAid) return sessionAid.label
  return ({
    'fs-sandbox': localText('沙箱文件系统', 'Sandbox filesystem'),
    'fs-local': localText('本机文件系统', 'Local filesystem'),
    'tool-fs': localText('文件工具', 'File tools'),
    'tool-str-replace-editor': localText('文本编辑', 'Text editor'),
    'directory-picker': localText('目录选择器', 'Directory picker'),
    'api-gateway': localText('应用界面', 'App interface'),
    subprocess: localText('本机命令', 'Local commands'),
    'bash-sandbox': localText('Bash 工具', 'Bash tool'),
    'pwsh-sandbox': localText('PowerShell 工具', 'PowerShell tool'),
    'tool-fs-search': localText('文件搜索', 'File search'),
    'web-startup': localText('网页入口', 'Web entry'),
    webserver: localText('Web 服务', 'Web server'),
    'web-runtime': localText('网页运行环境', 'Web runtime'),
    connection: localText('浏览器连接', 'Browser connection'),
  })[entryId] ?? fallback
}

function friendlyNodeLabel(node) {
  if (!node) return ''
  return node.kind === 'service'
    ? serviceLabel(node.attributes?.name ?? node.label)
    : entryLabel(node.attributes?.entryId, node.label)
}

function t(key) {
  return messages[state.locale][key] ?? messages.en[key] ?? key
}

function applyStaticTranslations() {
  document.documentElement.lang = state.locale === 'zh' ? 'zh-CN' : 'en'
  document.title = localText('DSH GraphControl · DeepSeek Harness 控制台', 'DSH GraphControl · DeepSeek Harness console')
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder))
  })
  document.querySelectorAll('[data-i18n-aria]').forEach(node => {
    node.setAttribute('aria-label', t(node.dataset.i18nAria))
  })
  byId('languageSwitch')?.querySelectorAll('[data-locale]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === state.locale))
  })
  document.querySelectorAll('[data-capability-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.capabilityFilter === state.capabilityFilter))
  })
  applyTheme()
}

function setLocale(locale) {
  if (locale !== 'zh' && locale !== 'en') return
  state.locale = locale
  try {
    localStorage.setItem('dsh-graph-control.locale', locale)
  } catch {
    // Language preference is presentation state; failure must not block inspection.
  }
  applyStaticTranslations()
  if (state.inspection) renderAll()
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  byId('themeSwitch')?.querySelectorAll('[data-theme-value]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeValue === state.theme))
  })
  state.composer?.setTheme(state.theme)
  if (state.inspection) renderComposerStatus()
}

function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return
  state.theme = theme
  try {
    localStorage.setItem('dsh-graph-control.theme', theme)
  } catch {
    // Theme preference is presentation state; failure must not block inspection.
  }
  applyTheme()
}

function planeLabel(plane) {
  return ({
    resolved: localText('已解析', 'resolved'),
    declared: localText('已声明', 'declared'),
    observed: localText('已观测', 'observed'),
  })[plane] ?? plane
}

function availabilityLabel(value) {
  return ({
    active: localText('已启用', 'active'),
    available: localText('可用', 'available'),
    disabled: localText('已禁用', 'disabled'),
    unknown: localText('状态未知', 'unknown'),
    coherent: localText('一致', 'coherent'),
    incomplete: localText('不完整', 'incomplete'),
    conflicting: localText('冲突', 'conflicting'),
    unavailable: localText('不可用', 'unavailable'),
    blocked: localText('已阻塞', 'blocked'),
  })[value] ?? value
}

function actionLabel(action) {
  return ({
    disable: localText('禁用', 'disable'),
    insert: localText('插入', 'insert'),
    replace: localText('替换', 'replace'),
    align: localText('对齐', 'align'),
    retain: localText('保留', 'retain'),
  })[action] ?? action
}

function ownerLabel(owner) {
  return ({
    official: localText('官方', 'official'),
    profile: localText('配置', 'profile'),
    user: localText('用户', 'user'),
    workspace: localText('工作区', 'workspace'),
    host: localText('主机', 'host'),
    session: 'Session',
    agent: 'Agent',
    remote: localText('远程', 'remote'),
  })[owner] ?? owner
}

function kindLabel(kind) {
  return ({
    entry: localText('条目', 'entry'),
    'plugin-entry': localText('插件条目', 'plugin entry'),
    plugin: localText('插件', 'plugin'),
    service: localText('服务', 'service'),
    capability: localText('能力', 'capability'),
    profile: localText('配置', 'profile'),
    layer: localText('来源层', 'layer'),
    'source-document': localText('源文档', 'source document'),
    'official-config-dump': localText('官方配置导出', 'official config dump'),
    'insert-operation': localText('新增配置', 'configuration addition'),
    'patch-operation': localText('配置修改', 'configuration change'),
    'opaque-row': localText('未识别配置', 'unrecognized configuration'),
    preset: localText('预设', 'preset'),
    'execution-world': localText('执行环境', 'execution environment'),
  })[kind] ?? kind
}

function edgeLabel(kind) {
  return ({
    'provides-service': localText('提供服务', 'provides service'),
    'requires-service': localText('必需服务', 'requires service'),
    'optionally-requires-service': localText('可选依赖服务', 'optionally requires service'),
    'declares-plugin': localText('声明插件', 'declares plugin'),
    'resolves-to': localText('解析为', 'resolves to'),
    'member-of-execution-world': localText('属于执行域', 'member of execution world'),
  })[kind] ?? kind.replaceAll('-', ' ')
}

function localizeLayerState(value) {
  if (/^Read-only source/u.test(value)) {
    return localText('由官方 DSH 管理 · 只读', 'Managed by official DSH · read-only')
  }
  if (/^Editable patch/u.test(value)) {
    return localText('可通过控制台修改', 'Changes available in the console')
  }
  if (/^Optional patch not present$/u.test(value)) {
    return localText('尚无此配置层', 'No configuration at this layer')
  }
  return value
}

function repairLabel(repair) {
  if (state.locale !== 'zh') return repair.label
  if (repair.id.startsWith('keep-enabled:')) return `保持 ${repair.id.split(':').at(-1)} 启用`
  if (repair.id.startsWith('disable-closure:')) return '同时关闭受影响的使用方'
  if (repair.id.startsWith('leave-unresolved:')) return '保留为未解决草稿'
  return repair.label
}

function provenanceLabel(kind) {
  return ({
    declared: localText('已声明', 'declared'),
    inserted: localText('已插入', 'inserted'),
    patched: localText('已调整', 'adjusted'),
    inherited: localText('已继承', 'inherited'),
    defaulted: localText('默认值', 'defaulted'),
    derived: localText('系统计算', 'computed'),
    observed: localText('已观测', 'observed'),
  })[kind] ?? kind
}

function policyText(policy, field) {
  if (state.locale !== 'zh') return policy[field]
  if (policy.id === 'sandbox-confined') {
    return ({
      label: '沙箱约束文件系统',
      executionWorld: '主机本地',
      confinement: '沙箱策略',
      summary: '在委托给主机本地文件系统实现之前，按每次调用强制执行只读或工作区可写策略。',
    })[field] ?? policy[field]
  }
  if (policy.id === 'local-unconfined') {
    return ({
      label: '直接主机本地文件系统',
      executionWorld: '主机本地',
      confinement: '无',
      summary: '直接使用主机本地文件系统；此 Provider 不强制执行只读或工作区可写约束。',
    })[field] ?? policy[field]
  }
  return policy[field]
}

const replacementZh = {
  'fs-sandbox-to-local': {
    executionWorld: '无执行域变化：两个 Provider 均位于同一主机本地文件系统域，仅隔离策略变更。',
    security: '移除 ctx.fs 写入/编辑约束：本地 Provider 不强制执行只读或工作区可写沙箱策略。',
  },
  'fs-local-to-sandbox': {
    executionWorld: '无执行域变化：两个 Provider 均位于同一主机本地文件系统域，仅隔离策略变更。',
    security: '恢复 ctx.fs 只读与工作区可写沙箱策略；超出策略范围的操作可能不再成功。',
  },
  'fs-provider-reset-official-default': {
    executionWorld: '无执行域变化：当前官方 Bundle 默认值仍是主机本地沙箱文件系统域。',
    security: '仅移除已生成的 Provider 覆盖，并继承当前官方 fs-sandbox 默认值及其只读/工作区可写约束。',
  },
  'directory-picker-pin-browse': {
    executionWorld: '主机仍保持本地；仅将目录选择从启动时自动检测改为由同一主机文件系统支持的浏览器内交互。',
    security: '受信任 Web 客户端通过现有浏览器信任边界 API 获得主机目录列表与子目录创建能力；不再打开操作系统选择器。',
  },
  'directory-picker-reset-auto': {
    executionWorld: '主机仍保持本地；当前官方启动检测会根据绑定地址、SSH、显示环境与平台事实选择原生或浏览交互。',
    security: '移除强制浏览器列表/创建界面并恢复官方自适应选择器；远程启动仍可能选择浏览模式。',
  },
}

function replacementText(replacement, field) {
  if (state.locale !== 'zh') return field === 'security' ? replacement.securityDelta : replacement.executionWorldDelta
  return replacementZh[replacement.id]?.[field]
    ?? (field === 'security' ? replacement.securityDelta : replacement.executionWorldDelta)
}

const byId = id => document.getElementById(id)

function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function replaceChildren(target, children) {
  target.replaceChildren(...children)
}

function readable(value) {
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function hasUnappliedChanges() {
  return Boolean(
    state.planResult
      || state.providerPlanResult
      || state.composerDraft?.operations?.length
      || state.composerDraft?.canRedo
      || state.harnessContext?.pendingChanges,
  )
}

function currentMutationInFlight() {
  return Boolean(
    state.planLoading
      || state.providerPlanLoading
      || state.composerDraftLoading
      || state.applyLoading
      || state.providerApplyLoading
      || state.composerDraftApplyLoading,
  )
}

function harnessContextTransitionInFlight() {
  return state.harnessContextLoading || harnessOpenBusy()
}

const harnessOpenErrorReasons = new Set([
  'request-invalid',
  'explicit-patches',
  'context-busy',
  'candidate-expired',
  'candidate-changed',
  'context-changed',
  'pending-confirmation-required',
  'profile-missing',
  'profile-already-exists',
  'initialization-preview-required',
  'initialization-failed',
  'installation-unavailable',
  'home-unavailable',
  'no-initialized-profiles',
  'installation-incompatible',
  'profile-migration-required',
  'composition-failed',
  'source-changed',
])

function normalizedHarnessOpenErrorReason(value) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase().replaceAll('_', '-')
  return harnessOpenErrorReasons.has(normalized) ? normalized : undefined
}

function harnessOpenErrorReason(result) {
  const error = result?.error
  const values = typeof error === 'string'
    ? [error, result?.reason, result?.code]
    : [error?.reason, error?.code, result?.reason, result?.code]
  return values.map(normalizedHarnessOpenErrorReason).find(Boolean) ?? 'unknown'
}

function harnessOpenErrorDetails(result) {
  const error = result?.error
  if (error === null || typeof error !== 'object') return undefined
  return {
    partialFilesMayRemain: error.partialFilesMayRemain === true,
  }
}

function harnessOpenErrorText(reason, details) {
  if (reason === 'path-required') return t('context.pathRequired')
  if (reason === 'initialization-failed' && details?.partialFilesMayRemain) {
    return t('context.initializePartialWarning')
  }
  return t(`context.openError.${harnessOpenErrorReasons.has(reason) ? reason : 'unknown'}`)
}

function harnessOpenBusy() {
  return state.harnessOpen.status === 'checking'
    || state.harnessOpen.status === 'opening'
    || state.harnessOpen.status === 'initialization-previewing'
    || state.harnessOpen.status === 'initializing'
}

function harnessOpenBlockedByStartupOverlay() {
  return state.harnessContext?.switching?.enabled === false
    && state.harnessContext?.switching?.reason === 'explicit-patches'
}

function invalidateHarnessOpenCandidate() {
  if (harnessOpenBusy()) return
  state.harnessOpen = {
    status: 'idle',
    candidate: undefined,
    selectedProfile: undefined,
    initialization: undefined,
    errorReason: undefined,
    errorDetails: undefined,
  }
  byId('harnessInstallationRoot')?.removeAttribute('aria-invalid')
  byId('harnessDshHome')?.removeAttribute('aria-invalid')
  renderHarnessContext()
}

function checkedHarnessCandidate(result) {
  if (result === null
    || typeof result !== 'object'
    || typeof result.candidateId !== 'string'
    || result.candidateId === ''
    || !Number.isInteger(result.expectedContextRevision)
    || result.installation === null
    || typeof result.installation !== 'object'
    || typeof result.installation.version !== 'string'
    || result.installation.version === ''
    || !Array.isArray(result.profiles)
    || result.profiles.some(profile =>
      profile === null
      || typeof profile !== 'object'
      || typeof profile.name !== 'string'
      || profile.name === '')) {
    return undefined
  }
  return {
    candidateId: result.candidateId,
    expectedContextRevision: result.expectedContextRevision,
    installation: { version: result.installation.version },
    profiles: result.profiles.map(profile => ({ name: profile.name })),
  }
}

function checkedHarnessInitialization(result, candidate) {
  if (result === null
    || typeof result !== 'object'
    || typeof result.initializationId !== 'string'
    || result.initializationId === ''
    || result.candidateId !== candidate.candidateId
    || result.expectedContextRevision !== candidate.expectedContextRevision
    || result.profile !== 'web'
    || result.canApply !== true
    || result.preview?.source !== 'official-dsh'
    || result.preview?.outcome !== 'initialize-missing-profile'
    || result.preview?.profileTargetState !== 'missing'
    || result.preview?.realHomeWritePerformed !== false) {
    return undefined
  }
  return {
    initializationId: result.initializationId,
    expectedContextRevision: result.expectedContextRevision,
    profile: result.profile,
  }
}

function harnessOpenProfileChoice(profile) {
  const label = element('label', 'harness-open-profile-choice')
  const input = document.createElement('input')
  input.type = 'radio'
  input.name = 'harnessOpenProfile'
  input.value = profile.name
  input.checked = state.harnessOpen.selectedProfile === profile.name
  input.disabled = harnessOpenBusy()
    || currentMutationInFlight()
    || harnessOpenBlockedByStartupOverlay()
  input.setAttribute('aria-describedby', 'harnessOpenTrustWarning')
  const copy = element('span', 'harness-open-profile-copy')
  copy.append(
    element('strong', '', profile.name),
    element('small', '', localText('已初始化的本机配置', 'Initialized local profile')),
  )
  input.addEventListener('change', () => {
    if (!input.checked
      || (state.harnessOpen.status !== 'ready'
        && state.harnessOpen.status !== 'initialization-ready')) return
    state.harnessOpen.selectedProfile = profile.name
    state.harnessOpen.status = 'ready'
    state.harnessOpen.initialization = undefined
    state.harnessOpen.errorDetails = undefined
    byId('harnessContextOpen').disabled = currentMutationInFlight()
      || state.harnessContextLoading
    renderHarnessOpen()
  })
  label.append(input, copy)
  return label
}

function renderHarnessOpen() {
  const candidate = state.harnessOpen.candidate
  const blocked = harnessOpenBlockedByStartupOverlay()
  const busy = harnessOpenBusy()
  const mutationInFlight = currentMutationInFlight()
  const disclosure = byId('openLocalHarnessDisclosure')
  const summary = byId('harnessOpenSummary')
  const installationInput = byId('harnessInstallationRoot')
  const homeInput = byId('harnessDshHome')
  const form = byId('harnessContextCheckForm')
  const checkButton = byId('harnessContextCheck')
  const openButton = byId('harnessContextOpen')
  const initializeSection = byId('harnessInitialize')
  const initializePreviewButton = byId('harnessInitializePreview')
  const initializeApplyButton = byId('harnessInitializeApply')
  const overlayWarning = byId('harnessOpenOverlayWarning')
  const status = byId('harnessOpenStatus')
  const error = byId('harnessOpenError')
  const candidateSection = byId('harnessOpenCandidate')
  const profiles = candidate?.profiles ?? []
  const canInitializeWeb = candidate !== undefined
    && !profiles.some(profile => profile.name === 'web')

  disclosure.setAttribute('aria-busy', String(busy))
  summary.setAttribute('aria-disabled', String(busy))
  overlayWarning.hidden = !blocked
  form.setAttribute('aria-busy', String(state.harnessOpen.status === 'checking'))
  candidateSection.setAttribute('aria-busy', String(
    state.harnessOpen.status === 'opening'
      || state.harnessOpen.status === 'initialization-previewing'
      || state.harnessOpen.status === 'initializing',
  ))
  installationInput.disabled = blocked || busy || mutationInFlight || state.harnessContextLoading
  homeInput.disabled = blocked || busy || mutationInFlight || state.harnessContextLoading
  checkButton.disabled = blocked
    || busy
    || mutationInFlight
    || state.harnessContextLoading
    || installationInput.value.trim() === ''
    || homeInput.value.trim() === ''
  byId('harnessContextCheckLabel').textContent = state.harnessOpen.status === 'checking'
    ? t('context.checking')
    : t('context.check')

  status.textContent = state.harnessOpen.status === 'checking'
    ? t('context.checking')
    : state.harnessOpen.status === 'opening'
      ? t('context.opening')
      : state.harnessOpen.status === 'initialization-previewing'
        ? t('context.initializePreviewing')
        : state.harnessOpen.status === 'initializing'
          ? t('context.initializing')
          : state.harnessOpen.status === 'initialization-ready'
            ? t('context.initializeReady')
      : state.harnessOpen.status === 'ready'
        ? profiles.length === 0
          ? t('context.noInitializedProfiles')
          : localText(
              `找到 ${profiles.length} 个已初始化配置。请选择一个后再打开。`,
              `Found ${profiles.length} initialized ${profiles.length === 1 ? 'profile' : 'profiles'}. Choose one to open.`,
            )
        : ''

  error.hidden = state.harnessOpen.status !== 'error'
  error.textContent = state.harnessOpen.status === 'error'
    ? harnessOpenErrorText(state.harnessOpen.errorReason, state.harnessOpen.errorDetails)
    : ''

  candidateSection.hidden = candidate === undefined
  if (candidate === undefined) {
    replaceChildren(byId('harnessOpenProfileList'), [])
    return
  }
  byId('harnessOpenVersion').textContent = `v${candidate.installation.version}`
  replaceChildren(byId('harnessOpenProfileList'), profiles.map(harnessOpenProfileChoice))
  byId('harnessOpenProfileFieldset').disabled = blocked
    || busy
    || mutationInFlight
    || profiles.length === 0
  byId('harnessOpenEmpty').hidden = profiles.length !== 0
  initializeSection.hidden = !canInitializeWeb
  const initializationReady = state.harnessOpen.status === 'initialization-ready'
    || state.harnessOpen.status === 'initializing'
  byId('harnessInitializeReady').hidden = !initializationReady
  initializePreviewButton.hidden = initializationReady
  initializePreviewButton.disabled = blocked
    || busy
    || mutationInFlight
    || state.harnessContextLoading
    || state.harnessOpen.status !== 'ready'
  byId('harnessInitializePreviewLabel').textContent = state.harnessOpen.status === 'initialization-previewing'
    ? t('context.initializePreviewing')
    : t('context.initializePreview')
  initializeApplyButton.hidden = !initializationReady
  initializeApplyButton.disabled = blocked
    || busy
    || mutationInFlight
    || state.harnessContextLoading
    || state.harnessOpen.status !== 'initialization-ready'
    || state.harnessOpen.initialization === undefined
  byId('harnessInitializeApplyLabel').textContent = state.harnessOpen.status === 'initializing'
    ? t('context.initializing')
    : t('context.initializeApply')
  byId('harnessOpenPendingWarning').hidden = !hasUnappliedChanges()
  openButton.disabled = blocked
    || busy
    || mutationInFlight
    || state.harnessContextLoading
    || state.harnessOpen.status !== 'ready'
    || !state.harnessOpen.selectedProfile
  byId('harnessContextOpenLabel').textContent = state.harnessOpen.status === 'opening'
    ? t('context.opening')
    : t('context.open')
}

function setHarnessContextOpen(open) {
  state.harnessContextOpen = Boolean(open)
  const popover = byId('harnessContextPopover')
  const trigger = byId('harnessContextTrigger')
  if (popover) popover.hidden = !state.harnessContextOpen
  if (trigger) trigger.setAttribute('aria-expanded', String(state.harnessContextOpen))
}

function profileChoice(profile) {
  const button = element('button', 'harness-profile-choice')
  button.type = 'button'
  button.dataset.profile = profile.name
  button.classList.toggle('selected', profile.selected)
  button.disabled = state.harnessContextLoading
    || harnessOpenBusy()
    || currentMutationInFlight()
    || profile.selected
    || state.harnessContext?.switching?.enabled === false
  const icon = element('span', 'harness-profile-choice-icon')
  const iconGlyph = element('i', `ph ${profile.selected ? 'ph-check-circle' : 'ph-circle'}`)
  iconGlyph.setAttribute('aria-hidden', 'true')
  icon.append(iconGlyph)
  const copy = element('span', 'harness-profile-choice-copy')
  copy.append(element('strong', '', profile.name))
  copy.append(element('small', '', profile.selected
    ? state.harnessContext?.authoring?.state === 'read-only'
      ? localText('当前正在查看 · 只读', 'Currently viewing · read-only')
      : localText('当前正在编辑', 'Currently editing')
    : profile.editable
      ? localText('可预览并应用修改', 'Preview and apply supported')
      : localText('可查看；当前配置不可写', 'View only; profile is not writable')))
  button.append(icon, copy)
  if (!profile.selected) {
    const arrow = element('i', 'ph ph-arrow-right harness-profile-choice-arrow')
    arrow.setAttribute('aria-hidden', 'true')
    button.append(arrow)
    button.addEventListener('click', () => void selectHarnessProfile(profile.name))
  }
  return button
}

function renderHarnessContext() {
  const context = state.harnessContext
  if (!context) return
  byId('harnessContextLabel').textContent = localText(
    `配置 · ${context.selectedProfile}`,
    `Profile · ${context.selectedProfile}`,
  )
  const profiles = context.profiles ?? []
  replaceChildren(byId('harnessProfileList'), profiles.map(profileChoice))
  replaceChildren(byId('settingsProfileList'), profiles.map(profileChoice))

  const compactWorkspace = byId('contextWorkspace')
  compactWorkspace.textContent = localText('本机工作区', 'Local workspace')
  compactWorkspace.removeAttribute('title')
  byId('contextVersion').textContent = `v${context.installation.version}`
  byId('settingsDshHome').textContent = localText('当前所选本机 DSH 数据目录', 'Selected local DSH data directory')
  byId('settingsInstallation').textContent = `${localText('官方 DSH', 'Official DSH')} v${context.installation.version}`
  byId('settingsWorkspace').textContent = localText('当前本机工作区', 'Current local workspace')
  byId('harnessContextStatus').textContent = localText(
    `官方 DSH ${context.installation.version}`,
    `Official DSH ${context.installation.version}`,
  )

  const warning = byId('harnessContextWarning')
  warning.textContent = context.switching?.enabled === false
    ? localText(
        '当前启动时带有附加配置，只能重新读取，暂不能切换到其他配置。',
        'Startup overlays are active, so you can reload but cannot switch profiles.',
      )
    : hasUnappliedChanges()
      ? localText(
          '有尚未应用的预览；切换或重新读取会丢弃它们。',
          'There are unapplied previews; switching or reloading will discard them.',
        )
      : t('context.warning')
  const error = byId('harnessContextError')
  error.hidden = !state.harnessContextError
  error.textContent = state.harnessContextError ?? ''
  byId('harnessContextReload').disabled = state.harnessContextLoading
    || harnessOpenBusy()
    || currentMutationInFlight()
  byId('harnessContextReload').classList.toggle('loading', state.harnessContextLoading)
  byId('settingsHarnessReload').disabled = state.harnessContextLoading
    || harnessOpenBusy()
    || currentMutationInFlight()
  byId('settingsHarnessReload').classList.toggle('loading', state.harnessContextLoading)
  renderHarnessOpen()
  setHarnessContextOpen(state.harnessContextOpen)
}

function rejoinTypedWebSelection(previousInspection, nextInspection, selectedNodeId) {
  if (typeof selectedNodeId !== 'string'
    || previousInspection?.webSpine?.status !== 'available'
    || nextInspection?.webSpine?.status !== 'available'
    || previousInspection.installation?.version !== nextInspection.installation?.version
    || previousInspection.installation?.commit !== nextInspection.installation?.commit
    || previousInspection.profile?.name !== nextInspection.profile?.name) return undefined

  const typedMatches = inspection => inspection.nodes.filter(node =>
    node.id === selectedNodeId
    && node.semanticId === selectedNodeId
    && (node.typed?.kind === 'web-spine-component'
      || node.typed?.kind === 'web-spine-service'))

  if (typedMatches(previousInspection).length !== 1) return undefined
  const current = typedMatches(nextInspection)
  return current.length === 1 ? current[0].id : undefined
}

function resetEditingStateAfterContextSwitch() {
  state.planEntryId = undefined
  state.planValue = undefined
  state.planResult = undefined
  state.planError = undefined
  state.planLoading = false
  state.applyLoading = false
  state.applySuccess = undefined
  state.providerPlanId = undefined
  state.providerPlanResult = undefined
  state.providerPlanError = undefined
  state.providerPlanLoading = false
  state.providerApplyLoading = false
  state.providerApplySuccess = undefined
  state.composerDraftError = undefined
  state.composerDraftConflict = undefined
  state.composerDraftStale = undefined
  state.composerDraftNotice = undefined
  state.composerDraftApplySuccess = undefined
  state.composerDraftLoading = false
  state.composerDraftApplyLoading = false
  state.detailSource = 'source'
}

function installSwitchedHarnessResult(result) {
  const rejoinedSelectedNodeId = rejoinTypedWebSelection(
    state.inspection,
    result.inspection,
    state.selectedNodeId,
  )
  state.harnessContext = result.context
  installAuthoritativeInspection(result.inspection)
  state.composerDraft = result.draft
  state.selectedServiceId = state.inspection.services.find(service => service.name === 'fs')?.id
    ?? preferredWebStartupServiceId(state.inspection)
    ?? state.inspection.services[0]?.id
  state.selectedNodeId = rejoinedSelectedNodeId
    ?? state.selectedServiceId
    ?? state.inspection.nodes.find(node => node.plane === 'resolved')?.id
  resetEditingStateAfterContextSwitch()
}

function finishHarnessContextOpen(result) {
  installSwitchedHarnessResult(result)
  state.harnessContextError = undefined
  state.harnessContextOpen = false
  state.developerDiagnostics = undefined
  state.developerDiagnosticsLoading = false
  state.developerDiagnosticsError = undefined
  state.developerDiagnosticsRequestId += 1
  state.harnessOpen = {
    status: 'idle',
    candidate: undefined,
    selectedProfile: undefined,
    initialization: undefined,
    errorReason: undefined,
    errorDetails: undefined,
  }
  byId('harnessInstallationRoot').value = ''
  byId('harnessDshHome').value = ''
  const disclosure = byId('openLocalHarnessDisclosure')
  disclosure.open = false
  renderAll()
  disclosure.querySelector('summary')?.focus()
}

function focusHarnessOpenResult(id) {
  const disclosure = byId('openLocalHarnessDisclosure')
  disclosure.open = true
  byId(id).focus()
}

async function checkLocalHarness() {
  if (harnessOpenBusy() || state.harnessContextLoading || currentMutationInFlight()) return
  if (harnessOpenBlockedByStartupOverlay()) {
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      errorReason: 'explicit-patches',
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenError')
    return
  }
  const installationInput = byId('harnessInstallationRoot')
  const homeInput = byId('harnessDshHome')
  const installationRoot = installationInput.value.trim()
  const dshHome = homeInput.value.trim()
  installationInput.toggleAttribute('aria-invalid', installationRoot === '')
  homeInput.toggleAttribute('aria-invalid', dshHome === '')
  if (installationRoot === '' || dshHome === '') {
    const missingInput = installationRoot === '' ? installationInput : homeInput
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      errorReason: 'path-required',
    }
    renderHarnessContext()
    missingInput.focus()
    return
  }

  state.developerDiagnostics = undefined
  state.developerDiagnosticsLoading = false
  state.developerDiagnosticsError = undefined
  state.developerDiagnosticsRequestId += 1
  state.harnessOpen = {
    status: 'checking',
    candidate: undefined,
    selectedProfile: undefined,
    errorReason: undefined,
  }
  renderDeveloperDiagnostics()
  renderHarnessContext()
  try {
    const response = await fetch(apiUrl('harness-context/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ installationRoot, dshHome }),
    })
    const result = await response.json()
    if (!response.ok) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        errorReason: harnessOpenErrorReason(result),
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }
    const candidate = checkedHarnessCandidate(result)
    if (candidate === undefined) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        errorReason: 'unknown',
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }
    state.harnessOpen = {
      status: 'ready',
      candidate,
      selectedProfile: undefined,
      errorReason: undefined,
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenCandidate')
  } catch {
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      errorReason: 'unknown',
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenError')
  }
}

async function previewCheckedHarnessInitialization() {
  const { candidate } = state.harnessOpen
  if (state.harnessOpen.status !== 'ready'
    || candidate === undefined
    || candidate.profiles.some(profile => profile.name === 'web')
    || state.harnessContextLoading
    || currentMutationInFlight()
    || harnessOpenBlockedByStartupOverlay()) {
    return
  }

  state.harnessOpen = {
    ...state.harnessOpen,
    status: 'initialization-previewing',
    selectedProfile: undefined,
    initialization: undefined,
    errorReason: undefined,
    errorDetails: undefined,
  }
  renderHarnessContext()
  try {
    const response = await fetch(apiUrl('harness-context/initialize/preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        candidateId: candidate.candidateId,
        expectedContextRevision: candidate.expectedContextRevision,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        initialization: undefined,
        errorReason: harnessOpenErrorReason(result),
        errorDetails: harnessOpenErrorDetails(result),
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }
    const initialization = checkedHarnessInitialization(result, candidate)
    if (initialization === undefined) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        initialization: undefined,
        errorReason: 'unknown',
        errorDetails: undefined,
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }
    state.harnessOpen = {
      ...state.harnessOpen,
      status: 'initialization-ready',
      initialization,
      errorReason: undefined,
      errorDetails: undefined,
    }
    renderHarnessContext()
    byId('harnessInitializeApply').focus()
  } catch {
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      initialization: undefined,
      errorReason: 'unknown',
      errorDetails: undefined,
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenError')
  }
}

async function applyCheckedHarnessInitialization() {
  const { initialization } = state.harnessOpen
  if (state.harnessOpen.status !== 'initialization-ready'
    || initialization === undefined
    || state.harnessContextLoading
    || currentMutationInFlight()
    || harnessOpenBlockedByStartupOverlay()) {
    return
  }
  const discardPendingChanges = hasUnappliedChanges()
  const confirmation = discardPendingChanges
    ? t('context.initializePendingConfirm')
    : t('context.initializeConfirm')
  if (!window.confirm(confirmation)) return

  state.harnessOpen = {
    ...state.harnessOpen,
    status: 'initializing',
    errorReason: undefined,
    errorDetails: undefined,
  }
  renderHarnessContext()
  try {
    const response = await fetch(apiUrl('harness-context/initialize/apply'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        initializationId: initialization.initializationId,
        expectedContextRevision: initialization.expectedContextRevision,
        discardPendingChanges,
      }),
    })
    const result = await response.json()
    if (!response.ok
      || result === null
      || typeof result !== 'object'
      || result.context === undefined
      || result.inspection === undefined
      || result.draft === undefined
      || result.initialization?.profile !== 'web'
      || result.initialization?.source !== 'official-dsh'
      || result.initialization?.writePerformed !== true) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        initialization: undefined,
        errorReason: response.ok ? 'unknown' : harnessOpenErrorReason(result),
        errorDetails: response.ok ? undefined : harnessOpenErrorDetails(result),
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }
    finishHarnessContextOpen(result)
  } catch {
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      initialization: undefined,
      errorReason: 'unknown',
      errorDetails: undefined,
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenError')
  }
}

async function openCheckedHarness() {
  const { candidate, selectedProfile } = state.harnessOpen
  if (state.harnessOpen.status !== 'ready'
    || candidate === undefined
    || !selectedProfile
    || state.harnessContextLoading
    || currentMutationInFlight()
    || harnessOpenBlockedByStartupOverlay()) {
    return
  }
  let discardPendingChanges = false
  if (hasUnappliedChanges()) {
    if (!window.confirm(t('context.pendingConfirm'))) return
    discardPendingChanges = true
  }

  state.harnessOpen = {
    ...state.harnessOpen,
    status: 'opening',
    errorReason: undefined,
  }
  renderHarnessContext()
  try {
    const response = await fetch(apiUrl('harness-context/open'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        candidateId: candidate.candidateId,
        expectedContextRevision: candidate.expectedContextRevision,
        profile: selectedProfile,
        discardPendingChanges,
      }),
    })
    const result = await response.json()
    if (!response.ok
      || result === null
      || typeof result !== 'object'
      || result.context === undefined
      || result.inspection === undefined
      || result.draft === undefined) {
      state.harnessOpen = {
        status: 'error',
        candidate: undefined,
        selectedProfile: undefined,
        errorReason: response.ok ? 'unknown' : harnessOpenErrorReason(result),
      }
      renderHarnessContext()
      focusHarnessOpenResult('harnessOpenError')
      return
    }

    finishHarnessContextOpen(result)
  } catch {
    state.harnessOpen = {
      status: 'error',
      candidate: undefined,
      selectedProfile: undefined,
      errorReason: 'unknown',
    }
    renderHarnessContext()
    focusHarnessOpenResult('harnessOpenError')
  }
}

async function selectHarnessProfile(profile) {
  if (!state.harnessContext || state.harnessContextLoading || currentMutationInFlight()) return
  if (hasUnappliedChanges()) {
    const confirmed = window.confirm(localText(
      '切换或重新读取会丢弃尚未应用的预览。继续吗？',
      'Switching or reloading will discard unapplied previews. Continue?',
    ))
    if (!confirmed) return
  }
  state.harnessContextLoading = true
  state.harnessContextError = undefined
  state.developerDiagnostics = undefined
  state.developerDiagnosticsLoading = false
  state.developerDiagnosticsError = undefined
  state.developerDiagnosticsRequestId += 1
  renderHarnessContext()
  try {
    const response = await fetch(apiUrl('harness-context/select'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ profile }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`)
    installSwitchedHarnessResult(result)
    state.harnessOpen = {
      status: 'idle',
      candidate: undefined,
      selectedProfile: undefined,
      errorReason: undefined,
    }
    state.harnessContextOpen = false
  } catch (error) {
    state.harnessContextError = error instanceof Error ? error.message : String(error)
    state.harnessContextOpen = true
  } finally {
    state.harnessContextLoading = false
    renderAll()
  }
}

function renderHeader() {
  const { inspection } = state
  byId('profileName').textContent = inspection.profile.name
  byId('connectionText').textContent = state.inspectionUnavailable
    ? localText('Harness 需要重新读取', 'Harness reload required')
    : localText('本机 DSH 已连接', 'Local DSH connected')
  byId('connectionText').title = `${localText('官方 DSH', 'Official DSH')} ${inspection.installation.version}`
  byId('profilePath').textContent = localText('本机配置', 'Local profile')
  renderWorkspaceLocation()
  renderHarnessContext()
}

function renderWorkspaceLocation() {
  const labels = {
    composer: localText('设计', 'Design'),
    changes: localText('变更', 'Changes'),
    topology: localText('依赖', 'Dependencies'),
    overview: localText('概览', 'Overview'),
    system: localText('系统状态', 'System status'),
  }
  byId('workspaceBreadcrumb').textContent = `${labels[state.activeSection] ?? labels.composer} /`
}

function renderLayers() {
  const layers = state.inspection.layers
  byId('layerCount').textContent = String(layers.length)
  const items = layers.map(layer => {
    const item = element('li', 'layer-item')
    item.append(element('span', 'layer-order', String(layer.order + 1)))
    const copy = element('div')
    copy.append(element('p', 'layer-name', layer.label))
    const meta = element('div', 'layer-meta')
    meta.append(element('span', 'tag', ownerLabel(layer.owner)))
    if (layer.writable) meta.append(element('span', 'tag editable', localText('控制台可改', 'console editable')))
    copy.append(meta)
    copy.append(element('p', 'layer-state', localizeLayerState(layer.state)))
    item.append(copy)
    return item
  })
  replaceChildren(byId('layerList'), items)
}

function renderStats() {
  const counts = state.inspection.counts
  const stats = [
    [counts.nodes, localText('组件与能力', 'Components & capabilities')],
    [counts.edges, localText('连接', 'Connections')],
    [counts.declared, localText('配置声明', 'Declared config')],
    [counts.resolved, localText('实际生效', 'Effective config')],
  ].map(([value, label]) => {
    const item = element('div', 'stat')
    item.append(element('strong', '', String(value)))
    item.append(element('span', '', label))
    return item
  })
  replaceChildren(byId('summaryStats'), stats)
}

function renderDiagnostics() {
  const banner = byId('diagnosticBanner')
  if (state.inspectionUnavailable) {
    banner.hidden = false
    banner.textContent = localText(
      '官方 DSH 当前无法读取所选 Harness；旧图谱已隐藏，修复外部配置后请重新读取。',
      'Official DSH cannot currently read the selected Harness. The previous graph is hidden; fix the external config, then reload.',
    )
    return
  }
  if (state.inspection.diagnostics.length === 0) {
    banner.hidden = true
    return
  }
  banner.hidden = false
  banner.textContent = localText(
    `${state.inspection.diagnostics.length} 个配置读取问题：${state.inspection.diagnostics[0].message}`,
    `${state.inspection.diagnostics.length} configuration issue${state.inspection.diagnostics.length === 1 ? '' : 's'}: ${state.inspection.diagnostics[0].message}`,
  )
}

function currentCandidateInspection() {
  return state.composerDraft?.state === 'validated'
    ? state.composerDraft.candidate?.inspection
    : undefined
}

function inspectionNode(inspection, nodeId) {
  return inspection?.nodes.find(node => node.id === nodeId)
}

function typedWebSpineService(inspection, name) {
  return inspection?.nodes.find(node =>
    node.typed?.kind === 'web-spine-service' && node.typed.name === name)
}

function preferredWebStartupServiceId(inspection) {
  return typedWebSpineService(inspection, 'webStartup')?.id
    ?? inspection?.services.find(service => service.name === 'webStartup')?.id
}

function detailInspection() {
  return state.inspection
}

function displayNode(nodeId, inspection = state.inspection) {
  const node = inspectionNode(inspection, nodeId) ?? state.nodesById.get(nodeId)
  return node ? node.label : nodeId
}

function topologyButton(nodeId, role, optional = false, provider) {
  const node = state.nodesById.get(nodeId)
  const availability = provider?.availability
    ?? (node?.attributes.disabled === true ? 'disabled' : undefined)
  const button = element('button', `topology-node${optional ? ' optional' : ''}${availability ? ` ${availability}` : ''}`)
  button.type = 'button'
  button.dataset.nodeId = nodeId
  button.append(element('strong', '', friendlyNodeLabel(node) || nodeId))
  button.append(element('span', '', node?.attributes?.entryId ? localText('组件', 'Component') : role))
  if (provider?.policy) button.append(element('span', 'node-policy', policyText(provider.policy, 'label')))
  if (availability) {
    const status = provider === undefined
      ? availabilityLabel(availability)
      : availability === 'disabled'
        ? localText('已禁用备选', 'disabled alternative')
        : availability === 'unknown'
          ? localText('状态未知', 'state unknown')
          : localText('已启用', 'active')
    button.append(element('span', 'node-status', status))
  }
  button.addEventListener('click', () => selectNode(nodeId))
  return button
}

function appendProviderGroup(column, label, providers) {
  if (providers.length === 0) return
  column.append(element('div', 'provider-group-label', label))
  providers.forEach(provider => column.append(topologyButton(provider.nodeId, 'provider', false, provider)))
}

function renderTopology() {
  const services = state.inspection.services
  const select = byId('serviceSelect')
  replaceChildren(select, services.map(service => {
    const option = element('option', '', serviceLabel(service.name))
    option.value = service.id
    return option
  }))
  if (!state.selectedServiceId || !services.some(service => service.id === state.selectedServiceId)) {
    state.selectedServiceId = services.find(service => service.name === 'fs')?.id
      ?? preferredWebStartupServiceId(state.inspection)
      ?? services[0]?.id
  }
  select.value = state.selectedServiceId ?? ''

  const flow = byId('topologyFlow')
  const service = services.find(candidate => candidate.id === state.selectedServiceId)
  if (!service) {
    replaceChildren(flow, [element('p', 'empty-topology', localText('此配置中未找到明确的服务关系。', 'No explicit service relationships were found in this profile.'))])
    byId('topologyEvidence').textContent = localText('仅展示明确元数据；GraphControl 不会虚构缺失的关系。', 'Only explicit metadata is shown; GraphControl does not invent missing relationships.')
    return
  }

  const providers = element('div', 'topology-column')
  providers.append(element('div', 'topology-column-label', localText('能力提供者', 'Capability providers')))
  if (service.providers.length === 0) providers.append(element('p', 'empty-state', localText('没有已知 Provider', 'No known provider')))
  appendProviderGroup(providers, localText('已启用', 'Active'), service.providers.filter(provider => provider.availability === 'active'))
  appendProviderGroup(providers, localText('已禁用备选', 'Disabled alternatives'), service.providers.filter(provider => provider.availability === 'disabled'))
  appendProviderGroup(providers, localText('状态未知', 'Unknown state'), service.providers.filter(provider => provider.availability === 'unknown'))

  const core = element('div', `service-core ${service.availability}`)
  core.append(element('span', '', localText('服务', 'Service')))
  core.append(element('strong', '', serviceLabel(service.name)))
  core.append(element('span', 'service-state', availabilityLabel(service.availability)))
  const activePolicy = service.providers.find(provider => provider.availability === 'active')?.policy
  if (activePolicy) core.append(element('small', 'service-policy', policyText(activePolicy, 'label')))

  const consumers = element('div', 'topology-column')
  consumers.append(element('div', 'topology-column-label', localText('依赖方', 'Required by')))
  if (service.requiredConsumers.length === 0 && service.optionalConsumers.length === 0) {
    consumers.append(element('p', 'empty-state', localText('没有已知使用方', 'No known consumers')))
  }
  service.requiredConsumers.forEach(nodeId => consumers.append(topologyButton(nodeId, localText('必需使用方', 'required consumer'))))
  service.optionalConsumers.forEach(nodeId => consumers.append(topologyButton(nodeId, localText('可选使用方', 'optional consumer'), true)))

  replaceChildren(flow, [providers, core, consumers])
  const activeCount = service.providers.filter(provider => provider.availability === 'active').length
  const disabledCount = service.providers.filter(provider => provider.availability === 'disabled').length
  const unknownCount = service.providers.filter(provider => provider.availability === 'unknown').length
  const availabilityNote = service.availability === 'conflicting'
    ? localText('此服务有多个 Provider 同时启用。', 'Multiple providers are active for this service.')
    : service.availability === 'unavailable'
      ? localText('此服务当前没有已启用 Provider。', 'No provider is currently active for this service.')
      : service.availability === 'unknown'
        ? localText('不评估动态配置就无法确定 Provider 状态。', 'Provider state cannot be resolved without evaluating dynamic configuration.')
        : localText('当前恰好有一个 Provider 启用。', 'Exactly one provider is currently active.')
  byId('topologyEvidence').textContent = localText(
    `${availabilityNote} ${activeCount} 个已启用 · ${disabledCount} 个已禁用备选 · ${unknownCount} 个未知 · ${service.requiredConsumers.length} 个必需使用方 · ${service.optionalConsumers.length} 个可选使用方。`,
    `${availabilityNote} ${activeCount} active · ${disabledCount} disabled alternative${disabledCount === 1 ? '' : 's'} · ${unknownCount} unknown · ${service.requiredConsumers.length} required consumer${service.requiredConsumers.length === 1 ? '' : 's'} · ${service.optionalConsumers.length} optional.`,
  )
}

function renderComposerStatus() {
  if (state.composerDraft?.state === 'blocked') {
    const repairAvailable = state.composerDraft.operations?.some(operation =>
      operation.dependencyImpact?.repairs?.some(repair => repair.supportedByCurrentWriter))
    byId('composerStatus').dataset.state = 'intent'
    byId('composerStatus').textContent = localText(
      repairAvailable
        ? '这项修改还不能应用；请在右侧“待应用的修改”中选择一种修复方式。'
        : '这是一项影响预览，当前没有安全的自动修复；撤销或清除后可以继续。',
      repairAvailable
        ? 'This change cannot be applied yet. Choose a repair in Pending changes.'
        : 'This is an impact preview with no safe automatic repair. Undo or clear it to continue.',
    )
    return
  }
  if (currentCandidateInspection()) {
    byId('composerStatus').dataset.state = 'ready'
    byId('composerStatus').textContent = localText(
      '当前画布仍是官方 DSH 状态；虚线候选已通过验证，但尚未写入。',
      'The canvas still shows official DSH state; the dashed candidate is validated but not written.',
    )
  }
}

function renderComposer() {
  const services = state.inspection.services
  const select = byId('composerServiceSelect')
  replaceChildren(select, services.map(service => {
    const option = element('option', '', serviceLabel(service.name))
    option.value = service.id
    return option
  }))
  select.value = state.selectedServiceId ?? ''
  select.disabled = state.composerScope !== 'focus'
  byId('composerScope').querySelectorAll('button[data-composer-scope]').forEach(button => {
    button.classList.toggle('active', button.dataset.composerScope === state.composerScope)
  })

  if (!state.composer) {
    if (typeof window.createDshComposer !== 'function') throw new Error('Composer renderer did not load')
    state.composer = window.createDshComposer({
      container: byId('composerCanvas'),
      status: byId('composerStatus'),
      candidateShelf: byId('composerCandidateShelf'),
      count: byId('composerNodeCount'),
      onSelect: nodeId => selectNode(nodeId, 'source'),
      onPlan: async action => {
        if (action.serviceNodeId) selectNode(action.serviceNodeId)
        else if (action.currentNodeId) selectNode(action.currentNodeId)
        return updateComposerDraft('add', action.id)
      },
      onStatePlan: async action => {
        selectNode(action.nodeId)
        return updateComposerDraft('add', action.id)
      },
      onServiceSelect: serviceId => {
        state.selectedServiceId = serviceId
        state.composerScope = 'focus'
        selectNode(serviceId)
        renderHeader()
        renderTopology()
        renderComposer()
      },
    })
  }
  state.composer.update({
    inspection: state.inspection,
    serviceId: state.selectedServiceId,
    scope: state.composerScope,
    selectedNodeId: state.selectedNodeId,
    locale: state.locale,
    theme: state.theme,
    draftBlocked: state.composerDraft?.state === 'blocked',
    draftActionIds: state.composerDraft?.operations?.map(operation => operation.actionId) ?? [],
    capabilityQuery: state.capabilityQuery,
    capabilityFilter: state.capabilityFilter,
  })
  renderComposerStatus()
  renderComposerDraft()
}

function composerDraftModeLabel(mode) {
  return ({
    initial: localText('首次替换', 'initial replacement'),
    switch: localText('切换 Provider', 'provider switch'),
    reset: localText('恢复官方默认', 'official reset'),
    'pin-browse': localText('组合插件胶囊', 'compose plugin capsule'),
    'reset-auto': localText('恢复自适应选择', 'restore adaptive picker'),
    'add-plugin': localText('增加能力', 'add capability'),
    'remove-plugin': localText('移除能力', 'remove capability'),
    disable: localText('禁用（依赖阻塞）', 'disable (dependency blocked)'),
    'disable-with-repair': localText('禁用并修复依赖', 'disable with dependency repair'),
    'remove-provider': localText('移除 Provider（等待修复）', 'remove provider (repair required)'),
    'remove-provider-with-repair': localText('移除并切换 Provider', 'remove and switch provider'),
    'remove-provider-without-repair': localText('移除 Provider（仅影响预览）', 'remove provider (impact preview only)'),
    'set-enabled': localText('启用条目', 'enable entry'),
    'set-disabled': localText('禁用条目', 'disable entry'),
  })[mode] ?? mode
}

function composerDraftSummary(operation) {
  const actionId = typeof operation?.actionId === 'string' ? operation.actionId : ''
  if (actionId.startsWith('mcp-http-add:')) {
    const match = /^mcp-http-add:([^:]+):/u.exec(actionId)
    let serverName = typeof operation.service === 'string'
      ? operation.service.replace(/^mcp-/u, '')
      : localText('所选服务', 'selected service')
    try {
      if (match?.[1]) serverName = decodeURIComponent(match[1])
    } catch {
      // The server already validated the action id; fall back to the entry id.
    }
    return localText(
      `连接 MCP 工具服务 ${serverName}；工具调用将与外部 HTTP 服务交换数据`,
      `Connect MCP tool server ${serverName}; tool calls will exchange data with the external HTTP endpoint`,
    )
  }
  if (actionId.startsWith('scalar-disabled:')) {
    const intent = operation.expandedIntents?.[0]
    const encoded = /^scalar-disabled:(true|false):(.+)$/u.exec(actionId)
    let entryId = intent?.entryId
    try {
      if (!entryId && encoded?.[2]) entryId = decodeURIComponent(encoded[2])
    } catch {
      // The server validated the action id; use the safe generic summary below.
    }
    const sessionAid = sessionAidPresentation(entryId)
    const disabled = intent ? Boolean(intent.value) : encoded?.[1] === 'true'
    if (sessionAid) return disabled ? sessionAid.disableSummary : sessionAid.enableSummary
    if (entryId) return disabled
      ? localText(`关闭 ${entryId}`, `Turn off ${entryId}`)
      : localText(`启用 ${entryId}`, `Turn on ${entryId}`)
  }
  if (state.locale !== 'zh') {
    return ({
      'fs-sandbox-to-local': 'Switch file access to the local filesystem',
      'fs-local-to-sandbox': 'Switch file access to the sandbox filesystem',
      'fs-provider-reset-official-default': 'Remove the generated filesystem override and restore the official default',
      'directory-picker-pin-browse': 'Pin directory picking to the in-app Host + Web UI browser capsule',
      'directory-picker-reset-auto': 'Remove the browser capsule and restore official adaptive directory picking',
      'time-context-add': 'Give the Agent the current time, browser time zone, and elapsed session time',
      'time-context-remove': 'Stop providing current and elapsed time to the Agent',
      'schedule-add': 'Let the Agent set delayed, scheduled, or recurring reminders in this conversation',
      'schedule-remove': 'Stop creating new conversation reminders while keeping existing records',
      'fs-provider-remove': 'Remove the current filesystem provider and inspect the lost ctx.fs connections',
      'fs-provider-remove-with-sandbox': 'Remove the current filesystem provider and let the sandbox provider take over ctx.fs',
      'subprocess-provider-remove': 'Inspect removal of the only command-execution Provider; no safe replacement is currently composed',
      'web-startup-disable': 'Turn off Web access and check which components depend on it',
      'web-startup-disable-with-consumers': 'Turn off Web access and the three affected components',
    })[actionId] ?? operation.summary ?? 'Pending change'
  }
  if (actionId.startsWith('scalar-disabled:')) {
    const intent = operation.expandedIntents?.[0]
    return intent
      ? `将 ${intent.entryId}.disabled 设为 ${readable(intent.value)}`
      : operation.summary ?? '待应用修改'
  }
  return ({
    'fs-sandbox-to-local': '将文件访问切换到本机文件系统',
    'fs-local-to-sandbox': '将文件访问切换到沙箱文件系统',
    'fs-provider-reset-official-default': '移除精确生成的 fs 覆盖并恢复官方默认',
    'directory-picker-pin-browse': '固定为应用内目录浏览器 Host + Web UI 插件组',
    'directory-picker-reset-auto': '移除浏览插件组并恢复官方自适应目录选择',
    'time-context-add': '让 Agent 获得当前时间、浏览器时区和会话经过时间',
    'time-context-remove': '停止向 Agent 提供当前时间和会话经过时间',
    'schedule-add': '让 Agent 在当前会话中设置稍后、指定时间或周期提醒',
    'schedule-remove': '停止创建新的会话提醒（已有记录保留）',
    'fs-provider-remove': '移除当前文件系统 Provider，并先查看会断开的 ctx.fs 连接',
    'fs-provider-remove-with-sandbox': '移除当前文件系统 Provider，并让沙箱 Provider 接管 ctx.fs',
    'subprocess-provider-remove': '检查移除唯一命令执行 Provider 的影响；当前没有可安全接管的替代项',
    'web-startup-disable': '关闭网页访问，并检查谁依赖它',
    'web-startup-disable-with-consumers': '关闭网页访问，并同时关闭 3 个受影响的组件',
  })[actionId] ?? operation.summary ?? '待应用修改'
}

function composerAttemptedOutcome(actionId) {
  if (typeof actionId !== 'string') return localText('所选修改', 'the selected change')
  const scalarMatch = /^scalar-disabled:(true|false):(.+)$/u.exec(actionId)
  if (scalarMatch?.[2]) {
    try {
      const entryId = decodeURIComponent(scalarMatch[2])
      const sessionAid = sessionAidPresentation(entryId)
      if (sessionAid) return scalarMatch[1] === 'true' ? sessionAid.disableSummary : sessionAid.enableSummary
      const node = state.inspection?.nodes.find(candidate => candidate.attributes?.entryId === entryId)
      const label = node ? friendlyNodeLabel(node) : localText('所选组件', 'the selected component')
      return scalarMatch[1] === 'true'
        ? localText(`关闭${label}`, `Turn off ${label}`)
        : localText(`启用${label}`, `Turn on ${label}`)
    } catch {
      return localText('所选修改', 'the selected change')
    }
  }
  return composerDraftSummary({
    actionId,
    service: 'selected-change',
    summary: localText('所选修改', 'the selected change'),
    expandedIntents: [],
  })
}

function isComposerDraftConflict(value) {
  return value?.code === 'COMPOSER_DRAFT_CONFLICT'
    && ['already-pending', 'resolve-first', 'cannot-combine', 'tray-full'].includes(value.reason)
    && typeof value.attemptedActionId === 'string'
    && Array.isArray(value.conflictingActionIds)
    && Array.isArray(value.repairIds)
    && value.writePerformed === false
}

function isComposerDraftStale(value) {
  return value?.code === 'COMPOSER_DRAFT_STALE'
    && value.reason === 'source-changed'
    && ['replanned', 'replan-failed'].includes(value.recovery)
    && value.writePerformed === false
}

function isComposerDraftStaleResponse(value) {
  if (!isComposerDraftStale(value?.error)
    || !value.draft
    || typeof value.draft.draftId !== 'string'
    || !Array.isArray(value.draft.operations)
    || !value.draft.operations.every(operation => typeof operation?.actionId === 'string')
    || (value.inspection !== undefined && !Array.isArray(value.inspection?.nodes))) return false
  return value.error.recovery === 'replanned'
    ? value.draft.state === 'validated'
      && value.draft.canApply === true
      && typeof value.draft.summary === 'string'
      && Array.isArray(value.inspection?.nodes)
    : value.draft.state === 'stale' && value.draft.canApply === false
}

function unavailableInspection(context = state.harnessContext) {
  const selectedProfile = context?.profiles?.find(profile => profile.selected)
  return {
    generatedAt: new Date().toISOString(),
    installation: {
      version: context?.installation?.version ?? '',
      ...(context?.installation?.commit ? { commit: context.installation.commit } : {}),
    },
    profile: {
      name: context?.selectedProfile ?? '',
      directory: selectedProfile?.directory ?? '',
    },
    authoring: { state: 'read-only', reason: 'profile-patch-unavailable' },
    layers: [],
    counts: { nodes: 0, edges: 0, declared: 0, resolved: 0, observed: 0 },
    nodes: [],
    edges: [],
    services: [],
    pluginActions: [],
    componentCatalog: [],
    executionWorlds: [],
    diagnostics: [],
  }
}

function installAuthoritativeInspection(inspection) {
  state.inspection = inspection
  state.inspectionUnavailable = false
  state.nodesById = new Map(inspection.nodes.map(node => [node.id, node]))
}

function markInspectionUnavailable() {
  state.inspection = unavailableInspection()
  state.inspectionUnavailable = true
  state.nodesById = new Map()
  state.selectedServiceId = undefined
  state.selectedNodeId = undefined
}

function installComposerStaleResponse(result) {
  if (result.inspection) installAuthoritativeInspection(result.inspection)
  else markInspectionUnavailable()
  state.detailSource = 'source'
  state.composerDraft = result.draft
  state.composerDraftError = undefined
  state.composerDraftConflict = undefined
  state.composerDraftNotice = undefined
  state.composerDraftApplySuccess = undefined
  state.composerDraftStale = result.error
  if (!state.inspectionUnavailable) {
    state.selectedNodeId = state.nodesById.has(state.selectedNodeId)
      ? state.selectedNodeId
      : state.inspection.nodes.find(node => node.plane === 'resolved')?.id
  }
  renderAll()
}

function composerConflictCopy(conflict) {
  const attempted = composerAttemptedOutcome(conflict.attemptedActionId)
  return ({
    'already-pending': localText(
      `“${attempted}”已在待应用修改中。先复核或移除现有项，再继续设计。`,
      `“${attempted}” is already pending. Review or remove the existing item before continuing.`,
    ),
    'resolve-first': conflict.repairIds.length > 0
      ? localText(
          `当前修改仍有依赖需要处理，暂时不能加入“${attempted}”。先解决依赖或移除阻塞项。`,
          `The current change still has an unresolved dependency, so “${attempted}” cannot be added yet. Repair or remove the blocked item first.`,
        )
      : localText(
          `当前修改会断开必要能力，且没有可安全自动选择的替代项，暂时不能加入“${attempted}”。`,
          `The current change disconnects a required capability and has no safe automatic replacement, so “${attempted}” cannot be added yet.`,
        ),
    'cannot-combine': localText(
      `“${attempted}”不能与当前修改安全合并。先应用、移除或清除当前修改，再单独预览它。`,
      `“${attempted}” cannot be safely combined with the current change. Apply, remove, or clear the current change before previewing it separately.`,
    ),
    'tray-full': localText(
      `待应用修改一次最多容纳两项，因此尚未加入“${attempted}”。先移除一项或完成当前修改。`,
      `Pending changes can hold at most two items, so “${attempted}” was not added. Remove one item or finish the current changes first.`,
    ),
  })[conflict.reason] ?? localText(
    '这项修改目前不能加入，现有待应用修改已完整保留。',
    'This change cannot be added right now. The existing pending changes were preserved.',
  )
}

function composerDraftDiagnostic(diagnostic, operation) {
  if (state.locale === 'zh' && diagnostic.code === 'MISSING_REQUIRED_SERVICE') {
    if (operation?.service === 'fs') {
      return '直接移除当前文件系统 Provider 会让 ctx.fs 没有可用提供者；文件工具和文本编辑仍声明需要这个接口。'
    }
    if (operation?.service === 'subprocess') {
      return '直接移除当前命令执行 Provider 会让 ctx.subprocess 没有可用提供者；命令组件和文件搜索仍声明需要它，且当前没有安全的自动修复。'
    }
    return '关闭网页访问会移除它唯一的能力提供者；Web 服务和网页运行环境仍然依赖它。'
  }
  return diagnostic.message
}

function draftActionButton(label, action, disabled, className = '') {
  const button = element('button', className, label)
  button.type = 'button'
  button.disabled = disabled
  button.addEventListener('click', action)
  return button
}

function draftIconButton(iconName, label, action, disabled) {
  const button = element('button')
  button.type = 'button'
  button.disabled = disabled
  button.title = label
  button.setAttribute('aria-label', label)
  button.append(element('i', `ph ${iconName}`))
  button.addEventListener('click', action)
  return button
}

function focusComposerReview() {
  const rail = byId('composerDraftRail')
  const next = rail?.querySelector('.composer-draft-repair:not(:disabled), .composer-draft-apply:not(:disabled), .composer-draft-message')
    ?? rail
  if (!next) return
  if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1')
  next.focus({ preventScroll: true })
}

function focusComposerConflict() {
  const conflict = byId('composerDraftRail')?.querySelector('.composer-draft-conflict')
  if (!conflict) return
  conflict.focus({ preventScroll: true })
}

function focusComposerStale() {
  const stale = byId('composerDraftRail')?.querySelector('.composer-draft-stale')
  if (!stale) return
  stale.focus({ preventScroll: true })
}

function focusExistingComposerOperations() {
  const review = byId('composerDraftRail')?.querySelector('.composer-operation-review')
  if (!review) return
  review.setAttribute('tabindex', '-1')
  review.focus({ preventScroll: true })
}

function renderComposerConflict(conflict, operations, busy) {
  const authoringReadOnly = profileAuthoringIsReadOnly()
  const alert = element('section', 'composer-draft-conflict')
  alert.setAttribute('role', 'alert')
  alert.setAttribute('tabindex', '-1')
  const heading = element('div', 'composer-draft-conflict-heading')
  heading.append(element('i', 'ph ph-warning-circle'))
  const copy = element('div')
  copy.append(element('strong', '', localText('这项修改尚未加入', 'This change was not added')))
  copy.append(element('p', '', composerConflictCopy(conflict)))
  heading.append(copy)
  alert.append(heading)

  const actions = element('div', 'composer-draft-conflict-actions')
  actions.append(draftActionButton(
    localText('复核现有修改', 'Review existing'),
    focusExistingComposerOperations,
    busy,
  ))
  const supportedRepairId = conflict.repairIds.find(repairId =>
    repairId === 'disable-consumers:webStartup' || repairId === 'switch-provider:fs:fs-sandbox')
  if (supportedRepairId) {
    const repair = draftActionButton(
      localText('解决依赖', 'Repair dependency'),
      () => void updateComposerDraft('repair', undefined, supportedRepairId),
      busy || authoringReadOnly,
      'composer-conflict-primary',
    )
    if (authoringReadOnly) makeProfileAuthoringActionReadOnly(repair)
    actions.append(repair)
  }
  const conflictingOperation = conflict.conflictingActionIds
    .map(actionId => operations.find(operation => operation.actionId === actionId))
    .find(Boolean)
  if (conflictingOperation) {
    const summary = composerDraftSummary(conflictingOperation)
    const remove = draftActionButton(
      localText('移除现有项', 'Remove existing'),
      () => void updateComposerDraft('remove', conflictingOperation.actionId),
      busy || authoringReadOnly,
    )
    remove.title = authoringReadOnly
      ? profileAuthoringReadOnlyText()
      : localText(`移除：${summary}`, `Remove: ${summary}`)
    remove.setAttribute('aria-label', remove.title)
    actions.append(remove)
  }
  const clear = draftActionButton(
    localText('清除全部', 'Clear all'),
    () => void updateComposerDraft('clear'),
    busy || authoringReadOnly,
  )
  if (authoringReadOnly) makeProfileAuthoringActionReadOnly(clear)
  actions.append(clear)
  alert.append(actions)
  return alert
}

function renderComposerStale(stale, operations, busy) {
  const authoringReadOnly = profileAuthoringIsReadOnly()
  const replanned = stale.recovery === 'replanned'
  const intentCleared = !replanned && operations.length === 0
  const alert = element('section', `composer-draft-stale ${replanned ? 'replanned' : 'replan-failed'}`)
  alert.setAttribute('role', 'alert')
  alert.setAttribute('tabindex', '-1')

  const heading = element('div', 'composer-draft-stale-heading')
  heading.append(element('i', replanned ? 'ph ph-arrows-clockwise' : 'ph ph-warning-circle'))
  const copy = element('div')
  copy.append(element('strong', '', replanned
    ? localText('检测到外部修改，预览已更新', 'External change detected; preview updated')
    : intentCleared
      ? localText('待应用修改已清除，当前 Harness 仍需重新读取', 'Pending changes cleared; the current Harness still needs reloading')
      : localText('检测到外部修改，旧预览已失效', 'External change detected; previous preview expired')))
  copy.append(element('p', '', replanned
    ? localText(
        '外部修改已保留。官方 DSH 已重新读取并验证这组待应用修改；它们尚未应用。请重新复核预览，然后再次点击“应用修改”。',
        'The external change was preserved. Official DSH reread and revalidated these pending changes; they have not been applied. Review the refreshed preview, then select “Apply changes” again.',
      )
    : intentCleared
      ? localText(
          '待应用意图已经清除，但官方 DSH 仍无法读取当前源。旧图谱不会作为当前事实显示；请先修复外部配置，再重新读取 Harness。',
          'The pending intent was cleared, but official DSH still cannot read the current source. The previous graph is not shown as current fact; fix the external config, then reload the Harness.',
        )
      : localText(
        '外部修改已保留，旧候选预览已经失效，且这组修改无法基于最新配置重新验证。尚未写入任何待应用修改；请移除一项后重试，或安全地清除全部。',
        'The external change was preserved, the previous candidate preview is no longer valid, and these changes could not be revalidated against the latest config. No pending change was written; remove an item and try again, or safely clear all.',
      )))
  heading.append(copy)
  alert.append(heading)

  if (!replanned && operations.length > 0) {
    const list = element('ol', 'composer-draft-stale-list')
    operations.forEach(operation => {
      list.append(element('li', '', composerDraftSummary(operation)))
    })
    alert.append(list)
  }

  if (!replanned && state.composerDraftError) {
    alert.append(element('p', 'composer-draft-stale-error', localText(
      '该项无法移除；恢复意图与外部配置保持不变。',
      'This item could not be removed; the recovery intent and external config remain unchanged.',
    )))
  }

  const actions = element('div', 'composer-draft-stale-actions')
  if (replanned) {
    actions.append(draftActionButton(
      localText('复核更新后的预览', 'Review refreshed preview'),
      focusExistingComposerOperations,
      busy,
    ))
  } else {
    operations.forEach((operation, index) => {
      const summary = composerDraftSummary(operation)
      const remove = draftActionButton(
        localText(`移除第 ${index + 1} 项`, `Remove item ${index + 1}`),
        () => void updateComposerDraft('remove', operation.actionId),
        busy || authoringReadOnly,
      )
      remove.title = authoringReadOnly
        ? profileAuthoringReadOnlyText()
        : localText(`移除：${summary}`, `Remove: ${summary}`)
      remove.setAttribute('aria-label', remove.title)
      actions.append(remove)
    })
    const clear = draftActionButton(
      intentCleared ? localText('重新读取 Harness', 'Reload Harness') : localText('清除全部', 'Clear all'),
      () => void updateComposerDraft('clear'),
      busy || authoringReadOnly,
    )
    if (authoringReadOnly) makeProfileAuthoringActionReadOnly(clear)
    actions.append(clear)
  }
  alert.append(actions)
  return alert
}

function focusComposerCompletion() {
  const completion = byId('composerDraftRail')?.querySelector('.composer-apply-success')
  if (!completion) return
  completion.setAttribute('tabindex', '-1')
  completion.focus({ preventScroll: true })
}

function renderComposerGuide() {
  const operations = Array.isArray(state.composerDraft?.operations) ? state.composerDraft.operations : []
  const step = state.composerDraftApplySuccess
    ? 3
    : operations.length === 0 && !state.composerDraftLoading
      ? 1
      : state.composerDraft?.state === 'validated' && state.composerDraft?.canApply
        ? 3
        : 2
  byId('composerGuide')?.querySelectorAll('[data-guide-step]').forEach(item => {
    const itemStep = Number(item.dataset.guideStep)
    item.classList.toggle('active', itemStep === step)
    item.classList.toggle('complete', itemStep < step || (state.composerDraftApplySuccess && itemStep === 3))
  })
}

function renderComposerDraft() {
  renderComposerGuide()
  const rail = byId('composerDraftRail')
  const draft = state.composerDraft
  const operations = Array.isArray(draft?.operations) ? draft.operations : []
  const busy = state.composerDraftLoading || state.composerDraftApplyLoading
  const authoringReadOnly = profileAuthoringIsReadOnly()
  if (state.composerDraftApplySuccess && operations.length === 0 && !busy) {
    rail.hidden = false
    const success = element('div', 'composer-apply-success')
    success.append(element('i', 'ph ph-check-circle'))
    const copy = element('div')
    copy.append(element('strong', '', localText('修改已完成', 'Change complete')))
    copy.append(element('p', '', localText(
      '已写入所选配置，并从官方 DSH 重新载入。现在可以继续选择下一项修改。',
      'The selected config was updated and reloaded from official DSH. You can choose another change now.',
    )))
    success.append(copy)
    replaceChildren(rail, [success])
    return
  }
  const show = state.composerDraftLoading
    || state.composerDraftApplyLoading
    || state.composerDraftError
    || state.composerDraftConflict
    || state.composerDraftStale
    || state.composerDraftApplySuccess
    || operations.length > 0
    || draft?.canRedo
  rail.hidden = false
  if (!show) {
    const empty = element('div', 'composer-draft-empty')
    const icon = element('div', 'composer-draft-empty-icon')
    icon.append(element('i', 'ph ph-cursor-click'))
    empty.append(icon)
    empty.append(element('h3', '', localText('还没有修改', 'No changes yet')))
    empty.append(element('p', '', localText(
      '从画布或下方能力库选择一项修改。GraphControl 会先展示影响，确认前不会写入 DSH 配置。',
      'Choose a change from the canvas or capability shelf. GraphControl shows the impact before anything is written to DSH.',
    )))
    const actions = element('div', 'review-empty-actions')
    actions.append(
      draftActionButton(localText('清除', 'Clear'), () => {}, true),
      draftActionButton(localText('预览修改', 'Preview change'), () => {}, true),
    )
    empty.append(actions)
    replaceChildren(rail, [empty])
    return
  }

  if (state.composerDraftStale?.recovery === 'replan-failed' && draft?.state === 'stale') {
    replaceChildren(rail, [renderComposerStale(state.composerDraftStale, operations, busy)])
    return
  }

  if (operations.length === 0 && draft?.canRedo && !busy) {
    const recovery = element('div', 'composer-draft-empty composer-draft-recovery')
    const icon = element('div', 'composer-draft-empty-icon')
    icon.append(element('i', 'ph ph-arrow-u-up-left'))
    recovery.append(icon)
    recovery.append(element('h3', '', state.composerDraftNotice === 'removed-empty'
      ? localText('修改已从待应用列表移除', 'Pending change removed')
      : localText('上一步已撤销', 'Last change undone')))
    recovery.append(element('p', '', localText(
      'DSH 配置没有改变。可以重做恢复这项修改，也可以继续选择其他能力。',
      'The DSH config is unchanged. Redo to restore this change, or choose another capability.',
    )))
    const actions = element('div', 'review-empty-actions')
    const clear = draftActionButton(localText('清除', 'Clear'), () => void updateComposerDraft('clear'), authoringReadOnly)
    const redo = draftActionButton(localText('重做', 'Redo'), () => void updateComposerDraft('redo'), authoringReadOnly)
    if (authoringReadOnly) {
      makeProfileAuthoringActionReadOnly(clear)
      makeProfileAuthoringActionReadOnly(redo)
    }
    actions.append(clear, redo)
    recovery.append(actions)
    replaceChildren(rail, [recovery])
    return
  }

  const primaryOperation = operations[0]
  const fsReplacement = operations.find(operation => operation.actionId === 'fs-sandbox-to-local')
  const fsReset = operations.find(operation => operation.actionId === 'fs-local-to-sandbox')
  const fsProviderRemoval = operations.find(operation =>
    operation.actionId === 'fs-provider-remove'
      || operation.actionId === 'fs-provider-remove-with-sandbox')
  const fsProviderRemovalBlocked = fsProviderRemoval?.actionId === 'fs-provider-remove'
  const subprocessProviderRemoval = operations.find(operation =>
    operation.actionId === 'subprocess-provider-remove')
  const subprocessProviderRemovalBlocked = Boolean(subprocessProviderRemoval)
  const providerRemovalBlocked = fsProviderRemovalBlocked || subprocessProviderRemovalBlocked
  const pickerPin = operations.find(operation => operation.actionId === 'directory-picker-pin-browse')
  const pickerReset = operations.find(operation => operation.actionId === 'directory-picker-reset-auto')
  const sessionAidIntent = operations
    .flatMap(operation => operation.expandedIntents ?? [])
    .find(intent => sessionAidPresentation(intent.entryId))
  const sessionAid = sessionAidPresentation(sessionAidIntent?.entryId)
  const dependencyDisable = operations.find(operation =>
    operation.actionId === 'web-startup-disable'
      || operation.actionId === 'web-startup-disable-with-consumers')

  const hero = element('section', 'composer-draft-hero')
  const heroIcon = element('div', 'composer-draft-hero-icon')
  heroIcon.append(element('i', providerRemovalBlocked ? 'ph ph-plugs-connected' : 'ph ph-arrows-left-right'))
  const heroCopy = element('div', 'composer-draft-hero-copy')
  heroCopy.append(element('strong', '', primaryOperation
    ? composerDraftSummary(primaryOperation)
    : localText('待确认的修改', 'Pending change')))
  if (operations.length > 1) heroCopy.append(element('span', '', localText(
    `另有 ${operations.length - 1} 项关联修改`,
    `${operations.length - 1} more related change${operations.length === 2 ? '' : 's'}`,
  )))
  hero.append(heroIcon, heroCopy)
  if (fsReplacement) hero.append(element('span', 'composer-draft-risk-badge', localText('风险：较高', 'Risk: elevated')))
  if (pickerPin) hero.append(element('span', 'composer-draft-risk-badge', localText('权限变化：需复核', 'Permission change: review')))
  if (fsProviderRemovalBlocked) hero.append(element('span', 'composer-draft-risk-badge', localText('ctx.fs 将断开', 'ctx.fs disconnects')))
  if (subprocessProviderRemovalBlocked) hero.append(element('span', 'composer-draft-risk-badge', localText('ctx.subprocess 将断开', 'ctx.subprocess disconnects')))

  const outcome = element('section', 'composer-review-section composer-review-outcome')
  outcome.append(element('h3', '', localText('它会做什么', 'What it does')))
  outcome.append(element('p', '', fsReplacement
    ? localText('文件访问将读取和写入您本机上的文件。', 'File access will read and write files on this computer.')
    : subprocessProviderRemovalBlocked
      ? localText(
          '如果移除，本机命令执行将不再提供 ctx.subprocess；命令组件和文件搜索会失去所需接口。当前只允许查看影响，不能应用。',
          'If removed, local command execution stops providing ctx.subprocess and the command components plus file search lose their required contract. This is an impact preview only and cannot be applied.',
        )
    : fsProviderRemovalBlocked
      ? localText(
          '如果直接移除，本机文件系统不再提供 ctx.fs，文件工具和文本编辑将失去所需接口；当前状态不能应用。',
          'If removed directly, the local filesystem stops providing ctx.fs and File tools plus Text editor lose their required contract; this state cannot be applied.',
        )
      : fsProviderRemoval
        ? localText(
            '本机文件系统退出当前连接，现有沙箱文件系统接管同一个 ctx.fs 接口。',
            'The local filesystem leaves the active connection and the existing sandbox filesystem takes over the same ctx.fs contract.',
          )
    : fsReset
      ? localText('文件访问将回到受限的沙箱路径。', 'File access will return to a constrained sandbox path.')
      : pickerPin
        ? localText(
            '目录选择将固定在 DSH 应用内完成；Host 后端与 Web UI 会作为不可拆分的一组加入。',
            'Directory picking will happen inside the DSH app; its Host backend and Web UI are added as one inseparable capsule.',
          )
        : pickerReset
          ? localText(
              '固定的 Host + Web UI 浏览组件组将被移除，启动时重新由官方 DSH 选择原生或应用内交互。',
              'The pinned Host + Web UI browser capsule is removed and official DSH again chooses native or in-app interaction at startup.',
            )
          : primaryOperation
            ? composerDraftSummary(primaryOperation)
            : localText('选择一项能力后，这里会说明用户可见的结果。', 'Choose a capability to see the user-visible outcome.')))

  const evidence = element('section', 'composer-draft-evidence')
  const proofNeedsAttention = draft?.state === 'blocked' || draft?.state === 'stale'
  const proof = element('div', `composer-draft-proof${proofNeedsAttention ? ' blocked' : ''}`)
  proof.append(element('i', proofNeedsAttention ? 'ph ph-warning-circle' : 'ph ph-seal-check'))
  proof.append(element('span', '', state.composerDraftLoading
    ? localText('正在由官方 DSH 组合验证…', 'Validating the composition with official DSH…')
    : draft?.state === 'validated'
      ? localText('官方 DSH 已确认：这组修改可以生效', 'Official DSH confirms these changes can work')
      : draft?.state === 'blocked'
        ? subprocessProviderRemovalBlocked
          ? localText('没有可证明安全的替代项 · 仅显示影响', 'No provably safe replacement · impact preview only')
          : localText('还缺少依赖项 · 选择同时处理后继续', 'Dependencies still need attention · choose how to handle them')
      : draft?.state === 'stale'
        ? localText('旧候选已失效 · 必须移除或清除', 'Previous candidate expired · remove or clear it')
      : localText('等待官方 DSH 确认', 'Waiting for official DSH confirmation')))
  evidence.append(proof)
  if (fsReplacement) {
    const risk = element('div', 'composer-risk')
    risk.append(element('i', 'ph ph-warning'))
    risk.append(element('span', '', localText(
      '本机文件系统权限更高，可能访问工作区之外的文件。请确认这个 Harness 可以获得该权限。',
      'The local filesystem has broader access and may reach files outside the workspace. Confirm that this Harness should have that permission.',
    )))
    evidence.append(risk)
  }
  if (pickerPin) {
    const risk = element('div', 'composer-risk')
    risk.append(element('i', 'ph ph-shield-warning'))
    risk.append(element('span', '', localText(
      '受信任的 DSH Web 界面将可列出主机目录并创建子目录；它沿用现有浏览器信任边界，不会复制凭据，也不会打开系统选择器。',
      'The trusted DSH Web interface can list host directories and create child directories. It uses the existing browser trust boundary, does not copy credentials, and does not open an operating-system picker.',
    )))
    evidence.append(risk)
  }

  operations.forEach(operation => {
    if (operation.mode !== 'disable'
      && operation.mode !== 'disable-with-repair'
      && operation.mode !== 'remove-provider'
      && operation.mode !== 'remove-provider-with-repair'
      && operation.mode !== 'remove-provider-without-repair') return
    const diagnostics = operation.remainingDependencyImpact?.diagnostics
      ?? operation.dependencyImpact?.diagnostics
      ?? []
    diagnostics.forEach(diagnostic => evidence.append(element(
      'p',
      'composer-draft-diagnostic',
      composerDraftDiagnostic(diagnostic, operation),
    )))
    if (operation.mode !== 'disable' && operation.mode !== 'remove-provider') return
    const expectedRepairId = operation.mode === 'remove-provider'
      ? 'switch-provider:fs:fs-sandbox'
      : 'disable-consumers:webStartup'
    const repair = operation.dependencyImpact?.repairs?.find(candidate =>
      candidate.id === expectedRepairId && candidate.supportedByCurrentWriter)
    if (!repair) return
    const repairButton = draftActionButton(
      operation.mode === 'remove-provider'
        ? localText('改用沙箱文件系统，继续预览', 'Use the sandbox filesystem and continue')
        : localText('同时关闭 3 个依赖项，继续预览', 'Also disable 3 dependents and continue'),
      () => void updateComposerDraft('repair', undefined, repair.id),
      busy || authoringReadOnly,
      'composer-draft-repair',
    )
    repairButton.title = authoringReadOnly ? profileAuthoringReadOnlyText() : repair.explanation
    evidence.append(repairButton)
  })

  const connections = element('section', 'composer-review-section composer-review-connections')
  connections.append(element('h3', '', dependencyDisable || providerRemovalBlocked
    ? localText('将受影响的组件', 'Components affected')
    : fsProviderRemoval
      ? localText('修复后的连接', 'Connections after repair')
      : localText('现有连接', 'Existing connections')))
  connections.append(element('p', '', subprocessProviderRemovalBlocked
    ? localText(
        '当前本机 Provider 是 ctx.subprocess 的唯一活动提供者。Bash 与 PowerShell 仍由官方平台条件控制，文件搜索当前关闭；GraphControl 不会猜测条件结果，也不会把远程 Provider 当作已存在。',
        'The local Provider is the only active ctx.subprocess Provider. Bash and PowerShell remain controlled by official platform conditions, while file search is currently off; GraphControl neither guesses those results nor pretends that a remote Provider is composed.',
      )
    : fsProviderRemovalBlocked
    ? localText(
        '当前本机 Provider 是 ctx.fs 的唯一活动提供者。以下两个官方组件仍声明需要它；先选择替代 Provider 才能应用。',
        'The current local provider is the only active ctx.fs provider. These two official components still declare that contract; choose a replacement before Apply.',
      )
    : fsProviderRemoval
      ? localText(
          '沙箱 Provider 提供同一个 ctx.fs 接口，DSH 会把以下组件重新连接到它；画布连线不会另存为配置。',
          'The sandbox provider supplies the same ctx.fs contract, so DSH reconnects these components to it; canvas lines are never saved as separate configuration.',
        )
    : dependencyDisable
    ? localText(
        '官方 DSH 发现以下组件依赖网页访问。应用前必须选择如何处理它们。',
        'Official DSH found that these components depend on Web access. Choose how to handle them before applying.',
      )
    : primaryOperation?.service === 'fs'
      ? localText(
          '替换项提供同一个 ctx.fs 接口。DSH 会自动接回以下工具，不会把画布连线写入配置：',
          'The replacement provides the same ctx.fs contract. DSH reconnects these tools automatically; the drawn lines are never written as configuration:',
        )
      : primaryOperation?.service === 'directoryPicker'
        ? pickerPin
          ? localText(
              '两个官方组件会成组提供同一个 ctx.directoryPicker 接口，现有应用界面继续消费它；画布连线只是 DSH 解析结果。',
              'The two official components jointly provide the same ctx.directoryPicker contract while the existing app interface keeps consuming it; canvas lines only show DSH-resolved facts.',
            )
          : localText(
              '只移除 GraphControl 精确生成的 Host + Web UI 组件组。应用界面仍连接 ctx.directoryPicker，并在下次启动时使用官方自适应提供者。',
              'Only the exact GraphControl-generated Host + Web UI capsule is removed. The app interface remains connected to ctx.directoryPicker and uses the official adaptive provider at the next startup.',
            )
      : sessionAid?.connections
        ? sessionAid.connections
      : localText(
          '不会断开现有能力。这项改动只增加或移除所选能力。',
          'No existing capability is disconnected. This change only adds or removes the selected capability.',
        )))
  const impact = element('div', 'composer-impact-list')
  const impactedLabels = subprocessProviderRemovalBlocked
    ? [
        localText('Bash 命令 · 由平台条件控制', 'Bash command · platform-controlled'),
        localText('PowerShell 命令 · 由平台条件控制', 'PowerShell command · platform-controlled'),
        localText('文件搜索 · 当前关闭', 'File search · currently off'),
      ]
    : fsProviderRemoval
    ? [localText('文件工具', 'File tools'), localText('文本编辑', 'Text editor')]
    : dependencyDisable
    ? [
        localText('Web 服务', 'Web server'),
        localText('网页运行环境', 'Web runtime'),
        ...(dependencyDisable.actionId === 'web-startup-disable-with-consumers'
          ? [localText('浏览器连接', 'Browser connection')]
          : []),
      ]
    : primaryOperation?.service === 'fs'
      ? [localText('文件工具', 'File tools'), localText('文本编辑', 'Text editor')]
      : primaryOperation?.service === 'directoryPicker'
        ? pickerPin
          ? [
              localText('目录浏览 Host 后端', 'Directory browser Host backend'),
              localText('目录浏览 Web UI', 'Directory browser Web UI'),
              localText('应用界面继续连接', 'App interface stays connected'),
            ]
          : [
              localText('移除固定浏览组件组', 'Remove pinned browser capsule'),
              localText('恢复官方自动选择', 'Restore official adaptive choice'),
              localText('应用界面继续连接', 'App interface stays connected'),
            ]
      : []
  impactedLabels.forEach(label => {
    const item = element('div', 'composer-impact-item')
    item.append(element('i', dependencyDisable || providerRemovalBlocked ? 'ph ph-warning-circle' : 'ph ph-check-circle'))
    item.append(element('span', '', label))
    impact.append(item)
  })
  connections.append(impact)

  const effect = element('section', 'composer-review-section composer-review-effect')
  effect.append(element('h3', '', localText('生效方式', 'How it takes effect')))
  effect.append(element('p', '', subprocessProviderRemovalBlocked
    ? localText(
        '这项草稿不会写入配置，也不能点击应用。撤销或清除它即可继续设计；GraphControl 不会改写或执行平台表达式。',
        'This draft is not written and Apply remains unavailable. Undo or clear it to continue designing; GraphControl never rewrites or executes the platform expressions.',
      )
    : sessionAid
    ? sessionAid.effect
    : localText(
        '此修改尚未写入配置。点击“应用修改”后，GraphControl 才会更新所选 DSH 文件并重新载入。',
        'This change is not written yet. GraphControl updates the selected DSH file and reloads only after Apply changes.',
      )))

  const operationReview = element('section', 'composer-review-section composer-operation-review')
  operationReview.append(element('h3', '', localText('待应用的步骤', 'Pending steps')))
  const list = element('div', 'composer-draft-list')
  operations.forEach((operation, index) => {
    const item = element('div', 'composer-draft-operation')
    item.append(element('span', '', String(index + 1)))
    const copy = element('div')
    copy.append(element('strong', '', `${serviceLabel(operation.service)} · ${composerDraftModeLabel(operation.mode)}`))
    copy.append(element('small', '', composerDraftSummary(operation)))
    const expanded = Array.isArray(operation.expandedIntents) ? operation.expandedIntents : []
    expanded.forEach(intent => copy.append(element(
      'code',
      'composer-operation-intent',
      `${intent.entryId}.${intent.path.join('.')} → ${readable(intent.value)}`,
    )))
    item.append(copy)
    const removeLabel = localText('移除此项', 'Remove')
    const removeButton = element('button', 'composer-operation-remove')
    removeButton.type = 'button'
    removeButton.disabled = busy || authoringReadOnly
    removeButton.title = authoringReadOnly
      ? profileAuthoringReadOnlyText()
      : localText(
          `从待应用修改中移除：${composerDraftSummary(operation)}`,
          `Remove from pending changes: ${composerDraftSummary(operation)}`,
        )
    removeButton.setAttribute('aria-label', removeButton.title)
    removeButton.append(element('i', 'ph ph-x'))
    removeButton.append(element('span', '', removeLabel))
    removeButton.addEventListener('click', () => void updateComposerDraft('remove', operation.actionId))
    item.append(removeButton)
    list.append(item)
  })
  if (operations.length === 0) list.append(element('p', 'composer-draft-copy', localText(
    draft?.canRedo ? '上一步已撤销，可以重做。' : '还没有修改步骤。',
    draft?.canRedo ? 'The last action was undone and can be redone.' : 'There are no change steps yet.',
  )))
  operationReview.append(list)

  const diffDetails = element('details', 'composer-review-collapse composer-diff-details')
  diffDetails.append(element('summary', '', localText('精确差异', 'Exact diff')))

  const developerEvidence = element('details', 'composer-review-collapse composer-developer-evidence')
  developerEvidence.append(element('summary', '', localText('验证详情', 'Validation details')))
  if (draft?.candidate) {
    const affectedServices = draft.candidate.services
      .filter(service => operations.some(operation => operation.service === service.name))
      .map(service => `${service.name}: ${service.activeProviderEntryIds.join(', ') || availabilityLabel(service.availability)}`)
    developerEvidence.append(element('p', 'composer-draft-metrics', localText(
      `${draft.candidate.counts.nodes} 节点 · ${draft.candidate.counts.edges} 边 · ${draft.candidate.affectedEntryIds.length} 个受影响条目${affectedServices.length ? ` · ${affectedServices.join(' / ')}` : ''}`,
      `${draft.candidate.counts.nodes} nodes · ${draft.candidate.counts.edges} edges · ${draft.candidate.affectedEntryIds.length} affected entries${affectedServices.length ? ` · ${affectedServices.join(' / ')}` : ''}`,
    )))
  }
  if (Array.isArray(draft?.changes) && draft.changes.length > 0) {
    const diff = draft.changes.map(change => [
      `@@ ${change.startOffset}:${change.endOffset} @@`,
      `− ${change.beforeText || localText('（空）', '(empty)')}`,
      `+ ${change.afterText || localText('（空）', '(empty)')}`,
    ].join('\n')).join('\n')
    diffDetails.append(element('p', 'composer-draft-diff-meta', localText(
      `${draft.byteLength?.before ?? '—'} → ${draft.byteLength?.after ?? '—'} bytes`,
      `${draft.byteLength?.before ?? '—'} → ${draft.byteLength?.after ?? '—'} bytes`,
    )))
    diffDetails.append(element('pre', 'composer-draft-inline-diff', diff))
  }

  const actions = element('div', 'composer-draft-actions')
  const applyButton = draftActionButton(
    state.composerDraftApplyLoading ? localText('应用中…', 'Applying…') : localText('应用修改', 'Apply changes'),
    () => void applyComposerDraft(),
    busy || authoringReadOnly || draft?.state === 'stale' || !draft?.canApply,
    'composer-draft-apply',
  )
  if (authoringReadOnly) applyButton.title = profileAuthoringReadOnlyText()
  const undoButton = draftIconButton(
    'ph-arrow-u-up-left',
    localText('撤销', 'Undo'),
    () => void updateComposerDraft('undo'),
    busy || authoringReadOnly || !draft?.canUndo,
  )
  const redoButton = draftIconButton(
    'ph-arrow-u-up-right',
    localText('重做', 'Redo'),
    () => void updateComposerDraft('redo'),
    busy || authoringReadOnly || !draft?.canRedo,
  )
  const clearButton = draftActionButton(
    localText('清除', 'Clear'),
    () => void updateComposerDraft('clear'),
    busy || authoringReadOnly || (operations.length === 0 && !draft?.canRedo),
  )
  if (authoringReadOnly) {
    makeProfileAuthoringActionReadOnly(undoButton)
    makeProfileAuthoringActionReadOnly(redoButton)
    makeProfileAuthoringActionReadOnly(clearButton)
  }
  actions.append(undoButton, redoButton, clearButton, applyButton)
  const children = [
    hero,
    ...(state.composerDraftConflict
      ? [renderComposerConflict(state.composerDraftConflict, operations, busy)]
      : []),
    ...(state.composerDraftStale
      ? [renderComposerStale(state.composerDraftStale, operations, busy)]
      : []),
    outcome,
    evidence,
    connections,
    effect,
    operationReview,
    ...(Array.isArray(draft?.changes) && draft.changes.length > 0 ? [diffDetails] : []),
    developerEvidence,
    actions,
  ]
  if (state.composerDraftError) {
    children.push(element('p', 'composer-draft-message', state.composerDraftError))
  } else if (state.composerDraftNotice) {
    children.push(element('p', 'composer-draft-message success', state.composerDraftNotice === 'removed-revalidated'
      ? localText(
          '已移除此项；剩余修改已由官方 DSH 重新验证，配置尚未写入。',
          'Removed. Official DSH revalidated the remaining change; the config is still untouched.',
        )
      : localText(
          '已移除此项；待应用修改现在为空，DSH 配置没有改变。',
          'Removed. Pending changes are now empty and the DSH config is unchanged.',
        )))
  } else if (state.composerDraftApplySuccess) {
    children.push(element('p', 'composer-draft-message success', localText(
      '修改已应用，并已从官方 DSH 重新载入。',
      'Changes applied and reloaded from official DSH.',
    )))
  }
  replaceChildren(rail, children)
}

function executionWorldMemberButton(member) {
  const node = state.nodesById.get(member.nodeId)
  const button = element('button', `execution-world-member ${member.availability}`)
  button.type = 'button'
  button.dataset.nodeId = member.nodeId
  button.append(element('strong', '', node?.label ?? member.nodeId))
  button.append(element('span', '', `${node?.subtitle ?? member.capability} · ${availabilityLabel(member.availability)}`))
  button.addEventListener('click', () => selectNode(member.nodeId))
  return button
}

function renderWorkspaceMaterialization(materialization) {
  const section = element('section', `remote-materialization ${materialization.state}`)
  const heading = element('div', 'remote-materialization-heading')
  const title = element('div')
  title.append(element('span', 'remote-transition-title', localText('首个工作区方案', 'First workspace flow')))
  title.append(element('h4', '', localText('从 Git 提交重建远程工作区', 'Rebuild the remote workspace from a Git commit')))
  heading.append(title)
  const stateCopy = materialization.state === 'ready'
    ? localText('可复现', 'reproducible')
    : materialization.state === 'review'
      ? localText('可预览 · 有本机改动', 'preview · local changes')
      : localText('当前项目不可重建', 'current project blocked')
  heading.append(element('span', `remote-materialization-state ${materialization.state}`, stateCopy))
  section.append(heading)

  const shortCommit = materialization.localGit?.commit?.slice(0, 10)
  const firstBlocker = materialization.blockers?.[0]
  const explanation = materialization.state === 'blocked'
    ? state.locale === 'zh'
      ? gitMaterializationBlockerZh[firstBlocker?.code] ?? firstBlocker?.summary ?? '当前项目还不能生成远程检出计划。'
      : firstBlocker?.summary ?? 'The current project cannot produce a remote checkout plan yet.'
    : materialization.state === 'review'
      ? localText(
          `远端只会得到 ${shortCommit ?? '当前提交'} 的已提交文件；${materialization.exclusions.trackedChanges} 项跟踪改动和 ${materialization.exclusions.untrackedFiles} 个未跟踪文件不会过去。`,
          `The remote would receive only commit ${shortCommit ?? 'HEAD'}; ${materialization.exclusions.trackedChanges} tracked changes and ${materialization.exclusions.untrackedFiles} untracked files stay on this host.`,
        )
      : localText(
          `远端将以分离 HEAD 检出 ${shortCommit ?? '当前提交'}，位置固定为 ${materialization.remoteCwd}。`,
          `The remote would check out ${shortCommit ?? 'HEAD'} in detached-HEAD mode at ${materialization.remoteCwd}.`,
        )
  section.append(element('p', 'remote-materialization-summary', explanation))

  const facts = element('div', 'remote-materialization-facts')
  ;[
    [localText('代码来源', 'Code source'), materialization.localGit?.originUrl ?? localText('尚不可用', 'unavailable')],
    [localText('固定提交', 'Pinned commit'), shortCommit ?? localText('无', 'none')],
    [localText('远程目录', 'Remote directory'), materialization.remoteCwd],
    [localText('传输方式', 'Transfer'), localText('不上传主机文件', 'no host-file upload')],
  ].forEach(([label, value]) => {
    const fact = element('div', 'remote-materialization-fact')
    fact.append(element('span', '', label))
    fact.append(element('strong', '', value))
    facts.append(fact)
  })
  section.append(facts)

  const exclusions = element('div', 'remote-materialization-exclusions')
  exclusions.append(element('span', 'remote-transition-title', localText('这次会带走什么', 'What this flow carries')))
  ;[
    [
      localText('已提交文件', 'Committed files'),
      materialization.localGit?.commit
        ? localText(`仅 ${shortCommit} 对应的文件树`, `only the tree at ${shortCommit}`)
        : localText('没有可用提交', 'no commit is available'),
    ],
    [
      localText('本机未提交内容', 'Uncommitted host work'),
      localText(
        `${materialization.exclusions.trackedChanges} 项跟踪改动 · ${materialization.exclusions.untrackedFiles} 个未跟踪文件 · 均不包含`,
        `${materialization.exclusions.trackedChanges} tracked changes · ${materialization.exclusions.untrackedFiles} untracked files · all excluded`,
      ),
    ],
    [
      localText('忽略文件与编辑器未保存内容', 'Ignored and unsaved editor content'),
      localText('不包含', 'excluded'),
    ],
    [
      localText('主机路径与凭据', 'Host paths and credentials'),
      localText('不传输 · 不检查凭据', 'not transferred · credentials not inspected'),
    ],
  ].forEach(([label, value]) => {
    const row = element('div', 'remote-materialization-exclusion')
    row.append(element('strong', '', label))
    row.append(element('span', '', value))
    exclusions.append(row)
  })
  section.append(exclusions)

  if ((materialization.blockers?.length ?? 0) > 1) {
    const blockerList = element('div', 'remote-materialization-blockers')
    materialization.blockers.forEach(blocker => blockerList.append(element(
      'p',
      '',
      state.locale === 'zh' ? gitMaterializationBlockerZh[blocker.code] ?? blocker.summary : blocker.summary,
    )))
    section.append(blockerList)
  }

  if (materialization.planAvailable) {
    const technical = element('details', 'remote-materialization-technical')
    const summary = element('summary', '', localText('查看运行前提与未来命令', 'Review prerequisites and future commands'))
    const body = element('div', 'remote-materialization-technical-body')
    const prerequisites = element('ul')
    const prerequisiteZh = [
      '远程 E2B 镜像实际提供 git 可执行文件。',
      '沙箱允许通过 HTTPS 访问所选 origin。',
      '固定提交仍可从 origin 获取。',
    ]
    materialization.runtimePrerequisites.forEach((prerequisite, index) =>
      prerequisites.append(element('li', '', state.locale === 'zh' ? prerequisiteZh[index] ?? prerequisite : prerequisite)))
    body.append(prerequisites)
    const commands = element('div', 'remote-materialization-commands')
    materialization.commandPreview.forEach(command => commands.append(element('code', '', command.argv.join(' '))))
    body.append(commands)
    technical.append(summary, body)
    section.append(technical)
  }

  section.append(element('p', 'remote-materialization-footnote', localText(
    '这里只生成本机预览：未联系 origin、未读取凭据、未上传目录，也未向 E2B 发起请求。',
    'This is a local preview only: origin was not contacted, credentials were not read, no directory was uploaded, and no E2B request was made.',
  )))
  return section
}

function renderDeveloperDiagnostics() {
  byId('developerDiagnosticsEyebrow').textContent = localText('系统状态', 'System status')
  byId('developerDiagnosticsTitle').textContent = localText('Harness 环境与就绪情况', 'Harness environment and readiness')
  byId('developerDiagnosticsIntro').textContent = localText(
    '按需检查本机 Harness 环境，帮助定位配置与运行条件；检查不会联系网络、读取凭据或修改配置。',
    'Check the local Harness environment on demand to understand configuration and runtime readiness. The check does not contact the network, read credentials, or modify configuration.',
  )
  byId('developerProfilePathLabel').textContent = localText('配置目录', 'Profile directory')
  byId('developerDshHomeLabel').textContent = localText('DSH 数据目录', 'DSH data directory')
  byId('developerInstallationLabel').textContent = localText('官方 DSH 安装', 'Official DSH installation')
  byId('developerWorkspaceLabel').textContent = localText('工作区', 'Workspace')
  byId('developerLayerPathsTitle').textContent = localText('配置层路径', 'Configuration layer paths')
  byId('developerDetailsSummary').textContent = localText('开发者详情', 'Developer details')
  byId('developerDetailsCopy').textContent = localText(
    '配置路径、包状态与远程执行研究',
    'Configuration paths, package state, and remote-execution research',
  )

  const loadButton = byId('developerDiagnosticsLoad')
  loadButton.textContent = state.developerDiagnosticsLoading
    ? localText('正在检查…', 'Checking…')
    : state.developerDiagnostics
      ? localText('刷新系统状态', 'Refresh status')
      : localText('检查系统状态', 'Check system status')
  loadButton.disabled = state.developerDiagnosticsLoading
    || state.harnessContextLoading
    || harnessOpenBusy()
  loadButton.classList.toggle('loading', state.developerDiagnosticsLoading)

  const diagnostics = state.developerDiagnostics
  const content = byId('developerDiagnosticsContent')
  const status = byId('developerDiagnosticsStatus')
  status.classList.toggle('error', Boolean(state.developerDiagnosticsError))
  status.textContent = state.developerDiagnosticsLoading
    ? localText('正在检查本机 Harness 环境…', 'Checking the local Harness environment…')
    : state.developerDiagnosticsError
      ? localText('无法读取系统状态；Harness 仍可继续查看和使用。', 'System status could not be read; the Harness remains available.')
      : diagnostics
        ? localText('系统状态已按当前 Harness 重新检查。', 'System status was refreshed for the current Harness.')
        : localText('尚未检查；只会在你点击后读取本机状态。', 'Not checked yet; local status is read only when you request it.')

  content.hidden = diagnostics === undefined
  if (!diagnostics) {
    byId('developerProfilePath').textContent = '—'
    byId('developerDshHome').textContent = '—'
    byId('developerInstallation').textContent = '—'
    byId('developerWorkspace').textContent = '—'
    replaceChildren(byId('developerLayerPaths'), [])
    renderRemoteWorldReadiness()
    return
  }

  const context = diagnostics.context
  byId('developerProfilePath').textContent = context.profileDirectory
  byId('developerDshHome').textContent = context.dshHome
  byId('developerInstallation').textContent = context.installationRoot
  byId('developerWorkspace').textContent = context.workspace
  replaceChildren(byId('developerLayerPaths'), context.layers.map((layer, index) => {
    const item = element('li', 'developer-layer-path')
    const heading = element('div', 'developer-layer-path-heading')
    heading.append(element('strong', '', `${index + 1}. ${layer.label}`))
    heading.append(element('span', 'tag', ownerLabel(layer.owner)))
    heading.append(element(
      'span',
      `tag ${layer.writable ? 'editable' : ''}`,
      layer.exists
        ? layer.writable ? localText('存在 · 可写', 'exists · writable') : localText('存在 · 只读', 'exists · read-only')
        : localText('不存在', 'missing'),
    ))
    item.append(heading, element('code', '', layer.path))
    return item
  }))
  renderRemoteWorldReadiness()
}

async function loadDeveloperDiagnostics() {
  if (state.developerDiagnosticsLoading) return
  const requestId = state.developerDiagnosticsRequestId + 1
  state.developerDiagnosticsRequestId = requestId
  state.developerDiagnostics = undefined
  state.developerDiagnosticsError = undefined
  state.developerDiagnosticsLoading = true
  renderDeveloperDiagnostics()
  try {
    const response = await fetch(apiUrl('developer-diagnostics'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({}),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (requestId !== state.developerDiagnosticsRequestId) return
    state.developerDiagnostics = result
  } catch {
    if (requestId !== state.developerDiagnosticsRequestId) return
    state.developerDiagnosticsError = true
  } finally {
    if (requestId === state.developerDiagnosticsRequestId) {
      state.developerDiagnosticsLoading = false
      renderDeveloperDiagnostics()
    }
  }
}

function renderRemoteWorldReadiness() {
  const readiness = state.developerDiagnostics?.remoteWorldReadiness
  const container = byId('remoteWorldReadiness')
  if (!readiness) {
    container.hidden = true
    replaceChildren(container, [])
    return
  }
  container.hidden = false
  const heading = element('div', 'remote-readiness-heading')
  const title = element('div')
  title.append(element('span', 'execution-world-locality', localText('官方远程候选', 'Official remote candidate')))
  title.append(element('h3', '', localText('E2B 远程沙箱', readiness.label)))
  heading.append(title)
  const ready = readiness.state === 'packages-ready'
  const transition = readiness.webTransition
  heading.append(element(
    'span',
    `remote-readiness-state ${transition?.state === 'blocked' || !ready ? 'blocked' : 'ready'}`,
    transition?.state === 'blocked'
      ? localText('Web 路径已阻塞', 'Web path blocked')
      : ready
        ? localText('依赖包就绪', 'packages ready')
        : localText('依赖包缺失', 'packages missing'),
  ))

  const packages = element('div', 'remote-package-list')
  readiness.packages.forEach(candidate => {
    const row = element('div', `remote-package-row ${candidate.status}`)
    row.append(element('strong', '', candidate.packageName))
    row.append(element('span', '', candidate.status === 'available'
      ? localText(`已安装 · ${candidate.installedVersion}`, `available · ${candidate.installedVersion}`)
      : candidate.status === 'unresolvable'
        ? localText('已声明但无法解析', 'declared but not resolvable')
        : localText('此配置未安装', 'not installed in this profile')))
    packages.append(row)
  })

  const facts = element('div', 'remote-readiness-facts')
  facts.append(element('span', '', localText('远程工作目录', 'Remote working directory')))
  facts.append(element('strong', '', readiness.defaultCwd))
  facts.append(element('span', '', localText('沙箱生命周期', 'Sandbox lifetime')))
  facts.append(element('strong', '', localText(
    `默认 ${Math.round(readiness.defaultTimeoutMs / 60000)} 分钟；超时或释放时删除`,
    `${Math.round(readiness.defaultTimeoutMs / 60000)} minutes by default; deleted on timeout/disposal`,
  )))
  facts.append(element('span', '', localText('凭据引用', 'Credential reference')))
  facts.append(element('strong', '', localText(`${readiness.credentialReference} · 未检查`, `${readiness.credentialReference} · not inspected`)))
  facts.append(element('span', '', localText('依赖包状态', 'Package state')))
  facts.append(element('strong', '', ready
    ? localText('三个官方包均可解析', 'all three packages resolve')
    : localText('必需依赖包缺失', 'required packages missing')))

  const transitionLayout = element('div', 'remote-transition-layout')
  if (transition) {
    const participantPanel = element('div', 'remote-transition-panel')
    participantPanel.append(element('span', 'remote-transition-title', localText('Web 迁移所需改动', 'Required Web transition')))
    const participantList = element('div', 'remote-transition-list')
    transition.participants.forEach(participant => {
      const row = element('div', 'remote-transition-row')
      const participantPlane = ({
        'host-profile': localText('主机配置', 'host profile'),
        'agent-preset': localText('Agent 预设', 'agent preset'),
        workspace: localText('工作区', 'workspace'),
      })[participant.plane] ?? participant.plane.replace('-', ' ')
      row.append(element('span', 'remote-transition-meta', `${participantPlane} · ${actionLabel(participant.action)}`))
      row.append(element('strong', '', state.locale === 'zh' ? remoteParticipantZh[participant.id] ?? participant.summary : participant.summary))
      participantList.append(row)
    })
    participantPanel.append(participantList)

    const blockerPanel = element('div', 'remote-transition-panel blockers')
    blockerPanel.append(element('span', 'remote-transition-title', localText('为何尚不能应用', 'Why apply is unavailable')))
    const blockerList = element('div', 'remote-transition-list')
    transition.blockers.forEach(blocker => {
      const row = element('div', 'remote-transition-row blocker')
      const stage = blocker.stage === 'runtime' ? localText('运行时', 'runtime') : localText('组合', 'composition')
      row.append(element('span', 'remote-transition-meta', `${stage} · ${blocker.code}`))
      row.append(element('strong', '', state.locale === 'zh' ? remoteBlockerZh[blocker.code] ?? blocker.summary : blocker.summary))
      blockerList.append(row)
    })
    blockerPanel.append(blockerList)
    transitionLayout.append(participantPanel, blockerPanel)
  }

  const sessionBoundary = transition?.sessionBoundary
  const boundarySection = element('section', 'remote-session-boundary')
  if (sessionBoundary) {
    const boundaryHeading = element('div', 'remote-session-heading')
    const boundaryTitle = element('div')
    boundaryTitle.append(element('span', 'remote-transition-title', localText('DSH 当前缺失的边界', 'The missing DSH seam')))
    boundaryTitle.append(element('h4', '', localText('主机项目标识 ≠ 远程执行 cwd', 'Host project identity ≠ remote execution cwd')))
    boundaryHeading.append(boundaryTitle)
    boundaryHeading.append(element('span', 'remote-readiness-state blocked', localText('单 cwd 耦合', 'single cwd coupled')))
    boundarySection.append(boundaryHeading)
    boundarySection.append(element('p', 'remote-session-required', localText(
      'DSH 需要在 Web Session 创建和工具路由之前，将主机项目标识与远程执行 cwd 分离，才能形成安全的远程候选。',
      sessionBoundary.requiredSeam,
    )))

    const safePlan = element('div', 'remote-session-safe-plan')
    ;[
      [localText('主机项目', 'Host project'), sessionBoundary.safePlan.hostProjectIdentity === 'host-only' ? localText('仅作为主机项目标识', 'host-only project identity') : sessionBoundary.safePlan.hostProjectIdentity],
      [localText('远程 cwd', 'Remote cwd'), sessionBoundary.safePlan.remoteCwd],
      [localText('工作区同步', 'Workspace sync'), sessionBoundary.safePlan.workspaceSync === 'none' ? localText('无 · 不上传或挂载', 'none · no upload or mount') : sessionBoundary.safePlan.workspaceSync],
      [localText('主机路径传输', 'Host path transfer'), sessionBoundary.safePlan.hostPathTransferAllowed ? localText('允许', 'allowed') : localText('不允许', 'not allowed')],
      [localText('预设策略', 'Preset strategy'), sessionBoundary.safePlan.presetStrategy === 'copy-system-standard-to-user' ? localText('将内置 standard 复制为用户预设', 'copy shipped standard into a user preset') : sessionBoundary.safePlan.presetStrategy.replaceAll('-', ' ')],
    ].forEach(([label, value]) => {
      const fact = element('div', 'remote-session-safe-fact')
      fact.append(element('span', '', label))
      fact.append(element('strong', '', value))
      safePlan.append(fact)
    })
    boundarySection.append(safePlan)

    const boundaryLayout = element('div', 'remote-session-layout')
    ;[
      ['cwd', localText('当前 cwd 所有权链', 'Current cwd ownership chain')],
      ['preset', localText('远程预设要求', 'Remote preset requirement')],
    ].forEach(([area, label]) => {
      const panel = element('div', 'remote-session-panel')
      panel.append(element('span', 'remote-transition-title', label))
      const list = element('div', 'remote-session-facts')
      sessionBoundary.currentFacts.filter(fact => fact.area === area).forEach(fact => {
        const row = element('div', 'remote-session-fact')
        row.append(element('span', 'remote-transition-meta', `${ownerLabel(fact.owner)} · ${fact.id}`))
        row.append(element('strong', '', state.locale === 'zh' ? remoteFactZh[fact.id] ?? fact.summary : fact.summary))
        list.append(row)
      })
      panel.append(list)
      boundaryLayout.append(panel)
    })
    const presetChanges = element('div', 'remote-preset-changes')
    presetChanges.append(element('span', 'remote-transition-title', localText('安全的复制预设改动', 'Safe copied-preset delta')))
    sessionBoundary.safePlan.presetChanges.forEach((change, index) =>
      presetChanges.append(element('div', 'remote-preset-change', state.locale === 'zh' ? presetChangeZh[index] ?? change : change)))
    boundaryLayout.append(presetChanges)
    boundarySection.append(boundaryLayout)
  }

  const explanation = element('p', 'remote-readiness-explanation', localText(
    '官方无头 E2B POC 已证明 Provider 接缝可行，但当前 Web 将一个主机 cwd 同时用于工作区标识、持久化、Prompt 与工具路由，而 E2B 拥有另一个未同步的 Linux cwd。GraphControl 未执行安装、凭据读取、配置/预设写入、主机路径传输、远程创建或 E2B 请求。',
    'The official headless E2B POC proves the provider seam, but current Web couples one host cwd to workspace identity, persistence, prompt, and tool routing while E2B owns a separate unsynchronized Linux cwd. GraphControl performed no install, credential read, profile or preset write, host-path transfer, provisioning, or E2B request.',
  ))

  const disclosure = element('details', 'remote-transition-disclosure')
  const disclosureSummary = element('summary')
  disclosureSummary.append(element('span', '', localText(
    `查看 ${transition?.blockers.length ?? 0} 个阻塞与所需修改`,
    `Review ${transition?.blockers.length ?? 0} blockers and required changes`,
  )))
  disclosureSummary.append(element('span', 'remote-transition-summary-state', localText('安全失败关闭', 'fail closed')))
  const disclosureBody = element('div', 'remote-transition-body')
  if (transition) disclosureBody.append(transitionLayout)
  if (sessionBoundary) disclosureBody.append(boundarySection)
  disclosureBody.append(explanation)
  disclosure.append(disclosureSummary, disclosureBody)
  const materialization = readiness.workspaceMaterialization
    ? renderWorkspaceMaterialization(readiness.workspaceMaterialization)
    : undefined
  replaceChildren(container, [heading, packages, facts, ...(materialization ? [materialization] : []), disclosure])
}

function renderExecutionWorlds() {
  const worlds = state.inspection.executionWorlds ?? []
  byId('executionWorldCount').textContent = String(worlds.length)
  const grid = byId('executionWorldGrid')
  if (worlds.length === 0) {
    replaceChildren(grid, [element('p', 'empty-state', localText('当前 Harness 中没有完整的文件与命令执行环境。', 'No complete file-and-command execution environment is available in this Harness.'))])
    byId('executionWorldEvidence').textContent = localText('可在“依赖”或“组件与服务”中检查当前 Provider 连接。', 'Check the current Provider connections in Dependencies or Components & services.')
    return
  }

  const cards = worlds.map(world => {
    const card = element('article', `execution-world-card ${world.state}`)
    const heading = element('div', 'execution-world-heading')
    const title = element('div')
    title.append(element('span', 'execution-world-locality', world.locality === 'local' ? localText('本机', 'local') : localText('远程', 'remote')))
    const localizedWorldLabel = world.name === 'host-local'
      ? localText('主机本地执行', world.label)
      : world.name === 'e2b-remote'
        ? localText('E2B 远程沙箱', world.label)
        : world.label
    title.append(element('h3', '', localizedWorldLabel))
    heading.append(title)
    heading.append(element('span', `execution-world-state ${world.state}`, availabilityLabel(world.state)))
    card.append(heading)
    const localizedWorldSummary = world.name === 'host-local'
      ? localText('文件与命令工具和 GraphControl 控制台运行在同一台本机。', 'File and command tools run on the same local machine as the GraphControl console.')
      : world.name === 'e2b-remote'
        ? localText('文件与命令工具共享同一个远程沙箱环境。', 'File and command tools share the same remote sandbox environment.')
        : world.summary
    card.append(element('p', 'execution-world-summary', localizedWorldSummary))

    const members = element('div', 'execution-world-members')
    const capabilityLabels = [
      ['filesystem', localText('文件系统', 'Filesystem')],
      ['subprocess', localText('子进程', 'Subprocess')],
      ['world-owner', localText('环境控制器', 'Environment controller')],
    ]
    capabilityLabels.forEach(([capability, label]) => {
      const matching = world.members.filter(member => member.capability === capability)
      if (capability === 'world-owner' && matching.length === 0) return
      const group = element('div', 'execution-world-member-group')
      group.append(element('span', 'execution-world-capability', label))
      if (matching.length === 0) {
        group.append(element('p', 'execution-world-missing', localText('此环境中没有已启用的 Provider', 'No active Provider in this environment')))
      } else {
        matching.forEach(member => group.append(executionWorldMemberButton(member)))
      }
      members.append(group)
    })
    card.append(members)
    return card
  })
  replaceChildren(grid, cards)
  const coherent = worlds.filter(world => world.state === 'coherent').length
  const attention = worlds.length - coherent
  byId('executionWorldEvidence').textContent = localText(
    `${coherent} 个执行环境已连接 · ${attention} 个需要关注。这里只显示所选 Harness 已确认的连接。`,
    `${coherent} execution environment${coherent === 1 ? '' : 's'} connected · ${attention} need${attention === 1 ? 's' : ''} attention. Only connections confirmed by the selected Harness are shown.`,
  )
}

function filteredNodes() {
  const query = state.query.trim().toLocaleLowerCase()
  return state.inspection.nodes.filter(node => {
    if (state.plane !== 'all' && node.plane !== state.plane) return false
    if (!query) return true
    const haystack = `${node.label} ${node.subtitle} ${node.kind} ${JSON.stringify(node.attributes)}`.toLocaleLowerCase()
    return haystack.includes(query)
  })
}

function renderEntities() {
  const matches = filteredNodes()
  byId('visibleCount').textContent = String(matches.length)
  const shown = matches.slice(0, 120)
  const rows = shown.map(node => {
    const row = element('button', `entity-row${node.id === state.selectedNodeId ? ' selected' : ''}`)
    row.type = 'button'
    row.setAttribute('role', 'listitem')
    row.dataset.nodeId = node.id
    row.append(element('span', `entity-plane-dot ${node.plane}`))
    const copy = element('span', 'entity-copy')
    copy.append(element('strong', '', node.label))
    copy.append(element('span', '', node.subtitle))
    row.append(copy)
    row.append(element('span', 'kind-label', kindLabel(node.kind)))
    row.addEventListener('click', () => selectNode(node.id))
    return row
  })
  if (matches.length > shown.length) {
    rows.push(element('p', 'list-limit', localText(
      `仅显示 ${matches.length} 项中的前 ${shown.length} 项。请使用搜索继续缩小范围。`,
      `Showing the first ${shown.length} of ${matches.length}. Refine the search to narrow the view.`,
    )))
  }
  if (rows.length === 0) rows.push(element('p', 'empty-state', localText('没有匹配当前筛选的组件或服务。', 'No components or services match the current filters.')))
  replaceChildren(byId('entityList'), rows)
}

function relatedEdges(nodeId, inspection = state.inspection) {
  return inspection.edges.filter(edge => edge.from === nodeId || edge.to === nodeId)
}

function preserveStaleComposerRecovery() {
  if (state.composerDraft?.state !== 'stale') return false
  renderComposerDraft()
  focusComposerStale()
  return true
}

async function requestScalarPlan(entryId, value, repairId) {
  if (harnessContextTransitionInFlight()) return undefined
  if (preserveStaleComposerRecovery()) return undefined
  if (profileAuthoringIsReadOnly()) {
    state.planError = profileAuthoringReadOnlyText()
    renderDetails()
    return undefined
  }
  const previousPlan = {
    entryId: state.planEntryId,
    value: state.planValue,
    result: state.planResult,
    applySuccess: state.applySuccess,
  }
  state.planEntryId = entryId
  state.planValue = value
  state.planResult = undefined
  state.planError = undefined
  state.planLoading = true
  state.applySuccess = undefined
  renderHarnessContext()
  renderDetails()
  try {
    const response = await fetch(apiUrl('plan-scalar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ entryId, value, ...(repairId ? { repairId } : {}) }),
    })
    const result = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isProfileAuthoringReadOnly(result.error)) {
        installProfileAuthoringReadOnly(result.error)
        throw new Error(profileAuthoringReadOnlyText(result.error))
      }
      throw new Error(typeof result.error === 'string'
        ? result.error
        : `Local planner returned HTTP ${response.status}`)
    }
    state.composerDraft = { state: 'empty', operations: [], canApply: false, canUndo: false, canRedo: false, maxActions: 2 }
    state.composerDraftError = undefined
    state.composerDraftConflict = undefined
    state.composerDraftStale = undefined
    state.composerDraftNotice = undefined
    state.composerDraftApplySuccess = undefined
    state.providerPlanId = undefined
    state.providerPlanResult = undefined
    state.providerPlanError = undefined
    state.providerApplySuccess = undefined
    state.planResult = result
    renderComposer()
    return result
  } catch (error) {
    state.planEntryId = previousPlan.entryId
    state.planValue = previousPlan.value
    state.planResult = previousPlan.result
    state.applySuccess = previousPlan.applySuccess
    state.planError = error instanceof Error ? error.message : String(error)
    return undefined
  } finally {
    state.planLoading = false
    renderDetails()
    renderHarnessContext()
  }
}

async function requestProviderReplacementPlan(replacementId) {
  if (harnessContextTransitionInFlight()) return undefined
  if (preserveStaleComposerRecovery()) return undefined
  if (profileAuthoringIsReadOnly()) {
    state.providerPlanError = profileAuthoringReadOnlyText()
    renderDetails()
    return undefined
  }
  const previousPlan = {
    id: state.providerPlanId,
    result: state.providerPlanResult,
    applySuccess: state.providerApplySuccess,
  }
  state.providerPlanId = replacementId
  state.providerPlanResult = undefined
  state.providerPlanError = undefined
  state.providerPlanLoading = true
  state.providerApplySuccess = undefined
  renderHarnessContext()
  renderDetails()
  try {
    const response = await fetch(apiUrl('plan-provider-replacement'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ replacementId }),
    })
    const result = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isProfileAuthoringReadOnly(result.error)) {
        installProfileAuthoringReadOnly(result.error)
        throw new Error(profileAuthoringReadOnlyText(result.error))
      }
      throw new Error(typeof result.error === 'string'
        ? result.error
        : `Local provider planner returned HTTP ${response.status}`)
    }
    state.composerDraft = { state: 'empty', operations: [], canApply: false, canUndo: false, canRedo: false, maxActions: 2 }
    state.composerDraftError = undefined
    state.composerDraftConflict = undefined
    state.composerDraftStale = undefined
    state.composerDraftNotice = undefined
    state.composerDraftApplySuccess = undefined
    state.planEntryId = undefined
    state.planValue = undefined
    state.planResult = undefined
    state.planError = undefined
    state.applySuccess = undefined
    state.providerPlanResult = result
    renderComposer()
    return result
  } catch (error) {
    state.providerPlanId = previousPlan.id
    state.providerPlanResult = previousPlan.result
    state.providerApplySuccess = previousPlan.applySuccess
    state.providerPlanError = error instanceof Error ? error.message : String(error)
    return undefined
  } finally {
    state.providerPlanLoading = false
    renderDetails()
    renderHarnessContext()
  }
}

async function updateComposerDraft(action, actionId, repairId) {
  if (harnessContextTransitionInFlight()) return undefined
  if (profileAuthoringIsReadOnly()) {
    state.composerDraftError = profileAuthoringReadOnlyText()
    renderComposerDraft()
    return undefined
  }
  state.composerDraftError = undefined
  state.composerDraftConflict = undefined
  state.composerDraftNotice = undefined
  state.composerDraftApplySuccess = undefined
  state.composerDraftLoading = true
  renderHarnessContext()
  renderComposerDraft()
  try {
    const response = await fetch(apiUrl('composer-draft'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        action,
        ...(actionId ? { actionId } : {}),
        ...(repairId ? { repairId } : {}),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isComposerDraftConflict(result.error) && result.draft) {
        state.composerDraft = result.draft
        state.composerDraftConflict = result.error
        return undefined
      }
      if (response.status === 409 && isComposerDraftStaleResponse(result)) {
        installComposerStaleResponse(result)
        if (action === 'remove') state.composerDraftError = localText(
          '该项暂时无法移除；恢复意图与外部配置保持不变。',
          'This item cannot be removed yet; the recovery intent and external config remain unchanged.',
        )
        return undefined
      }
      if (response.status === 409 && isProfileAuthoringReadOnly(result.error)) {
        installProfileAuthoringReadOnly(result.error)
        state.composerDraftError = profileAuthoringReadOnlyText(result.error)
        return undefined
      }
      throw new Error(typeof result.error === 'string'
        ? result.error
        : `Local Composer draft returned HTTP ${response.status}`)
    }
    state.planEntryId = undefined
    state.planValue = undefined
    state.planResult = undefined
    state.planError = undefined
    state.applySuccess = undefined
    state.providerPlanId = undefined
    state.providerPlanResult = undefined
    state.providerPlanError = undefined
    state.providerApplySuccess = undefined
    const recovered = result?.draft && Array.isArray(result.inspection?.nodes)
    if (recovered) installAuthoritativeInspection(result.inspection)
    state.composerDraft = recovered ? result.draft : result
    state.composerDraftStale = undefined
    if (recovered) renderAll()
    if (action === 'remove') {
      state.composerDraftNotice = state.composerDraft.operations?.length > 0 ? 'removed-revalidated' : 'removed-empty'
    }
    return state.composerDraft
  } catch (error) {
    if (action === 'remove') {
      state.composerDraftError = localText(
        '无法移除此项，因为剩余修改不能单独成立。当前待应用修改已完整保留，DSH 配置没有改变。',
        'This item cannot be removed because the remaining change cannot stand alone. The current pending changes were preserved and the DSH config is unchanged.',
      )
    } else {
      state.composerDraftError = error instanceof Error ? error.message : String(error)
    }
    return undefined
  } finally {
    state.composerDraftLoading = false
    renderComposer()
    renderDetails()
    renderHarnessContext()
    if (state.composerDraftStale) focusComposerStale()
    else if (state.composerDraftConflict) focusComposerConflict()
    else if (action === 'add' || action === 'repair') focusComposerReview()
  }
}

async function applyComposerDraft() {
  if (harnessContextTransitionInFlight()) return
  if (profileAuthoringIsReadOnly()) {
    state.composerDraftError = profileAuthoringReadOnlyText()
    renderComposerDraft()
    return
  }
  const draft = state.composerDraft
  if (!draft?.draftId || !draft?.summary || !draft?.canApply || draft.state === 'stale') return
  state.composerDraftError = undefined
  state.composerDraftConflict = undefined
  state.composerDraftStale = undefined
  state.composerDraftNotice = undefined
  state.composerDraftApplySuccess = undefined
  state.composerDraftApplyLoading = true
  renderHarnessContext()
  renderComposerDraft()
  try {
    const response = await fetch(apiUrl('apply-composer-draft'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ draftId: draft.draftId, confirmation: draft.summary }),
    })
    const applied = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isComposerDraftStaleResponse(applied)) {
        installComposerStaleResponse(applied)
        return undefined
      }
      if (response.status === 409 && isProfileAuthoringReadOnly(applied.error)) {
        installProfileAuthoringReadOnly(applied.error)
        state.composerDraftError = profileAuthoringReadOnlyText(applied.error)
        return undefined
      }
      throw new Error(`Local Composer apply returned HTTP ${response.status}`)
    }
    installAuthoritativeInspection(applied.inspection)
    state.composerDraft = applied.draft
    state.detailSource = 'source'
    state.composerDraftApplySuccess = { summary: applied.summary, reimport: applied.reimport }
    state.selectedNodeId = state.nodesById.has(state.selectedNodeId)
      ? state.selectedNodeId
      : state.inspection.nodes.find(node => node.plane === 'resolved')?.id
    renderAll()
  } catch {
    state.composerDraftError = localText(
      '无法完成应用。请重新读取当前 Harness，再复核待应用修改。',
      'Apply could not be completed. Reload the current Harness, then review the pending changes again.',
    )
  } finally {
    state.composerDraftApplyLoading = false
    renderComposerDraft()
    renderHarnessContext()
    if (state.composerDraftStale) focusComposerStale()
    else if (state.composerDraftApplySuccess) focusComposerCompletion()
  }
}

async function applyScalarPlan(result, entryId) {
  if (harnessContextTransitionInFlight()) return
  if (profileAuthoringIsReadOnly()) {
    state.planError = profileAuthoringReadOnlyText()
    renderDetails()
    return
  }
  state.planError = undefined
  state.applyLoading = true
  renderHarnessContext()
  renderDetails()
  try {
    const response = await fetch(apiUrl('apply-scalar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ planId: result.planId, confirmation: result.summary }),
    })
    const applied = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isProfileAuthoringReadOnly(applied.error)) {
        installProfileAuthoringReadOnly(applied.error)
        throw new Error(profileAuthoringReadOnlyText(applied.error))
      }
      throw new Error(typeof applied.error === 'string'
        ? applied.error
        : `Local apply returned HTTP ${response.status}`)
    }
    state.inspection = applied.inspection
    state.nodesById = new Map(state.inspection.nodes.map(node => [node.id, node]))
    state.detailSource = 'source'
    state.selectedNodeId = state.inspection.nodes.find(node =>
      node.plane === 'resolved' && node.attributes.entryId === entryId)?.id
      ?? state.selectedNodeId
    state.planEntryId = undefined
    state.planValue = undefined
    state.planResult = undefined
    state.applySuccess = { entryId, summary: applied.summary, reimport: applied.reimport }
    renderAll()
  } catch (error) {
    state.planError = error instanceof Error ? error.message : String(error)
  } finally {
    state.applyLoading = false
    renderDetails()
    renderHarnessContext()
  }
}

async function applyProviderReplacementPlan(result) {
  if (harnessContextTransitionInFlight()) return
  if (profileAuthoringIsReadOnly()) {
    state.providerPlanError = profileAuthoringReadOnlyText()
    renderDetails()
    return
  }
  state.providerPlanError = undefined
  state.providerApplyLoading = true
  renderHarnessContext()
  renderDetails()
  try {
    const response = await fetch(apiUrl('apply-provider-replacement'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ planId: result.planId, confirmation: result.summary }),
    })
    const applied = await response.json()
    if (!response.ok) {
      if (response.status === 409 && isProfileAuthoringReadOnly(applied.error)) {
        installProfileAuthoringReadOnly(applied.error)
        throw new Error(profileAuthoringReadOnlyText(applied.error))
      }
      throw new Error(typeof applied.error === 'string'
        ? applied.error
        : `Local provider apply returned HTTP ${response.status}`)
    }
    state.inspection = applied.inspection
    state.nodesById = new Map(state.inspection.nodes.map(node => [node.id, node]))
    state.detailSource = 'source'
    const successfulEntryId = result.mode === 'reset'
      ? result.impact.currentEntryId
      : result.impact.replacementEntryId
    state.selectedNodeId = state.inspection.nodes.find(node =>
      node.plane === 'resolved' && node.attributes.entryId === successfulEntryId)?.id
      ?? state.selectedNodeId
    state.providerPlanId = undefined
    state.providerPlanResult = undefined
    state.providerApplySuccess = {
      entryId: successfulEntryId,
      summary: applied.summary,
      reimport: applied.reimport,
    }
    renderAll()
  } catch (error) {
    state.providerPlanError = error instanceof Error ? error.message : String(error)
  } finally {
    state.providerApplyLoading = false
    renderDetails()
    renderHarnessContext()
  }
}

function renderPlanChangeDetails(changes) {
  const details = element('details', 'plan-change-details')
  details.append(element('summary', '', localText('查看精确配置变化', 'View exact configuration changes')))
  const list = element('div', 'change-list')
  changes.forEach((change, index) => {
    const row = element('div', 'change-row')
    row.append(element('span', 'change-index', String(index + 1)))
    const copy = element('div')
    copy.append(element('span', 'change-before', `− ${change.beforeText || localText('（无）', '(none)')}`))
    copy.append(element('span', 'change-after', `+ ${change.afterText || localText('（无）', '(none)')}`))
    row.append(copy)
    list.append(row)
  })
  details.append(list)
  return details
}

function renderPlanSection(node) {
  const disabled = node.attributes.disabled
  const editableFields = Array.isArray(node.attributes.editableFields) ? node.attributes.editableFields : []
  if (node.plane !== 'resolved'
    || typeof node.attributes.entryId !== 'string'
    || typeof disabled !== 'boolean'
    || !editableFields.includes('disabled')) {
    return undefined
  }
  const targetValue = !disabled
  const authoringReadOnly = profileAuthoringIsReadOnly()
  const section = element('section', 'detail-section plan-section')
  section.append(element('h3', '', localText('修改组件状态', 'Change component state')))
  if (state.applySuccess?.entryId === node.attributes.entryId) {
    const success = element('div', 'apply-success')
    success.append(element('strong', '', localText('已应用并刷新', 'Applied and refreshed')))
    success.append(element('p', '', state.applySuccess.summary))
    success.append(element('span', '', localText(
      '控制台已从官方 DSH 刷新当前 Harness。',
      'The console refreshed the current Harness from official DSH.',
    )))
    section.append(success)
  }
  const actionZh = targetValue ? '禁用' : '启用'
  const actionEn = targetValue ? 'disabling' : 'enabling'
  const intro = element('p', 'plan-intro', localText(
    `先预览${actionZh}此组件会带来的能力与依赖变化。只有确认“应用”后，所选 Harness 才会更新。`,
    `Preview how ${actionEn} this component affects capabilities and dependencies. The selected Harness changes only after you confirm Apply.`,
  ))
  section.append(intro)

  const primary = element('button', 'plan-action', state.planLoading
    ? localText('正在生成预览…', 'Preparing preview…')
    : localText(`预览${actionZh}`, `Preview ${targetValue ? 'disable' : 'enable'}`))
  primary.type = 'button'
  primary.disabled = state.planLoading || authoringReadOnly
  if (authoringReadOnly) makeProfileAuthoringActionReadOnly(primary)
  primary.addEventListener('click', () => requestScalarPlan(node.attributes.entryId, targetValue))
  section.append(primary)

  if (state.planEntryId !== node.attributes.entryId || state.planValue !== targetValue) return section
  if (state.planError) {
    section.append(element('p', 'plan-error', state.planError))
    return section
  }
  const result = state.planResult
  if (!result) return section

  const card = element('div', `plan-result ${result.canApply ? 'valid' : 'blocked'}`)
  const heading = element('div', 'plan-result-heading')
  heading.append(element('strong', '', result.canApply
    ? localText('预览已就绪', 'Preview ready')
    : localText('需要先处理依赖', 'Dependencies need attention')))
  heading.append(element('span', '', result.targetUnchanged ? localText('配置未写入', 'Configuration unchanged') : ''))
  card.append(heading)
  card.append(element('p', 'plan-summary', localText(
    `${friendlyNodeLabel(node)}将被${actionZh}；能力与依赖影响如下。`,
    `${friendlyNodeLabel(node)} will be ${targetValue ? 'disabled' : 'enabled'}; capability and dependency effects are shown below.`,
  )))
  card.append(renderPlanChangeDetails(result.changes))

  const diagnostics = result.dependencyImpact?.diagnostics ?? []
  diagnostics.forEach(diagnostic => card.append(element('p', 'plan-diagnostic', diagnostic.message)))

  const repairs = result.dependencyImpact?.repairs ?? []
  if (!result.selectedRepair && repairs.length > 0) {
    const repairList = element('div', 'repair-list')
    repairList.append(element('span', 'repair-label', localText('选择一个修复方案进行预览', 'Choose a repair to preview')))
    repairs.forEach(repair => {
      const button = element('button', 'repair-action', repairLabel(repair))
      button.type = 'button'
      button.disabled = state.planLoading || authoringReadOnly || !repair.supportedByCurrentWriter
      button.title = authoringReadOnly ? profileAuthoringReadOnlyText() : repair.explanation
      button.addEventListener('click', () => requestScalarPlan(node.attributes.entryId, targetValue, repair.id))
      repairList.append(button)
    })
    card.append(repairList)
  }
  if (result.selectedRepair) {
    card.append(element('p', 'selected-repair', localText(`已选修复 · ${repairLabel(result.selectedRepair)}`, `Selected repair · ${result.selectedRepair.label}`)))
  }
  if (result.validation) {
    card.append(element('p', 'validation-note', localText(
      '官方 DSH 已确认此预览可以组成；当前配置尚未改变。',
      'Official DSH confirmed that this preview composes; the current configuration is unchanged.',
    )))
  }
  if (result.planId) {
    card.append(element('p', 'apply-note', localText('应用前会再次确认当前配置没有变化；成功后控制台会刷新官方 DSH 结果。', 'Before Apply, the console checks that the current configuration has not changed, then refreshes the official DSH result.')))
    const applyButton = element('button', 'apply-action', state.applyLoading
      ? localText('正在应用并刷新…', 'Applying and refreshing…')
      : localText('应用此修改', 'Apply this change'))
    applyButton.type = 'button'
    applyButton.disabled = state.applyLoading || authoringReadOnly
    if (authoringReadOnly) makeProfileAuthoringActionReadOnly(applyButton)
    applyButton.addEventListener('click', () => applyScalarPlan(result, node.attributes.entryId))
    card.append(applyButton)
  }
  section.append(card)
  return section
}

function renderProviderReplacementSection(node) {
  const replacement = node.attributes.providerReplacement
  if (node.plane !== 'resolved'
    || replacement === null
    || typeof replacement !== 'object'
    || typeof replacement.id !== 'string') {
    return undefined
  }
  const isSwitch = replacement.mode === 'switch'
  const authoringReadOnly = profileAuthoringIsReadOnly()
  const isPickerPin = replacement.mode === 'pin-browse'
  const isPickerReset = replacement.mode === 'reset-auto'
  const isPicker = isPickerPin || isPickerReset
  const isDangerous = replacement.risk === 'dangerous'
  const actionNameEn = isPickerPin
    ? 'directory choice'
    : isPickerReset
      ? 'directory-choice reset'
      : isSwitch ? 'provider switch' : 'provider replacement'
  const actionName = localText(
    isPickerPin ? '目录选择' : isPickerReset ? '目录选择重置' : isSwitch ? 'Provider 切换' : 'Provider 替换',
    actionNameEn,
  )
  const section = element('section', 'detail-section provider-replacement-section')
  section.append(element('h3', '', isPickerPin
    ? localText('使用应用内目录浏览器', 'Use the in-app directory browser')
    : isPickerReset
      ? localText('恢复自适应目录选择', 'Restore adaptive directory picking')
      : isSwitch ? localText('切换 Provider', 'Switch provider') : localText('替换 Provider', 'Replace provider')))

  const mapping = element('div', 'provider-mapping')
  const current = element('div', 'provider-endpoint')
  current.append(element('span', '', localText('当前', 'Current')))
  current.append(element('strong', '', entryLabel(replacement.currentEntryId, node.label)))
  current.append(element('small', '', localText('当前配置', 'Current configuration')))
  const arrow = element('span', 'provider-arrow', '→')
  const next = element('div', 'provider-endpoint')
  next.append(element('span', '', isSwitch || isPickerReset ? localText('目标', 'Target') : localText('替代项', 'Replacement')))
  next.append(element('strong', '', entryLabel(replacement.replacementEntryId, replacement.replacementEntryId)))
  next.append(element('small', '', localText('预览选择', 'Preview selection')))
  mapping.append(current, arrow, next)
  section.append(mapping)

  if (isPicker && replacement.companionEntryId && replacement.companionPluginName) {
    const companion = element('div', 'picker-companion')
    companion.append(element('span', '', isPickerPin
      ? localText('联动浏览器界面', 'Coupled browser surface')
      : localText('将移除的浏览器界面', 'Removed browser surface')))
    companion.append(element('strong', '', entryLabel(replacement.companionEntryId, replacement.companionEntryId)))
    companion.append(element('small', '', localText('保持交互一致', 'Keeps the interaction aligned')))
    section.append(companion)
  }

  const risk = element('div', `provider-risk${isPicker ? ' picker-risk' : ''}`)
  risk.append(element('strong', 'risk-badge', localText(
    replacement.risk === 'dangerous' ? '高影响变更' : replacement.risk === 'review' ? '需要复核' : '支持的变更',
    replacement.risk === 'dangerous' ? 'High-impact change' : replacement.risk === 'review' ? 'Review required' : 'Supported change',
  )))
  risk.append(element('p', '', replacementText(replacement, 'security')))
  section.append(risk)
  section.append(element('p', 'world-delta', localText(`运行位置 · ${replacementText(replacement, 'executionWorld')}`, `Runtime location · ${replacement.executionWorldDelta}`)))
  section.append(element(
    'p',
    'plan-intro',
    state.locale === 'zh'
      ? isPickerPin
        ? '预览改用应用内目录浏览器，让连接到 Harness 的浏览器无需系统选择器即可选择主机目录。当前配置不会在预览阶段改变。'
        : isPickerReset
          ? '预览恢复官方 DSH 当前的自适应目录选择方式。其他 Harness 设置保持不变。'
          : isSwitch
            ? `预览将${serviceLabel(replacement.service)}切换到目标 Provider；已连接组件仍使用同一项能力。`
            : `预览使用目标 Provider 替换当前${serviceLabel(replacement.service)}来源，并显示对已连接组件的影响。`
      : isPickerPin
      ? 'Preview the in-app directory browser so connected browsers can choose host directories without an operating-system picker. Preview does not change the current configuration.'
      : isPickerReset
        ? 'Preview a return to the current official DSH adaptive directory choice. Other Harness settings remain unchanged.'
        : isSwitch
      ? `Preview moving ${serviceLabel(replacement.service)} to the target Provider while connected components continue to use the same capability.`
      : `Preview replacing the current ${serviceLabel(replacement.service)} source and see how connected components are affected.`,
  ))

  const primary = element('button', 'plan-action provider-plan-action', state.providerPlanLoading
    ? localText(`正在预览${actionName}…`, `Previewing ${actionName}…`)
    : isPickerPin
      ? localText('预览应用内浏览固定', 'Preview in-app browser pin')
      : isPickerReset
        ? localText('预览自适应默认重置', 'Preview adaptive-default reset')
        : localText(`预览${isSwitch ? '切换' : '替换'}到 ${entryLabel(replacement.replacementEntryId, replacement.replacementEntryId)}`, `Preview ${isSwitch ? 'switch' : 'replacement'} to ${entryLabel(replacement.replacementEntryId, replacement.replacementEntryId)}`))
  primary.type = 'button'
  primary.disabled = state.providerPlanLoading || authoringReadOnly
  if (authoringReadOnly) makeProfileAuthoringActionReadOnly(primary)
  primary.addEventListener('click', () => requestProviderReplacementPlan(replacement.id))
  section.append(primary)

  if (state.providerPlanId !== replacement.id) return section
  if (state.providerPlanError) {
    section.append(element('p', 'plan-error', state.providerPlanError))
    return section
  }
  const result = state.providerPlanResult
  if (!result) return section

  const card = element('div', `plan-result${isDangerous ? ' dangerous' : ''}`)
  const heading = element('div', 'plan-result-heading')
  heading.append(element('strong', '', localText(`${actionName}预览已就绪`, `${actionName} preview ready`)))
  heading.append(element('span', '', result.targetUnchanged ? localText('配置未写入', 'Configuration unchanged') : ''))
  card.append(heading)
  card.append(element('p', 'plan-summary', state.locale === 'zh'
    ? isPickerPin
      ? '目录选择将改用应用内浏览器。'
      : isPickerReset
        ? '目录选择将恢复为官方自适应方式。'
        : `${serviceLabel(replacement.service)}将使用${entryLabel(replacement.replacementEntryId, replacement.replacementEntryId)}。`
    : isPickerPin
      ? 'Directory choice will use the in-app browser.'
      : isPickerReset
        ? 'Directory choice will return to the official adaptive behavior.'
        : `${serviceLabel(replacement.service)} will use ${entryLabel(replacement.replacementEntryId, replacement.replacementEntryId)}.`))
  card.append(renderPlanChangeDetails(result.changes))
  if (result.validation) {
    card.append(element('p', 'validation-note', localText(
      '官方 DSH 已确认此预览可以组成；当前配置尚未改变。',
      'Official DSH confirmed that this preview composes; the current configuration is unchanged.',
    )))
  }
  if (result.planId) {
    card.append(element('p', 'apply-note', localText(
      '应用前会再次确认当前配置没有变化；成功后控制台会刷新官方 DSH 结果。',
      'Before Apply, the console checks that the current configuration has not changed, then refreshes the official DSH result.',
    )))
    const applyButton = element('button', `apply-action${isDangerous ? ' dangerous-apply' : ''}`, state.providerApplyLoading
      ? localText('正在应用并刷新…', 'Applying and refreshing…')
      : localText(isDangerous ? '确认并应用高影响变更' : '应用此修改', isDangerous ? 'Confirm and apply high-impact change' : 'Apply this change'))
    applyButton.type = 'button'
    applyButton.disabled = state.providerApplyLoading || authoringReadOnly
    if (authoringReadOnly) makeProfileAuthoringActionReadOnly(applyButton)
    applyButton.addEventListener('click', () => applyProviderReplacementPlan(result))
    card.append(applyButton)
  }
  section.append(card)
  return section
}

function renderProviderResetSection(node) {
  const reset = node.attributes.providerReset
  if (node.plane !== 'resolved'
    || reset === null
    || typeof reset !== 'object'
    || typeof reset.id !== 'string'
    || reset.mode !== 'reset') {
    return undefined
  }

  const section = element('section', 'detail-section provider-reset-section')
  const authoringReadOnly = profileAuthoringIsReadOnly()
  section.append(element('h3', '', localText('恢复官方默认值', 'Restore official default')))
  const mapping = element('div', 'provider-mapping')
  const current = element('div', 'provider-endpoint')
  current.append(element('span', '', localText('当前', 'Current')))
  current.append(element('strong', '', localText('自定义文件系统设置', 'Custom filesystem setup')))
  current.append(element('small', '', localText('当前选择', 'Current selection')))
  const arrow = element('span', 'provider-arrow reset-arrow', '→')
  const next = element('div', 'provider-endpoint')
  next.append(element('span', '', localText('目标', 'Target')))
  next.append(element('strong', '', entryLabel(reset.currentEntryId, reset.currentEntryId)))
  next.append(element('small', '', localText('官方 DSH 默认值', 'Official DSH default')))
  mapping.append(current, arrow, next)
  section.append(mapping)

  const note = element('div', 'provider-risk reset-risk')
  note.append(element('strong', 'risk-badge', localText('需要复核', 'Review required')))
  note.append(element('p', '', replacementText(reset, 'security')))
  section.append(note)
  section.append(element('p', 'world-delta', localText(`运行位置 · ${replacementText(reset, 'executionWorld')}`, `Runtime location · ${reset.executionWorldDelta}`)))
  section.append(element(
    'p',
    'plan-intro',
    localText(
      '预览恢复官方 DSH 的文件系统默认值。其他 Harness 设置保持不变，只有确认“应用”后才会更新当前配置。',
      'Preview a return to the official DSH filesystem default. Other Harness settings remain unchanged, and the current configuration updates only after you confirm Apply.',
    ),
  ))

  const primary = element('button', 'plan-action provider-reset-action', state.providerPlanLoading
    ? localText('正在验证官方默认重置…', 'Validating official-default reset…')
    : localText('预览官方默认重置', 'Preview official-default reset'))
  primary.type = 'button'
  primary.disabled = state.providerPlanLoading || authoringReadOnly
  if (authoringReadOnly) makeProfileAuthoringActionReadOnly(primary)
  primary.addEventListener('click', () => requestProviderReplacementPlan(reset.id))
  section.append(primary)

  if (state.providerPlanId !== reset.id) return section
  if (state.providerPlanError) {
    section.append(element('p', 'plan-error', state.providerPlanError))
    return section
  }
  const result = state.providerPlanResult
  if (!result) return section

  const card = element('div', 'plan-result reset-result')
  const heading = element('div', 'plan-result-heading')
  heading.append(element('strong', '', localText('重置预览已就绪', 'Reset preview ready')))
  heading.append(element('span', '', result.targetUnchanged ? localText('配置未写入', 'Configuration unchanged') : ''))
  card.append(heading)
  card.append(element('p', 'plan-summary', localText(
    '文件访问将恢复为当前官方 DSH 默认 Provider。',
    'File access will return to the current official DSH default Provider.',
  )))
  card.append(renderPlanChangeDetails(result.changes))
  if (result.validation) {
    card.append(element('p', 'validation-note', localText(
      '官方 DSH 已确认此预览可以组成；当前配置尚未改变。',
      'Official DSH confirmed that this preview composes; the current configuration is unchanged.',
    )))
  }
  if (result.planId) {
    card.append(element('p', 'apply-note', localText('应用前会再次确认当前配置没有变化；成功后控制台会刷新官方 DSH 结果。', 'Before Apply, the console checks that the current configuration has not changed, then refreshes the official DSH result.')))
    const applyButton = element('button', 'apply-action reset-apply', state.providerApplyLoading
      ? localText('正在应用并刷新…', 'Applying and refreshing…')
      : localText('确认并恢复默认值', 'Confirm and restore default'))
    applyButton.type = 'button'
    applyButton.disabled = state.providerApplyLoading || authoringReadOnly
    if (authoringReadOnly) makeProfileAuthoringActionReadOnly(applyButton)
    applyButton.addEventListener('click', () => applyProviderReplacementPlan(result))
    card.append(applyButton)
  }
  section.append(card)
  return section
}

function renderProviderApplySuccess(node) {
  const successState = state.providerApplySuccess
  if (!successState || node.attributes.entryId !== successState.entryId) return undefined
  const success = element('section', 'detail-section')
  const card = element('div', 'apply-success')
  card.append(element('strong', '', localText('Provider 变更已应用并刷新', 'Provider change applied and refreshed')))
  card.append(element('p', '', localText('当前 Harness 已使用新的 Provider 配置。', 'The current Harness now uses the new Provider configuration.')))
  card.append(element('span', '', localText(
    '控制台已从官方 DSH 刷新当前 Harness。',
    'The console refreshed the current Harness from official DSH.',
  )))
  success.append(card)
  return success
}

function renderProviderContractSection(node, inspection = state.inspection) {
  const contracts = inspection.edges.filter(edge => edge.kind === 'provides-service' && edge.from === node.id)
  if (contracts.length === 0) return undefined

  const section = element('section', 'detail-section')
  section.append(element('h3', '', localText('能力提供者', 'Capability provider')))
  contracts.forEach(contract => {
    const card = element('div', 'provider-contract')
    const heading = element('div', 'provider-contract-heading')
    heading.append(element('strong', '', localText(`提供 ${displayNode(contract.to, inspection)}`, `Provides ${displayNode(contract.to, inspection)}`)))
    if (contract.providerAvailability) {
      heading.append(element('span', `provider-state ${contract.providerAvailability}`, availabilityLabel(contract.providerAvailability)))
    }
    card.append(heading)
    card.append(element('p', 'provider-contract-evidence', contract.evidence === 'current-official-contract'
      ? localText('来自当前官方 DSH', 'From current official DSH')
      : contract.evidence ?? localText('由官方 DSH 组合结果计算。', 'Computed from the official DSH composition.')))

    if (contract.providerPolicy) {
      const policy = contract.providerPolicy
      card.append(element('strong', 'provider-policy-title', policyText(policy, 'label')))
      const policyGrid = element('div', 'provider-policy-grid')
      policyGrid.append(element('span', '', localText('隔离边界', 'Confinement')))
      policyGrid.append(element('strong', '', policyText(policy, 'confinement')))
      policyGrid.append(element('span', '', localText('执行域', 'Execution world')))
      policyGrid.append(element('strong', '', policyText(policy, 'executionWorld')))
      card.append(policyGrid)
      card.append(element('p', 'provider-policy-summary', policyText(policy, 'summary')))
      const sourcePaths = Array.isArray(policy.sourcePaths) ? policy.sourcePaths : []
      if (sourcePaths.length > 0) {
        const sources = element('div', 'provider-policy-sources')
        sources.append(element('span', '', localText('官方配置依据', 'Official configuration basis')))
        sourcePaths.forEach(sourcePath => sources.append(element('code', '', sourcePath)))
        card.append(sources)
      }
    }
    section.append(card)
  })
  return section
}

function serviceForNode(node, inspection) {
  if (!node) return undefined
  if (node.kind === 'service') return inspection.services.find(service => service.id === node.id)
  return inspection.services.find(service => service.providers.some(provider => provider.nodeId === node.id)
    || service.requiredConsumers.includes(node.id)
    || service.optionalConsumers.includes(node.id))
}

function servicePurpose(name) {
  return ({
    fs: localText('为 Agent 提供读取、创建和修改文件的能力。', 'Lets the Agent read, create, and edit files.'),
    directoryPicker: localText('让用户从应用内选择 Agent 要使用的工作目录。', 'Lets users choose the Agent working directory inside the app.'),
    subprocess: localText('让命令工具在当前执行环境中运行程序。', 'Lets command tools run programs in the current execution environment.'),
    webRuntime: localText('维持浏览器与 DSH 之间的实时连接。', 'Maintains the live connection between the browser and DSH.'),
    webStartup: localText('启动并提供 DSH 的本机 Web 界面。', 'Starts and provides the local DSH web interface.'),
  })[name] ?? localText('这是当前 Harness 中的一项能力。', 'This is a capability in the current Harness.')
}

function entryPurpose(node) {
  return sessionAidPresentation(node?.attributes?.entryId)?.purpose ?? localText(
    '这是当前能力中的一个组件。',
    'This is a component in the current capability.',
  )
}

function hasExactSubprocessRemovalBoundary(node, inspection) {
  const service = serviceForNode(node, inspection)
  if (node?.plane !== 'resolved'
    || service?.name !== 'subprocess'
    || service.availability !== 'available'
    || service.providers.length !== 1
    || service.providers[0]?.nodeId !== node.id
    || service.providers[0]?.availability !== 'active'
    || service.optionalConsumers.length !== 0
    || node.attributes?.entryId !== 'subprocess'
    || node.attributes?.pluginName !== '@deepseek-ai/dsh-subprocess-local') return false
  const expected = new Map([
    ['bash-sandbox', {
      pluginName: '@deepseek-ai/dsh-bash-sandbox',
      symbolicSource: "process.platform === 'win32'",
    }],
    ['pwsh-sandbox', {
      pluginName: '@deepseek-ai/dsh-pwsh-sandbox',
      symbolicSource: "process.platform !== 'win32'",
    }],
    ['tool-fs-search', {
      pluginName: '@deepseek-ai/dsh-tool-fs-search',
      disabled: true,
    }],
  ])
  if (service.requiredConsumers.length !== expected.size) return false
  return service.requiredConsumers.every(nodeId => {
    const consumer = inspectionNode(inspection, nodeId)
    const contract = expected.get(consumer?.attributes?.entryId)
    if (!contract || consumer.attributes?.pluginName !== contract.pluginName) return false
    if (contract.disabled === true) return consumer.attributes?.disabled === true
    const symbolic = consumer.attributes?.disabled
    return symbolic?.symbolic === true
      && symbolic.tag === '!!js'
      && symbolic.source === contract.symbolicSource
  })
}

function supportedNodeStateAction(node, inspection) {
  const providerNodeIds = new Set(inspection.services.flatMap(service =>
    service.providers.map(provider => provider.nodeId)))
  const providerRemoval = node?.plane === 'resolved'
    && providerNodeIds.has(node.id)
    && node.attributes?.entryId === 'fs-local'
    && node.attributes.providerReplacement?.id === 'fs-local-to-sandbox'
  if (providerRemoval) {
    return {
      id: 'fs-provider-remove',
      intent: 'remove-provider',
      dependencyAware: true,
      providerRemoval: true,
      capability: 'ctx.fs',
      repairAvailable: true,
      node,
    }
  }
  if (providerNodeIds.has(node?.id) && hasExactSubprocessRemovalBoundary(node, inspection)) {
    return {
      id: 'subprocess-provider-remove',
      intent: 'remove-provider',
      dependencyAware: true,
      providerRemoval: true,
      capability: 'ctx.subprocess',
      repairAvailable: false,
      node,
    }
  }
  const editableFields = Array.isArray(node?.attributes?.editableFields) ? node.attributes.editableFields : []
  if (node?.plane !== 'resolved'
    || typeof node.attributes?.entryId !== 'string'
    || typeof node.attributes?.disabled !== 'boolean'
    || !editableFields.includes('disabled')) return undefined
  const value = !node.attributes.disabled
  const dependencyAware = node.typed?.kind === 'web-spine-component'
    && node.typed.role === 'startup'
    && value
  if (providerNodeIds.has(node.id) && !dependencyAware) return undefined
  return {
    id: dependencyAware
      ? 'web-startup-disable'
      : `scalar-disabled:${String(value)}:${encodeURIComponent(node.attributes.entryId)}`,
    intent: value ? 'disable' : 'enable',
    dependencyAware,
    providerRemoval: false,
    node,
  }
}

function nodeIsEffectivelyEnabled(node, service) {
  if (node?.attributes?.disabled === true) return false
  if (node?.kind !== 'service' || !service || service.providers.length === 0) return true
  return service.providers.some(provider => provider.availability === 'active')
}

function renderDetails() {
  byId('detailPanel').hidden = !state.detailPanelOpen
  const inspection = detailInspection()
  const node = inspectionNode(inspection, state.selectedNodeId)
  const isCandidate = inspection !== state.inspection
  const authoringReadOnly = !isCandidate && inspection.authoring?.state === 'read-only'
  const content = byId('detailContent')
  if (!node) {
    byId('detailPlane').textContent = '—'
    byId('detailTitle').textContent = t('details.title')
    replaceChildren(content, [element('p', 'empty-state', t('details.empty'))])
    return
  }

  const service = serviceForNode(node, inspection)
  const isEnabled = nodeIsEffectivelyEnabled(node, service)
  const selectedName = friendlyNodeLabel(node)
  byId('detailTitle').textContent = selectedName
  byId('detailPlane').textContent = isCandidate
    ? localText('预览', 'Preview')
    : isEnabled
      ? localText('启用', 'On')
      : localText('已停用', 'Off')

  const children = []
  if (isCandidate) {
    const notice = element('div', 'candidate-detail-banner')
    notice.append(element('strong', '', localText('这是修改后的预览', 'This is the changed preview')))
    notice.append(element('p', '', localText('尚未写入配置。', 'The configuration has not been written.')))
    children.push(notice)
  }
  if (authoringReadOnly) {
    const notice = element('section', 'detail-section profile-authoring-read-only')
    notice.append(element('h3', '', localText('当前修改为只读', 'Changes are read-only')))
    notice.append(element('p', '', profileAuthoringReadOnlyText(inspection.authoring)))
    children.push(notice)
  }

  const purpose = element('section', 'detail-section')
  purpose.append(element('h3', '', localText('它会做什么', 'What it does')))
  purpose.append(element('p', 'detail-purpose', service
    ? servicePurpose(service.name)
    : entryPurpose(node)))
  children.push(purpose)

  const status = element('section', 'detail-section')
  status.append(element('h3', '', localText('当前状态', 'Current status')))
  const statusRow = element('div', `detail-state-row${isEnabled ? '' : ' is-off'}`)
  statusRow.append(element('span', 'detail-state-dot'))
  statusRow.append(element('span', '', isEnabled
    ? localText('已经启用', 'Enabled')
    : localText('当前停用', 'Currently off')))
  status.append(statusRow)
  children.push(status)

  if (service) {
    const connections = element('section', 'detail-section')
    const consumers = [...service.requiredConsumers, ...service.optionalConsumers]
    connections.append(element('h3', '', localText(`连接到 · ${consumers.length}`, `Connected to · ${consumers.length}`)))
    const connectionList = element('div', 'detail-connections')
    consumers.forEach(nodeId => {
      const consumerNode = inspectionNode(inspection, nodeId)
      const button = element('button', 'detail-connection', friendlyNodeLabel(consumerNode) || nodeId)
      button.type = 'button'
      button.addEventListener('click', () => selectNode(nodeId, isCandidate ? 'candidate' : 'source'))
      connectionList.append(button)
    })
    if (consumers.length === 0) connectionList.append(element('span', 'empty-state', localText('没有连接的组件', 'No connected components')))
    connections.append(connectionList)
    children.push(connections)

    if (service.name === 'fs') {
      const contract = element('section', 'detail-section detail-semantic-contract')
      contract.append(element('h3', '', localText('为什么会连在一起', 'Why these are connected')))
      const contractHeading = element('div', 'detail-contract-heading')
      contractHeading.append(element('span', 'detail-contract-port'))
      contractHeading.append(element('strong', '', 'ctx.fs'))
      contract.append(contractHeading)
      contract.append(element('p', '', localText(
        '当前文件系统提供这个接口，文件工具和文本编辑需要它。DSH 会根据声明自动连接；画布上的连线不是另一份配置。',
        'The current filesystem provides this contract, while File tools and Text editor require it. DSH derives the connection; the drawn line is not another configuration.',
      )))
      children.push(contract)
    } else if (service.name === 'directoryPicker') {
      const contract = element('section', 'detail-section detail-semantic-contract')
      contract.append(element('h3', '', localText('为什么需要两个组件', 'Why two components are needed')))
      const contractHeading = element('div', 'detail-contract-heading')
      contractHeading.append(element('span', 'detail-contract-port'))
      contractHeading.append(element('strong', '', 'ctx.directoryPicker'))
      contract.append(contractHeading)
      contract.append(element('p', '', localText(
        '当前目录选择器提供这个接口，应用界面通过 api-gateway 使用它。固定为应用内选择时，官方 Host 后端与 Web UI 必须一起加入；画布连线只显示 DSH 解析出的关系，不会另存配置。',
        'The current picker provides this contract and the app interface consumes it through api-gateway. Pinning in-app selection requires the official Host backend and Web UI together; canvas lines only show DSH-resolved relationships and are never saved as another configuration.',
      )))
      children.push(contract)
    } else if (service.name === 'subprocess') {
      const contract = element('section', 'detail-section detail-semantic-contract')
      contract.append(element('h3', '', localText('为什么会连在一起', 'Why these are connected')))
      const contractHeading = element('div', 'detail-contract-heading')
      contractHeading.append(element('span', 'detail-contract-port'))
      contractHeading.append(element('strong', '', 'ctx.subprocess'))
      contract.append(contractHeading)
      contract.append(element('p', '', localText(
        '本机命令执行 Provider 提供这个接口，命令组件和文件搜索声明需要它。Bash 与 PowerShell 的当前状态由官方平台条件控制；GraphControl 只显示这项事实，不执行或改写条件。',
        'The local command-execution Provider supplies this contract, while command components and file search declare that they need it. Bash and PowerShell are controlled by official platform conditions; GraphControl shows that fact without executing or rewriting those conditions.',
      )))
      children.push(contract)
    }

    const activeProvider = service.providers.find(provider => provider.availability === 'active')
    const providerNode = inspectionNode(inspection, activeProvider?.nodeId)
    const provider = element('section', 'detail-section')
    provider.append(element('h3', '', localText('当前提供者 / 位置', 'Current provider / location')))
    const providerCard = element('div', 'detail-provider')
    providerCard.append(element('strong', '', providerNode ? friendlyNodeLabel(providerNode) : localText('没有启用的提供者', 'No active provider')))
    providerCard.append(element('span', '', activeProvider?.policy?.confinement === 'sandbox-policy'
      ? localText('本机 · 工作区权限受限', 'Local · workspace permission limits')
      : localText('当前执行环境', 'Current execution environment')))
    provider.append(providerCard)
    children.push(provider)

    if (!isCandidate) {
      const actions = element('section', 'detail-section')
      actions.append(element('h3', '', localText('可用操作', 'Available actions')))
      const actionRow = element('div', 'detail-actions')
      const replacement = providerNode?.attributes?.providerReplacement
      const stateTarget = node.kind === 'service' ? providerNode : node
      const stateAction = supportedNodeStateAction(stateTarget, inspection)
      if (replacement) {
        const replacementButton = element('button', 'primary', replacement.mode === 'pin-browse'
          ? localText('改为应用内选择', 'Use in-app picker')
          : replacement.mode === 'reset-auto'
            ? localText('恢复自动选择', 'Restore automatic picker')
            : localText('替换提供者', 'Replace provider'))
        replacementButton.type = 'button'
        replacementButton.disabled = state.composerDraftLoading || authoringReadOnly
        if (authoringReadOnly) makeProfileAuthoringActionReadOnly(replacementButton)
        replacementButton.addEventListener('click', () => void updateComposerDraft('add', replacement.id))
        actionRow.append(replacementButton)
      }
      if (stateAction) {
        const stateButton = element('button', stateAction.intent === 'enable' ? 'primary' : 'danger', stateAction.providerRemoval
          ? stateAction.repairAvailable === false
            ? localText('检查移除边界（不能应用）', 'Inspect removal boundary (cannot apply)')
            : localText('移除当前 Provider，先检查影响', 'Remove current provider and check impact')
          : stateAction.dependencyAware
            ? localText('关闭网页访问并检查依赖', 'Turn off Web access and check dependencies')
          : localText(
              `${stateAction.intent === 'disable' ? '关闭' : '开启'} ${friendlyNodeLabel(stateTarget)}`,
              `${stateAction.intent === 'disable' ? 'Turn off' : 'Turn on'} ${friendlyNodeLabel(stateTarget)}`,
            ))
        stateButton.type = 'button'
        stateButton.disabled = state.composerDraftLoading || authoringReadOnly
        if (authoringReadOnly) makeProfileAuthoringActionReadOnly(stateButton)
        stateButton.addEventListener('click', () => void updateComposerDraft('add', stateAction.id))
        actionRow.append(stateButton)
      }
      if (!replacement && !stateAction) {
        const unavailable = element('button', '', localText('暂无可修改项', 'No safe change available'))
        unavailable.type = 'button'
        unavailable.disabled = true
        actionRow.append(unavailable)
      }
      const dependencies = element('button', '', localText('查看依赖', 'View dependencies'))
      dependencies.type = 'button'
      dependencies.addEventListener('click', () => {
        window.location.hash = 'topology'
        setActiveSection('topology')
      })
      actionRow.append(dependencies)
      actions.append(actionRow)
      children.push(actions)
    }
  }

  const technical = element('details', 'detail-section detail-technical')
  technical.append(element('summary', '', localText('配置详情', 'Configuration details')))
  const grid = element('div', 'fact-grid')
  grid.append(element('span', 'fact-key', localText('类型', 'Type')))
  grid.append(element('span', 'fact-value', kindLabel(node.kind)))
  if (node.attributes?.entryId) {
    grid.append(element('span', 'fact-key', 'Entry'))
    grid.append(element('span', 'fact-value', node.attributes.entryId))
  }
  if (node.subtitle && node.subtitle !== 'service') {
    grid.append(element('span', 'fact-key', localText('组件', 'Package')))
    grid.append(element('span', 'fact-value', node.subtitle))
  }
  grid.append(element('span', 'fact-key', localText('来源', 'Source')))
  grid.append(element('span', 'fact-value', isCandidate
    ? localText('官方 DSH 预览结果', 'Official DSH preview')
    : localText('当前官方 DSH 组合结果', 'Current official DSH composition')))
  technical.append(grid)
  children.push(technical)

  replaceChildren(content, children)
}

function renderAll() {
  renderHeader()
  renderLayers()
  renderStats()
  renderDiagnostics()
  renderTopology()
  renderComposer()
  renderExecutionWorlds()
  renderDeveloperDiagnostics()
  renderEntities()
  renderDetails()
}

function selectNode(nodeId, detailSource = 'source') {
  if (state.selectedNodeId !== nodeId) {
    state.planEntryId = undefined
    state.planValue = undefined
    state.planResult = undefined
    state.planError = undefined
    state.planLoading = false
    state.applyLoading = false
    state.providerPlanId = undefined
    state.providerPlanResult = undefined
    state.providerPlanError = undefined
    state.providerPlanLoading = false
    state.providerApplyLoading = false
  }
  state.selectedNodeId = nodeId
  state.detailSource = detailSource
  state.detailPanelOpen = true
  renderEntities()
  renderDetails()
  state.composer?.setSelection(nodeId)
}

function setActiveSection(sectionId) {
  const aliases = {
    settings: 'overview',
    worlds: 'overview',
    sources: 'overview',
    developer: 'system',
    entities: 'system',
  }
  const requested = aliases[sectionId] ?? sectionId
  const activeSection = ['composer', 'changes', 'topology', 'overview', 'system'].includes(requested)
    ? requested
    : 'composer'
  const visibleView = activeSection === 'changes' ? 'composer' : activeSection
  state.activeSection = activeSection
  document.body.dataset.activeSection = activeSection
  renderWorkspaceLocation()
  document.querySelectorAll('.nav-rail [data-section]').forEach(link => {
    const active = link.dataset.section === activeSection
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  document.querySelectorAll('[data-workspace-view]').forEach(view => {
    view.hidden = view.dataset.workspaceView !== visibleView
  })
  const composer = byId('composer')
  composer.classList.toggle('review-focus', activeSection === 'changes')
  if (visibleView === 'composer') {
    window.setTimeout(() => state.composer?.fit(), 40)
  }
}

function bindSectionNavigation() {
  const links = [...document.querySelectorAll('.nav-rail [data-section]')]
  links.forEach(link => {
    link.addEventListener('click', () => setActiveSection(link.dataset.section))
  })
  const updateFromHash = () => setActiveSection(window.location.hash.replace(/^#/, '') || 'composer')
  window.addEventListener('hashchange', updateFromHash)
  updateFromHash()
}

function bindControls() {
  byId('developerDiagnosticsLoad').addEventListener('click', () => void loadDeveloperDiagnostics())
  byId('harnessOpenSummary').addEventListener('click', event => {
    if (harnessOpenBusy()) event.preventDefault()
  })
  byId('openLocalHarnessDisclosure').addEventListener('toggle', event => {
    if (harnessOpenBusy() && !event.currentTarget.open) event.currentTarget.open = true
  })
  byId('harnessContextCheckForm').addEventListener('submit', event => {
    event.preventDefault()
    void checkLocalHarness()
  })
  byId('harnessInstallationRoot').addEventListener('input', invalidateHarnessOpenCandidate)
  byId('harnessDshHome').addEventListener('input', invalidateHarnessOpenCandidate)
  byId('harnessContextOpen').addEventListener('click', () => void openCheckedHarness())
  byId('harnessInitializePreview').addEventListener('click', () => {
    void previewCheckedHarnessInitialization()
  })
  byId('harnessInitializeApply').addEventListener('click', () => {
    void applyCheckedHarnessInitialization()
  })
  byId('harnessContextTrigger').addEventListener('click', event => {
    event.stopPropagation()
    setHarnessContextOpen(!state.harnessContextOpen)
  })
  byId('harnessContextPopover').addEventListener('click', event => event.stopPropagation())
  byId('harnessContextReload').addEventListener('click', () => {
    if (state.harnessContext?.selectedProfile) {
      void selectHarnessProfile(state.harnessContext.selectedProfile)
    }
  })
  byId('settingsHarnessReload').addEventListener('click', () => {
    if (state.harnessContext?.selectedProfile) {
      void selectHarnessProfile(state.harnessContext.selectedProfile)
    }
  })
  document.addEventListener('click', event => {
    if (!event.target.closest('.harness-context-control')) setHarnessContextOpen(false)
  })
  byId('languageSwitch').addEventListener('click', event => {
    const button = event.target.closest('button[data-locale]')
    if (!button) return
    setLocale(button.dataset.locale)
  })
  byId('themeSwitch').addEventListener('click', event => {
    const button = event.target.closest('button[data-theme-value]')
    if (!button) return
    setTheme(button.dataset.themeValue)
  })
  byId('searchInput').addEventListener('input', event => {
    state.query = event.target.value
    renderEntities()
  })
  byId('planeTabs').addEventListener('click', event => {
    const button = event.target.closest('button[data-plane]')
    if (!button) return
    state.plane = button.dataset.plane
    byId('planeTabs').querySelectorAll('button').forEach(candidate => {
      candidate.classList.toggle('active', candidate === button)
    })
    renderEntities()
  })
  byId('serviceSelect').addEventListener('change', event => {
    state.selectedServiceId = event.target.value
    selectNode(state.selectedServiceId)
    renderHeader()
    renderTopology()
    renderComposer()
  })
  byId('composerServiceSelect').addEventListener('change', event => {
    state.selectedServiceId = event.target.value
    selectNode(state.selectedServiceId)
    renderHeader()
    renderTopology()
    renderComposer()
  })
  byId('composerScope').addEventListener('click', event => {
    const button = event.target.closest('button[data-composer-scope]')
    if (!button) return
    state.composerScope = button.dataset.composerScope === 'resolved' ? 'resolved' : 'focus'
    try {
      localStorage.setItem('dsh-graph-control.composer.scope', state.composerScope)
    } catch {
      // Composer scope is disposable presentation state.
    }
    renderComposer()
  })
  byId('composerArrange').addEventListener('click', () => state.composer?.autoArrange())
  byId('composerFit').addEventListener('click', () => state.composer?.fit())
  byId('composerReset').addEventListener('click', () => state.composer?.resetLayout())
  byId('detailClose').addEventListener('click', () => {
    state.detailPanelOpen = false
    byId('detailPanel').hidden = true
  })
  const updateCapabilitySearch = value => {
    state.capabilityQuery = value
    byId('capabilitySearch').value = value
    byId('dockSearch').value = value
    state.composer?.setCapabilitySearch(value, state.capabilityFilter)
  }
  byId('capabilitySearch').addEventListener('input', event => updateCapabilitySearch(event.target.value))
  byId('dockSearch').addEventListener('input', event => updateCapabilitySearch(event.target.value))
  byId('capabilitySearch').addEventListener('focus', () => {
    if (state.activeSection !== 'composer') {
      window.location.hash = 'composer'
      setActiveSection('composer')
    }
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.harnessContextOpen) {
      setHarnessContextOpen(false)
      byId('harnessContextTrigger').focus()
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      byId('capabilitySearch').focus()
    }
  })
  document.querySelector('.capability-categories').addEventListener('click', event => {
    const button = event.target.closest('button[data-capability-filter]')
    if (!button) return
    state.capabilityFilter = button.dataset.capabilityFilter
    document.querySelectorAll('[data-capability-filter]').forEach(candidate => {
      candidate.classList.toggle('active', candidate === button)
      candidate.setAttribute('aria-pressed', String(candidate === button))
    })
    state.composer?.setCapabilitySearch(state.capabilityQuery, state.capabilityFilter)
  })
  bindSectionNavigation()
}

async function start() {
  applyStaticTranslations()
  const [response, draftResponse, contextResponse] = await Promise.all([
    fetch(apiUrl('inspection'), { headers: { Accept: 'application/json' } }),
    fetch(apiUrl('composer-draft'), { headers: { Accept: 'application/json' } }),
    fetch(apiUrl('harness-context'), { headers: { Accept: 'application/json' } }),
  ])
  if (!draftResponse.ok) throw new Error(`Local Composer draft returned HTTP ${draftResponse.status}`)
  if (!contextResponse.ok) throw new Error(`Local Harness context returned HTTP ${contextResponse.status}`)
  const draft = await draftResponse.json()
  state.harnessContext = await contextResponse.json()
  state.composerDraft = draft
  state.composerDraftStale = isComposerDraftStale(draft?.stale) ? draft.stale : undefined
  if (response.ok) {
    installAuthoritativeInspection(await response.json())
    state.selectedServiceId = state.inspection.services.find(service => service.name === 'fs')?.id
      ?? preferredWebStartupServiceId(state.inspection)
      ?? state.inspection.services[0]?.id
    state.selectedNodeId = state.selectedServiceId
      ?? state.inspection.nodes.find(node => node.plane === 'resolved')?.id
  } else {
    const unavailable = await response.json()
    if (response.status !== 409 || !isComposerDraftStaleResponse(unavailable)) {
      throw new Error(`Local inspection returned HTTP ${response.status}`)
    }
    state.composerDraft = unavailable.draft
    state.composerDraftStale = unavailable.error
    markInspectionUnavailable()
  }
  renderAll()
  bindControls()
  byId('app').setAttribute('aria-busy', 'false')
}

start().catch(error => {
  byId('app').hidden = true
  const fatal = byId('fatalError')
  fatal.hidden = false
  fatal.textContent = localText(
    `GraphControl 无法载入此本机配置：${error instanceof Error ? error.message : String(error)}`,
    `GraphControl could not load this local profile: ${error instanceof Error ? error.message : String(error)}`,
  )
})
