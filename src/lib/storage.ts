import { CompanionProfile, ChatMessage, MemoryItem } from '@/types/companion';
import { DEFAULT_PROFILE } from './constants';

const KEYS = {
  PROFILE: 'ami_profile_v1',
  API_KEY: 'ami_gemini_api_key_v1',
  MESSAGES: 'ami_messages_v1',
  MEMORIES: 'ami_memories_v1',
};

export const storage = {
  getProfile(): CompanionProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (!data) return DEFAULT_PROFILE;
      const parsed = JSON.parse(data);
      // Si l'utilisateur avait l'ancienne vitesse par défaut (1.0x ou moins), on le passe au nouveau standard plus rapide et fluide (1.25x)
      if (!parsed.speechRate || parsed.speechRate <= 1.0) {
        parsed.speechRate = 1.25;
        localStorage.setItem(KEYS.PROFILE, JSON.stringify({ ...DEFAULT_PROFILE, ...parsed }));
      }
      return { ...DEFAULT_PROFILE, ...parsed };
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: CompanionProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },

  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(KEYS.API_KEY) || '';
  },

  saveApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.API_KEY, key.trim());
  },

  getMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMessages(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    // Garder les 100 derniers messages pour éviter de saturer le localStorage
    const truncated = messages.slice(-100);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(truncated));
  },

  clearMessages(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.MESSAGES);
  },

  getMemories(): MemoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.MEMORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMemories(memories: MemoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.MEMORIES, JSON.stringify(memories));
  },

  addMemory(content: string): MemoryItem {
    const memories = storage.getMemories();
    const newMem: MemoryItem = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      content,
      timestamp: Date.now(),
    };
    storage.saveMemories([...memories, newMem]);
    return newMem;
  },

  deleteMemory(id: string): void {
    const memories = storage.getMemories().filter((m) => m.id !== id);
    storage.saveMemories(memories);
  },
};
