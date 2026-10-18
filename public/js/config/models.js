/**
 * Omni Chat - Curated Models & AI Provider Metadata
 */

export const CURATED_MODELS = [
  // Google Gemini
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', isCurated: true, description: 'Google’s lightning-fast multimodal model' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', isCurated: true, description: 'Google’s flagship model for coding & reasoning' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'Google', isCurated: true, description: 'Next-gen hybrid reasoning model from Google' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', isCurated: true, description: 'Cutting-edge Gemini preview model' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', provider: 'Google', isCurated: true, description: 'Advanced reasoning & tool use preview' },
  
  // OpenAI
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', isCurated: true, description: 'Fast, cost-effective multimodal model' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', isCurated: true, description: 'Flagship high-intelligence multimodal model' },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', provider: 'OpenAI', isCurated: true, description: 'Puter default high-efficiency model' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', isCurated: true, description: 'Next-generation lightweight powerhouse' },
  
  // Anthropic Claude
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', isCurated: true, description: 'Superior nuance, coding, and thought clarity' },
  { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', isCurated: true, description: 'Deep analytical intelligence & complex synthesis' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', provider: 'Anthropic', isCurated: true, description: 'Ultra-fast, responsive assistant' },
  
  // DeepSeek
  { id: 'deepseek-chat', name: 'DeepSeek Chat (V3.1)', provider: 'DeepSeek', isCurated: true, description: 'State-of-the-art open chat model' },
  { id: 'openrouter:deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', provider: 'DeepSeek', isCurated: true, description: 'Open reasoning model with chain-of-thought' },
  { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', provider: 'DeepSeek', isCurated: true, description: 'High-throughput reasoning model' },
  
  // xAI Grok
  { id: 'grok-4.3', name: 'Grok 4.3', provider: 'xAI', isCurated: true, description: 'xAI advanced conversational intelligence' },
  { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast Reasoning', provider: 'xAI', isCurated: true, description: 'Real-time reasoning from xAI' },

  // Meta Llama
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', isCurated: true, description: 'Top-tier open-source general knowledge model' },

  // Mistral
  { id: 'mistral-large-2512', name: 'Mistral Large 3', provider: 'Mistral', isCurated: true, description: 'European multilingual frontier model' }
];

export function getModelById(modelId) {
  return CURATED_MODELS.find(m => m.id === modelId) || {
    id: modelId,
    name: modelId,
    provider: 'Custom',
    isCurated: false,
    description: 'Custom AI Model'
  };
}

export function getProviderBadgeClass(provider) {
  const p = (provider || '').toLowerCase();
  if (p.includes('google')) return 'provider-google';
  if (p.includes('openai')) return 'provider-openai';
  if (p.includes('anthropic')) return 'provider-anthropic';
  if (p.includes('deepseek')) return 'provider-deepseek';
  if (p.includes('meta')) return 'provider-meta';
  if (p.includes('mistral')) return 'provider-mistral';
  if (p.includes('xai')) return 'provider-xai';
  return 'provider-generic';
}

