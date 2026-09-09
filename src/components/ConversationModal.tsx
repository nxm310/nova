'use client';

import React, { useState, useRef } from 'react';
import { CompanionProfile } from '@/types/companion';
import {
  PhoneOff,
  Mic,
  Volume2,
  Loader2,
  Square,
  Sparkles,
  Send,
  Clipboard,
  Link2,
  Eye,
  EyeOff,
  Settings,
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
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-xl p-4 sm:p-6 text-white animate-fade-in safe-top safe-bottom overflow-hidden">
      {/* Top bar */}
      <header className="w-full flex items-center justify-between max-w-md pt-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Appel Direct Mains-Libres
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onToggleVision && (
            <button
              onClick={onToggleVision}
              type="button"
              className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
                isVisionActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={isVisionActive ? 'Désactiver la vision écran' : 'Activer le partage d’écran pour la vision IA'}
            >
              {isVisionActive ? (
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">{isVisionActive ? 'Vision ON' : 'Vision OFF'}</span>
            </button>
          )}
          <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent-400" />
            <span>{profile.name}</span>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95"
              title="Paramètres du compagnon"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Center Area */}
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
                  ? 'bg-cyan-600 text-white'
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
                  <span>Je t'écoute...</span>
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
                  Parle librement, je t'entends...
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

      {/* Zone de saisie texte ou lien */}
      <div className="w-full max-w-md px-2 pt-1 pb-2">
        {isVisionActive && (
          <div className="flex items-center justify-center mb-2">
            <button
              type="button"
              onClick={() => onSendMessage("Que vois-tu à l'écran ? Fais-moi un point de situation rapide.")}
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
            placeholder="Taper un message ou coller un lien..."
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
      <footer className="w-full max-w-xs flex items-center justify-center gap-6 pt-1 pb-2">
        {/* Bouton Interrompre si le robot parle */}
        {callState === 'speaking' && (
          <button
            onClick={onInterrupt}
            className="flex flex-col items-center gap-1.5 text-xs text-slate-300 hover:text-white transition active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-red-400 shadow-md">
              <Square className="w-4 h-4" />
            </div>
            <span>Couper</span>
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
          <span className="font-medium">Raccrocher</span>
        </button>
      </footer>
    </div>
  );
};
