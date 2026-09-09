# 🚀 Nova — Compagnon Virtuel & Copilote Star Citizen (PWA)

Application autonome de compagnon virtuel intelligent propulsée par **Google Gemini 2.5 Flash**, accessible directement en ligne sur GitHub Pages :
👉 **[https://nxm310.github.io/nova/](https://nxm310.github.io/nova/)**

---

## ✨ Fonctionnalités

1. **Compagnon Virtuel Autonome (100% Web)** :
   * Discutez à l'écrit ou à l'oral avec votre compagnon (synthèse vocale Web Speech / Siri intégrée).
   * Personnalisation complète (Avatar, Personnalité, Mémoire à long terme, Clé API).
   * Mode **Appel Direct Mains-Libres** : discussion vocale continue sans avoir à cliquer sur les boutons.

2. **👁️ Vision d'Écran en Direct** :
   * Bouton **Vision ON / OFF** : partagez votre écran ou la fenêtre de votre jeu (ex: Star Citizen).
   * L'IA analyse visuellement votre cockpit, votre statut ou l'environnement et vous répond vocalement.

3. **🎮 Macros Vocales & Commandes Star Citizen (DirectInput)** :
   * Déclenchement instantané de touches physiques à la voix (0ms de latence vocale).
   * Touches par défaut :
     * *« Sort le train »* / *« Train d'atterrissage »* ➔ Touche **`N`**
     * *« Mode Quantum »* ➔ Touche **`B`**
     * *« Allume les phares »* ➔ Touche **`L`**
     * *« Déploie les armes »* ➔ Touche **`P`**
     * *« Régulateur »* ➔ Touche **`C`**
     * *« Ouvre les portes »* ➔ Touche **`K`**
   * Personnalisation et ajout de commandes illimitées dans les **Paramètres ⚙️ > Touches Star Citizen**.

---

## 🛠️ Lancement du Compagnon & Pont Clavier Star Citizen

### Option 1 : Exécutable Tout-en-un (Recommandé — Zéro installation)
1. Téléchargez **`Nova-StarCitizen-Windows.zip`** depuis la section [Releases](https://github.com/nxm310/nova/releases).
2. Décompressez le fichier ZIP dans un dossier sur votre PC de jeu.
3. Double-cliquez sur **`DEMARRER_NOVA.bat`** (ou `Nova-StarCitizen.exe`).
4. Votre navigateur s'ouvre automatiquement sur `http://localhost:5005/nova/` et le pont clavier est immédiatement connecté (voyant vert 🟢 dans le menu supérieur) !
5. Gardez la fenêtre console ouverte en arrière-plan pendant que vous jouez à Star Citizen.

### Option 2 : Depuis le code source Python
1. Double-cliquez simplement sur **`DEMARRER_NOVA.bat`** à la racine du projet (il s'élèvera automatiquement en Administrateur et installera les dépendances requises).

---

## 💻 Développement Local

```bash
# Installation
npm install

# Lancement serveur local (port 3000)
npm run dev

# Export statique pour GitHub Pages
npm run build
```
