import React from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { GradientLogo } from "../components/GradientLogo";
import { GradientButton } from "../components/GradientButton";
import { StarField } from "../components/StarField";

// Static content
const TITLE = "Visto";
const TAGLINE = "Connect. Analyze. Automate.";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

// Main component
export function HomeScreen({ navigation }: Props) {
  function handleGetStarted() {
    navigation.navigate("SignIn");
  }

  return (
    <SafeAreaView className="flex-1 bg-space-dark">
      <StatusBar style="light" />
      
      <StarField />

      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-8">
          <GradientLogo />
        </View>

        <Text 
          className="text-4xl font-bold text-white mb-3 text-center"
          accessibilityRole="header"
          accessibilityLabel={TITLE}
        >
          {TITLE}
        </Text>

        <Text 
          className="text-base text-gray-400 font-light text-center mb-16"
          accessibilityLabel={TAGLINE}
        >
          {TAGLINE}
        </Text>

        <View className="mt-8">
          <GradientButton 
            title="Get Started" 
            onPress={handleGetStarted}
            accessibilityLabel="Get started with Desktop Assistant"
            accessibilityHint="Navigates to the pairing screen"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
