import React from "react";
import { View } from "react-native";

// Main component
export function GradientLogo() {
  return (
    <View 
      className="relative items-center justify-center"
      accessibilityLabel="Desktop Assistant logo"
      accessibilityRole="image"
    >
      {/* Outer glow effect */}
      <View 
        className="absolute w-36 h-36 rounded-full bg-accent-blue opacity-20 blur-xl"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      
      {/* Main circle with border */}
      <View className="w-32 h-32 rounded-full bg-space-purple border-4 border-accent-blue items-center justify-center shadow-2xl shadow-accent-blue">
        {/* Inner crescent/C shape */}
        <View className="w-20 h-20 rounded-full bg-accent-pink shadow-lg" />
        <View className="absolute w-16 h-16 rounded-full bg-space-purple right-6" />
      </View>
      
      {/* Top-left highlight reflection */}
      <View 
        className="absolute top-3 left-3 w-6 h-6 rounded-full bg-white opacity-30"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}
