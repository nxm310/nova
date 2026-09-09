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

## 🛠️ Utilisation du Micro-Pont Clavier sur PC Windows (pour Star Citizen)

Pour que les ordres vocaux pressent physiquement des touches dans Star Citizen :
1. Sur votre PC de jeu Windows, ouvrez un terminal PowerShell dans le dossier de l'application :
   ```powershell
   pip install pydirectinput
   python scripts/bridge.py
   ```
2. Dans les **Paramètres ⚙️** de Nova sur [https://nxm310.github.io/nova/](https://nxm310.github.io/nova/), vérifiez l'adresse IP de votre PC et cliquez sur **« Tester le pont »**.

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
