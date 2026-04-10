const BUILTIN_ICON_LIBRARY = [
  {
    key: 'database',
    title: 'Database',
    keywords: ['data', 'storage', 'db'],
    category: 'Data',
    svg: '<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5.5" rx="6.5" ry="2.8" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 5.5v6.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V5.5" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 12v6.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V12" stroke="currentColor" stroke-width="1.7"/></svg>'
  },
  {
    key: 'cloud',
    title: 'Cloud',
    keywords: ['hosting', 'saas', 'platform'],
    category: 'Infrastructure',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7.8 18.5h9a3.7 3.7 0 0 0 .6-7.35A5.3 5.3 0 0 0 7.3 9.6 4.1 4.1 0 0 0 7.8 18.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'shield',
    title: 'Shield',
    keywords: ['security', 'auth', 'identity'],
    category: 'Security',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.6 18.5 6v5.8c0 4.1-2.54 7.31-6.5 8.6-3.96-1.29-6.5-4.5-6.5-8.6V6L12 3.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'user',
    title: 'User',
    keywords: ['person', 'actor', 'customer'],
    category: 'People',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  },
  {
    key: 'gear',
    title: 'Gear',
    keywords: ['settings', 'process', 'ops'],
    category: 'Operations',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.8v2.1M12 17.1v2.1M19.2 12h-2.1M6.9 12H4.8M17.1 6.9l-1.5 1.5M8.4 15.6l-1.5 1.5M17.1 17.1l-1.5-1.5M8.4 8.4 6.9 6.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="6.2" stroke="currentColor" stroke-width="1.4"/></svg>'
  },
  {
    key: 'server',
    title: 'Server',
    keywords: ['compute', 'host', 'rack'],
    category: 'Infrastructure',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="5" width="15" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="4.5" y="13.5" width="15" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h.01M8 16.5h.01M12 8h5M12 16.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'envelope',
    title: 'Message',
    keywords: ['mail', 'email', 'notification'],
    category: 'Communication',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="m5 8 7 5 7-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'chart',
    title: 'Analytics',
    keywords: ['report', 'metrics', 'dashboard'],
    category: 'Data',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 19.5h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.5 17v-4.5M12 17v-8M16.5 17v-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  },
  {
    key: 'globe',
    title: 'Internet',
    keywords: ['web', 'global', 'public'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 12h15M12 4a12.2 12.2 0 0 1 0 16M12 4a12.2 12.2 0 0 0 0 16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'lock',
    title: 'Lock',
    keywords: ['private', 'secure', 'restricted'],
    category: 'Security',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="5.5" y="10.5" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  },
  {
    key: 'folder',
    title: 'Folder',
    keywords: ['files', 'documents', 'storage'],
    category: 'Content',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8.5h6l1.5 2H20v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'bolt',
    title: 'Event',
    keywords: ['trigger', 'automation', 'real-time'],
    category: 'Flow',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M13.2 3.8 6.8 13h4l-.8 7.2 7.2-10h-4.1l.1-6.4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'api',
    title: 'API',
    keywords: ['interface', 'service', 'endpoint'],
    category: 'Flow',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 8h8M8 12h5M8 16h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="4.5" y="5" width="15" height="14" rx="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    key: 'queue',
    title: 'Queue',
    keywords: ['buffer', 'broker', 'message bus'],
    category: 'Communication',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="6" width="10" height="4.5" rx="1.2" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="13.5" width="10" height="4.5" rx="1.2" stroke="currentColor" stroke-width="1.6"/><path d="M14.5 8.2h2.2a2 2 0 0 1 2 2v3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'browser',
    title: 'Browser',
    keywords: ['frontend', 'ui', 'web app'],
    category: 'Product',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M4 9h16" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="7" r=".7" fill="currentColor"/><circle cx="9.5" cy="7" r=".7" fill="currentColor"/><circle cx="12" cy="7" r=".7" fill="currentColor"/></svg>'
  },
  {
    key: 'mobile',
    title: 'Mobile',
    keywords: ['phone', 'app', 'device'],
    category: 'Product',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="8" y="3.5" width="8" height="17" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M11 6h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="17.5" r=".8" fill="currentColor"/></svg>'
  },
  {
    key: 'package',
    title: 'Package',
    keywords: ['artifact', 'release', 'bundle'],
    category: 'Content',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.8 18.5 7v10L12 20.2 5.5 17V7L12 3.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M5.8 7.2 12 10.5l6.2-3.3M12 10.5v9.3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'clipboard',
    title: 'Process',
    keywords: ['workflow', 'task', 'checklist'],
    category: 'Operations',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="5.5" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9.2 10h5.8M9.2 13h5.8M9.2 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'key',
    title: 'Key',
    keywords: ['access', 'credential', 'secret'],
    category: 'Security',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="8.5" cy="11.5" r="3.5" stroke="currentColor" stroke-width="1.6"/><path d="M11.8 11.5h7.7M16 11.5v2.2M18.6 11.5v2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'search',
    title: 'Search',
    keywords: ['discover', 'query', 'find'],
    category: 'Product',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="5.2" stroke="currentColor" stroke-width="1.7"/><path d="m15 15 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  },
  {
    key: 'bell',
    title: 'Alert',
    keywords: ['notify', 'alarm', 'incident'],
    category: 'Communication',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5h9l-1.1-1.8v-3.5a3.4 3.4 0 0 0-6.8 0v3.5L7.5 16.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.3 18.2a1.9 1.9 0 0 0 3.4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'map',
    title: 'Map',
    keywords: ['location', 'region', 'site'],
    category: 'People',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 6.5 10 4l4 2.5 5.5-2.5v13L14 19.5 10 17 4.5 19.5v-13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 4v13M14 6.5v13" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    key: 'robot',
    title: 'Automation',
    keywords: ['bot', 'worker', 'agent'],
    category: 'Operations',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="6.5" y="8" width="11" height="8.5" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.2V8M9.5 12h.01M14.5 12h.01M9.5 16.5v2M14.5 16.5v2M6.5 12H4.5M19.5 12h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 14.3h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'factory',
    title: 'Factory',
    keywords: ['plant', 'manufacturing', 'site'],
    category: 'Operations',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 19V9.5l4.2 2.2V9.5l4.3 2.2V6.2l6 3.2V19H4.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 19v-4.2h3V19M16.5 6V4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'credit-card',
    title: 'Payment',
    keywords: ['billing', 'card', 'finance'],
    category: 'Product',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h16M7.5 14.2h3.5M13.5 14.2h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'terminal',
    title: 'Terminal',
    keywords: ['cli', 'shell', 'ops'],
    category: 'Infrastructure',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5.5" width="16" height="13" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="m8 9 2.8 2.3L8 13.6M12.8 14h3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'wifi',
    title: 'Network',
    keywords: ['wireless', 'connectivity', 'signal'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5.5 10.5a9.6 9.6 0 0 1 13 0M8.6 13.6a5.3 5.3 0 0 1 6.8 0M11.2 16.2a1.4 1.4 0 0 1 1.6 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="18.5" r=".9" fill="currentColor"/></svg>'
  },
  {
    key: 'hard-drive',
    title: 'Storage',
    keywords: ['disk', 'volume', 'filesystem'],
    category: 'Data',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="7" width="15" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 14.2h.01M10.5 14.2h.01M14.5 12.5h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'star',
    title: 'Priority',
    keywords: ['important', 'favorite', 'highlight'],
    category: 'Flow',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 4.2 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.4l5-.7L12 4.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'router',
    title: 'Router',
    keywords: ['network', 'routing', 'edge'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10" width="15" height="6.5" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 7.6a5.6 5.6 0 0 1 8 0M10.3 9.8a2.6 2.6 0 0 1 3.4 0M8 13.3h.01M11 13.3h.01M14 13.3h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'switch',
    title: 'Switch',
    keywords: ['network', 'ethernet', 'ports'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10.8h2M11 10.8h2M15 10.8h2M7 13.6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'firewall',
    title: 'Firewall',
    keywords: ['security', 'network', 'filter'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="5.5" y="7" width="13" height="10.5" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 10.5h13M10 7v3.5M14 10.5V14M10 14v3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'load-balancer',
    title: 'Load Balancer',
    keywords: ['network', 'traffic', 'distribution'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14M5 16.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.2 5 5.7 7.5 8.2 10M15.8 14 18.3 16.5 15.8 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5v9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'gateway',
    title: 'Gateway',
    keywords: ['integration', 'network', 'bridge'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 8.5h5M13 8.5h5M9.5 15.5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m8.5 6-2.5 2.5L8.5 11M15.5 13l2.5 2.5-2.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'vpn',
    title: 'VPN',
    keywords: ['tunnel', 'private network', 'secure'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 9.5h10M8.5 6.5h7M8.5 12.5h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 4.5 18 7v5.2c0 3-1.85 5.33-6 7.3-4.15-1.97-6-4.3-6-7.3V7l6-2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'dns',
    title: 'DNS',
    keywords: ['domain', 'resolution', 'name service'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="7" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M9 11.2 14.8 8M9 12.8 14.8 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'antenna',
    title: 'Antenna',
    keywords: ['wireless', 'tower', 'radio'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6v12M9 18h6M10 6.5a3 3 0 0 1 4 0M7.2 4.2a6.2 6.2 0 0 1 9.6 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'satellite',
    title: 'Satellite',
    keywords: ['space', 'signal', 'telemetry'],
    category: 'Network',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="m9 9 6 6M7 7l2 2M15 15l2 2M14.5 5.5l4 4-3 3-4-4 3-3ZM6 13l5 5M5.2 18.8l2.4-2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'container',
    title: 'Container',
    keywords: ['docker', 'runtime', 'image'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 8.5 12 5.5l5 3v7L12 18.5l-5-3v-7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.2 8.7 12 11.5l4.8-2.8M12 11.5v7" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'vm',
    title: 'Virtual Machine',
    keywords: ['hypervisor', 'guest', 'compute'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="5.5" width="15" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="9" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M9 18.5h6M10.5 15.5v3M13.5 15.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'cpu',
    title: 'CPU',
    keywords: ['processor', 'compute', 'chip'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="10.4" y="10.4" width="3.2" height="3.2" rx=".8" stroke="currentColor" stroke-width="1.4"/><path d="M12 4.5v2M15.5 4.8v1.7M8.5 4.8v1.7M19.5 12h-2M19.2 8.5h-1.7M19.2 15.5h-1.7M12 19.5v-2M15.5 19.2v-1.7M8.5 19.2v-1.7M4.5 12h2M4.8 8.5h1.7M4.8 15.5h1.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  },
  {
    key: 'gpu',
    title: 'GPU',
    keywords: ['graphics', 'acceleration', 'compute'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="8" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="11" cy="12" r="2.1" stroke="currentColor" stroke-width="1.4"/><path d="M17 10h2.2M17 12h2.2M17 14h2.2M7 18v1.5M10 18v1.5M13 18v1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  },
  {
    key: 'memory',
    title: 'Memory',
    keywords: ['ram', 'cache', 'buffer'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="9" width="15" height="6" rx="1.8" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 9v6M10.5 9v6M13.5 9v6M16.5 9v6M6.5 7v2M9.5 7v2M12.5 7v2M15.5 7v2M18.5 7v2M6.5 15v2M9.5 15v2M12.5 15v2M15.5 15v2M18.5 15v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
  },
  {
    key: 'cluster',
    title: 'Cluster',
    keywords: ['group', 'nodes', 'compute'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="5.5" width="5.5" height="4.8" rx="1.2" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="5.5" width="5.5" height="4.8" rx="1.2" stroke="currentColor" stroke-width="1.5"/><rect x="9.2" y="13.7" width="5.5" height="4.8" rx="1.2" stroke="currentColor" stroke-width="1.5"/><path d="M10 8h4M12 10.3v3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'lambda',
    title: 'Function',
    keywords: ['serverless', 'compute', 'runtime'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 5.5 14.3 18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.8 18.5h6.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.8 9h2.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  },
  {
    key: 'pipeline',
    title: 'Pipeline',
    keywords: ['ci', 'workflow', 'processing'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 8h4.5v8H14V8h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="8" r="1.1" fill="currentColor"/><circle cx="9.5" cy="16" r="1.1" fill="currentColor"/><circle cx="14" cy="16" r="1.1" fill="currentColor"/><circle cx="19" cy="8" r="1.1" fill="currentColor"/></svg>'
  },
  {
    key: 'repository',
    title: 'Repository',
    keywords: ['git', 'source', 'code'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 6h8.8a2 2 0 0 1 2 2v10.5H9a2 2 0 0 0-2 2V6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 6v12.5a2 2 0 0 1 2-2h8.8M10 10h5M10 13.3h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'monitoring',
    title: 'Monitoring',
    keywords: ['metrics', 'observability', 'health'],
    category: 'Compute',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="5.5" width="15" height="12.5" rx="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M7 14.8h2.8l1.8-4.4 2.8 6 1.6-3.2H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'conveyor',
    title: 'Conveyor',
    keywords: ['factory', 'assembly', 'line'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 14h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="7" cy="17.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="17.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><path d="M7 10.2h5l1.8-2.2H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'robot-arm',
    title: 'Robotic Arm',
    keywords: ['factory', 'automation', 'assembly'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 18.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 18.5v-3.8l3.7-2.1 2.4 2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="m15.1 10.2 2.3-2.3 1.6 1.6-2.3 2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12.7" cy="12.6" r="1.1" fill="currentColor"/><circle cx="9" cy="14.7" r="1.1" fill="currentColor"/></svg>'
  },
  {
    key: 'warehouse',
    title: 'Warehouse',
    keywords: ['storage', 'distribution', 'factory'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 10 12 4l7.5 6v9H4.5v-9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 19v-5h6v5M9 10h.01M12 10h.01M15 10h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'pallet',
    title: 'Pallet',
    keywords: ['crate', 'goods', 'logistics'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="7" width="12" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><path d="M5 17.5h14M8 14v3.5M12 14v3.5M16 14v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'forklift',
    title: 'Forklift',
    keywords: ['warehouse', 'factory', 'logistics'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 17h8v-5.5H9.5L8 8H5v9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 6v11M16 17h3M16 10h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="18" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="15" cy="18" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>'
  },
  {
    key: 'barcode',
    title: 'Barcode',
    keywords: ['scan', 'inventory', 'tracking'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6v12M8.5 6v12M11 6v12M14 6v12M16 6v12M18 6v12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.5 19h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'sensor',
    title: 'Sensor',
    keywords: ['telemetry', 'iot', 'factory'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="8.5" width="6" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.5v2M7.5 12H5.5M18.5 12h-2M8.3 8.3 7 7M15.7 8.3 17 7M8.3 15.7 7 17M15.7 15.7 17 17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'controller',
    title: 'Controller',
    keywords: ['plc', 'factory', 'logic'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 10.3h3M8 13.5h5M15.8 10.5h.01M15.8 13.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'wrench',
    title: 'Maintenance',
    keywords: ['repair', 'service', 'tool'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5a3.4 3.4 0 0 0-4.6 4.5L5.2 14.7a1.4 1.4 0 1 0 2 2L12 12a3.4 3.4 0 0 0 4.4-4.7l-2.2 2.1-1.6-1.6 1.9-2.3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'helmet',
    title: 'Safety',
    keywords: ['hard hat', 'ppe', 'factory'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 14.5a6 6 0 1 1 12 0v1H6v-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 15.5v2h8v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'truck',
    title: 'Truck',
    keywords: ['transport', 'delivery', 'logistics'],
    category: 'Factory',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 8h9v6.5H4.5V8ZM13.5 10h3l2 2.5v2H13.5V10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="16.8" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="16.8" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>'
  },
  {
    key: 'car',
    title: 'Car',
    keywords: ['vehicle', 'automotive', 'auto'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.9 15.4h14.2a1.1 1.1 0 0 0 1.04-1.47l-.54-1.56a1.9 1.9 0 0 0-1.8-1.27h-1.24l-1.72-2.18a1.76 1.76 0 0 0-1.38-.68h-2.9c-.54 0-1.04.24-1.38.66L7.45 11.1H6.17a1.9 1.9 0 0 0-1.8 1.28l-.52 1.55a1.1 1.1 0 0 0 1.04 1.47Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.15" cy="16.75" r="1.45" stroke="currentColor" stroke-width="1.4"/><circle cx="15.85" cy="16.75" r="1.45" stroke="currentColor" stroke-width="1.4"/></svg>'
  },
  {
    key: 'battery',
    title: 'Battery',
    keywords: ['ev', 'power', 'automotive'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="8" width="12" height="8" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M17 10h2v4h-2M8.5 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'charging',
    title: 'Charging',
    keywords: ['ev', 'charger', 'power'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M8.5 19V8.5A1.5 1.5 0 0 1 10 7h4a1.5 1.5 0 0 1 1.5 1.5V19H8.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11.5 3.8h1M15.5 10h2a1.5 1.5 0 0 1 1.5 1.5v2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m11.3 11.2 1.4 0-1 2h1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'motor',
    title: 'Motor',
    keywords: ['engine', 'powertrain', 'automotive'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="8" width="8.5" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M14.5 10h2.5v4h-2.5M9 8V5.5M11.5 8V5.5M9 18.5V16M11.5 18.5V16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'can-bus',
    title: 'CAN Bus',
    keywords: ['automotive', 'vehicle network', 'ecu'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 8h12M6 16h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 8v8M12 8v8M16 8v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'diagnostics',
    title: 'Diagnostics',
    keywords: ['obd', 'scan tool', 'automotive'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="7.5" y="7" width="9" height="8.5" rx="1.8" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 15.5V18M14.5 15.5V18M10 10.5h4M10 13h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  },
  {
    key: 'radar',
    title: 'Radar',
    keywords: ['adas', 'sensor', 'automotive'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19.5a7.5 7.5 0 1 0-7.5-7.5M12 16a4 4 0 1 0-4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m12 12 5.2-5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></svg>'
  },
  {
    key: 'telematics',
    title: 'Telematics',
    keywords: ['vehicle', 'tracking', 'connected car'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 15h10l-1.1-3.4H8.1L7 15Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.7" cy="16.8" r="1.3" stroke="currentColor" stroke-width="1.4"/><circle cx="15.3" cy="16.8" r="1.3" stroke="currentColor" stroke-width="1.4"/><path d="M12 6v2.8M9.5 8a3.8 3.8 0 0 1 5 0M7.6 6a6.6 6.6 0 0 1 8.8 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    key: 'tire',
    title: 'Tire',
    keywords: ['wheel', 'automotive', 'vehicle'],
    category: 'Automotive',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.4" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M12 6.8v2.6M16.4 8.6l-1.8 1.8M17.2 12h-2.6M16.4 15.4l-1.8-1.8M12 17.2v-2.6M7.6 15.4l1.8-1.8M6.8 12h2.6M7.6 8.6l1.8 1.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  },
  {
    key: 'git-branch',
    title: 'Branch',
    keywords: ['version', 'source control', 'fork'],
    category: 'Flow',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7.5" cy="6.5" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="8.5" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="17.5" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><path d="M9.7 6.5H12a4.5 4.5 0 0 1 4.5 4.5v4.3M9.5 6.7v6.8a4 4 0 0 0 4 4h.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  }
];

function getBuiltinIconDefinition(iconKey) {
  return BUILTIN_ICON_LIBRARY.find(icon => icon.key === iconKey) || null;
}

function sanitizeImportedIconSvg(svgText) {
  if (typeof svgText !== 'string' || !svgText.trim()) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return '';

    svg.querySelectorAll('script, foreignObject').forEach(el => el.remove());
    svg.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
      if (el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') el.setAttribute('fill', 'currentColor');
      if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', 'currentColor');
    });
    svg.setAttribute('fill', 'none');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    if (!svg.getAttribute('viewBox')) {
      const width = Number(svg.getAttribute('width')) || 24;
      const height = Number(svg.getAttribute('height')) || 24;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    return svg.outerHTML;
  } catch (error) {
    return '';
  }
}
