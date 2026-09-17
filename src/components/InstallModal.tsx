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
  Terminal,
  Sparkles,
  ExternalLink,
  Laptop
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

  if (!isOpen) return null;

  const handleCreateDesktopShortcut = async () => {
    setShortcutLoading(true);
    setShortcutStatus(null);
    try {
      // Tenter d'abord /api/desktop-shortcut puis /nova/api/desktop-shortcut
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
          message: 'Le pont PC Nova ne répond pas. Vérifiez que DEMARRER_NOVA.bat est lancé.',
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
                  Installer l'Application Nova
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PWA & Cockpit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mode application autonome, raccourci bureau et configuration multi-écrans
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
          {/* OPTION 1 : INSTALLATION PWA IMMÉDIATE (NAVIGATEUR) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-indigo-950/40 border border-cyan-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-sm text-cyan-200">
                    Application Web Progressive (PWA)
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Installez Nova comme une application de bureau native dans Chrome, Edge ou Brave.
                  Elle apparaîtra dans votre menu Démarrer et votre barre des tâches sans barres d'onglets de navigateur.
                </p>
              </div>

              {canInstallPrompt ? (
                <button
                  type="button"
                  onClick={onTriggerInstall}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-cyan-500/30 active:scale-95 transition shrink-0 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>Installer</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[11px] shrink-0 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Déjà installée ou via menu</span>
                </div>
              )}
            </div>

            {!canInstallPrompt && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-medium text-slate-300">Comment installer manuellement si le bouton n'apparaît pas :</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li><strong className="text-cyan-300">Chrome :</strong> Cliquez sur l'icône <strong className="text-white">⊕</strong> dans la barre d'adresse (à droite) ou Menu (⋮) → <em>Installer Nova...</em></li>
                  <li><strong className="text-cyan-300">Edge :</strong> Cliquez sur l'icône <strong className="text-white">⊕ App</strong> dans la barre d'adresse ou Menu (…) → <em>Applications</em> → <em>Installer Nova</em></li>
                  <li><strong className="text-cyan-300">Brave :</strong> Cliquez sur l'icône d'installation à droite de l'URL.</li>
                </ul>
              </div>
            )}
          </div>

          {/* OPTION 2 : RACCOURCI BUREAU WINDOWS 1-CLIC */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm text-white">
                    Raccourci Bureau Windows (1-Clic)
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Crée une icône <strong className="text-white">« Nova - Star Citizen »</strong> directement sur votre Bureau Windows.
                  Elle lance le pont de communication en <strong className="text-emerald-400">mode Administrateur</strong> pour que Star Citizen accepte les frappes clavier sans blocage.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateDesktopShortcut}
                disabled={shortcutLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-semibold shadow-sm active:scale-95 transition shrink-0 flex items-center gap-2 disabled:opacity-50"
              >
                {shortcutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Créer le Raccourci</span>
                  </>
                )}
              </button>
            </div>

            {shortcutStatus && (
              <div
                className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  shortcutStatus.success
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500 text-rose-200'
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

          {/* OPTION 3 : FENÊTRE ÉCRAN VERTICAL (MODE APP SANS BARRES) */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-white">
                Fenêtre Autonome Plein Écran (Écran Vertical PC)
              </h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Si vous placez Nova sur un écran secondaire vertical à côté de votre écran Star Citizen,
              lancez-le en mode fenêtre dédiée sans barre d'adresse ni onglets parasites :
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

          {/* OPTION 4 : TABLETTE / IPAD EN TOUCH DECK COCKPIT */}
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
                Connectez la tablette au même réseau Wi-Fi que votre PC.
              </li>
              <li>
                Ouvrez Safari (iPad/iPhone) ou Chrome (Android) et tapez l'adresse IP locale de votre PC :{' '}
                <span className="font-mono text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded">http://&lt;IP_DE_VOTRE_PC&gt;:5005/nova/</span>
              </li>
              <li>
                <strong className="text-purple-300">Sur iPad / iOS :</strong> Touchez le bouton Partager ⎋ puis choisissez{' '}
                <strong className="text-white">« Sur l'écran d'accueil »</strong>.
              </li>
              <li>
                <strong className="text-purple-300">Sur Android :</strong> Touchez le menu (⋮) puis{' '}
                <strong className="text-white">« Ajouter à l'écran d'accueil »</strong> ou <strong className="text-white">« Installer l'application »</strong>.
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
              {bridgeConnected === true ? 'Pont PC connecté (Port 5005)' : 'Pont PC non détecté'}
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
