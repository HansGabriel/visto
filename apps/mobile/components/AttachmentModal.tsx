import React from "react";
import { View, Text, Modal, Pressable } from "react-native";
import { StarField } from "./StarField";

// Types
interface AttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onTakeScreenshot: () => void;
  onRecordVideo: () => void;
}

// Main component
export function AttachmentModal({ 
  visible, 
  onClose, 
  onTakeScreenshot, 
  onRecordVideo 
}: AttachmentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <StarField />
        
        <Pressable 
          className="flex-1 bg-black/70 justify-end"
          onPress={onClose}
          accessibilityLabel="Close attachment options"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-space-purple border-2 border-accent-blue shadow-2xl shadow-accent-blue rounded-t-3xl p-6">
            <Text className="text-white text-xl font-bold text-center mb-6">
              Select Action
            </Text>
            
            {/* Screenshot Option */}
            <Pressable
              onPress={onTakeScreenshot}
              className="bg-accent-blue border-2 border-accent-pink shadow-2xl shadow-accent-pink rounded-xl p-4 mb-4 active:opacity-80 active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Take screenshot"
            >
              <View className="flex-row items-center">
                <Text className="text-white text-3xl mr-4">📸</Text>
                <View>
                  <Text className="text-white text-lg font-semibold">
                    Take Screenshot
                  </Text>
                  <Text className="text-gray-300 text-sm">
                    Capture your desktop screen
                  </Text>
                </View>
              </View>
            </Pressable>
            
            {/* Video Recording Option */}
            <Pressable
              onPress={onRecordVideo}
              className="bg-accent-pink border-2 border-accent-blue shadow-2xl shadow-accent-blue rounded-xl p-4 mb-4 active:opacity-80 active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Record video"
            >
              <View className="flex-row items-center">
                <Text className="text-white text-3xl mr-4">🎥</Text>
                <View>
                  <Text className="text-white text-lg font-semibold">
                    Record Video
                  </Text>
                  <Text className="text-gray-300 text-sm">
                    Record desktop activity
                  </Text>
                </View>
              </View>
            </Pressable>
            
            {/* Cancel Button */}
            <Pressable
              onPress={onClose}
              className="bg-gray-700 border-2 border-gray-500 shadow-lg rounded-xl p-4 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-white text-base text-center font-semibold">
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
      </View>
    </Modal>
  );
}
