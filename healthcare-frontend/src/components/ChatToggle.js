// src/components/ChatToggle.js
import React, { useState } from "react";
import { Button } from "antd";
import {
  MessageOutlined,
  CloseOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import ChatbotComponent from "./ChatbotComponent";

const ChatToggle = ({
  position = "bottom-right",
  chatbotApiUrl = "http://127.0.0.1:8000/api/chatbot",
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getPositionStyle = () => {
    const baseStyle = {
      position: "fixed",
      zIndex: 1000,
    };

    switch (position) {
      case "bottom-right":
        return { ...baseStyle, bottom: 24, right: 24 };
      case "bottom-left":
        return { ...baseStyle, bottom: 24, left: 24 };
      case "top-right":
        return { ...baseStyle, top: 100, right: 24 };
      case "top-left":
        return { ...baseStyle, top: 100, left: 24 };
      default:
        return { ...baseStyle, bottom: 24, right: 24 };
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      {/* Enhanced Chat Toggle Button */}
      <div style={getPositionStyle()}>
        <div className="relative">
          {/* Pulse animation ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 animate-pulse scale-110"></div>

          {/* Main button */}
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={isChatOpen ? <CloseOutlined /> : <RobotOutlined />}
            onClick={toggleChat}
            className="relative z-10 shadow-2xl border-0 transition-all duration-300 transform hover:scale-110 floating-element"
            style={{
              width: 64,
              height: 64,
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow:
                "0 8px 25px rgba(139, 92, 246, 0.4), 0 4px 10px rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Notification dot when closed */}
          {!isChatOpen && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg"
              style={{
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
              }}
            />
          )}
        </div>

        {/* Floating label */}
        {!isChatOpen && (
          <div
            className="absolute bottom-0 right-20 bg-white bg-opacity-95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-purple-200 transition-all duration-300 hover:bg-opacity-100"
            style={{
              transform: "translateY(-50%)",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.15)",
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                AI Assistant
              </span>
            </div>

            {/* Arrow pointer */}
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-white border-r border-b border-purple-200 transform rotate-45 -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Enhanced Chatbot Component */}
      <ChatbotComponent
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatbotApiUrl={chatbotApiUrl}
      />
    </>
  );
};

export default ChatToggle;
