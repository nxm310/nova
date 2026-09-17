'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Coins,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { storage } from '@/lib/storage';

export interface TelemetryData {
  prompt_tokens: number;
  candidate_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_eur: number;
  tokens_per_sec: number;
  session_duration_sec: number;
  status: string;
  last_action?: string | null;
  timestamp?: number;
}

interface TelemetryWidgetProps {
  localPromptTokens?: number;
  localCandidateTokens?: number;
  className?: string;
  compactOnly?: boolean;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({
  localPromptTokens = 0,
  localCandidateTokens = 0,
  className = '',
  compactOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localStored, setLocalStored] = useState<{
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
  }>({ promptTokens: 0, candidateTokens: 0, totalTokens: 0 });

  const [data, setData] = useState<TelemetryData>({
    prompt_tokens: 0,
    candidate_tokens: 0,
    total_tokens: 0,
    cost_usd: 0.0,
    cost_eur: 0.0,
    tokens_per_sec: 0.0,
    session_duration_sec: 0.0,
    status: 'idle',
    last_action: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Charger la télémétrie locale initiale et écouter les mises à jour
  useEffect(() => {
    setLocalStored(storage.getTelemetry());

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setLocalStored(e.detail);
      } else {
        setLocalStored(storage.getTelemetry());
      }
    };

    window.addEventListener('ami_tokens_updated', handleUpdate);
    return () => {
      window.removeEventListener('ami_tokens_updated', handleUpdate);
    };
  }, []);

  // Fermer le popup au clic à l'extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Connexion au WebSocket de télémétrie du copilote Python (ws://localhost:5006/telemetry/ws)
  useEffect(() => {
    let unmounted = false;

    const connectWebSocket = () => {
      if (unmounted) return;
      try {
        const ws = new WebSocket('ws://localhost:5006/telemetry/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          if (!unmounted) {
            setIsConnected(true);
          }
        };

        ws.onmessage = (event) => {
          if (!unmounted) {
            try {
              const parsed = JSON.parse(event.data);
              setData(parsed);
            } catch {}
          }
        };

        ws.onerror = () => {
          if (!unmounted) {
            setIsConnected(false);
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            setIsConnected(false);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch {
        if (!unmounted) {
          setIsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Calcul combiné : données du copilote Python ou stockage web local
  const combinedPromptTokens = isConnected
    ? data.prompt_tokens
    : Math.max(data.prompt_tokens, localStored.promptTokens + localPromptTokens);

  const combinedCandidateTokens = isConnected
    ? data.candidate_tokens
    : Math.max(data.candidate_tokens, localStored.candidateTokens + localCandidateTokens);

  const displayTokens = isConnected
    ? data.total_tokens
    : combinedPromptTokens + combinedCandidateTokens;

  // Calcul financier ($0.75 / 1M prompt, $3.75 / 1M candidate, taux 0.92 €/$)
  const displayCostUSD = isConnected
    ? data.cost_usd
    : (combinedPromptTokens / 1_000_000) * 0.75 + (combinedCandidateTokens / 1_000_000) * 3.75;

  const displayCostEUR = isConnected
    ? data.cost_eur
    : displayCostUSD * 0.92;

  const handleReset = async () => {
    storage.resetTelemetry();
    setLocalStored({ promptTokens: 0, candidateTokens: 0, totalTokens: 0 });
    setData((prev) => ({
      ...prev,
      prompt_tokens: 0,
      candidate_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      cost_eur: 0,
      tokens_per_sec: 0,
    }));
    try {
      await fetch('http://localhost:5006/telemetry/reset', { method: 'POST' }).catch(() => {});
    } catch {}
  };

  const statusColor =
    data.status === 'speaking'
      ? 'bg-purple-400 animate-pulse'
      : data.status === 'listening'
      ? 'bg-cyan-400 animate-ping'
      : isConnected
      ? 'bg-emerald-400'
      : 'bg-amber-400';

  const statusLabel =
    data.status === 'speaking'
      ? 'IA Parle...'
      : data.status === 'listening'
      ? 'Écoute Live'
      : data.status === 'executing_action'
      ? 'Action Star Citizen'
      : isConnected
      ? 'Copilote 3.8 Connecté'
      : 'Calculateur Prêt';

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Bouton / Badge Compact avec hauteur uniforme h-9 */}
      <button
        type="button"
        onClick={() => !compactOnly && setIsOpen(!isOpen)}
        className={`h-9 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl border text-xs font-mono transition-all duration-200 shadow-sm active:scale-95 ${
          isOpen
            ? 'bg-slate-900 border-cyan-400 text-cyan-200 ring-1 ring-cyan-500/40 shadow-cyan-500/10'
            : isConnected
            ? 'bg-slate-900/90 hover:bg-slate-800 border-emerald-500/40 text-slate-200 hover:border-emerald-400'
            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:border-cyan-500/40'
        }`}
        title="Cliquer pour voir la télémétrie des tokens et le coût réel d'utilisation (Gemini Live 3.8)"
      >
        {/* Indicateur de statut */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
        </span>

        {/* Compteur Tokens */}
        <div className="flex items-center gap-1 shrink-0">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-[11px] text-white">
            {displayTokens > 9999 ? `${(displayTokens / 1000).toFixed(1)}k` : displayTokens.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-normal hidden xs:inline">tok</span>
        </div>

        <span className="text-slate-600 hidden xs:inline">•</span>

        {/* Coût Financier Réel */}
        <div className="flex items-center gap-1 shrink-0">
          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300 font-bold">
            ${displayCostUSD < 0.01 && displayCostUSD > 0 ? displayCostUSD.toFixed(4) : displayCostUSD.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            ({displayCostEUR.toFixed(3)}€)
          </span>
        </div>

        {!compactOnly && (
          <span className="text-slate-400 pl-0.5 hidden xs:inline">
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        )}
      </button>

      {/* Volet Détails HUD Déroulant */}
      {isOpen && !compactOnly && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-3.5 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl animate-fade-in text-xs font-sans z-50">
          {/* Header HUD */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Télémétrie Gemini 3.8 LIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                {statusLabel}
              </span>
              <button
                type="button"
                onClick={handleReset}
                title="Remettre à zéro les compteurs"
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grille des Tokens */}
          <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase">Entrée Prompt/Audio</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">
                {combinedPromptTokens.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">$0.75 / 1M tokens</div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase">Sortie Voix/Modèle</div>
              <div className="text-sm font-bold text-purple-300 mt-0.5">
                {combinedCandidateTokens.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">$3.75 / 1M tokens</div>
            </div>
          </div>

          {/* Coût Réel Cumulé */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900/80 border border-amber-500/30 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Coût Réel d&apos;Utilisation
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {data.tokens_per_sec > 0 ? `${data.tokens_per_sec} tok/s` : 'Temps réel'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-base font-bold text-amber-300">
                ${displayCostUSD.toFixed(5)}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                ≈ {displayCostEUR.toFixed(5)} €
              </span>
            </div>
          </div>

          {/* Dernière action Star Citizen exécutée */}
          {data.last_action && (
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-cyan-200 truncate">{data.last_action}</span>
            </div>
          )}

          {/* Footer d'info */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Modèle : gemini-3.8-live</span>
            </span>
            <span className="font-mono text-slate-500">
              {isConnected ? 'Copilote Python Actif' : 'Calculateur Web Prêt'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
