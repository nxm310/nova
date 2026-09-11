export type VoiceProvider = 'gemini' | 'edge' | 'webspeech';

export type PersonalityPresetId = 
  | 'robot_feminin'
  | 'bienveillant'
  | 'complice'
  | 'coach'
  | 'philosophe'
  | 'personnalise';

export interface PersonalityPreset {
  id: PersonalityPresetId;
  name: string;
  emoji: string;
  description: string;
  promptInstruction: string;
}

export type ResponseLength = 'ultra_concise' | 'short' | 'balanced' | 'detailed';
export type ResponseQuality = 'fast' | 'high';

export interface CompanionProfile {
  name: string;
  avatar: string; // Emoji ou identifiant d'avatar
  presetId: PersonalityPresetId;
  customInstructions: string;
  userContext: string; // Ce que l'ami sait de toi
  voiceProvider: VoiceProvider;
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  edgeVoice: string; // ex: 'fr-FR-DeniseNeural' ou 'fr-FR-EloiseNeural'
  webSpeechVoiceURI?: string;
  speechRate: number; // 0.8 à 2.0
  autoPlayVoice: boolean;
  robotEffect?: boolean; // Effet métallique / vocoder robotique
  pitch?: string; // ex: '+0Hz', '+15Hz', '+25Hz'
  webSearch?: boolean; // Recherche Google en temps réel (Grounding)
  responseLength?: ResponseLength; // Longueur des réponses ('ultra_concise' | 'short' | 'balanced' | 'detailed')
  responseQuality?: ResponseQuality; // Qualité / Modèle IA ('fast' = Flash rapide | 'high' = Pro haute précision)
}

export interface MemoryItem {
  id: string;
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export interface ChatApiRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: CompanionProfile;
  apiKey?: string;
  memories?: MemoryItem[];
}
