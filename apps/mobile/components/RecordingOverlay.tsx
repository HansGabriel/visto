import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

interface RecordingOverlayProps {
  isRecording: boolean;
  duration: number;
  onStop: () => Promise<void>;
  maxDuration?: number;
}

export function RecordingOverlay({
  isRecording,
  duration,
  onStop,
  maxDuration = 30,
}: RecordingOverlayProps) {
  const [isStopping, setIsStopping] = useState(false);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async function handleStop() {
    if (isStopping) {
      return;
    }
    setIsStopping(true);
    try {
      await onStop();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsStopping(false);
    }
  }

  if (!isRecording) {
    return null;
  }

  const progressPercent = Math.min((duration / maxDuration) * 100, 100);

  return (
    <View className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <View className="bg-black/90 border-2 border-accent-pink rounded-xl p-6 max-w-md w-full mx-4">
        {/* Recording indicator */}
        <View className="flex-row items-center justify-center gap-3 mb-4">
          <View className="w-4 h-4 rounded-full bg-red-500" style={{ opacity: 0.8 }} />
          <Text className="text-white font-medium">Recording...</Text>
        </View>

        {/* Timer */}
        <View className="items-center mb-6">
          <Text className="text-2xl font-mono text-white mb-2">
            {formatTime(duration)} / {formatTime(maxDuration)}
          </Text>
          <Text className="text-sm text-gray-400">Perform your actions on the desktop...</Text>
        </View>

        {/* Progress bar */}
        <View className="w-full bg-white/10 rounded-full h-2 mb-6 overflow-hidden">
          <View
            className="bg-accent-pink h-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        {/* Stop button */}
        <Pressable
          onPress={handleStop}
          disabled={isStopping}
          className={`w-full py-3 px-6 rounded-lg flex-row items-center justify-center gap-2 ${
            isStopping ? 'bg-gray-600 opacity-50' : 'bg-red-600 active:bg-red-700'
          }`}
        >
          {isStopping ? (
            <>
              <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              <Text className="text-white font-semibold">Stopping...</Text>
            </>
          ) : (
            <>
              <View className="w-4 h-4 rounded bg-white" />
              <Text className="text-white font-semibold">STOP REC</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
