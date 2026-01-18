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
              <View className="w-32 h-24 bg-space-purple border-4 border-accent-blue shadow-2xl shadow-accent-blue rounded-xl items-center justify-center">
                <Text className="text-accent-blue text-5xl">💻</Text>
              </View>
            </View>

            {/* Connection Line with Shield */}
            <View className="items-center justify-center mx-6 relative" style={{ width: 120 }}>
              {/* Animated Connection Dots */}
              <View className="flex-row items-center justify-center gap-2 mb-2">
                <View className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
                <View className="w-2.5 h-2.5 rounded-full bg-accent-pink" />
                <View className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
                <View className="w-2.5 h-2.5 rounded-full bg-accent-pink" />
                <View className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
              </View>
              
            </View>

            {/* Phone */}
            <View className="items-center">
              <View className="w-16 h-28 bg-space-purple border-4 border-accent-pink shadow-2xl shadow-accent-pink rounded-xl items-center justify-center">
                <Text className="text-accent-pink text-4xl">📱</Text>
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
