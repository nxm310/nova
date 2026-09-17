'use client';

import React, { useState, useRef, useMemo } from 'react';
import { CompanionProfile } from '@/types/companion';
import { VoiceMacro, getMacroCategory, MacroCategory } from '@/lib/voiceMacros';
import { TelemetryWidget } from '@/components/TelemetryWidget';
import {
  PhoneOff,
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  Square,
  Sparkles,
  Send,
  Clipboard,
  Link2,
  Eye,
  EyeOff,
  Settings,
  Gamepad2,
  Search,
  X,
  Rocket,
  Shield,
  Zap,
  Radio,
  Lightbulb,
  Compass,
  Copy,
  Check,
  Play,
  ExternalLink,
} from 'lucide-react';

export type LiveCallState = 'listening' | 'thinking' | 'speaking';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanionProfile;
  callState: LiveCallState;
  liveTranscript: string;
  lastReply: string;
  onInterrupt: () => void;
  onSendMessage: (text: string) => void;
  isVisionActive?: boolean;
  onToggleVision?: () => void;
  onOpenSettings?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  macros?: VoiceMacro[];
  onTriggerMacro?: (macro: VoiceMacro) => void;
  deckFeedbackKey?: string | null;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  isOpen,
  onClose,
  profile,
  callState,
  liveTranscript,
  lastReply,
  onInterrupt,
  onSendMessage,
  isVisionActive,
  onToggleVision,
  onOpenSettings,
  isMuted,
  onToggleMute,
  macros = [],
  onTriggerMacro,
  deckFeedbackKey,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'call' | 'deck'>('call');
  const [deckCategory, setDeckCategory] = useState<MacroCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const enabledMacros = useMemo(() => {
    return macros.filter((m) => m.enabled);
  }, [macros]);

  const filteredMacros = useMemo(() => {
    return enabledMacros.filter((m) => {
      if (deckCategory !== 'all' && getMacroCategory(m) !== deckCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesKey = m.key.toLowerCase().includes(q);
        const matchesPhrases = m.phrases.some((p) => p.toLowerCase().includes(q));
        return matchesName || matchesKey || matchesPhrases;
      }
      return true;
    });
  }, [enabledMacros, deckCategory, searchQuery]);

  const [copiedReply, setCopiedReply] = useState(false);

  const handleCopyReply = () => {
    if (!lastReply) return;
    try {
      navigator.clipboard?.writeText(lastReply);
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 2000);
    } catch {}
  };

  const handleQuickTrigger = (keyOrName: string, promptText: string) => {
    const matching = enabledMacros.find(
      (m) =>
        m.key.toLowerCase() === keyOrName.toLowerCase() ||
        m.name.toLowerCase().includes(keyOrName.toLowerCase())
    );
    if (matching && onTriggerMacro) {
      onTriggerMacro(matching);
    } else {
      onSendMessage(promptText);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || callState === 'thinking') return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
          inputRef.current?.focus();
          return;
        }
      }
    } catch {
      // Permission presse-papier refusée ou non supportée
    }
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-2xl p-3 sm:p-5 md:p-6 text-white animate-fade-in safe-top safe-bottom overflow-hidden select-none">
      {/* HEADER : HAUT DE PAGE SPACIEUX & COCKPIT HUD (max-w-4xl) */}
      <header className="w-full max-w-4xl flex items-center justify-between transition-all duration-300 pt-1 pb-2.5 border-b border-slate-800/80 shrink-0 gap-3">
        {/* Identité & Statut de l'Appel */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-500/40 text-base shrink-0 shadow-md">
            <span>{profile.avatar}</span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                callState === 'speaking'
                  ? 'bg-purple-400 animate-pulse'
                  : callState === 'listening'
                  ? 'bg-cyan-400 animate-ping'
                  : 'bg-emerald-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide truncate">
                {profile.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold uppercase tracking-wider hidden sm:inline">
                Gemini 3.8 LIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Liaison vocale bidirectionnelle active</span>
            </div>
          </div>
        </div>

        {/* Télémétrie & Contrôles d'en-tête */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Télémétrie Live Tokens & Coût Réel */}
          <TelemetryWidget className="shrink-0" />

          {/* Bouton / Onglet Commandes Vaisseau */}
          {enabledMacros.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'deck' ? 'call' : 'deck')}
              className={`h-9 px-3 rounded-xl border text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5 ${
                activeTab === 'deck'
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={
                activeTab === 'deck'
                  ? "Revenir à l'affichage vocal"
                  : 'Afficher la console complète des touches Star Citizen'
              }
            >
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Commandes Vaisseau</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 font-mono text-cyan-400 border border-slate-700">
                {enabledMacros.length}
              </span>
            </button>
          )}

          {/* Bouton Mute */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              type="button"
              className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                isMuted
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={
                isMuted
                  ? 'Réactiver la voix du compagnon'
                  : 'Couper la voix du compagnon (mode muet / écrit uniquement)'
              }
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden md:inline">{isMuted ? 'Muet' : 'Voix ON'}</span>
            </button>
          )}

          {/* Bouton Vision */}
          {onToggleVision && (
            <button
              onClick={onToggleVision}
              type="button"
              className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                isVisionActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800/90 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title={
                isVisionActive
                  ? 'Désactiver la vision écran'
                  : 'Activer le partage d’écran pour la vision IA'
              }
            >
              {isVisionActive ? (
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden md:inline">
                {isVisionActive ? 'Vision ON' : 'Vision'}
              </span>
            </button>
          )}

          {/* Bouton Paramètres */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              type="button"
              className="h-9 w-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 flex items-center justify-center shrink-0"
              title="Paramètres du compagnon"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Fermer (X) */}
          <button
            onClick={onClose}
            type="button"
            className="h-9 w-9 rounded-xl bg-slate-800/90 hover:bg-rose-900/60 hover:border-rose-500 border border-slate-700/80 text-slate-400 hover:text-rose-200 transition active:scale-95 flex items-center justify-center shrink-0"
            title="Quitter l'appel direct"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SÉLECTEUR D'ONGLETS TACTIQUE (APPEL & VOIX vs COMMANDES VAISSEAU) */}
      <div className="w-full max-w-md flex items-center justify-center pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs w-full shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('call')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'call'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Liaison Vocale Directe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deck')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'deck'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Toutes les Commandes ({enabledMacros.length})</span>
          </button>
        </div>
      </div>

      {/* ZONE CENTRALE : VUE APPEL VOCAL OU VUE COMMANDES VAISSEAU */}
      {activeTab === 'call' ? (
        /* VUE 1 : APPEL VOCAL & CONSOLE DE BORD INTÉGRÉE (ÉCRAN VERTICAL) */
        <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-start my-auto py-2 space-y-4 overflow-y-auto custom-scrollbar px-1">
          {/* Avatar Holographique Élargi avec Anneaux Réactifs */}
          <div className="relative flex items-center justify-center pt-3 shrink-0">
            {/* Pulsing Aura Rings */}
            <div
              className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-700 ${
                callState === 'speaking'
                  ? 'bg-purple-500/30 scale-125 animate-pulse'
                  : callState === 'listening'
                  ? 'bg-cyan-500/30 scale-110 animate-pulse'
                  : 'bg-indigo-500/15 scale-100'
              } blur-2xl`}
            />

            {/* Avatar Ring */}
            <div
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl bg-slate-900/90 border-2 transition-all duration-500 shadow-2xl ${
                callState === 'speaking'
                  ? 'border-purple-400 ring-4 ring-purple-500/30 shadow-purple-500/40 scale-105'
                  : callState === 'listening'
                  ? 'border-cyan-400 ring-4 ring-cyan-500/30 shadow-cyan-500/40 scale-105'
                  : 'border-slate-700/90'
              }`}
            >
              {profile.avatar}

              {/* Status Pill Badge */}
              <div
                className={`absolute -bottom-3 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl whitespace-nowrap transition-colors border ${
                  callState === 'speaking'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30'
                    : callState === 'listening'
                    ? isMuted
                      ? 'bg-amber-600 text-white border-amber-400 shadow-amber-500/20'
                      : 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {callState === 'speaking' && (
                  <>
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    <span>{profile.name} parle...</span>
                  </>
                )}
                {callState === 'listening' && (
                  <>
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>{isMuted ? "Écoute active (Mode Muet)" : "Je vous écoute..."}</span>
                  </>
                )}
                {callState === 'thinking' && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyse des systèmes...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badge Mode Muet */}
          {isMuted && (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/70 border border-amber-500/40 px-3.5 py-1 rounded-full shadow-sm animate-fade-in shrink-0">
              <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Mode Silencieux actif : {profile.name} répond uniquement par écrit</span>
            </div>
          )}

          {/* Transcription Vocale du Pilote en Direct */}
          <div className="w-full max-w-2xl min-h-[44px] flex items-center justify-center px-2 text-center shrink-0">
            {callState === 'listening' && (
              <p className="text-sm sm:text-base font-medium text-cyan-200 leading-snug animate-fade-in transition-all">
                {liveTranscript ? (
                  <span className="bg-cyan-950/80 border border-cyan-500/60 px-4 py-2 rounded-2xl inline-block shadow-lg shadow-cyan-950/50">
                    « {liveTranscript} »
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs sm:text-sm italic">
                    🎙️ Donnez vos ordres de vol ou parlez librement, le système écoute en continu...
                  </span>
                )}
              </p>
            )}

            {callState === 'thinking' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-cyan-300 bg-cyan-950/60 px-4 py-2 rounded-2xl border border-cyan-800 shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{profile.name} formule sa réponse et exécute vos ordres...</span>
              </div>
            )}
          </div>

          {/* CARTE DE DERNIÈRE RÉPONSE COMPAGNON */}
          {lastReply && (
            <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-2xl text-left animate-fade-in transition-all shrink-0">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <span className="text-base">{profile.avatar}</span>
                  <span>Dernière réponse de {profile.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReply}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
                    title="Copier la réponse"
                  >
                    {copiedReply ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>

                  {callState === 'speaking' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse font-mono">
                      Voix 3.8 LIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm text-slate-200 leading-relaxed max-h-48 sm:max-h-56 overflow-y-auto whitespace-pre-wrap select-text pr-1 custom-scrollbar">
                {lastReply}
              </div>
            </div>
          )}

          {/* CONSOLE TACTIQUE DE VOL INTÉGRÉE (SPÉCIAL ÉCRAN VERTICAL) */}
          <div className="w-full max-w-2xl pt-2 space-y-2 text-left shrink-0">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Raccourcis de Vol Directs (Tactile ou Vocal)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 lowercase">
                cliquez ou prononcez
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Tour ATC', prompt: "Demande l'atterrissage à la tour", key: 'ALT+N', icon: Radio },
                { label: 'Phares', prompt: 'Allume les phares', key: 'L', icon: Lightbulb },
                { label: 'Train', prompt: "Rentre le train d'atterrissage", key: 'N', icon: Shield },
                { label: 'Boucliers', prompt: 'Active les boucliers', key: 'O', icon: Shield },
                { label: 'Quantum', prompt: 'Active le mode quantum', key: 'B', icon: Zap },
                { label: 'Leurres', prompt: 'Lance des leurres thermiques', key: 'G', icon: Sparkles },
                { label: 'Brouillage', prompt: 'Brouille les radars', key: 'H', icon: Radio },
                { label: 'StarMap', prompt: 'Ouvre la carte stellaire', key: 'F2', icon: Compass },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickTrigger(item.key, item.prompt)}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/90 hover:border-cyan-500/50 transition-all flex flex-col justify-between group text-left active:scale-95 shadow-sm"
                >
                  <div className="flex items-center justify-between w-full">
                    <item.icon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 font-mono text-[9px] font-bold text-cyan-300 border border-slate-800">
                      {item.key}
                    </span>
                  </div>
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-white mt-1.5 truncate">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        /* VUE 2 : TOUTES LES COMMANDES VAISSEAU (CONSOLE COMPLÈTE) */
        <main className="flex-1 w-full max-w-4xl flex flex-col my-auto py-1 px-1 sm:px-2 overflow-hidden">
          {/* Bannière d'État d'Appel Actif */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs mb-3 shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-base shrink-0">
                <span>{profile.avatar}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                    callState === 'speaking'
                      ? 'bg-purple-400 animate-pulse'
                      : callState === 'listening'
                      ? 'bg-cyan-400 animate-ping'
                      : 'bg-emerald-400'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white truncate text-xs">
                    {profile.name} en direct
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {callState === 'speaking'
                      ? '• Parle...'
                      : callState === 'listening'
                      ? '• Écoute active'
                      : '• En attente'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-200 truncate mt-0.5">
                  {liveTranscript ? (
                    <span>« {liveTranscript} »</span>
                  ) : (
                    <span className="text-slate-400">
                      Prononcez un ordre ou cliquez sur une commande ci-dessous
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('call')}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-semibold text-cyan-200 hover:text-white transition active:scale-95"
            >
              Vue Appel
            </button>
          </div>

          {/* Filtres Catégories & Recherche */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3 shrink-0">
            {/* Filtres catégories */}
            <div className="flex items-center gap-1 text-xs bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 shrink-0">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'flight', label: 'Vol' },
                  { id: 'systems', label: 'Systèmes' },
                  { id: 'hud', label: 'HUD/Nav' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDeckCategory(tab.id)}
                  className={`py-1.5 px-3 rounded-lg font-medium transition ${
                    deckCategory === tab.id
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Barre de Recherche rapide */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer commande, touche ou phrase..."
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grille Scrollable des Commandes Cockpit */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-2.5 custom-scrollbar min-h-0">
            {filteredMacros.length === 0 ? (
              <div className="col-span-full text-center py-12 text-xs text-slate-500">
                Aucune commande ne correspond à cette recherche.
              </div>
            ) : (
              filteredMacros.map((macro) => {
                const isTriggered = deckFeedbackKey === macro.id;
                const isHold = macro.pressType === 'hold';

                return (
                  <button
                    key={macro.id}
                    type="button"
                    onClick={() => onTriggerMacro && onTriggerMacro(macro)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 relative overflow-hidden group select-none ${
                      isTriggered
                        ? 'bg-cyan-500/30 border-cyan-400 scale-[0.98] shadow-lg shadow-cyan-500/25'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800/80 hover:border-cyan-500/40'
                    }`}
                  >
                    {isTriggered && (
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent animate-pulse" />
                    )}

                    <div className="flex items-center justify-between relative z-10">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-white truncate">
                        {macro.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {isHold && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-500/30 text-[9px] font-mono text-purple-300">
                            {macro.holdDuration || 1.5}s
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300 uppercase shadow-sm">
                          {macro.key}
                        </span>
                      </div>
                    </div>

                    {macro.phrases && macro.phrases[0] && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-slate-300 mt-1.5 relative z-10 truncate">
                        <span className="text-cyan-400">🎙️</span>
                        <span className="truncate">« {macro.phrases[0]} »</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Astuce vocale en bas de liste */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span className="truncate">
              💡 <span className="text-cyan-300 font-medium">Ordres combinés :</span> Dites
              par exemple « Allume les phares et rentre le train » pour déclencher les deux simultanément.
            </span>
            <span className="text-cyan-400 font-mono shrink-0 ml-2">DirectInput</span>
          </div>
        </main>
      )}

      {/* ZONE DE SAISIE DE COMMANDE / QUESTION RAPIDE (max-w-4xl) */}
      <div className="w-full max-w-4xl px-1 pt-2 pb-1 shrink-0">
        {isVisionActive && activeTab === 'call' && (
          <div className="flex items-center justify-center mb-2">
            <button
              type="button"
              onClick={() =>
                onSendMessage("Que vois-tu à l'écran ? Fais-moi un point de situation rapide.")
              }
              disabled={callState === 'thinking'}
              className="text-xs px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>« Que vois-tu à l&apos;écran ? »</span>
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 shadow-xl focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 transition"
        >
          <button
            type="button"
            onClick={handlePaste}
            title="Coller un texte ou un lien du presse-papier"
            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Taper un message ou un ordre pour le copilote..."
            disabled={callState === 'thinking'}
            className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 min-w-0 font-sans"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || callState === 'thinking'}
            title="Envoyer"
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white font-semibold transition active:scale-95 flex items-center justify-center gap-1 shrink-0 shadow-md shadow-cyan-600/30"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Envoyer</span>
          </button>
        </form>
      </div>

      {/* BOUTONS D'ACTION INFÉRIEURS (PUPITRE DE COMMANDE VOCALE) */}
      <footer className="w-full max-w-sm flex items-center justify-center gap-6 sm:gap-8 pt-2 pb-2 shrink-0">
        {/* Bouton Mute / Silencieux */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex flex-col items-center gap-1.5 text-xs transition active:scale-95 ${
              isMuted ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Réactiver la voix du compagnon' : 'Couper la voix du compagnon (Mode muet / écrit uniquement)'}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-xl ${
                isMuted
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-500/30 ring-2 ring-amber-500/40'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
            </div>
            <span className="font-semibold text-xs">
              {isMuted ? 'Muet (ON)' : 'Son (Actif)'}
            </span>
          </button>
        )}

        {/* Bouton Interrompre si le robot parle */}
        {callState === 'speaking' && (
          <button
            onClick={onInterrupt}
            className="flex flex-col items-center gap-1.5 text-xs text-slate-300 hover:text-white transition active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-rose-400 shadow-xl">
              <Square className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs">Couper IA</span>
          </button>
        )}

        {/* Bouton Raccrocher */}
        <button
          onClick={onClose}
          className="flex flex-col items-center gap-1.5 text-xs text-rose-300 hover:text-white transition active:scale-95"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 flex items-center justify-center text-white shadow-2xl shadow-rose-600/40 border border-rose-400/40">
            <PhoneOff className="w-7 h-7" />
          </div>
          <span className="font-bold text-xs tracking-wide">Raccrocher</span>
        </button>
      </footer>
    </div>
  );
};
