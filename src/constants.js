export const ENDPOINTS = {
  INIT: 'https://gemini.google.com/app',
  GENERATE:
    'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
};

export const DEFAULT_METADATA = ['', '', '', null, null, null, null, null, null, null, ''];

// Fallback model IDs used when dynamic fetching from Google's init page fails.
// The client overrides these with the live model list from gemini.google.com.
export const MODEL_IDS = {
  'gemini-3-flash': 'fbb127bbb056c959',
  'gemini-3-pro': '9d8ca3786ebdfbea',
  'gemini-3-flash-thinking': '5bf011840784117a',
  'gemini-3-pro-plus': 'e6fa609c3fa255c0',
  'gemini-3-flash-plus': '56fdd199312815e2',
  'gemini-3-flash-thinking-plus': 'e051ce1aa80aa576',
};
