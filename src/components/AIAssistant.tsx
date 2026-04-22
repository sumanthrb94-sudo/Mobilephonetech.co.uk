import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, X, Bot, Sparkles, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_PHONES } from '../data';
import gsmarenaData from '../gsmarena_data.json';

/**
 * AIAssistant — Verified Form design philosophy
 * Space: Sharp corners, clinical framing.
 * Colour: Pure white container, strict grey lines. Primary actions are solid black. Blue used only as the trust/tech indicator.
 * Typography: DM Sans for conversational text, Playfair Display for headers, Inter for small technical details.
 */

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

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

    if (!ai) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI Assistant is not configured. Please set the GEMINI_API_KEY environment variable.' }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const relevantData = gsmarenaData.filter(d => 
        userMessage.toLowerCase().includes(d.model.toLowerCase()) || 
        d.model.toLowerCase().includes(userMessage.toLowerCase())
      );

      const prompt = `
        You are the Shopping Assistant for "MobileTech", a global retail store for refurbished mobile technology.
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
        5. Keep responses concise, professional, and helpful. Do not use markdown styling unless necessary.
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
        style={{
          position: 'fixed', bottom: '32px', right: '32px', width: '64px', height: '64px',
          background: 'var(--black)', color: 'white', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)', cursor: 'pointer', zIndex: 50, border: 'none',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        className={isOpen ? 'hidden' : ''}
      >
        <Bot size={28} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', background: 'var(--blue-60)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={10} color="white" />
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: '32px', right: '32px', width: '400px', height: '600px', maxHeight: 'calc(100vh - 64px)',
              background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', zIndex: 50,
              border: '1px solid var(--grey-10)', boxShadow: '0 24px 48px rgba(0,0,0,0.12)'
            }}
          >
            {/* ── Header ────────────────────────────────────────────── */}
            <div style={{ padding: 'var(--spacing-20) var(--spacing-24)', borderBottom: '1px solid var(--grey-10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--grey-0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--grey-5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} style={{ color: 'var(--black)' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700, color: 'var(--black)', margin: '0 0 4px 0', lineHeight: 1.1 }}>Tech Advisor</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--trust-green)', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: 'var(--grey-40)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GSMARENA TRAINED</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'var(--grey-5)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Messages ──────────────────────────────────────────── */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-24)', display: 'flex', flexDirection: 'column', gap: '24px', scrollBehavior: 'smooth' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: msg.role === 'user' ? 'var(--grey-10)' : 'var(--blue-10)', color: msg.role === 'user' ? 'var(--grey-60)' : 'var(--blue-60)' }}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    
                    <div style={{
                      padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6,
                      background: msg.role === 'user' ? 'var(--black)' : 'var(--grey-5)',
                      color: msg.role === 'user' ? 'white' : 'var(--black)',
                      borderRadius: 'var(--radius-lg)',
                      borderTopRightRadius: msg.role === 'user' ? 0 : 'var(--radius-lg)',
                      borderTopLeftRadius: msg.role === 'assistant' ? 0 : 'var(--radius-lg)',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--blue-10)', color: 'var(--blue-60)' }}>
                      <Bot size={14} />
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)', borderTopLeftRadius: 0 }}>
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-60)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Input ─────────────────────────────────────────────── */}
            <div style={{ padding: 'var(--spacing-20) var(--spacing-24)', borderTop: '1px solid var(--grey-10)', background: 'var(--grey-0)' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about a phone..."
                  style={{
                    width: '100%', padding: '14px 48px 14px 16px', background: 'var(--grey-5)', border: '1px solid var(--grey-10)',
                    borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--blue-60)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-10)'}
                />
                <button
                  onClick={handleSend} disabled={!input.trim() || isLoading}
                  style={{
                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                    width: '36px', height: '36px', background: 'var(--black)', color: 'white', border: 'none',
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || isLoading) ? 0.5 : 1
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
