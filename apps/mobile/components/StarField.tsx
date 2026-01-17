import React from "react";
import { View } from "react-native";

// Types
interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
}

// Helpers
function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.7 + 0.3,
    });
  }
  return stars;
}

// Static content
const STARS = generateStars(50);

// Main component
export function StarField() {
  return (
    <View className="absolute inset-0" accessibilityLabel="Starry background">
      {STARS.map((star) => (
        <View
          key={star.id}
          style={{
            position: "absolute",
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
          className="rounded-full bg-white"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ))}
    </View>
  );
}
