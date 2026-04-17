
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Bot, Sparkles, Search, Zap, Loader2, 
  BrainCircuit, Compass, LayoutGrid, Wand2
} from 'lucide-react';
import { runSmartAgent } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const { useLocation, useNavigate } = ReactRouterDOM as any;

const AiConcierge: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'executing'>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const executeFunction = async (call: any) => {
    const { name, args } = call;
    setStatus('executing');
    
    if (name === 'search_manhwa') {
      const q = args.query || args.genre || '';
      navigate(`/?q=${encodeURIComponent(q)}`);
      setIsOpen(false);
    } else if (name === 'navigate_to') {
      if (args.page === 'details' && args.id) navigate(`/details/${args.id}`);
      else if (args.page === 'library') navigate('/library');
      else if (args.page === 'advanced-search') navigate('/advanced-search');
      else navigate('/');
      setIsOpen(false);
    }
    
    setStatus('idle');
  };

  const handleSend = async (customMsg?: string) => {
    const msgToSend = customMsg || input;
    if (!msgToSend.trim() || status !== 'idle') return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msgToSend }]);
    setStatus('thinking');

    const result = await runSmartAgent(msgToSend, { path: location.pathname }, messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    })), language);

    if (result.functionCalls) {
      for (const call of result.functionCalls) {
        await executeFunction(call);
      }
    }

    if (result.text) {
      setMessages(prev => [...prev, { role: 'model', text: result.text || '' }]);
    }
    
    setStatus('idle');
  };

  const getContextSuggestions = () => {
    const isEn = language === 'en';
    if (location.pathname.includes('/details/')) return [
        { text: isEn ? "Analyze story" : "حلل القصة", icon: <BrainCircuit size={12} /> },
        { text: isEn ? "Why the hype?" : "لماذا الشهرة؟", icon: <Zap size={12} /> },
        { text: isEn ? "Similar works" : "أعمال مشابهة", icon: <LayoutGrid size={12} /> }
    ];
    return [
        { text: isEn ? "Suggest masterpiece" : "اقترح عملاً", icon: <Sparkles size={12} /> },
        { text: isEn ? "Help me choose" : "ساعدني بالاختيار", icon: <Compass size={12} /> },
        { text: isEn ? "Search genre" : "بحث بالتصنيف", icon: <Search size={12} /> }
    ];
  };

  return (
    <div className={`fixed bottom-24 md:bottom-8 ${language === 'ar' ? 'left-4 md:left-8' : 'right-4 md:right-8'} z-[100]`} dir={dir}>
      <AnimatePresence>
        {!isOpen && isVisible && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsOpen(true)}
            className="group relative w-12 h-12 md:w-14 md:h-14 bg-neutral-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:bg-neutral-800 active:scale-95"
            style={{ borderColor: 'rgba(var(--accent-rgb), 0.2)' }}
          >
            <div className="absolute inset-0 rounded-2xl animate-pulse group-hover:block hidden" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}></div>
            {status === 'thinking' ? (
              <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent-color)' }} />
            ) : (
              <Bot className="text-white group-hover:accent-text transition-colors" size={24} />
            )}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: 'var(--accent-color)' }}></div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(10px)' }}
            className="w-[300px] md:w-[340px] h-[480px] md:h-[520px] bg-neutral-950/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
          >
            
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-black text-xs text-white tracking-tight">Jin Sensei</h3>
                  <div className="flex items-center gap-1.5">
                     <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                     <span className="text-[7px] text-neutral-500 font-black uppercase tracking-widest">AI Assistant</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.length === 0 && (
                <div className="py-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="text-center space-y-2">
                     <div className="p-3 bg-white/5 inline-block rounded-2xl mb-1 border border-white/5">
                        <Wand2 size={24} className="text-neutral-400" />
                     </div>
                     <p className="text-base font-black text-white tracking-tight">{language === 'en' ? 'Welcome Hero' : 'أهلاً بك يا بطل'}</p>
                     <p className="text-[10px] text-neutral-500 font-bold px-4 leading-relaxed">{t('ai_concierge_intro')}</p>
                  </div>
                  
                  <div className="space-y-2">
                     <p className="text-[8px] text-neutral-600 font-black uppercase tracking-[0.2em] px-1 text-center">{language === 'en' ? 'Quick Suggestions' : 'اقتراحات سريعة'}</p>
                     <div className="grid grid-cols-1 gap-1.5">
                       {getContextSuggestions().map((suggestion, i) => (
                         <button 
                           key={i}
                           onClick={() => handleSend(suggestion.text)}
                           className="flex items-center gap-3 p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group active:scale-[0.98]"
                         >
                            <div className="p-1.5 bg-neutral-900 rounded-lg text-neutral-400 group-hover:text-white transition-all">
                              {suggestion.icon}
                            </div>
                            <span className="text-[10px] font-bold text-neutral-400 group-hover:text-white">{suggestion.text}</span>
                         </button>
                       ))}
                     </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-lg ${
                    msg.role === 'user' 
                    ? 'bg-white text-black font-bold rounded-br-none' 
                    : 'bg-neutral-900 border border-white/5 text-neutral-200 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {status === 'thinking' && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900 p-2.5 rounded-2xl rounded-bl-none flex items-center gap-1 border border-white/5">
                     <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-black/40 border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai_concierge_placeholder')}
                  className="w-full bg-neutral-900 border border-white/10 focus:border-white/30 rounded-xl px-4 py-2.5 text-[11px] focus:outline-none transition-all text-white font-bold placeholder:text-neutral-600"
                />
                <button 
                  type="submit"
                  disabled={status !== 'idle' || !input.trim()}
                  className={`absolute ${language === 'ar' ? 'left-1' : 'right-1'} top-1 bottom-1 px-3 bg-white text-black rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-30 flex items-center justify-center`}
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiConcierge;
