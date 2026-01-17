import "./global.css";
import React, { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "./context/SessionContext";
import { HomeScreen } from "./screens/HomeScreen";
import { PairingScreen } from "./screens/PairingScreen";
import { ConnectedScreen } from "./screens/ConnectedScreen";
import { ChatScreen } from "./screens/ChatScreen";

// Types
type Screen = "home" | "pairing" | "connected" | "chat";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const { isConnected, isLoading: sessionLoading } = useSession();

  // Auto-navigate to chat if session exists on mount
  useEffect(() => {
    if (!sessionLoading && isConnected && currentScreen === "home") {
      setCurrentScreen("chat");
    }
  }, [isConnected, sessionLoading, currentScreen]);

  function navigateToHome() {
    setCurrentScreen("home");
  }

  function navigateToPairing() {
    setCurrentScreen("pairing");
  }

  function navigateToConnected() {
    setCurrentScreen("connected");
  }

  function navigateToChat() {
    setCurrentScreen("chat");
  }

  return (
    <>
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
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </SafeAreaProvider>
  );
}