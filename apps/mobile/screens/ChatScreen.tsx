import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StarField } from "../components/StarField";
import { MessageBubble } from "../components/MessageBubble";
import { AttachmentModal } from "../components/AttachmentModal";

// Types
interface ChatScreenProps {
  onBack: () => void;
  isConnected: boolean;
  onReconnect: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

// Static content
const TITLE = "Desktop Assistant";
const MODEL = "Gemini Flash";
const WELCOME_MESSAGE = "How can I help? Connect and ask me anything about your computer!";

// Main component
export function ChatScreen({ onBack, isConnected, onReconnect }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: WELCOME_MESSAGE, isUser: false }
  ]);
  const [inputText, setInputText] = useState("");
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  function handleSend() {
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true
    };
    
    setMessages([...messages, userMessage]);
    setInputText("");
    
    // TODO: Send to backend and get response
    // For demo, add a mock response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I received your message! This is a demo response.",
        isUser: false
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  }

  function handleTakeScreenshot() {
    setShowAttachmentModal(false);
    console.log("Take screenshot - functionality to be implemented");
    // TODO: Implement screenshot capture
  }

  function handleRecordVideo() {
    setShowAttachmentModal(false);
    console.log("Record video - functionality to be implemented");
    // TODO: Implement video recording
  }

  function handleVoiceInput() {
    console.log("Voice input - functionality to be implemented");
    // TODO: Implement voice recording
  }

  return (
    <SafeAreaView className="flex-1 bg-space-dark">
      <StatusBar style="light" />
      
      <StarField />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={onBack}
          className="active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        
        <Text 
          className="text-white text-lg font-bold"
          accessibilityRole="header"
        >
          {TITLE}
        </Text>
        
        <View className="bg-gray-700 border border-accent-blue shadow-lg shadow-accent-blue px-2 py-1 rounded">
          <Text className="text-white text-xs font-semibold">JS</Text>
        </View>
      </View>

      {/* Assistant Info */}
      <View className="px-6 py-3 flex-row items-center border-b border-gray-800">
        <View className="w-10 h-10 bg-accent-pink border-2 border-accent-blue shadow-lg shadow-accent-pink rounded-full items-center justify-center mr-3">
          <Text className="text-white text-xl">🤖</Text>
        </View>
        <View>
          <Text className="text-white font-semibold">{TITLE}</Text>
          <Text className="text-gray-400 text-sm">Model: {MODEL}</Text>
        </View>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message.text}
              isUser={message.isUser}
            />
          ))}
        </ScrollView>

        {/* Input Section */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="flex-1 bg-gray-800 border-2 border-accent-blue shadow-xl shadow-accent-blue rounded-full flex-row items-center px-4 py-3">
            <Pressable
              onPress={() => setShowAttachmentModal(true)}
              className="w-8 h-8 bg-accent-pink border border-accent-blue rounded-full items-center justify-center mr-3 active:opacity-80 active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              accessibilityHint="Attach screenshot or video"
            >
              <Text className="text-white text-lg">+</Text>
            </Pressable>
            
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-white text-base"
              multiline
              maxLength={500}
              textAlignVertical="center"
            />
            
            <Pressable
              onPress={handleVoiceInput}
              className="w-8 h-8 bg-accent-blue border border-accent-pink rounded-full items-center justify-center ml-3 active:opacity-80 active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Voice input"
              accessibilityHint="Record voice message"
            >
              <Ionicons name="mic" size={18} color="white" />
            </Pressable>
          </View>
            
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              className={`w-12 h-12 rounded-full items-center justify-center active:opacity-80 active:scale-95 ${
                inputText.trim() 
                  ? 'bg-accent-blue border-2 border-accent-pink shadow-lg shadow-accent-pink' 
                  : 'bg-gray-700 border-2 border-gray-600 opacity-50'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityHint="Send your message to the assistant"
            >
              <Text className={inputText.trim() ? "text-white text-2xl" : "text-gray-500 text-2xl"}>➤</Text>
            </Pressable>
          </View>
          
          {/* Connection Status */}
          <View className="items-center mt-2">
            {isConnected ? (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-white text-sm">Online</Text>
              </View>
            ) : (
              <Pressable onPress={onReconnect} className="active:opacity-70">
                <Text className="text-accent-pink text-sm">Reconnect to desktop</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Modal */}
      <AttachmentModal
        visible={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        onTakeScreenshot={handleTakeScreenshot}
        onRecordVideo={handleRecordVideo}
      />
    </SafeAreaView>
  );
}
