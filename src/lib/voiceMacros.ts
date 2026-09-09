// Gestionnaire de macros vocales vers touches clavier pour Star Citizen
export interface VoiceMacro {
  id: string;
  name: string;
  phrases: string[]; // Phrases déclencheuses (ex: ["demarrer vaisseau", "sort le train"])
  key: string; // Touche à presser (ex: "u", "r", "n", "b", "l", "p", "c")
  confirmation: string; // Réponse vocale du compagnon
  enabled: boolean;
}

export const DEFAULT_VOICE_MACROS: VoiceMacro[] = [
  {
    id: 'ship_power',
    name: 'Alimentation Vaisseau (Power)',
    phrases: [
      'demarrer le vaisseau',
      'demarrer vaisseau',
      'demarre le vaisseau',
      'demarre vaisseau',
      'allume le vaisseau',
      'allumer le vaisseau',
      'coupe le vaisseau',
      'eteins le vaisseau',
      'eteindre le vaisseau',
      'power',
      'alimentation',
    ],
    key: 'u',
    confirmation: 'Générateurs et alimentation du vaisseau basculés.',
    enabled: true,
  },
  {
    id: 'flight_ready',
    name: 'Prêt au Vol (Flight Ready)',
    phrases: [
      'pret au vol',
      'flight ready',
      'active les systemes',
      'vaisseau pret',
      'prepare le vol',
    ],
    key: 'r',
    confirmation: 'Systèmes parés, vaisseau prêt au vol.',
    enabled: true,
  },
  {
    id: 'engines_toggle',
    name: 'Moteurs Principaux',
    phrases: [
      'allume les moteurs',
      'demarre les moteurs',
      'coupe les moteurs',
      'eteins les moteurs',
      'moteurs',
    ],
    key: 'i',
    confirmation: 'Propulseurs principaux basculés.',
    enabled: true,
  },
  {
    id: 'shields_toggle',
    name: 'Générateurs de Boucliers',
    phrases: [
      'active les boucliers',
      'allume les boucliers',
      'coupe les boucliers',
      'boucliers',
    ],
    key: 'o',
    confirmation: 'Générateurs de bouclier basculés.',
    enabled: true,
  },
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
    phrases: [
      'mode quantum',
      'quantum drive',
      'active le quantum',
      'enclenche le quantum',
      'moteur quantique',
    ],
    key: 'b',
    confirmation: 'Moteur quantique calibré.',
    enabled: true,
  },
  {
    id: 'headlights',
    name: 'Phares / Éclairage Vaisseau',
    phrases: [
      'allume les phares',
      'eteins les phares',
      'phares',
      'lumieres',
      'active les phares',
    ],
    key: 'l',
    confirmation: 'Éclairage extérieur basculé.',
    enabled: true,
  },
  {
    id: 'weapons_toggle',
    name: 'Déploiement des Armes',
    phrases: [
      'deploie les armes',
      'range les armes',
      'sort les armes',
      'mode combat',
      'armes',
    ],
    key: 'p',
    confirmation: "Systèmes d'armement parés.",
    enabled: true,
  },
  {
    id: 'cruise_control',
    name: 'Régulateur de Vitesse',
    phrases: [
      'regulateur',
      'vitesse constante',
      'mode croisiere',
      'enclenche le regulateur',
    ],
    key: 'c',
    confirmation: 'Régulateur de vitesse engagé.',
    enabled: true,
  },
  {
    id: 'doors_toggle',
    name: 'Ouverture / Fermeture des Portes',
    phrases: [
      'ouvre les portes',
      'ferme les portes',
      'verrouille les portes',
      'portes',
      'sas',
    ],
    key: 'k',
    confirmation: 'Sas et portes actionnés.',
    enabled: true,
  },
];

const STORAGE_KEY_MACROS = 'sc_voice_macros';
const STORAGE_KEY_BRIDGE = 'sc_bridge_url';

