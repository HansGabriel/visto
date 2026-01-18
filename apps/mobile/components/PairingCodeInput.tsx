import React, { useRef } from "react";
import { View, TextInput, Text, Pressable } from "react-native";

// Types
interface PairingCodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
}

// Main component
export function PairingCodeInput({ value, onChangeText, editable = true }: PairingCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const codeLength = 6;
  const characters = value.toUpperCase().split("").slice(0, codeLength);
  
  // Pad with empty strings if needed
  while (characters.length < codeLength) {
    characters.push("");
  }

  function handlePress() {
    inputRef.current?.focus();
  }

  return (
    <View className="w-full">
      <Text className="text-gray-400 text-sm mb-3 px-1">
        Enter Pairing Code
      </Text>
      <Pressable onPress={handlePress}>
        <View className="flex-row justify-between gap-3">
          {characters.map((char, index) => (
            <View
              key={index}
              className="flex-1 h-16 bg-space-purple border-2 border-accent-blue rounded-lg items-center justify-center"
              accessibilityLabel={`Code character ${index + 1}`}
            >
              <Text className="text-white text-2xl font-bold">
                {char}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
      
      {/* Hidden input for actual text entry */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        maxLength={codeLength}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        autoFocus={true}
        editable={editable}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        accessibilityLabel="Enter pairing code"
        accessibilityHint="Type your 6-character pairing code"
      />
    </View>
  );
}
