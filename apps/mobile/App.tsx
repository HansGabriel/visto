import "./global.css";
import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./screens/HomeScreen";
import { PairingScreen } from "./screens/PairingScreen";
import { ConnectedScreen } from "./screens/ConnectedScreen";
import { ChatScreen } from "./screens/ChatScreen";

// Types
type Screen = "home" | "pairing" | "connected" | "chat";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [isConnected, setIsConnected] = useState(false);

  function navigateToHome() {
    setCurrentScreen("home");
    setIsConnected(false);
  }

  function navigateToPairing() {
    setCurrentScreen("pairing");
  }

  function navigateToConnected() {
    setCurrentScreen("connected");
    setIsConnected(true);
  }

  function navigateToChat() {
    setCurrentScreen("chat");
  }

  return (
    <SafeAreaProvider>
      {currentScreen === "home" && (
        <HomeScreen onGetStarted={navigateToPairing} />
      )}
      {currentScreen === "pairing" && (
        <PairingScreen 
          onBack={navigateToHome} 
          onConnected={navigateToConnected}
        />
      )}
      {currentScreen === "connected" && (
        <ConnectedScreen 
          onBack={navigateToPairing}
          onContinue={navigateToChat}
        />
      )}
      {currentScreen === "chat" && (
        <ChatScreen 
          onBack={navigateToHome}
          isConnected={isConnected}
          onReconnect={navigateToPairing}
        />
      )}
    </SafeAreaProvider>
  );
}