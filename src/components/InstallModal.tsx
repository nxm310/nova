'use client';

import React, { useState } from 'react';
import {
  Download,
  Check,
  Copy,
  Monitor,
  Smartphone,
  X,
  ShieldCheck,
  Sparkles,
  Laptop,
  Play,
  AlertTriangle,
  Power
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstallPrompt: boolean;
  onTriggerInstall: () => void;
  bridgeConnected: boolean | null;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  canInstallPrompt,
  onTriggerInstall,
  bridgeConnected,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [shortcutLoading, setShortcutLoading] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const [startupLoading, setStartupLoading] = useState(false);
  const [startupStatus, setStartupStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCreateDesktopShortcut = async () => {
    setShortcutLoading(true);
    setShortcutStatus(null);
    try {
      let res = await fetch('/api/desktop-shortcut', { method: 'POST' }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('/nova/api/desktop-shortcut', { method: 'POST' }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setShortcutStatus({
            success: true,
            message: data.message || 'Raccourci créé sur votre Bureau Windows avec succès !',
          });
        } else {
          setShortcutStatus({
            success: false,
            message: data.error || 'Impossible de créer le raccourci automatiquement.',
          });
        }
      } else {
        setShortcutStatus({
          success: false,
          message: 'Le pont PC ne répond pas. Lancez d\'abord DEMARRER_NOVA.bat ou utilisez le fichier CREER_RACCOURCI_BUREAU.bat dans le dossier de Nova.',
        });
      }
    } catch (err: any) {
      setShortcutStatus({
        success: false,
        message: err?.message || 'Erreur réseau lors de la communication avec le pont PC.',
      });
    } finally {
      setShortcutLoading(false);
    }
  };

  const handleToggleStartup = async (enable: boolean) => {
    setStartupLoading(true);
    setStartupStatus(null);
    try {
      let res = await fetch(`/api/startup-shortcut?enable=${enable}`, { method: 'POST' }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/nova/api/startup-shortcut?enable=${enable}`, { method: 'POST' }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setStartupStatus({
            success: true,
            message: data.message || (enable ? 'Démarrage automatique activé !' : 'Démarrage automatique désactivé.'),
          });
        } else {
          setStartupStatus({
            success: false,
            message: data.error || 'Erreur lors de la configuration du démarrage.',
          });
        }
      } else {
        setStartupStatus({
          success: false,
          message: 'Le pont PC ne répond pas. Lancez d\'abord DEMARRER_NOVA.bat.',
        });
      }
    } catch (err: any) {
      setStartupStatus({
        success: false,
        message: err?.message || 'Erreur réseau.',
      });
    } finally {
      setStartupLoading(false);
    }
  };

  const copyStandaloneCmd = () => {
    const cmd = 'start chrome.exe --app=http://localhost:5005/nova/';
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center shadow-inner">
              <Download className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Installer & Lancer l'Application Nova
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cockpit Star Citizen
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronisation du pont Python, raccourci bureau et configuration plein écran
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* ALERTE PONT DÉCONNECTÉ SI APPLICABLE */}
          {bridgeConnected === false && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-rose-200">
                    Le pont Python (Port 5005) n'est pas lancé
                  </p>
                  <p className="text-rose-300 text-xs leading-relaxed">
                    L'interface web tourne, mais le pont local est indispensable pour transmettre vos ordres vocaux directement dans Star Citizen (DirectInput).
                  </p>
                </div>
              </div>
              <a
                href="nova://start"
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Démarrer le Pont</span>
              </a>
            </div>
          )}

          {/* SECTION ESSENTIELLE : RACCOURCI BUREAU UNIFIÉ (PONT + APPLICATION) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-teal-950/40 border border-emerald-500/40 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-emerald-200">
                    Raccourci Bureau Complet « Nova - Star Citizen »
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommandé
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Crée une icône officielle sur votre Bureau Windows qui <strong>lance automatiquement le pont Python en Administrateur</strong> et <strong>ouvre immédiatement la fenêtre cockpit</strong>. C'est la méthode idéale pour lancer Nova en 1 double-clic !
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateDesktopShortcut}
                disabled={shortcutLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition shrink-0 flex items-center gap-2 disabled:opacity-50"
              >
                {shortcutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Créer le Raccourci Bureau</span>
                  </>
                )}
              </button>
            </div>

            {shortcutStatus && (
              <div
                className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  shortcutStatus.success
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500 text-rose-200'
                }`}
              >
                {shortcutStatus.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{shortcutStatus.message}</span>
              </div>
            )}
          </div>

          {/* DÉMARRAGE AUTOMATIQUE AU BOOT WINDOWS */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Power className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-sm text-white">
                    Lancer le pont avec Windows (Démarrage Automatique)
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Permet au pont Python de démarrer silencieusement en arrière-plan à chaque allumage de votre PC. Comme ça, Nova est toujours prêt à répondre dès que vous ouvrez l'appli ou lancez Star Citizen.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleStartup(true)}
                  disabled={startupLoading}
                  className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold active:scale-95 transition disabled:opacity-50"
                >
                  Activer
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStartup(false)}
                  disabled={startupLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold active:scale-95 transition disabled:opacity-50"
                >
                  Désactiver
                </button>
              </div>
            </div>

            {startupStatus && (
              <div
                className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  startupStatus.success
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                    : 'bg-rose-950/80 border-rose-500 text-rose-200'
                }`}
              >
                {startupStatus.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{startupStatus.message}</span>
              </div>
            )}
          </div>

          {/* APPLICATION PWA DU NAVIGATEUR */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-sm text-cyan-200">
                    Application Web Progressive (PWA Navigateur)
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Si vous avez installé Nova via l'icône <strong>⊕</strong> de Chrome/Edge, pensez à lancer <strong>DEMARRER_NOVA.bat</strong> ou votre raccourci bureau pour que les touches physiques fonctionnent en jeu.
                </p>
              </div>

              {canInstallPrompt ? (
                <button
                  type="button"
                  onClick={onTriggerInstall}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/30 active:scale-95 transition shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer PWA</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[11px] shrink-0 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prise en charge active</span>
                </div>
              )}
            </div>
          </div>

          {/* FENÊTRE DÉDIÉE SANS BARRES DE NAVIGATION (ÉCRAN VERTICAL) */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-white">
                Fenêtre Plein Écran Dédiée (Écran Vertical PC)
              </h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Pour afficher Nova sans onglets ni barre d'adresse sur votre écran vertical secondaire :
            </p>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300">
              <span className="truncate mr-2">start chrome.exe --app=http://localhost:5005/nova/</span>
              <button
                type="button"
                onClick={copyStandaloneCmd}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 shrink-0 font-sans text-xs"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* TABLETTE / IPAD EN TOUCH DECK COCKPIT */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-sm text-white">
                Tablette, iPad ou Smartphone (Écran Tactile Déporté)
              </h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-2.5">
              Utilisez un iPad ou une tablette Android fixée à côté de votre joystick ou clavier :
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 text-[11px]">
              <li>
                Connectez la tablette au même réseau Wi-Fi que votre PC de jeu.
              </li>
              <li>
                Ouvrez Safari (iPad) ou Chrome (Android) et saisissez l'adresse de votre PC :{' '}
                <span className="font-mono text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded">http://&lt;IP_DU_PC&gt;:5005/nova/</span>
              </li>
              <li>
                <strong className="text-purple-300">Sur iPad / iOS :</strong> Touchez Partager ⎋ puis{' '}
                <strong className="text-white">« Sur l'écran d'accueil »</strong>.
              </li>
              <li>
                <strong className="text-purple-300">Sur Android :</strong> Touchez le menu (⋮) puis{' '}
                <strong className="text-white">« Ajouter à l'écran d'accueil »</strong>.
              </li>
            </ol>
          </div>
        </div>

        {/* Pied de Modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                bridgeConnected === true ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span>
              {bridgeConnected === true ? 'Pont PC connecté (Port 5005)' : 'Pont PC déconnecté (Lancez DEMARRER_NOVA.bat)'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
