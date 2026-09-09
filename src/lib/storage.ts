import { CompanionProfile, ChatMessage, MemoryItem } from '@/types/companion';
import { DEFAULT_PROFILE } from './constants';
import { VoiceMacro, macroManager, DEFAULT_VOICE_MACROS } from './voiceMacros';

const KEYS = {
  PROFILE: 'ami_profile_v1',
  API_KEY: 'ami_gemini_api_key_v1',
  MESSAGES: 'ami_messages_v1',
  MEMORIES: 'ami_memories_v1',
};

export interface FullNovaConfig {
  version: number;
  profile: CompanionProfile;
  apiKey: string;
  memories: MemoryItem[];
  macros: VoiceMacro[];
  bridgeUrl: string;
  savedAt: number;
}

export const storage = {
  getProfile(): CompanionProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (!data) return DEFAULT_PROFILE;
      const parsed = JSON.parse(data);
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

  exportFullConfig(): FullNovaConfig {
    return {
      version: 1,
      profile: this.getProfile(),
      apiKey: this.getApiKey(),
      memories: this.getMemories(),
      macros: macroManager.getMacros(),
      bridgeUrl: macroManager.getBridgeUrl(),
      savedAt: Date.now(),
    };
  },

  importFullConfig(config: Partial<FullNovaConfig>): boolean {
    if (!config || typeof config !== 'object') return false;
    try {
      if (config.profile) {
        this.saveProfile({ ...DEFAULT_PROFILE, ...config.profile });
      }
      if (config.apiKey !== undefined) {
        this.saveApiKey(config.apiKey);
      }
      if (Array.isArray(config.memories)) {
        this.saveMemories(config.memories);
      }
      if (Array.isArray(config.macros) && config.macros.length > 0) {
        macroManager.saveMacros(config.macros);
      }
      if (config.bridgeUrl) {
        macroManager.setBridgeUrl(config.bridgeUrl);
      }
      return true;
    } catch (e) {
      console.error('Erreur importation config:', e);
      return false;
    }
  },

  async pushToBridge(customBridgeUrl?: string): Promise<boolean> {
    const primaryUrl = customBridgeUrl || macroManager.getBridgeUrl();
    const candidateUrls = [primaryUrl];
    if (!candidateUrls.includes('http://localhost:5005')) {
      candidateUrls.push('http://localhost:5005');
    }

    const payload = this.exportFullConfig();

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${url}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          return true;
        }
      } catch {
        // Essayer candidate suivante
      }
    }
    return false;
  },

  async syncWithBridge(customBridgeUrl?: string): Promise<{ synced: boolean; config?: FullNovaConfig }> {
    const primaryUrl = customBridgeUrl || macroManager.getBridgeUrl();
    const candidateUrls = [primaryUrl];
    if (!candidateUrls.includes('http://localhost:5005')) {
      candidateUrls.push('http://localhost:5005');
    }

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${url}/config`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const remote = await res.json();
          // Si le fichier sur le PC contient déjà des configurations
          if (remote && (remote.profile || remote.macros || remote.apiKey || remote.memories)) {
            this.importFullConfig(remote);
            return { synced: true, config: remote };
          } else {
            // Premier lancement : le fichier sur le PC est vierge, on envoie notre configuration initiale
            await this.pushToBridge(url);
            return { synced: false };
          }
        }
      } catch {
        // Essayer candidate suivante
      }
    }
    return { synced: false };
  },
};