export const macroManager = {
  isHttpsContext(): boolean {
    return typeof window !== 'undefined' && window.location.protocol === 'https:';
  },

  getBridgeUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:5005';
    const saved = localStorage.getItem(STORAGE_KEY_BRIDGE);
    if (saved) return saved;

    // Détection automatique intelligente : si exécuté sur localhost, privilégier localhost:5005
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5005';
    }
    // Sinon, IP du PC Windows de jeu sur le LAN
    return 'http://192.168.50.34:5005';
  },

  setBridgeUrl(url: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_BRIDGE, url.trim().replace(/\/$/, ''));
  },

  getMacros(): VoiceMacro[] {
    if (typeof window === 'undefined') return DEFAULT_VOICE_MACROS;
    const saved = localStorage.getItem(STORAGE_KEY_MACROS);
    if (!saved) return DEFAULT_VOICE_MACROS;
    try {
      const parsed: VoiceMacro[] = JSON.parse(saved);
      // S'assurer que les macros par défaut comme 'ship_power' existent
      const hasPower = parsed.some((m) => m.key.toLowerCase() === 'u');
      if (!hasPower) {
        parsed.unshift(DEFAULT_VOICE_MACROS[0]); // Ajouter ship_power
        this.saveMacros(parsed);
      }
      return parsed;
    } catch {
      return DEFAULT_VOICE_MACROS;
    }
  },

  saveMacros(macros: VoiceMacro[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_MACROS, JSON.stringify(macros));
  },

  async sendKeyToBridge(key: string): Promise<{ success: boolean; bridgeUrl: string; error?: string }> {
    const primaryUrl = this.getBridgeUrl();
    const candidateUrls = [primaryUrl];

    // Ajouter localhost:5005 comme secours si non présent
    if (!candidateUrls.includes('http://localhost:5005')) {
      candidateUrls.push('http://localhost:5005');
    }

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`${url}/press`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.toLowerCase().trim() }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          return { success: true, bridgeUrl: url };
        }
      } catch (err: any) {
        // Essayer l'URL candidate suivante
      }
    }

    return {
      success: false,
      bridgeUrl: primaryUrl,
      error: "Le pont clavier n'a pas répondu sur le port 5005.",
    };
  },

  /**
   * Analyse le texte parlé de l'utilisateur. Si une macro correspond,
   * exécute la frappe clavier et renvoie la réponse vocale appropriée.
   */
  async checkAndExecute(
    spokenText: string
  ): Promise<{
    matched: boolean;
    macro?: VoiceMacro;
    confirmation?: string;
    bridgeSuccess?: boolean;
    bridgeUrl?: string;
  }> {
    if (!spokenText) return { matched: false };

    // Normaliser le texte (minuscules, sans accents, sans ponctuation superflue)
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
          console.log(`⚡ Macro vocale détectée : "${macro.name}" ➔ Touche [${macro.key.toUpperCase()}]`);

          // Vérifier si nous sommes sur un site distant HTTPS (GitHub Pages) qui bloque les appels HTTP locaux
          if (this.isHttpsContext()) {
            return {
              matched: true,
              macro,
              bridgeSuccess: false,
              confirmation: `Ordre pour la touche ${macro.key.toUpperCase()} détecté, mais le site HTTPS bloque la connexion à votre PC. Veuillez ouvrir l'application en local sur le port 3000 pour que les touches fonctionnent dans le jeu.`,
            };
          }

          // Envoi de la touche au pont clavier
          const result = await this.sendKeyToBridge(macro.key);

          if (!result.success) {
            return {
              matched: true,
              macro,
              bridgeSuccess: false,
              bridgeUrl: result.bridgeUrl,
              confirmation: `J'ai bien compris l'ordre pour la touche ${macro.key.toUpperCase()}, mais le pont clavier sur votre PC n'est pas connecté. Veuillez lancer bridge.py sur votre PC.`,
            };
          }

          return {
            matched: true,
            macro,
            bridgeSuccess: true,
            bridgeUrl: result.bridgeUrl,
            confirmation: macro.confirmation,
          };
        }
      }
    }

    return { matched: false };
  },
};
