'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Vérifier si déjà installé en PWA standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Détection iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Événement Chrome / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Sur iOS, afficher une petite bannière discrète après 3 secondes si pas déjà standalone
    if (isIosDevice && !standalone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <aside aria-label="Installer l'application" className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 p-3.5 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-slate-200 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent-600/20 text-accent-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Installer l'application</h4>
            <p className="text-[11px] text-slate-400">
              Pour un accès instantané depuis ton écran d'accueil
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Fermer l'invitation d'installation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIOS ? (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-1.5 leading-tight">
          <span>Appuie sur Partager</span>
          <Share className="w-3.5 h-3.5 text-blue-400 inline" />
          <span>puis sur « Sur l'écran d'accueil »</span>
          <PlusSquare className="w-3.5 h-3.5 text-accent-400 inline" />
        </div>
      ) : (
        deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="mt-3 w-full py-1.5 px-3 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-accent-600/20"
          >
            Installer sur mon appareil
          </button>
        )
      )}
    </aside>
  );
};
