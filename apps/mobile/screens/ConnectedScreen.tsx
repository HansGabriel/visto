import React from "react";
import { View, Text, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { StarField } from "../components/StarField";
import { GradientButton } from "../components/GradientButton";
import { LoadingDots } from "../components/LoadingDots";

// Types
interface ConnectedScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

// Static content
const TITLE = "Connected!";
const MESSAGE = "You are now connected to your desktop.";
const SYNC_TEXT = "Syncing data...";

// Main component
export function ConnectedScreen({ onBack, onContinue }: ConnectedScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-space-dark">
      <StatusBar style="light" />
      
      <StarField />

      {/* Header Navigation */}
      <View className="flex-row items-center px-6 py-4">
        <Pressable
          onPress={onBack}
          className="flex-row items-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-white text-lg mr-2">←</Text>
          <Text className="text-white text-base">Back</Text>
        </Pressable>
        
        <View className="flex-1 items-center mr-12">
          <Text 
            className="text-white text-lg font-semibold"
            accessibilityRole="header"
          >
            {TITLE}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 justify-center items-center">
        {/* Connection Illustration */}
        <View className="mb-12 items-center">
          {/* Laptop and Phone Connection Visual */}
          <View className="flex-row items-center justify-center mb-8">
            {/* Laptop */}
            <View className="items-center">
              <View className="w-20 h-16 bg-space-purple border-2 border-accent-blue rounded-lg items-center justify-center">
                <Text className="text-accent-blue text-3xl">💻</Text>
              </View>
            </View>

            {/* Connection Line with Shield */}
            <View className="items-center mx-4">
              <Text className="text-gray-500">• • • • •</Text>
              <View className="absolute">
                <View className="w-12 h-12 bg-accent-blue rounded-full items-center justify-center">
                  <Text className="text-white text-2xl">✓</Text>
                </View>
              </View>
            </View>

            {/* Phone */}
            <View className="items-center">
              <View className="w-12 h-20 bg-space-purple border-2 border-accent-pink rounded-lg items-center justify-center">
                <Text className="text-accent-pink text-2xl">📱</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Success Message */}
        <Text 
          className="text-white text-2xl font-bold text-center mb-8"
          accessibilityRole="header"
        >
          {MESSAGE}
        </Text>

        {/* Syncing Status */}
        <Text className="text-gray-400 text-base text-center mb-3">
          {SYNC_TEXT}
        </Text>
        <LoadingDots />

        {/* Continue Button */}
        <View className="w-full mt-16">
          <GradientButton
            title="CONTINUE"
            onPress={onContinue}
            accessibilityLabel="Continue to app"
            accessibilityHint="Proceeds to the main application"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
