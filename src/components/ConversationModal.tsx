'use client';

import React, { useState, useRef, useMemo } from 'react';
import { CompanionProfile } from '@/types/companion';
import { VoiceMacro, getMacroCategory, MacroCategory } from '@/lib/voiceMacros';
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-xl p-3 sm:p-5 text-white animate-fade-in safe-top safe-bottom overflow-hidden">
      {/* Top bar (En-tête avec bouton/onglet Commandes Vaisseau) */}
      <header
        className={`w-full flex items-center justify-between transition-all duration-300 ${
          activeTab === 'deck' ? 'max-w-2xl' : 'max-w-md'
        } pt-1 pb-1.5`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 hidden sm:inline">
            Appel Direct Mains-Libres
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 sm:hidden">
            Appel Direct
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bouton / Onglet Commandes Vaisseau */}
          {enabledMacros.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'deck' ? 'call' : 'deck')}
              className={`h-8 px-2.5 rounded-xl border text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5 ${
                activeTab === 'deck'
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={
                activeTab === 'deck'
                  ? "Revenir à l'appel vocal"
                  : 'Ouvrir toutes les commandes vaisseau Star Citizen'
              }
            >
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Commandes Vaisseau</span>
              <span className="sm:hidden">Commandes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/90 font-mono text-cyan-400 border border-slate-700/80">
                {enabledMacros.length}
              </span>
            </button>
          )}

          {/* Bouton Mute */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              type="button"
              className={`text-xs px-2.5 py-1 h-8 rounded-xl border flex items-center gap-1.5 transition-all ${
                isMuted
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
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
              <span className="hidden sm:inline">{isMuted ? 'Muet' : 'Voix ON'}</span>
            </button>
          )}

          {/* Bouton Vision */}
          {onToggleVision && (
            <button
              onClick={onToggleVision}
              type="button"
              className={`text-xs px-2.5 py-1 h-8 rounded-xl border flex items-center gap-1.5 transition-all ${
                isVisionActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
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
              <span className="hidden sm:inline">
                {isVisionActive ? 'Vision ON' : 'Vision OFF'}
              </span>
            </button>
          )}

          {/* Profil */}
          <div className="text-xs px-2.5 py-1 h-8 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent-400 shrink-0" />
            <span className="truncate max-w-[80px]">{profile.name}</span>
          </div>

          {/* Bouton Paramètres */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-1.5 sm:p-2 h-8 w-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 flex items-center justify-center shrink-0"
              title="Paramètres du compagnon"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Barre d'onglets de navigation (Appel & Voix | Commandes Vaisseau) */}
      <div
        className={`w-full transition-all duration-300 ${
          activeTab === 'deck' ? 'max-w-2xl' : 'max-w-md'
        } flex items-center justify-center pt-0.5 pb-2`}
      >
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/85 border border-slate-800/90 text-xs w-full max-w-xs sm:max-w-sm shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('call')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'call'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Appel & Voix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deck')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'deck'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Commandes ({enabledMacros.length})</span>
          </button>
        </div>
      </div>

      {/* ZONE CENTRALE : SOIT VUE APPEL VOCAL, SOIT VUE COMMANDES VAISSEAU */}
      {activeTab === 'call' ? (
        /* VUE 1 : APPEL VOCAL & AVATAR */
        <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center my-auto py-2 space-y-4 overflow-y-auto">
          {/* Animated Avatar */}
          <div className="relative flex items-center justify-center pt-2">
            {/* Pulsing Aura */}
            <div
              className={`absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full transition-all duration-700 ${
                callState === 'speaking'
                  ? 'bg-accent-500/25 scale-125 animate-pulse'
                  : callState === 'listening'
                  ? 'bg-cyan-500/25 scale-110 animate-pulse'
                  : 'bg-indigo-500/15 scale-100'
              } blur-xl`}
            />

            {/* Avatar Ring */}
            <div
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-4xl sm:text-5xl bg-slate-900 border-2 transition-all duration-500 shadow-2xl ${
                callState === 'speaking'
                  ? 'border-accent-400 ring-4 ring-accent-500/30 shadow-accent-500/30'
                  : callState === 'listening'
                  ? 'border-cyan-400 ring-4 ring-cyan-500/30 shadow-cyan-500/30'
                  : 'border-slate-700'
              }`}
            >
              {profile.avatar}

              {/* Status Pill Badge */}
              <div
                className={`absolute -bottom-2.5 px-3 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-lg whitespace-nowrap transition-colors ${
                  callState === 'speaking'
                    ? 'bg-accent-600 text-white'
                    : callState === 'listening'
                    ? isMuted
                      ? 'bg-amber-600 text-white shadow-amber-500/20'
                      : 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {callState === 'speaking' && (
                  <>
                    <Volume2 className="w-3 h-3 animate-bounce" />
                    <span>{profile.name} parle...</span>
                  </>
                )}
                {callState === 'listening' && (
                  <>
                    <Mic className="w-3 h-3 animate-pulse" />
                    <span>{isMuted ? "Je t'écoute (muet)..." : "Je t'écoute..."}</span>
                  </>
                )}
                {callState === 'thinking' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Réflexion...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badge d'indication mode muet */}
          {isMuted && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm animate-fade-in">
              <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Mode Silencieux : {profile.name} répond uniquement par écrit</span>
            </div>
          )}

          {/* Live User Speech Indicator */}
          <div className="w-full min-h-[36px] flex items-center justify-center px-3 text-center">
            {callState === 'listening' && (
              <p className="text-sm sm:text-base font-medium text-cyan-200 leading-snug animate-fade-in transition-all">
                {liveTranscript ? (
                  <span className="bg-cyan-950/70 border border-cyan-800/80 px-3 py-1.5 rounded-xl inline-block">
                    « {liveTranscript} »
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs sm:text-sm">
                    Parle librement, je t&apos;entends...
                  </span>
                )}
              </p>
            )}

            {callState === 'thinking' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-400" />
                <span>{profile.name} formule sa réponse...</span>
              </div>
            )}
          </div>

          {/* AFFICHAGE PERMANENT DE LA DERNIÈRE RÉPONSE */}
          {lastReply && (
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl text-left animate-fade-in transition-all">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent-400">
                  <span className="text-base">{profile.avatar}</span>
                  <span>Dernière réponse de {profile.name}</span>
                </div>
                {callState === 'speaking' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 animate-pulse">
                    En train de parler
                  </span>
                )}
              </div>

              <div className="text-sm sm:text-base text-slate-100 leading-relaxed max-h-36 sm:max-h-48 overflow-y-auto whitespace-pre-wrap select-text pr-1">
                {lastReply}
              </div>
            </div>
          )}
        </main>
      ) : (
        /* VUE 2 : TOUTES LES COMMANDES VAISSEAU (COCKPIT TOUCH DECK EN DIRECT) */
        <main className="flex-1 w-full max-w-2xl flex flex-col my-auto py-1 px-1 sm:px-2 overflow-hidden">
          {/* Mini-Bannière d'État d'Appel Actif */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs mb-2.5 shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-sm shrink-0">
                <span>{profile.avatar}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                    callState === 'speaking'
                      ? 'bg-accent-400 animate-ping'
                      : callState === 'listening'
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white truncate text-[11px]">
                    {profile.name} en direct
                  </span>
                  <span className="text-[10px] text-cyan-300">
                    {callState === 'speaking'
                      ? '• Parle...'
                      : callState === 'listening'
                      ? '• Écoute active'
                      : '• En attente'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-200 truncate">
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
              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition active:scale-95"
            >
              Vue Appel
            </button>
          </div>

          {/* Filtres Catégories & Recherche */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 shrink-0">
            {/* Filtres catégories */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 shrink-0">
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
                  className={`py-1 px-2.5 rounded-lg font-medium transition ${
                    deckCategory === tab.id
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Barre de Recherche rapide */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer commande, touche ou phrase..."
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grille Scrollable des Commandes Cockpit */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 custom-scrollbar min-h-0">
            {filteredMacros.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-xs text-slate-500">
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
                    className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 relative overflow-hidden group select-none ${
                      isTriggered
                        ? 'bg-cyan-500/30 border-cyan-400 scale-[0.98] shadow-lg shadow-cyan-500/25'
                        : 'bg-slate-900/75 hover:bg-slate-800/85 border-slate-800/80 hover:border-cyan-500/40'
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
                          <span className="px-1 py-0.2 rounded bg-purple-500/20 border border-purple-500/30 text-[9px] font-mono text-purple-300">
                            {macro.holdDuration || 1.5}s
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 uppercase shadow-sm">
                          {macro.key}
                        </span>
                      </div>
                    </div>

                    {macro.phrases && macro.phrases[0] && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-slate-300 mt-1 relative z-10 truncate">
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
          <div className="mt-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
            <span className="truncate">
              💡 <span className="text-cyan-300 font-medium">Multi-actions :</span> Vous pouvez
              dicter plusieurs ordres à la fois (ex: « Allume les phares et sors le train »).
            </span>
            <span className="text-cyan-400 font-mono shrink-0 ml-2">DirectInput</span>
          </div>
        </main>
      )}

      {/* Zone de saisie texte ou lien */}
      <div
        className={`w-full transition-all duration-300 ${
          activeTab === 'deck' ? 'max-w-2xl' : 'max-w-md'
        } px-2 pt-1 pb-1.5`}
      >
        {isVisionActive && activeTab === 'call' && (
          <div className="flex items-center justify-center mb-2">
            <button
              type="button"
              onClick={() =>
                onSendMessage("Que vois-tu à l'écran ? Fais-moi un point de situation rapide.")
              }
              disabled={callState === 'thinking'}
              className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>« Que vois-tu à l&apos;écran ? »</span>
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1.5 shadow-lg focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500/40 transition"
        >
          <button
            type="button"
            onClick={handlePaste}
            title="Coller un texte ou un lien du presse-papier"
            className="p-2 rounded-xl text-slate-400 hover:text-accent-400 hover:bg-slate-800/80 active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Taper un message ou un ordre..."
            disabled={callState === 'thinking'}
            className="flex-1 bg-transparent px-2 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 min-w-0"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || callState === 'thinking'}
            title="Envoyer"
            className="p-2 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-30 disabled:hover:bg-accent-600 text-white transition active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Bottom Controls */}
      <footer className="w-full max-w-xs flex items-center justify-center gap-5 sm:gap-6 pt-1 pb-2">
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
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all shadow-lg ${
                isMuted
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-500/30 ring-2 ring-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />}
            </div>
            <span className="font-medium text-[11px] sm:text-xs">
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-red-400 shadow-md">
              <Square className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-medium text-[11px] sm:text-xs">Couper</span>
          </button>
        )}

        {/* Bouton Raccrocher */}
        <button
          onClick={onClose}
          className="flex flex-col items-center gap-1.5 text-xs text-red-300 hover:text-white transition active:scale-95"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-600/30">
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <span className="font-medium text-[11px] sm:text-xs">Raccrocher</span>
        </button>
      </footer>
    </div>
  );
};
