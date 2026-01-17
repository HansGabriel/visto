import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StarField } from "../components/StarField";
import { MessageBubble } from "../components/MessageBubble";
import { AttachmentModal } from "../components/AttachmentModal";
import { RecordingOverlay } from "../components/RecordingOverlay";
import { useSession } from "../context/SessionContext";
import { useChat } from "../hooks/useChat";
import { useRecording } from "../hooks/useRecording";

// Types
interface ChatScreenProps {
  onBack: () => void;
  isConnected: boolean;
  onReconnect: () => void;
}

// Static content
const TITLE = "Desktop Assistant";
const MODEL = "Gemini Flash";
const WELCOME_MESSAGE = "How can I help? Connect and ask me anything about your computer!";

// Main component
export function ChatScreen({ onBack, isConnected, onReconnect }: ChatScreenProps) {
  const { sessionId, clearSession } = useSession();
  const [inputText, setInputText] = useState("");
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, isLoading, isSending, sendMessage, loadMessages } = useChat({
    sessionId,
    enablePolling: true,
    pollingInterval: 2000, // Poll every 2 seconds for quick updates
  });
  const { startRecording, stopRecording, isRecording } = useRecording(sessionId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  async function handleSend() {
    if (!inputText.trim() || !sessionId) {
      return;
    }

    try {
      await sendMessage(inputText.trim());
      setInputText("");
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async function handleTakeScreenshot() {
    setShowAttachmentModal(false);
    if (!sessionId) {
      return;
    }

    try {
      // Send message with screenshot request
      await sendMessage("", true); // requestScreenshot: true
    } catch (error) {
      console.error('Failed to request screenshot:', error);
    }
  }

  async function handleRecordVideo() {
    setShowAttachmentModal(false);
    if (!sessionId) {
      return;
    }

    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  async function handleStopRecording() {
    try {
      await stopRecording();
      // After stopping, send a message asking about the video
      // The video will be attached automatically by the desktop app
      await sendMessage("What happened in this recording?");
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  function handleVoiceInput() {
    console.log("Voice input - functionality to be implemented");
    // TODO: Implement voice recording
  }

  async function handleBack() {
    // Clear the current session to allow pairing with a new desktop
    try {
      await clearSession();
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
    // Navigate back
    onBack();
  }

  return (
    <SafeAreaView className="flex-1 bg-space-dark">
      <StatusBar style="light" />
      
      <StarField />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={handleBack}
          className="active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back and create new session"
          accessibilityHint="Clears current session and returns to home screen"
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
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        >
          {isLoading && messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-8">
              <ActivityIndicator size="large" color="#EC4899" />
              <Text className="text-white mt-2">Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-white text-lg mb-2">{WELCOME_MESSAGE}</Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.messageId}
                message={message}
              />
            ))
          )}
        </ScrollView>

        {/* Input Section */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="flex-1 bg-gray-800 border-2 border-accent-blue shadow-xl shadow-accent-blue rounded-full flex-row items-center px-4 py-3">
            <Pressable
              onPress={() => setShowAttachmentModal(true)}
              disabled={!sessionId || isSending || isRecording}
              className={`w-8 h-8 bg-accent-pink border border-accent-blue rounded-full items-center justify-center mr-3 active:opacity-80 active:scale-95 ${
                !sessionId || isSending || isRecording ? 'opacity-50' : ''
              }`}
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
              editable={!!sessionId && !isSending && !isRecording}
            />
            
            <Pressable
              onPress={handleVoiceInput}
              disabled={!sessionId || isSending || isRecording}
              className={`w-8 h-8 bg-accent-blue border border-accent-pink rounded-full items-center justify-center ml-3 active:opacity-80 active:scale-95 ${
                !sessionId || isSending || isRecording ? 'opacity-50' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel="Voice input"
              accessibilityHint="Record voice message"
            >
              <Ionicons name="mic" size={18} color="white" />
            </Pressable>
          </View>
            
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending || !sessionId}
              className={`w-12 h-12 rounded-full items-center justify-center active:opacity-80 active:scale-95 ${
                inputText.trim() && !isSending && sessionId
                  ? 'bg-accent-blue border-2 border-accent-pink shadow-lg shadow-accent-pink' 
                  : 'bg-gray-700 border-2 border-gray-600 opacity-50'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityHint="Send your message to the assistant"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className={inputText.trim() && sessionId ? "text-white text-2xl" : "text-gray-500 text-2xl"}>➤</Text>
              )}
            </Pressable>
          </View>
          
          {/* Connection Status */}
          <View className="items-center mt-2">
            {sessionId && isConnected ? (
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

      {/* Recording Overlay */}
      <RecordingOverlay
        isRecording={isRecording}
        duration={recordingDuration}
        onStop={handleStopRecording}
        maxDuration={30}
      />
    </SafeAreaView>
  );
}
