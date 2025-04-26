import React, { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Chat.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [messages.length]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [blockId]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [blockId]: false }));
    }, 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setIsMenuOpen(false);
  };

  const toggleTheme = () => {
    document.body.classList.toggle("dark-theme");
    setIsMenuOpen(false);
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
          const [, language, code] = match;
          const blockId = `code-${index}`;
          const isCopied = copiedStates[blockId];

          return (
            <div key={index} className="code-block-container">
              <div className="code-header">
                <span className="code-language">{language || "plaintext"}</span>
                <button
                  className={`copy-button ${isCopied ? "copied" : ""}`}
                  onClick={() => copyToClipboard(code.trim(), blockId)}
                >
                  {isCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <SyntaxHighlighter
                language={language || "plaintext"}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: "0 0 8px 8px",
                }}
              >
                {code.trim()}
              </SyntaxHighlighter>
            </div>
          );
        }
      }
      return <p key={index}>{part}</p>;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/engines/llama.cpp/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "ai/qwen2.5:0.5B-F16",
          messages: [
            { role: "system", content: "You are a helpful AI assistant." },
            ...messages,
            userMessage,
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("API Response:", data);

      const assistantMessage: Message = {
        role: "assistant",
        content: data.choices[0].message.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat Error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-container">
              <span className="logo-icon">🤖</span>
              <h1>AI Chat Assistant</h1>
            </div>
            <p>Ask me anything!</p>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button className="action-button" title="New Chat">
                <span className="action-icon">🔄</span>
              </button>
              <button className="action-button" title="Toggle Theme">
                <span className="action-icon">🌓</span>
              </button>
              <button
                className="menu-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <span className="menu-icon">☰</span>
              </button>
            </div>
            {isMenuOpen && (
              <div className="menu-dropdown" ref={menuRef}>
                <button onClick={clearChat} className="menu-item">
                  <span className="menu-icon">🗑️</span>
                  Clear Chat
                </button>
                <button onClick={toggleTheme} className="menu-item">
                  <span className="menu-icon">🌓</span>
                  Toggle Theme
                </button>
                <button className="menu-item">
                  <span className="menu-icon">⚙️</span>
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${
              message.role === "user" ? "user" : "assistant"
            }`}
          >
            <div className="message-content">
              {renderMessageContent(message.content)}
            </div>
            {message.timestamp && (
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="thinking-animation">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </div>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Press Enter to send)"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
