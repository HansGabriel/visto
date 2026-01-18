import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { StarField } from "../components/StarField";
import { MessageBubble } from "../components/MessageBubble";
import { useSession } from "../context/SessionContext";
import { useChat } from "../hooks/useChat";
import { API_ENDPOINTS } from "../utils/constants";

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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const { messages, isLoading, isSending, sendMessage, loadMessages } = useChat({
    sessionId,
    enablePolling: true,
    pollingInterval: 2000, // Poll every 2 seconds for quick updates
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Recording timer for voice input
  useEffect(() => {
    if (isRecordingVoice) {
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
  }, [isRecordingVoice]);

  async function handleSend() {
    if (!inputText.trim() || !sessionId) {
      return;
    }

    const messageText = inputText.trim();
    setInputText("");

    try {
      // Request screenshot first, then send message with screenshot
      let screenshotUrl: string | undefined;
      let storageId: string | undefined;
      
      console.log('📸 Requesting screenshot before sending message...');
      try {
        const requestResponse = await fetch(API_ENDPOINTS.CHAT_REQUEST_SCREENSHOT(sessionId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (requestResponse.ok) {
          const { requestId } = await requestResponse.json();
          console.log('📸 Screenshot request created, requestId:', requestId);
          
          // Poll for screenshot - wait longer to ensure it's captured
          // Desktop polls every 2 seconds, so we need to wait longer
          let attempts = 0;
          const maxAttempts = 30; // Increased to 30 attempts (15 seconds total)
          // Wait 1.5 seconds before first poll to give desktop time to poll and capture
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          while (attempts < maxAttempts) {
            if (attempts > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            attempts++;
            
            try {
              const resultResponse = await fetch(API_ENDPOINTS.CHAT_GET_SCREENSHOT_RESULT(sessionId, requestId), {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (resultResponse.ok) {
                const result = await resultResponse.json();
                if (result.screenshotUrl && result.screenshotUrl.length > 0) {
                  // Validate screenshot URL format
                  if (result.screenshotUrl.startsWith('data:image/') || result.screenshotUrl.startsWith('http')) {
                    screenshotUrl = result.screenshotUrl;
                    storageId = result.storageId;
                    console.log('✅ Screenshot captured successfully, URL length:', result.screenshotUrl.length, 'has storageId:', !!storageId);
                    break;
                  } else {
                    console.warn('⚠️ Invalid screenshot URL format:', result.screenshotUrl.substring(0, 50));
                  }
                } else {
                  console.warn('⚠️ Screenshot URL is empty in response');
                }
              } else if (resultResponse.status === 404) {
                // Still waiting for screenshot
                if (attempts % 3 === 0) {
                  console.log(`📸 Waiting for screenshot... (attempt ${attempts}/${maxAttempts})`);
                }
                continue;
              } else {
                console.warn('⚠️ Unexpected response status when fetching screenshot:', resultResponse.status);
              }
            } catch (error) {
              console.warn('Error fetching screenshot result:', error);
            }
          }
          
          if (!screenshotUrl) {
            console.warn('⚠️ Screenshot not captured within timeout (', maxAttempts, 'attempts), sending message without it');
          } else {
            console.log('✅ Screenshot ready, proceeding to send message');
          }
        } else {
          const errorText = await requestResponse.text().catch(() => 'Unknown error');
          console.warn('⚠️ Failed to create screenshot request:', requestResponse.status, errorText);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Failed to get screenshot, sending message without it:', errorMessage);
      }
      
      // Send message with screenshot (if available)
      // IMPORTANT: Always include screenshot if we have it, even if it's just the base64 URL
      const finalScreenshotUrl = screenshotUrl && screenshotUrl.length > 0 ? screenshotUrl : undefined;
      const finalStorageId = storageId && storageId.length > 0 ? storageId : undefined;
      
      console.log('📤 Sending message:', {
        hasText: !!messageText && messageText.length > 0,
        hasScreenshotUrl: !!finalScreenshotUrl,
        hasStorageId: !!finalStorageId,
        screenshotUrlLength: finalScreenshotUrl?.length || 0,
      });
      
      if (finalScreenshotUrl) {
        console.log('📸 Screenshot URL preview:', finalScreenshotUrl.substring(0, 50) + '...');
      }
      
      // Ensure we always send the message, even if screenshot failed
      // But if we have a screenshot, make sure it's included
      try {
        await sendMessage(
          messageText,
          false, // requestScreenshot - we already requested it above
          finalScreenshotUrl, // screenshotUrl - include if we have it
          undefined, // videoUrl
          finalScreenshotUrl, // mediaPreviewUrl - same as screenshotUrl for preview
          finalStorageId // storageId - include if we have it
        );
        console.log('✅ Message sent successfully');
      } catch (sendError) {
        console.error('❌ Failed to send message:', sendError);
        throw sendError; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(messageText); // Restore text on error
    }
  }

  async function handleVoiceInput() {
    if (isRecordingVoice) {
      // Stop recording
      try {
        if (recordingRef.current) {
          // Check recording status first
          const status = await recordingRef.current.getStatusAsync();
          
          if (status.isRecording) {
            // Stop the recording
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            
            // Clean up
            recordingRef.current = null;
            setIsRecordingVoice(false);
            
            if (uri) {
              // Transcribe audio to text
              await transcribeAudio(uri);
            }
          } else {
            // Already stopped, just clean up
            recordingRef.current = null;
            setIsRecordingVoice(false);
          }
        } else {
          // No recording ref, just reset state
          setIsRecordingVoice(false);
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
        // Force cleanup on error
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (e) {
            // Ignore cleanup errors
          }
          recordingRef.current = null;
        }
        setIsRecordingVoice(false);
        Alert.alert('Error', 'Failed to stop recording');
      }
    } else {
      // Start recording
      try {
        const permissionResponse = await Audio.requestPermissionsAsync();
        if (!permissionResponse.granted) {
          Alert.alert('Permission Denied', 'Microphone permission is required for voice input.');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecordingVoice(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    }
  }

  async function transcribeAudio(uri: string) {
    try {
      // Read the audio file and send to server for transcription
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      
      // Send to server for transcription
      const apiUrl = API_ENDPOINTS.CHAT_SEND_MESSAGE(sessionId || '').replace('/message', '/transcribe');
      const transcriptionResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (transcriptionResponse.ok) {
        const { transcription } = await transcriptionResponse.json();
        if (transcription) {
          setInputText(transcription);
        } else {
          Alert.alert('No transcription', 'Could not transcribe audio. Please try again or type your message.');
        }
      } else {
        throw new Error('Transcription failed');
      }
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please type your message instead.');
    }
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
            messages.map((message, index) => (
              <MessageBubble
                key={`${message.messageId}-${index}`}
                message={message}
              />
            ))
          )}
        </ScrollView>

        {/* Input Section */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="flex-1 bg-gray-800 border-2 border-accent-blue shadow-xl shadow-accent-blue rounded-full flex-row items-center px-4 py-3">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-white text-base"
              multiline
              maxLength={500}
              textAlignVertical="center"
              editable={!!sessionId && !isSending && !isRecordingVoice}
            />
            
            <Pressable
              onPress={handleVoiceInput}
              disabled={!sessionId || isSending || isRecordingVoice}
              className={`w-8 h-8 ${isRecordingVoice ? 'bg-red-600' : 'bg-accent-blue'} border border-accent-pink rounded-full items-center justify-center ml-3 active:opacity-80 active:scale-95 ${
                !sessionId || isSending ? 'opacity-50' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel={isRecordingVoice ? "Stop recording" : "Start voice input"}
              accessibilityHint={isRecordingVoice ? "Stops recording and transcribes to text" : "Record voice message to convert to text"}
            >
              {isRecordingVoice ? (
                <View className="w-3 h-3 bg-white rounded" />
              ) : (
                <Ionicons name="mic" size={18} color="white" />
              )}
            </Pressable>
          </View>
            
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending || !sessionId || isRecordingVoice}
              className={`w-12 h-12 rounded-full items-center justify-center active:opacity-80 active:scale-95 ${
                inputText.trim() && !isSending && sessionId && !isRecordingVoice
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
                <Text className={inputText.trim() && sessionId && !isRecordingVoice ? "text-white text-2xl" : "text-gray-500 text-2xl"}>➤</Text>
              )}
            </Pressable>
          </View>
          
          {/* Voice Recording Indicator */}
          {isRecordingVoice && (
            <View className="flex-row items-center gap-2 p-3 bg-gray-800/50 border-2 border-red-600 rounded-xl mb-2">
              <View className="w-3 h-3 bg-red-600 rounded-full" />
              <Text className="text-white text-sm">Recording... {recordingDuration}s</Text>
            </View>
          )}
          
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

    </SafeAreaView>
  );
}
