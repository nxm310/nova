/**
 * Nettoie un texte avant de l'envoyer à un moteur de synthèse vocale (TTS).
 * Supprime complètement les émojis, symboles, smileys texte et balises Markdown
 * pour éviter que le moteur vocal ne lise "émoji visage souriant" ou "deux-points parenthèse".
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // 1. Supprimer les URLs web (https://...)
      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
      // 2. Supprimer les emojis spécifiques aux touches de pavé numérique (ex: 1️⃣, 2️⃣)
      .replace(/[0-9#*][\uFE0F\u20E3]+/gu, '')
      // 3. Supprimer les smileys textuels courants (:), ;-), :D, <3, etc.) AVANT d'enlever les parenthèses
      .replace(/(?:\s|^)(?:[:;=8]['-]?[)D(\]pP\/\\|]|<3|\^_\^)(?:\s|$)/g, ' ')
      // 4. Supprimer le Markdown (*, _, #, `, ~, [], ())
      .replace(/[*_#`~[\]()]/g, '')
      // 5. Supprimer tous les vrais émojis Unicode (pictogrammes, visages, animaux, modificateurs)
      // IMPORTANT : Ne PAS utiliser \p{Emoji_Component} car cela efface les chiffres 0 à 9 !
      .replace(
        /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\uFE0F\u200D]/gu,
        ''
      )
      // 6. Nettoyer les espaces multiples et espaces devant la ponctuation
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim()
  );
}
