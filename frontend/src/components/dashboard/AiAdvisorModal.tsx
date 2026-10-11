"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Wind,
  Layers,
  Cigarette,
  Activity,
  Cpu,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  askAiAdvisor,
  explainExposureApi,
  getAiStatusApi,
  ChatMessage,
  ExposureContext,
  AdvisorResponse,
  AiStatusResponse,
} from "@/lib/api";

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: ExposureContext | null;
  initialMode?: "chat" | "explain";
}

const DEFAULT_SUGGESTIONS = [
  "Is outdoor exercise advisable right now?",
  "Explain my current exposure.",
  "How can I reduce my inhaled PM2.5?",
  "What if I reduce my outdoor activity to 15 minutes?",
  "What happens if I walk instead of running?",
];

export default function AiAdvisorModal({
  isOpen,
  onClose,
  context,
  initialMode = "chat",
}: AiAdvisorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [bedrockStatus, setBedrockStatus] = useState<AiStatusResponse | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Fetch Bedrock service info
  useEffect(() => {
    if (isOpen && !bedrockStatus) {
      getAiStatusApi()
        .then(setBedrockStatus)
        .catch((err) => console.warn("Could not check Bedrock status:", err));
    }
  }, [isOpen, bedrockStatus]);

  // Initialize conversation thread or auto-trigger "Explain My Exposure"
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      return;
    }

    if (!hasInitialized) {
      setHasInitialized(true);

      if (initialMode === "explain") {
        handleTriggerExplain();
      } else if (messages.length === 0) {
        // Welcome message with context
        const sourceLabel = context?.data_source?.toUpperCase() || "DEMO";
        const welcomeText =
          `Hello! I'm your **AirDose AI Exposure Advisor**, powered by **Amazon Bedrock**.\n\n` +
          `I am currently analyzing your exposure in **${context?.location || "your location"}** ` +
          `with ambient PM2.5 of **${context?.concentration ?? 75} µg/m³** ` +
          `(${sourceLabel} data).\n\n` +
          `Ask me anything about your inhalation risks, exercise safety, micro-environment protection, or what-if activity scenarios!`;

        setMessages([
          {
            role: "assistant",
            content: welcomeText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            model_provider: "amazon-bedrock",
            data_source: context?.data_source || "demo",
          },
        ]);
      }
    }
  }, [isOpen, initialMode, hasInitialized, context]);

  const handleTriggerExplain = async () => {
    setLoading(true);
    const userMsg: ChatMessage = {
      role: "user",
      content: "Explain my current personal PM2.5 exposure and lung particulate burden.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await explainExposureApi({ context });
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model_provider: res.model_provider,
        data_source: res.data_source,
        error_type: res.error_type,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `⚠️ Unable to reach Amazon Bedrock: ${err.message || "Network error"}. Please verify backend configuration.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error_type: "NETWORK_ERROR",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const res: AdvisorResponse = await askAiAdvisor({
        message: text,
        context: context,
        conversation_history: messages.slice(-6),
      });

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model_provider: res.model_provider,
        data_source: res.data_source,
        error_type: res.error_type,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorResponse: ChatMessage = {
        role: "assistant",
        content: `⚠️ Failed to get advice from Amazon Bedrock: ${err.message || "Network or server error"}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error_type: "REQUEST_FAILED",
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setHasInitialized(false);
  };

  if (!isOpen) return null;

  const isDemo = (context?.data_source || "demo").toLowerCase() === "demo";
  const isCached = (context?.data_source || "").toLowerCase() === "cached";
  const isLive = (context?.data_source || "").toLowerCase() === "live";

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-2xl w-full h-[88vh] max-h-[820px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* 1. Header with Bedrock Branding & Data Source Badges */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0062ff] text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Amazon Bedrock AI Advisor
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700 border border-blue-200">
                  {bedrockStatus?.model_id ? bedrockStatus.model_id.split(":")[0].replace("amazon.", "") : "AWS Bedrock"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Personal Environmental Dosimetry Expert</span>
                <span>•</span>
                <span className="text-slate-500 font-mono text-[11px]">{bedrockStatus?.region || "ap-south-1"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Reset conversation"
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Verified Mathematical Telemetry Strip */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-300">
              <Wind className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono font-bold text-white">
                {context?.concentration?.toFixed(1) ?? "--"}
              </span>
              <span className="text-[10px] text-slate-400">µg/m³ PM2.5</span>
            </div>

            <span className="text-slate-600">|</span>

            <div className="flex items-center gap-1 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold text-white capitalize">{context?.activity || "Rest"}</span>
              <span className="text-[10px] text-slate-400 font-mono">({context?.breathing_factor ?? 1.0}×)</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            <div className="items-center gap-1 text-slate-300 hidden sm:flex">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-slate-400">Inhaled:</span>
              <span className="font-mono font-bold text-emerald-300">
                {context?.total_exposure_ug ? `${context.total_exposure_ug.toFixed(1)} µg` : "Calibrating"}
              </span>
            </div>
          </div>

          {/* Data Provenance Badge */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isLive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isCached
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-emerald-400 animate-pulse" : isCached ? "bg-blue-400" : "bg-amber-400"
                }`}
              />
              <span>{isLive ? "Live Sensor" : isCached ? "Spatial Cache" : "Demonstration Scenario"}</span>
            </span>
          </div>
        </div>

        {/* 3. Conversation Messages Thread */}
        <div ref={chatScrollRef} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#f8fafc]">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? "bg-[#0062ff] text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                  }`}
                >
                  {/* Message Header for Assistant */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <Sparkles className="w-3 h-3 text-[#0062ff]" />
                        {msg.model_provider === "amazon-bedrock"
                          ? "Amazon Bedrock"
                          : "AirDose Mathematical Model"}
                      </span>
                      {msg.timestamp && <span>{msg.timestamp}</span>}
                    </div>
                  )}

                  {/* Message Content (Formatted Markdown rendering) */}
                  <div className="space-y-2 whitespace-pre-wrap font-sans text-[13px] sm:text-sm">
                    {msg.content.split("\n\n").map((paragraph, pIdx) => {
                      if (paragraph.startsWith("• ") || paragraph.startsWith("- ")) {
                        const items = paragraph.split("\n");
                        return (
                          <ul key={pIdx} className="space-y-1 list-disc list-inside pl-1 text-slate-700">
                            {items.map((item, itemIdx) => (
                              <li key={itemIdx} className="leading-snug">
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: item
                                      .replace(/^[•\-]\s*/, "")
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900">$1</strong>'),
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <p
                          key={pIdx}
                          dangerouslySetInnerHTML={{
                            __html: paragraph.replace(
                              /\*\*(.*?)\*\*/g,
                              `<strong class="${isUser ? "font-bold text-white" : "font-extrabold text-slate-900"}">$1</strong>`
                            ),
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Warning / Provenance Notice */}
                  {!isUser && msg.error_type && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.error_type}: Grounded in local verified calculations.</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Loading Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs font-semibold text-slate-500 font-sans ml-1">
                  Consulting Amazon Bedrock Converse API...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Suggested Question Chips */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Suggested:
          </span>
          {DEFAULT_SUGGESTIONS.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(suggestion)}
              className="text-xs font-medium text-slate-600 hover:text-[#0062ff] bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-200 rounded-full px-3 py-1 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* 5. Input Bar & Controls */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              placeholder="Ask about outdoor runs, inhaled PM2.5, N95 protection..."
              className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-2xl px-4 py-2.5 border border-slate-200/90 focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all"
            />

            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-[#0062ff] hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-[#0062ff] text-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Grounded strictly in AirDose verified formulas • Educational tool</span>
            </span>
            <span className="text-[10px] font-mono">
              Bedrock Converse API
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
