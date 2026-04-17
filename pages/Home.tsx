
import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion } from 'framer-motion';
import ManhwaCard from '../components/ManhwaCard';
import { Zap, TrendingUp, Sparkles, BrainCircuit, ArrowRight, Loader2, Bot } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const { useLocation, Link } = ReactRouterDOM as any;

const Home: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [aiPick, setAiPick] = useState<any | null>(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [manhwas, setManhwas] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'manhwas'), (snap) => {
      const fetchedManhwas = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), chapters: [] })); // Initialize chapters as empty array for now
      setManhwas(fetchedManhwas);
      if (fetchedManhwas.length > 0) {
        setAiPick(fetchedManhwas[Math.floor(Math.random() * fetchedManhwas.length)]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'manhwas');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const g = params.get('genre');
    
    if (q !== null) {
      setIsSearchingAI(true);
      setSearchQuery(q);
      setTimeout(() => setIsSearchingAI(false), 800);
    }
    if (g !== null) setSelectedGenre(g);
  }, [location.search]);

  const filteredManhwas = useMemo(() => {
    return manhwas.filter(manhwa => {
      const query = searchQuery.toLowerCase();
      const title = language === 'en' && manhwa.titleEn ? manhwa.titleEn.toLowerCase() : manhwa.title.toLowerCase();
      const matchesSearch = !searchQuery || (title.includes(query) || (manhwa.author && manhwa.author.toLowerCase().includes(query)));
      const matchesGenre = !selectedGenre || (manhwa.genres && manhwa.genres.includes(selectedGenre));
      return matchesSearch && matchesGenre;
    });
  }, [searchQuery, selectedGenre, language, manhwas]);

  return (
    <div className="space-y-12">
      {isSearchingAI && (
        <div className="bg-neutral-100/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-3">
              <Bot className="text-neutral-400 animate-bounce" size={24} />
              <div>
                 <p className="text-xs font-black text-white uppercase tracking-widest">{t('ai_pick')}</p>
                 <p className="text-[10px] text-neutral-500">{t('analyzing')}</p>
              </div>
           </div>
           <Loader2 className="animate-spin text-neutral-400" size={20} />
        </div>
      )}

      {!searchQuery && !selectedGenre && aiPick && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative min-h-[360px] sm:min-h-[420px] md:min-h-[600px] rounded-2xl sm:rounded-[2.5rem] md:rounded-[4rem] overflow-hidden group shadow-2xl border border-white/5"
        >
          {/* Background Layer */}
          <div className="absolute inset-0">
            <img 
              src={aiPick.bannerImage || aiPick.coverImage} 
              className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" 
              alt="" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-neutral-900/10 mix-blend-overlay"></div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000 rotate-12">
             <BrainCircuit size={500} />
          </div>

          {/* Content Layer */}
          <div className="relative z-10 h-full flex flex-col md:flex-row items-center md:items-end gap-5 sm:gap-8 md:gap-16 p-4 sm:p-8 md:p-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="w-32 sm:w-48 md:w-80 shrink-0 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative group/cover"
            >
               <div className="absolute -inset-4 bg-white/10 rounded-[2rem] blur-3xl opacity-0 group-hover/cover:opacity-100 transition-opacity duration-700"></div>
               <img 
                src={aiPick.coverImage} 
                className="rounded-2xl md:rounded-[2rem] border border-white/10 relative z-10 w-full aspect-[2/3] object-cover shadow-2xl" 
                alt="" 
               />
               <div className="absolute -bottom-4 -right-4 bg-white text-black w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl z-20 border-2 border-black">
                  {aiPick.rating}
               </div>
            </motion.div>
            
            <div className="space-y-6 md:space-y-10 flex-1 text-center md:text-right" style={{ textAlign: language === 'en' ? 'left' : undefined }}>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
                >
                  <Sparkles size={14} style={{ color: 'var(--accent-color)' }} />
                  <span>{t('ai_pick')}</span>
                </motion.div>
                <div className="bg-white/10 backdrop-blur-md text-white/80 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {aiPick.status === 'ongoing' ? t('status_ongoing') : t('status_completed')}
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-4xl md:text-8xl font-black leading-[0.9] tracking-tighter text-white drop-shadow-2xl">
                  {language === 'en' ? aiPick.titleEn || aiPick.title : aiPick.title}
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {aiPick.genres.map(genre => (
                    <span key={genre} className="text-neutral-400 text-xs font-black uppercase tracking-tighter">#{genre}</span>
                  ))}
                </div>
              </div>
              
              <p className="text-neutral-300 max-w-2xl text-sm sm:text-base md:text-xl leading-relaxed line-clamp-2 sm:line-clamp-3 font-medium drop-shadow-lg">
                {language === 'en' ? aiPick.descriptionEn || aiPick.description : aiPick.description}
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 pt-2 md:pt-4">
                <Link to={`/details/${aiPick.id}`} className="group/btn bg-white text-black hover:bg-neutral-200 px-6 sm:px-10 md:px-16 py-3 sm:py-4 md:py-6 rounded-xl sm:rounded-2xl md:rounded-[1.5rem] font-black flex items-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-2xl shadow-white/5 text-xs sm:text-sm md:text-xl">
                   {t('start_reading')} 
                   <ArrowRight size={20} className={`transition-transform group-hover/btn:translate-x-2 ${language === 'ar' ? 'rotate-180 group-hover/btn:-translate-x-2' : ''}`} style={{ color: 'var(--accent-color)' }} />
                </Link>
                <div className="hidden sm:flex items-center gap-4 px-6 md:px-8 py-4 md:py-6 rounded-2xl md:rounded-[1.5rem] bg-black/40 border border-white/10 text-neutral-400 text-xs md:text-sm font-bold backdrop-blur-xl">
                   <div className="flex -space-x-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-neutral-800 overflow-hidden">
                          <img src={`https://picsum.photos/id/${i+20}/100/100`} alt="" />
                        </div>
                      ))}
                   </div>
                   <span className="font-black text-white">+2.4k</span>
                   <span className="opacity-50">{language === 'en' ? 'Reading Now' : 'يقرأون الآن'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-8 space-y-6 md:space-y-12">
          <section className="space-y-4 md:space-y-8">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3 md:pb-6">
               <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500/10 rounded-lg md:rounded-xl flex items-center justify-center border border-yellow-500/20">
                    <Zap className="text-yellow-500" size={18} />
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-3xl font-black">{t('latest_releases')}</h2>
               </div>
               <div className="text-[7px] sm:text-[8px] md:text-[10px] font-bold text-neutral-600 uppercase tracking-widest bg-neutral-900 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-neutral-800">
                  {t('auto_update')}
               </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-8">
              {filteredManhwas.map(manhwa => <ManhwaCard key={manhwa.id} manhwa={manhwa} />)}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-10">
           <section className="bg-neutral-950/50 border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
              <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-8 flex items-center gap-3 relative z-10">
                <TrendingUp className="text-neutral-400" />
                {t('trending')}
              </h2>
              <div className="space-y-8 relative z-10">
                {manhwas.slice(0, 4).map((m, i) => (
                  <Link key={m.id} to={`/details/${m.id}`} className="flex gap-5 group items-center">
                    <div className="text-5xl font-black text-neutral-900 group-hover:accent-text transition-colors w-12 italic shrink-0">{i+1}</div>
                    <div className="relative shrink-0">
                       <img src={m.coverImage} className="w-16 h-20 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform" alt="" />
                       <div className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black">
                          {m.rating || 'N/A'}
                       </div>
                    </div>
                    <div className="space-y-1 overflow-hidden">
                       <h3 className="font-black text-sm truncate group-hover:text-neutral-300 transition-colors">
                          {language === 'en' ? m.titleEn || m.title : m.title}
                       </h3>
                       <p className="text-[10px] text-neutral-600 uppercase font-black tracking-tighter">
                          {m.chapters?.length || 0} {language === 'en' ? 'Chapters' : 'فصول'} • {m.status}
                       </p>
                    </div>
                  </Link>
                ))}
              </div>
           </section>
        </aside>
      </div>
    </div>
  );
};

export default Home;
