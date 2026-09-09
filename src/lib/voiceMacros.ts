// Gestionnaire de macros vocales vers touches clavier (style VoiceAttack)
export interface VoiceMacro {
  id: string;
  name: string;
  phrases: string[]; // Phrases déclencheuses (ex: ["sort le train", "train d'atterrissage"])
  key: string; // Touche à presser (ex: "n", "b", "l", "p", "c")
  confirmation: string; // Réponse vocale du compagnon
  enabled: boolean;
}

export const DEFAULT_VOICE_MACROS: VoiceMacro[] = [
  {
    id: 'landing_gear',
    name: "Train d'atterrissage",
    phrases: [
      "train d'atterrissage",
      "train datterrissage",
      "sort le train",
      "rentre le train",
      "atterrissage",
      "sortir le train",
      "rentrer le train",
    ],
    key: 'n',
    confirmation: "Train d'atterrissage actionné, Commandant.",
    enabled: true,
  },
  {
    id: 'quantum_drive',
    name: 'Moteur Quantique (Quantum)',
    phrases: ['mode quantum', 'quantum drive', 'active le quantum', 'enclenche le quantum', 'moteur quantique'],
    key: 'b',
    confirmation: 'Moteur quantique calibré.',
    enabled: true,
  },
  {
    id: 'headlights',
    name: 'Phares / Éclairage Vaisseau',
    phrases: ['allume les phares', 'eteins les phares', 'phares', 'lumieres', 'active les phares'],
    key: 'l',
    confirmation: 'Éclairage basculé.',
    enabled: true,
  },
  {
    id: 'weapons_toggle',
    name: 'Déploiement des Armes',
    phrases: ['deploie les armes', 'range les armes', 'sort les armes', 'mode combat', 'armes'],
    key: 'p',
    confirmation: "Systèmes d'armement parés.",
    enabled: true,
  },
  {
    id: 'cruise_control',
    name: 'Régulateur de Vitesse',
    phrases: ['regulateur', 'vitesse constante', 'mode croisiere', 'enclenche le regulateur'],
    key: 'c',
    confirmation: 'Régulateur de vitesse engagé.',
    enabled: true,
  },
  {
    id: 'doors_toggle',
    name: 'Ouverture / Fermeture des Portes',
    phrases: ['ouvre les portes', 'ferme les portes', 'verrouille les portes', 'portes'],
    key: 'k',
    confirmation: 'Sas et portes actionnés.',
    enabled: true,
  },
];

const STORAGE_KEY_MACROS = 'sc_voice_macros';
const STORAGE_KEY_BRIDGE = 'sc_bridge_url';

export const macroManager = {
  getBridgeUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:5005';
    return localStorage.getItem(STORAGE_KEY_BRIDGE) || 'http://192.168.50.34:5005';
  },

  setBridgeUrl(url: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_BRIDGE, url);
  },

  getMacros(): VoiceMacro[] {
    if (typeof window === 'undefined') return DEFAULT_VOICE_MACROS;
    const saved = localStorage.getItem(STORAGE_KEY_MACROS);
    if (!saved) return DEFAULT_VOICE_MACROS;
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_VOICE_MACROS;
    }
  },

  saveMacros(macros: VoiceMacro[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_MACROS, JSON.stringify(macros));
  },

  async sendKeyToBridge(key: string): Promise<boolean> {
    const bridgeUrl = this.getBridgeUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${bridgeUrl}/press`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return res.ok;
    } catch (err) {
      console.warn(`Le pont clavier sur ${bridgeUrl} n'a pas répondu (veuillez lancer bridge.py sur le PC) :`, err);
      return false;
    }
  },

  /**
   * Analyse le texte parlé de l'utilisateur. Si une macro correspond,
   * exécute la frappe clavier et renvoie la réponse vocale.
   */
  async checkAndExecute(
    spokenText: string
  ): Promise<{ matched: boolean; macro?: VoiceMacro; confirmation?: string }> {
    if (!spokenText) return { matched: false };

    // Normaliser le texte (minuscules, sans accents, sans ponctuation)
    const normalized = spokenText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const macros = this.getMacros();

    for (const macro of macros) {
      if (!macro.enabled) continue;

      for (const phrase of macro.phrases) {
        const normPhrase = phrase
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (normalized.includes(normPhrase)) {
          console.log(`⚡ Macro vocale déclenchée : "${macro.name}" ➔ Touche "${macro.key}"`);
          this.sendKeyToBridge(macro.key);
          return {
            matched: true,
            macro,
            confirmation: macro.confirmation,
          };
        }
      }
    }

    return { matched: false };
  },
};
