
import React, { useEffect, useState, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, BrainCircuit, ScanSearch, X, Loader2, Sparkles, Settings, List, ArrowUp, Milestone, Zap, Infinity, ZoomIn, GripHorizontal } from 'lucide-react';
import { analyzeChapterAI, explainMangaPage } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import CommentSection from '../components/CommentSection';
import { doc, onSnapshot, collection, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';

const { useParams, Link, useNavigate } = ReactRouterDOM as any;

const Reader: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { manhwaId, chapterId } = useParams();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(100);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiType, setAiType] = useState<'summary' | 'analysis'>('summary');
  const [aiContent, setAiContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showProgressToast, setShowProgressToast] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const [continuousReading, setContinuousReading] = useState(() => localStorage.getItem('continuous_reading') !== 'false');
  const [fastReading, setFastReading] = useState(() => localStorage.getItem('fast_reading') === 'true');
  const [loadedChapters, setLoadedChapters] = useState<any[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [manhwa, setManhwa] = useState<any>(null);
  const [manhwaChapters, setManhwaChapters] = useState<any[]>([]);

  useEffect(() => {
    if (!manhwaId) return;
    
    const unsubManhwa = onSnapshot(doc(db, 'manhwas', manhwaId), (docSnap) => {
      if (docSnap.exists()) {
        setManhwa({ id: docSnap.id, ...docSnap.data() });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `manhwas/${manhwaId}`);
    });

    const q = query(collection(db, `manhwas/${manhwaId}/chapters`), orderBy('number', 'asc'));
    const unsubChapters = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setManhwaChapters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `manhwas/${manhwaId}/chapters`);
    });

    return () => {
      unsubManhwa();
      unsubChapters();
    };
  }, [manhwaId]);

  const currentChapterIndex = manhwaChapters.findIndex(c => c.id === chapterId);

  useEffect(() => {
    if (manhwaId && chapterId && manhwa && manhwaChapters.length > 0) {
      const initialChapter = manhwaChapters.find(c => c.id === chapterId);
      if (initialChapter) {
        setLoadedChapters([initialChapter]);
      }
      
      const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
      const newHistory = [{ manhwaId, chapterId, timestamp: Date.now() }, ...history.filter((h: any) => h.manhwaId !== manhwaId)];
      localStorage.setItem('reading_history', JSON.stringify(newHistory.slice(0, 50)));
      // Sync unique manhwa IDs to Firestore
      if (auth.currentUser) {
        const historyIds = [...new Set(newHistory.slice(0, 50).map((h: any) => h.manhwaId))] as string[];
        updateDoc(doc(db, 'users', auth.currentUser.uid), { readingHistory: historyIds }).catch(() => {});
      }

      // Restore progress
      const savedProgress = localStorage.getItem(`reading_progress_${manhwaId}_${chapterId}`);
      if (savedProgress) {
        setShowProgressToast(true);
        setTimeout(() => setShowProgressToast(false), 3000);
        
        // Use a more robust way to wait for content
        const restore = () => {
          const scrollPos = parseInt(savedProgress);
          if (scrollPos > 0) {
            window.scrollTo({
              top: scrollPos,
              behavior: 'instant' as any
            });
          }
        };

        // Try multiple times as images load
        setTimeout(restore, 100);
        setTimeout(restore, 500);
        setTimeout(restore, 1000);
        setTimeout(restore, 2000);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [chapterId, manhwaId, manhwa, manhwaChapters]);

  useEffect(() => {
    if (!continuousReading || !manhwa || loadedChapters.length === 0 || manhwaChapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const lastLoadedChapter = loadedChapters[loadedChapters.length - 1];
          const lastIdx = manhwaChapters.findIndex(c => c.id === lastLoadedChapter.id);
          
          if (lastIdx < manhwaChapters.length - 1) {
            const nextChapter = manhwaChapters[lastIdx + 1];
            setLoadedChapters(prev => [...prev, nextChapter]);
          }
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadedChapters, continuousReading, manhwa, manhwaChapters]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setReadingProgress(scrolled);

      // Save progress to localStorage (debounced)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        if (manhwaId && chapterId && currentScrollY > 100) {
          localStorage.setItem(`reading_progress_${manhwaId}_${chapterId}`, String(currentScrollY));
        }
      }, 500);

      // Auto-hide controls logic
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowControls(false);
      } else {
        setShowControls(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [manhwaId, chapterId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!manhwaChapters || manhwaChapters.length === 0) return;
      if (e.key === 'ArrowRight') {
        if (language === 'ar') {
          if (currentChapterIndex > 0) navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex - 1].id}`);
        } else {
          if (currentChapterIndex < manhwaChapters.length - 1) navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex + 1].id}`);
        }
      } else if (e.key === 'ArrowLeft') {
        if (language === 'ar') {
          if (currentChapterIndex < manhwaChapters.length - 1) navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex + 1].id}`);
        } else {
          if (currentChapterIndex > 0) navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex - 1].id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, manhwaChapters, manhwaId, navigate, language]);

  const handleChapterAI = async () => {
    if (!manhwa || loadedChapters.length === 0) return;
    const currentChapter = loadedChapters[0]; // Summary for first loaded
    setIsAiLoading(true);
    setAiType('summary');
    setIsAiPanelOpen(true);
    const result = await analyzeChapterAI(
      language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title, 
      currentChapter.number,
      language
    );
    setAiContent(result || (language === 'en' ? "Unable to generate summary." : "تعذر إنشاء الملخص."));
    setIsAiLoading(false);
  };

  const handlePageAnalysis = async () => {
    if (!manhwa || loadedChapters.length === 0) return;
    const currentChapter = loadedChapters[0];
    const firstImageUrl = currentChapter.images?.[0] || currentChapter.pages?.[0];
    
    if (!firstImageUrl) {
      toast.error(language === 'ar' ? 'لا توجد صور لتحليلها' : 'No images to analyze');
      return;
    }

    setIsAiLoading(true);
    setAiType('analysis');
    setIsAiPanelOpen(true);
    
    try {
      // Fetch the image and convert to base64
      const response = await fetch(firstImageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = base64data.split(',')[1];
        const result = await explainMangaPage(base64, language);
        setAiContent(result || (language === 'en' ? "Deep analysis ready." : "تحليل المشهد جاهز."));
        setIsAiLoading(false);
      };
    } catch (err) {
      console.error("Error fetching image for analysis:", err);
      setAiContent(language === 'ar' ? 'حدث خطأ أثناء تحميل الصورة للتحليل.' : 'Error loading image for analysis.');
      setIsAiLoading(false);
    }
  };

  const toggleContinuousReading = () => {
    const newVal = !continuousReading;
    setContinuousReading(newVal);
    localStorage.setItem('continuous_reading', String(newVal));
  };

  const toggleFastReading = () => {
    const newVal = !fastReading;
    setFastReading(newVal);
    localStorage.setItem('fast_reading', String(newVal));
  };

  if (!manhwa || loadedChapters.length === 0) return <div className="p-12 text-center text-2xl font-black">{t('chapter_not_found')}</div>;

  const displayTitle = manhwa ? (language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title) : '';

  return (
    <div className="flex flex-col min-h-screen -mx-4 md:-mx-8 -my-8 relative bg-black text-white" dir={dir}>
      
      {/* AI Sidebar Overlay */}
      <AnimatePresence>
        {showProgressToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2"
          >
            <Milestone size={16} />
            <span>{language === 'ar' ? 'تم استعادة مكان القراءة' : 'Reading progress restored'}</span>
          </motion.div>
        )}
        {isAiPanelOpen && (
          <motion.div 
            initial={{ x: language === 'ar' ? -400 : 400 }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? -400 : 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 ${language === 'ar' ? 'left-0' : 'right-0'} w-full md:w-96 bg-black/95 backdrop-blur-xl z-[100] border-x border-white/[0.06] p-6 flex flex-col`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center text-neutral-400">
                    {aiType === 'summary' ? <BrainCircuit size={18} /> : <ScanSearch size={18} />}
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">{aiType === 'summary' ? t('ai_summary_title') : t('ai_scene_analysis')}</h3>
                    <p className="text-[10px] text-neutral-500">Gemini AI</p>
                 </div>
              </div>
              <button onClick={() => setIsAiPanelOpen(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="animate-spin text-neutral-400" size={32} />
                  <p className="text-neutral-500 text-sm">{t('ai_analyzing_data')}</p>
                </div>
              ) : (
                <div className="bg-white/[0.03] p-5 rounded-xl border border-white/[0.04]">
                  <p className="whitespace-pre-wrap text-neutral-300 text-sm leading-relaxed">{aiContent}</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-white/[0.03] rounded-lg flex items-center justify-between text-[11px] text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>{t('ai_powered_by')}</span>
              </div>
              <span className="font-bold text-neutral-400">v3.1 Pro</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={`fixed top-0 left-0 right-0 z-[70] transition-all duration-300 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-white/80 transition-all duration-200" style={{ width: `${readingProgress}%` }}></div>
        
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Link to={`/details/${manhwa.id}`} className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors shrink-0">
              <ChevronRight size={18} className={language === 'ar' ? '' : 'rotate-180'} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-xs md:text-sm line-clamp-1">{displayTitle}</h1>
              <span className="text-[10px] text-neutral-500">{t('chapter')} {loadedChapters[0].number}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setIsQuickNavOpen(!isQuickNavOpen)} className="p-1.5 md:p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-neutral-400"><List size={16} /></button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 md:p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-neutral-400"><Settings size={16} /></button>
            <button onClick={handleChapterAI} className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg bg-white/[0.04] text-neutral-400 border border-white/[0.06] hover:bg-white hover:text-black transition-colors text-[10px] md:text-xs font-bold">
              <BrainCircuit size={14} />
              <span className="hidden sm:inline">{t('ai_summary_btn')}</span>
            </button>
            <button onClick={handlePageAnalysis} className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg bg-white/[0.04] text-neutral-400 border border-white/[0.06] hover:bg-white hover:text-black transition-colors text-[10px] md:text-xs font-bold">
              <ScanSearch size={14} />
              <span className="hidden sm:inline">{t('ai_analysis_btn')}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center pt-20 md:pt-24 pb-32">
        <div className="w-full transition-all duration-500 shadow-[0_0_100px_rgba(0,0,0,1)]" style={{ maxWidth: `${zoom}%` }}>
          {loadedChapters.map((ch, chIdx) => (
            <React.Fragment key={ch.id}>
              {chIdx > 0 && (
                <div className="py-12 flex flex-col items-center justify-center bg-neutral-950 border-y border-white/5 my-8">
                  <div className="px-6 py-2 bg-white text-black font-black rounded-full text-sm uppercase tracking-widest shadow-xl shadow-white/10">
                    {t('chapter')} {ch.number}
                  </div>
                </div>
              )}
              {ch.images && ch.images.map((page: string, idx: number) => (
                <img key={`${ch.id}-${idx}`} src={page} alt={`Page ${idx + 1}`} className="w-full h-auto block select-none" style={{ marginTop: idx > 0 ? '-1px' : 0 }} loading={idx < 3 ? 'eager' : 'lazy'} draggable={false} />
              ))}
              {/* Fallback for mock data which uses 'pages' */}
              {ch.pages && !ch.images && ch.pages.map((page: string, idx: number) => (
                <img key={`${ch.id}-${idx}`} src={page} alt={`Page ${idx + 1}`} className="w-full h-auto block select-none" style={{ marginTop: idx > 0 ? '-1px' : 0 }} loading={idx < 3 ? 'eager' : 'lazy'} draggable={false} />
              ))}
            </React.Fragment>
          ))}
          
          {/* Intersection Target for Infinite Scroll */}
          <div ref={observerTarget} className="h-20 w-full flex items-center justify-center">
            {continuousReading && loadedChapters.length > 0 && manhwaChapters.length > 0 && loadedChapters[loadedChapters.length - 1].id !== manhwaChapters[manhwaChapters.length - 1].id && (
              <div className="flex items-center gap-3 text-neutral-500">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-black uppercase tracking-widest">{language === 'ar' ? 'جاري تحميل الفصل التالي...' : 'Loading Next Chapter...'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Navigation Buttons (Only if not continuous or at the end) */}
        {!continuousReading && (
          <div className="w-full max-w-2xl px-4 mt-10 flex items-center justify-between gap-3">
             {currentChapterIndex > 0 ? (
               <button 
                 onClick={() => navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex - 1].id}`)}
                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.06] transition-colors font-bold text-sm"
               >
                 <ChevronRight className={language === 'ar' ? '' : 'rotate-180'} size={16} />
                 {language === 'ar' ? 'الفصل السابق' : 'Previous Chapter'}
               </button>
             ) : <div className="flex-1"></div>}

             {currentChapterIndex < manhwaChapters.length - 1 ? (
               <button 
                 onClick={() => navigate(`/reader/${manhwaId}/${manhwaChapters[currentChapterIndex + 1].id}`)}
                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black hover:bg-neutral-200 rounded-xl transition-colors font-bold text-sm"
               >
                 {language === 'ar' ? 'الفصل التالي' : 'Next Chapter'}
                 <ChevronLeft className={language === 'ar' ? '' : 'rotate-180'} size={16} />
               </button>
             ) : <div className="flex-1"></div>}
          </div>
        )}

        <div className="w-full max-w-4xl px-4 mt-20">
          <CommentSection manhwaId={manhwaId || ''} chapterId={chapterId} />
        </div>
      </div>

      {/* Quick Nav Sidebar */}
      <AnimatePresence>
        {isQuickNavOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickNavOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />
            <motion.div 
              initial={{ x: language === 'ar' ? 400 : -400 }}
              animate={{ x: 0 }}
              exit={{ x: language === 'ar' ? 400 : -400 }}
              className={`fixed inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-full sm:w-80 bg-black/95 backdrop-blur-xl border-x border-white/[0.06] z-[100] p-5 flex flex-col`}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-sm text-white">{t('chapters')}</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{manhwaChapters.length} {language === 'ar' ? 'فصل متاح' : 'Chapters Available'}</p>
                </div>
                <button onClick={() => setIsQuickNavOpen(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-500 transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                {manhwaChapters.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      navigate(`/reader/${manhwaId}/${c.id}`);
                      setIsQuickNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors group ${c.id === chapterId ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/[0.04] hover:border-white/[0.1] text-neutral-400 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center ${c.id === chapterId ? 'bg-black text-white' : 'bg-white/[0.06] text-neutral-500'}`}>{idx + 1}</span>
                      <span className="font-bold text-xs">{t('chapter')} {c.number}</span>
                    </div>
                    {c.id === chapterId ? (
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    ) : (
                      <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${language === 'ar' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reader Settings Bottom Sheet */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[110]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/[0.06] rounded-t-2xl z-[120] max-h-[70vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full bg-neutral-700" />
              </div>

              <div className="px-5 pb-6 pt-2">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-neutral-400" />
                    <h3 className="font-bold text-sm text-white">{t('settings')}</h3>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-500 transition-colors"><X size={16} /></button>
                </div>

                <div className="space-y-3">
                  {/* Continuous Reading */}
                  <button 
                    onClick={toggleContinuousReading}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                      continuousReading ? 'bg-white/[0.06] border-white/[0.1]' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      continuousReading ? 'bg-white text-black' : 'bg-white/[0.06] text-neutral-400'
                    }`}>
                      <Infinity size={16} />
                    </div>
                    <div className={`flex-1 text-${language === 'ar' ? 'right' : 'left'}`}>
                      <span className="block font-bold text-white text-xs">{language === 'ar' ? 'القراءة المستمرة' : 'Continuous Reading'}</span>
                      <span className="text-[10px] text-neutral-500">{language === 'ar' ? 'تحميل الفصول تلقائياً عند التمرير' : 'Auto-load chapters on scroll'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${continuousReading ? 'bg-white' : 'bg-neutral-800'}`}>
                      <motion.div 
                        animate={{ x: continuousReading ? 20 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`absolute top-0.5 w-4 h-4 rounded-full ${continuousReading ? 'bg-black' : 'bg-neutral-500'}`}
                      />
                    </div>
                  </button>

                  {/* Fast Mode */}
                  <button 
                    onClick={toggleFastReading}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                      fastReading ? 'bg-white/[0.06] border-white/[0.1]' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      fastReading ? 'bg-white text-black' : 'bg-white/[0.06] text-neutral-400'
                    }`}>
                      <Zap size={16} />
                    </div>
                    <div className={`flex-1 text-${language === 'ar' ? 'right' : 'left'}`}>
                      <span className="block font-bold text-white text-xs">{language === 'ar' ? 'وضع القراءة السريع' : 'Fast Mode'}</span>
                      <span className="text-[10px] text-neutral-500">{language === 'ar' ? 'تحميل الصور مسبقاً' : 'Preload images'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${fastReading ? 'bg-white' : 'bg-neutral-800'}`}>
                      <motion.div 
                        animate={{ x: fastReading ? 20 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`absolute top-0.5 w-4 h-4 rounded-full ${fastReading ? 'bg-black' : 'bg-neutral-500'}`}
                      />
                    </div>
                  </button>

                  {/* Zoom */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 text-neutral-400">
                        <ZoomIn size={16} />
                      </div>
                      <div className={`flex-1 text-${language === 'ar' ? 'right' : 'left'}`}>
                        <span className="block font-bold text-white text-xs">{language === 'ar' ? 'التكبير' : 'Zoom'}</span>
                      </div>
                      <span className="text-xs font-bold text-white tabular-nums">{zoom}%</span>
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="text-neutral-400 hover:text-white transition-colors">
                        <ChevronLeft size={14} />
                      </button>
                      <input 
                        type="range" 
                        min={50} max={100} step={5} 
                        value={zoom} 
                        onChange={e => setZoom(Number(e.target.value))}
                        className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                      <button onClick={() => setZoom(z => Math.min(z + 10, 100))} className="text-neutral-400 hover:text-white transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`fixed bottom-4 right-1/2 translate-x-1/2 z-[70] flex items-center gap-1.5 px-3 py-2 bg-black/90 backdrop-blur-xl rounded-xl border border-white/[0.06] transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
         <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 hover:text-white transition-colors">
           <ChevronLeft className="rotate-90" size={14} />
         </button>
         <span className="text-[10px] font-bold w-8 text-center text-neutral-400 tabular-nums">{zoom}%</span>
         <button onClick={() => setZoom(z => Math.min(z + 10, 100))} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 hover:text-white transition-colors">
           <ChevronRight className="-rotate-90" size={14} />
         </button>
         <div className="w-px h-3 bg-white/[0.06] mx-1"></div>
         <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 hover:text-white transition-colors">
           <ArrowUp size={14} />
         </button>
      </div>
    </div>
  );
};

export default Reader;
