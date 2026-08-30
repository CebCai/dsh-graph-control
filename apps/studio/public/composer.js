(() => {
  const POSITION_PREFIX = 'dsh-graph-control.composer.positions.c1-semantic-identity'
  const DISABLE_TARGET_ID = 'composer-intent:disable'
  const ENABLE_TARGET_ID = 'composer-intent:enable'
  const REMOVE_PROVIDER_TARGET_ID = 'composer-intent:remove-provider'
  const PLUGIN_TARGET_PREFIX = 'composer-intent:plugin-lifecycle'
  const ROUTE_MODES = new Set(['straight', 'orthogonal', 'curve'])
  const GROUP_MIN_WIDTH = 190
  const GROUP_MIN_HEIGHT = 112

  function createElement(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function localText(locale, zh, en) {
    return locale === 'zh' ? zh : en
  }

  function profileAuthoringReadOnlyText(locale, inspection) {
    if (inspection?.authoring?.reason === 'higher-precedence-layer-active') {
      return localText(
        locale,
        '检测到配置补丁之后仍有生效的覆盖层。为避免修改被更高优先级配置改变含义，当前 Harness 可查看，但这些修改暂时只读。',
        'An active overlay follows the profile patch. To avoid changing behavior through a lower-precedence source, this Harness remains visible but these changes are read-only.',
      )
    }
    return localText(
      locale,
      '当前配置补丁不可用于安全写入。Harness 仍可查看，但这些修改暂时只读。',
      'The current profile patch is unavailable for safe writes. The Harness remains visible, but these changes are read-only.',
    )
  }

  function safeSegment(value) {
    return encodeURIComponent(String(value ?? 'unknown')).slice(0, 180)
  }

  function createMcpHttpAction(serverNameValue, urlValue) {
    const serverName = String(serverNameValue ?? '').trim()
    if (!/^[A-Za-z0-9_-]{1,32}$/u.test(serverName)) {
      throw new Error('服务名称只能使用 1–32 个字母、数字、下划线或连字符')
    }
    const sourceUrl = String(urlValue ?? '').trim()
    if (!sourceUrl || sourceUrl.length > 2048) throw new Error('请输入不超过 2048 个字符的服务地址')
    let endpoint
    try {
      endpoint = new URL(sourceUrl)
    } catch {
      throw new Error('请输入完整的 HTTP 或 HTTPS 地址')
    }
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
      throw new Error('服务地址必须使用 HTTP 或 HTTPS')
    }
    if (endpoint.username || endpoint.password) throw new Error('服务地址中不能包含账号或密码')
    if (endpoint.hash) throw new Error('服务地址中不能包含 # 片段')
    const url = endpoint.href
    return {
      id: `mcp-http-add:${encodeURIComponent(serverName)}:${encodeURIComponent(url)}`,
      entryId: `mcp-${serverName}`,
      serverName,
      url,
      transport: 'streamable-http',
      candidateKind: 'mcp-http',
    }
  }

  function currentMcpHttpAction(actionIds) {
    const encoded = actionIds.find(actionId => actionId.startsWith('mcp-http-add:'))
    if (!encoded) return undefined
    const match = /^mcp-http-add:([^:]+):(.+)$/u.exec(encoded)
    if (!match) return undefined
    try {
      return createMcpHttpAction(decodeURIComponent(match[1]), decodeURIComponent(match[2]))
    } catch {
      return undefined
    }
  }

  function mcpInputErrorText(locale, error) {
    const message = error instanceof Error ? error.message : String(error)
    const english = ({
      '服务名称只能使用 1–32 个字母、数字、下划线或连字符': 'The namespace must use 1–32 letters, numbers, underscores, or hyphens.',
      '请输入不超过 2048 个字符的服务地址': 'Enter an endpoint of at most 2048 characters.',
      '请输入完整的 HTTP 或 HTTPS 地址': 'Enter a complete HTTP or HTTPS endpoint.',
      '服务地址必须使用 HTTP 或 HTTPS': 'The endpoint must use HTTP or HTTPS.',
      '服务地址中不能包含账号或密码': 'The endpoint must not contain a username or password.',
      '服务地址中不能包含 # 片段': 'The endpoint must not contain a URL fragment.',
    })[message] ?? message
    return localText(locale, message, english)
  }

  function createDshComposer(options) {
    if (typeof window.cytoscape !== 'function') throw new Error('Cytoscape renderer is unavailable')

    const context = {
      inspection: undefined,
      serviceId: undefined,
      scope: 'focus',
      selectedNodeId: undefined,
      locale: 'zh',
      theme: 'dark',
      draftBlocked: false,
      draftActionIds: [],
      capabilityQuery: '',
      capabilityFilter: 'all',
    }
    let graph
    let candidateActions = new Map()
    let stateActions = new Map()
    let resizeObserver
    let resizeFrame
    let renderedCompact = false
    let iconLayer
    let iconFrame
    let interactionLayer
    let interactionFrame
    let activePresentationSelection
    let stopPointerInteraction
    let activeMcpDragAction

    function authoringReadOnly() {
      return context.inspection?.authoring?.state === 'read-only'
    }

    function makeAuthoringActionReadOnly(button) {
      button.disabled = true
      button.title = profileAuthoringReadOnlyText(context.locale, context.inspection)
      button.setAttribute('aria-description', button.title)
      return button
    }

    options.container.addEventListener('dragover', event => {
      if (!activeMcpDragAction || authoringReadOnly()) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      options.container.classList.add('mcp-component-drop-target')
    })
    options.container.addEventListener('dragleave', event => {
      if (event.relatedTarget && options.container.contains(event.relatedTarget)) return
      options.container.classList.remove('mcp-component-drop-target')
    })
    options.container.addEventListener('drop', event => {
      if (!activeMcpDragAction || authoringReadOnly()) return
      event.preventDefault()
      const action = activeMcpDragAction
      activeMcpDragAction = undefined
      options.container.classList.remove('mcp-component-drop-target')
      void requestPlan(action)
    })

    function activeService() {
      return context.inspection?.services.find(service => service.id === context.serviceId)
    }

    function compactFocus() {
      return context.scope === 'focus' && options.container.clientWidth < 720
    }

    function storageKey() {
      const installation = context.inspection?.installation
      const profile = context.inspection?.profile
      const identity = installation?.commit ?? installation?.version ?? 'unknown'
      const focus = context.scope === 'focus' ? activeService()?.name ?? 'none' : 'all'
      const viewport = compactFocus() ? 'compact' : 'wide'
      return `${POSITION_PREFIX}.${safeSegment(identity)}.${safeSegment(profile?.name)}.${context.scope}.${viewport}.${safeSegment(focus)}`
    }

    function cleanPosition(value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
      if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return undefined
      return { x: value.x, y: value.y }
    }

    function cleanGroup(value) {
      const position = cleanPosition(value)
      if (!position || !Number.isFinite(value.width) || !Number.isFinite(value.height)) return undefined
      return {
        ...position,
        width: Math.max(GROUP_MIN_WIDTH, value.width),
        height: Math.max(GROUP_MIN_HEIGHT, value.height),
      }
    }

    function cleanRoute(value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
      if (!ROUTE_MODES.has(value.mode)) return undefined
      const route = { mode: value.mode, manual: value.manual === true }
      if (value.axis === 'horizontal' || value.axis === 'vertical') route.axis = value.axis
      if (Number.isFinite(value.turn)) route.turn = value.turn
      const control = cleanPosition(value.control)
      if (control) route.control = control
      return route
    }

    function loadPresentation() {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey()) ?? '{}')
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { positions: {}, groups: {}, routes: {} }
        }
        const positionSource = parsed.positions && typeof parsed.positions === 'object'
          ? parsed.positions
          : parsed
        const positions = {}
        for (const [id, value] of Object.entries(positionSource)) {
          const position = cleanPosition(value)
          if (position) positions[id] = position
        }
        const groups = {}
        for (const [id, value] of Object.entries(parsed.groups ?? {})) {
          const group = cleanGroup(value)
          if (group) groups[id] = group
        }
        const routes = {}
        for (const [id, value] of Object.entries(parsed.routes ?? {})) {
          const route = cleanRoute(value)
          if (route) routes[id] = route
        }
        return { positions, groups, routes }
      } catch {
        return { positions: {}, groups: {}, routes: {} }
      }
    }

    function savePresentation() {
      if (!graph) return
      const positions = {}
      const groups = {}
      const routes = {}
      graph.nodes().forEach(node => {
        if (node.hasClass('intent-target') || node.hasClass('semantic-port')) return
        const position = node.position()
        if (node.hasClass('view-group')) {
          groups[node.id()] = {
            x: Math.round(position.x),
            y: Math.round(position.y),
            width: Math.round(Number(node.data('groupWidth')) || GROUP_MIN_WIDTH),
            height: Math.round(Number(node.data('groupHeight')) || GROUP_MIN_HEIGHT),
          }
          return
        }
        const presentationId = node.data('presentationId') || node.id()
        positions[presentationId] = { x: Math.round(position.x), y: Math.round(position.y) }
      })
      graph.edges().forEach(edge => {
        const route = {
          mode: ROUTE_MODES.has(edge.data('routeMode')) ? edge.data('routeMode') : 'straight',
          manual: edge.data('routeManual') === true,
        }
        if (edge.data('routeAxis') === 'horizontal' || edge.data('routeAxis') === 'vertical') {
          route.axis = edge.data('routeAxis')
        }
        if (Number.isFinite(edge.data('routeTurn'))) route.turn = edge.data('routeTurn')
        const control = cleanPosition(edge.data('routeControl'))
        if (control) route.control = control
        const presentationId = edge.data('presentationId') || edge.id()
        routes[presentationId] = route
      })
      try {
        localStorage.setItem(storageKey(), JSON.stringify({ positions, groups, routes }))
      } catch {
        // Composer layout is disposable presentation state.
      }
    }

    function clearPresentation() {
      try {
        localStorage.removeItem(storageKey())
      } catch {
        // Layout reset still works for the current view when storage is unavailable.
      }
    }

    function friendlyServiceName(name) {
      return ({
        fs: localText(context.locale, '文件访问', 'File access'),
        directoryPicker: localText(context.locale, '目录选择', 'Directory picker'),
        subprocess: localText(context.locale, '命令执行', 'Command execution'),
        webRuntime: localText(context.locale, '网页运行环境', 'Web runtime'),
        webStartup: localText(context.locale, '网页访问', 'Web access'),
      })[name] ?? name
    }

    function friendlyEntryName(entryId, fallback) {
      return ({
        'fs-sandbox': localText(context.locale, '沙箱文件系统', 'Sandbox filesystem'),
        'fs-local': localText(context.locale, '本机文件系统', 'Local filesystem'),
        'tool-fs': localText(context.locale, '文件工具', 'File tools'),
        'tool-str-replace-editor': localText(context.locale, '文本编辑', 'Text editor'),
        'directory-picker': localText(context.locale, '目录选择器', 'Directory picker'),
        'api-gateway': localText(context.locale, '应用界面', 'App interface'),
        subprocess: localText(context.locale, '本机命令', 'Local commands'),
        'bash-sandbox': localText(context.locale, 'Bash 工具', 'Bash tool'),
        'pwsh-sandbox': localText(context.locale, 'PowerShell 工具', 'PowerShell tool'),
        'tool-fs-search': localText(context.locale, '文件搜索', 'File search'),
        'tool-todo': localText(context.locale, '任务清单', 'Task list'),
        'tool-goal': localText(context.locale, '持续目标', 'Long-running goal'),
        'web-startup': localText(context.locale, '网页入口', 'Web entry'),
        webserver: localText(context.locale, 'Web 服务', 'Web server'),
        'web-runtime': localText(context.locale, '网页运行环境', 'Web runtime'),
        connection: localText(context.locale, '浏览器连接', 'Browser connection'),
        agent: 'Agent',
        'agent-default-model': localText(context.locale, '模型', 'Model'),
        llm: localText(context.locale, '模型服务', 'Model service'),
      })[entryId] ?? fallback
    }

    function friendlyNodeLabel(node) {
      if (node.kind === 'service') return friendlyServiceName(node.attributes?.name ?? node.label)
      return friendlyEntryName(node.attributes?.entryId, node.label)
    }

    function nodeData(node) {
      return {
        id: node.id,
        presentationId: node.semanticId ?? node.id,
        label: friendlyNodeLabel(node),
        displayLabel: friendlyNodeLabel(node),
        iconName: graphIconName(node),
        subtitle: node.subtitle,
        kind: node.kind,
        plane: node.plane,
      }
    }

    function graphIconName(node, candidate = false) {
      const entryId = node?.attributes?.entryId
      const serviceName = node?.attributes?.name
      if (candidate) return 'folder-dashed'
      if (entryId === 'agent') return 'robot'
      if (entryId === 'agent-default-model' || entryId === 'llm') return 'cube'
      if (entryId === 'tool-fs') return 'wrench'
      if (entryId === 'tool-str-replace-editor') return 'note-pencil'
      if (serviceName === 'webStartup') return 'globe'
      if (serviceName === 'fs' || entryId === 'fs-sandbox' || entryId === 'fs-local') return 'folder'
      return 'cube'
    }

    function graphDisplayLabel(node) {
      return friendlyNodeLabel(node)
    }

    function focusNodeData(node) {
      const data = nodeData(node)
      data.displayLabel = graphDisplayLabel(node)
      return data
    }

    function exactSubprocessRemovalBoundary(node, service) {
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
        const consumer = context.inspection?.nodes.find(candidate => candidate.id === nodeId)
        const contract = expected.get(consumer?.attributes?.entryId)
        if (!contract || consumer.attributes?.pluginName !== contract.pluginName) return false
        if (contract.disabled === true) return consumer.attributes?.disabled === true
        const symbolic = consumer.attributes?.disabled
        return symbolic?.symbolic === true
          && symbolic.tag === '!!js'
          && symbolic.source === contract.symbolicSource
      })
    }

    function supportedStateAction(node, providerNodeIds = new Set(), service) {
      const fsProviderRemoval = node?.plane === 'resolved'
        && providerNodeIds.has(node.id)
        && node.attributes?.entryId === 'fs-local'
        && node.attributes.providerReplacement?.id === 'fs-local-to-sandbox'
      if (fsProviderRemoval) {
        return {
          nodeId: node.id,
          entryId: 'fs-local',
          label: node.label,
          pluginName: node.subtitle,
          value: true,
          intent: 'remove-provider',
          dependencyAware: true,
          id: 'fs-provider-remove',
          capability: 'ctx.fs',
          repairAvailable: true,
        }
      }
      if (providerNodeIds.has(node?.id) && exactSubprocessRemovalBoundary(node, service)) {
        return {
          nodeId: node.id,
          entryId: 'subprocess',
          label: node.label,
          pluginName: node.subtitle,
          value: true,
          intent: 'remove-provider',
          dependencyAware: true,
          id: 'subprocess-provider-remove',
          capability: 'ctx.subprocess',
          repairAvailable: false,
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
        nodeId: node.id,
        entryId: node.attributes.entryId,
        label: node.label,
        pluginName: node.subtitle,
        value,
        intent: value ? 'disable' : 'enable',
        dependencyAware,
        id: dependencyAware
          ? 'web-startup-disable'
          : `scalar-disabled:${String(value)}:${encodeURIComponent(node.attributes.entryId)}`,
      }
    }

    function appendStateTargets(elements, compact, position) {
      const actions = [...stateActions.values()]
      const providerRemovalActions = actions.filter(action => action.intent === 'remove-provider')
      const oneRemoval = providerRemovalActions.length === 1 ? providerRemovalActions[0] : undefined
      const removalTargetCopy = oneRemoval?.capability === 'ctx.fs'
        ? localText(context.locale, '移除当前 Provider\n先检查 ctx.fs 与修复项', 'Remove current provider\nCheck ctx.fs and repairs first')
        : oneRemoval?.capability === 'ctx.subprocess'
          ? localText(context.locale, '移除当前 Provider\n先检查 ctx.subprocess 边界', 'Remove current provider\nCheck the ctx.subprocess boundary first')
          : localText(context.locale, '移除当前 Provider\n先检查能力影响', 'Remove current provider\nCheck capability impact first')
      const targets = [
        {
          id: ENABLE_TARGET_ID,
          intent: 'enable',
          label: localText(context.locale, '启用', 'Enable'),
          displayLabel: localText(context.locale, '启用\n写入 disabled: false', 'Enable\nWrite disabled: false'),
          x: position.x,
        },
        {
          id: DISABLE_TARGET_ID,
          intent: 'disable',
          label: localText(context.locale, '禁用', 'Disable'),
          displayLabel: localText(context.locale, '禁用\n检查依赖后写入', 'Disable\nWrite after dependency check'),
          x: position.x + (compact ? 0 : 270),
        },
        {
          id: REMOVE_PROVIDER_TARGET_ID,
          intent: 'remove-provider',
          label: localText(context.locale, '移除 Provider', 'Remove provider'),
          displayLabel: removalTargetCopy,
          x: position.x + (compact ? 0 : 540),
        },
      ]
      targets.filter(target => actions.some(action => action.intent === target.intent)).forEach(target => {
        elements.push({
          data: {
            id: target.id,
            label: target.label,
            displayLabel: target.displayLabel,
            kind: 'intent-target',
            plane: 'intent',
          },
          classes: `intent-target state-${target.intent}${compact ? ' compact' : ''}`,
          grabbable: false,
          selectable: false,
          position: { x: target.x, y: position.y },
        })
      })
    }

    function pluginActionUsed(action) {
      return context.draftActionIds.some(actionId => actionId.startsWith(`${action.entryId}-`))
    }

    function pluginGraphLabel(action, adding) {
      if (action.entryId === 'schedule') {
        return localText(
          context.locale,
          authoringReadOnly()
            ? '会话提醒能力\n当前配置只读'
            : adding ? '会话提醒能力\n拖动以加入' : '会话提醒能力\n拖动以移除',
          authoringReadOnly()
            ? 'Session reminders\nConfiguration read-only'
            : adding ? 'Session reminders\nDrag to add' : 'Session reminders\nDrag to remove',
        )
      }
      return localText(
        context.locale,
        authoringReadOnly()
          ? '当前时间能力\n当前配置只读'
          : adding ? '当前时间能力\n拖动以加入' : '当前时间能力\n拖动以移除',
        authoringReadOnly()
          ? 'Current time\nConfiguration read-only'
          : adding ? 'Current time\nDrag to add' : 'Current time\nDrag to remove',
      )
    }

    function appendPluginActions(elements, compact, position) {
      if (context.draftBlocked) return
      const actions = (context.inspection?.pluginActions ?? []).filter(action => !pluginActionUsed(action))
      actions.forEach((action, index) => {
        const candidateId = `composer-candidate:${action.id}`
        const targetId = `${PLUGIN_TARGET_PREFIX}:${action.entryId}`
        const candidatePosition = {
          x: position.x,
          y: position.y + index * (compact ? 106 : 118),
        }
        const candidate = {
          ...action,
          candidateId,
          candidateKind: 'plugin-action',
          pluginTargetId: targetId,
        }
        candidateActions.set(candidateId, candidate)
        const adding = action.mode === 'add-plugin'
        elements.push({
          data: {
            id: candidateId,
            label: action.entryId,
            displayLabel: pluginGraphLabel(action, adding),
            subtitle: action.pluginName,
            kind: 'plugin-action',
            plane: 'candidate',
            actionId: action.id,
            pluginTargetId: targetId,
          },
          classes: `candidate plugin-action${compact ? ' compact' : ''}${authoringReadOnly() ? ' authoring-read-only' : ''}`,
          position: candidatePosition,
          grabbable: !authoringReadOnly(),
        })
        elements.push({
          data: {
            id: targetId,
            label: adding ? 'add' : 'remove',
            displayLabel: localText(
              context.locale,
              adding ? '加入 Harness' : '从 Harness 移除',
              adding ? 'Add to Harness' : 'Remove from Harness',
            ),
            kind: 'intent-target',
            plane: 'intent',
          },
          classes: `intent-target plugin-intent-target${compact ? ' compact' : ''}`,
          grabbable: false,
          selectable: false,
          position: { x: candidatePosition.x + (compact ? 0 : 280), y: candidatePosition.y },
        })
      })
    }

    function focusElements() {
      const inspection = context.inspection
      const service = activeService()
      const compact = compactFocus()
      candidateActions = new Map()
      stateActions = new Map()
      if (!inspection || !service) return []

      const nodesById = new Map(inspection.nodes.map(node => [node.id, node]))
      const providerNodeIds = new Set(service.providers.map(provider => provider.nodeId))
      const required = new Set(service.requiredConsumers)
      const elements = []
      const consumers = [...service.requiredConsumers, ...service.optionalConsumers]
        .map(nodeId => nodesById.get(nodeId))
        .filter(Boolean)
      const serviceNode = nodesById.get(service.id)

      const entryNode = entryId => inspection.nodes.find(node =>
        node.plane === 'resolved' && node.attributes?.entryId === entryId)
      const edge = (id, source, target, className, semanticKind = 'presentation-context', route = {}) => {
        if (!source || !target) return
        const mode = ROUTE_MODES.has(route.mode) ? route.mode : 'straight'
        elements.push({
          data: {
            id,
            source: source.id,
            target: target.id,
            kind: semanticKind,
            defaultRouteMode: mode,
            defaultRouteAxis: route.axis === 'horizontal' ? 'horizontal' : 'vertical',
            defaultRouteRatio: Number.isFinite(route.ratio) ? route.ratio : 0.5,
            defaultCurveDistance: Number.isFinite(route.distance) ? route.distance : 54,
            routeMode: mode,
            routeManual: false,
            ...(route.data ?? {}),
          },
          classes: `${className} ${semanticKind} route-${mode}`,
        })
      }
      const semanticPort = ({
        id,
        host,
        classes,
        position,
        offset,
        role,
        label,
        capability = 'ctx.fs',
        evidenceEdgeId,
      }) => {
        if (!host) return undefined
        elements.push({
          data: {
            id,
            label: capability,
            displayLabel: label ?? '',
            kind: 'semantic-port',
            plane: 'presentation',
            hostNodeId: host.id,
            serviceNodeId: service.id,
            serviceName: service.name,
            capability,
            semanticRole: role,
            offsetX: offset.x,
            offsetY: offset.y,
            ...(evidenceEdgeId ? { evidenceEdgeId } : {}),
          },
          classes: `semantic-port ${classes}`,
          position,
          grabbable: false,
          selectable: false,
        })
        return id
      }
      const group = (id, label, className, position, size, memberIds) => {
        elements.push({
          data: {
            id,
            label,
            displayLabel: label,
            kind: 'view-group',
            plane: 'presentation',
            defaultX: position.x,
            defaultY: position.y,
            defaultGroupWidth: size.width,
            defaultGroupHeight: size.height,
            groupWidth: size.width,
            groupHeight: size.height,
            memberIds: memberIds.filter(Boolean),
          },
          classes: `view-group ${className}`,
          position,
          grabbable: false,
          selectable: true,
        })
      }
      const ordinaryNode = (node, classes, position, extra = {}) => {
        if (!node) return
        const { data: extraData = {}, ...elementExtra } = extra
        elements.push({
          data: {
            ...focusNodeData(node, !compact),
            defaultX: position.x,
            defaultY: position.y,
            ...extraData,
          },
          classes,
          position,
          ...elementExtra,
        })
      }
      const appendReplacement = (provider, current, position, compatiblePort, relationSource = current) => {
        const action = current?.attributes?.providerReplacement
        const isFsCandidate = service.name === 'fs'
          && (action?.mode === 'initial' || action?.mode === 'switch')
        const isPickerCapsule = service.name === 'directoryPicker'
          && (action?.mode === 'pin-browse' || action?.mode === 'reset-auto')
        if (provider.availability !== 'active'
          || action === null
          || typeof action !== 'object'
          || Array.isArray(action)
          || typeof action.id !== 'string'
          || typeof action.replacementEntryId !== 'string'
          || typeof action.replacementPluginName !== 'string'
          || action.service !== service.name
          || (!isFsCandidate && !isPickerCapsule)) return

        const candidateId = `composer-candidate:${action.id}`
        const planned = context.draftActionIds.includes(action.id)
        const capability = service.name === 'directoryPicker' ? 'ctx.directoryPicker' : 'ctx.fs'
        const candidate = {
          ...action,
          candidateId,
          currentNodeId: current.id,
          serviceNodeId: service.id,
          candidateKind: isPickerCapsule ? 'plugin-capsule' : 'provider',
          capability,
          ...(compatiblePort?.id ? { compatiblePortId: compatiblePort.id } : {}),
          planned,
        }
        candidateActions.set(candidateId, candidate)
        const candidateLabel = isPickerCapsule
          ? action.mode === 'pin-browse'
            ? `${action.replacementEntryId} + ${action.companionEntryId}`
            : `${action.replacementEntryId} · official default`
          : friendlyEntryName(action.replacementEntryId, action.replacementEntryId)
        const candidateBaseLabel = isPickerCapsule
          ? action.mode === 'pin-browse'
            ? localText(context.locale, '目录浏览插件组\nHost + Web UI', 'Directory browser capsule\nHost + Web UI')
            : localText(context.locale, '恢复官方自适应\n移除浏览插件组', 'Restore official adaptive\nRemove browser capsule')
          : isFsCandidate
            ? localText(context.locale, `${candidateLabel}\n兼容 ctx.fs`, `${candidateLabel}\nCompatible with ctx.fs`)
            : candidateLabel
        const candidateDisplayLabel = authoringReadOnly()
          ? `${candidateBaseLabel}\n${localText(context.locale, '当前配置只读', 'Configuration read-only')}`
          : candidateBaseLabel
        elements.push({
          data: {
            id: candidateId,
            label: candidateLabel,
            displayLabel: candidateDisplayLabel,
            subtitle: action.replacementPluginName,
            kind: isPickerCapsule ? 'plugin-capsule' : 'provider-candidate',
            plane: 'candidate',
            iconName: isPickerCapsule ? 'folder-simple-plus' : 'folder-dashed',
            actionId: action.id,
            currentNodeId: current.id,
            serviceNodeId: service.id,
            capability,
            ...(compatiblePort?.id ? { compatiblePortId: compatiblePort.id } : {}),
            defaultX: position.x,
            defaultY: position.y,
          },
          classes: `candidate ${isPickerCapsule ? 'plugin-capsule' : 'provider'}${compact ? ' compact' : ''}${planned ? ' planned-candidate' : ''}${authoringReadOnly() ? ' authoring-read-only' : ''}`,
          position,
          grabbable: !planned && !authoringReadOnly(),
        })
        let candidatePortId
        if ((isFsCandidate || isPickerCapsule) && compatiblePort?.candidateOffset) {
          candidatePortId = semanticPort({
            id: `composer-port:candidate:${action.id}`,
            host: { id: candidateId },
            classes: 'provider-output candidate-output',
            position: {
              x: position.x + compatiblePort.candidateOffset.x,
              y: position.y + compatiblePort.candidateOffset.y,
            },
            offset: compatiblePort.candidateOffset,
            role: 'provides-candidate',
            capability,
            label: isPickerCapsule
              ? localText(context.locale, '兼容\nctx.directoryPicker', 'Compatible\nctx.directoryPicker')
              : undefined,
          })
        }
        if (candidatePortId && compatiblePort?.connectCandidate) {
          edge(
            `composer-candidate-edge:${action.id}`,
            { id: candidatePortId },
            { id: compatiblePort.id },
            'candidate-for semantic-contract candidate-compatible',
            'candidate-for',
            { mode: 'straight' },
          )
        } else {
          edge(`composer-candidate-edge:${action.id}`, relationSource, { id: candidateId }, 'candidate-for', 'candidate-for', { mode: 'straight' })
        }
        return candidateId
      }

      if (!compact && service.name === 'fs') {
        const agent = entryNode('agent')
        const model = entryNode('agent-default-model') ?? entryNode('llm')
        const web = inspection.nodes.find(node =>
          node.typed?.kind === 'web-spine-service' && node.typed.name === 'webStartup')
        const providerInputPortId = 'composer-port:fs:provider-input'
        const consumerServicePortId = 'composer-port:fs:consumer-service'
        const activeProviders = service.providers
          .filter(provider => provider.availability === 'active')
          .map(provider => ({ provider, node: nodesById.get(provider.nodeId) }))
          .filter(item => item.node)

        const agentMembers = [agent?.id, model?.id]
        const capabilityMembers = [web?.id, serviceNode?.id]
        const toolMembers = consumers.map(node => node.id)

        ordinaryNode(agent, 'context-node agent-node', { x: 250, y: 100 }, { data: { layoutRole: 'agent' } })
        ordinaryNode(model, 'context-node model-node', { x: 430, y: 100 }, { data: { layoutRole: 'model' } })
        ordinaryNode(web, 'context-node web-node service-context-node', { x: 82, y: 195 }, { data: { layoutRole: 'web' } })
        if (serviceNode) ordinaryNode(serviceNode, `service ${service.availability}`, { x: 260, y: 195 }, { data: { layoutRole: 'service' } })
        semanticPort({
          id: providerInputPortId,
          host: serviceNode,
          classes: 'service-input provider-input compatible-provider-port',
          position: { x: 342, y: 195 },
          offset: { x: 82, y: 0 },
          role: 'accepts-provider',
        })
        semanticPort({
          id: consumerServicePortId,
          host: serviceNode,
          classes: 'service-input consumer-service-port',
          position: { x: 260, y: 238 },
          offset: { x: 0, y: 43 },
          role: 'required-by-consumers',
        })
        activeProviders.forEach(({ provider, node }, index) => {
          const stateAction = context.draftBlocked ? undefined : supportedStateAction(node, providerNodeIds, service)
          if (stateAction) stateActions.set(node.id, stateAction)
          const providerPosition = { x: 480 + index * 150, y: 195 }
          const providerEdge = inspection.edges.find(contract => contract.kind === 'provides-service'
            && contract.from === node.id
            && contract.to === service.id)
          const providerPortId = `composer-port:fs:provider:${node.id}`
          ordinaryNode(
            node,
            `provider ${provider.availability}${stateAction ? ' state-intent-source' : ''}`,
            providerPosition,
            { data: { layoutRole: 'provider' } },
          )
          semanticPort({
            id: providerPortId,
            host: node,
            classes: 'provider-output active-provider-port',
            position: { x: providerPosition.x - 77, y: providerPosition.y },
            offset: { x: -77, y: 0 },
            role: 'provides',
            label: localText(context.locale, '提供 ctx.fs', 'Provides ctx.fs'),
            evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
          })
          capabilityMembers.push(node.id)
          edge(
            `composer-semantic:${providerEdge?.semanticId ?? providerEdge?.id ?? `provides:${node.id}`}`,
            { id: providerPortId },
            { id: providerInputPortId },
            'semantic-contract view-current-provider',
            'provides-service',
            {
              mode: 'straight',
              data: {
                displayLabel: localText(context.locale, '提供 ctx.fs', 'Provides ctx.fs'),
                evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
              },
            },
          )
          appendReplacement(
            provider,
            node,
            { x: 490 + index * 150, y: 315 },
            { id: providerInputPortId, candidateOffset: { x: -82, y: 0 } },
          )
          // The candidate stays independently draggable instead of moving with the resolved capability group.
        })
        consumers.forEach((node, index) => {
          const consumerPosition = { x: index === 0 ? 145 : 340 + (index - 1) * 172, y: 315 }
          const consumerEdge = inspection.edges.find(contract => contract.kind === 'requires-service'
            && contract.from === node.id
            && contract.to === service.id)
          const consumerPortId = `composer-port:fs:consumer:${node.id}`
          ordinaryNode(
            node,
            `${required.has(node.id) ? 'consumer required' : 'consumer optional'} tool-node`,
            consumerPosition,
            { data: { layoutRole: 'tool' } },
          )
          semanticPort({
            id: consumerPortId,
            host: node,
            classes: `consumer-input ${required.has(node.id) ? 'required' : 'optional'}`,
            position: { x: consumerPosition.x, y: consumerPosition.y - 39 },
            offset: { x: 0, y: -39 },
            role: required.has(node.id) ? 'requires' : 'optionally-uses',
            label: required.has(node.id)
              ? localText(context.locale, '需要 ctx.fs', 'Requires ctx.fs')
              : localText(context.locale, '可选 ctx.fs', 'Optional ctx.fs'),
            evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
          })
          edge(
            `composer-semantic:${consumerEdge?.semanticId ?? consumerEdge?.id ?? `requires:${node.id}`}`,
            { id: consumerPortId },
            { id: consumerServicePortId },
            'semantic-contract view-consumer-link',
            required.has(node.id) ? 'requires-service' : 'optionally-uses-service',
            {
              mode: 'orthogonal',
              axis: 'vertical',
              ratio: 0.54,
              data: {
                displayLabel: localText(context.locale, '需要 ctx.fs', 'Requires ctx.fs'),
                evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
              },
            },
          )
        })
        edge('composer-view:agent-model', agent, model, 'view-context-link', 'presentation-context', { mode: 'straight' })
        edge('composer-view:model-fs', model, serviceNode, 'view-context-link', 'presentation-context', { mode: 'orthogonal', axis: 'vertical', ratio: 0.55 })
        edge('composer-view:web-fs', web, serviceNode, 'view-capability-link', 'presentation-context', { mode: 'straight' })

        group(
          'composer-group:agent-core',
          localText(context.locale, 'Agent 核心', 'Agent core'),
          'agent-core',
          { x: 340, y: 100 },
          { width: 390, height: 86 },
          agentMembers,
        )
        group(
          'composer-group:capability-layer',
          localText(context.locale, '能力层（由模型使用）', 'Capability layer · used by the model'),
          'capability-layer',
          { x: 280, y: 195 },
          { width: 632, height: 102 },
          capabilityMembers,
        )
        group(
          'composer-group:tool-layer',
          localText(context.locale, '工具层（由文件访问提供）', 'Tool layer · provided by file access'),
          'tool-layer',
          { x: 242, y: 315 },
          { width: 420, height: 82 },
          toolMembers,
        )
      } else if (!compact && service.name === 'directoryPicker') {
        const capability = 'ctx.directoryPicker'
        const servicePosition = { x: 350, y: 195 }
        const providerInputPortId = 'composer-port:directoryPicker:provider-input'
        const replacementInputPortId = 'composer-port:directoryPicker:replacement-input'
        const consumerServicePortId = 'composer-port:directoryPicker:consumer-service'
        const activeProviders = service.providers
          .filter(provider => provider.availability === 'active')
          .map(provider => ({ provider, node: nodesById.get(provider.nodeId) }))
          .filter(item => item.node)

        if (serviceNode) ordinaryNode(
          serviceNode,
          `service ${service.availability} directory-picker-service`,
          servicePosition,
          {
            data: {
              layoutRole: 'directory-picker-service',
              displayLabel: localText(context.locale, '目录选择能力\nctx.directoryPicker', 'Directory picker\nctx.directoryPicker'),
            },
          },
        )
        semanticPort({
          id: providerInputPortId,
          host: serviceNode,
          classes: 'service-input provider-input current-provider-port',
          position: { x: servicePosition.x - 85, y: servicePosition.y },
          offset: { x: -85, y: 0 },
          role: 'accepts-current-provider',
          capability,
        })
        semanticPort({
          id: replacementInputPortId,
          host: serviceNode,
          classes: 'service-input provider-input compatible-provider-port replacement-provider-port',
          position: { x: servicePosition.x + 85, y: servicePosition.y },
          offset: { x: 85, y: 0 },
          role: 'accepts-replacement',
          capability,
          label: localText(context.locale, '拖到这里', 'Drop here'),
        })
        semanticPort({
          id: consumerServicePortId,
          host: serviceNode,
          classes: 'service-input consumer-service-port',
          position: { x: servicePosition.x, y: servicePosition.y + 45 },
          offset: { x: 0, y: 45 },
          role: 'required-by-consumers',
          capability,
        })

        activeProviders.forEach(({ provider, node }, index) => {
          const providerPosition = { x: 100, y: 195 + index * 82 }
          const providerEdge = inspection.edges.find(contract => contract.kind === 'provides-service'
            && contract.from === node.id
            && contract.to === service.id)
          const providerPortId = `composer-port:directoryPicker:provider:${node.id}`
          ordinaryNode(
            node,
            `provider ${provider.availability} directory-picker-provider`,
            providerPosition,
            {
              data: {
                layoutRole: 'directory-picker-provider',
                displayLabel: node.attributes?.entryId === 'directory-picker-browse'
                  ? localText(context.locale, '当前提供者\n应用内浏览 Host', 'Current provider\nIn-app browser Host')
                  : localText(context.locale, '当前提供者\n启动时自动选择', 'Current provider\nAdaptive at startup'),
              },
            },
          )
          semanticPort({
            id: providerPortId,
            host: node,
            classes: 'provider-output active-provider-port',
            position: { x: providerPosition.x + 78, y: providerPosition.y },
            offset: { x: 78, y: 0 },
            role: 'provides',
            capability,
            label: localText(context.locale, '提供\nctx.directoryPicker', 'Provides\nctx.directoryPicker'),
            evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
          })
          edge(
            `composer-semantic:${providerEdge?.semanticId ?? providerEdge?.id ?? `provides:${node.id}`}`,
            { id: providerPortId },
            { id: providerInputPortId },
            'semantic-contract view-current-provider',
            'provides-service',
            {
              mode: 'straight',
              data: {
                displayLabel: localText(context.locale, '提供 ctx.directoryPicker', 'Provides ctx.directoryPicker'),
                evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
              },
            },
          )
          appendReplacement(
            provider,
            node,
            { x: 620, y: 195 + index * 82 },
            {
              id: replacementInputPortId,
              capability,
              candidateOffset: { x: -102, y: 0 },
              connectCandidate: true,
            },
            serviceNode,
          )
        })

        consumers.forEach((node, index) => {
          const consumerPosition = { x: 350 + index * 190, y: 315 }
          const consumerEdge = inspection.edges.find(contract => contract.kind === 'requires-service'
            && contract.from === node.id
            && contract.to === service.id)
          const consumerPortId = `composer-port:directoryPicker:consumer:${node.id}`
          ordinaryNode(
            node,
            `${required.has(node.id) ? 'consumer required' : 'consumer optional'} directory-picker-consumer`,
            consumerPosition,
            { data: { layoutRole: 'directory-picker-consumer' } },
          )
          semanticPort({
            id: consumerPortId,
            host: node,
            classes: `consumer-input ${required.has(node.id) ? 'required' : 'optional'}`,
            position: { x: consumerPosition.x, y: consumerPosition.y - 40 },
            offset: { x: 0, y: -40 },
            role: required.has(node.id) ? 'requires' : 'optionally-uses',
            capability,
            label: required.has(node.id)
              ? localText(context.locale, '需要\nctx.directoryPicker', 'Requires\nctx.directoryPicker')
              : localText(context.locale, '可选\nctx.directoryPicker', 'Optional\nctx.directoryPicker'),
            evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
          })
          edge(
            `composer-semantic:${consumerEdge?.semanticId ?? consumerEdge?.id ?? `requires:${node.id}`}`,
            { id: consumerPortId },
            { id: consumerServicePortId },
            'semantic-contract view-consumer-link',
            required.has(node.id) ? 'requires-service' : 'optionally-uses-service',
            {
              mode: 'straight',
              data: {
                displayLabel: localText(context.locale, '需要 ctx.directoryPicker', 'Requires ctx.directoryPicker'),
                evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
              },
            },
          )
        })
      } else {
        const compactSemantic = compact && (service.name === 'fs' || service.name === 'directoryPicker')
        const semanticCapability = service.name === 'directoryPicker' ? 'ctx.directoryPicker' : 'ctx.fs'
        const servicePosition = compact ? { x: 200, y: 270 } : { x: 280, y: 230 }
        const providerInputPortId = compactSemantic ? `composer-port:${service.name}:provider-input` : undefined
        const consumerServicePortId = compactSemantic ? `composer-port:${service.name}:consumer-service` : undefined
        const providers = service.providers
          .map(provider => ({ provider, node: nodesById.get(provider.nodeId) }))
          .filter(item => item.node)
        if (serviceNode) ordinaryNode(
          serviceNode,
          `service ${service.availability}${compact ? ' compact' : ''}`,
          servicePosition,
        )
        if (compactSemantic) {
          semanticPort({
            id: providerInputPortId,
            host: serviceNode,
            classes: 'service-input provider-input compatible-provider-port',
            position: { x: servicePosition.x, y: servicePosition.y - 55 },
            offset: { x: 0, y: -55 },
            role: 'accepts-provider',
            capability: semanticCapability,
          })
          semanticPort({
            id: consumerServicePortId,
            host: serviceNode,
            classes: 'service-input consumer-service-port',
            position: { x: servicePosition.x, y: servicePosition.y + 55 },
            offset: { x: 0, y: 55 },
            role: 'required-by-consumers',
            capability: semanticCapability,
          })
        }
        providers.forEach(({ provider, node }, index) => {
          const stateAction = context.draftBlocked ? undefined : supportedStateAction(node, providerNodeIds, service)
          if (stateAction) stateActions.set(node.id, stateAction)
          const providerPosition = compact ? { x: 200, y: 90 + index * 88 } : { x: 490, y: 230 + index * 88 }
          ordinaryNode(
            node,
            `provider ${provider.availability}${compact ? ' compact' : ''}${stateAction ? ' state-intent-source' : ''}`,
            providerPosition,
          )
          if (compactSemantic && provider.availability === 'active') {
            const providerEdge = inspection.edges.find(contract => contract.kind === 'provides-service'
              && contract.from === node.id
              && contract.to === service.id)
            const providerPortId = `composer-port:${service.name}:provider:${node.id}`
            semanticPort({
              id: providerPortId,
              host: node,
              classes: 'provider-output active-provider-port',
              position: { x: providerPosition.x, y: providerPosition.y + 43 },
              offset: { x: 0, y: 43 },
              role: 'provides',
              capability: semanticCapability,
              label: localText(context.locale, `提供 ${semanticCapability}`, `Provides ${semanticCapability}`),
              evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
            })
            edge(
              `composer-semantic:${providerEdge?.semanticId ?? providerEdge?.id ?? `provides:${node.id}`}`,
              { id: providerPortId },
              { id: providerInputPortId },
              'semantic-contract view-current-provider',
              'provides-service',
              {
                mode: 'orthogonal',
                axis: 'vertical',
                ratio: 0.5,
                data: {
                  displayLabel: localText(context.locale, `提供 ${semanticCapability}`, `Provides ${semanticCapability}`),
                  evidenceEdgeId: providerEdge?.semanticId ?? providerEdge?.id,
                },
              },
            )
          }
          appendReplacement(
            provider,
            node,
            compact ? { x: 200, y: 520 } : { x: 660, y: 230 + index * 88 },
            compactSemantic
              ? { id: providerInputPortId, capability: semanticCapability, candidateOffset: { x: 0, y: -43 } }
              : undefined,
          )
        })
        consumers.forEach((node, index) => {
          const consumerPosition = compact
            ? { x: index % 2 === 0 ? 110 : 290, y: 390 + Math.floor(index / 2) * 88 }
            : { x: 230 + index * 200, y: 455 }
          ordinaryNode(
            node,
            `${required.has(node.id) ? 'consumer required' : 'consumer optional'}${compact ? ' compact' : ''}`,
            consumerPosition,
          )
          if (compactSemantic) {
            const consumerEdge = inspection.edges.find(contract => contract.kind === 'requires-service'
              && contract.from === node.id
              && contract.to === service.id)
            const consumerPortId = `composer-port:${service.name}:consumer:${node.id}`
            semanticPort({
              id: consumerPortId,
              host: node,
              classes: `consumer-input ${required.has(node.id) ? 'required' : 'optional'}`,
              position: { x: consumerPosition.x, y: consumerPosition.y - 43 },
              offset: { x: 0, y: -43 },
              role: required.has(node.id) ? 'requires' : 'optionally-uses',
              capability: semanticCapability,
              label: required.has(node.id)
                ? localText(context.locale, `需要 ${semanticCapability}`, `Requires ${semanticCapability}`)
                : localText(context.locale, `可选 ${semanticCapability}`, `Optional ${semanticCapability}`),
              evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
            })
            edge(
              `composer-semantic:${consumerEdge?.semanticId ?? consumerEdge?.id ?? `requires:${node.id}`}`,
              { id: consumerPortId },
              { id: consumerServicePortId },
              'semantic-contract view-consumer-link',
              required.has(node.id) ? 'requires-service' : 'optionally-uses-service',
              {
                mode: 'orthogonal',
                axis: 'vertical',
                ratio: 0.5,
                data: {
                  displayLabel: localText(context.locale, `需要 ${semanticCapability}`, `Requires ${semanticCapability}`),
                  evidenceEdgeId: consumerEdge?.semanticId ?? consumerEdge?.id,
                },
              },
            )
          } else {
            edge(`composer-view:consumer:${node.id}`, serviceNode, node, 'view-consumer-link', 'requires-service')
          }
        })
        if (!compactSemantic) {
          providers.filter(item => item.provider.availability === 'active').forEach(({ node }) => {
            edge(`composer-view:provider:${node.id}`, serviceNode, node, 'view-current-provider', 'provides-service')
          })
        }
      }

      if (!compact && !context.draftBlocked) {
        (inspection.pluginActions ?? [])
          .filter(action => !pluginActionUsed(action))
          .forEach(action => {
            const candidateId = `composer-candidate:${action.id}`
            candidateActions.set(candidateId, {
              ...action,
              candidateId,
              candidateKind: 'plugin-action',
              pluginTargetId: `${PLUGIN_TARGET_PREFIX}:${action.entryId}`,
            })
          })
      }

      if (compact) {
        appendStateTargets(elements, true, { x: 200, y: 480 })
        appendPluginActions(elements, true, { x: 200, y: 610 })
      } else {
        appendStateTargets(elements, false, { x: 120, y: 80 })
      }
      return elements
    }

    function resolvedElements() {
      const inspection = context.inspection
      candidateActions = new Map()
      stateActions = new Map()
      if (!inspection) return []
      const resolvedNodes = inspection.nodes.filter(node => node.plane === 'resolved')
      const ids = new Set(resolvedNodes.map(node => node.id))
      const providerNodeIds = new Set(inspection.services.flatMap(service =>
        service.providers.map(provider => provider.nodeId)))
      const columns = Math.max(1, Math.ceil(Math.sqrt(resolvedNodes.length)))
      const elements = resolvedNodes.map((node, index) => {
        const classes = [node.kind]
        if (node.kind === 'service') classes.push('service')
        if (node.kind === 'execution-world') classes.push('execution-world')
        if (node.attributes?.disabled === true) classes.push('disabled')
        const providerService = inspection.services.find(service =>
          service.providers.some(provider => provider.nodeId === node.id))
        const stateAction = context.draftBlocked
          ? undefined
          : supportedStateAction(node, providerNodeIds, providerService)
        if (stateAction) {
          stateActions.set(node.id, stateAction)
          classes.push('state-intent-source')
        }
        return {
          data: nodeData(node),
          classes: [...classes, ...(stateAction && authoringReadOnly() ? ['authoring-read-only'] : [])].join(' '),
          position: { x: 120 + (index % columns) * 190, y: 220 + Math.floor(index / columns) * 100 },
        }
      })
      inspection.edges
        .filter(edge => edge.plane === 'resolved' && ids.has(edge.from) && ids.has(edge.to))
        .forEach(edge => elements.push({
          data: {
            id: edge.id,
            presentationId: edge.semanticId ?? edge.id,
            source: edge.from,
            target: edge.to,
            kind: edge.kind,
            defaultRouteMode: 'curve',
            defaultRouteAxis: 'vertical',
            defaultRouteRatio: 0.5,
            defaultCurveDistance: 42,
            routeMode: 'curve',
            routeManual: false,
          },
          classes: `${edge.kind} route-curve`,
        }))
      appendStateTargets(elements, false, { x: 120, y: 80 })
      appendPluginActions(elements, false, { x: 500, y: 80 })
      return elements
    }

    function palette() {
      const root = getComputedStyle(document.documentElement)
      const read = (name, fallback) => root.getPropertyValue(name).trim() || fallback
      return {
        panel: read('--panel', context.theme === 'light' ? '#ffffff' : '#111925'),
        surface: read('--surface', context.theme === 'light' ? '#f7f9fc' : '#0b111a'),
        surfaceStrong: read('--surface-strong', context.theme === 'light' ? '#e8eef7' : '#172338'),
        line: read('--line', context.theme === 'light' ? '#c8d2df' : '#273449'),
        muted: read('--muted', context.theme === 'light' ? '#536274' : '#92a2b8'),
        text: read('--text', context.theme === 'light' ? '#172231' : '#e8eef8'),
        primary: read('--primary', context.theme === 'light' ? '#2f6fdb' : '#6c9dff'),
        accent: read('--accent', context.theme === 'light' ? '#087c69' : '#50d2bd'),
        warning: read('--warning', context.theme === 'light' ? '#9a5c05' : '#f2bd65'),
        danger: read('--danger', context.theme === 'light' ? '#b42335' : '#ff818a'),
      }
    }

    function graphStyles() {
      const colors = palette()
      return [
        {
          selector: 'node',
          style: {
            label: 'data(displayLabel)',
            'font-family': 'Inter, "Microsoft YaHei", "PingFang SC", sans-serif',
            'font-size': 15,
            'font-weight': 500,
            color: colors.text,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-margin-x': 13,
            'text-wrap': 'wrap',
            'text-max-width': 138,
            'min-zoomed-font-size': 8,
            width: 140,
            height: 60,
            shape: 'round-rectangle',
            'background-color': colors.panel,
            'border-width': 1.2,
            'border-color': colors.line,
            'overlay-opacity': 0,
            'z-index': 10,
          },
        },
        {
          selector: 'node.view-group',
          style: {
            events: 'no',
            label: 'data(displayLabel)',
            shape: 'round-rectangle',
            width: 'data(groupWidth)',
            height: 'data(groupHeight)',
            'background-color': colors.surface,
            'background-opacity': 0.18,
            'border-width': 1,
            'border-color': colors.accent,
            'border-opacity': 0.34,
            color: colors.accent,
            'font-size': 14,
            'font-weight': 600,
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': 8,
            'text-margin-x': 0,
            'text-background-color': colors.surface,
            'text-background-opacity': 1,
            'text-background-padding': 6,
            'z-index': 0,
          },
        },
        {
          selector: 'node.view-group:selected',
          style: {
            'border-width': 2,
            'border-opacity': 0.9,
            'background-opacity': 0.28,
          },
        },
        {
          selector: 'node.service',
          style: {
            width: 150,
            height: 72,
            'font-size': 15,
            'font-weight': 600,
            'background-color': colors.surfaceStrong,
            'border-width': 3,
            'border-color': colors.primary,
          },
        },
        {
          selector: 'node.service.directory-picker-service',
          style: {
            width: 168,
            'font-size': 13,
            'text-max-width': 148,
          },
        },
        {
          selector: 'node.provider.active',
          style: {
            width: 140,
            height: 60,
            'border-color': colors.line,
            'background-color': colors.panel,
          },
        },
        {
          selector: 'node.provider.directory-picker-provider',
          style: {
            width: 156,
            height: 66,
            'font-size': 13,
            'text-max-width': 136,
          },
        },
        {
          selector: 'node.consumer',
          style: {
            width: 152,
            height: 64,
          },
        },
        {
          selector: 'node.agent-node',
          style: {
            width: 144,
            height: 58,
            'border-color': colors.accent,
            'background-color': colors.surfaceStrong,
          },
        },
        {
          selector: 'node.model-node',
          style: {
            width: 126,
            height: 58,
            'border-color': colors.primary,
            'background-color': colors.surfaceStrong,
          },
        },
        {
          selector: 'node.web-node',
          style: { width: 140, height: 64 },
        },
        {
          selector: 'node.tool-node',
          style: { width: 152, height: 64 },
        },
        {
          selector: 'node.disabled',
          style: { opacity: 0.56 },
        },
        {
          selector: 'node.optional',
          style: { 'border-style': 'dashed' },
        },
        {
          selector: 'node.candidate',
          style: {
            width: 132,
            height: 60,
            'border-width': 2,
            'border-style': 'dashed',
            'border-color': colors.text,
            'background-color': colors.surface,
            color: colors.text,
          },
        },
        {
          selector: 'node.candidate.planned-candidate',
          style: {
            'border-color': colors.text,
            color: colors.text,
          },
        },
        {
          selector: 'node.candidate.provider',
          style: {
            width: 150,
            height: 70,
            'font-size': 13,
            'text-max-width': 124,
          },
        },
        {
          selector: 'node.candidate.plugin-capsule',
          style: {
            width: 184,
            height: 76,
            'font-size': 13,
            'font-weight': 600,
            'text-max-width': 156,
            'border-color': colors.accent,
            color: colors.accent,
          },
        },
        {
          selector: 'node.candidate.plugin-action',
          style: {
            'border-color': colors.accent,
            color: colors.accent,
          },
        },
        {
          selector: 'node.authoring-read-only',
          style: {
            opacity: 0.68,
            'border-style': 'dashed',
            'border-color': colors.line,
            color: colors.muted,
          },
        },
        {
          selector: 'node.semantic-port',
          style: {
            label: 'data(displayLabel)',
            'font-size': 9,
            'font-weight': 700,
            color: colors.text,
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': -7,
            'text-background-color': colors.surface,
            'text-background-opacity': 0.92,
            'text-background-padding': 2,
            width: 16,
            height: 16,
            shape: 'ellipse',
            'background-color': colors.surfaceStrong,
            'border-width': 3,
            'border-color': colors.primary,
            'overlay-opacity': 0,
            'z-index': 34,
          },
        },
        {
          selector: 'node.semantic-port.provider-output, node.semantic-port.provider-input',
          style: {
            'border-color': colors.accent,
          },
        },
        {
          selector: 'node.semantic-port.active-provider-port',
          style: {
            'background-color': colors.accent,
          },
        },
        {
          selector: 'node.semantic-port.consumer-input.required',
          style: {
            'background-color': colors.primary,
          },
        },
        {
          selector: 'node.semantic-port.candidate-output',
          style: {
            'border-style': 'dashed',
            'background-color': colors.surface,
          },
        },
        {
          selector: 'node.execution-world',
          style: {
            shape: 'round-hexagon',
            'border-color': colors.accent,
          },
        },
        {
          selector: 'node.eligible-drop-target',
          style: {
            'border-width': 3,
            'border-style': 'dashed',
            'border-color': colors.primary,
          },
        },
        {
          selector: 'node.active-drop-target',
          style: {
            'border-width': 4,
            'border-style': 'solid',
            'border-color': colors.accent,
            'background-color': colors.surfaceStrong,
          },
        },
        {
          selector: 'node.semantic-port.eligible-drop-target',
          style: {
            width: 28,
            height: 28,
            'border-width': 4,
            'border-style': 'solid',
            'border-color': colors.accent,
            'background-color': colors.surfaceStrong,
          },
        },
        {
          selector: 'node.semantic-port.active-drop-target',
          style: {
            width: 34,
            height: 34,
            'border-width': 5,
            'border-color': colors.accent,
            'background-color': colors.accent,
          },
        },
        {
          selector: 'node.compact',
          style: {
            width: 170,
            height: 72,
            'font-size': 13,
            'text-max-width': 146,
          },
        },
        {
          selector: 'node.intent-target',
          style: {
            display: 'none',
            width: 224,
            height: 82,
            'border-width': 3,
            'border-style': 'dashed',
            'border-color': colors.danger,
            'background-color': colors.surfaceStrong,
            color: colors.danger,
          },
        },
        {
          selector: 'node.intent-target.visible-intent-target',
          style: {
            display: 'element',
          },
        },
        {
          selector: 'node.intent-target.active-drop-target',
          style: {
            'border-style': 'solid',
            'background-color': colors.danger,
            color: colors.panel,
          },
        },
        {
          selector: 'node.intent-target.state-enable',
          style: {
            'border-color': colors.accent,
            color: colors.accent,
          },
        },
        {
          selector: 'node.intent-target.state-enable.active-drop-target',
          style: {
            'background-color': colors.accent,
            color: colors.panel,
          },
        },
        {
          selector: 'node.intent-target.plugin-intent-target',
          style: {
            'border-color': colors.accent,
            color: colors.accent,
          },
        },
        {
          selector: 'node.intent-target.plugin-intent-target.active-drop-target',
          style: {
            'background-color': colors.accent,
            color: colors.panel,
          },
        },
        {
          selector: 'node.intent-target.compact',
          style: {
            width: 170,
            height: 72,
          },
        },
        {
          selector: 'node.service.compact',
          style: {
            width: 130,
            height: 96,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': colors.primary,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': colors.line,
            'source-arrow-color': colors.line,
            'target-arrow-color': colors.line,
            'source-arrow-shape': 'circle',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.62,
            'line-cap': 'round',
            'curve-style': 'straight',
            opacity: 0.72,
            'z-index': 5,
          },
        },
        {
          selector: 'edge.semantic-contract',
          style: {
            label: '',
            'font-size': 10,
            'font-weight': 600,
            color: colors.text,
            'text-rotation': 'none',
            'text-margin-y': -14,
            'text-background-color': colors.surface,
            'text-background-opacity': 0.94,
            'text-background-padding': 3,
            'text-border-color': colors.line,
            'text-border-width': 1,
            'text-border-opacity': 0.72,
            opacity: 0.92,
          },
        },
        {
          selector: 'edge.semantic-contract.requires-service, edge.semantic-contract.optionally-uses-service',
          style: {
            'text-margin-y': -15,
          },
        },
        {
          selector: 'edge.route-straight',
          style: {
            'curve-style': 'straight',
          },
        },
        {
          selector: 'edge.route-orthogonal',
          style: {
            'curve-style': 'segments',
            'edge-distances': 'node-position',
            'segment-distances': 'data(routeDistances)',
            'segment-weights': 'data(routeWeights)',
            'segment-radii': [12],
            'radius-type': 'influence-radius',
          },
        },
        {
          selector: 'edge.route-curve',
          style: {
            'curve-style': 'unbundled-bezier',
            'edge-distances': 'node-position',
            'control-point-distances': 'data(routeDistances)',
            'control-point-weights': 'data(routeWeights)',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            width: 3,
            opacity: 1,
            'underlay-color': colors.primary,
            'underlay-opacity': 0.13,
            'underlay-padding': 6,
          },
        },
        {
          selector: 'edge.view-context-link',
          style: {
            width: 1.7,
            'line-color': colors.muted,
            'target-arrow-color': colors.muted,
            opacity: 0.62,
          },
        },
        {
          selector: 'edge.view-capability-link, edge.view-consumer-link',
          style: {
            width: 1.7,
            'line-color': colors.muted,
            'target-arrow-color': colors.muted,
            opacity: 0.72,
          },
        },
        {
          selector: 'edge.view-current-provider',
          style: {
            width: 1.9,
            'line-color': colors.accent,
            'target-arrow-color': colors.accent,
            opacity: 0.75,
          },
        },
        {
          selector: 'edge.provides-service',
          style: {
            width: 2,
            'line-color': colors.accent,
            'target-arrow-color': colors.accent,
          },
        },
        {
          selector: 'edge.requires-service',
          style: {
            width: 1.8,
            'line-color': colors.primary,
            'target-arrow-color': colors.primary,
          },
        },
        {
          selector: 'edge.candidate-for',
          style: {
            width: 2,
            'line-style': 'dashed',
            'line-color': colors.primary,
            'target-arrow-color': colors.primary,
            opacity: 0.48,
          },
        },
      ]
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    }

    function routeControlPoints(edge) {
      const source = edge.source().position()
      const target = edge.target().position()
      const mode = ROUTE_MODES.has(edge.data('routeMode')) ? edge.data('routeMode') : 'straight'
      if (mode === 'straight') return []
      if (mode === 'curve') {
        const saved = cleanPosition(edge.data('routeControl'))
        if (saved) return [saved]
        const dx = target.x - source.x
        const dy = target.y - source.y
        const length = Math.max(1, Math.hypot(dx, dy))
        const distance = Number(edge.data('defaultCurveDistance')) || 54
        return [{
          x: source.x + dx * 0.5 - dy / length * distance,
          y: source.y + dy * 0.5 + dx / length * distance,
        }]
      }
      const axis = edge.data('routeAxis') === 'horizontal' ? 'horizontal' : 'vertical'
      const ratio = Number.isFinite(edge.data('defaultRouteRatio'))
        ? edge.data('defaultRouteRatio')
        : 0.5
      const storedTurn = edge.data('routeTurn')
      const turn = Number.isFinite(storedTurn)
        ? storedTurn
        : axis === 'vertical'
          ? source.y + (target.y - source.y) * ratio
          : source.x + (target.x - source.x) * ratio
      return axis === 'vertical'
        ? [{ x: source.x, y: turn }, { x: target.x, y: turn }]
        : [{ x: turn, y: source.y }, { x: turn, y: target.y }]
    }

    function controlOffsets(edge, points) {
      const source = edge.source().position()
      const target = edge.target().position()
      const dx = target.x - source.x
      const dy = target.y - source.y
      const lengthSquared = Math.max(1, dx * dx + dy * dy)
      const length = Math.sqrt(lengthSquared)
      const normal = { x: -dy / length, y: dx / length }
      const weights = []
      const distances = []
      points.forEach(point => {
        const relative = { x: point.x - source.x, y: point.y - source.y }
        const weight = (relative.x * dx + relative.y * dy) / lengthSquared
        const base = { x: source.x + dx * weight, y: source.y + dy * weight }
        weights.push(Number(weight.toFixed(4)))
        distances.push(Number(((point.x - base.x) * normal.x + (point.y - base.y) * normal.y).toFixed(2)))
      })
      return { weights, distances }
    }

    function applyEdgeRoute(edge) {
      if (!edge || edge.empty()) return
      const mode = ROUTE_MODES.has(edge.data('routeMode')) ? edge.data('routeMode') : 'straight'
      edge.removeClass('route-straight route-orthogonal route-curve')
      edge.addClass(`route-${mode}`)
      const offsets = controlOffsets(edge, routeControlPoints(edge))
      edge.data('routeWeights', offsets.weights)
      edge.data('routeDistances', offsets.distances)
    }

    function applyAllEdgeRoutes() {
      graph?.edges().forEach(applyEdgeRoute)
    }

    function refreshConnectedRoutes(node) {
      if (!graph || !node || node.empty()) return
      node.connectedEdges().forEach(applyEdgeRoute)
      scheduleInteractionLayer()
    }

    function syncSemanticPorts(hostNode) {
      if (!graph || !hostNode || hostNode.empty() || hostNode.hasClass('semantic-port')) return
      const hostPosition = hostNode.position()
      graph.nodes('.semantic-port').filter(port => port.data('hostNodeId') === hostNode.id()).forEach(port => {
        const next = {
          x: hostPosition.x + (Number(port.data('offsetX')) || 0),
          y: hostPosition.y + (Number(port.data('offsetY')) || 0),
        }
        const current = port.position()
        if (Math.abs(current.x - next.x) > 0.01 || Math.abs(current.y - next.y) > 0.01) port.position(next)
      })
    }

    function syncAllSemanticPorts() {
      if (!graph) return
      graph.nodes().filter(node => !node.hasClass('semantic-port')).forEach(syncSemanticPorts)
    }

    function restoreEdgeRoute(edge, savedRoute) {
      const defaultMode = ROUTE_MODES.has(edge.data('defaultRouteMode'))
        ? edge.data('defaultRouteMode')
        : 'straight'
      const route = savedRoute ?? { mode: defaultMode, manual: false }
      edge.data('routeMode', ROUTE_MODES.has(route.mode) ? route.mode : defaultMode)
      edge.data('routeManual', route.manual === true)
      edge.data('routeAxis', route.axis === 'horizontal'
        ? 'horizontal'
        : edge.data('defaultRouteAxis') === 'horizontal' ? 'horizontal' : 'vertical')
      if (Number.isFinite(route.turn)) edge.data('routeTurn', route.turn)
      else edge.removeData('routeTurn')
      if (cleanPosition(route.control)) edge.data('routeControl', route.control)
      else edge.removeData('routeControl')
      applyEdgeRoute(edge)
    }

    function setEdgeRouteMode(edge, mode) {
      if (!edge || edge.empty() || !ROUTE_MODES.has(mode)) return
      const source = edge.source().position()
      const target = edge.target().position()
      edge.data('routeMode', mode)
      edge.data('routeManual', true)
      if (mode === 'orthogonal') {
        const axis = Math.abs(target.y - source.y) >= Math.abs(target.x - source.x)
          ? 'vertical'
          : 'horizontal'
        edge.data('routeAxis', axis)
        edge.data('routeTurn', axis === 'vertical'
          ? source.y + (target.y - source.y) * 0.5
          : source.x + (target.x - source.x) * 0.5)
        edge.removeData('routeControl')
      } else if (mode === 'curve') {
        edge.removeData('routeTurn')
        edge.data('routeControl', routeControlPoints(edge)[0])
      } else {
        edge.removeData('routeTurn')
        edge.removeData('routeControl')
      }
      applyEdgeRoute(edge)
      savePresentation()
      renderInteractionLayer()
      setStatus(
        'layout',
        '连线路径已仅保存在本机；DSH 配置没有改变。',
        'The connection route was saved locally only; the DSH configuration did not change.',
      )
    }

    function flipOrthogonalRoute(edge) {
      if (!edge || edge.empty()) return
      if (edge.data('routeMode') !== 'orthogonal') setEdgeRouteMode(edge, 'orthogonal')
      const source = edge.source().position()
      const target = edge.target().position()
      const axis = edge.data('routeAxis') === 'vertical' ? 'horizontal' : 'vertical'
      edge.data('routeAxis', axis)
      edge.data('routeTurn', axis === 'vertical'
        ? source.y + (target.y - source.y) * 0.5
        : source.x + (target.x - source.x) * 0.5)
      edge.data('routeManual', true)
      applyEdgeRoute(edge)
      savePresentation()
      renderInteractionLayer()
    }

    function resetEdgeRoute(edge) {
      if (!edge || edge.empty()) return
      restoreEdgeRoute(edge)
      savePresentation()
      renderInteractionLayer()
      setStatus(
        'layout',
        '已恢复这条连线的自动路径；DSH 配置没有改变。',
        'This connection now uses its automatic route; the DSH configuration did not change.',
      )
    }

    function groupMemberNodes(group) {
      if (!graph || !group || group.empty()) return []
      const ids = Array.isArray(group.data('memberIds')) ? group.data('memberIds') : []
      return ids
        .map(id => graph.getElementById(id))
        .filter(node => node.nonempty())
    }

    function fitGroupToMembers(group) {
      const members = groupMemberNodes(group)
      if (members.length === 0) return
      const boxes = members.map(node => node.boundingBox({ includeLabels: true, includeOverlays: false }))
      const bounds = boxes.reduce((result, box) => ({
        x1: Math.min(result.x1, box.x1),
        y1: Math.min(result.y1, box.y1),
        x2: Math.max(result.x2, box.x2),
        y2: Math.max(result.y2, box.y2),
      }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity })
      group.data('groupWidth', Math.max(GROUP_MIN_WIDTH, bounds.x2 - bounds.x1 + 76))
      group.data('groupHeight', Math.max(GROUP_MIN_HEIGHT, bounds.y2 - bounds.y1 + 72))
      group.position({ x: (bounds.x1 + bounds.x2) / 2, y: (bounds.y1 + bounds.y2) / 2 + 8 })
      savePresentation()
      renderInteractionLayer()
      setStatus(
        'layout',
        '分组边界已适应内部节点，并仅保存在本机。',
        'The group now fits its nodes and is saved locally only.',
      )
    }

    function canvasPointFromClient(clientX, clientY) {
      const bounds = options.container.getBoundingClientRect()
      const pan = graph.pan()
      const zoom = graph.zoom()
      return {
        x: (clientX - bounds.left - pan.x) / zoom,
        y: (clientY - bounds.top - pan.y) / zoom,
      }
    }

    function beginPointerInteraction(onMove, onFinish) {
      stopPointerInteraction?.()
      const move = event => onMove(event)
      const finish = event => {
        cleanup()
        onFinish?.(event)
      }
      const cleanup = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', finish)
        window.removeEventListener('pointercancel', finish)
        if (stopPointerInteraction === cleanup) stopPointerInteraction = undefined
      }
      stopPointerInteraction = cleanup
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', finish)
      window.addEventListener('pointercancel', finish)
    }

    function beginEdgeHandleDrag(event, edge) {
      event.preventDefault()
      event.stopPropagation()
      event.target.closest('[data-edge-route-handle]')?.focus({ preventScroll: true })
      edge.data('routeManual', true)
      beginPointerInteraction(moveEvent => {
        const point = canvasPointFromClient(moveEvent.clientX, moveEvent.clientY)
        if (edge.data('routeMode') === 'orthogonal') {
          edge.data('routeTurn', edge.data('routeAxis') === 'horizontal' ? point.x : point.y)
        } else if (edge.data('routeMode') === 'curve') {
          edge.data('routeControl', point)
        }
        applyEdgeRoute(edge)
        renderInteractionLayer()
      }, () => {
        savePresentation()
        setStatus(
          'layout',
          '连线控制点已更新，并仅保存在本机。',
          'The connection control point was updated and saved locally only.',
        )
      })
    }

    function beginGroupResize(event, group, corner) {
      event.preventDefault()
      event.stopPropagation()
      event.target.closest('[data-group-resize-handle]')?.focus({ preventScroll: true })
      const startPointer = canvasPointFromClient(event.clientX, event.clientY)
      const startPosition = { ...group.position() }
      const startWidth = Number(group.data('groupWidth')) || GROUP_MIN_WIDTH
      const startHeight = Number(group.data('groupHeight')) || GROUP_MIN_HEIGHT
      const start = {
        left: startPosition.x - startWidth / 2,
        right: startPosition.x + startWidth / 2,
        top: startPosition.y - startHeight / 2,
        bottom: startPosition.y + startHeight / 2,
      }
      beginPointerInteraction(moveEvent => {
        const point = canvasPointFromClient(moveEvent.clientX, moveEvent.clientY)
        const delta = { x: point.x - startPointer.x, y: point.y - startPointer.y }
        let left = start.left
        let right = start.right
        let top = start.top
        let bottom = start.bottom
        if (corner.includes('w')) left += delta.x
        if (corner.includes('e')) right += delta.x
        if (corner.includes('n')) top += delta.y
        if (corner.includes('s')) bottom += delta.y
        if (right - left < GROUP_MIN_WIDTH) {
          if (corner.includes('w')) left = right - GROUP_MIN_WIDTH
          else right = left + GROUP_MIN_WIDTH
        }
        if (bottom - top < GROUP_MIN_HEIGHT) {
          if (corner.includes('n')) top = bottom - GROUP_MIN_HEIGHT
          else bottom = top + GROUP_MIN_HEIGHT
        }
        group.data('groupWidth', right - left)
        group.data('groupHeight', bottom - top)
        group.position({ x: (left + right) / 2, y: (top + bottom) / 2 })
        renderInteractionLayer()
      }, () => {
        savePresentation()
        setStatus(
          'layout',
          '分组大小已更新，并仅保存在本机。',
          'The group size was updated and saved locally only.',
        )
      })
    }

    function beginGroupHandleDrag(event, group) {
      event.preventDefault()
      event.stopPropagation()
      selectPresentationElement(group)
      ;[...interactionLayer.querySelectorAll('[data-group-drag-handle]')]
        .find(handle => handle.dataset.groupDragHandle === group.id())
        ?.focus({ preventScroll: true })
      const startPointer = canvasPointFromClient(event.clientX, event.clientY)
      const groupOrigin = { ...group.position() }
      const members = groupMemberNodes(group)
      const memberIds = new Set(members.map(node => node.id()))
      const memberOrigins = members.map(node => ({ node, position: { ...node.position() } }))
      const routeOrigins = new Map()
      const connectedEdges = new Map()
      members.forEach(node => node.connectedEdges().forEach(edge => connectedEdges.set(edge.id(), edge)))
      connectedEdges.forEach(edge => {
        if (!memberIds.has(edge.source().id())
          || !memberIds.has(edge.target().id())
          || edge.data('routeManual') !== true) return
        routeOrigins.set(edge.id(), {
          axis: edge.data('routeAxis'),
          turn: edge.data('routeTurn'),
          control: cleanPosition(edge.data('routeControl')),
        })
      })
      let moved = false
      beginPointerInteraction(moveEvent => {
        const point = canvasPointFromClient(moveEvent.clientX, moveEvent.clientY)
        const delta = { x: point.x - startPointer.x, y: point.y - startPointer.y }
        moved = moved || Math.abs(delta.x) + Math.abs(delta.y) > 2
        graph.batch(() => {
          group.position({ x: groupOrigin.x + delta.x, y: groupOrigin.y + delta.y })
          memberOrigins.forEach(item => item.node.position({
            x: item.position.x + delta.x,
            y: item.position.y + delta.y,
          }))
          routeOrigins.forEach((route, edgeId) => {
            const edge = graph.getElementById(edgeId)
            if (edge.empty()) return
            if (route.control) edge.data('routeControl', {
              x: route.control.x + delta.x,
              y: route.control.y + delta.y,
            })
            if (Number.isFinite(route.turn)) edge.data('routeTurn', route.turn + (route.axis === 'horizontal' ? delta.x : delta.y))
            applyEdgeRoute(edge)
          })
        })
        renderInteractionLayer()
      }, () => {
        if (moved) {
          savePresentation()
          setStatus(
            'layout',
            '分组和内部节点已整体移动，并仅保存在本机。',
            'The group and its nodes moved together and were saved locally only.',
          )
        } else {
          setStatus(
            'layout',
            '拖动分组标题可整体移动内部节点；拉动四角可调整边界大小。',
            'Drag the group title to move its nodes together, or pull a corner to resize its boundary.',
          )
        }
      })
    }

    function translateGroup(group, delta) {
      const members = groupMemberNodes(group)
      const memberIds = new Set(members.map(node => node.id()))
      const connectedEdges = new Map()
      members.forEach(node => node.connectedEdges().forEach(edge => connectedEdges.set(edge.id(), edge)))
      graph.batch(() => {
        group.position({ x: group.position('x') + delta.x, y: group.position('y') + delta.y })
        members.forEach(node => node.position({
          x: node.position('x') + delta.x,
          y: node.position('y') + delta.y,
        }))
        connectedEdges.forEach(edge => {
          if (!memberIds.has(edge.source().id())
            || !memberIds.has(edge.target().id())
            || edge.data('routeManual') !== true) return
          const control = cleanPosition(edge.data('routeControl'))
          if (control) edge.data('routeControl', { x: control.x + delta.x, y: control.y + delta.y })
          if (Number.isFinite(edge.data('routeTurn'))) {
            edge.data('routeTurn', edge.data('routeTurn') + (edge.data('routeAxis') === 'horizontal' ? delta.x : delta.y))
          }
          applyEdgeRoute(edge)
        })
      })
      savePresentation()
      renderInteractionLayer()
    }

    function resizeGroupFromCorner(group, corner, delta) {
      const position = group.position()
      const width = Number(group.data('groupWidth')) || GROUP_MIN_WIDTH
      const height = Number(group.data('groupHeight')) || GROUP_MIN_HEIGHT
      let left = position.x - width / 2
      let right = position.x + width / 2
      let top = position.y - height / 2
      let bottom = position.y + height / 2
      if (corner.includes('w')) left += delta.x
      if (corner.includes('e')) right += delta.x
      if (corner.includes('n')) top += delta.y
      if (corner.includes('s')) bottom += delta.y
      if (right - left < GROUP_MIN_WIDTH) {
        if (corner.includes('w')) left = right - GROUP_MIN_WIDTH
        else right = left + GROUP_MIN_WIDTH
      }
      if (bottom - top < GROUP_MIN_HEIGHT) {
        if (corner.includes('n')) top = bottom - GROUP_MIN_HEIGHT
        else bottom = top + GROUP_MIN_HEIGHT
      }
      group.data('groupWidth', right - left)
      group.data('groupHeight', bottom - top)
      group.position({ x: (left + right) / 2, y: (top + bottom) / 2 })
      savePresentation()
      renderInteractionLayer()
    }

    function nudgeEdgeHandle(edge, delta) {
      if (edge.data('routeMode') === 'orthogonal') {
        const current = Number.isFinite(edge.data('routeTurn'))
          ? edge.data('routeTurn')
          : edge.data('routeAxis') === 'horizontal'
            ? routeControlPoints(edge)[0]?.x
            : routeControlPoints(edge)[0]?.y
        edge.data('routeTurn', current + (edge.data('routeAxis') === 'horizontal' ? delta.x : delta.y))
      } else if (edge.data('routeMode') === 'curve') {
        const control = routeControlPoints(edge)[0]
        edge.data('routeControl', { x: control.x + delta.x, y: control.y + delta.y })
      }
      edge.data('routeManual', true)
      applyEdgeRoute(edge)
      savePresentation()
      renderInteractionLayer()
    }

    function toolbarButton(label, action, active = false) {
      const button = createElement('button', active ? 'active' : '', label)
      button.type = 'button'
      button.dataset.composerAction = action
      return button
    }

    function ensureInteractionLayer() {
      if (interactionLayer?.isConnected) return interactionLayer
      interactionLayer = createElement('div', 'composer-interaction-layer')
      const tip = createElement('div', 'composer-canvas-tip')
      tip.dataset.interactionPart = 'tip'
      const toolbar = createElement('div', 'composer-selection-toolbar')
      toolbar.dataset.interactionPart = 'toolbar'
      toolbar.hidden = true
      const groupControls = createElement('div', 'composer-group-controls')
      groupControls.dataset.interactionPart = 'group-controls'
      const handles = createElement('div', 'composer-selection-handles')
      handles.dataset.interactionPart = 'handles'
      interactionLayer.append(tip, groupControls, toolbar, handles)
      interactionLayer.addEventListener('click', event => {
        const groupDragHandle = event.target.closest('[data-group-drag-handle]')
        if (groupDragHandle && graph) {
          const group = graph.getElementById(groupDragHandle.dataset.groupDragHandle)
          if (group.nonempty()) {
            selectPresentationElement(group)
            ;[...interactionLayer.querySelectorAll('[data-group-drag-handle]')]
              .find(handle => handle.dataset.groupDragHandle === group.id())
              ?.focus({ preventScroll: true })
          }
          return
        }
        const button = event.target.closest('button[data-composer-action]')
        if (!button || !activePresentationSelection || !graph) return
        event.preventDefault()
        event.stopPropagation()
        const element = graph.getElementById(activePresentationSelection.id)
        if (element.empty()) return
        const action = button.dataset.composerAction
        if (action.startsWith('route:')) setEdgeRouteMode(element, action.slice('route:'.length))
        else if (action === 'route-flip') flipOrthogonalRoute(element)
        else if (action === 'route-reset') resetEdgeRoute(element)
        else if (action === 'group-fit') fitGroupToMembers(element)
      })
      interactionLayer.addEventListener('pointerdown', event => {
        if (!graph) return
        const groupDragHandle = event.target.closest('[data-group-drag-handle]')
        if (groupDragHandle) {
          const group = graph.getElementById(groupDragHandle.dataset.groupDragHandle)
          if (group.nonempty()) beginGroupHandleDrag(event, group)
          return
        }
        if (!activePresentationSelection) return
        const element = graph.getElementById(activePresentationSelection.id)
        if (element.empty()) return
        const edgeHandle = event.target.closest('[data-edge-route-handle]')
        if (edgeHandle && element.isEdge()) {
          beginEdgeHandleDrag(event, element)
          return
        }
        const resizeHandle = event.target.closest('[data-group-resize-handle]')
        if (resizeHandle && element.isNode()) {
          beginGroupResize(event, element, resizeHandle.dataset.groupResizeHandle)
        }
      })
      interactionLayer.addEventListener('keydown', event => {
        if (!graph || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        const step = event.shiftKey ? 20 : 6
        const delta = {
          x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        }
        const groupDragHandle = event.target.closest('[data-group-drag-handle]')
        if (groupDragHandle) {
          const group = graph.getElementById(groupDragHandle.dataset.groupDragHandle)
          if (group.nonempty()) {
            event.preventDefault()
            selectPresentationElement(group)
            translateGroup(group, delta)
            ;[...interactionLayer.querySelectorAll('[data-group-drag-handle]')]
              .find(handle => handle.dataset.groupDragHandle === group.id())
              ?.focus({ preventScroll: true })
          }
          return
        }
        if (!activePresentationSelection) return
        const element = graph.getElementById(activePresentationSelection.id)
        if (element.empty()) return
        const resizeHandle = event.target.closest('[data-group-resize-handle]')
        if (resizeHandle && element.isNode()) {
          event.preventDefault()
          resizeGroupFromCorner(element, resizeHandle.dataset.groupResizeHandle, delta)
          interactionLayer
            .querySelector(`[data-group-resize-handle="${resizeHandle.dataset.groupResizeHandle}"]`)
            ?.focus({ preventScroll: true })
          return
        }
        const edgeHandle = event.target.closest('[data-edge-route-handle]')
        if (edgeHandle && element.isEdge()) {
          const routeAxis = element.data('routeAxis')
          if (element.data('routeMode') === 'orthogonal'
            && ((routeAxis === 'horizontal' && delta.x === 0) || (routeAxis !== 'horizontal' && delta.y === 0))) return
          event.preventDefault()
          nudgeEdgeHandle(element, delta)
          interactionLayer.querySelector('[data-edge-route-handle]')?.focus({ preventScroll: true })
        }
      })
      options.container.parentElement?.append(interactionLayer)
      return interactionLayer
    }

    function addPositionedHandle(container, className, x, y, attributes = {}) {
      const handle = createElement(attributes.button ? 'button' : 'span', className)
      if (attributes.button) handle.type = 'button'
      Object.entries(attributes).forEach(([name, value]) => {
        if (name === 'button') return
        if (name === 'title') handle.title = value
        else handle.dataset[name] = value
      })
      handle.style.left = `${x}px`
      handle.style.top = `${y}px`
      container.append(handle)
      return handle
    }

    function overlapArea(left, right) {
      const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
      const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top))
      return width * height
    }

    function placeEdgeToolbar(toolbar, anchor, parentBounds, offset, groupControls) {
      const width = Math.min(toolbar.offsetWidth, parentBounds.width - 16)
      const height = toolbar.offsetHeight
      const obstacles = []
      graph.nodes().forEach(node => {
        if (node.hidden() || node.hasClass('view-group') || node.hasClass('intent-target')) return
        const box = node.renderedBoundingBox({ includeLabels: true, includeOverlays: false })
        obstacles.push({
          left: offset.x + box.x1 - 9,
          top: offset.y + box.y1 - 9,
          right: offset.x + box.x2 + 9,
          bottom: offset.y + box.y2 + 9,
        })
      })
      groupControls.querySelectorAll('.composer-group-drag-handle').forEach(handle => {
        const box = handle.getBoundingClientRect()
        obstacles.push({
          left: box.left - parentBounds.left - 5,
          top: box.top - parentBounds.top - 5,
          right: box.right - parentBounds.left + 5,
          bottom: box.bottom - parentBounds.top + 5,
        })
      })
      const detail = options.container.parentElement?.querySelector('.detail-panel:not([hidden])')
      if (detail) {
        const box = detail.getBoundingClientRect()
        obstacles.push({
          left: box.left - parentBounds.left - 8,
          top: box.top - parentBounds.top - 8,
          right: box.right - parentBounds.left + 8,
          bottom: box.bottom - parentBounds.top + 8,
        })
      }
      const rawCandidates = [
        { left: anchor.x + 18, top: anchor.y - height / 2 },
        { left: anchor.x - width - 18, top: anchor.y - height / 2 },
        { left: anchor.x - width / 2, top: anchor.y - height - 18 },
        { left: anchor.x - width / 2, top: anchor.y + 18 },
      ]
      const candidates = rawCandidates.map(candidate => {
        const left = clamp(candidate.left, 8, parentBounds.width - width - 8)
        const top = clamp(candidate.top, 8, parentBounds.height - height - 8)
        const rect = { left, top, right: left + width, bottom: top + height }
        return {
          ...rect,
          score: obstacles.reduce((score, obstacle) => score + overlapArea(rect, obstacle), 0),
        }
      })
      candidates.sort((left, right) => left.score - right.score)
      const best = candidates[0]
      toolbar.style.width = width === toolbar.offsetWidth ? '' : `${width}px`
      toolbar.style.left = `${best.left}px`
      toolbar.style.top = `${best.top}px`
      toolbar.style.transform = 'none'
      toolbar.classList.remove('below')
    }

    function renderInteractionLayer() {
      const layer = ensureInteractionLayer()
      const tip = layer.querySelector('[data-interaction-part="tip"]')
      const toolbar = layer.querySelector('[data-interaction-part="toolbar"]')
      const groupControls = layer.querySelector('[data-interaction-part="group-controls"]')
      const handles = layer.querySelector('[data-interaction-part="handles"]')
      groupControls.replaceChildren()
      handles.replaceChildren()
      const hasGroups = graph?.nodes('.view-group').nonempty() === true
      tip.textContent = hasGroups
        ? localText(
            context.locale,
            '拖动分组标题可整体移动 · 选中连线可调路径 · 拉动角点可改大小',
            'Drag a group title to move it · Select a connection to edit its route · Pull a corner to resize',
          )
        : localText(
            context.locale,
            '拖动节点调整布局 · 选中连线可调直线、折线或曲线',
            'Drag nodes to arrange them · Select a connection to use a straight, elbow, or curved route',
          )
      const parentBounds = layer.parentElement.getBoundingClientRect()
      const canvasBounds = options.container.getBoundingClientRect()
      const offset = { x: canvasBounds.left - parentBounds.left, y: canvasBounds.top - parentBounds.top }
      graph?.nodes('.view-group').forEach(group => {
        if (group.hidden()) return
        const box = group.renderedBoundingBox({ includeLabels: false, includeOverlays: false })
        const handle = addPositionedHandle(
          groupControls,
          'composer-group-drag-handle',
          offset.x + (box.x1 + box.x2) / 2,
          offset.y + box.y1,
          {
            button: true,
            groupDragHandle: group.id(),
            title: localText(context.locale, '拖动以整体移动分组', 'Drag to move the whole group'),
          },
        )
        handle.textContent = group.data('displayLabel')
        handle.classList.toggle('active', activePresentationSelection?.id === group.id())
      })
      const selection = activePresentationSelection
      const element = selection && graph ? graph.getElementById(selection.id) : undefined
      if (!element || element.empty() || element.hidden()) {
        activePresentationSelection = undefined
        toolbar.hidden = true
        tip.hidden = false
        return
      }
      if (element.isNode()) {
        toolbar.hidden = true
        tip.hidden = false
        tip.textContent = localText(
          context.locale,
          '已选中分组：拖动标题整体移动，拉动四角调整大小。',
          'Group selected: drag its title to move everything, or pull a corner to resize.',
        )
        const box = element.renderedBoundingBox({ includeLabels: false, includeOverlays: false })
        const corners = [
          ['nw', box.x1, box.y1],
          ['ne', box.x2, box.y1],
          ['se', box.x2, box.y2],
          ['sw', box.x1, box.y2],
        ]
        corners.forEach(([corner, x, y]) => addPositionedHandle(
          handles,
          `composer-resize-handle ${corner}`,
          offset.x + x,
          offset.y + y,
          {
            button: true,
            groupResizeHandle: corner,
            title: localText(context.locale, '拖动以调整分组大小', 'Drag to resize the group'),
          },
        ))
        const fitButton = toolbarButton(localText(context.locale, '适应', 'Fit'), 'group-fit')
        fitButton.className = 'composer-group-fit-control'
        fitButton.title = localText(context.locale, '让分组边界适应内部节点', 'Fit the group boundary to its nodes')
        fitButton.style.left = `${offset.x + box.x2 - 38}px`
        fitButton.style.top = `${offset.y + box.y1 + 22}px`
        groupControls.append(fitButton)
        return
      }
      tip.hidden = true
      toolbar.hidden = false
      toolbar.replaceChildren()
      let anchor
      const mode = element.data('routeMode')
      const label = createElement('span', 'composer-selection-label', localText(context.locale, '连线路径', 'Connection route'))
      const modeGroup = createElement('span', 'composer-route-modes')
      modeGroup.append(
        toolbarButton(localText(context.locale, '直线', 'Straight'), 'route:straight', mode === 'straight'),
        toolbarButton(localText(context.locale, '折线', 'Elbow'), 'route:orthogonal', mode === 'orthogonal'),
        toolbarButton(localText(context.locale, '曲线', 'Curve'), 'route:curve', mode === 'curve'),
      )
      toolbar.append(label, modeGroup)
      if (mode === 'orthogonal') toolbar.append(toolbarButton(localText(context.locale, '换向', 'Flip'), 'route-flip'))
      toolbar.append(toolbarButton(localText(context.locale, '自动', 'Auto'), 'route-reset'))
      let sourceEndpoint
      let targetEndpoint
      try {
        sourceEndpoint = element.renderedSourceEndpoint()
        targetEndpoint = element.renderedTargetEndpoint()
      } catch {
        sourceEndpoint = element.source().renderedPosition()
        targetEndpoint = element.target().renderedPosition()
      }
      addPositionedHandle(handles, 'composer-port-marker source', offset.x + sourceEndpoint.x, offset.y + sourceEndpoint.y)
      addPositionedHandle(handles, 'composer-port-marker target', offset.x + targetEndpoint.x, offset.y + targetEndpoint.y)
      const points = routeControlPoints(element)
      let control
      if (mode === 'orthogonal' && points.length === 2) {
        control = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
      } else if (mode === 'curve') control = points[0]
      if (control) {
        const rendered = {
          x: control.x * graph.zoom() + graph.pan().x,
          y: control.y * graph.zoom() + graph.pan().y,
        }
        addPositionedHandle(
          handles,
          'composer-route-handle',
          offset.x + rendered.x,
          offset.y + rendered.y,
          {
            button: true,
            edgeRouteHandle: 'control',
            title: localText(context.locale, '拖动以调整连线路径', 'Drag to adjust the connection route'),
          },
        )
        anchor = { x: offset.x + rendered.x, y: offset.y + rendered.y }
      } else {
        const midpoint = element.renderedMidpoint()
        anchor = { x: offset.x + midpoint.x, y: offset.y + midpoint.y }
      }
      placeEdgeToolbar(toolbar, anchor, parentBounds, offset, groupControls)
    }

    function scheduleInteractionLayer() {
      if (interactionFrame) cancelAnimationFrame(interactionFrame)
      interactionFrame = requestAnimationFrame(renderInteractionLayer)
    }

    function selectPresentationElement(element) {
      if (!element || element.empty()) return
      activePresentationSelection = { id: element.id(), kind: element.isEdge() ? 'edge' : 'group' }
      graph.$(':selected').unselect()
      element.select()
      renderInteractionLayer()
    }

    function clearPresentationSelection() {
      activePresentationSelection = undefined
      renderInteractionLayer()
    }

    function ensureIconLayer() {
      if (iconLayer?.isConnected) return iconLayer
      iconLayer = createElement('div', 'composer-node-icon-layer')
      iconLayer.setAttribute('aria-hidden', 'true')
      options.container.parentElement?.append(iconLayer)
      return iconLayer
    }

    function syncNodeIcons() {
      if (!graph || !iconLayer?.isConnected) return
      const parentBounds = iconLayer.parentElement.getBoundingClientRect()
      const canvasBounds = options.container.getBoundingClientRect()
      iconLayer.querySelectorAll('[data-graph-node-id]').forEach(icon => {
        const node = graph.getElementById(icon.dataset.graphNodeId)
        if (node.empty() || node.hidden()) {
          icon.hidden = true
          return
        }
        icon.hidden = false
        const position = node.renderedPosition()
        icon.style.left = `${canvasBounds.left - parentBounds.left + position.x - node.renderedWidth() / 2 + 13}px`
        icon.style.top = `${canvasBounds.top - parentBounds.top + position.y - 12}px`
      })
    }

    function scheduleNodeIcons() {
      if (iconFrame) cancelAnimationFrame(iconFrame)
      iconFrame = requestAnimationFrame(syncNodeIcons)
    }

    function renderNodeIcons() {
      const layer = ensureIconLayer()
      layer.replaceChildren()
      if (!graph || context.scope !== 'focus') return
      graph.nodes().forEach(node => {
        if (node.hasClass('view-group') || node.hasClass('intent-target')) return
        const iconName = node.data('iconName')
        if (typeof iconName !== 'string' || iconName === '') return
        const icon = createElement('span', 'composer-node-icon')
        icon.dataset.graphNodeId = node.id()
        icon.append(createElement('i', `ph ph-${iconName}`))
        layer.append(icon)
      })
      scheduleNodeIcons()
    }

    function setStatus(kind, zh, en) {
      options.status.dataset.state = kind
      options.status.textContent = localText(context.locale, zh, en)
    }

    function cardIcon(iconName) {
      const wrapper = createElement('span', 'composer-card-icon')
      wrapper.append(createElement('i', `ph ${iconName}`))
      return wrapper
    }

    function appendCapabilityCard(card, metadata) {
      card.dataset.capabilityCategory = metadata.category
      card.dataset.capabilitySearch = `${metadata.search} ${card.textContent ?? ''}`.toLocaleLowerCase()
      const query = context.capabilityQuery.trim().toLocaleLowerCase()
      const matchesFilter = context.capabilityFilter === 'all'
        || context.capabilityFilter === metadata.category
      const matchesQuery = query === '' || card.dataset.capabilitySearch.includes(query)
      card.hidden = !matchesFilter || !matchesQuery
      options.candidateShelf.append(card)
    }

    function appendFilteredEmptyState() {
      const visibleCards = [...options.candidateShelf.querySelectorAll('.composer-candidate-card')]
        .filter(card => !card.hidden)
      options.candidateShelf.dataset.visibleCount = String(visibleCards.length)
      if (visibleCards.length > 0 || options.candidateShelf.querySelector('.composer-shelf-empty')) return
      const hasQuery = context.capabilityQuery.trim() !== ''
      options.candidateShelf.append(createElement(
        'p',
        'composer-shelf-empty',
        hasQuery
          ? localText(
              context.locale,
              '没有匹配的能力。请清除搜索或切换类别。',
              'No capability matches. Clear the search or choose another category.',
            )
          : localText(
              context.locale,
              '这个类别当前没有其他可预览的修改。可以切换类别继续。',
              'There are no other previewable changes in this category. Choose another category to continue.',
            ),
      ))
    }

    function pluginCardCopy(action, adding) {
      if (action.entryId === 'schedule') {
        return {
          badge: localText(context.locale, '官方组件 · 会触发后续 Agent 回复', 'Official component · creates future Agent follow-ups'),
          title: localText(
            context.locale,
            adding ? '会话提醒' : '移除会话提醒',
            adding ? 'Session reminders' : 'Remove Session reminders',
          ),
          description: localText(
            context.locale,
            adding
              ? '在原会话中设置稍后、指定时间或周期提醒。'
              : '停止让新 Agent 创建会话提醒；已有会话记录不会被删除。',
            adding
              ? 'Set delayed, scheduled, or recurring reminders in the original conversation.'
              : 'Stops new Agents from creating Session reminders; existing Session logs are not deleted.',
          ),
        }
      }
      return {
        badge: localText(context.locale, '官方组件 · 可安全撤销', 'Official component · safely reversible'),
        title: localText(
          context.locale,
          adding ? '时间感知' : '移除时间感知',
          adding ? 'Time awareness' : 'Remove time awareness',
        ),
        description: localText(
          context.locale,
          adding
            ? '让 Agent 获得当前时间、时区和会话经过时间。'
            : '停止在 Agent 步骤中加入当前时间和经过时间。',
          adding
            ? 'Give the Agent the current time, time zone, and elapsed session time.'
            : 'Stops adding current and elapsed time to Agent steps.',
        ),
      }
    }

    function appendPluginCard(action) {
      const adding = action.mode === 'add-plugin'
      const copyText = pluginCardCopy(action, adding)
      const card = createElement('div', `composer-candidate-card composer-plugin-card ${action.entryId}`)
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', copyText.badge))
      copy.append(createElement('strong', '', copyText.title))
      copy.append(createElement('small', '', copyText.description))
      copy.append(createElement('small', 'composer-activation-note', localText(
        context.locale,
        '应用后，重新启动 DSH 并新建 Agent 后生效。',
        'Takes effect for new Agents after DSH is restarted.',
      )))
      const button = createElement('button', 'composer-candidate-button', localText(context.locale, '预览这项修改', 'Preview this change'))
      button.type = 'button'
      if (action.planned) {
        button.textContent = localText(context.locale, '已加入修改预览', 'Added to change preview')
        button.disabled = true
        card.classList.add('planned')
      }
      if (authoringReadOnly()) {
        button.textContent = localText(context.locale, '当前配置只读', 'Current configuration is read-only')
        makeAuthoringActionReadOnly(button)
        card.classList.add('read-only')
      }
      button.addEventListener('click', () => void requestPlan(action))
      const isSchedule = action.entryId === 'schedule'
      card.append(cardIcon(isSchedule ? 'ph-bell' : 'ph-clock'), copy, button)
      appendCapabilityCard(card, {
        category: isSchedule ? 'interaction' : 'context',
        search: `${action.entryId} ${action.pluginName} ${copyText.title} ${copyText.description} 时间 提醒 time reminder`,
      })
    }

    function appendPluginGroups(pluginActions) {
      const groups = [
        {
          id: 'understand-now',
          title: localText(context.locale, '理解当前情况', 'Understand the current context'),
          help: localText(context.locale, '给 Agent 补充当下信息', 'Give the Agent useful context about now'),
        },
        {
          id: 'follow-up',
          title: localText(context.locale, '持续跟进', 'Follow up later'),
          help: localText(context.locale, '让 Agent 在原会话中继续处理', 'Let the Agent continue in the original conversation'),
        },
      ]
      groups.forEach(group => {
        const actions = pluginActions.filter(action => action.outcomeGroup === group.id)
        if (actions.length === 0) return
        const section = createElement('section', 'composer-component-group')
        const heading = createElement('div', 'composer-component-group-heading')
        heading.append(createElement('strong', '', group.title))
        heading.append(createElement('small', '', group.help))
        section.append(heading)
        actions.forEach(action => appendPluginCard(action))
        options.candidateShelf.append(section)
      })
    }

    function appendReadOnlyLifecycleCard(component) {
      const isSchedule = component.id === 'schedule'
      const installed = component.availability !== 'unavailable'
      const active = component.availability === 'active'
      const card = createElement('div', `composer-candidate-card composer-plugin-card ${component.id} read-only`)
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', installed
        ? active
          ? localText(context.locale, '已经启用 · 官方组件', 'Enabled · official component')
          : localText(context.locale, '已安装 · 当前配置只读', 'Installed · current configuration is read-only')
        : localText(context.locale, '当前 DSH 未安装', 'Not installed in this DSH')))
      copy.append(createElement('strong', '', localText(
        context.locale,
        isSchedule ? '会话提醒' : '时间感知',
        isSchedule ? 'Session reminders' : 'Time awareness',
      )))
      copy.append(createElement('small', '', localText(
        context.locale,
        isSchedule
          ? '在原会话中设置稍后、指定时间或周期提醒。'
          : '让 Agent 获得当前时间、时区和会话经过时间。',
        isSchedule
          ? 'Set delayed, scheduled, or recurring reminders in the original conversation.'
          : 'Give the Agent the current time, time zone, and elapsed session time.',
      )))
      const button = createElement('button', 'composer-candidate-button', installed
        ? localText(context.locale, '当前配置只读', 'Current configuration is read-only')
        : localText(context.locale, '当前 DSH 未安装此组件', 'Not installed in this DSH'))
      button.type = 'button'
      button.disabled = true
      button.title = installed ? profileAuthoringReadOnlyText(context.locale, context.inspection) : ''
      card.append(cardIcon(isSchedule ? 'ph-bell' : 'ph-clock'), copy, button)
      appendCapabilityCard(card, {
        category: isSchedule ? 'interaction' : 'context',
        search: `${component.id} ${component.packageName} 时间 提醒 time reminder`,
      })
    }

    function sessionAidDefinitions() {
      return [
        {
          componentId: 'task-list',
          entryId: 'tool-todo',
          icon: 'ph-list-checks',
          category: 'tools',
          name: localText(context.locale, '任务清单', 'Task list'),
          description: localText(
            context.locale,
            '让 Agent 把多步骤工作显示为可追踪的清单，并在当前会话持续更新。',
            'Let the Agent show multi-step work as a trackable checklist and keep it updated in the current conversation.',
          ),
          stateDescription: localText(
            context.locale,
            '让 Agent 在当前会话中维护一份可见的多步骤任务清单。',
            'Let the Agent maintain a visible multi-step task list in the current conversation.',
          ),
          enableLabel: localText(context.locale, '启用任务清单', 'Enable task list'),
          disableLabel: localText(context.locale, '关闭任务清单', 'Turn off task list'),
          search: 'task list todo checklist plan progress 任务 清单 待办 进度',
        },
        {
          componentId: 'goal-tracking',
          entryId: 'tool-goal',
          icon: 'ph-target',
          category: 'context',
          name: localText(context.locale, '持续目标', 'Long-running goal'),
          description: localText(
            context.locale,
            '让 Agent 在当前会话中创建、查看和更新一个可暂停、恢复的长期目标。',
            'Let the Agent create and update one goal that can be paused and resumed in this conversation.',
          ),
          stateDescription: localText(
            context.locale,
            '控制 Agent 是否可以创建、读取和更新当前会话的长期目标。',
            'Control whether the Agent can create, read, and update the current conversation goal.',
          ),
          enableLabel: localText(context.locale, '允许 Agent 管理目标', 'Let Agent manage goals'),
          disableLabel: localText(context.locale, '关闭 Agent 目标工具', 'Turn off Agent goal tools'),
          search: 'goal objective long running continue pause resume 目标 长期 持续 暂停 恢复',
        },
      ]
    }

    function appendStateCard(action) {
      const sessionAid = sessionAidDefinitions().find(item => item.entryId === action.entryId)
      const providerRemoval = action.intent === 'remove-provider'
      const subprocessRemoval = providerRemoval && action.capability === 'ctx.subprocess'
      const card = createElement('div', `composer-candidate-card composer-state-card ${action.intent}`)
      const copy = createElement('div', 'composer-candidate-copy')
      const actionName = action.entryId === 'web-startup'
        ? localText(context.locale, '网页访问', 'Web access')
        : friendlyEntryName(action.entryId, action.entryId)
      copy.append(createElement('span', '', localText(
        context.locale,
        subprocessRemoval
          ? '仅预览影响 · 当前没有安全替代项'
          : providerRemoval ? '先检查能力断开与替代项' : action.dependencyAware ? '会同时检查依赖' : '可安全撤销',
        subprocessRemoval
          ? 'Impact preview only · no safe alternative is available'
          : providerRemoval ? 'Disconnections and alternatives checked first' : action.dependencyAware ? 'Dependencies will be checked' : 'Safely reversible',
      )))
      copy.append(createElement('strong', '', localText(
        context.locale,
        subprocessRemoval
          ? '检查移除命令执行 Provider 的影响'
          : providerRemoval ? '移除当前文件系统 Provider' : `${action.intent === 'disable' ? '关闭' : '开启'} ${actionName}`,
        subprocessRemoval
          ? 'Inspect removal of the command-execution Provider'
          : providerRemoval ? 'Remove the current filesystem provider' : `${action.intent === 'disable' ? 'Turn off' : 'Turn on'} ${actionName}`,
      )))
      copy.append(createElement('small', '', sessionAid
        ? sessionAid.stateDescription
        : subprocessRemoval
          ? localText(
              context.locale,
              '当前没有第二个 ctx.subprocess Provider；Bash 与 PowerShell 还受平台条件控制，因此这项操作只能查看影响，不能应用。',
              'There is no second ctx.subprocess Provider, while Bash and PowerShell remain platform-controlled. This action can inspect impact but cannot be applied.',
            )
        : providerRemoval
          ? localText(
              context.locale,
              '先显示 ctx.fs 会断开以及受影响的文件工具；选择沙箱替代后才允许应用。',
              'First show the lost ctx.fs contract and affected file tools; Apply unlocks only after choosing the sandbox replacement.',
            )
        : action.dependencyAware
        ? localText(
            context.locale,
            '先列出受影响的组件，再决定是否一起关闭。',
            'See every affected component before deciding whether to turn them off together.',
          )
        : localText(context.locale, '更改当前组件的启用状态。', 'Change whether this component is enabled.')))
      const button = createElement('button', 'composer-candidate-button composer-state-button', localText(context.locale, '预览这项修改', 'Preview this change'))
      button.type = 'button'
      if (authoringReadOnly()) {
        button.textContent = localText(context.locale, '当前配置只读', 'Current configuration is read-only')
        makeAuthoringActionReadOnly(button)
        card.classList.add('read-only')
      }
      button.addEventListener('click', () => void requestStatePlan(action))
      card.append(cardIcon(sessionAid?.icon ?? 'ph-power'), copy, button)
      appendCapabilityCard(card, {
        category: providerRemoval && !subprocessRemoval ? 'storage' : 'tools',
        search: `${action.entryId} ${action.pluginName} ${action.intent} ${action.capability ?? ''} 开启 关闭 移除 provider filesystem subprocess command ctx.fs ctx.subprocess enable disable remove`,
      })
    }

    function appendSessionAidCard(definition) {
      const component = context.inspection?.componentCatalog?.find(item => item.id === definition.componentId)
      if (!component) return false
      const node = context.inspection?.nodes.find(candidate =>
        candidate.plane === 'resolved'
        && candidate.attributes?.entryId === definition.entryId
        && candidate.attributes?.pluginName === component.packageName)
      const providerNodeIds = new Set((context.inspection?.services ?? []).flatMap(service =>
        service.providers.map(provider => provider.nodeId)))
      const action = supportedStateAction(node, providerNodeIds)
      const planned = action && context.draftActionIds.includes(action.id)
      const active = component.availability === 'active'
      const card = createElement('div', `composer-candidate-card composer-session-aid-card ${definition.componentId}${active ? ' active' : ''}`)
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', localText(
        context.locale,
        active
          ? '已经启用 · 官方组件'
          : component.availability === 'unavailable'
            ? '当前 DSH 未安装'
            : action
              ? '已安装 · 应用并重启后生效'
              : '已安装 · 当前配置不可切换',
        active
          ? 'Enabled · official component'
          : component.availability === 'unavailable'
            ? 'Not installed in this DSH'
            : action
              ? 'Installed · takes effect after Apply and restart'
              : 'Installed · current configuration is read-only',
      )))
      copy.append(createElement('strong', '', definition.name))
      copy.append(createElement('small', '', definition.description))
      const technical = createElement('details', 'composer-component-technical')
      technical.append(createElement('summary', '', localText(context.locale, '技术信息', 'Technical details')))
      technical.append(createElement('code', '', `${component.packageName}${component.packageVersion ? ` · ${component.packageVersion}` : ''}`))
      copy.append(technical)
      const button = createElement(
        'button',
        'composer-candidate-button',
        active ? definition.disableLabel : definition.enableLabel,
      )
      button.type = 'button'
      if (component.availability === 'unavailable' || !action || planned || authoringReadOnly()) {
        button.disabled = true
        button.textContent = localText(
          context.locale,
          planned
            ? '已加入修改预览'
            : component.availability === 'unavailable'
              ? '当前 DSH 未安装此组件'
              : '当前配置只读',
          planned
            ? 'Added to change preview'
            : component.availability === 'unavailable'
              ? 'Not installed in this DSH'
              : 'Current configuration is read-only',
        )
        if (!planned && component.availability !== 'unavailable' && authoringReadOnly()) {
          button.title = profileAuthoringReadOnlyText(context.locale, context.inspection)
          card.classList.add('read-only')
        }
      }
      if (action) button.addEventListener('click', () => void requestStatePlan(action))
      card.append(cardIcon(definition.icon), copy, button)
      appendCapabilityCard(card, {
        category: definition.category,
        search: `${definition.search} ${component.packageName}`,
      })
      return true
    }

    function appendCompositionCard(action) {
      const isPickerCapsule = action.candidateKind === 'plugin-capsule'
      const isPickerReset = action.mode === 'reset-auto'
      const card = createElement('div', `composer-candidate-card${isPickerCapsule ? ' composer-capsule-card' : ''}`)
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', localText(
        context.locale,
        isPickerCapsule ? '官方组件组 · 可预览' : '能力提供者 · 可预览',
        isPickerCapsule ? 'Official component group · previewable' : 'Capability provider · previewable',
      )))
      copy.append(createElement('strong', '', isPickerCapsule
        ? isPickerReset
          ? localText(context.locale, '恢复自动目录选择', 'Restore automatic directory picker')
          : localText(context.locale, '使用应用内目录浏览器', 'Use the in-app directory browser')
        : friendlyEntryName(action.replacementEntryId, action.replacementEntryId)))
      if (isPickerCapsule || action.service === 'fs') {
        copy.append(createElement(
          'span',
          'composer-contract-chip',
          localText(
            context.locale,
            `兼容接口 · ${isPickerCapsule ? 'ctx.directoryPicker' : 'ctx.fs'}`,
            `Compatible contract · ${isPickerCapsule ? 'ctx.directoryPicker' : 'ctx.fs'}`,
          ),
        ))
      }
      copy.append(createElement('small', '', isPickerCapsule
        ? isPickerReset
          ? localText(context.locale, '移除固定浏览组件并恢复官方默认行为。', 'Remove the pinned browser components and restore the official default.')
          : localText(context.locale, '同时加入主机与 Web 界面组件。', 'Adds the host and Web UI components together.')
        : localText(
            context.locale,
            action.replacementEntryId === 'fs-sandbox'
              ? '回到受限的工作区沙箱路径；文件工具仍保持连接。'
              : '访问本机文件系统；预览会清楚说明权限变化。',
            action.replacementEntryId === 'fs-sandbox'
              ? 'Return to a constrained workspace sandbox while file tools stay connected.'
              : 'Access the local filesystem; the preview explains the permission change.',
          )))
      const button = createElement('button', 'composer-candidate-button', localText(context.locale, '预览这项修改', 'Preview this change'))
      button.type = 'button'
      if (action.planned) {
        button.textContent = localText(context.locale, '已加入修改预览', 'Added to change preview')
        button.disabled = true
        card.classList.add('planned')
      }
      if (authoringReadOnly()) {
        button.textContent = localText(context.locale, '当前配置只读', 'Current configuration is read-only')
        makeAuthoringActionReadOnly(button)
        card.classList.add('read-only')
      }
      button.addEventListener('click', () => void requestPlan(action))
      card.append(cardIcon(isPickerCapsule ? 'ph-folder-simple-plus' : 'ph-folder-open'), copy, button)
      appendCapabilityCard(card, {
        category: 'storage',
        search: `${action.replacementEntryId} ${action.replacementPluginName} ${action.entryId ?? ''} 目录 文件 本机 directory file local`,
      })
    }

    function appendServiceShortcut(serviceName) {
      const service = context.inspection?.services.find(candidate => candidate.name === serviceName)
      if (!service || service.id === context.serviceId) return
      const isFs = serviceName === 'fs'
      const card = createElement('div', 'composer-candidate-card composer-service-shortcut')
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', localText(context.locale, '打开当前配置中的能力', 'Open this capability in the current config')))
      copy.append(createElement('strong', '', isFs
        ? localText(context.locale, '本机文件系统', 'Local filesystem')
        : localText(context.locale, '目录选择', 'Directory picker')))
      copy.append(createElement('small', '', isFs
        ? localText(context.locale, '查看并切换文件访问提供者。', 'Inspect and switch the file-access provider.')
        : localText(context.locale, '让用户从应用内选择工作目录。', 'Let users choose a working directory in the app.')))
      const button = createElement('button', 'composer-candidate-button', localText(context.locale, '打开并查看', 'Open and inspect'))
      button.type = 'button'
      button.addEventListener('click', () => options.onServiceSelect?.(service.id))
      card.append(cardIcon(isFs ? 'ph-folder-open' : 'ph-folder-simple-plus'), copy, button)
      appendCapabilityCard(card, {
        category: 'storage',
        search: isFs
          ? 'fs local filesystem 本机 文件系统 文件访问'
          : 'directory picker browse 目录 选择 工作区',
      })
    }

    function appendMcpHttpCard() {
      const component = context.inspection?.componentCatalog?.find(item => item.id === 'mcp-streamable-http')
      if (!component) return false
      const plannedAction = currentMcpHttpAction(context.draftActionIds)
      const card = createElement('div', 'composer-candidate-card composer-mcp-card')
      if (plannedAction) card.classList.add('planned')
      const copy = createElement('div', 'composer-candidate-copy')
      copy.append(createElement('span', '', localText(
        context.locale,
        '当前官方 DSH 已安装',
        'Installed in the current official DSH',
      )))
      copy.append(createElement('strong', '', localText(
        context.locale,
        '连接 MCP 工具服务',
        'Connect an MCP tool server',
      )))
      copy.append(createElement('small', '', localText(
        context.locale,
        '填写一个无凭据的 HTTP 地址。预览只检查配置，不会连接该服务。',
        'Enter a no-credential HTTP endpoint. Preview validates configuration without contacting it.',
      )))
      if (component.packageVersion) {
        copy.append(createElement('small', 'composer-package-note', `${component.packageName} · ${component.packageVersion}`))
      }
      const activeNames = (component.instances ?? [])
        .filter(instance => instance.availability === 'active')
        .map(instance => instance.namespace ?? instance.entryId)
      if (activeNames.length > 0) copy.append(createElement(
        'small',
        'composer-active-components',
        localText(context.locale, `已连接：${activeNames.join('、')}`, `Connected: ${activeNames.join(', ')}`),
      ))
      card.append(cardIcon('ph-plugs-connected'), copy)

      if (component.availability === 'unavailable' || !component.canAdd) {
        const unavailable = createElement('button', 'composer-candidate-button', localText(
          context.locale,
          component.availability === 'unavailable' ? '当前 DSH 未安装此组件' : '当前配置只读',
          component.availability === 'unavailable' ? 'Not installed in this DSH' : 'Current configuration is read-only',
        ))
        unavailable.type = 'button'
        unavailable.disabled = true
        if (component.availability !== 'unavailable'
          && context.inspection?.authoring?.state === 'read-only') {
          unavailable.title = profileAuthoringReadOnlyText(context.locale, context.inspection)
        }
        card.append(unavailable)
        appendCapabilityCard(card, {
          category: 'integration',
          search: 'mcp model context protocol 工具 服务 集成 http integration tools server',
        })
        return true
      }

      const form = createElement('form', 'composer-mcp-form')
      const nameLabel = createElement('label', 'composer-mcp-field')
      nameLabel.append(createElement('span', '', localText(context.locale, '工具名称', 'Tool namespace')))
      const nameInput = createElement('input', 'composer-mcp-input')
      nameInput.name = 'serverName'
      nameInput.autocomplete = 'off'
      nameInput.maxLength = 32
      nameInput.pattern = '[A-Za-z0-9_-]{1,32}'
      nameInput.placeholder = localText(context.locale, '例如 docs', 'e.g. docs')
      nameInput.value = plannedAction?.serverName ?? ''
      nameInput.disabled = Boolean(plannedAction)
      nameLabel.append(nameInput)
      const urlLabel = createElement('label', 'composer-mcp-field composer-mcp-url-field')
      urlLabel.append(createElement('span', '', localText(context.locale, 'MCP HTTP 地址', 'MCP HTTP endpoint')))
      const urlInput = createElement('input', 'composer-mcp-input')
      urlInput.name = 'url'
      urlInput.type = 'url'
      urlInput.autocomplete = 'url'
      urlInput.placeholder = 'https://example.com/mcp'
      urlInput.value = plannedAction?.url ?? ''
      urlInput.disabled = Boolean(plannedAction)
      urlLabel.append(urlInput)
      const feedback = createElement('small', 'composer-mcp-feedback', plannedAction
        ? localText(context.locale, '已加入待应用修改。', 'Added to pending changes.')
        : localText(context.locale, '不会保存请求头或凭据。', 'No headers or credentials are stored.'))
      const button = createElement('button', 'composer-candidate-button composer-mcp-submit', localText(
        context.locale,
        plannedAction ? '已加入修改预览' : '验证并加入预览',
        plannedAction ? 'Added to change preview' : 'Validate and add to preview',
      ))
      button.type = 'submit'
      button.disabled = Boolean(plannedAction)
      const dragHandle = createElement('span', 'composer-mcp-drag-handle')
      dragHandle.tabIndex = plannedAction ? -1 : 0
      dragHandle.draggable = !plannedAction
      dragHandle.setAttribute('role', 'button')
      dragHandle.setAttribute('aria-label', localText(
        context.locale,
        '拖到画布以加入预览',
        'Drag to the canvas to add to preview',
      ))
      dragHandle.append(createElement('i', 'ph ph-dots-six-vertical'))
      dragHandle.append(createElement('span', '', localText(context.locale, '也可拖到画布', 'or drag to canvas')))

      const configuredAction = () => {
        try {
          const action = createMcpHttpAction(nameInput.value, urlInput.value)
          nameInput.setCustomValidity('')
          urlInput.setCustomValidity('')
          feedback.dataset.state = 'ready'
          feedback.textContent = localText(
            context.locale,
            `将加入 mcp__${action.serverName}__* 工具；尚未写入。`,
            `Will add mcp__${action.serverName}__* tools; nothing is written yet.`,
          )
          return action
        } catch (error) {
          feedback.dataset.state = 'error'
          feedback.textContent = mcpInputErrorText(context.locale, error)
          return undefined
        }
      }
      form.addEventListener('submit', event => {
        event.preventDefault()
        if (plannedAction) return
        const action = configuredAction()
        if (action) void requestPlan(action)
      })
      form.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.target?.tagName !== 'INPUT' || plannedAction) return
        event.preventDefault()
        form.requestSubmit()
      })
      ;[nameInput, urlInput].forEach(input => input.addEventListener('input', () => {
        feedback.dataset.state = ''
        feedback.textContent = localText(context.locale, '不会保存请求头或凭据。', 'No headers or credentials are stored.')
      }))
      dragHandle.addEventListener('dragstart', event => {
        const action = configuredAction()
        if (!action) {
          event.preventDefault()
          return
        }
        activeMcpDragAction = action
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'copy'
          event.dataTransfer.setData('text/plain', action.id)
        }
        card.classList.add('dragging')
        setStatus(
          'intent',
          `把 ${action.serverName} 拖到画布，创建同一个受约束添加意图。`,
          `Drop ${action.serverName} on the canvas to create the same constrained add intent.`,
        )
      })
      dragHandle.addEventListener('dragend', () => {
        activeMcpDragAction = undefined
        card.classList.remove('dragging')
        options.container.classList.remove('mcp-component-drop-target')
      })
      form.append(nameLabel, urlLabel, feedback, dragHandle, button)
      card.append(form)
      appendCapabilityCard(card, {
        category: 'integration',
        search: `mcp model context protocol ${component.packageName} 工具 服务 集成 http integration tools server`,
      })
      return true
    }

    function renderCandidateShelf() {
      options.candidateShelf.replaceChildren()
      const actions = [...candidateActions.values()]
      const pluginActions = actions.filter(action => action.candidateKind === 'plugin-action')
      const compositionActions = actions.filter(action => action.candidateKind !== 'plugin-action')
      const authoringReadOnly = context.inspection?.authoring?.state === 'read-only'
      if (authoringReadOnly) {
        const notice = createElement('section', 'composer-authoring-notice')
        notice.setAttribute('role', 'status')
        notice.append(createElement('strong', '', localText(context.locale, '当前 Harness 为只读', 'This Harness is read-only')))
        notice.append(createElement('p', '', profileAuthoringReadOnlyText(context.locale, context.inspection)))
        options.candidateShelf.append(notice)
      }
      const sessionAids = sessionAidDefinitions()
      const sessionAidEntryIds = new Set(sessionAids.map(item => item.entryId))
      const stateItems = [...stateActions.values()].filter(action => !sessionAidEntryIds.has(action.entryId))
      const hasSessionAidCards = sessionAids.reduce(
        (count, definition) => count + (appendSessionAidCard(definition) ? 1 : 0),
        0,
      ) > 0
      const hasMcpCard = appendMcpHttpCard()
      pluginActions
        .sort((left, right) => (left.entryId === 'time-context' ? -1 : right.entryId === 'time-context' ? 1 : 0))
        .forEach(appendPluginCard)
      if (authoringReadOnly) {
        const lifecycleActionIds = new Set(pluginActions.map(action => action.entryId))
        ;(context.inspection?.componentCatalog ?? [])
          .filter(component => (component.id === 'time-context' || component.id === 'schedule')
            && !lifecycleActionIds.has(component.id))
          .forEach(appendReadOnlyLifecycleCard)
      }
      if (context.scope !== 'focus') {
        const selected = stateActions.get(context.selectedNodeId)
        const selectedStateAction = selected && !sessionAidEntryIds.has(selected.entryId) ? selected : undefined
        if (selectedStateAction) appendStateCard(selectedStateAction)
        if (pluginActions.length === 0 && !selectedStateAction && !hasMcpCard && !hasSessionAidCards) {
          options.candidateShelf.append(createElement(
            'p',
            'composer-shelf-empty',
            stateItems.length > 0
              ? localText(context.locale, '选择一个可修改的节点，或把它拖到“开启/关闭”目标。', 'Select an editable node, or drag it to the Turn on/Turn off target.')
              : localText(context.locale, '当前配置没有可安全执行的修改。', 'No safe change is available for the current configuration.'),
          ))
        }
        appendFilteredEmptyState()
        return
      }
      appendServiceShortcut('directoryPicker')
      appendServiceShortcut('fs')
      compositionActions.forEach(appendCompositionCard)
      if (pluginActions.length + compositionActions.length < 3) stateItems.forEach(appendStateCard)
      if (!hasMcpCard && !hasSessionAidCards && pluginActions.length === 0 && compositionActions.length === 0 && stateItems.length === 0) {
        options.candidateShelf.append(createElement(
          'p',
          'composer-shelf-empty',
          localText(context.locale, '当前能力暂时没有可安全执行的修改。', 'No safe change is currently available for this capability.'),
        ))
      }
      appendFilteredEmptyState()
    }

    async function requestPlan(action) {
      const actionLabel = action.entryId ?? action.replacementEntryId
      if (authoringReadOnly()) {
        setStatus(
          'intent',
          profileAuthoringReadOnlyText('zh', context.inspection),
          profileAuthoringReadOnlyText('en', context.inspection),
        )
        return
      }
      setStatus('planning', '正在用官方 DSH 检查这项修改…', `Asking official DSH to validate ${actionLabel}…`)
      try {
        const result = await options.onPlan(action)
        if (result) {
          setStatus(
            'ready',
            result.candidate?.inspection
              ? '官方 DSH 已确认这项修改可以生效；配置文件尚未改变。'
              : '修改已经进入预览；配置文件尚未改变。',
            result.candidate?.inspection
              ? 'The canvas now shows the official DSH candidate graph; the source is unchanged, and the composition can be committed once after review.'
              : 'Intent added to the no-write transaction draft; inspect the combined diff, then commit once.',
          )
        } else {
          setStatus('error', '这项修改目前无法通过验证；配置文件没有改变。', 'This change could not be validated; the DSH file is unchanged.')
        }
      } catch (error) {
        setStatus(
          'error',
          `无法预览：${error instanceof Error ? error.message : String(error)}`,
          `Planning failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    async function requestStatePlan(action) {
      const capability = action.capability ?? 'ctx.fs'
      if (authoringReadOnly()) {
        setStatus(
          'intent',
          profileAuthoringReadOnlyText('zh', context.inspection),
          profileAuthoringReadOnlyText('en', context.inspection),
        )
        return
      }
      const removalWithoutRepair = action.intent === 'remove-provider' && action.repairAvailable === false
      setStatus(
        'planning',
        action.intent === 'remove-provider'
          ? `正在检查移除 ${action.entryId} 后的 ${capability} 连接与安全边界…`
          : `正在让官方 DSH 分析${action.intent === 'disable' ? '禁用' : '启用'} ${action.entryId}…`,
        action.intent === 'remove-provider'
          ? `Checking the ${capability} disconnection and safe boundary before removing ${action.entryId}…`
          : `Asking official DSH to analyze ${action.intent === 'disable' ? 'disabling' : 'enabling'} ${action.entryId}…`,
      )
      try {
        const result = await options.onStatePlan?.(action)
        if (result) {
          setStatus(
            result.canApply ? 'ready' : 'intent',
            result.canApply
              ? '官方 DSH 已确认这项修改可以生效；配置文件尚未改变。'
              : removalWithoutRepair
                ? '已生成影响预览；当前没有可证明安全的替代方案，不能应用。'
                : '这项修改还会影响其他组件；请在“待应用的修改”中选择同时处理。',
            result.canApply
              ? 'State intent added to the no-write transaction; inspect the official candidate and exact diff before one commit.'
              : removalWithoutRepair
                ? 'Impact preview created. No provably safe replacement is available, so Apply stays disabled.'
                : 'This change needs a dependency decision. Choose a repair in Pending changes.',
          )
        } else {
          setStatus('error', '当前无法形成状态计划，DSH 文件未改变。', 'A state plan could not be produced; the DSH file is unchanged.')
        }
      } catch (error) {
        setStatus(
          'error',
          `状态规划失败：${error instanceof Error ? error.message : String(error)}`,
          `State planning failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    function findTarget(node, ids) {
      const center = node.renderedPosition()
      const eligible = ids
        .map(id => graph.getElementById(id))
        .filter(target => target.nonempty())
      return eligible.find(target => {
        const box = target.renderedBoundingBox({ includeLabels: false, includeOverlays: false })
        const padding = 28
        return center.x >= box.x1 - padding
          && center.x <= box.x2 + padding
          && center.y >= box.y1 - padding
          && center.y <= box.y2 + padding
      })
    }

    function findDropTarget(candidate) {
      const pluginTargetId = candidate.data('pluginTargetId')
      if (pluginTargetId) return findTarget(candidate, [pluginTargetId])
      const compatiblePortId = candidate.data('compatiblePortId')
      const currentNodeId = candidate.data('currentNodeId')
      const serviceNodeId = candidate.data('serviceNodeId')
      return findTarget(candidate, [compatiblePortId, currentNodeId, serviceNodeId].filter(Boolean))
    }

    function stateTargetId(action) {
      return action.intent === 'enable'
        ? ENABLE_TARGET_ID
        : action.intent === 'remove-provider'
          ? REMOVE_PROVIDER_TARGET_ID
          : DISABLE_TARGET_ID
    }

    function findStateTarget(node, action) {
      return findTarget(node, [stateTargetId(action)])
    }

    function placeStateTargetInViewport(action) {
      if (context.scope === 'focus') return
      const target = graph.getElementById(stateTargetId(action))
      if (target.empty()) return
      const extent = graph.extent()
      const zoom = graph.zoom()
      const renderedX = action.intent === 'enable' ? 138 : Math.max(138, options.container.clientWidth - 138)
      target.position({
        x: extent.x1 + renderedX / zoom,
        y: extent.y1 + 92 / zoom,
      })
    }

    function bindGraphEvents() {
      graph.on('render', () => {
        scheduleNodeIcons()
        scheduleInteractionLayer()
      })
      graph.on('tap', event => {
        if (event.target === graph) {
          graph.$(':selected').unselect()
          clearPresentationSelection()
        }
      })
      graph.on('tap', 'edge', event => {
        selectPresentationElement(event.target)
        setStatus(
          'layout',
          '选择直线、折线或曲线；拖动出现的控制点即可调整路径。',
          'Choose Straight, Elbow, or Curve, then drag the visible control point to adjust the route.',
        )
      })
      graph.on('tap', 'node', event => {
        if (event.target.hasClass('semantic-port')) {
          const hostNodeId = event.target.data('hostNodeId')
          const capability = event.target.data('capability') || 'ctx.fs'
          if (hostNodeId) options.onSelect(hostNodeId)
          setStatus(
            'intent',
            event.target.hasClass('provider-input')
              ? `这是 ${capability} 的 Provider 接入口；只有真实兼容且可写的替代项会在拖动时高亮。`
              : `这个端口来自当前 DSH 解析出的 ${capability} 供需关系；移动端口或连线不会写入配置。`,
            event.target.hasClass('provider-input')
              ? `This is the ${capability} provider slot; only a compatible replacement backed by a real writer highlights it.`
              : `This port comes from the current DSH-resolved ${capability} contract; moving its line never writes configuration.`,
          )
          return
        }
        if (event.target.hasClass('candidate') || event.target.hasClass('intent-target')) return
        if (event.target.hasClass('view-group')) {
          selectPresentationElement(event.target)
          setStatus(
            'layout',
            '拖动分组可整体移动内部节点；拉动四角可调整边界大小。',
            'Drag the group to move its nodes together, or pull a corner to resize its boundary.',
          )
          return
        }
        clearPresentationSelection()
        options.onSelect(event.target.id())
      })
      graph.on('mouseover', 'edge', () => { options.container.style.cursor = 'pointer' })
      graph.on('mouseout', 'edge', () => { options.container.style.cursor = '' })
      graph.on('position', 'node', event => {
        const node = event.target
        if (!node.hasClass('semantic-port')) syncSemanticPorts(node)
        refreshConnectedRoutes(node)
      })
      graph.on('dragfree', 'node', event => {
        if (event.target.hasClass('candidate')
          || event.target.hasClass('intent-target')
          || event.target.hasClass('semantic-port')
          || event.target.hasClass('view-group')
          || event.target.scratch('state-drag')) return
        savePresentation()
        setStatus('layout', '布局已仅保存在本机；DSH 配置没有改变。', 'Layout saved locally only; the DSH configuration did not change.')
      })
      graph.on('grab', 'node', event => {
        const node = event.target
        if (node.hasClass('candidate') || node.hasClass('intent-target') || node.hasClass('semantic-port') || node.hasClass('view-group')) return
        const action = stateActions.get(node.id())
        if (!action || authoringReadOnly()) return
        node.scratch('state-drag', { action, origin: { ...node.position() } })
        placeStateTargetInViewport(action)
        graph.getElementById(stateTargetId(action)).addClass('visible-intent-target eligible-drop-target')
        setStatus(
          'intent',
          action.intent === 'remove-provider'
            ? action.repairAvailable === false
              ? `将 ${action.entryId} 拖到“移除 Provider”目标；GraphControl 会显示 ${action.capability} 断开与无法自动修复的原因。`
              : `将 ${action.entryId} 拖到“移除 Provider”目标；GraphControl 会先显示 ctx.fs 断开与沙箱修复。`
            : `将 ${action.entryId} 拖到“${action.intent === 'disable' ? '禁用' : '启用'}”目标以形成受约束状态意图。`,
          action.intent === 'remove-provider'
            ? action.repairAvailable === false
              ? `Drop ${action.entryId} on Remove provider to review the lost ${action.capability} contract and why no automatic repair is safe.`
              : `Drop ${action.entryId} on Remove provider to review the lost ctx.fs contract and sandbox repair first.`
            : `Drop ${action.entryId} on ${action.intent === 'disable' ? 'Disable' : 'Enable'} to create a constrained state intent.`,
        )
      })
      graph.on('drag', 'node', event => {
        const node = event.target
        const drag = node.scratch('state-drag')
        if (!drag) return
        graph.getElementById(stateTargetId(drag.action)).removeClass('active-drop-target')
        findStateTarget(node, drag.action)?.addClass('active-drop-target')
      })
      graph.on('free', 'node', event => {
        const node = event.target
        const drag = node.scratch('state-drag')
        if (!drag) return
        const target = findStateTarget(node, drag.action)
        node.removeScratch('state-drag')
        graph.getElementById(stateTargetId(drag.action)).removeClass('visible-intent-target eligible-drop-target active-drop-target')
        if (target) {
          node.position(drag.origin)
          savePresentation()
          void requestStatePlan(drag.action)
          return
        }
        savePresentation()
        setStatus('layout', '节点位置已更新，但没有命中状态目标；未创建语义计划。', 'Node position updated without hitting a state target; no semantic plan was created.')
      })
      graph.on('grab', 'node.candidate', event => {
        if (authoringReadOnly()) return
        const candidate = event.target
        candidate.scratch('drag-origin', { ...candidate.position() })
        const pluginTargetId = candidate.data('pluginTargetId')
        if (pluginTargetId) {
          graph.getElementById(pluginTargetId).addClass('visible-intent-target eligible-drop-target')
        } else {
          const compatiblePortId = candidate.data('compatiblePortId')
          if (compatiblePortId) graph.getElementById(compatiblePortId).addClass('eligible-drop-target')
          graph.getElementById(candidate.data('currentNodeId')).addClass('eligible-drop-target')
          graph.getElementById(candidate.data('serviceNodeId')).addClass('eligible-drop-target')
        }
        setStatus(
          'intent',
          candidate.hasClass('plugin-action')
            ? '把组件拖到高亮目标，开始预览。'
            : candidate.data('compatiblePortId')
              ? `这个替代项提供相同的 ${candidate.data('capability') || 'ctx.fs'} 接口；拖到高亮端口即可生成无写入预览。${candidate.hasClass('plugin-capsule') ? ' Host 与 Web UI 会作为一组加入或移除。' : ''}`
              : candidate.hasClass('plugin-capsule')
                ? '将插件组拖到高亮 Provider 或服务上，以预览整组增删及依赖影响。'
              : '将候选拖到高亮 Provider 或服务上以生成无写入计划。',
          candidate.hasClass('plugin-action')
            ? 'Drop the component on the highlighted target to start a preview.'
            : candidate.data('compatiblePortId')
              ? `This replacement provides the same ${candidate.data('capability') || 'ctx.fs'} contract; drop it on the highlighted port to create a no-write preview.${candidate.hasClass('plugin-capsule') ? ' Host and Web UI are added or removed as one capsule.' : ''}`
              : candidate.hasClass('plugin-capsule')
                ? 'Drop the plugin capsule on the highlighted provider or service to preview the complete add/remove impact.'
              : 'Drop the candidate on the highlighted provider or service to create a no-write plan.',
        )
      })
      graph.on('drag', 'node.candidate', event => {
        graph.nodes().removeClass('active-drop-target')
        findDropTarget(event.target)?.addClass('active-drop-target')
      })
      graph.on('free', 'node.candidate', event => {
        if (authoringReadOnly()) return
        const candidate = event.target
        const target = findDropTarget(candidate)
        graph.nodes().removeClass('eligible-drop-target active-drop-target visible-intent-target')
        if (target) {
          const action = candidateActions.get(candidate.id())
          const origin = candidate.scratch('drag-origin')
          if (origin) candidate.position(origin)
          savePresentation()
          if (action) void requestPlan(action)
          return
        }
        savePresentation()
        setStatus('layout', '没有放到高亮目标上，因此没有创建修改预览。', 'The component missed the highlighted target, so no change preview was created.')
      })
    }

    function render() {
      if (!context.inspection) return
      renderedCompact = compactFocus()
      const saved = loadPresentation()
      const elements = context.scope === 'focus' ? focusElements() : resolvedElements()
      elements.forEach(element => {
        if (element.data?.source) return
        if (String(element.classes ?? '').includes('semantic-port')) return
        const group = saved.groups[element.data.id]
        if (group && String(element.classes ?? '').includes('view-group')) {
          element.position = { x: group.x, y: group.y }
          element.data.groupWidth = group.width
          element.data.groupHeight = group.height
          return
        }
        const presentationId = element.data.presentationId ?? element.data.id
        if (saved.positions[presentationId]) element.position = saved.positions[presentationId]
      })
      const nodeElementsById = new Map(elements
        .filter(element => !element.data?.source)
        .map(element => [element.data.id, element]))
      elements.filter(element => String(element.classes ?? '').includes('semantic-port')).forEach(port => {
        const host = nodeElementsById.get(port.data.hostNodeId)
        if (!host?.position) return
        port.position = {
          x: host.position.x + (Number(port.data.offsetX) || 0),
          y: host.position.y + (Number(port.data.offsetY) || 0),
        }
      })
      const hasSavedPositions = Object.keys(saved.positions).length > 0 || Object.keys(saved.groups).length > 0
      if (graph) graph.destroy()
      graph = window.cytoscape({
        container: options.container,
        elements,
        style: graphStyles(),
        layout: context.scope === 'focus'
          ? { name: 'preset', fit: compactFocus(), padding: 28 }
          : hasSavedPositions
            ? { name: 'preset', fit: true, padding: 48 }
            : {
              name: 'cose',
              animate: false,
              fit: true,
              padding: 54,
              randomize: true,
              nodeRepulsion: 520000,
              idealEdgeLength: 105,
              edgeElasticity: 120,
              gravity: 0.16,
              numIter: 320,
            },
        zoom: context.scope === 'focus' && !compactFocus() ? 1 : undefined,
        pan: context.scope === 'focus' && !compactFocus() ? { x: 0, y: 0 } : undefined,
        minZoom: 0.12,
        maxZoom: 2.4,
        boxSelectionEnabled: true,
        selectionType: 'single',
      })
      syncAllSemanticPorts()
      graph.edges().forEach(edge => {
        const presentationId = edge.data('presentationId') || edge.id()
        restoreEdgeRoute(edge, saved.routes[presentationId])
      })
      bindGraphEvents()
      renderNodeIcons()
      renderInteractionLayer()
      if (context.selectedNodeId) {
        const selected = graph.getElementById(context.selectedNodeId)
        if (selected.nonempty()) selected.select()
      }
      requestAnimationFrame(() => {
        if (!hasSavedPositions) savePresentation()
      })
      let semanticNodeCount = 0
      graph.nodes().forEach(node => {
        if (!node.hasClass('intent-target') && !node.hasClass('view-group') && !node.hasClass('semantic-port')) semanticNodeCount += 1
      })
      options.count.textContent = String(semanticNodeCount)
      renderCandidateShelf()
      setStatus(
        'layout',
        context.scope === 'focus'
          ? activeService()?.name === 'fs'
            ? '端口与标注来自当前 DSH 的 ctx.fs 供需关系；拖动兼容 Provider 到高亮端口才会创建预览。'
            : activeService()?.name === 'directoryPicker'
              ? '当前目录选择器与应用界面通过 ctx.directoryPicker 相连；拖动 Host + Web UI 插件组到高亮替换入口即可预览。'
              : '可以自由整理节点；选择上方修改，或把候选组件拖到高亮目标。'
          : '正在查看完整配置图；拖动只调整本机布局，不会修改 DSH。',
        context.scope === 'focus'
          ? activeService()?.name === 'fs'
            ? 'Ports and labels come from the current DSH ctx.fs contract; only a compatible provider dropped on the highlighted port creates a preview.'
            : activeService()?.name === 'directoryPicker'
              ? 'The current picker and app interface meet through ctx.directoryPicker; drop the Host + Web UI capsule on the highlighted replacement slot to preview it.'
              : 'Move ordinary nodes freely; layout stays local. Candidates create a plan only on highlighted targets.'
          : 'Viewing the full resolved graph; dragging changes local layout only and never edits DSH.',
      )
      if (!resizeObserver && typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => {
          if (resizeFrame) cancelAnimationFrame(resizeFrame)
          resizeFrame = requestAnimationFrame(() => {
            if (renderedCompact !== compactFocus()) {
              render()
              return
            }
            graph?.resize()
            if (graph?.elements().nonempty() && (context.scope !== 'focus' || renderedCompact)) {
              graph.fit(graph.elements(), renderedCompact ? 22 : 48)
            }
            scheduleInteractionLayer()
          })
        })
        resizeObserver.observe(options.container)
      }
    }

    function arrangeGraph() {
      if (!graph) return
      if (context.scope === 'focus') {
        graph.batch(() => {
          graph.nodes().forEach(node => {
            if (node.hasClass('intent-target')) return
            const x = Number(node.data('defaultX'))
            const y = Number(node.data('defaultY'))
            if (Number.isFinite(x) && Number.isFinite(y)) node.position({ x, y })
            if (node.hasClass('view-group')) {
              node.data('groupWidth', Number(node.data('defaultGroupWidth')) || GROUP_MIN_WIDTH)
              node.data('groupHeight', Number(node.data('defaultGroupHeight')) || GROUP_MIN_HEIGHT)
            }
          })
          graph.edges().forEach(restoreEdgeRoute)
        })
        savePresentation()
        renderNodeIcons()
        renderInteractionLayer()
        if (!compactFocus()) {
          graph.zoom(1)
          graph.pan({ x: 0, y: 0 })
        } else graph.fit(graph.elements(), 24)
        setStatus(
          'layout',
          '已按连接关系自动整理；结果仅保存在本机。',
          'The graph was arranged from its connections and saved locally only.',
        )
        return
      }
      const layout = graph.layout({
        name: 'cose',
        animate: true,
        animationDuration: 360,
        fit: true,
        padding: 48,
        randomize: false,
        nodeRepulsion: 520000,
        idealEdgeLength: 105,
        edgeElasticity: 120,
        gravity: 0.16,
        numIter: 260,
      })
      layout.one('layoutstop', () => {
        applyAllEdgeRoutes()
        savePresentation()
        renderNodeIcons()
        renderInteractionLayer()
      })
      layout.run()
    }

    return {
      update(next) {
        Object.assign(context, next)
        render()
      },
      setTheme(theme) {
        context.theme = theme
        if (graph) {
          graph.style(graphStyles())
          applyAllEdgeRoutes()
          scheduleInteractionLayer()
        }
      },
      setLocale(locale) {
        context.locale = locale
        renderCandidateShelf()
        renderInteractionLayer()
        setStatus('layout', '拖动普通节点只调整本机布局；可执行的修改需要放到高亮目标。', 'Dragging ordinary nodes changes only local layout; available changes must land on a highlighted target.')
      },
      setCapabilitySearch(query, filter = context.capabilityFilter) {
        context.capabilityQuery = typeof query === 'string' ? query : ''
        context.capabilityFilter = ['all', 'context', 'storage', 'interaction', 'integration', 'tools'].includes(filter)
          ? filter
          : 'all'
        renderCandidateShelf()
      },
      setSelection(nodeId) {
        context.selectedNodeId = nodeId
        activePresentationSelection = undefined
        if (graph) {
          graph.$(':selected').unselect()
          const selected = graph.getElementById(nodeId)
          if (selected.nonempty()) {
            selected.select()
            if (context.scope !== 'focus') {
              graph.center(selected)
              graph.zoom({
                level: Math.max(graph.zoom(), 0.78),
                renderedPosition: {
                  x: options.container.clientWidth / 2,
                  y: options.container.clientHeight / 2,
                },
              })
            }
          }
        }
        renderCandidateShelf()
        renderInteractionLayer()
      },
      fit() {
        if (!graph) return
        if (context.scope === 'focus' && !compactFocus()) {
          graph.zoom(1)
          graph.pan({ x: 0, y: 0 })
          scheduleInteractionLayer()
          return
        }
        graph.fit(graph.elements(), 48)
        scheduleInteractionLayer()
      },
      autoArrange() {
        arrangeGraph()
      },
      resetLayout() {
        clearPresentation()
        activePresentationSelection = undefined
        render()
      },
      destroy() {
        if (resizeFrame) cancelAnimationFrame(resizeFrame)
        if (iconFrame) cancelAnimationFrame(iconFrame)
        if (interactionFrame) cancelAnimationFrame(interactionFrame)
        stopPointerInteraction?.()
        resizeObserver?.disconnect()
        graph?.destroy()
        iconLayer?.remove()
        interactionLayer?.remove()
      },
    }
  }

  window.createDshComposer = createDshComposer
})()
