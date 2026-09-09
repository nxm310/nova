'use client';

import React, { useState, useEffect } from 'react';
import {
  CompanionProfile,
  VoiceProvider,
  PersonalityPresetId,
  MemoryItem,
} from '@/types/companion';
import {
  PERSONALITY_PRESETS,
  EDGE_VOICES,
  GEMINI_VOICES,
  AVATAR_OPTIONS,
} from '@/lib/constants';
import { storage } from '@/lib/storage';
import { audioManager } from '@/lib/audio';
import {
  X,
  User,
  Volume2,
  Brain,
  Key,
  Play,
  Square,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  Radio,
} from 'lucide-react';
import { macroManager, VoiceMacro, DEFAULT_VOICE_MACROS } from '@/lib/voiceMacros';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanionProfile;
  onSaveProfile: (newProfile: CompanionProfile) => void;
  memories: MemoryItem[];
  onUpdateMemories: (newMemories: MemoryItem[]) => void;
  onClearHistory: () => void;
}

type TabType = 'character' | 'voice' | 'memory' | 'api' | 'macros';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  memories,
  onUpdateMemories,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('character');
  const [formData, setFormData] = useState<CompanionProfile>(profile);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [newMemoryInput, setNewMemoryInput] = useState<string>('');
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Macros & Pont Clavier
  const [macros, setMacros] = useState<VoiceMacro[]>([]);
  const [bridgeUrl, setBridgeUrl] = useState<string>('http://192.168.50.34:5005');
  const [bridgeTesting, setBridgeTesting] = useState<boolean>(false);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);

  // Formulaire nouvelle macro
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroKey, setNewMacroKey] = useState('');
  const [newMacroPhrases, setNewMacroPhrases] = useState('');
  const [newMacroReply, setNewMacroReply] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setApiKey(storage.getApiKey());
      audioManager.getWebSpeechVoices().then((v) => setWebVoices(v));
      setMacros(macroManager.getMacros());
      setBridgeUrl(macroManager.getBridgeUrl());
      setBridgeStatus(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    storage.saveApiKey(apiKey);
    macroManager.saveMacros(macros);
    macroManager.setBridgeUrl(bridgeUrl);
    onSaveProfile(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleTestBridge = async () => {
    setBridgeTesting(true);
    setBridgeStatus(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(bridgeUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setBridgeStatus('connecté');
      } else {
        setBridgeStatus('erreur');
      }
    } catch {
      setBridgeStatus('inaccessible');
    } finally {
      setBridgeTesting(false);
    }
  };

  const handleAddCustomMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroName.trim() || !newMacroKey.trim() || !newMacroPhrases.trim()) return;

    const phrases = newMacroPhrases
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const newM: VoiceMacro = {
      id: 'macro_' + Date.now(),
      name: newMacroName.trim(),
      key: newMacroKey.trim().toLowerCase(),
      phrases: phrases.length > 0 ? phrases : [newMacroName.trim().toLowerCase()],
      confirmation: newMacroReply.trim() || `Commande ${newMacroName.trim()} exécutée.`,
      enabled: true,
    };

    const updated = [...macros, newM];
    setMacros(updated);
    macroManager.saveMacros(updated);

    setNewMacroName('');
    setNewMacroKey('');
    setNewMacroPhrases('');
    setNewMacroReply('');
  };

  const handleDeleteMacro = (id: string) => {
    const updated = macros.filter((m) => m.id !== id);
    setMacros(updated);
    macroManager.saveMacros(updated);
  };

  const handleToggleMacro = (id: string) => {
    const updated = macros.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
    setMacros(updated);
    macroManager.saveMacros(updated);
  };

  const handleResetDefaultMacros = () => {
    if (confirm('Rétablir les macros par défaut de Star Citizen (Train N, Quantum B, Phares L, Armes P, etc.) ?')) {
      setMacros(DEFAULT_VOICE_MACROS);
      macroManager.saveMacros(DEFAULT_VOICE_MACROS);
    }
  };

  const handleTestVoice = async () => {
    if (isPlayingTest) {
      audioManager.stopAll();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const testText = `Salut ! C'est ${formData.name}. Je suis ravi de discuter avec toi !`;

    if (formData.voiceProvider === 'webspeech') {
      audioManager.speakWebSpeech(testText, {
        voiceURI: formData.webSpeechVoiceURI,
        rate: formData.speechRate,
        pitch: formData.robotEffect ? 1.35 : 1.0,
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      });
    } else if (formData.voiceProvider === 'edge') {
      try {
        const res = await fetch('/api/tts/edge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testText,
            voice: formData.edgeVoice,
            rate: formData.speechRate,
            pitch: formData.pitch || '+0Hz',
          }),
        });
        if (!res.ok) throw new Error('Erreur synthèse Edge');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioManager.playAudioStream(
          url,
          () => setIsPlayingTest(true),
          () => setIsPlayingTest(false),
          () => setIsPlayingTest(false),
          { robotEffect: formData.robotEffect }
        );
      } catch (err) {
        console.error(err);
        setIsPlayingTest(false);
        alert('Impossible de jouer la voix Edge-TTS.');
      }
    } else if (formData.voiceProvider === 'gemini') {
      const currentKey = apiKey || storage.getApiKey();
      if (!currentKey) {
        alert('Renseigne ta clé API Gemini dans l\'onglet "Clé API" pour tester la voix Gemini.');
        setIsPlayingTest(false);
        return;
      }
      try {
        const res = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testText,
            voice: formData.geminiVoice,
            apiKey: currentKey,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur Gemini Audio');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioManager.playAudioStream(
          url,
          () => setIsPlayingTest(true),
          () => setIsPlayingTest(false),
          () => setIsPlayingTest(false),
          { robotEffect: formData.robotEffect }
        );
      } catch (err: any) {
        console.error(err);
        setIsPlayingTest(false);
        alert('Erreur voix Gemini: ' + err.message);
      }
    }
  };

  const handleAddMemory = () => {
    if (!newMemoryInput.trim()) return;
    const added = storage.addMemory(newMemoryInput.trim());
    onUpdateMemories([...memories, added]);
    setNewMemoryInput('');
  };

  const handleDeleteMemory = (id: string) => {
    storage.deleteMemory(id);
    onUpdateMemories(memories.filter((m) => m.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90dvh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>⚙️</span> Paramètres de ton Compagnon
          </h2>
          <button
            onClick={() => {
              audioManager.stopAll();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('character')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'character'
                ? 'border-accent-500 text-accent-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Caractère
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-accent-500 text-accent-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Voix & Audio
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'memory'
                ? 'border-accent-500 text-accent-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            Mémoire ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-accent-500 text-accent-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Clé API
          </button>
          <button
            onClick={() => setActiveTab('macros')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'macros'
                ? 'border-accent-500 text-cyan-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            Touches Star Citizen ({macros.filter((m) => m.enabled).length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: CARACTÈRE */}
          {activeTab === 'character' && (
            <div className="space-y-4 animate-fade-in">
              {/* Prénom & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Prénom du compagnon
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
                    placeholder="Ex: Léo, Maya, Aria..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Avatar
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: emoji })}
                        className={`text-xl p-1.5 rounded-lg border transition ${
                          formData.avatar === emoji
                            ? 'border-accent-500 bg-accent-500/20 scale-110'
                            : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Type de caractère (Presets) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Personnalité & Humeur
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONALITY_PRESETS.map((p) => {
                    const isSelected = formData.presetId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setFormData({ ...formData, presetId: p.id })}
                        className={`cursor-pointer p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-accent-500 bg-accent-950/30 ring-1 ring-accent-500'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{p.emoji}</span>
                          <span className="font-semibold text-sm text-slate-200">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions en arrière-plan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Instructions d'arrière-plan (system instruction)
                  </label>
                  <span className="text-[11px] text-accent-400 font-mono">Custom Prompt</span>
                </div>
                <p className="text-xs text-slate-400 mb-1.5">
                  Précise ses manies, expressions préférées, sujets favoris ou règles de conversation.
                </p>
                <textarea
                  rows={3}
                  value={formData.customInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, customInstructions: e.target.value })
                  }
                  placeholder="Ex: Utilise parfois des expressions québécoises, aime parler de cinéma, ne me donne pas de leçons de morale..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-xs sm:text-sm font-sans"
                />
              </div>

              {/* Ce qu'il sait sur toi */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Ce que ton compagnon sait de toi (Contexte initial)
                </label>
                <textarea
                  rows={2}
                  value={formData.userContext}
                  onChange={(e) => setFormData({ ...formData, userContext: e.target.value })}
                  placeholder="Ex: Je m'appelle Alex, j'ai 28 ans, développeur web, passionné de musique..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-xs sm:text-sm"
                />
              </div>

              {/* Recherche Web en direct */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <span>🌐</span> Recherche Web en direct (Google Search)
                  </div>
                  <div className="text-xs text-slate-400">
                    Vérifie les actualités, sorties tech récentes et informations sur Internet
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, webSearch: formData.webSearch === false ? true : false })
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    formData.webSearch !== false ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VOIX & AUDIO */}
          {activeTab === 'voice' && (
            <div className="space-y-4 animate-fade-in">
              {/* Choix du moteur de voix */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Moteur de synthèse vocale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Edge TTS */}
                  <div
                    onClick={() => setFormData({ ...formData, voiceProvider: 'edge' })}
                    className={`cursor-pointer p-3 rounded-xl border transition ${
                      formData.voiceProvider === 'edge'
                        ? 'border-accent-500 bg-accent-950/30 ring-1 ring-accent-500'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">Edge-TTS</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                        Gratuit
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Voix neurales françaises de haute fidélité (Henri, Denise...). Aucun compte requis.
                    </p>
                  </div>

                  {/* Gemini Audio */}
                  <div
                    onClick={() => setFormData({ ...formData, voiceProvider: 'gemini' })}
                    className={`cursor-pointer p-3 rounded-xl border transition ${
                      formData.voiceProvider === 'gemini'
                        ? 'border-accent-500 bg-accent-950/30 ring-1 ring-accent-500'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">Gemini Audio</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                        Natif
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Voix natives Google Gemini 2.0 (Puck, Aoede...). Expressivité et émotions directes.
                    </p>
                  </div>

                  {/* Web Speech */}
                  <div
                    onClick={() => setFormData({ ...formData, voiceProvider: 'webspeech' })}
                    className={`cursor-pointer p-3 rounded-xl border transition ${
                      formData.voiceProvider === 'webspeech'
                        ? 'border-accent-500 bg-accent-950/30 ring-1 ring-accent-500'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">Web Speech</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                        0 Latence
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Voix système de ton téléphone / navigateur (Siri sur iPhone). 100% local.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sélection de la voix spécifique */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Timbre et Voix
                </label>

                {formData.voiceProvider === 'edge' && (
                  <select
                    value={formData.edgeVoice}
                    onChange={(e) => setFormData({ ...formData, edgeVoice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent-500"
                  >
                    {EDGE_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}

                {formData.voiceProvider === 'gemini' && (
                  <select
                    value={formData.geminiVoice}
                    onChange={(e) =>
                      setFormData({ ...formData, geminiVoice: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent-500"
                  >
                    {GEMINI_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}

                {formData.voiceProvider === 'webspeech' && (
                  <select
                    value={formData.webSpeechVoiceURI || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, webSpeechVoiceURI: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent-500"
                  >
                    <option value="">Voix française par défaut du système</option>
                    {webVoices
                      .filter((v) => v.lang.startsWith('fr') || v.lang.startsWith('en'))
                      .map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                  </select>
                )}

                {/* Vitesse de parole */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Vitesse de diction</span>
                    <span className="font-mono text-accent-400 font-semibold">{formData.speechRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={formData.speechRate}
                    onChange={(e) =>
                      setFormData({ ...formData, speechRate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-accent-500"
                  />
                  {/* Boutons de vitesse rapide */}
                  <div className="flex gap-1.5 mt-2">
                    {[
                      { label: 'Calme (1.0x)', val: 1.0 },
                      { label: 'Fluide (1.25x)', val: 1.25 },
                      { label: 'Rapide (1.4x)', val: 1.4 },
                      { label: 'Express (1.6x)', val: 1.6 },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, speechRate: s.val })}
                        className={`flex-1 py-1 text-[10px] font-medium rounded-lg border transition ${
                          formData.speechRate === s.val
                            ? 'bg-accent-500/25 border-accent-400 text-accent-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tonalité & Pitch Robotique */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Tonalité synthétique (Pitch)</span>
                    <span className="font-mono text-accent-400">{formData.pitch || '+0Hz'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Naturelle', val: '+0Hz' },
                      { label: 'Synthétique (+12Hz)', val: '+12Hz' },
                      { label: 'GLaDOS / Cyber (+24Hz)', val: '+24Hz' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, pitch: p.val })}
                        className={`flex-1 py-1 text-[10px] font-medium rounded-lg border transition ${
                          (formData.pitch || '+0Hz') === p.val
                            ? 'bg-accent-500/25 border-accent-400 text-accent-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtre Métallique Robotique Sci-Fi */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>🤖</span> Effet Robotique Sci-Fi (Filtre Métallique)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Résonance métallique de gynoïde / IA de science-fiction
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, robotEffect: !formData.robotEffect })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      formData.robotEffect ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* Bouton Tester la voix */}
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
                >
                  {isPlayingTest ? (
                    <>
                      <Square className="w-4 h-4 text-red-400" />
                      Arrêter l'écoute
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-400" />
                      Écouter un extrait de la voix
                    </>
                  )}
                </button>
              </div>

              {/* Lecture automatique à chaque message */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Lecture vocale automatique
                  </div>
                  <div className="text-xs text-slate-400">
                    Prononcer automatiquement à voix haute chaque réponse reçue
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, autoPlayVoice: !formData.autoPlayVoice })
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    formData.autoPlayVoice ? 'bg-accent-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MÉMOIRE */}
          {activeTab === 'memory' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-medium text-slate-200">
                  Carnet de souvenirs de ton ami
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ces informations sont réinjectées à chaque message pour que ton ami se souvienne de toi au fil du temps.
                </p>
              </div>

              {/* Ajouter un fait */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMemory();
                  }}
                  placeholder="Ex: Aime voyager en Italie, prépare un marathon..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent-600 hover:bg-accent-500 rounded-xl text-sm font-medium text-white transition"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              {/* Liste des faits mémorisés */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memories.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Aucun souvenir enregistré pour le moment.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
                    >
                      <span className="text-slate-300 pr-2 leading-relaxed">
                        • {m.content}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CLÉ API & GESTION */}
          {activeTab === 'api' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Clé API Google Gemini (Google AI Studio)
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Ta clé est stockée uniquement sur ton téléphone / navigateur local. Elle n'est jamais transmise à un tiers.
                </p>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💡</span> Obtenir une clé gratuite :
                </div>
                Tu peux générer une clé API en 30 secondes sur{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline inline-flex items-center gap-0.5 hover:text-blue-200"
                >
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>{' '}
                avec ton compte Google (quota gratuit disponible).
              </div>

              {/* Effacer la conversation */}
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Zone de réinitialisation
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Voulez-vous vraiment effacer tout l\'historique de discussion ?')) {
                      onClearHistory();
                      alert('Historique effacé.');
                    }
                  }}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-medium text-red-300 transition"
                >
                  Effacer l'historique de discussion
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TOUCHES & MACROS VOCALES (STAR CITIZEN) */}
          {activeTab === 'macros' && (
            <div className="space-y-6 animate-fade-in text-slate-200">
              {/* Carte Pont Clavier PC */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-semibold text-sm text-white">
                      Pont Clavier PC (DirectInput)
                    </h3>
                  </div>
                  {bridgeStatus === 'connecté' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Connecté
                    </span>
                  )}
                  {bridgeStatus === 'inaccessible' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Inaccessible
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Permet à Ami de presser directement des touches physiques dans Star Citizen avec 0ms de latence dès que vous prononcez l&apos;ordre à la voix.
                </p>

                {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                      <span>⚠️ Navigation HTTPS détectée (github.io)</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-amber-200/90">
                      Les navigateurs interdisent à un site web distant sécurisé (HTTPS) de joindre directement votre PC en HTTP local (règle de sécurité Mixed Content).
                    </p>
                    <p className="leading-relaxed text-[11px] font-medium text-white">
                      👉 Pour que les touches fonctionnent dans votre jeu, ouvrez l&apos;application sur votre réseau local :{' '}
                      <span className="font-mono text-cyan-300">http://192.168.50.174:3000</span> (ou <span className="font-mono text-cyan-300">http://localhost:3000</span> sur le PC).
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://192.168.50.34:5005 ou http://localhost:5005"
                    className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestBridge}
                    disabled={bridgeTesting}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-300 transition shrink-0 flex items-center gap-1.5"
                  >
                    {bridgeTesting ? 'Test...' : 'Tester connexion'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await macroManager.sendKeyToBridge('u');
                      if (res.success) {
                        alert("✓ Touche 'U' (Démarrage vaisseau) envoyée avec succès au pont PC !");
                      } else {
                        alert("❌ Échec : le pont clavier n'a pas répondu. Vérifiez que LANCER_PONT_PC.bat tourne sur le PC.");
                      }
                    }}
                    className="px-3 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-300 transition shrink-0"
                    title="Envoie un appui sur la touche U pour tester le démarrage du vaisseau"
                  >
                    Tester touche [U]
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1">
                    <span>💡 Comment lancer le pont sur votre PC de jeu :</span>
                  </div>
                  <code className="block font-mono text-[10px] text-cyan-300 bg-black/40 p-1.5 rounded">
                    python scripts/bridge.py
                  </code>
                  <p className="text-[10px] text-slate-400">
                    Nécessite <code className="text-slate-300">pip install pydirectinput</code> pour que DirectX 11/12 dans Star Citizen reçoive les frappes.
                  </p>
                </div>
              </div>

              {/* Liste des Commandes Vocales Configurées */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Commandes vocales actives ({macros.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleResetDefaultMacros}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline transition"
                  >
                    Rétablir valeurs d&apos;origine
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {macros.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 ${
                        m.enabled
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-slate-950/30 border-slate-900 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMacro(m.id)}
                          className={`mt-0.5 px-2 py-1 rounded-lg font-mono text-xs font-bold uppercase transition shrink-0 ${
                            m.enabled
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                          title={m.enabled ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                        >
                          Touche [{m.key}]
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            {!m.enabled && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Désactivée)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            🗣️ {m.phrases.join(' • ')}
                          </div>
                          <div className="text-[11px] text-emerald-400/90 italic truncate mt-0.5">
                            « {m.confirmation} »
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMacro(m.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition shrink-0"
                        title="Supprimer cette commande"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulaire d'ajout d'une nouvelle commande vocale */}
              <form
                onSubmit={handleAddCustomMacro}
                className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3"
              >
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-accent-400" />
                  <span>Assigner une nouvelle touche à un ordre verbal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nom de la fonction
                    </label>
                    <input
                      type="text"
                      value={newMacroName}
                      onChange={(e) => setNewMacroName(e.target.value)}
                      placeholder="Ex: Train d'atterrissage, Phares..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Touche clavier à presser
                    </label>
                    <input
                      type="text"
                      value={newMacroKey}
                      onChange={(e) => setNewMacroKey(e.target.value)}
                      placeholder="Ex: n, b, l, p, c, k, space..."
                      maxLength={10}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-accent-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Phrases vocales déclencheuses (séparées par une virgule)
                  </label>
                  <input
                    type="text"
                    value={newMacroPhrases}
                    onChange={(e) => setNewMacroPhrases(e.target.value)}
                    placeholder="Ex: sort le train, rentre le train, atterrissage"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Réponse vocale de confirmation du compagnon
                  </label>
                  <input
                    type="text"
                    value={newMacroReply}
                    onChange={(e) => setNewMacroReply(e.target.value)}
                    placeholder="Ex: Train d'atterrissage actionné, Commandant."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newMacroName.trim() || !newMacroKey.trim() || !newMacroPhrases.trim()}
                  className="w-full py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:hover:bg-accent-600 text-white font-semibold rounded-xl text-xs transition active:scale-95 shadow-md shadow-accent-600/30"
                >
                  Ajouter cette commande vocale
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400">
            {saveToast && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enregistré avec succès !
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.stopAll();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-600/30 transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
