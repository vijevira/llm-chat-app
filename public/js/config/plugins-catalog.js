/**
 * Omni Chat - Plugins Catalog Definitions
 */

export const PLUGINS_CATALOG = [
  {
    id: 'webSearch',
    name: 'Live Web Search Grounding',
    icon: '🌐',
    category: 'Research',
    desc: 'Grounds AI responses in real-time web facts, news, and clickable citations via DuckDuckGo.',
    installed: true,
    enabled: false
  },
  {
    id: 'codeRunner',
    name: 'JavaScript Code Runner',
    icon: '⚡',
    category: 'Developer',
    desc: 'Client-side isolated execution sandbox for JavaScript algorithms, math, and string transformations.',
    installed: true,
    enabled: false
  },
  {
    id: 'githubExplorer',
    name: 'GitHub Repo & Code Explorer',
    icon: '🐙',
    category: 'Developer',
    desc: 'Inspect public repositories, view file trees, and load remote code into chat and the Web Sandbox.',
    installed: true,
    enabled: true
  },
  {
    id: 'chartVisualizer',
    name: 'Chart & Data Visualizer',
    icon: '📊',
    category: 'Analytics',
    desc: 'Automatically visualizes structured datasets, financial numbers, and matrices using Chart.js.',
    installed: true,
    enabled: true
  },
  {
    id: 'mathSolver',
    name: 'LaTeX & Scientific Math Solver',
    icon: '🧮',
    category: 'Developer',
    desc: 'Step-by-step mathematical reasoning formatted with crisp KaTeX and LaTeX equation rendering.',
    installed: false,
    enabled: false
  },
  {
    id: 'uiComponents',
    name: 'Tailwind & UI Component Studio',
    icon: '🎨',
    category: 'Developer',
    desc: 'Generates production-grade Tailwind CSS, glassmorphic cards, and responsive components.',
    installed: false,
    enabled: false
  },
  {
    id: 'seoAuditor',
    name: 'SEO & Web Meta Auditor',
    icon: '🔍',
    category: 'Research',
    desc: 'Audits web page structure, analyzes Open Graph meta tags, and generates schema.org JSON-LD.',
    installed: false,
    enabled: false
  },
  {
    id: 'docInspector',
    name: 'Document & PDF Deep Inspector',
    icon: '📄',
    category: 'Analytics',
    desc: 'Extracts tabular data, key clauses, summaries, and hierarchies from uploaded documents.',
    installed: false,
    enabled: false
  }
];

export const PLUGIN_CATEGORIES = ['all', 'installed', 'Developer', 'Research', 'Analytics'];

