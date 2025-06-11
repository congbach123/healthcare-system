// src/components/ChatbotComponent.js
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Input,
  Button,
  Avatar,
  Typography,
  Spin,
  message,
  Space,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  SoundOutlined,
  CloseOutlined,
  HeartOutlined,
  StarOutlined,
  LightbulbOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Text } = Typography;

const ChatbotComponent = ({
  isOpen,
  onClose,
  style = {},
  className = "",
  chatbotApiUrl = "http://127.0.0.1:8000/api/chatbot",
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // TTS functionality
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chatbot with enhanced welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: `🤖 Xin chào! Tôi là **MediCare AI Assistant** - trợ lý y tế thông minh của bạn.

✨ **Tôi có thể giúp bạn:**
• 🩺 Tìm hiểu về các bệnh và triệu chứng
• 💊 Cung cấp thông tin về thuốc và điều trị  
• 🛡️ Tư vấn về phòng ngừa và chăm sóc sức khỏe
• 💉 Thông tin về vắc-xin và lịch tiêm

⚠️ **Lưu ý quan trọng:** Thông tin chỉ mang tính tham khảo. Vui lòng tham khảo ý kiến bác sĩ cho chẩn đoán chính xác.

Hãy bắt đầu cuộc trò chuyện bằng cách hỏi tôi bất kỳ điều gì về sức khỏe! 💬`,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom when new message is added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);
    setIsTyping(true);

    try {
      const response = await axios.post(`${chatbotApiUrl}/message/`, {
        message: inputMessage,
        session_id: sessionId,
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: "bot",
        timestamp: new Date(),
      };

      // Update session ID if returned
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      // Add bot message with typing delay
      setTimeout(() => {
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);

        // Auto-speak if TTS is enabled
        if (ttsEnabled) {
          speakText(botMessage.text);
        }
      }, 1000);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "❌ Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau một chút.",
        sender: "bot",
        timestamp: new Date(),
        isError: true,
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // TTS Functions
  const toggleTTS = () => {
    setTtsEnabled(!ttsEnabled);
    if (currentSpeech) {
      stopSpeaking();
    }
    message.info(ttsEnabled ? "Đã tắt đọc tin nhắn" : "Đã bật đọc tin nhắn");
  };

  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setCurrentSpeech(null);
    };

    setCurrentSpeech(utterance);
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setCurrentSpeech(null);
  };

  const cleanTextForSpeech = (text) => {
    return text
      .replace(/🤖|⚠️|✅|❌|📊|🏥|💊|🩺|•|✨|🛡️|💉|💬|🔥|⭐|💡/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  };

  const formatMessage = (text) => {
    // Enhanced markdown-like formatting
    return text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-slate-800 font-semibold">$1</strong>'
      )
      .replace(/\n/g, "<br/>")
      .replace(/•/g, '<span class="text-purple-600 font-bold">•</span>');
  };

  // Quick suggestions
  const quickSuggestions = [
    {
      icon: "🤒",
      text: "Triệu chứng cảm cúm",
      query: "Triệu chứng và cách điều trị cảm cúm",
    },
    {
      icon: "💊",
      text: "Cách uống thuốc",
      query: "Hướng dẫn sử dụng thuốc an toàn",
    },
    {
      icon: "🏃",
      text: "Tập thể dục",
      query: "Lời khuyên tập thể dục cho sức khỏe",
    },
    { icon: "🍎", text: "Dinh dưỡng", query: "Chế độ ăn uống lành mạnh" },
  ];

  if (!isOpen) return null;

  return (
    <Card
      className={`chatbot-container ${className} transition-all duration-500 transform`}
      style={{
        width: 420,
        height: 640,
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "24px",
        overflow: "hidden",
        ...style,
      }}
      bodyStyle={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Enhanced Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
          color: "white",
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <RobotOutlined className="text-lg" />
          </div>
          <div>
            <Text className="text-white font-bold text-lg block leading-none">
              MediCare AI
            </Text>
            <Text className="text-blue-100 text-sm">Healthcare Assistant</Text>
          </div>
        </div>
        <Space>
          <Tooltip title={ttsEnabled ? "Tắt đọc tin nhắn" : "Bật đọc tin nhắn"}>
            <Button
              type="text"
              icon={<SoundOutlined />}
              onClick={toggleTTS}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl w-10 h-10 flex items-center justify-center"
              style={{
                background: ttsEnabled
                  ? "rgba(255,255,255,0.2)"
                  : "transparent",
              }}
            />
          </Tooltip>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl w-10 h-10 flex items-center justify-center"
          />
        </Space>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          overflowY: "auto",
          background: "linear-gradient(180deg, #fafbff 0%, #f1f5f9 100%)",
          maxHeight: "480px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className="mb-4 animate-fade-in"
            style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {msg.sender === "bot" && (
              <Avatar
                icon={<RobotOutlined />}
                style={{
                  background: msg.isError
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  marginRight: "12px",
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            )}

            <div
              style={{
                maxWidth: "75%",
                padding: "16px 20px",
                borderRadius: "20px",
                background:
                  msg.sender === "user"
                    ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
                    : "rgba(255, 255, 255, 0.9)",
                color: msg.sender === "user" ? "white" : "#1e293b",
                border:
                  msg.sender === "bot"
                    ? "1px solid rgba(226, 232, 240, 0.8)"
                    : "none",
                boxShadow:
                  msg.sender === "user"
                    ? "0 4px 14px rgba(139, 92, 246, 0.3)"
                    : "0 2px 8px rgba(0, 0, 0, 0.1)",
                borderBottomRightRadius: msg.sender === "user" ? "6px" : "20px",
                borderBottomLeftRadius: msg.sender === "bot" ? "6px" : "20px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMessage(msg.text),
                }}
                style={{
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
              />

              {msg.sender === "bot" && (
                <div className="mt-3 flex justify-between items-center">
                  <Text className="text-slate-400 text-xs">
                    {msg.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<SoundOutlined />}
                    onClick={() => speakText(msg.text)}
                    className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg w-8 h-8 flex items-center justify-center"
                  />
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <Avatar
                icon={<UserOutlined />}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  marginLeft: "12px",
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                }}
              />
            )}
          </div>
        ))}

        {/* Enhanced Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start items-center mb-4">
            <Avatar
              icon={<RobotOutlined />}
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                marginRight: "12px",
                width: 36,
                height: 36,
              }}
            />
            <div
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                padding: "16px 20px",
                borderRadius: "20px",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                borderBottomLeftRadius: "6px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="flex items-center space-x-2">
                <Spin size="small" />
                <Text className="text-slate-600 ml-2">AI đang suy nghĩ...</Text>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-purple-100">
          <Text className="text-sm font-medium text-slate-600 block mb-3">
            💡 Gợi ý nhanh:
          </Text>
          <div className="grid grid-cols-2 gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                size="small"
                className="text-left rounded-lg border border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                onClick={() => setInputMessage(suggestion.query)}
              >
                <span className="text-xs">
                  {suggestion.icon} {suggestion.text}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Input Area */}
      <div
        style={{
          padding: "20px",
          background: "rgba(255, 255, 255, 0.95)",
          borderTop: "1px solid rgba(226, 232, 240, 0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex space-x-3">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Hỏi về triệu chứng, bệnh tật, thuốc men..."
            disabled={loading}
            className="flex-1 rounded-2xl border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 h-12"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            className="rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              border: "none",
            }}
          />
        </div>

        <div className="text-center mt-3">
          <Text className="text-xs text-slate-400">
            🔒 Được bảo mật • 💡 "Triệu chứng đau đầu", "Cách phòng COVID-19"
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ChatbotComponent;
