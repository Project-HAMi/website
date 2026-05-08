const TOOL_NAMESPACE = 'hami';
let registrationController;
let registeredWithFallback = false;

function getLocalePath(pathname) {
  return pathname.startsWith('/zh/') || pathname === '/zh' ? '/zh' : '';
}

function docsUrl(pathname, docPath = '') {
  const localePath = getLocalePath(pathname || window.location.pathname);
  const normalizedPath = docPath ? docPath.replace(/^\/+/, '') : '';
  return `${window.location.origin}${localePath}/docs${normalizedPath ? `/${normalizedPath}` : ''}`;
}

function getTools() {
  return [
    {
      name: `${TOOL_NAMESPACE}.openDocs`,
      description: 'Open a HAMi documentation page by path.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Optional documentation path, such as get-started/deploy-with-helm.',
          },
        },
        additionalProperties: false,
      },
      execute: async ({ path = '' } = {}) => {
        const url = docsUrl(window.location.pathname, path);
        window.location.assign(url);
        return { url };
      },
    },
    {
      name: `${TOOL_NAMESPACE}.searchDocs`,
      description: 'Search HAMi documentation by opening the documentation page with a query.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'Search query for HAMi documentation.',
          },
        },
        additionalProperties: false,
      },
      execute: async ({ query }) => {
        const url = new URL(docsUrl(window.location.pathname));
        url.searchParams.set('q', query);
        window.location.assign(url.toString());
        return { url: url.toString() };
      },
    },
    {
      name: `${TOOL_NAMESPACE}.getDiscoveryResources`,
      description: 'Return machine-readable discovery resources for the HAMi website.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: async () => ({
        robots: `${window.location.origin}/robots.txt`,
        apiCatalog: `${window.location.origin}/.well-known/api-catalog`,
        agentSkills: `${window.location.origin}/.well-known/agent-skills/index.json`,
        mcpServerCard: `${window.location.origin}/.well-known/mcp/server-card.json`,
      }),
    },
  ];
}

function registerWebMcpTools() {
  if (typeof navigator === 'undefined' || !navigator.modelContext) {
    return;
  }

  if (registrationController) {
    registrationController.abort();
  }

  registrationController = new AbortController();
  const tools = getTools();

  if (typeof navigator.modelContext.registerTool === 'function') {
    tools.forEach((tool) => {
      if (typeof navigator.modelContext.unregisterTool === 'function') {
        try {
          navigator.modelContext.unregisterTool(tool.name);
        } catch (error) {
          // Ignore runtimes that throw when the tool was not registered yet.
        }
      }
      navigator.modelContext.registerTool(tool, { signal: registrationController.signal });
    });
    return;
  }

  if (!registeredWithFallback && typeof navigator.modelContext.provideContext === 'function') {
    navigator.modelContext.provideContext({ tools });
    registeredWithFallback = true;
  }
}

export function onRouteDidUpdate() {
  registerWebMcpTools();
}
