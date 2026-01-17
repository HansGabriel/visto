import React from "react";
import { View, Text } from "react-native";

// Types
interface MessageBubbleProps {
  message: string;
  isUser?: boolean;
}

// Main component
export function MessageBubble({ message, isUser = false }: MessageBubbleProps) {
  if (isUser) {
    // User message (right aligned)
    return (
      <View className="flex-row justify-end mb-4 px-4">
        <View className="bg-accent-blue border-2 border-accent-pink shadow-lg shadow-accent-pink rounded-2xl px-4 py-3 max-w-[80%]">
          <Text className="text-white text-base">{message}</Text>
        </View>
      </View>
    );
  }

  // Assistant message (left aligned with gradient border)
  return (
    <View className="flex-row items-end mb-4 px-4">
      <View className="flex-1 mr-2">
        <View className="bg-space-purple border-2 border-accent-blue shadow-lg shadow-accent-blue rounded-2xl px-4 py-3 max-w-[85%]">
          <Text className="text-white text-base">{message}</Text>
        </View>
      </View>
      {/* Robot Avatar */}
      <View className="w-8 h-8 bg-accent-pink border-2 border-accent-blue shadow-lg shadow-accent-pink rounded-full items-center justify-center mb-1">
        <Text className="text-white text-lg">🤖</Text>
      </View>
    </View>
  );
}
