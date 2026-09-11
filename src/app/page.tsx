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
import { macroManager, VoiceMacro } from '@/lib/voiceMacros';
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
  Gamepad2,
  Rocket,
  Shield,
  Zap,
  Clock,
  Compass,
  Radio,
  Lightbulb,
  GitCommit,
  GitBranch,
  Calendar,
  User,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

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
  const [bridgeInfo, setBridgeInfo] = useState<{ url?: string; isAdmin?: boolean; directInput?: boolean; version?: string } | null>(null);

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
    localCommit?: string;
    commit?: {
      sha?: string;
      fullSha?: string;
      message?: string;
      author?: string;
      date?: string;
      url?: string;
    };
  } | null>(null);
  const [updateToast, setUpdateToast] = useState<string | null>(null);

  // États pour le Mode Appel Mains-Libres continu
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callState, setCallState] = useState<LiveCallState>('listening');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [isCallMuted, setIsCallMuted] = useState<boolean>(false);
  const isCallMutedRef = useRef(false);

  // États du Cockpit Touch Deck (fermé par défaut à l'allumage)
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [deckFeedbackKey, setDeckFeedbackKey] = useState<string | null>(null);
  const [activeMacros, setActiveMacros] = useState<VoiceMacro[]>([]);
  const [deckCategory, setDeckCategory] = useState<'all' | 'flight' | 'systems' | 'hud'>('all');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  const recognitionRef = useRef<any>(null);
  const continuousRecognizerRef = useRef<any>(null);
  const isCallActiveRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('sc_call_muted') === 'true';
      setIsCallMuted(savedMute);
      isCallMutedRef.current = savedMute;
    }
  }, []);

  const handleToggleCallMute = () => {
    setIsCallMuted((prev) => {
      const next = !prev;
      isCallMutedRef.current = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sc_call_muted', String(next));
      }
      if (next) {
        audioManager.stopAll();
        setIsPlayingAudio(false);
        setPlayingMessageId(null);
        if (isCallActiveRef.current && callState === 'speaking') {
          setCallState('listening');
          continuousRecognizerRef.current?.start();
        }
      }
      return next;
    });
  };

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

    // Initialiser les macros Star Citizen
    setActiveMacros(macroManager.getMacros());

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
        const remoteVer = res.info.version || res.info.appVersion;
        setBridgeInfo({
          url: res.url,
          isAdmin: res.info.isAdmin,
          directInput: res.info.directInput,
          version: remoteVer,
        });

        // Détection de cache obsolète dans le navigateur :
        // Si le pont PC tourne sur une version différente du bundle local en cache,
        // forcer immédiatement le rechargement sans cache pour afficher la bonne version !
        if (remoteVer && remoteVer !== APP_VERSION) {
          const reloadKey = `nova_cache_refresh_${remoteVer}`;
          if (typeof window !== 'undefined' && !sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, '1');
            console.log(`🔄 [NOVA] Version pont PC (${remoteVer}) différente du cache (${APP_VERSION}). Actualisation automatique...`);
            window.location.href = window.location.pathname + '?v=' + Date.now();
            return;
          }
        }
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

  // --- Mise à Jour Automatique 1-Clic & Inspection Commit ---
  const handleCheckUpdate = async () => {
    setIsUpdateModalOpen(true);
    setUpdateChecking(true);
    setUpdateToast(null);
    try {
      const bridgeUrl = macroManager.getBridgeUrl();
      let bridgeData: any = null;
      try {
        const res = await fetch(`${bridgeUrl}/update/check`);
        if (res.ok) {
          bridgeData = await res.json();
        }
      } catch (be) {
        console.warn('Pont PC non joignable pour /update/check, repli direct GitHub:', be);
      }

      // 1. Récupérer le dernier commit GitHub en direct
      let commitData: any = bridgeData?.commit || null;
      if (!commitData || !commitData.message) {
        try {
          const cRes = await fetch('https://api.github.com/repos/nxm310/nova/commits/main');
          if (cRes.ok) {
            const cJson = await cRes.json();
            commitData = {
              sha: cJson.sha ? cJson.sha.slice(0, 7) : '',
              fullSha: cJson.sha || '',
              message: cJson.commit?.message || '',
              author: cJson.commit?.author?.name || 'Contributeur Nova',
              date: cJson.commit?.author?.date || '',
              url: cJson.html_url || '',
            };
          }
        } catch (ce) {
          console.warn('Erreur interrogation commit GitHub:', ce);
        }
      }

      // 2. Récupérer la dernière release GitHub
      let releaseTag = bridgeData?.latestVersion || '';
      let releaseNotes = bridgeData?.notes || '';
      let downloadUrl = bridgeData?.downloadUrl || '';

      if (!releaseTag || releaseTag === 'v1.0.0' || releaseTag === '1.0.0') {
        try {
          const ghRes = await fetch('https://api.github.com/repos/nxm310/nova/releases/latest');
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            releaseTag = ghData.tag_name || `v${APP_VERSION}`;
            if (!releaseNotes) releaseNotes = ghData.body || '';
            for (const a of ghData.assets || []) {
              if (a.name?.endsWith('.zip')) {
                downloadUrl = a.browser_download_url;
                break;
              }
            }
          }
        } catch (re) {
          console.warn('Erreur interrogation release GitHub:', re);
        }
      }

      const cleanTag = (releaseTag || APP_VERSION).replace(/^v/, '');
      const hasUpdate = (bridgeData && bridgeData.hasUpdate !== undefined)
        ? bridgeData.hasUpdate
        : (cleanTag !== APP_VERSION);

      setUpdateInfo({
        success: true,
        hasUpdate,
        currentVersion: APP_VERSION,
        latestVersion: cleanTag,
        notes: releaseNotes || commitData?.message || '',
        downloadUrl: downloadUrl || 'https://github.com/nxm310/nova/releases/download/v1.0.1/Nova-StarCitizen-Windows.zip',
        commit: commitData,
        localCommit: bridgeData?.localCommit || '',
      });
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
        setUpdateToast(data.message || "✓ Mise à jour appliquée avec succès ! Nova redémarre...");
        setTimeout(() => {
          window.location.href = window.location.pathname + '?v=' + Date.now();
        }, 3200);
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

    // 3. Google / Gemini Audio Natif
    if (profile.voiceProvider === 'gemini') {
      const apiKey = storage.getApiKey() || '';
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

        if (isCallMutedRef.current) {
          // Mode silencieux : afficher la réponse par écrit sans vocaliser
          setLiveTranscript('');
          setCallState('listening');
          continuousRecognizerRef.current?.start();
        } else {
          setCallState('speaking');
          playSpeech(botReply, botMessage.id, () => {
            if (isCallActiveRef.current) {
              setLiveTranscript('');
              setCallState('listening');
              continuousRecognizerRef.current?.start();
            }
          });
        }
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
        const matchingMacro = macroManager.getMacros().find(m => m.key.toLowerCase() === keyToPress.toLowerCase());
        const durSec = isHold
          ? (matchingMacro?.holdDuration || 1.5)
          : ((matchingMacro?.tapDurationMs || 180) / 1000);
        console.log(`🎮 [ACTION IA STAR CITIZEN] Touche détectée : [${keyToPress}] (${isHold ? `APPUI LONG ${durSec}s` : `APPUI COURT ${Math.round(durSec * 1000)}ms`}) ➔ Envoi au pont PC...`);
        macroManager.sendKeyToBridge(keyToPress, isHold ? 'hold' : 'tap', durSec);
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

      if (isCallMutedRef.current) {
        // Mode silencieux : afficher la réponse par écrit sans vocaliser
        setLiveTranscript('');
        setCallState('listening');
        continuousRecognizerRef.current?.start();
      } else {
        setCallState('speaking');

        playSpeech(displayReply, botMessage.id, () => {
          // Une fois la lecture audio finie : relancer automatiquement l'écoute !
          if (isCallActiveRef.current) {
            setLiveTranscript('');
            setCallState('listening');
            continuousRecognizerRef.current?.start();
          }
        });
      }
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
        const matchingMacro = macroManager.getMacros().find(m => m.key.toLowerCase() === keyToPress.toLowerCase());
        const durSec = isHold
          ? (matchingMacro?.holdDuration || 1.5)
          : ((matchingMacro?.tapDurationMs || 180) / 1000);
        console.log(`🎮 [ACTION IA STAR CITIZEN] Touche détectée : [${keyToPress}] (${isHold ? `APPUI LONG ${durSec}s` : `APPUI COURT ${Math.round(durSec * 1000)}ms`}) ➔ Envoi au pont PC...`);
        macroManager.sendKeyToBridge(keyToPress, isHold ? 'hold' : 'tap', durSec);
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

  const handleDeckTrigger = async (macro: VoiceMacro) => {
    setDeckFeedbackKey(macro.id);
    try {
      const durSec =
        macro.pressType === 'hold'
          ? (macro.holdDuration || 1.5)
          : ((macro.tapDurationMs || 180) / 1000);
      await macroManager.sendKeyToBridge(macro.key, macro.pressType, durSec);
      if (profile.autoPlayVoice) {
        playSpeech(`Action ${macro.name}`);
      }
    } catch (err) {
      console.error('Erreur exécution macro cockpit:', err);
    } finally {
      setTimeout(() => setDeckFeedbackKey(null), 600);
    }
  };

  const getMacroCategory = (m: VoiceMacro): 'flight' | 'systems' | 'hud' => {
    const k = m.key.toLowerCase();
    const id = m.id.toLowerCase();
    if (k.startsWith('f') || id.includes('mobiglas') || id.includes('starmap') || id.includes('camera') || id.includes('comms')) {
      return 'hud';
    }
    if (
      id.includes('power') ||
      id.includes('engine') ||
      id.includes('flight') ||
      id.includes('gear') ||
      id.includes('landing') ||
      id.includes('vtol') ||
      id.includes('decouple') ||
      id.includes('cruise') ||
      id.includes('seat')
    ) {
      return 'flight';
    }
    return 'systems';
  };

  const displayedMacros = activeMacros.filter((m) => {
    if (!m.enabled) return false;
    if (deckCategory === 'all') return true;
    return getMacroCategory(m) === deckCategory;
  });

  const currentPreset = PERSONALITY_PRESETS.find((p) => p.id === profile.presetId);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden relative selection:bg-cyan-500/30">
      {/* HEADER COCKPIT ÉPURÉ, UNIFORME & ÉQUILIBRÉ */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl z-30 safe-top select-none shrink-0 gap-2">
        {/* Section GAUCHE : Identité Co-Pilote & Pont PC */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border transition-all duration-300 ${
                isPlayingAudio
                  ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-105'
                  : 'border-slate-700/80'
              }`}
            >
              {profile.avatar}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                isPlayingAudio
                  ? 'bg-cyan-400 animate-pulse'
                  : isRecording
                  ? 'bg-rose-400 animate-ping'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-white tracking-tight truncate">
                {profile.name}
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-medium border border-cyan-500/20 uppercase tracking-wider">
                {currentPreset?.name.split('&')[0].trim() || 'Co-Pilote'}
              </span>
              {/* Bouton de synchronisation et vérification de version */}
              <button
                type="button"
                onClick={handleCheckUpdate}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-bold transition active:scale-95 group cursor-pointer"
                title="Cliquer pour vérifier si la version est à jour"
              >
                <span>v{bridgeInfo?.version || APP_VERSION}</span>
                <RefreshCw className={`w-2.5 h-2.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-500 ${updateChecking ? 'animate-spin text-cyan-200' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <AudioVisualizer isPlaying={isPlayingAudio} isListening={isRecording} />
              {/* Statut Pont PC Clavier */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border transition ${
                  bridgeConnected === true
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : bridgeConnected === false
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 animate-pulse'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                }`}
                title={
                  bridgeConnected === true
                    ? `✓ Pont PC actif (Port 5005). Vos ordres vocaux commandent Star Citizen !`
                    : `⚠️ Pont PC déconnecté. Cliquez pour voir comment lancer DEMARRER_NOVA.bat sur votre PC.`
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    bridgeConnected === true
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                      : bridgeConnected === false
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {bridgeConnected === true
                    ? 'Pont PC Prêt'
                    : bridgeConnected === false
                    ? 'Pont Déconnecté'
                    : 'Pont PC...'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section CENTRE : Actions Principales Cockpit (hauteur uniforme h-9) */}
        <div className="flex items-center gap-1.5">
          {/* Bascule Cockpit Touch Deck (Sidebar) */}
          <button
            type="button"
            onClick={() => setIsDeckOpen(!isDeckOpen)}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5 ${
              isDeckOpen
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-cyan-500/15'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300'
            }`}
            title={isDeckOpen ? 'Masquer le Touch Deck des touches' : 'Afficher le Touch Deck des touches Star Citizen'}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Commandes Vaisseau</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-400 border border-slate-700">
              {activeMacros.filter((m) => m.enabled).length}
            </span>
          </button>

          {/* Bouton Appel Direct Mains-Libres */}
          <button
            type="button"
            onClick={startHandsFreeCall}
            className="h-9 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 active:scale-95 transition flex items-center gap-1.5"
            title="Démarrer un appel vocal direct sans avoir à appuyer sur les boutons"
          >
            <Phone className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
            <span className="hidden sm:inline">Appel Direct</span>
            <span className="sm:hidden">Appel</span>
          </button>

          {/* Bouton Partage / Vision Écran */}
          <button
            type="button"
            onClick={handleToggleVision}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold shadow-sm active:scale-95 transition flex items-center gap-1.5 ${
              isVisionActive
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300'
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
            <span className="hidden md:inline">
              {isVisionActive ? 'Vision ON' : 'Vision'}
            </span>
          </button>
        </div>

        {/* Section DROITE : Utilitaires & Configuration (hauteur uniforme h-9) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bascule lecture auto voix */}
          <button
            type="button"
            onClick={() => {
              const updated = { ...profile, autoPlayVoice: !profile.autoPlayVoice };
              setProfile(updated);
              storage.saveProfile(updated);
            }}
            title={profile.autoPlayVoice ? 'Voix activée (cliquer pour couper)' : 'Voix coupée (cliquer pour activer)'}
            className={`w-9 h-9 rounded-xl border transition active:scale-95 flex items-center justify-center ${
              profile.autoPlayVoice
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {profile.autoPlayVoice ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Bouton Effacer la conversation */}
          <button
            type="button"
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
            className="w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-red-500/20 hover:border-red-500/40 border border-slate-700/60 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition active:scale-95 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Touche Sauvegarde Rapide */}
          <button
            type="button"
            onClick={handleQuickSave}
            className="hidden sm:flex w-9 h-9 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition active:scale-95 items-center justify-center"
            title="Sauvegarder mes réglages (touches, profil, clé API) dans un fichier .json"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Touche Restauration Rapide */}
          <label
            className="hidden sm:flex w-9 h-9 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 transition active:scale-95 cursor-pointer items-center justify-center"
            title="Restaurer mes réglages depuis un fichier de sauvegarde (.json)"
          >
            <FolderOpen className="w-4 h-4" />
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleQuickRestore}
              className="hidden"
            />
          </label>

          <div className="h-4 w-px bg-slate-800 hidden sm:block mx-0.5" />

          {/* Touche Mise à Jour Automatique 1-Clic */}
          <button
            type="button"
            onClick={handleCheckUpdate}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 text-xs font-semibold shadow-sm active:scale-95 transition flex items-center gap-1.5"
            title="Rechercher et synchroniser les mises à jour"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-300 shrink-0 ${updateChecking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Mise à jour</span>
          </button>

          {/* Bouton Paramètres */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-200 transition active:scale-95 flex items-center justify-center"
            title="Paramètres de Nova & Touches"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast de confirmation de sauvegarde */}
      {quickSaveToast && (
        <div className="fixed top-16 right-5 z-50 animate-fade-in bg-purple-950/95 text-purple-100 border border-purple-500 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ Réglages sauvegardés dans vos Téléchargements</span>
        </div>
      )}

      {/* Toast de confirmation de mise à jour */}
      {updateToast && (
        <div className="fixed top-16 right-5 z-50 animate-fade-in bg-blue-950/95 text-blue-100 border border-blue-500 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{updateToast}</span>
        </div>
      )}

      {/* CORPS PRINCIPAL DU COCKPIT : TOUCH DECK + CHAT STREAM */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* SIDEBAR COCKPIT TOUCH DECK */}
        <aside
          className={`${
            isDeckOpen ? 'flex' : 'hidden'
          } absolute inset-y-0 left-0 z-20 w-72 sm:w-80 lg:relative lg:flex flex-col border-r border-slate-800 bg-slate-950/95 lg:bg-slate-900/40 backdrop-blur-xl shrink-0 transition-all duration-300`}
        >
          {/* Deck Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Cockpit Deck
                </h2>
                <p className="text-[10px] text-slate-400">Star Citizen Raccourcis</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 transition"
                title="Modifier les touches dans les paramètres"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsDeckOpen(false)}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white transition"
                title="Fermer le deck"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Onglets Filtres Catégories */}
          <div className="p-2 border-b border-slate-800/60 flex items-center gap-1 text-[11px]">
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
                onClick={() => setDeckCategory(tab.id)}
                className={`flex-1 py-1 px-1.5 rounded-lg font-medium text-center transition ${
                  deckCategory === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Liste Scrollable des Touches Cockpit */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
            {displayedMacros.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Aucune commande active dans cette catégorie.
              </div>
            ) : (
              displayedMacros.map((macro) => {
                const isTriggered = deckFeedbackKey === macro.id;
                const isHold = macro.pressType === 'hold';

                return (
                  <button
                    key={macro.id}
                    onClick={() => handleDeckTrigger(macro)}
                    className={`w-full text-left p-2 rounded-xl border transition-all duration-150 relative overflow-hidden group select-none ${
                      isTriggered
                        ? 'bg-cyan-500/30 border-cyan-400 scale-[0.98] shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-cyan-500/40'
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

                    {macro.phrases[0] && (
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

          {/* Footer Deck */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Pont 5005</span>
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              <span>Personnaliser</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </aside>

        {/* ZONE CENTRALE : CHAT STREAM & HUD COCKPIT */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 relative">
          {/* Grille d'arrière-plan cockpit subtile */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #06b6d4 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* ZONE DE CHAT SCROLLABLE */}
          <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative z-10">
            <div className="max-w-4xl mx-auto w-full">
              {messages.length === 0 ? (
                /* ACCUEIL HOLOGRAPHIQUE STAR CITIZEN */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-6 animate-fade-in space-y-6">
                  {/* Hologram Avatar Orb */}
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-600/30 via-indigo-600/30 to-purple-600/30 border border-cyan-500/40 flex items-center justify-center text-4xl shadow-2xl shadow-cyan-500/20">
                      {profile.avatar}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
                      Système de Bord & Co-Pilote {profile.name}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      Contrôle vocal direct de Star Citizen, exécution de macros clavier et analyse IA en temps réel.
                    </p>
                  </div>

                  {/* Badges d'état rapide */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Touches Star Citizen Prêtes</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <Mic className="w-3 h-3 text-emerald-400" />
                      <span>Reconnaissance Vocale Directe</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <Phone className="w-3 h-3 text-indigo-400" />
                      <span>Mode Appel Mains-Libres</span>
                    </div>
                  </div>

                  {/* Actions Rapides Vocales (Star Citizen Chips) */}
                  <div className="w-full max-w-lg space-y-2 pt-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      Ordres de vol recommandés (cliquez ou dites-les) :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          title: 'Allumer le vaisseau',
                          prompt: 'Allume le vaisseau',
                          key: 'U',
                          icon: Rocket,
                        },
                        {
                          title: "Train d'atterrissage",
                          prompt: "Rentre le train d'atterrissage",
                          key: 'N',
                          icon: Shield,
                        },
                        {
                          title: 'Phares du vaisseau',
                          prompt: 'Allume les phares',
                          key: 'L',
                          icon: Lightbulb,
                        },
                        {
                          title: 'Tour ATC (Atterrissage)',
                          prompt: "Demande l'atterrissage à la tour",
                          key: 'ALT+N',
                          icon: Radio,
                        },
                        {
                          title: 'Carte Stellaire (StarMap)',
                          prompt: 'Ouvre la carte stellaire',
                          key: 'F2',
                          icon: Compass,
                        },
                        {
                          title: 'Moteur Quantique',
                          prompt: 'Active le mode quantum',
                          key: 'B',
                          icon: Zap,
                        },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(action.prompt)}
                          className="text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 transition flex items-center justify-between group shadow-sm"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <action.icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate font-medium">{action.prompt}</span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-300 shrink-0 ml-1">
                            {action.key}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* CHAT MESSAGES */
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isPlayingThis = isPlayingAudio && playingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 mb-4 animate-fade-in ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-base bg-slate-800 border border-slate-700 mt-1 shadow-md">
                          {profile.avatar}
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                          isUser
                            ? 'bg-gradient-to-br from-cyan-600 to-indigo-600 text-white rounded-br-sm'
                            : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-sm backdrop-blur-md'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap selection:bg-cyan-400/30">
                          {msg.content}
                        </p>

                        {/* Actions sous le message compagnon */}
                        {!isUser && (
                          <div className="flex items-center justify-between gap-3 mt-2 pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                            <button
                              onClick={() => playSpeech(msg.content, msg.id)}
                              className={`flex items-center gap-1 hover:text-white transition px-1.5 py-0.5 rounded ${
                                isPlayingThis ? 'text-cyan-400 font-semibold' : ''
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <Square className="w-3 h-3 text-rose-400" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 text-cyan-400" />
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
                          <div className="text-[10px] text-cyan-200 text-right mt-1 opacity-80">
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
                <div className="flex gap-3 items-start animate-fade-in mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base bg-slate-800 border border-slate-700">
                    {profile.avatar}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>{profile.name} analyse les systèmes...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </main>

          {/* BARRE DE SAISIE INFERIEURE FLOTTANTE COCKPIT */}
          <footer className="p-3 md:p-4 bg-slate-900/90 border-t border-slate-800/90 backdrop-blur-xl safe-bottom shrink-0 relative z-20">
            <div className="max-w-4xl mx-auto w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Bouton Microphone avec effet sonar */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`p-2.5 md:p-3 rounded-xl border transition flex-shrink-0 relative ${
                    isRecording
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-lg shadow-rose-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title={isRecording ? 'Arrêter la dictée' : 'Parler au micro'}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Champ de commande */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isRecording
                        ? 'Écoute en cours...'
                        : `Ordre de vol ou message pour ${profile.name}...`
                    }
                    className="w-full px-4 py-2.5 md:py-3 bg-slate-950 border border-slate-700/80 rounded-xl focus:outline-none focus:border-cyan-500 text-sm text-white placeholder-slate-500 transition shadow-inner font-sans"
                  />
                </div>

                {/* Bouton Envoyer */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 md:p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition shadow-lg shadow-cyan-600/30 flex-shrink-0"
                  title="Envoyer la commande"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </footer>
        </div>
      </div>

      {/* Prompt d'installation PWA mobile */}
      <PWAInstallPrompt />

      {/* Modal des Paramètres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveMacros(macroManager.getMacros());
        }}
        profile={profile}
        onSaveProfile={(newProf) => {
          setProfile(newProf);
          storage.saveProfile(newProf);
          setActiveMacros(macroManager.getMacros());
        }}
        memories={memories}
        onUpdateMemories={(newMems) => setMemories(newMems)}
        onClearHistory={() => {
          updateMessages([]);
          storage.clearMessages();
        }}
        onCheckUpdate={handleCheckUpdate}
        currentVersion={bridgeInfo?.version || APP_VERSION}
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
        isMuted={isCallMuted}
        onToggleMute={handleToggleCallMute}
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
            <div className="p-5 overflow-y-auto space-y-4 max-h-[80vh] custom-scrollbar">
              {updateChecking ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm text-slate-300 font-medium">Vérification de la version & des commits GitHub...</p>
                  <p className="text-xs text-slate-500">Connexion au dépôt nxm310/nova</p>
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
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md active:scale-95 transition"
                    >
                      Réessayer
                    </button>
                    <a
                      href="https://github.com/nxm310/nova/commits/main"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline"
                    >
                      <span>Voir les commits sur GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cartouche d'état de version */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Version installée :</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs font-bold">
                          v{bridgeInfo?.version || updateInfo?.currentVersion || APP_VERSION}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Dernière version GitHub :</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-xs font-bold">
                          v{updateInfo?.latestVersion || APP_VERSION}
                        </span>
                      </div>
                    </div>

                    <div>
                      {updateInfo?.hasUpdate ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold shadow-sm animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Mise à jour disponible</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Application à jour</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CADRE DU DERNIER COMMIT ET DÉTAIL DES MODIFICATIONS */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-inner">
                    {/* Header du Commit */}
                    <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <GitCommit className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Dernier Déploiement GitHub
                        </span>
                      </div>

                      {updateInfo?.commit?.sha && (
                        <a
                          href={updateInfo.commit.url || `https://github.com/nxm310/nova/commit/${updateInfo.commit.fullSha}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono hover:bg-cyan-900/60 transition"
                          title="Voir ce commit sur GitHub"
                        >
                          <span>Commit {updateInfo.commit.sha}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Détails Auteur & Date */}
                    {updateInfo?.commit && (
                      <div className="px-3.5 py-2 border-b border-slate-800/60 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 bg-slate-900/40">
                        {updateInfo.commit.author && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Par <strong className="text-slate-200">{updateInfo.commit.author}</strong></span>
                          </div>
                        )}
                        {updateInfo.commit.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(updateInfo.commit.date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}{' '}
                              à{' '}
                              {new Date(updateInfo.commit.date).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Corps & Description complète de toutes les modifications */}
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Description des modifications :</span>
                        </label>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed selection:bg-cyan-500/30 custom-scrollbar">
                        {updateInfo?.notes || updateInfo?.commit?.message || "Aucune note additionnelle de commit."}
                      </div>
                    </div>
                  </div>

                  {/* Note de persistance */}
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 leading-relaxed flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Vos configurations, macros clavier et clés API sont conservées dans{' '}
                      <strong className="text-white font-mono text-[11px]">%APPDATA%\Nova\nova_config.json</strong>.
                    </span>
                  </div>

                  {/* Boutons d'Action */}
                  <div className="pt-2 space-y-2">
                    {updateInfo?.hasUpdate ? (
                      <button
                        onClick={handleApplyUpdate}
                        disabled={updateApplying}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait active:scale-[0.99] transition"
                      >
                        {updateApplying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mise à jour en cours d'application...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Installer la mise à jour maintenant (1-Clic)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckUpdate}
                        disabled={updateChecking}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${updateChecking ? 'animate-spin text-cyan-400' : ''}`} />
                        <span>Re-vérifier les mises à jour sur GitHub</span>
                      </button>
                    )}

                    {updateInfo?.downloadUrl && (
                      <div className="text-center pt-1">
                        <a
                          href={updateInfo.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-400 hover:text-cyan-300 underline inline-flex items-center gap-1 transition"
                        >
                          <span>Ou télécharger directement le .zip depuis GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
