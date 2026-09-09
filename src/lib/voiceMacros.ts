// Gestionnaire de macros vocales vers touches clavier pour Star Citizen
export interface VoiceMacro {
  id: string;
  name: string;
  phrases: string[]; // Phrases déclencheuses (ex: ["demarrer vaisseau", "sort le train"])
  key: string; // Touche à presser (ex: "u", "r", "n", "b", "l", "p", "c", "f1", "f2")
  pressType?: 'tap' | 'hold'; // 'tap' = appui court (~180ms), 'hold' = appui long (~1.5s)
  holdDuration?: number; // Durée de l'appui long en secondes (défaut: 1.5)
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
      "train atterrissage",
      "sort le train",
      "sortir le train",
      "sort le train d'atterrissage",
      "sortir le train d'atterrissage",
      "rentre le train",
      "rentrer le train",
      "rentre le train d'atterrissage",
      "rentrer le train d'atterrissage",
      "rentre les trains",
      "baisse le train",
      "remonte le train",
      "atterrissage",
      "le train",
    ],
    key: 'n',
    confirmation: "Train d'atterrissage actionné, Commandant.",
    enabled: true,
  },
  {
    id: 'landing_request',
    name: "Demande d'atterrissage (Tour ATC)",
    phrases: [
      "demande d'atterrissage",
      "demande datterrissage",
      "contacte la tour",
      "autorisation d'atterrir",
      "demander atterrissage",
      "autorise atterrissage",
      "demande atterrissage",
      "contact la tour",
      "appeler la tour",
      "demande atterrissage tour",
    ],
    key: 'alt+n',
    confirmation: "Demande d'atterrissage transmise à la tour de contrôle.",
    enabled: true,
  },
  {
    id: 'vtol_mode',
    name: 'Mode VTOL (Propulseurs verticaux)',
    phrases: [
      'mode vtol',
      'active le vtol',
      'bascule le vtol',
      'vtol',
      'propulseurs verticaux',
    ],
    key: 'alt+j',
    confirmation: 'Propulseurs verticaux VTOL basculés.',
    enabled: true,
  },
  {
    id: 'decoupled_mode',
    name: 'Mode Découplé (Decoupled)',
    phrases: [
      'mode decouple',
      'mode decouplage',
      'decouple',
      'vol decouple',
      'decouplage',
    ],
    key: 'alt+c',
    confirmation: 'Mode de vol découplé basculé.',
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
      'allumer les phares',
      'allume les feux',
      'allumer les feux',
      'allume la lumiere',
      'allume les lumieres',
      'active les phares',
      'mets les phares',
      'met les phares',
      'eteins les phares',
      'eteindre les phares',
      'eteins les feux',
      'coupe les phares',
      'coupe les feux',
      'les phares',
      'les feux',
      'phares',
      'lumieres',
      'lumiere',
      'projecteurs',
      'eclairage',
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
    pressType: 'tap',
    confirmation: 'Sas et portes actionnés.',
    enabled: true,
  },
  {
    id: 'mobiglas',
    name: 'mobiGlas (Menu Principal)',
    phrases: [
      'mobiglas',
      'ouvre le mobiglas',
      'ferme le mobiglas',
      'menu',
      'montre le mobiglas',
      'affiche le mobiglas',
    ],
    key: 'f1',
    pressType: 'tap',
    confirmation: 'mobiGlas affiché.',
    enabled: true,
  },
  {
    id: 'starmap',
    name: 'Carte Stellaire (StarMap)',
    phrases: [
      'carte',
      'starmap',
      'carte stellaire',
      'ouvre la carte',
      'affiche la carte',
      'ouvre le starmap',
    ],
    key: 'f2',
    pressType: 'tap',
    confirmation: 'Carte stellaire StarMap ouverte.',
    enabled: true,
  },
  {
    id: 'camera_toggle',
    name: 'Vue Caméra / 3ème Personne',
    phrases: [
      'change de vue',
      'vue exterieure',
      'troisieme personne',
      'vue externe',
      'camera exterieure',
      'vue cockpit',
    ],
    key: 'f4',
    pressType: 'tap',
    confirmation: 'Vue caméra basculée.',
    enabled: true,
  },
  {
    id: 'comms_atc',
    name: 'Communications / Fréquences ATC',
    phrases: [
      'communications',
      'comms',
      'ouvre les communications',
      'frequences radio',
      'canaux de communication',
    ],
    key: 'f11',
    pressType: 'tap',
    confirmation: 'Écran des communications ouvert.',
    enabled: true,
  },
  {
    id: 'exit_seat',
    name: 'Sortir du Siège / Cockpit (Appui Long)',
    phrases: [
      'quitter le siege',
      'quitte le siege',
      'sortir du siege',
      'sors du siege',
      'sortir du cockpit',
      'debout',
      'leve toi',
      'quitter le poste',
    ],
    key: 'y',
    pressType: 'hold',
    holdDuration: 1.5,
    confirmation: 'Sortie du siège en cours, Commandant.',
    enabled: true,
  },
  {
    id: 'emergency_eject',
    name: "Éjection d'Urgence (Appui Long)",
    phrases: [
      'ejection durgence',
      'ejection',
      'ejecte toi',
      'abandonner le navire',
      'abandonner le vaisseau',
      'abandonne le vaisseau',
    ],
    key: 'alt+l',
    pressType: 'hold',
    holdDuration: 1.5,
    confirmation: "Procédure d'éjection d'urgence enclenchée !",
    enabled: true,
  },
  {
    id: 'quantum_jump_engage',
    name: 'Saut Quantique - Engage (Appui Long)',
    phrases: [
      'engage le quantum',
      'engage le saut',
      'saute en quantum',
      'lancer le saut',
      'enclenche le saut',
      'jump',
    ],
    key: 'b',
    pressType: 'hold',
    holdDuration: 1.5,
    confirmation: 'Saut quantique engagé, accrochez-vous !',
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
    if (saved && saved.includes('192.168.50.34')) {
      // Purge automatique de l'ancienne IP fixe de test
      localStorage.removeItem(STORAGE_KEY_BRIDGE);
    } else if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '');
    }

    // Si servi par le pont lui-même sur le port 5005
    if (window.location.port === '5005') {
      return window.location.origin;
    }

    // Détection automatique intelligente : hostname actuel sur port 5005
    if (window.location.hostname && window.location.hostname !== '') {
      return `http://${window.location.hostname}:5005`;
    }

    return 'http://localhost:5005';
  },

  setBridgeUrl(url: string): void {
    if (typeof window === 'undefined') return;
    const clean = url.trim().replace(/\/$/, '');
    if (clean && !clean.includes('192.168.50.34')) {
      localStorage.setItem(STORAGE_KEY_BRIDGE, clean);
    }
  },

  getCandidateUrls(): string[] {
    const urls: string[] = [];
    const add = (u?: string | null) => {
      if (!u) return;
      const clean = u.trim().replace(/\/$/, '');
      if (clean && !urls.includes(clean) && !clean.includes('192.168.50.34')) {
        urls.push(clean);
      }
    };

    // 1. Si déjà servi par l'exécutable sur le port 5005 (priorité absolue)
    if (typeof window !== 'undefined' && window.location.port === '5005') {
      add(window.location.origin);
    }

    // 2. URL couramment configurée si valide
    add(this.getBridgeUrl());

    // 3. Hostname actuel sur le port 5005
    if (typeof window !== 'undefined' && window.location.hostname) {
      add(`http://${window.location.hostname}:5005`);
    }

    // 4. IPv4 Loopback standard
    add('http://127.0.0.1:5005');

    // 5. Localhost standard
    add('http://localhost:5005');

    return urls;
  },

  async checkBridgeHealth(): Promise<{ online: boolean; url?: string; info?: any }> {
    const candidates = this.getCandidateUrls();
    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);
        const res = await fetch(`${url}/status`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const info = await res.json();
          this.setBridgeUrl(url);
          return { online: true, url, info };
        }
      } catch {
        // Continuer vers la candidate suivante
      }
    }
    return { online: false };
  },

  getMacros(): VoiceMacro[] {
    if (typeof window === 'undefined') return DEFAULT_VOICE_MACROS;
    const saved = localStorage.getItem(STORAGE_KEY_MACROS);
    if (!saved) return DEFAULT_VOICE_MACROS;
    try {
      const parsed: VoiceMacro[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_VOICE_MACROS;
      }

      // Fusionner les nouvelles macros et les nouveaux synonymes sans écraser les modifications de l'utilisateur
      let updated = false;
      for (const def of DEFAULT_VOICE_MACROS) {
        const existing = parsed.find((m) => m.id === def.id);
        if (!existing) {
          parsed.push(def);
          updated = true;
        } else {
          // Migrer pressType et holdDuration si absents
          if (!existing.pressType && def.pressType) {
            existing.pressType = def.pressType;
            if (def.holdDuration) existing.holdDuration = def.holdDuration;
            updated = true;
          }
          const phraseSet = new Set(existing.phrases.map((p) => p.toLowerCase().trim()));
          for (const phrase of def.phrases) {
            if (!phraseSet.has(phrase.toLowerCase().trim())) {
              existing.phrases.push(phrase);
              updated = true;
            }
          }
        }
      }

      // S'assurer que toutes les macros ont au moins pressType='tap'
      for (const m of parsed) {
        if (!m.pressType) {
          m.pressType = 'tap';
          updated = true;
        }
      }

      if (updated) {
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

  async sendKeyToBridge(
    key: string,
    pressType: 'tap' | 'hold' = 'tap',
    duration?: number
  ): Promise<{ success: boolean; bridgeUrl: string; error?: string }> {
    const candidateUrls = this.getCandidateUrls();
    const effectiveDuration = duration ?? (pressType === 'hold' ? 1.5 : 0.18);
    const timeoutMs = Math.max(1500, Math.round(effectiveDuration * 1000) + 1500);

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${url}/press`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: key.toLowerCase().trim(),
            pressType,
            duration: effectiveDuration,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          this.setBridgeUrl(url);
          return { success: true, bridgeUrl: url };
        }
      } catch (err: any) {
        // Essayer l'URL candidate suivante
      }
    }

    return {
      success: false,
      bridgeUrl: candidateUrls[0] || 'http://localhost:5005',
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
          const typeLabel = macro.pressType === 'hold' ? ' [APPUI LONG 1.5s]' : '';
          console.log(`⚡ Macro vocale détectée : "${macro.name}" ➔ Touche [${macro.key.toUpperCase()}]${typeLabel}`);

          // Vérifier si nous sommes sur un site distant HTTPS (GitHub Pages) qui bloque les appels HTTP locaux
          if (this.isHttpsContext()) {
            return {
              matched: true,
              macro,
              bridgeSuccess: false,
              confirmation: `Ordre pour la touche ${macro.key.toUpperCase()} détecté, mais le site HTTPS en ligne ne peut pas communiquer avec votre PC. Lancez 'DEMARRER_NOVA.bat' ou 'Nova-StarCitizen.exe' sur votre PC pour ouvrir l'application sur le port 5005.`,
            };
          }

          // Envoi de la touche au pont clavier avec type d'appui et durée
          const result = await this.sendKeyToBridge(
            macro.key,
            macro.pressType || 'tap',
            macro.holdDuration
          );

          if (!result.success) {
            return {
              matched: true,
              macro,
              bridgeSuccess: false,
              bridgeUrl: result.bridgeUrl,
              confirmation: `J'ai bien compris l'ordre pour la touche ${macro.key.toUpperCase()}, mais le pont clavier sur votre PC n'est pas connecté. Veuillez lancer DEMARRER_NOVA.bat sur votre PC.`,
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
