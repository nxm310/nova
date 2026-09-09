'use client';

import React from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  isListening?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, isListening }) => {
  if (!isPlaying && !isListening) return null;

  return (
    <div className="flex items-center gap-1 h-5 px-2 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 backdrop-blur-sm">
      <span
        className={`w-1 rounded-full ${
          isListening ? 'bg-red-400' : 'bg-accent-400'
        } animate-[wave_0.8s_ease-in-out_infinite_alternate]`}
        style={{ height: '60%', animationDelay: '0ms' }}
      />
      <span
        className={`w-1 rounded-full ${
          isListening ? 'bg-red-400' : 'bg-accent-400'
        } animate-[wave_0.9s_ease-in-out_infinite_alternate]`}
        style={{ height: '100%', animationDelay: '150ms' }}
      />
      <span
        className={`w-1 rounded-full ${
          isListening ? 'bg-red-400' : 'bg-accent-400'
        } animate-[wave_0.7s_ease-in-out_infinite_alternate]`}
        style={{ height: '75%', animationDelay: '300ms' }}
      />
      <span
        className={`w-1 rounded-full ${
          isListening ? 'bg-red-400' : 'bg-accent-400'
        } animate-[wave_1s_ease-in-out_infinite_alternate]`}
        style={{ height: '40%', animationDelay: '100ms' }}
      />
      <span className="text-[10px] font-medium text-accent-300 ml-1">
        {isListening ? 'Écoute...' : 'Parle...'}
      </span>
    </div>
  );
};
