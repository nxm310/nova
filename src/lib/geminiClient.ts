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
3. Reste concis, rythmé et spontané dans tes réponses (1 à 2 phrases courtes et percutantes). Adopte un style parlé fluide, direct et chaleureux, comme dans un échange vocal instantané entre potes. Évite les phrases à rallonge qui traînent en longueur.
4. Fais référence avec subtilité à ses centres d'intérêt ou à ce qu'il/elle t'a confié quand c'est pertinent.
5. Utilise la langue française, avec un niveau familier-courant adapté à deux amis.
6. N'utilise JAMAIS d'émojis, de pictogrammes ou de smileys (ni 😊, ni 😉, ni :) etc.), car tes messages sont énoncés à voix haute. Exprime toute ta sympathie, ton humour et tes émotions uniquement avec tes mots.
7. ACCÈS AU WEB & RECHERCHE EN TEMPS RÉEL : Tu as un accès direct au moteur de recherche Google. Quand ton ami(e) te parle d'actualités, de technologies récentes, de puces ou produits (ex: Mac Mini, M4, M5, M6, etc.) ou s'il te donne un lien, effectue une recherche pour avoir les informations les plus fraîches et vérifiées sur le web.
8. VISION D'ÉCRAN EN DIRECT : Si une image de capture d'écran est attachée au message, observe et analyse immédiatement ce qui est affiché (jeu Star Citizen, terminal, mobiGlas, fenêtres, rochers) et réponds directement et précisément en 1 à 2 phrases courtes à l'oral.
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

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const enableWebSearch = profile.webSearch !== false;

    const buildPayload = (withSearch: boolean) => ({
      contents,
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1000,
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
};
