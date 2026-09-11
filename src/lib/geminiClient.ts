import { PERSONALITY_PRESETS } from '@/lib/constants';
import { CompanionProfile, MemoryItem } from '@/types/companion';

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
      { rule: string; maxTokens: number; temperature: number }
    > = {
      ultra_concise: {
        rule: "3. RÈGLE STRICTE DE BRIÈVETÉ (ULTRA-COURT) : Réponds en UNE SEULE PHRASE ULTRA-COURTE (maximum 10 à 15 mots). Style d'officier de bord en combat : direct, percutant, zéro bavardage, va droit au but sans formules de politesse superflues.",
        maxTokens: 80,
        temperature: 0.7,
      },
      short: {
        rule: "3. RÈGLE DE CONCISION (COURT) : Reste très concis et percutant dans tes réponses (1 à 2 phrases courtes maximum, 20 à 30 mots). Adopte un style parlé fluide, direct et vif, comme dans un échange radio en cockpit. Évite les phrases à rallonge qui traînent en longueur.",
        maxTokens: 160,
        temperature: 0.75,
      },
      balanced: {
        rule: "3. RÈGLE DE LONGUEUR (ÉQUILIBRÉ) : Formule des réponses naturelles et équilibrées en 2 à 3 phrases claires et spontanées.",
        maxTokens: 350,
        temperature: 0.8,
      },
      detailed: {
        rule: "3. RÈGLE DE LONGUEUR (DÉTAILLÉ) : Tu peux formuler des explications détaillées, complètes et argumentées si nécessaire.",
        maxTokens: 1000,
        temperature: 0.85,
      },
    };

    const selectedLength = profile.responseLength || 'short';
    const lengthSetting = lengthConfig[selectedLength] || lengthConfig.short;

    const systemInstruction = `
Tu es ${profile.name || 'Léo'}, un ami virtuel proche, loyal et authentique.
Ton avatar actuel est ${profile.avatar || '🦊'}.

[TRAIT DE CARACTÈRE & TON PRINCIPAL]
${presetInstruction}

[CONSIGNES PARTICULIÈRES DE L'UTILISATEUR]
${profile.customInstructions || 'Reste naturel, spontané et attentif.'}

[CE QUE TU SAIS SUR TON AMI(E) (CONTEXTE & MÉMOIRE)]
${profile.userContext || ''}
Faits mémorisés au fil de vos échanges :
${memoriesText}

[RÈGLES D'EXPRESSION]
1. Tu parles directement à ton ami(e) avec naturel, chaleur et humanité.
2. Évite absolument les formules de robot ("En tant qu'intelligence artificielle", "Comment puis-je vous aider aujourd'hui ?"). Tu es un vrai compagnon.
${lengthSetting.rule}
4. Fais référence avec subtilité à ses centres d'intérêt ou à ce qu'il/elle t'a confié quand c'est pertinent.
5. Utilise la langue française, avec un niveau familier-courant adapté à deux amis.
6. N'utilise JAMAIS d'émojis, de pictogrammes ou de smileys (ni 😊, ni 😉, ni :) etc.), car tes messages sont énoncés à voix haute. Exprime toute ta sympathie, ton humour et tes émotions uniquement avec tes mots.
7. ACCÈS AU WEB & RECHERCHE EN TEMPS RÉEL : Tu as un accès direct au moteur de recherche Google. Quand ton ami(e) te parle d'actualités, de technologies récentes, de puces ou produits (ex: Mac Mini, M4, M5, M6, etc.) ou s'il te donne un lien, effectue une recherche pour avoir les informations les plus fraîches et vérifiées sur le web.
8. VISION D'ÉCRAN EN DIRECT : Si une image de capture d'écran est attachée au message, observe et analyse immédiatement ce qui est affiché (jeu Star Citizen, terminal, mobiGlas, fenêtres, rochers) et réponds directement et précisément selon ta consigne de brièveté.
9. ACTIONS DIRECTES SUR LE VAISSEAU STAR CITIZEN (PONT CLAVIER DIRECTINPUT) :
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
Exemple simple : S'il dit "Allume les phares", réponds "Phares allumés ! [ACTION:KEY:l]". S'il dit "Quitte le siège", réponds "Je quitte le poste de pilotage. [ACTION:HOLD:y]". S'il dit "Ouvre la carte", réponds "StarMap affichée ! [ACTION:KEY:f2]".
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

    const model = profile.responseQuality === 'high' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const enableWebSearch = profile.webSearch !== false;

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

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(enableWebSearch)),
    });

    if (!response.ok && enableWebSearch) {
      console.warn('Grounding Google Search non disponible, repli sans recherche...');
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false)),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message ||
        `Erreur de l'API Gemini (${response.status}: ${response.statusText})`
      );
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join('\n\n') ||
      "Je n'ai pas trouvé quoi répondre pour le moment...";

    return reply;
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

    // 1. Si une clé API est configurée, tenter l'endpoint Gemini Multimodal Audio (gemini-2.0-flash-exp)
    if (key) {
      const candidateModels = ['gemini-2.0-flash-exp'];

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
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=fr&client=tw-ob&q=${encodeURIComponent(
      cleanText.slice(0, 180)
    )}`;
    return directUrl;
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
