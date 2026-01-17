import React from "react";
import { View } from "react-native";

// Main component
export function LoadingDots() {
  const colors = ["bg-accent-pink", "bg-space-purple", "bg-accent-blue", "bg-blue-300"];

  return (
    <View className="flex-row justify-center gap-2">
      {colors.map((color, index) => (
        <View
          key={index}
          className={`w-2 h-2 rounded-full ${color}`}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ))}
    </View>
  );
}
