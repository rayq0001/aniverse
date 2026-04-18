
import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ManhwaCard from '../components/ManhwaCard';
import { Zap, TrendingUp, Sparkles, ArrowRight, Loader2, Bot, Play, BookOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useManhwas } from '../contexts/ManhwaContext';
import { useInView } from 'react-intersection-observer';

const { useLocation, Link } = ReactRouterDOM as any;

const Home: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [aiPick, setAiPick] = useState<any | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const { manhwas } = useManhwas();

  const heroItems = useMemo(() => {
    return manhwas.filter(m => m.bannerImage || m.coverImage).slice(0, 5);
  }, [manhwas]);

  const currentHero = heroItems[heroIndex] || aiPick;

  useEffect(() => {
    if (manhwas.length > 0 && !aiPick) {
      setAiPick(manhwas[Math.floor(Math.random() * manhwas.length)]);
    }
  }, [manhwas]);

  // Auto-rotate hero every 8 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroItems.length]);

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

  const [visibleCount, setVisibleCount] = useState(12);
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (loadMoreInView && visibleCount < filteredManhwas.length) {
      setVisibleCount(prev => Math.min(prev + 12, filteredManhwas.length));
    }
  }, [loadMoreInView, visibleCount, filteredManhwas.length]);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedGenre]);

  const visibleManhwas = useMemo(() => filteredManhwas.slice(0, visibleCount), [filteredManhwas, visibleCount]);

  const nextHero = () => setHeroIndex(prev => (prev + 1) % heroItems.length);
  const prevHero = () => setHeroIndex(prev => (prev - 1 + heroItems.length) % heroItems.length);

  return (
    <div>
      {/* AI Search Banner */}
      {isSearchingAI && (
        <div className="mb-6 bg-neutral-100/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
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

      {/* ========== HERO SECTION — Full Bleed ========== */}
      {!searchQuery && !selectedGenre && currentHero && (
        <div className="-mx-3 sm:-mx-4 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 mb-10 md:mb-16">
          <div className="relative w-full h-[70vh] min-h-[420px] max-h-[800px] overflow-hidden group">
            {/* Background Image — Full Coverage */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHero.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <img
                  src={currentHero.bannerImage || currentHero.coverImage}
                  className="w-full h-full object-cover"
                  alt=""
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

            {/* Hero Content */}
            <div className="absolute inset-0 flex items-end">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-16">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentHero.id + '-content'}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-10"
                  >
                    {/* Cover Image */}
                    <div className="hidden md:block w-44 lg:w-56 shrink-0 relative">
                      <div className="absolute -inset-2 bg-white/5 rounded-2xl blur-2xl" />
                      <img
                        src={currentHero.coverImage}
                        className="relative w-full aspect-[2/3] object-cover rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
                        alt=""
                      />
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 space-y-4 md:space-y-5" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider" style={{ background: 'var(--accent-color)', color: '#000' }}>
                          <Sparkles size={12} />
                          {t('ai_pick')}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-white/10 backdrop-blur-sm text-white/80 text-[10px] font-bold uppercase tracking-wider">
                          {currentHero.status === 'ongoing' ? t('status_ongoing') : t('status_completed')}
                        </span>
                        {currentHero.rating && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-black">
                            <Star size={10} className="fill-yellow-400" /> {currentHero.rating}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black leading-[0.95] tracking-tight text-white">
                        {language === 'en' ? currentHero.titleEn || currentHero.title : currentHero.title}
                      </h1>

                      {/* Genres */}
                      <div className="flex flex-wrap gap-2">
                        {currentHero.genres?.slice(0, 4).map((genre: string) => (
                          <span key={genre} className="text-neutral-400 text-[11px] font-semibold bg-white/5 px-2.5 py-0.5 rounded">
                            {genre}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="text-neutral-300 text-sm md:text-base max-w-xl leading-relaxed line-clamp-2 hidden sm:block">
                        {language === 'en' ? currentHero.descriptionEn || currentHero.description : currentHero.description}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <Link
                          to={`/details/${currentHero.id}`}
                          className="group/btn inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base text-black transition-all active:scale-95 hover:brightness-110 shadow-lg"
                          style={{ background: 'var(--accent-color)' }}
                        >
                          <Play size={16} className="fill-current" />
                          {t('start_reading')}
                        </Link>
                        <Link
                          to={`/details/${currentHero.id}`}
                          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base text-white bg-white/10 hover:bg-white/15 backdrop-blur-sm transition-all active:scale-95"
                        >
                          <BookOpen size={16} />
                          {language === 'en' ? 'Details' : 'التفاصيل'}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Dots & Arrows */}
                {heroItems.length > 1 && (
                  <div className="flex items-center justify-between mt-6 md:mt-8">
                    <div className="flex items-center gap-2">
                      {heroItems.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setHeroIndex(i)}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            i === heroIndex ? 'w-8 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={prevHero}
                        className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft size={18} className="text-white" />
                      </button>
                      <button
                        onClick={nextHero}
                        className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                      >
                        <ChevronRight size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CONTENT SECTIONS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

        {/* Latest Releases — Main Column */}
        <div className="lg:col-span-8 xl:col-span-9">
          <section>
            <div className="flex items-center justify-between mb-5 md:mb-7">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)' }}>
                  <Zap size={18} style={{ color: 'var(--accent-color)' }} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{t('latest_releases')}</h2>
                  <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{t('auto_update')}</p>
                </div>
              </div>
              <Link
                to="/search"
                className="text-xs font-semibold text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
              >
                {language === 'en' ? 'View All' : 'عرض الكل'}
                <ArrowRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {visibleManhwas.map(manhwa => <ManhwaCard key={manhwa.id} manhwa={manhwa} />)}
            </div>
            {visibleCount < filteredManhwas.length && (
              <div ref={loadMoreRef} className="flex justify-center py-10">
                <Loader2 className="animate-spin text-neutral-600" size={24} />
              </div>
            )}
          </section>
        </div>

        {/* Top 5 Trending — Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp size={18} className="text-orange-500" />
              <h2 className="text-base font-bold text-white">{language === 'en' ? 'Top 5' : 'توب 5'}</h2>
            </div>
            <div className="space-y-2">
              {manhwas.slice(0, 5).map((m, i) => (
                <Link
                  key={m.id}
                  to={`/details/${m.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <span className={`text-xl font-black tabular-nums w-6 text-center shrink-0 ${i === 0 ? 'text-orange-500' : i < 3 ? 'text-neutral-400' : 'text-neutral-700'}`}>
                    {i + 1}
                  </span>
                  <img
                    src={m.coverImage}
                    className="w-10 h-13 object-cover rounded-md shrink-0"
                    alt=""
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-neutral-200 truncate group-hover:text-white transition-colors">
                      {language === 'en' ? m.titleEn || m.title : m.title}
                    </h3>
                    <p className="text-[10px] text-neutral-600 mt-0.5">
                      {m.chapters?.length || 0} {language === 'en' ? 'Ch' : 'فصل'} · {m.status === 'ongoing' ? (language === 'en' ? 'Ongoing' : 'مستمر') : (language === 'en' ? 'Completed' : 'مكتمل')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;
