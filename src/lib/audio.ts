// Gestionnaire Audio & Voix pour Ami PWA
import { cleanTextForSpeech } from './speechUtils';

let currentAudio: HTMLAudioElement | null = null;

let audioContext: AudioContext | null = null;

export const audioManager = {
  // --- Web Speech API (Voix système du téléphone / Siri) ---
  isWebSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  getWebSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (!this.isWebSpeechSupported()) {
        resolve([]);
        return;
      }
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 500);
    });
  },

  speakWebSpeech(
    text: string,
    options: {
      voiceURI?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    if (!this.isWebSpeechSupported()) return;

    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = options.rate || 1.2;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;

    const voices = window.speechSynthesis.getVoices();
    if (options.voiceURI) {
      const selected = voices.find((v) => v.voiceURI === options.voiceURI);
      if (selected) utterance.voice = selected;
    } else {
      const frVoice =
        voices.find((v) => v.lang.startsWith('fr') && !v.name.includes('Compact')) ||
        voices.find((v) => v.lang.startsWith('fr'));
      if (frVoice) utterance.voice = frVoice;
    }

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
  },

  stopWebSpeech(): void {
    if (this.isWebSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  // --- Lecture Audio HTML5 avec processeur d'effets Sci-Fi ---
  playAudioStream(
    src: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    options?: { robotEffect?: boolean }
  ): HTMLAudioElement {
    this.stopAll();

    const audio = new Audio(src);
    currentAudio = audio;

    // Appliquer le filtre robotique via Web Audio API si demandé
    if (options?.robotEffect && typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioCtxClass();
          }
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }

          const source = audioContext.createMediaElementSource(audio);

          // 1. Coupe-bas pour donner un son de transmetteur / synthétiseur net
          const hp = audioContext.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 350;

          // 2. Filtre résonant métallique (effet coque / robotique)
          const peak = audioContext.createBiquadFilter();
          peak.type = 'peaking';
          peak.frequency.value = 2400;
          peak.Q.value = 5.5;
          peak.gain.value = 9.0;

          // 3. Peigne de délai court (7ms) pour la résonance vocoder
          const delay = audioContext.createDelay();
          delay.delayTime.value = 0.007;

          const feedback = audioContext.createGain();
          feedback.gain.value = 0.6;

          const wetGain = audioContext.createGain();
          wetGain.gain.value = 0.55;

          const dryGain = audioContext.createGain();
          dryGain.gain.value = 0.7;

          // Chaînage
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(wetGain);

          source.connect(hp);
          hp.connect(peak);

          peak.connect(dryGain);
          peak.connect(delay);

          dryGain.connect(audioContext.destination);
          wetGain.connect(audioContext.destination);
        }
      } catch (err) {
        console.warn('Filtre robotique Web Audio non supporté, lecture normale:', err);
      }
    }

    if (onStart) audio.onplay = () => onStart();
    if (onEnd) audio.onended = () => {
      currentAudio = null;
      onEnd();
    };
    if (onError) audio.onerror = (e) => {
      currentAudio = null;
      onError(e);
    };

    audio.play().catch((err) => {
      console.warn('Lecture audio bloquée ou échouée:', err);
      if (onError) onError(err);
    });

    return audio;
  },

  stopAll(): void {
    if (this.isWebSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
  },

  // --- Reconnaissance Vocale (Dictée au micro) ---
  createSpeechRecognition(
    onResult: (transcript: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): any | null {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      onError(event.error);
    };

    recognition.onend = () => {
      onEnd();
    };

    return recognition;
  },

  // --- Reconnaissance Vocale Continue avec Détection de Silence (Mode Appel) ---
  createContinuousSpeechRecognizer(options: {
    onInterim: (text: string) => void;
    onFinalSilence: (text: string) => void;
    onError: (err: any) => void;
    silenceMs?: number;
  }): {
    start: () => void;
    stop: () => void;
    pause: () => void;
  } | null {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    let recognition: any = null;
    let silenceTimer: any = null;
    let accumulatedText = '';
    let isRunning = false;
    let shouldKeepRunning = false;
    const silenceDelay = options.silenceMs || 1400;

    const clearTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const triggerSilenceSend = () => {
      clearTimer();
      const textToSend = accumulatedText.trim();
      if (textToSend) {
        accumulatedText = '';
        options.onFinalSilence(textToSend);
      }
    };

    const initRecognition = () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch {}
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            accumulatedText += ' ' + res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        const currentFull = (accumulatedText + ' ' + currentInterim).trim();
        if (currentFull) {
          options.onInterim(currentFull);

          // Réinitialiser le décompte de silence
          clearTimer();
          silenceTimer = setTimeout(() => {
            triggerSilenceSend();
          }, silenceDelay);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          options.onError(event.error);
        }
      };

      recognition.onend = () => {
        isRunning = false;
        if (shouldKeepRunning) {
          setTimeout(() => {
            if (shouldKeepRunning && !isRunning) {
              try {
                recognition.start();
                isRunning = true;
              } catch {}
            }
          }, 200);
        }
      };
    };

    return {
      start: () => {
        shouldKeepRunning = true;
        accumulatedText = '';
        clearTimer();
        initRecognition();
        try {
          recognition.start();
          isRunning = true;
        } catch (e) {
          console.warn('Recognition start error:', e);
        }
      },
      pause: () => {
        shouldKeepRunning = false;
        clearTimer();
        if (recognition && isRunning) {
          try {
            recognition.stop();
          } catch {}
        }
        isRunning = false;
      },
      stop: () => {
        shouldKeepRunning = false;
        clearTimer();
        accumulatedText = '';
        if (recognition) {
          try {
            recognition.abort();
          } catch {}
        }
        isRunning = false;
      },
    };
  },
};
