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
  Edit2,
  RotateCcw,
  HardDrive,
  Download,
  Upload,
  Zap,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { macroManager, VoiceMacro, DEFAULT_VOICE_MACROS } from '@/lib/voiceMacros';
import { geminiClient } from '@/lib/geminiClient';
import { APP_VERSION } from '@/lib/version';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanionProfile;
  onSaveProfile: (newProfile: CompanionProfile) => void;
  memories: MemoryItem[];
  onUpdateMemories: (newMemories: MemoryItem[]) => void;
  onClearHistory: () => void;
  onCheckUpdate?: () => void;
}

type TabType = 'character' | 'voice' | 'memory' | 'api' | 'macros' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  memories,
  onUpdateMemories,
  onClearHistory,
  onCheckUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('character');
  const [formData, setFormData] = useState<CompanionProfile>(profile);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [newMemoryInput, setNewMemoryInput] = useState<string>('');
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isTestingGeminiVoice, setIsTestingGeminiVoice] = useState(false);

  // Macros Vocales Star Citizen
  const [macros, setMacros] = useState<VoiceMacro[]>([]);
  const [bridgeUrl, setBridgeUrl] = useState<string>('');
  const [bridgeTesting, setBridgeTesting] = useState<boolean>(false);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);

  // Formulaire nouvelle macro
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroKey, setNewMacroKey] = useState('');
  const [newMacroPressType, setNewMacroPressType] = useState<'tap' | 'hold'>('tap');
  const [newMacroDuration, setNewMacroDuration] = useState<number>(1.5);
  const [newMacroTapDurationMs, setNewMacroTapDurationMs] = useState<number>(180);
  const [newMacroPhrases, setNewMacroPhrases] = useState('');
  const [newMacroReply, setNewMacroReply] = useState('');

  // Édition en place d'une macro existante (intégrée ou personnalisée)
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [editMacroName, setEditMacroName] = useState('');
  const [editMacroKey, setEditMacroKey] = useState('');
  const [editMacroPressType, setEditMacroPressType] = useState<'tap' | 'hold'>('tap');
  const [editMacroDuration, setEditMacroDuration] = useState<number>(1.5);
  const [editMacroTapDurationMs, setEditMacroTapDurationMs] = useState<number>(180);
  const [editMacroPhrases, setEditMacroPhrases] = useState<string>('');
  const [editMacroReply, setEditMacroReply] = useState<string>('');
  const [testKeyFeedbackId, setTestKeyFeedbackId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setApiKey(storage.getApiKey());
      audioManager.getWebSpeechVoices().then((v) => setWebVoices(v));
      setMacros(macroManager.getMacros());
      setBridgeUrl(macroManager.getBridgeUrl());
      setBridgeStatus(null);
      setEditingMacroId(null);
      setSyncStatus(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    storage.saveApiKey(apiKey);
    macroManager.saveMacros(macros);
    macroManager.setBridgeUrl(bridgeUrl);
    onSaveProfile(formData);
    storage.pushToBridge(bridgeUrl);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleExportBackup = () => {
    const config = storage.exportFullConfig();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nova_config_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = storage.importFullConfig(json);
        if (ok) {
          const newProf = storage.getProfile();
          setFormData(newProf);
          setApiKey(storage.getApiKey());
          setMacros(macroManager.getMacros());
          setBridgeUrl(macroManager.getBridgeUrl());
          onSaveProfile(newProf);
          storage.pushToBridge(macroManager.getBridgeUrl());
          alert('✓ Configuration importée et synchronisée avec succès !');
        } else {
          alert('Format de fichier invalide.');
        }
      } catch (err) {
        alert('Impossible de lire le fichier JSON de configuration.');
      }
    };
    reader.readAsText(file);
  };

  const handleManualSyncBridge = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await storage.pushToBridge(bridgeUrl);
      const res = await storage.syncWithBridge(bridgeUrl);
      if (res.config) {
        const newProf = storage.getProfile();
        setFormData(newProf);
        setApiKey(storage.getApiKey());
        setMacros(macroManager.getMacros());
        setBridgeUrl(macroManager.getBridgeUrl());
        onSaveProfile(newProf);
      }
      setSyncStatus('Fichier persistant synchronisé sur votre PC !');
    } catch {
      setSyncStatus('Erreur lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestBridge = async () => {
    setBridgeTesting(true);
    setBridgeStatus(null);
    try {
      const res = await macroManager.checkBridgeHealth();
      if (res.online) {
        if (res.url) {
          setBridgeUrl(res.url);
          macroManager.setBridgeUrl(res.url);
        }
        const adminTag = res.info?.isAdmin ? ' (Admin ✓)' : ' (Non-Admin ⚠️)';
        setBridgeStatus(`connecté${adminTag}`);
      } else {
        setBridgeStatus('inaccessible');
      }
    } catch {
      setBridgeStatus('inaccessible');
    } finally {
      setBridgeTesting(false);
    }
  };

  const appendModifier = (target: 'new' | 'edit', modifier: string) => {
    if (target === 'new') {
      const cur = newMacroKey.trim();
      if (!cur) {
        setNewMacroKey(modifier + '+');
      } else if (!cur.toLowerCase().includes(modifier.toLowerCase())) {
        setNewMacroKey(`${modifier}+${cur.replace(/^\+/, '')}`);
      }
    } else {
      const cur = editMacroKey.trim();
      if (!cur) {
        setEditMacroKey(modifier + '+');
      } else if (!cur.toLowerCase().includes(modifier.toLowerCase())) {
        setEditMacroKey(`${modifier}+${cur.replace(/^\+/, '')}`);
      }
    }
  };

  const setFunctionKey = (target: 'new' | 'edit', fKey: string) => {
    const cur = (target === 'new' ? newMacroKey : editMacroKey).trim().toLowerCase();
    const mods: string[] = [];
    if (cur.includes('alt')) mods.push('alt');
    if (cur.includes('ctrl')) mods.push('ctrl');
    if (cur.includes('shift')) mods.push('shift');
    const combo = mods.length > 0 ? `${mods.join('+')}+${fKey.toLowerCase()}` : fKey.toLowerCase();
    if (target === 'new') setNewMacroKey(combo);
    else setEditMacroKey(combo);
  };

  const handleKeyInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    target: 'new' | 'edit'
  ) => {
    // Intercepter F1 à F12 pour empêcher le navigateur d'ouvrir l'aide, de rafraîchir ou d'ouvrir les DevTools
    if (/^f([1-9]|1[0-2])$/i.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const fKey = e.key.toLowerCase();
      const mods: string[] = [];
      if (e.altKey) mods.push('alt');
      if (e.ctrlKey) mods.push('ctrl');
      if (e.shiftKey) mods.push('shift');
      const combo = mods.length > 0 ? `${mods.join('+')}+${fKey}` : fKey;
      if (target === 'new') setNewMacroKey(combo);
      else setEditMacroKey(combo);
    }
  };

  const handleStartEditMacro = (m: VoiceMacro) => {
    setEditingMacroId(m.id);
    setEditMacroName(m.name);
    setEditMacroKey(m.key);
    setEditMacroPressType(m.pressType || 'tap');
    setEditMacroDuration(m.holdDuration || 1.5);
    setEditMacroTapDurationMs(m.tapDurationMs || 180);
    setEditMacroPhrases(m.phrases.join(', '));
    setEditMacroReply(m.confirmation);
  };

  const handleCancelEditMacro = () => {
    setEditingMacroId(null);
  };

  const handleSaveEditMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMacroId || !editMacroName.trim() || !editMacroKey.trim() || !editMacroPhrases.trim()) return;

    const phrases = editMacroPhrases
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const updated = macros.map((m) => {
      if (m.id !== editingMacroId) return m;
      return {
        ...m,
        name: editMacroName.trim(),
        key: editMacroKey.trim().toLowerCase(),
        pressType: editMacroPressType,
        holdDuration: editMacroPressType === 'hold' ? editMacroDuration : undefined,
        tapDurationMs: editMacroPressType === 'tap' ? editMacroTapDurationMs : undefined,
        phrases: phrases.length > 0 ? phrases : [editMacroName.trim().toLowerCase()],
        confirmation: editMacroReply.trim() || `Commande ${editMacroName.trim()} exécutée.`,
      };
    });

    setMacros(updated);
    macroManager.saveMacros(updated);
    storage.pushToBridge(bridgeUrl);
    setEditingMacroId(null);
  };

  const handleTestSingleKey = async (
    macroKey: string,
    macroId: string,
    pressType: 'tap' | 'hold' = 'tap',
    duration?: number
  ) => {
    setTestKeyFeedbackId(macroId);
    const res = await macroManager.sendKeyToBridge(macroKey, pressType, duration);
    setTimeout(() => setTestKeyFeedbackId(null), 1500);
    if (!res.success) {
      alert("Le pont clavier n'a pas répondu. Vérifiez que DEMARRER_NOVA.bat est bien lancé sur votre PC avec les droits Administrateur.");
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
      pressType: newMacroPressType,
      holdDuration: newMacroPressType === 'hold' ? newMacroDuration : undefined,
      tapDurationMs: newMacroPressType === 'tap' ? newMacroTapDurationMs : undefined,
      phrases: phrases.length > 0 ? phrases : [newMacroName.trim().toLowerCase()],
      confirmation: newMacroReply.trim() || `Commande ${newMacroName.trim()} exécutée.`,
      enabled: true,
    };

    const updated = [...macros, newM];
    setMacros(updated);
    macroManager.saveMacros(updated);
    storage.pushToBridge(bridgeUrl);

    setNewMacroName('');
    setNewMacroKey('');
    setNewMacroPressType('tap');
    setNewMacroDuration(1.5);
    setNewMacroTapDurationMs(180);
    setNewMacroPhrases('');
    setNewMacroReply('');
  };

  const handleDeleteMacro = (id: string) => {
    if (editingMacroId === id) setEditingMacroId(null);
    const updated = macros.filter((m) => m.id !== id);
    setMacros(updated);
    macroManager.saveMacros(updated);
    storage.pushToBridge(bridgeUrl);
  };

  const handleToggleMacro = (id: string) => {
    const updated = macros.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
    setMacros(updated);
    macroManager.saveMacros(updated);
    storage.pushToBridge(bridgeUrl);
  };

  const handleResetDefaultMacros = () => {
    if (confirm('Rétablir les macros par défaut de Star Citizen (Train N, Atterrissage ALT+N, VTOL ALT+J, Power U, etc.) ?')) {
      setMacros(DEFAULT_VOICE_MACROS);
      macroManager.saveMacros(DEFAULT_VOICE_MACROS);
      storage.pushToBridge(bridgeUrl);
      setEditingMacroId(null);
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
        console.warn('Synthèse Edge non disponible en local, bascule Web Speech:', err);
        audioManager.speakWebSpeech(testText, {
          rate: formData.speechRate,
          pitch: formData.robotEffect ? 1.35 : 1.0,
          onEnd: () => setIsPlayingTest(false),
          onError: () => setIsPlayingTest(false),
        });
      }
    } else if (formData.voiceProvider === 'gemini') {
      const currentKey = apiKey || storage.getApiKey();
      try {
        const audioUrl = await geminiClient.generateSpeech({
          text: testText,
          voice: formData.geminiVoice,
          apiKey: currentKey,
        });
        audioManager.playAudioStream(
          audioUrl,
          () => setIsPlayingTest(true),
          () => setIsPlayingTest(false),
          () => setIsPlayingTest(false),
          { robotEffect: formData.robotEffect }
        );
      } catch (err: any) {
        console.warn('Synthèse Gemini bascule Web Speech:', err);
        audioManager.speakWebSpeech(testText, {
          rate: formData.speechRate,
          pitch: formData.robotEffect ? 1.35 : 1.0,
          onEnd: () => setIsPlayingTest(false),
          onError: () => setIsPlayingTest(false),
        });
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90dvh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>⚙️</span> Paramètres de ton Compagnon
            {onCheckUpdate ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckUpdate();
                }}
                className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 transition group cursor-pointer"
                title="Vérifier les mises à jour et synchroniser Nova"
              >
                <span>v{APP_VERSION}</span>
                <RefreshCw className="w-3 h-3 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                v{APP_VERSION}
              </span>
            )}
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
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-accent-500 text-purple-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-purple-400" />
            Sauvegarde & Mises à jour
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
                      <span className="font-semibold text-sm">Google / Gemini</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                        Natif
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Voix Google Studio & Gemini 2.0 (Puck, Aoede...). Expressivité naturelle et diction fluide.
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
                  {bridgeStatus?.startsWith('connecté') && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {bridgeStatus}
                    </span>
                  )}
                  {bridgeStatus === 'inaccessible' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Déconnecté
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Permet à Ami de presser directement des touches physiques dans Star Citizen avec 0ms de latence dès que vous prononcez l&apos;ordre à la voix.
                </p>

                {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                      <span>⚠️ Navigation HTTPS distante détectée</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-amber-200/90">
                      Les navigateurs interdisent à un site web distant sécurisé (HTTPS) de communiquer directement avec votre PC en HTTP local (sécurité Mixed Content).
                    </p>
                    <p className="leading-relaxed text-[11px] font-medium text-white">
                      👉 Pour que les touches fonctionnent dans votre jeu, lancez <span className="font-semibold text-cyan-300">DEMARRER_NOVA.bat</span> sur votre PC et ouvrez l&apos;application sur :{' '}
                      <span className="font-mono text-cyan-300">http://localhost:5005/nova/</span>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://localhost:5005 ou http://127.0.0.1:5005"
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
                        alert("❌ Échec : le pont clavier n'a pas répondu. Vérifiez que DEMARRER_NOVA.bat tourne sur le PC.");
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
                    <span>💡 Comment lancer le pont sur votre PC en 1 clic :</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Double-cliquez sur <code className="text-cyan-300 font-bold">DEMARRER_NOVA.bat</code> (ou <code className="text-cyan-300 font-bold">Nova-StarCitizen.exe</code>) sur votre PC de jeu.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    La fenêtre s&apos;ouvre automatiquement en Administrateur et votre navigateur web s&apos;ouvre sur le compagnon prêt pour Star Citizen !
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

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {macros.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border transition ${
                        editingMacroId === m.id
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                          : m.enabled
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-slate-950/30 border-slate-900 opacity-50'
                      }`}
                    >
                      {editingMacroId === m.id ? (
                        /* FORMULAIRE D'ÉDITION EN PLACE */
                        <form onSubmit={handleSaveEditMacro} className="space-y-3">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                              <Edit2 className="w-3.5 h-3.5" />
                              Modifier la commande : {m.name}
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelEditMacro}
                              className="text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              Annuler
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Nom de la commande
                              </label>
                              <input
                                type="text"
                                value={editMacroName}
                                onChange={(e) => setEditMacroName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Touche / Raccourci clavier
                              </label>
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editMacroKey}
                                  onChange={(e) => setEditMacroKey(e.target.value)}
                                  onKeyDown={(e) => handleKeyInputKeyDown(e, 'edit')}
                                  placeholder="Ex: alt+n, lalt+j, u, space, f1..."
                                  maxLength={20}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono uppercase focus:outline-none focus:border-cyan-500"
                                />
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[9px] text-slate-500">Ajouter modif. :</span>
                                  <button
                                    type="button"
                                    onClick={() => appendModifier('edit', 'alt')}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                                  >
                                    + ALT
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => appendModifier('edit', 'ctrl')}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                                  >
                                    + CTRL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => appendModifier('edit', 'shift')}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                                  >
                                    + SHIFT
                                  </button>
                                </div>
                                {/* Barre d'insertion rapide Touches F1 à F12 */}
                                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/60">
                                  <span className="text-[9px] text-slate-500 mr-0.5">Touches F :</span>
                                  {['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'].map((f) => (
                                    <button
                                      key={f}
                                      type="button"
                                      onClick={() => setFunctionKey('edit', f)}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-100 border border-slate-700 active:scale-95 transition uppercase"
                                      title={`Sélectionner la touche ${f.toUpperCase()}`}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Sélecteur Appui Court vs Appui Long */}
                            <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/60">
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Type d&apos;appui sur la touche
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditMacroPressType('tap')}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editMacroPressType === 'tap'
                                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 shadow-sm'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Appui Court ({editMacroTapDurationMs}ms)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditMacroPressType('hold')}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editMacroPressType === 'hold'
                                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Appui Long ({editMacroDuration}s)</span>
                                </button>
                              </div>

                              {editMacroPressType === 'tap' && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-2 p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs">
                                  <span className="text-[10px] text-cyan-300 shrink-0 font-semibold flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-cyan-400" />
                                    Durée de l&apos;appui :
                                  </span>
                                  {[50, 100, 180, 250, 300, 500].map((ms) => (
                                    <button
                                      key={ms}
                                      type="button"
                                      onClick={() => setEditMacroTapDurationMs(ms)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                                        editMacroTapDurationMs === ms
                                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                      }`}
                                    >
                                      {ms}ms{ms === 180 ? ' (défaut)' : ''}
                                    </button>
                                  ))}
                                  <div className="flex items-center gap-1 ml-auto shrink-0 pl-1.5 border-l border-cyan-500/30">
                                    <input
                                      type="number"
                                      min="20"
                                      max="2000"
                                      step="10"
                                      value={editMacroTapDurationMs}
                                      onChange={(e) =>
                                        setEditMacroTapDurationMs(
                                          Math.max(20, parseInt(e.target.value, 10) || 20)
                                        )
                                      }
                                      className="w-14 px-1.5 py-0.5 text-center font-mono text-[11px] bg-slate-900 border border-cyan-500/50 rounded text-cyan-200 font-bold focus:outline-none focus:border-cyan-400"
                                      title="Valeur personnalisée en ms"
                                    />
                                    <span className="text-[10px] font-mono text-cyan-400 font-bold">ms</span>
                                  </div>
                                </div>
                              )}

                              {editMacroPressType === 'hold' && (
                                <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-purple-950/30 border border-purple-500/30 text-xs">
                                  <span className="text-[10px] text-purple-300 shrink-0">Durée du maintien :</span>
                                  {[1.0, 1.5, 2.0, 3.0].map((dur) => (
                                    <button
                                      key={dur}
                                      type="button"
                                      onClick={() => setEditMacroDuration(dur)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                                        editMacroDuration === dur
                                          ? 'bg-purple-600 text-white font-bold'
                                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                      }`}
                                    >
                                      {dur}s
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Phrases vocales déclencheuses (séparées par une virgule)
                            </label>
                            <input
                              type="text"
                              value={editMacroPhrases}
                              onChange={(e) => setEditMacroPhrases(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Confirmation vocale prononcée par Ami
                            </label>
                            <input
                              type="text"
                              value={editMacroReply}
                              onChange={(e) => setEditMacroReply(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleTestSingleKey(
                                  editMacroKey,
                                  m.id,
                                  editMacroPressType,
                                  editMacroPressType === 'hold'
                                    ? editMacroDuration
                                    : editMacroTapDurationMs / 1000
                                )
                              }
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-medium border border-slate-700 flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Tester [{editMacroKey.toUpperCase() || '?'}] {editMacroPressType === 'hold' ? `(${editMacroDuration}s)` : `(${editMacroTapDurationMs}ms)`}
                            </button>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditMacro}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow"
                              >
                                Enregistrer la commande
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        /* AFFICHAGE STANDARD AVEC ACTIONS ÉDITER / TESTER / SUPPRIMER */
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 shrink-0 mt-0.5">
                              <button
                                type="button"
                                onClick={() => handleToggleMacro(m.id)}
                                className={`px-2 py-1 rounded-lg font-mono text-xs font-bold uppercase transition ${
                                  m.enabled
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}
                                title={m.enabled ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                              >
                                [{m.key}]
                              </button>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  m.pressType === 'hold'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                }`}
                                title={m.pressType === 'hold' ? `Appui long maintenu ${m.holdDuration || 1.5}s` : `Appui court ${m.tapDurationMs || 180}ms`}
                              >
                                {m.pressType === 'hold' ? `⏳ Long (${m.holdDuration || 1.5}s)` : `⚡ Court (${m.tapDurationMs || 180}ms)`}
                              </span>
                            </div>

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

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Bouton Tester la touche */}
                            <button
                              type="button"
                              onClick={() =>
                                handleTestSingleKey(
                                  m.key,
                                  m.id,
                                  m.pressType || 'tap',
                                  m.pressType === 'hold'
                                    ? m.holdDuration || 1.5
                                    : (m.tapDurationMs || 180) / 1000
                                )
                              }
                              className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 ${
                                testKeyFeedbackId === m.id
                                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-cyan-300'
                              }`}
                              title={
                                m.pressType === 'hold'
                                  ? `Tester l'appui long [${m.key.toUpperCase()}] (${m.holdDuration || 1.5}s)`
                                  : `Tester l'appui court [${m.key.toUpperCase()}] (${m.tapDurationMs || 180}ms)`
                              }
                            >
                              {testKeyFeedbackId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Bouton Éditer la touche et la commande */}
                            <button
                              type="button"
                              onClick={() => handleStartEditMacro(m)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition"
                              title="Modifier la touche ou l'ordre verbal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Bouton Supprimer */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMacro(m.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-red-400 border border-slate-800 transition"
                              title="Supprimer cette commande"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
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
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={newMacroKey}
                        onChange={(e) => setNewMacroKey(e.target.value)}
                        onKeyDown={(e) => handleKeyInputKeyDown(e, 'new')}
                        placeholder="Ex: alt+n, lalt+j, u, space, f1..."
                        maxLength={20}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-accent-500"
                      />
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] text-slate-500">Ajouter :</span>
                        <button
                          type="button"
                          onClick={() => appendModifier('new', 'alt')}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                        >
                          + ALT
                        </button>
                        <button
                          type="button"
                          onClick={() => appendModifier('new', 'ctrl')}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                        >
                          + CTRL
                        </button>
                        <button
                          type="button"
                          onClick={() => appendModifier('new', 'shift')}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700"
                        >
                          + SHIFT
                        </button>
                      </div>

                      {/* Barre d'insertion rapide Touches F1 à F12 */}
                      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/60">
                        <span className="text-[9px] text-slate-500 mr-0.5">Touches F :</span>
                        {['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFunctionKey('new', f)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-100 border border-slate-700 active:scale-95 transition uppercase"
                            title={`Sélectionner la touche ${f.toUpperCase()}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sélecteur Appui Court vs Appui Long */}
                  <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/60">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Type d&apos;appui sur la touche
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewMacroPressType('tap')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          newMacroPressType === 'tap'
                            ? 'bg-accent-600/30 border-accent-500 text-accent-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-accent-400" />
                        <span>Appui Court ({newMacroTapDurationMs}ms)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMacroPressType('hold')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          newMacroPressType === 'hold'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Appui Long ({newMacroDuration}s)</span>
                      </button>
                    </div>

                    {newMacroPressType === 'tap' && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2 p-2 rounded-xl bg-accent-950/30 border border-accent-500/30 text-xs">
                        <span className="text-[11px] text-accent-300 shrink-0 font-semibold flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-accent-400" />
                          Durée de l&apos;appui :
                        </span>
                        {[50, 100, 180, 250, 300, 500].map((ms) => (
                          <button
                            key={ms}
                            type="button"
                            onClick={() => setNewMacroTapDurationMs(ms)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                              newMacroTapDurationMs === ms
                                ? 'bg-accent-500 text-slate-950 font-bold shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {ms}ms{ms === 180 ? ' (défaut)' : ''}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-auto shrink-0 pl-1.5 border-l border-accent-500/30">
                          <input
                            type="number"
                            min="20"
                            max="2000"
                            step="10"
                            value={newMacroTapDurationMs}
                            onChange={(e) =>
                              setNewMacroTapDurationMs(
                                Math.max(20, parseInt(e.target.value, 10) || 20)
                              )
                            }
                            className="w-14 px-1.5 py-0.5 text-center font-mono text-xs bg-slate-900 border border-accent-500/40 rounded-lg text-accent-200 font-bold focus:outline-none focus:border-accent-400"
                            title="Valeur personnalisée en millisecondes"
                          />
                          <span className="text-[11px] font-mono text-accent-400 font-bold">ms</span>
                        </div>
                      </div>
                    )}

                    {newMacroPressType === 'hold' && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
                        <span className="text-[11px] text-purple-300 shrink-0">Durée du maintien :</span>
                        {[1.0, 1.5, 2.0, 3.0].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setNewMacroDuration(dur)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition ${
                              newMacroDuration === dur
                                ? 'bg-purple-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {dur}s
                          </button>
                        ))}
                      </div>
                    )}
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!newMacroKey.trim()}
                    onClick={() =>
                      handleTestSingleKey(
                        newMacroKey,
                        'new_test',
                        newMacroPressType,
                        newMacroPressType === 'hold'
                          ? newMacroDuration
                          : newMacroTapDurationMs / 1000
                      )
                    }
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-cyan-300 font-semibold rounded-xl text-xs transition active:scale-95 border border-slate-700 flex items-center justify-center gap-1.5 shrink-0"
                    title="Tester la frappe avec la durée sélectionnée"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      Tester [{newMacroKey.toUpperCase() || '?'}] {newMacroPressType === 'hold' ? `(${newMacroDuration}s)` : `(${newMacroTapDurationMs}ms)`}
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={!newMacroName.trim() || !newMacroKey.trim() || !newMacroPhrases.trim()}
                    className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:hover:bg-accent-600 text-white font-semibold rounded-xl text-xs transition active:scale-95 shadow-md shadow-accent-600/30"
                  >
                    Ajouter cette commande vocale
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: SAUVEGARDE & MISES À JOUR */}
          {activeTab === 'backup' && (
            <div className="space-y-5 animate-fade-in text-slate-200">
              {/* Carte Mise à Jour Nova & Vérification de Version */}
              <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white flex items-center gap-2">
                        <span>Mise à Jour Nova</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          v{APP_VERSION}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Vérifier si votre exécutable PC est à jour avec les derniers commits GitHub.
                      </p>
                    </div>
                  </div>
                  {onCheckUpdate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCheckUpdate();
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Vérifier la version</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Persistance automatique sur le PC */}
              <div className="p-4 bg-slate-950/80 border border-purple-900/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-sm text-white">
                    Persistance Permanente des Données
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Toutes vos configurations (touches modifiées, commandes vocales Star Citizen, profil du compagnon, clé API Gemini et mémoires) sont automatiquement conservées sur votre PC dans :
                </p>
                <code className="block font-mono text-[11px] text-purple-300 bg-black/50 p-2.5 rounded-xl border border-purple-500/20">
                  %APPDATA%\Nova\nova_config.json
                </code>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong className="text-white">Mises à jour sans perte :</strong> Même si vous remplacez le dossier de l&apos;application pour installer un nouvel exécutable (<span className="font-mono text-cyan-300">Nova-StarCitizen.exe</span>), vos réglages restent intacts sur votre ordinateur et sont automatiquement restaurés dès l&apos;ouverture !
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualSyncBridge}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-xs font-semibold text-purple-200 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant avec le PC'}
                  </button>
                  {syncStatus && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {syncStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Export et Import manuel */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div>
                  <h4 className="font-semibold text-xs text-white flex items-center gap-1.5 mb-1">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sauvegarde Manuelle (Fichier JSON)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Vous pouvez également exporter un fichier de sauvegarde à tout moment pour l&apos;archiver ou le transférer sur un autre PC de jeu.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-300 transition flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger la sauvegarde (.json)
                  </button>

                  <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-300" />
                    <span>Restaurer depuis un fichier (.json)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
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
