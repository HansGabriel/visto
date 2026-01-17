import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { StarField } from "../components/StarField";
import { GradientButton } from "../components/GradientButton";
import { PairingCodeInput } from "../components/PairingCodeInput";
import { usePairing } from "../hooks/usePairing";

// Types
interface PairingScreenProps {
  onBack: () => void;
  onConnected: () => void;
}

// Static content
const TITLE = "Pairing";
const HEADER_MAIN = "Visto";
const HEADER_ACCENT = "AI";
const SUBHEADER = "Connect to Your Desktop";
const HINT_TEXT = "Find the code in your desktop app's system tray";

// Main component
export function PairingScreen({ onBack, onConnected }: PairingScreenProps) {
  const [code, setCode] = useState("");
  const { pair, isLoading, error: pairingError } = usePairing();
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    if (code.length !== 6 || isLoading || isConnecting) {
      return;
    }
    
    setIsConnecting(true);
    try {
      const result = await pair(code);
      if (result) {
        onConnected();
      }
    } finally {
      setIsConnecting(false);
    }
  }

  function handleSettings() {
    console.log("Settings pressed");
    // TODO: Navigate to settings
  }

  return (
    <SafeAreaView className="flex-1 bg-space-dark">
      <StatusBar style="light" />
      
      <StarField />

      {/* Header Navigation */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={onBack}
          className="flex-row items-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-white text-lg mr-2">←</Text>
          <Text className="text-white text-base">Back</Text>
        </Pressable>
        
        <Text 
          className="text-white text-lg font-semibold"
          accessibilityRole="header"
        >
          {TITLE}
        </Text>
        
        <Pressable
          onPress={handleSettings}
          className="active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text className="text-white text-2xl">⚙</Text>
        </Pressable>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="mb-16">
          <Text 
            className="text-4xl font-bold text-center mb-2"
            accessibilityRole="header"
          >
            <Text className="text-white">{HEADER_MAIN} </Text>
            <Text className="text-accent-pink">{HEADER_ACCENT}</Text>
          </Text>
          <Text className="text-white text-lg text-center">
            {SUBHEADER}
          </Text>
        </View>

        {/* Pairing Code Input */}
        <View className="mb-12">
          <PairingCodeInput
            value={code}
            onChangeText={setCode}
            editable={!isLoading}
          />
          {pairingError ? (
            <Text className="text-red-500 text-sm mt-2 text-center">
              {pairingError}
            </Text>
          ) : null}
        </View>

        {/* Connect Button */}
        <View className="mb-12">
          {isLoading ? (
            <View className="items-center justify-center py-4">
              <ActivityIndicator size="large" color="#EC4899" />
              <Text className="text-white mt-2">Connecting...</Text>
            </View>
          ) : (
            <GradientButton
              title="CONNECT"
              onPress={handleConnect}
              disabled={code.length !== 6 || isLoading || isConnecting}
              accessibilityLabel="Connect to desktop"
              accessibilityHint="Pairs your device with the desktop application"
            />
          )}
        </View>

        {/* Hint Section */}
        <View className="bg-space-purple border border-gray-700 rounded-xl p-4 flex-row items-center">
          <Text className="text-2xl mr-3">💡</Text>
          <Text className="text-gray-300 text-sm flex-1">
            {HINT_TEXT}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
