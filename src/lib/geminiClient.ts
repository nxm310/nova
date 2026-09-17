import { PERSONALITY_PRESETS } from '@/lib/constants';
import { CompanionProfile, MemoryItem } from '@/types/companion';
import { storage } from '@/lib/storage';

export interface ChatRequestOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: CompanionProfile;
  apiKey: string;
  memories?: MemoryItem[];
  imageBase64?: string;
}

export const geminiClient = {
  async sendMessage({
    messages,
    profile,
    apiKey,
    memories,
    imageBase64,
  }: ChatRequestOptions): Promise<string> {
    const key = (apiKey || '').trim();
    if (!key) {
      throw new Error("Clé API Gemini manquante. Renseigne ta clé dans les Paramètres ⚙️.");
    }

    const preset = PERSONALITY_PRESETS.find((p) => p.id === profile.presetId);
    const presetInstruction = preset ? preset.promptInstruction : '';

    const memoriesText =
      memories && memories.length > 0
        ? memories.map((m) => `• ${m.content}`).join('\n')
        : 'Aucun souvenir enregistré pour le moment.';

    const lengthConfig: Record<
      string,
      { sectionPrompt: string; maxTokens: number; temperature: number }
    > = {
      ultra_concise: {
        sectionPrompt: `[DIRECTIVE PRIORITAIRE ABSOLUE : MODE ULTRA-COURT (COMBAT / ACTION)]
Tu DOIS IMPÉRATIVEMENT respecter ces 4 règles strictes sans exception :
1. NOMBRE DE PHRASES : UNE SEULE ET UNIQUE PHRASE, JAMAIS DEUX. Il t'est formellement INTERDIT d'écrire une deuxième phrase.
2. NOMBRE DE MOTS : 5 à 15 mots maximum. Va droit au but comme un copilote de combat spatial.
3. INTERDICTIONS FORMELLES : Zéro bavardage, zéro formule de politesse ("Bonjour", "Bien reçu", "À vos ordres", "N'hésite pas"), aucune question en retour.
4. ACHÈVEMENT OBLIGATOIRE : Termine impérativement ta phrase par un point final. Ne t'arrête JAMAIS au milieu d'une idée ou d'une phrase.
Exemples stricts de réponses attendues en mode ultra-court :
• "Phares allumés et train déployé, Commandant. [ACTION:KEY:l] [ACTION:KEY:n]"
• "Boucliers réactivés à pleine puissance. [ACTION:KEY:o]"
• "Moteur quantique calibré et paré au saut. [ACTION:KEY:b]"`,
        maxTokens: 350,
        temperature: 0.35,
      },
      short: {
        sectionPrompt: `[DIRECTIVE PRIORITAIRE ABSOLUE : MODE COURT (RECOMMANDÉ)]
Tu DOIS IMPÉRATIVEMENT respecter ces 3 règles :
1. NOMBRE DE PHRASES : 1 À 2 PHRASES COURTES MAXIMUM (20 à 35 mots). Évite toute phrase à rallonge.
2. STYLE : Échange radio de cockpit vif, direct, naturel et percutant. Pas de bavardage inutile.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chacune de tes phrases par un point final (. ! ?). Ne t'arrête JAMAIS au milieu d'une phrase.
Exemples de réponses attendues en mode court :
• "Train rentré et phares coupés, Commandant. Tous les voyants sont au vert. [ACTION:KEY:n] [ACTION:KEY:l]"
• "Demande d'atterrissage transmise à la station. Le couloir nous est assigné. [ACTION:KEY:alt+n]"`,
        maxTokens: 650,
        temperature: 0.5,
      },
      balanced: {
        sectionPrompt: `[DIRECTIVE DE LONGUEUR : MODE ÉQUILIBRÉ (NATUREL & AMICAL)]
1. NOMBRE DE PHRASES : 2 À 3 PHRASES ÉQUILIBRÉES ET NATURELLES (40 à 80 mots).
2. STYLE : Ton complice, agréable et précis. Donne une réponse complète et utile sans faire de monologue interminable.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chacune de tes phrases par un point final (. ! ?). Ne t'arrête JAMAIS au milieu d'une pensée.`,
        maxTokens: 1200,
        temperature: 0.7,
      },
      detailed: {
        sectionPrompt: `[DIRECTIVE DE LONGUEUR : MODE DÉTAILLÉ (EXHAUSTIF & PÉDAGOGIQUE)]
1. LONGUEUR : Réponse complète, développée et argumentée en plusieurs phrases ou paragraphes. Développe les explications techniques, les étapes de vol, les tactiques et les conseils utiles.
2. STYLE : Guide expert, pédagogue et exhaustif.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chaque phrase et chaque paragraphe par sa ponctuation finale (. ! ?). Ne coupe jamais une phrase en cours.`,
        maxTokens: 2500,
        temperature: 0.75,
      },
    };

    const selectedLength = profile.responseLength || 'short';
    const lengthSetting = lengthConfig[selectedLength] || lengthConfig.short;

    const systemInstruction = `
Tu es ${profile.name || 'Nova'}, copilote de bord IA immersif pour Star Citizen.
Ton avatar actuel est ${profile.avatar || '🤖'}.

${lengthSetting.sectionPrompt}

[RÈGLE FONDAMENTALE D'ACHÈVEMENT DE TOUTES LES PHRASES]
Tu as l'interdiction formelle de laisser une phrase inachevée, coupée ou tronquée. Chaque phrase formulée doit avoir du sens du début à la fin et se terminer impérativement par une ponctuation terminale (. ! ?).

[TRAIT DE CARACTÈRE & TON DU COMPAGNON]
${presetInstruction}

[CONSIGNES PARTICULIÈRES DE L'UTILISATEUR]
${profile.customInstructions || 'Reste réactif, précis et attentif en vol.'}

[CE QUE TU SAIS SUR TON AMI(E) (CONTEXTE & MÉMOIRE)]
${profile.userContext || ''}
Faits mémorisés au fil de vos échanges :
${memoriesText}

[RÈGLES D'EXPRESSION GÉNÉRALES]
1. Tu parles directement à ton ami(e) avec naturel, loyauté et présence.
2. Évite absolument les formules de robot générique ("En tant qu'intelligence artificielle", "Comment puis-je vous aider aujourd'hui ?"). Tu es un vrai copilote de bord.
3. Utilise la langue française, avec un niveau familier-courant adapté à deux équipiers dans un cockpit.
4. N'utilise JAMAIS d'émojis, de pictogrammes ou de smileys (ni 😊, ni 😉, ni :) etc.), car tes messages sont énoncés à voix haute. Exprime toute ta présence uniquement par tes mots.
5. ACCÈS AU WEB & RECHERCHE EN TEMPS RÉEL : Tu as un accès direct au moteur de recherche Google. Quand ton ami(e) te parle d'actualités, de technologies récentes, de puces ou produits (ex: Mac Mini, M4, M5, M6, etc.) ou s'il te donne un lien, effectue une recherche pour avoir les informations les plus fraîches et vérifiées sur le web.
6. VISION D'ÉCRAN EN DIRECT : Si une image de capture d'écran est attachée au message, observe et analyse immédiatement ce qui est affiché (jeu Star Citizen, terminal, mobiGlas, fenêtres, rochers) et réponds directement et précisément selon la longueur demandée.
7. ACTIONS DIRECTES SUR LE VAISSEAU STAR CITIZEN (PONT CLAVIER DIRECTINPUT) :
Tu es connecté(e) au cockpit du vaisseau via le pont clavier. Lorsque ton ami(e) te demande d'effectuer une action sur le vaisseau (ou s'il te donne un ordre de vol), tu DOIS exécuter la commande correspondante en ajoutant une balise d'action à la toute fin de ta réponse :
- Pour un appui court standard : [ACTION:KEY:<touche>]
- Pour un appui long maintenu (ex: sortie du siège, éjection, jump quantique) : [ACTION:HOLD:<touche>]
Ces balises seront automatiquement exécutées par le pont clavier PC et masquées à l'oral.

COMMANDES MULTIPLES DANS LA MÊME PHRASE (2, 3 OU 4 ACTIONS) :
Si ton ami(e) te demande plusieurs actions dans le même message (ex: "Allume les phares et sors le train d'atterrissage", "Démarre les moteurs et contacte la tour", "Allume les phares, ouvre les portes et sors le train"), tu DOIS inclure TOUTES les balises d'action correspondantes à la suite dans l'ordre demandé !
Exemples multi-actions :
• "Allume les phares et sors le train" ➔ "Phares allumés et train sorti, Commandant ! [ACTION:KEY:l] [ACTION:KEY:n]"
• "Démarre les moteurs et contacte la tour" ➔ "Moteurs lancés et tour contactée. [ACTION:KEY:i] [ACTION:KEY:alt+n]"
• "Allume les phares, sors le train et ouvre les portes" ➔ "Phares allumés, train sorti et portes ouvertes. [ACTION:KEY:l] [ACTION:KEY:n] [ACTION:KEY:k]"

Commandes reconnues :
• Allumer ou éteindre les phares, feux ou lumières : [ACTION:KEY:l]
• Sortir ou rentrer le train d'atterrissage : [ACTION:KEY:n]
• Demander l'atterrissage ou contacter la tour ATC : [ACTION:KEY:alt+n]
• Ouvrir le mobiGlas ou le menu personnel : [ACTION:KEY:f1]
• Ouvrir la carte stellaire (StarMap) : [ACTION:KEY:f2]
• Basculer la vue caméra extérieure / 3ème personne : [ACTION:KEY:f4]
• Ouvrir les canaux de communications / ATC : [ACTION:KEY:f11]
• Démarrer ou couper l'alimentation du vaisseau (Power) : [ACTION:KEY:u]
• Allumer ou couper les propulseurs principaux (Moteurs) : [ACTION:KEY:i]
• Activer ou couper les boucliers : [ACTION:KEY:o]
• Vaisseau prêt au vol (Flight ready) : [ACTION:KEY:r]
• Mode VTOL (propulseurs verticaux) : [ACTION:KEY:alt+j]
• Mode Découplé (Decoupled) : [ACTION:KEY:alt+c]
• Calibrer le moteur quantique (Quantum drive spool) : [ACTION:KEY:b]
• Engager le saut quantique (Jump) : [ACTION:HOLD:b] (appui long)
• Quitter le siège de pilotage / se lever : [ACTION:HOLD:y] (appui long)
• Éjection d'urgence : [ACTION:HOLD:alt+l] (appui long)
• Déployer ou ranger les armes : [ACTION:KEY:p]
• Régulateur de vitesse (Cruise control) : [ACTION:KEY:c]
• Ouvrir ou fermer les portes ou sas : [ACTION:KEY:k]
`.trim();

    const contents: any[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (imageBase64 && contents.length > 0) {
      const lastUserIndex = contents.map((c) => c.role).lastIndexOf('user');
      if (lastUserIndex >= 0) {
        contents[lastUserIndex].parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBase64,
          },
        });
      }
    }

    const getModelCandidates = (quality?: string): string[] => {
      switch (quality) {
        case '3.8-live':
          return ['gemini-3.8-live', 'gemini-3.8-flash', 'gemini-2.5-flash'];
        case '3.8-flash':
          return ['gemini-3.8-flash', 'gemini-2.5-flash'];
        case 'high':
          return ['gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-2.5-flash'];
        case 'fast':
        default:
          return ['gemini-3.8-live', 'gemini-3.8-flash', 'gemini-2.5-flash'];
      }
    };

    const candidateModels = getModelCandidates(profile.responseQuality);
    const enableWebSearch = profile.webSearch !== false;

    let lastError: any = null;
    let data: any = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const buildPayload = (withSearch: boolean) => ({
        contents,
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: lengthSetting.temperature,
          topP: 0.95,
          maxOutputTokens: lengthSetting.maxTokens,
        },
      });

      try {
        let response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(enableWebSearch)),
        });

        if (!response.ok && enableWebSearch) {
          console.warn(`[Gemini] Recherche Google non disponible pour ${model}, repli sans recherche...`);
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(false)),
          });
        }

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(
            errorData?.error?.message ||
            `Erreur de l'API Gemini (${response.status}: ${response.statusText})`
          );
          console.warn(`[Gemini] Modèle ${model} indisponible (${response.status}), tentative repli suivant...`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Échec tentative modèle ${model}:`, err?.message || err);
      }
    }

    if (!data) {
      throw lastError || new Error("Impossible de joindre l'API Gemini après plusieurs tentatives.");
    }

    if (data.usageMetadata) {
      const pTokens = Number(data.usageMetadata.promptTokenCount) || 0;
      const cTokens = Number(data.usageMetadata.candidatesTokenCount) || 0;
      try {
        storage.addTokens(pTokens, cTokens);
      } catch {
        // Ignorer erreur de stockage éventuelle
      }
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[Gemini] Fin de génération anormale détectée: ${finishReason}`);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const rawReply =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join('\n\n') ||
      "Je n'ai pas trouvé quoi répondre pour le moment...";

    return ensureCompleteSentence(rawReply, finishReason);
  },

  async generateSpeech({
    text,
    voice = 'Puck',
    apiKey,
  }: {
    text: string;
    voice?: string;
    apiKey?: string;
  }): Promise<string> {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new Error("Texte manquant pour la synthèse vocale.");
    }

    const key = (apiKey || '').trim();

    // 1. Si une clé API est configurée, tenter l'endpoint Gemini Multimodal Audio (gemini-3.8-live, gemini-3.8-live-extended-thinking, gemini-3.8-flash, gemini-2.0-flash-exp)
    if (key) {
      const candidateModels = [
        'gemini-3.8-live',
        'gemini-3.8-live-extended-thinking',
        'gemini-3.8-flash',
        'gemini-2.0-flash-exp',
      ];

      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [
            {
              parts: [
                {
                  text: `Prononce exactement la phrase suivante en français, sans aucun préambule ni commentaire : "${cleanText.replace(/"/g, "'")}"`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice || 'Puck',
                },
              },
            },
          },
        };

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const audioPart = parts.find((p: any) => p.inlineData || p.inline_data);
            const inline = audioPart?.inlineData || audioPart?.inline_data;

            if (inline && inline.data) {
              const mimeType = inline.mimeType || inline.mime_type || 'audio/wav';
              const base64Audio = inline.data;

              const binaryString = window.atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              const isAlreadyWav =
                bytes.length >= 4 &&
                bytes[0] === 0x52 &&
                bytes[1] === 0x49 &&
                bytes[2] === 0x46 &&
                bytes[3] === 0x46; // 'RIFF'

              let blob: Blob;
              if (isAlreadyWav) {
                blob = new Blob([bytes], { type: 'audio/wav' });
              } else {
                let rate = 24000;
                const match = (mimeType || '').match(/rate=(\d+)/);
                if (match) rate = parseInt(match[1], 10);
                blob = pcmToWavBlob(bytes, rate);
              }

              return URL.createObjectURL(blob);
            }
          } else {
            const errBody = await response.text().catch(() => '');
            console.warn(`[Gemini Audio] Modèle ${model} non disponible en audio REST:`, errBody);
          }
        } catch (err: any) {
          console.warn(`[Gemini Audio] Tentative (${model}) échouée, passage au moteur vocal Google:`, err?.message || err);
        }
      }
    }

    // 2. Moteur vocal Google haute fidélité via le pont local Nova (port 5005 ou relatif)
    const ttsEndpoints = [
      `/api/tts?text=${encodeURIComponent(cleanText)}&lang=fr`,
      `/nova/api/tts?text=${encodeURIComponent(cleanText)}&lang=fr`,
      `http://127.0.0.1:5005/api/tts?text=${encodeURIComponent(cleanText)}&lang=fr`,
    ];

    for (const ep of ttsEndpoints) {
      try {
        const res = await fetch(ep, { method: 'GET' });
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 200) {
            return URL.createObjectURL(blob);
          }
        }
      } catch {
        // En cas d'échec sur cet endpoint, passer au suivant
      }
    }

    // 3. Repli direct vers le flux audio Google Translate TTS (accessible en lecture directe Audio)
    let speakSnippet = cleanText;
    if (speakSnippet.length > 195) {
      const lastPunct = Math.max(
        speakSnippet.lastIndexOf('.', 195),
        speakSnippet.lastIndexOf('!', 195),
        speakSnippet.lastIndexOf('?', 195)
      );
      if (lastPunct > 50) {
        speakSnippet = speakSnippet.slice(0, lastPunct + 1);
      } else {
        const lastSpace = speakSnippet.lastIndexOf(' ', 195);
        speakSnippet = (lastSpace > 50 ? speakSnippet.slice(0, lastSpace) : speakSnippet.slice(0, 195)) + '.';
      }
    }
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=fr&client=tw-ob&q=${encodeURIComponent(
      speakSnippet
    )}`;
    return directUrl;
  },

  /**
   * Initialise une session WebSocket bidirectionnelle temps réel avec Gemini 3.8 LIVE.
   * Modèle : models/gemini-3.8-live (audio-to-audio natif à très faible latence).
   */
  createLiveWebSocketSession({
    apiKey,
    voice = 'Puck',
    systemInstruction,
    onAudioChunk,
    onText,
    onError,
    onClose,
  }: {
    apiKey: string;
    voice?: string;
    systemInstruction?: string;
    onAudioChunk?: (pcmBase64: string) => void;
    onText?: (text: string) => void;
    onError?: (err: any) => void;
    onClose?: () => void;
  }) {
    const key = (apiKey || '').trim();
    if (!key) {
      throw new Error("Clé API manquante pour la session Gemini 3.8 LIVE.");
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const setupMsg = {
        setup: {
          model: 'models/gemini-3.8-live',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice || 'Puck',
                },
              },
            },
          },
          ...(systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
              }
            : {}),
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const serverContent = data.serverContent;
        if (serverContent?.modelTurn?.parts) {
          for (const part of serverContent.modelTurn.parts) {
            if (part.text && onText) {
              onText(part.text);
            }
            const audioData = part.inlineData?.data || part.inline_data?.data;
            if (audioData && onAudioChunk) {
              onAudioChunk(audioData);
            }
          }
        }
      } catch (e) {
        console.warn('[Gemini 3.8 LIVE] Erreur traitement paquet:', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('[Gemini 3.8 LIVE] Erreur WebSocket:', e);
      if (onError) onError(e);
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    return {
      sendText: (text: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true,
              },
            })
          );
        }
      },
      close: () => {
        try {
          ws.close();
        } catch {}
      },
      ws,
    };
  },
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Garantit que la réponse de l'IA est complète et ne se termine jamais par une phrase coupée au milieu.
 * Si le modèle s'est arrêté abruptement (ex: coupure accidentelle ou token limit),
 * la fonction coupe proprement au dernier point complet existant, ou ajoute la ponctuation terminale manquante.
 */
export function ensureCompleteSentence(text: string, finishReason?: string): string {
  if (!text) return text;
  const trimmed = text.trim();

  // Isoler d'éventuelles balises d'action à la fin : [ACTION:KEY:...] [ACTION:HOLD:...]
  const actionRegex = /(\s*\[ACTION:(KEY|HOLD):[a-zA-Z0-9+_]+\])+\s*$/i;
  const actionMatch = trimmed.match(actionRegex);
  const actionsSuffix = actionMatch ? actionMatch[0].trim() : '';
  const prose = (actionMatch ? trimmed.slice(0, actionMatch.index) : trimmed).trim();

  if (!prose) return trimmed;

  // Caractères terminaux valides
  const terminalRegex = /[.!?…"»]$/;
  if (terminalRegex.test(prose)) {
    return trimmed;
  }

  // Si la prose ne se termine pas par une ponctuation terminale, chercher la dernière ponctuation complète
  const lastPeriod = Math.max(
    prose.lastIndexOf('.'),
    prose.lastIndexOf('!'),
    prose.lastIndexOf('?'),
    prose.lastIndexOf('…')
  );

  // Mots de liaison ou terminaisons incomplètes indiquant une phrase coupée en plein vol
  const danglingWordRegex = /(?:^|\s+)(?:à|de|du|des|en|au|aux|dans|par|pour|sur|sous|vers|avec|sans|et|ou|mais|donc|car|ni|que|qui|quoi|dont|où|d'|l'|qu'|[a-zÀ-ÿ]{1,2})\s*$/iu;

  // Si le modèle a été tronqué (MAX_TOKENS) ou se termine sur un mot de liaison incomplet
  if (lastPeriod > 0 && (finishReason === 'MAX_TOKENS' || danglingWordRegex.test(prose))) {
    const cleanProse = prose.slice(0, lastPeriod + 1).trim();
    return actionsSuffix ? `${cleanProse} ${actionsSuffix}` : cleanProse;
  }

  // Si mot de liaison sans point préalable, retirer le mot incomplet et fermer proprement
  if (danglingWordRegex.test(prose)) {
    const cleaned = prose.replace(danglingWordRegex, '').trim();
    return actionsSuffix ? `${cleaned}. ${actionsSuffix}` : `${cleaned}.`;
  }

  // Sinon, c'était une phrase bien formée à laquelle il manquait juste la ponctuation terminale
  return actionsSuffix ? `${prose}. ${actionsSuffix}` : `${prose}.`;
}

