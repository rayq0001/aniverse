import React, { useEffect, useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, Play, Bookmark, Share2, Info, List, BrainCircuit, CheckCircle2, ClipboardCheck, ArrowDownWideNarrow, ArrowUpWideNarrow, Calendar, LayoutGrid, TextSelect, Loader2, Sparkles, Quote, Compass, Zap } from 'lucide-react';
// Removed non-existent import getManhwaAIAssistance
import { getDeepManhwaAnalysis } from '../services/geminiService';
import { GenreEn } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CommentSection from '../components/CommentSection';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const { useParams, Link } = ReactRouterDOM as any;

const Details: React.FC = () => {
  const { id } = useParams();
  const [manhwa, setManhwa] = useState<any>(null);
  const [manhwaChapters, setManhwaChapters] = useState<any[]>([]);
  const { t, language } = useLanguage();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisPhase, setAnalysisPhase] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [allManhwas, setAllManhwas] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const unsubManhwa = onSnapshot(doc(db, 'manhwas', id), (docSnap) => {
      if (docSnap.exists()) {
        setManhwa({ id: docSnap.id, ...docSnap.data() });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `manhwas/${id}`);
    });

    const q = query(collection(db, `manhwas/${id}/chapters`), orderBy('number', 'asc'));
    const unsubChapters = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setManhwaChapters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `manhwas/${id}/chapters`);
    });

    const unsubAll = onSnapshot(collection(db, 'manhwas'), (snap) => {
      setAllManhwas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubManhwa();
      unsubChapters();
      unsubAll();
    };
  }, [id]);

  useEffect(() => {
    if (manhwa) {
      window.scrollTo(0, 0);
      const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      setIsFavorite(favs.includes(manhwa.id));
      const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
      const manhwaReadChapters = history
        .filter((h: any) => h.manhwaId === manhwa.id)
        .map((h: any) => h.chapterId);
      setReadChapters(manhwaReadChapters);
    }
  }, [manhwa, id]);

  const sortedChapters = useMemo(() => {
    if (!manhwa) return [];
    // Use manhwaChapters from state, or fallback to manhwa.chapters if it's mock data
    const chapters = manhwaChapters.length > 0 ? [...manhwaChapters] : (manhwa.chapters ? [...manhwa.chapters] : []);
    return sortOrder === 'desc' ? chapters.reverse() : chapters;
  }, [manhwa, manhwaChapters, sortOrder]);

  const toggleFavorite = () => {
    if (!manhwa) return;
    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    let newFavs;
    if (isFavorite) {
      newFavs = favs.filter((fid: string) => fid !== manhwa.id);
    } else {
      newFavs = [...favs, manhwa.id];
    }
    localStorage.setItem('user_favorites', JSON.stringify(newFavs));
    setIsFavorite(!isFavorite);
  };

  const handleAIDeepAnalysis = async () => {
    if (!manhwa) return;
    setIsLoadingAI(true);
    setAiAnalysis('');
    
    const phases = language === 'ar' 
      ? [ 'جاري قراءة هيكل القصة...', 'تحليل ديناميكية الصراع...', 'فحص نبض المجتمع...', 'تجميع التقرير النهائي...' ]
      : [ 'Reading story structure...', 'Analyzing conflict dynamics...', 'Checking community pulse...', 'Compiling final report...' ];

    for (const phase of phases) {
      setAnalysisPhase(phase);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const result = await getDeepManhwaAnalysis(
      language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title, 
      language === 'en' ? manhwa.descriptionEn || manhwa.description : manhwa.description, 
      [], // No comments list for now in AI analysis
      language
    );
    
    setAiAnalysis(result);
    setIsLoadingAI(false);
    setAnalysisPhase('');
  };

  const handleShare = async () => {
    if (!manhwa) return;
    const shareUrl = window.location.href;
    const shareData = { title: manhwa.title, text: `Check out ${manhwa.title} on Aniverse!`, url: shareUrl };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const lastReadChapterId = useMemo(() => {
    if (!manhwa) return null;
    const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
    const record = history.find((h: any) => h.manhwaId === manhwa.id);
    return record ? record.chapterId : (sortedChapters.length > 0 ? sortedChapters[0].id : null);
  }, [manhwa, sortedChapters]);

  if (!manhwa) return <div className="p-12 text-center text-2xl font-black">Not Found</div>;

  const displayTitle = language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title;
  const displayDescription = language === 'en' ? manhwa.descriptionEn || manhwa.description : manhwa.description;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 h-[280px] sm:h-[350px] md:h-[500px] rounded-2xl sm:rounded-[3rem] overflow-hidden"
        >
          <img src={manhwa.bannerImage} className="w-full h-full object-cover opacity-30 blur-md scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-neutral-900/20 mix-blend-overlay"></div>
        </motion.div>

        <div className="relative pt-12 sm:pt-16 md:pt-32 px-2 sm:px-4 flex flex-col md:flex-row gap-5 sm:gap-8 md:gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-40 sm:w-56 md:w-80 mx-auto md:mx-0 flex-shrink-0"
          >
            <img src={manhwa.coverImage} className="w-full aspect-[2/3] rounded-2xl sm:rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border-4 border-white/5 object-cover" alt={displayTitle} />
          </motion.div>
          
          <div className="flex-1 space-y-4 sm:space-y-6 md:space-y-10 self-end pb-4 sm:pb-8 text-center md:text-right" style={{ textAlign: language === 'en' ? 'left' : undefined }}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-wrap justify-center md:justify-start gap-3"
            >
              {manhwa.genres.map(genre => (
                <span key={genre} className="bg-white/5 backdrop-blur-md text-neutral-400 border border-white/10 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">
                  {language === 'en' ? GenreEn[genre] || genre : genre}
                </span>
              ))}
              <span className="bg-emerald-500/10 backdrop-blur-md text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">
                {manhwa.status === 'ongoing' ? t('status_ongoing') : t('status_completed')}
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-4xl md:text-7xl font-black leading-[1.1] tracking-tighter"
            >
              {displayTitle}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-8 md:gap-12 text-slate-200"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Star size={20} className="text-yellow-500 fill-yellow-500 sm:w-6 sm:h-6" />
                <span className="text-xl sm:text-2xl md:text-4xl font-black">{manhwa.rating}</span>
                <span className="text-neutral-500 text-[10px] sm:text-xs md:text-sm font-bold">(524 {t('reviews')})</span>
              </div>
              <div className="hidden sm:block h-8 md:h-12 w-px bg-white/10"></div>
              <div className="hidden sm:block text-right md:text-right" style={{ textAlign: language === 'en' ? 'left' : undefined }}>
                <span className="block text-[10px] text-neutral-500 uppercase tracking-[0.3em] font-black mb-1">{t('author')}</span>
                <span className="font-black text-lg md:text-2xl tracking-tight">{manhwa.author}</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 md:gap-6"
            >
              {lastReadChapterId && (
                <Link to={`/reader/${manhwa.id}/${lastReadChapterId}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 bg-white text-black hover:bg-neutral-200 px-5 sm:px-8 md:px-14 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl font-black transition-all shadow-2xl shadow-white/5 active:scale-95 text-sm sm:text-base md:text-xl">
                  <Play size={20} fill="currentColor" />
                  <span>{readChapters.length > 0 ? (language === 'ar' ? 'متابعة القراءة' : 'Continue Reading') : t('read_now')}</span>
                </Link>
              )}
              <button onClick={toggleFavorite} className={`flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-10 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl font-black transition-all border text-sm sm:text-base md:text-xl backdrop-blur-md ${isFavorite ? 'bg-white border-white text-black shadow-2xl' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}>
                <Bookmark size={20} fill={isFavorite ? "currentColor" : "none"} />
                <span className="whitespace-nowrap">{isFavorite ? t('in_favorite') : t('add_favorite')}</span>
              </button>
              
              <div className="relative flex-none">
                <button onClick={handleShare} className="flex items-center gap-3 p-4 md:p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group backdrop-blur-md" title="Share">
                  <Share2 size={20} className="group-hover:text-white" />
                  <span className="hidden sm:inline font-black uppercase text-sm tracking-widest">{t('share')}</span>
                </button>
                {showShareToast && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-black px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 whitespace-nowrap animate-in slide-in-from-bottom-2">
                    <ClipboardCheck size={16} /> <span>{t('copied')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12 pt-2 sm:pt-4 md:pt-8 px-1 sm:px-4 md:px-0">
        <div className="lg:col-span-2 space-y-8 md:space-y-12">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-400">
                <Info size={20} /> <h2 className="text-xl md:text-2xl font-black text-white">{t('story_title')}</h2>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase bg-neutral-900/50 px-3 py-1 rounded-full border border-neutral-800">
                <TextSelect size={12} className="text-neutral-400" /> <span>{t('select_text_hint')}</span>
              </div>
            </div>
            <div className="relative group p-5 md:p-6 bg-neutral-950/30 rounded-2xl md:rounded-3xl border border-transparent hover:border-neutral-800 transition-all cursor-text">
              <p className="text-neutral-300 leading-relaxed text-base md:text-lg whitespace-pre-line selection:bg-white/10 selection:text-white">
                {displayDescription}
              </p>
            </div>
          </section>

          {/* AI Deep Analysis Section */}
          <section className="bg-neutral-950/80 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-6 md:p-12 border border-white/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 text-white pointer-events-none">
              <BrainCircuit size={180} />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-tr from-neutral-600 to-neutral-800 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl border border-white/10 transform group-hover:rotate-6 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl md:text-3xl font-black text-white">{t('ai_analysis_title')}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap size={12} className="text-yellow-500" />
                    <p className="text-[9px] md:text-[11px] text-neutral-400 font-black uppercase tracking-widest">Gemini 3 Deep Engine</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAIDeepAnalysis}
                  disabled={isLoadingAI}
                  className="w-full sm:w-auto group/btn flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 bg-white text-black hover:bg-neutral-200 rounded-xl md:rounded-[1.5rem] font-black text-xs md:text-sm transition-all active:scale-95 shadow-2xl shadow-white/5 disabled:opacity-50"
                >
                  {isLoadingAI ? <Loader2 className="animate-spin" size={18} /> : <Compass size={18} className="group-hover/btn:rotate-90 transition-transform" />}
                  <span>{isLoadingAI ? t('analyzing') : t('request_analysis')}</span>
                </button>
              </div>
            </div>

            <div className="relative z-10">
              {isLoadingAI ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-16 space-y-6 md:space-y-8 animate-in fade-in duration-500">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                    <BrainCircuit className="absolute inset-0 m-auto text-neutral-400 animate-pulse" size={24} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg md:text-xl text-white font-black tracking-tight">{analysisPhase}</p>
                    <p className="text-neutral-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">{t('analyzing')}</p>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                   <div className="bg-black/50 p-6 md:p-12 rounded-2xl md:rounded-[2.5rem] border border-white/5 space-y-8 md:space-y-10 relative">
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 text-white/10">
                      <Quote size={32} />
                    </div>
                      
                      <div className="prose prose-invert max-w-none text-neutral-200 leading-[1.8] whitespace-pre-wrap font-medium text-sm md:text-lg">
                        {aiAnalysis}
                      </div>
                   </div>
                </div>
              ) : (
                <div className="text-center py-12 md:py-20 bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-dashed border-white/10 hover:border-white/30 transition-all group/empty cursor-pointer" onClick={handleAIDeepAnalysis}>
                  <div className="flex flex-col items-center gap-4 md:gap-6">
                    <div className="p-4 md:p-6 bg-neutral-900 rounded-xl md:rounded-[2rem] group-hover/empty:scale-110 transition-transform">
                      <Compass className="text-neutral-700 group-hover/empty:text-white" size={40} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg md:text-2xl text-white font-black">{t('request_analysis')}</p>
                      <p className="text-neutral-500 text-xs md:text-sm max-w-xs mx-auto font-bold leading-relaxed">{t('select_text_hint')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-400">
                <List size={20} /> <h2 className="text-xl md:text-2xl font-black text-white">{t('chapter_list')}</h2>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-neutral-800 transition-all text-neutral-300">
                  {sortOrder === 'desc' ? <ArrowDownWideNarrow size={12} /> : <ArrowUpWideNarrow size={12} />}
                  <span>{sortOrder === 'desc' ? (language === 'ar' ? 'الأحدث' : 'Newest') : (language === 'ar' ? 'الأقدم' : 'Oldest')}</span>
                </button>
                <span className="text-neutral-500 font-bold text-xs md:text-sm bg-neutral-900/50 px-2.5 py-1 md:px-3 md:py-1 rounded-full border border-neutral-800">{manhwaChapters.length}</span>
              </div>
            </div>
            
            <div className="bg-black rounded-xl sm:rounded-2xl md:rounded-3xl border border-neutral-900 divide-y divide-neutral-900 overflow-hidden shadow-2xl">
              {(showAllChapters ? sortedChapters : sortedChapters.slice(0, 10)).map(chapter => {
                const isRead = readChapters.includes(chapter.id);
                return (
                  <Link key={chapter.id} to={`/reader/${manhwa.id}/${chapter.id}`} className={`flex items-center justify-between p-4 md:p-5 hover:bg-white/5 transition-all group relative ${isRead ? 'bg-white/[0.03]' : ''}`}>
                    <div className="flex items-center gap-3 md:gap-4 z-10">
                      <div className="relative">
                         <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-lg transition-all shadow-lg ${isRead ? 'bg-neutral-900 text-neutral-400 border border-white/20' : 'bg-neutral-950 border border-neutral-800 text-neutral-400 group-hover:bg-white group-hover:text-black group-hover:border-white group-hover:-translate-y-0.5'}`}>
                           {chapter.number}
                         </div>
                         {isRead && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neutral-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm md:text-lg block group-hover:text-neutral-400 transition-colors ${isRead ? 'text-neutral-400' : 'text-neutral-100'}`}>
                            {language === 'en' ? `Chapter ${chapter.number}` : `الفصل ${chapter.number}`}
                          </span>
                          {isRead && <CheckCircle2 size={14} className="text-neutral-400" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`flex items-center gap-1 px-2 md:px-3 py-1 rounded-full border text-[9px] md:text-xs font-bold transition-colors ${isRead ? 'bg-neutral-900/50 border-neutral-800 text-neutral-600' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>
                        <Calendar size={10} className={isRead ? "text-neutral-700" : "text-neutral-400"} /> <span className="tracking-tighter">{(chapter.releaseDate || chapter.createdAt) ? new Date(chapter.releaseDate || chapter.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {sortedChapters.length > 10 && (
              <button 
                onClick={() => setShowAllChapters(!showAllChapters)}
                className="w-full py-4 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 rounded-2xl font-black text-sm text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2 group"
              >
                {showAllChapters ? (
                  <>
                    <ArrowUpWideNarrow size={18} className="group-hover:-translate-y-1 transition-transform" />
                    {language === 'ar' ? 'عرض أقل' : 'Show Less'}
                  </>
                ) : (
                  <>
                    <ArrowDownWideNarrow size={18} className="group-hover:translate-y-1 transition-transform" />
                    {language === 'ar' ? 'عرض المزيد من الفصول' : 'Show More Chapters'}
                  </>
                )}
              </button>
            )}
          </section>

          <CommentSection manhwaId={manhwa.id} />
        </div>

        <aside className="space-y-8">
          <div className="bg-black p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-neutral-900 space-y-5 sm:space-y-6 md:space-y-8 shadow-2xl lg:sticky lg:top-24">
            <h3 className="font-black text-lg md:text-xl border-b border-neutral-900 pb-4 md:pb-5 text-neutral-400 uppercase tracking-tighter italic">{t('data_card')}</h3>
            <div className="space-y-4 md:space-y-5">
              <div className="flex justify-between items-center"><span className="text-neutral-500 text-[10px] md:text-xs font-bold">{t('release_date')}</span><span className="font-black text-neutral-300 text-xs md:text-sm">{manhwa.releaseDate}</span></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500 text-[10px] md:text-xs font-bold">{t('status')}</span><span className="font-black text-emerald-400 text-xs md:text-sm">{manhwa.status === 'ongoing' ? t('status_ongoing') : t('status_completed')}</span></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500 text-[10px] md:text-xs font-bold">{t('artist')}</span><span className="font-black text-neutral-300 text-xs md:text-sm">{manhwa.artist}</span></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500 text-[10px] md:text-xs font-bold">{t('views')}</span><span className="font-black text-neutral-300 text-xs md:text-sm">12.5M</span></div>
            </div>

            <div className="space-y-5 md:space-y-6 pt-4 md:pt-5 border-t border-neutral-900">
               <div className="flex items-center gap-2 text-neutral-400">
                <LayoutGrid size={18} /> <h3 className="font-black text-base md:text-lg">{t('similar_works')}</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:gap-5">
                {allManhwas.filter(m => m.id !== id).slice(0, 3).map(m => (
                  <Link key={m.id} to={`/details/${m.id}`} className="group flex gap-3 md:gap-4 p-2 rounded-xl md:rounded-2xl hover:bg-neutral-900 transition-all">
                    <div className="w-14 h-20 md:w-16 md:h-24 shrink-0 overflow-hidden rounded-lg md:rounded-xl border border-neutral-800">
                      <img src={m.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={m.title} />
                    </div>
                    <div className="flex flex-col justify-center gap-1 md:gap-1.5 overflow-hidden">
                      <h4 className="font-black text-[10px] md:text-xs text-neutral-100 group-hover:text-white transition-colors line-clamp-1">
                        {language === 'en' ? m.titleEn || m.title : m.title}
                      </h4>
                      <div className="flex items-center gap-1"><Star size={10} className="text-yellow-500 fill-yellow-500" /><span className="text-[9px] md:text-[10px] font-black text-neutral-400">{m.rating}</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Details;