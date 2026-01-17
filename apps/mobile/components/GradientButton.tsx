import React from "react";
import { Text, Pressable, PressableProps } from "react-native";

// Types
interface GradientButtonProps extends PressableProps {
  title: string;
}

// Main component
export function GradientButton({ title, ...props }: GradientButtonProps) {
  return (
    <Pressable
      className="px-12 py-4 rounded-full bg-accent-blue border-2 border-accent-pink shadow-2xl shadow-accent-pink active:opacity-80 active:scale-95"
      accessibilityRole="button"
      {...props}
    >
      <Text className="text-white text-lg font-semibold text-center">
        {title}
      </Text>
    </Pressable>
  );
}
