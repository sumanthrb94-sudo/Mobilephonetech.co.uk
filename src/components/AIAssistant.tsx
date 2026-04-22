import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Send, X, Bot, Sparkles, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_PHONES } from '../data';
import gsmarenaData from '../gsmarena_data.json';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi there! I\'m your Tech Advisor. Looking for a specific phone or need advice on specs?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Find relevant data from GSMArena
      const relevantData = gsmarenaData.filter(d => 
        userMessage.toLowerCase().includes(d.model.toLowerCase()) || 
        d.model.toLowerCase().includes(userMessage.toLowerCase())
      );

      const prompt = `
        You are the Shopping Assistant for "Mobile World", a global retail store for mobile technology.
        Your goal is to help users navigate our catalog of smartphones, chargers, and accessories.
        
        CATALOG HIGHLIGHTS (OUR INVENTORY):
        ${MOCK_PHONES.map(p => `${p.model} (${p.brand}): £${p.price}, Grade: ${p.grade}`).join('\n')}
        
        DEEP TECHNICAL KNOWLEDGE (FROM GSMARENA):
        ${relevantData.length > 0 
          ? relevantData.map(d => `MODEL: ${d.model}\nSPECS: ${JSON.stringify(d.specs)}`).join('\n---\n')
          : "Use your general knowledge for technical specs if not listed above."
        }

        USER QUESTION: ${userMessage}
        
        INSTRUCTIONS:
        1. Act like an expert tech advisor from a leading retail brand.
        2. Use the GSMArena data to provide highly accurate technical details (e.g., sensor sizes, battery chemistry, precise weights).
        3. Cross-reference with OUR INVENTORY to mention current pricing and condition (Grades).
        4. If the user asks about a phone we have in stock, prioritize those details.
        5. Keep responses concise, professional, and helpful.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const assistantContent = response.text || "I'm sorry, I'm having trouble thinking right now. How else can I help?";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered a technical glitch. Please try again!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 h-16 w-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 neon-glow"
      >
        <Bot className="h-8 w-8" />
        <div className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
          <Sparkles className="h-3 w-3" />
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-28 right-8 w-[400px] max-h-[600px] glass-card rounded-[32px] overflow-hidden flex flex-col z-50 border-slate-200"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">Tech Advisor</h3>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400">GSMARENA TRAINED</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 min-h-[300px] scroll-smooth"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 pt-0">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about a phone..."
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
                AI Support • Powered by GSMArena Data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
