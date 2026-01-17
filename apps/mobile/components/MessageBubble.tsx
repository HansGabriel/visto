import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import type { ChatMessage } from "../types/api";

// Types
interface MessageBubbleProps {
  message: ChatMessage;
}

// Main component
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showMediaFullscreen, setShowMediaFullscreen] = useState(false);

  if (isUser) {
    // User message (right aligned)
    return (
      <View className="flex-row justify-end mb-4 px-4">
        <View className="bg-accent-blue border-2 border-accent-pink shadow-lg shadow-accent-pink rounded-2xl px-4 py-3 max-w-[80%]">
          <Text className="text-white text-base">{message.content}</Text>
          
          {/* Media preview */}
          {message.mediaType === 'screenshot' && message.mediaUrl && (
            <Pressable onPress={() => setShowMediaFullscreen(true)} className="mt-3 rounded-lg overflow-hidden">
              <Image
                source={{ uri: message.mediaUrl }}
                style={{ width: '100%', height: 200 }}
                contentFit="contain"
                transition={200}
              />
            </Pressable>
          )}
          
          {message.mediaType === 'video' && message.mediaUrl && (
            <View className="mt-3 rounded-lg overflow-hidden">
              <Video
                source={{ uri: message.mediaUrl }}
                style={{ width: '100%', height: 200 }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay={false}
              />
            </View>
          )}
        </View>
      </View>
    );
  }

  // Assistant message (left aligned with gradient border)
  return (
    <View className="flex-row items-end mb-4 px-4">
      <View className="flex-1 mr-2">
        <View className="bg-space-purple border-2 border-accent-blue shadow-lg shadow-accent-blue rounded-2xl px-4 py-3 max-w-[85%]">
          <Text className="text-white text-base">{message.content}</Text>
          
          {/* Media preview */}
          {message.mediaType === 'screenshot' && message.mediaUrl && (
            <Pressable onPress={() => setShowMediaFullscreen(true)} className="mt-3 rounded-lg overflow-hidden">
              <Image
                source={{ uri: message.mediaUrl }}
                style={{ width: '100%', height: 200 }}
                contentFit="contain"
                transition={200}
              />
            </Pressable>
          )}
          
          {message.mediaType === 'video' && message.mediaUrl && (
            <View className="mt-3 rounded-lg overflow-hidden">
              <Video
                source={{ uri: message.mediaUrl }}
                style={{ width: '100%', height: 200 }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay={false}
              />
            </View>
          )}
        </View>
      </View>
      {/* Robot Avatar */}
      <View className="w-8 h-8 bg-accent-pink border-2 border-accent-blue shadow-lg shadow-accent-pink rounded-full items-center justify-center mb-1">
        <Text className="text-white text-lg">🤖</Text>
      </View>
      
      {/* Fullscreen media modal */}
      {message.mediaType === 'screenshot' && message.mediaUrl && (
        <Modal
          visible={showMediaFullscreen}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMediaFullscreen(false)}
        >
          <View className="flex-1 bg-black/90 items-center justify-center">
            <Pressable
              onPress={() => setShowMediaFullscreen(false)}
              className="absolute top-12 right-4 p-2"
            >
              <Text className="text-white text-2xl">✕</Text>
            </Pressable>
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}
