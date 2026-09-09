'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CompanionProfile,
  ChatMessage,
  MemoryItem,
} from '@/types/companion';
import { DEFAULT_PROFILE, PERSONALITY_PRESETS } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { audioManager } from '@/lib/audio';
import { cleanTextForSpeech } from '@/lib/speechUtils';
import { SettingsModal } from '@/components/SettingsModal';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { ConversationModal, LiveCallState } from '@/components/ConversationModal';
import { visionManager } from '@/lib/vision';
import { macroManager } from '@/lib/voiceMacros';
import { geminiClient } from '@/lib/geminiClient';
import {
  Settings,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Phone,
  Trash2,
  Eye,
  EyeOff,
  Save,
  FolderOpen,
  RefreshCw,
  Download,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';

export default function CompanionApp() {
  const [profile, setProfile] = useState<CompanionProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Vision écran et flux d'analyse
  const [isVisionActive, setIsVisionActive] = useState(false);

  // État du Pont Clavier PC (Port 5005)
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [bridgeInfo, setBridgeInfo] = useState<{ url?: string; isAdmin?: boolean; directInput?: boolean } | null>(null);

  // États de la Mise à Jour Automatique 1-Clic
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    success?: boolean;
    hasUpdate?: boolean;
    currentVersion?: string;
    latestVersion?: string;
    notes?: string;
    downloadUrl?: string;
    error?: string;
  } | null>(null);
  const [updateToast, setUpdateToast] = useState<string | null>(null);

  // États pour le Mode Appel Mains-Libres continu
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callState, setCallState] = useState<LiveCallState>('listening');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  const recognitionRef = useRef<any>(null);
  const continuousRecognizerRef = useRef<any>(null);
  const isCallActiveRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialisation au montage
  useEffect(() => {
    const loadedProfile = storage.getProfile();
    const loadedMessages = storage.getMessages();
    const loadedMemories = storage.getMemories();

    setProfile(loadedProfile);
    setMessages(loadedMessages);
    setMemories(loadedMemories);

    // Initialiser les voix synthèse Web Speech
    audioManager.getWebSpeechVoices();

    // Synchronisation automatique avec le fichier persistant du PC (%APPDATA%/Nova/nova_config.json)
    storage.syncWithBridge().then((res) => {
      if (res.synced && res.config) {
        if (res.config.profile) setProfile(res.config.profile);
        if (res.config.memories) setMemories(res.config.memories);
        console.log('✓ Configuration restaurée depuis le fichier persistant du PC');
      }
    });
  }, []);

  // Surveillance périodique de l'état de connexion du Pont Clavier PC
  useEffect(() => {
    let isMounted = true;
    const checkBridge = async () => {
      const res = await macroManager.checkBridgeHealth();
      if (!isMounted) return;
      setBridgeConnected(res.online);
      if (res.online && res.info) {
        setBridgeInfo({
          url: res.url,
          isAdmin: res.info.isAdmin,
          directInput: res.info.directInput,
        });
      } else {
        setBridgeInfo(null);
      }
    };

    checkBridge();
    const interval = setInterval(checkBridge, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- Sauvegarde & Restauration Rapide en 1 Clic ---
  const [quickSaveToast, setQuickSaveToast] = useState(false);

  const handleQuickSave = () => {
    const config = storage.exportFullConfig();
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nova_sauvegarde_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Envoi également vers le fichier persistant du PC
    storage.pushToBridge();

    setQuickSaveToast(true);
    setTimeout(() => setQuickSaveToast(false), 3000);
  };

  const handleQuickRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = storage.importFullConfig(json);
        if (ok) {
          const newProf = storage.getProfile();
          setProfile(newProf);
          setMemories(storage.getMemories());
          storage.pushToBridge();
          alert('✓ Réglages restaurés avec succès ! Vos touches et configurations sont en place.');
        } else {
          alert('Format de fichier invalide.');
        }
      } catch (err) {
        alert('Impossible de lire le fichier de sauvegarde JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Mise à Jour Automatique 1-Clic ---
  const handleCheckUpdate = async () => {
    setIsUpdateModalOpen(true);
    setUpdateChecking(true);
    setUpdateToast(null);
    try {
      const bridgeUrl = macroManager.getBridgeUrl();
      const res = await fetch(`${bridgeUrl}/update/check`);
      if (res.ok) {
        const data = await res.json();
        setUpdateInfo(data);
      } else {
        // Repli direct sur l'API GitHub Releases depuis le navigateur
        const ghRes = await fetch('https://api.github.com/repos/nxm310/nova/releases/latest');
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const tag = ghData.tag_name || 'v1.0.0';
          let dlUrl = '';
          for (const a of ghData.assets || []) {
            if (a.name?.endsWith('.zip')) {
              dlUrl = a.browser_download_url;
              break;
            }
          }
          setUpdateInfo({
            success: true,
            hasUpdate: tag !== 'v1.0.1' && tag !== '1.0.1',
            currentVersion: '1.0.1',
            latestVersion: tag,
            notes: ghData.body || '',
            downloadUrl: dlUrl || 'https://github.com/nxm310/nova/releases/download/v1.0.0/Nova-StarCitizen-Windows.zip',
          });
        } else {
          setUpdateInfo({ error: "Impossible de joindre le serveur de mise à jour GitHub." });
        }
      }
    } catch (err: any) {
      setUpdateInfo({ error: "Erreur de vérification des mises à jour : " + (err?.message || err) });
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setUpdateApplying(true);
    setUpdateToast(null);
    try {
      const bridgeUrl = macroManager.getBridgeUrl();
      const res = await fetch(`${bridgeUrl}/update/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: updateInfo.downloadUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setUpdateToast("✓ Mise à jour appliquée avec succès ! Rechargement en cours...");
        setTimeout(() => {
          window.location.reload();
        }, 2200);
      } else {
        alert("Erreur lors de la mise à jour : " + (data.error || 'Échec'));
      }
    } catch (err: any) {
      alert("Le pont PC n'a pas répondu pour la mise à jour : " + err.message);
    } finally {
      setUpdateApplying(false);
    }
  };

  // Raccourci clavier universel Ctrl+S pour sauvegarder en 1 seconde
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleQuickSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Défilement automatique vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Sauvegarder les messages dès qu'ils changent
  const updateMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    storage.saveMessages(newMessages);
  };

  // Jouer la voix pour un texte donné
  const playSpeech = async (
    text: string,
    messageId?: string,
    onComplete?: () => void
  ) => {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) {
      if (onComplete) onComplete();
      return;
    }

    if (isPlayingAudio && playingMessageId === messageId) {
      audioManager.stopAll();
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
      if (onComplete) onComplete();
      return;
    }

    audioManager.stopAll();
    setIsPlayingAudio(true);
    if (messageId) setPlayingMessageId(messageId);

    let hasEnded = false;
    const safeEnd = () => {
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(watchdogTimer);
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
      if (onComplete) onComplete();
    };

    // Watchdog de sécurité : durée estimée + 2.5 secondes de marge
    // Garantit que l'écoute du micro repart toujours même en arrière-plan
    const estimatedMs = Math.max(3000, (cleanText.length / 8) * 1000 + 2500);
    const watchdogTimer = setTimeout(() => {
      safeEnd();
    }, estimatedMs);

    const onEnd = () => safeEnd();
    const onError = (e: any) => {
      console.warn('Erreur lecture audio:', e);
      safeEnd();
    };

    // 1. Web Speech API (Siri / Voix système)
    if (profile.voiceProvider === 'webspeech') {
      audioManager.speakWebSpeech(cleanText, {
        voiceURI: profile.webSpeechVoiceURI,
        rate: profile.speechRate,
        pitch: profile.robotEffect ? 1.35 : 1.0,
        onStart: () => setIsPlayingAudio(true),
        onEnd,
        onError,
      });
      return;
    }

    // 2. Microsoft Edge-TTS (Gratuit HD)
    if (profile.voiceProvider === 'edge') {
      try {
        const res = await fetch('/api/tts/edge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voice: profile.edgeVoice,
            rate: profile.speechRate,
            pitch: profile.pitch || '+0Hz',
          }),
        });
        if (!res.ok) throw new Error('Erreur synthèse Edge');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioManager.playAudioStream(url, undefined, onEnd, onError, {
          robotEffect: profile.robotEffect,
        });
      } catch (err) {
        console.warn('Fallback Edge vers Web Speech:', err);
        audioManager.speakWebSpeech(cleanText, { rate: profile.speechRate, onEnd, onError });
      }
      return;
    }

    // 3. Gemini Audio Natif (Direct Google API)
    if (profile.voiceProvider === 'gemini') {
      const apiKey = storage.getApiKey();
      if (!apiKey) {
        audioManager.speakWebSpeech(cleanText, { rate: profile.speechRate, onEnd, onError });
        return;
      }
      try {
        const audioUrl = await geminiClient.generateSpeech({
          text: cleanText,
          voice: profile.geminiVoice,
          apiKey,
        });
        audioManager.playAudioStream(audioUrl, undefined, onEnd, onError, {
          robotEffect: profile.robotEffect,
        });
      } catch (err) {
        console.warn('Fallback Gemini TTS vers Web Speech:', err);
        audioManager.speakWebSpeech(cleanText, { rate: profile.speechRate, onEnd, onError });
      }
    }
  };

  // --- Gestion du Partage d'Écran pour la Vision Compagnon ---
  const handleToggleVision = async () => {
    if (isVisionActive) {
      visionManager.stopScreenShare();
      setIsVisionActive(false);
    } else {
      const success = await visionManager.startScreenShare(() => {
        setIsVisionActive(false);
      });
      setIsVisionActive(success);
    }
  };

  // --- Fonctions Mode Appel Direct Mains-Libres ---
  const startHandsFreeCall = () => {
    isCallActiveRef.current = true;
    setIsCallModalOpen(true);
    setCallState('listening');
    setLiveTranscript('');
    const previousBotMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'assistant');
    setLastReply(previousBotMessage ? previousBotMessage.content : '');

    const recognizer = audioManager.createContinuousSpeechRecognizer({
      onInterim: (interimText) => {
        setLiveTranscript(interimText);
      },
      onFinalSilence: (finalText) => {
        handleCallSpeechInput(finalText);
      },
      onError: (err) => {
        console.warn('Erreur appel vocal:', err);
      },
      silenceMs: 1300,
    });

    if (!recognizer) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
      setIsCallModalOpen(false);
      isCallActiveRef.current = false;
      return;
    }

    continuousRecognizerRef.current = recognizer;
    recognizer.start();
  };

  const handleCallSpeechInput = async (spokenText: string) => {
    if (!spokenText.trim() || !isCallActiveRef.current) return;

    // Pause de l'écoute pendant la réflexion et la parole
    continuousRecognizerRef.current?.pause();
    setCallState('thinking');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: spokenText,
      timestamp: Date.now(),
    };

    const newHistory = [...messagesRef.current, userMessage];
    updateMessages(newHistory);
    messagesRef.current = newHistory;

    // 1. Vérification des macros vocales prioritaires (ex: touches Star Citizen sans latence)
    try {
      const macroRes = await macroManager.checkAndExecute(spokenText);
      if (macroRes.matched && macroRes.confirmation) {
        const botReply = macroRes.confirmation;
        const botMessage: ChatMessage = {
          id: 'msg_' + Date.now() + '_a',
          role: 'assistant',
          content: botReply,
          timestamp: Date.now(),
        };

        const finalHistory = [...newHistory, botMessage];
        updateMessages(finalHistory);
        messagesRef.current = finalHistory;
        setLastReply(botReply);

        if (!isCallActiveRef.current) return;

        setCallState('speaking');
        playSpeech(botReply, botMessage.id, () => {
          if (isCallActiveRef.current) {
            setLiveTranscript('');
            setCallState('listening');
            continuousRecognizerRef.current?.start();
          }
        });
        return;
      }
    } catch (macroErr) {
      console.warn('Erreur exécution macro vocale:', macroErr);
    }

    // 2. Si ce n'est pas une commande directe : appel IA Gemini multimodal
    try {
      const apiKey = storage.getApiKey();
      const formattedHistory = newHistory.slice(-15).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Capture de l'image de l'écran si la vision est activée
      let imageBase64: string | undefined = undefined;
      if (visionManager.isSharing()) {
        const frame = visionManager.captureFrameBase64();
        if (frame) imageBase64 = frame;
      }

      const botReply = await geminiClient.sendMessage({
        messages: formattedHistory,
        profile,
        apiKey: apiKey || '',
        memories,
        imageBase64,
      });

      // Détection et déclenchement des actions Star Citizen de l'IA via le pont clavier (Appui court ou Appui long)
      const actionMatch = botReply.match(/\[ACTION:(KEY|HOLD):([a-zA-Z0-9+_]+)\]/i);
      let displayReply = botReply;
      if (actionMatch) {
        const actionType = actionMatch[1].toUpperCase();
        const keyToPress = actionMatch[2];
        const isHold = actionType === 'HOLD';
        displayReply = botReply.replace(/\[ACTION:(KEY|HOLD):[a-zA-Z0-9+_]+\]/gi, '').trim();
        console.log(`🎮 [ACTION IA STAR CITIZEN] Touche détectée : [${keyToPress}] (${isHold ? 'APPUI LONG 1.5s' : 'APPUI COURT'}) ➔ Envoi au pont PC...`);
        macroManager.sendKeyToBridge(keyToPress, isHold ? 'hold' : 'tap', isHold ? 1.5 : 0.18);
      }

      const botMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: displayReply,
        timestamp: Date.now(),
      };

      const finalHistory = [...newHistory, botMessage];
      updateMessages(finalHistory);
      messagesRef.current = finalHistory;
      setLastReply(displayReply);

      if (!isCallActiveRef.current) return;

      setCallState('speaking');

      playSpeech(displayReply, botMessage.id, () => {
        // Une fois la lecture audio finie : relancer automatiquement l'écoute !
        if (isCallActiveRef.current) {
          setLiveTranscript('');
          setCallState('listening');
          continuousRecognizerRef.current?.start();
        }
      });
    } catch (err: any) {
      console.warn('Erreur appel vocal chat:', err);
      setCallState('listening');
      if (isCallActiveRef.current) {
        continuousRecognizerRef.current?.start();
      }
    }
  };

  const handleSendCallText = (text: string) => {
    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    setLiveTranscript('');
    handleCallSpeechInput(text);
  };

  const handleInterruptCall = () => {
    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    if (isCallActiveRef.current) {
      setLiveTranscript('');
      setCallState('listening');
      continuousRecognizerRef.current?.start();
    }
  };

  const stopHandsFreeCall = () => {
    isCallActiveRef.current = false;
    continuousRecognizerRef.current?.stop();
    continuousRecognizerRef.current = null;
    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    setIsCallModalOpen(false);
    setLiveTranscript('');
  };

  // Envoi d'un message standard
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMessage];
    updateMessages(newHistory);
    setIsLoading(true);

    // 1. Vérification des macros vocales directes (Star Citizen)
    try {
      const macroRes = await macroManager.checkAndExecute(text);
      if (macroRes.matched && macroRes.confirmation) {
        const botReply = macroRes.confirmation;
        const botMessage: ChatMessage = {
          id: 'msg_' + Date.now() + '_a',
          role: 'assistant',
          content: botReply,
          timestamp: Date.now(),
        };

        const updatedWithBot = [...newHistory, botMessage];
        updateMessages(updatedWithBot);

        if (profile.autoPlayVoice) {
          playSpeech(botReply, botMessage.id);
        }
        setIsLoading(false);
        return;
      }
    } catch (macroErr) {
      console.warn('Erreur macro:', macroErr);
    }

    // 2. Requête IA Gemini avec capture d'écran si active
    try {
      const apiKey = storage.getApiKey();

      // Préparer le contexte de discussion (les 15 derniers messages)
      const formattedHistory = newHistory.slice(-15).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Capture d'écran si le mode Vision est actif
      let imageBase64: string | undefined = undefined;
      if (visionManager.isSharing()) {
        const frame = visionManager.captureFrameBase64();
        if (frame) imageBase64 = frame;
      }

      const botReply = await geminiClient.sendMessage({
        messages: formattedHistory,
        profile,
        apiKey: apiKey || '',
        memories,
        imageBase64,
      });

      // Détection et exécution des actions Star Citizen de l'IA via le pont clavier (Appui court ou Appui long)
      const actionMatch = botReply.match(/\[ACTION:(KEY|HOLD):([a-zA-Z0-9+_]+)\]/i);
      let displayReply = botReply;
      if (actionMatch) {
        const actionType = actionMatch[1].toUpperCase();
        const keyToPress = actionMatch[2];
        const isHold = actionType === 'HOLD';
        displayReply = botReply.replace(/\[ACTION:(KEY|HOLD):[a-zA-Z0-9+_]+\]/gi, '').trim();
        console.log(`🎮 [ACTION IA STAR CITIZEN] Touche détectée : [${keyToPress}] (${isHold ? 'APPUI LONG 1.5s' : 'APPUI COURT'}) ➔ Envoi au pont PC...`);
        macroManager.sendKeyToBridge(keyToPress, isHold ? 'hold' : 'tap', isHold ? 1.5 : 0.18);
      }

      const botMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: displayReply,
        timestamp: Date.now(),
      };

      const updatedWithBot = [...newHistory, botMessage];
      updateMessages(updatedWithBot);

      // Si la lecture automatique est activée, prononcer la réponse
      if (profile.autoPlayVoice) {
        playSpeech(displayReply, botMessage.id);
      }
    } catch (err: any) {
      console.warn('Chat error:', err?.message || err);
      const errorMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_err',
        role: 'assistant',
        content:
          err.message ||
          "Désolé, j'ai eu un petit problème de connexion. Peux-tu vérifier ta clé API dans les Paramètres ⚙️ ?",
        timestamp: Date.now(),
      };
      updateMessages([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion du micro (reconnaissance vocale)
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognition = audioManager.createSpeechRecognition(
      (transcript) => {
        setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
      },
      (err) => {
        console.warn('Erreur reconnaissance vocale:', err);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );

    if (!recognition) {
      alert(
        "La reconnaissance vocale n'est pas disponible sur ce navigateur. Tu peux écrire ton message dans le champ texte."
      );
      return;
    }

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const currentPreset = PERSONALITY_PRESETS.find((p) => p.id === profile.presetId);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-2xl mx-auto bg-slate-950 text-slate-100 overflow-hidden shadow-2xl relative">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-30 safe-top">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border transition-all duration-300 ${
                isPlayingAudio
                  ? 'border-accent-400 ring-2 ring-accent-400/50 shadow-lg shadow-accent-500/20 scale-105'
                  : 'border-slate-700'
              }`}
            >
              {profile.avatar}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                isPlayingAudio
                  ? 'bg-accent-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-tight">
                {profile.name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 font-medium border border-accent-500/20">
                {currentPreset?.emoji} {currentPreset?.name.split('&')[0].trim()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <AudioVisualizer isPlaying={isPlayingAudio} isListening={isRecording} />
              {!isPlayingAudio && !isRecording && (
                <span className="text-[11px] text-slate-400">En ligne pour toi</span>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles Header */}
        <div className="flex items-center gap-1.5">
          {/* Bouton Partage / Vision Écran */}
          <button
            onClick={handleToggleVision}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-md active:scale-95 transition ${
              isVisionActive
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={
              isVisionActive
                ? "Désactiver la vision d'écran"
                : "Activer la vision d'écran (partager une fenêtre ou tout l'écran avec votre compagnon)"
            }
          >
            {isVisionActive ? (
              <Eye className="w-3.5 h-3.5 text-white" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">
              {isVisionActive ? 'Vision ON' : 'Vision'}
            </span>
          </button>

          {/* Bouton Appel Direct Mains-Libres */}
          <button
            onClick={startHandsFreeCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-accent-600 to-indigo-600 hover:from-accent-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-accent-600/30 active:scale-95 transition"
            title="Démarrer un appel vocal direct sans avoir à appuyer sur les boutons"
          >
            <Phone className="w-3.5 h-3.5 animate-pulse text-cyan-200" />
            <span className="inline">Appel Direct</span>
          </button>

          {/* Bascule lecture auto voix */}
          <button
            onClick={() => {
              const updated = { ...profile, autoPlayVoice: !profile.autoPlayVoice };
              setProfile(updated);
              storage.saveProfile(updated);
            }}
            title={profile.autoPlayVoice ? 'Voix activée' : 'Voix coupée'}
            className={`p-2 rounded-xl border transition ${
              profile.autoPlayVoice
                ? 'bg-accent-500/20 border-accent-500/30 text-accent-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
          >
            {profile.autoPlayVoice ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Bouton Effacer la conversation de l'écran */}
          <button
            onClick={() => {
              if (messages.length === 0) return;
              if (window.confirm("Effacer les messages affichés à l'écran ?")) {
                updateMessages([]);
                storage.clearMessages();
                audioManager.stopAll();
              }
            }}
            disabled={messages.length === 0}
            title={
              messages.length > 0
                ? "Effacer les messages affichés à l'écran"
                : "Aucun message à effacer"
            }
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 hover:border-red-500/40 border border-slate-700/60 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Indicateur d'état du Pont Clavier PC */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-sm active:scale-95 transition ${
              bridgeConnected === true
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                : bridgeConnected === false
                ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
            title={
              bridgeConnected === true
                ? `✓ Pont Clavier PC Connecté sur ${bridgeInfo?.url || 'Port 5005'}. Vos ordres vocaux actionnent directement les touches dans Star Citizen !`
                : `⚠️ Pont Clavier Déconnecté. Cliquez pour afficher comment lancer DEMARRER_NOVA.bat sur votre PC.`
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                bridgeConnected === true
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : bridgeConnected === false
                  ? 'bg-rose-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="hidden lg:inline font-mono text-[11px]">
              {bridgeConnected === true
                ? 'Pont PC : Prêt'
                : bridgeConnected === false
                ? 'Pont PC : Déconnecté'
                : 'Pont PC...'}
            </span>
          </button>

          {/* Touche Sauvegarde Rapide */}
          <button
            onClick={handleQuickSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-sm active:scale-95 transition"
            title="Sauvegarder mes réglages (touches, profil, clé API) pour pouvoir les restaurer à chaque réinstallation (Raccourci: Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden md:inline">Sauvegarder</span>
          </button>

          {/* Touche Restauration Rapide */}
          <label
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold shadow-sm active:scale-95 transition cursor-pointer"
            title="Restaurer mes réglages depuis une sauvegarde (.json)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden md:inline">Restaurer</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleQuickRestore}
              className="hidden"
            />
          </label>

          {/* Touche Mise à Jour Automatique 1-Clic */}
          <button
            onClick={handleCheckUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 text-xs font-semibold shadow-sm active:scale-95 transition"
            title="Rechercher et installer les mises à jour sans réinstaller"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${updateChecking ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Mise à jour</span>
          </button>

          {/* Bouton Paramètres */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 transition"
            title="Paramètres du compagnon"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast de confirmation de sauvegarde */}
      {quickSaveToast && (
        <div className="fixed top-20 right-5 z-50 animate-fade-in bg-purple-950/95 text-purple-100 border border-purple-500 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ Réglages sauvegardés dans votre dossier Téléchargements !</span>
        </div>
      )}

      {/* Toast de confirmation de mise à jour */}
      {updateToast && (
        <div className="fixed top-20 right-5 z-50 animate-fade-in bg-blue-950/95 text-blue-100 border border-blue-500 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{updateToast}</span>
        </div>
      )}

      {/* ZONE DE CHAT SCROLLABLE */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-600/30 to-indigo-600/30 border border-accent-500/30 flex items-center justify-center text-4xl shadow-xl shadow-accent-500/10">
              {profile.avatar}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1.5">
                Salut ! Je suis {profile.name}.
              </h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Je suis ton ami virtuel. On peut discuter de tout ce que tu veux, à l'écrit comme à l'oral.
              </p>
            </div>

            {/* Suggestions de départ */}
            <div className="w-full max-w-sm space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Engager la conversation :
              </p>
              {[
                "Comment s'est passée ta journée ?",
                "Raconte-moi une petite anecdote inspirante.",
                "J'ai besoin d'un coup de motivation aujourd'hui !",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition flex items-center justify-between group"
                >
                  <span>{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-accent-400 opacity-60 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPlayingThis = isPlayingAudio && playingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 animate-fade-in ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-lg bg-slate-800 border border-slate-700 mt-0.5">
                    {profile.avatar}
                  </div>
                )}

                <div
                  className={`group relative max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                    isUser
                      ? 'bg-gradient-to-br from-accent-600 to-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-sm'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap selection:bg-accent-400/30">
                    {msg.content}
                  </p>

                  {/* Actions sous le message compagnon */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-3 mt-2 pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <button
                        onClick={() => playSpeech(msg.content, msg.id)}
                        className={`flex items-center gap-1 hover:text-white transition px-1.5 py-0.5 rounded ${
                          isPlayingThis ? 'text-accent-400 font-semibold' : ''
                        }`}
                      >
                        {isPlayingThis ? (
                          <>
                            <Square className="w-3 h-3 text-red-400" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 text-accent-400" />
                            <span>Écouter</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-white transition p-0.5"
                          title="Copier"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {isUser && (
                    <div className="text-[10px] text-indigo-200 text-right mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Indicateur de génération */}
        {isLoading && (
          <div className="flex gap-2.5 items-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg bg-slate-800 border border-slate-700">
              {profile.avatar}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
              <span>{profile.name} réfléchit...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* BARRE DE SAISIE INFERIEURE */}
      <footer className="p-3 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md safe-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Bouton Microphone */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-xl border transition flex-shrink-0 ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={isRecording ? 'Arrêter la dictée' : 'Parler au micro'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Champ texte */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? 'Écoute en cours...'
                : `Discute avec ${profile.name}...`
            }
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl focus:outline-none focus:border-accent-500 text-sm text-white placeholder-slate-500 transition shadow-inner"
          />

          {/* Bouton Envoyer */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:hover:bg-accent-600 text-white transition shadow-lg shadow-accent-600/30 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>

      {/* Prompt d'installation PWA mobile */}
      <PWAInstallPrompt />

      {/* Modal des Paramètres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={(newProf) => {
          setProfile(newProf);
          storage.saveProfile(newProf);
        }}
        memories={memories}
        onUpdateMemories={(newMems) => setMemories(newMems)}
        onClearHistory={() => {
          updateMessages([]);
          storage.clearMessages();
        }}
      />

      {/* Modal d'Appel Direct Mains-Libres */}
      <ConversationModal
        isOpen={isCallModalOpen}
        onClose={stopHandsFreeCall}
        profile={profile}
        callState={callState}
        liveTranscript={liveTranscript}
        lastReply={lastReply}
        onInterrupt={handleInterruptCall}
        onSendMessage={handleSendCallText}
        isVisionActive={isVisionActive}
        onToggleVision={handleToggleVision}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Modal de Mise à Jour 1-Clic */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <RefreshCw className={`w-5 h-5 ${updateChecking || updateApplying ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Mise à Jour Nova</h3>
                  <p className="text-xs text-slate-400">Mettre à jour le système en 1 clic sans réinstallation</p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {updateChecking ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-sm text-slate-300 font-medium">Recherche des mises à jour sur GitHub...</p>
                  <p className="text-xs text-slate-500">Connexion au dépôt officiel nxm310/nova</p>
                </div>
              ) : updateInfo?.error ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-1">Erreur de vérification</span>
                      {updateInfo.error}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleCheckUpdate}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md active:scale-95 transition"
                    >
                      Réessayer
                    </button>
                    <a
                      href="https://github.com/nxm310/nova/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      <span>Voir sur GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : updateInfo?.hasUpdate ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Nouvelle mise à jour disponible !</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-500/40">
                          {updateInfo.latestVersion}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Version actuelle installée : <span className="font-mono text-slate-300">{updateInfo.currentVersion || 'v1.0.1'}</span>
                      </p>
                    </div>
                  </div>

                  {updateInfo.notes && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nouveautés :</label>
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                        {updateInfo.notes}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300/90 leading-relaxed flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Vos configurations (touches de commandes, clé API, profil) sont préservées automatiquement.</span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleApplyUpdate}
                      disabled={updateApplying}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait active:scale-[0.99] transition"
                    >
                      {updateApplying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mise à jour en cours (téléchargement et installation)...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Installer la mise à jour maintenant (1-Clic)</span>
                        </>
                      )}
                    </button>

                    {updateInfo.downloadUrl && (
                      <div className="text-center pt-1">
                        <a
                          href={updateInfo.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline inline-flex items-center gap-1"
                        >
                          <span>Ou télécharger directement le .zip depuis GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Votre Nova est à jour !</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Vous disposez de la version la plus récente ({updateInfo?.currentVersion || 'v1.0.1'}).
                    </p>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    Vérifier à nouveau
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
