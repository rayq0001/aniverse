
import React, { useState, useEffect } from 'react';
import { Star, Heart, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Manhwa, GenreEn } from '../types';
import * as ReactRouterDOM from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const { Link } = ReactRouterDOM as any;

interface ManhwaCardProps {
  manhwa: Manhwa;
}

const ManhwaCard: React.FC<ManhwaCardProps> = ({ manhwa }) => {
  const { t, language } = useLanguage();
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimate, setIsAnimate] = useState(false);

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    setIsLiked(favs.includes(manhwa.id));
  }, [manhwa.id]);

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimate(true);
    setTimeout(() => setIsAnimate(false), 300);

    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    let newFavs = isLiked ? favs.filter((id: string) => id !== manhwa.id) : [...favs, manhwa.id];
    localStorage.setItem('user_favorites', JSON.stringify(newFavs));
    setIsLiked(!isLiked);
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  const title = language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Link 
        to={`/details/${manhwa.id}`}
        className="group relative block aspect-[2/3] bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-700 ease-out hover:border-[var(--accent-color)]/40 hover:shadow-[0_20px_50px_-12px_rgba(var(--accent-rgb),0.3)]"
      >
        <img 
          src={manhwa.coverImage} 
          alt={title}
          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:blur-sm group-hover:brightness-50"
          loading="lazy"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col p-5 md:p-7 text-center justify-center items-center backdrop-blur-sm bg-black/40">
          
          {/* Top Controls Container */}
          <div className="absolute top-5 left-0 right-0 px-5 flex justify-between items-start w-full pointer-events-none">
            {/* Heart Button */}
            <div className="pointer-events-auto scale-75 group-hover:scale-100 transition-all duration-500 delay-100 -translate-y-4 group-hover:translate-y-0">
              <button 
                onClick={toggleLike}
                className={`p-2.5 rounded-2xl backdrop-blur-2xl transition-all duration-300 active:scale-90 border border-white/10 ${isLiked ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
              >
                <Heart 
                  size={14} 
                  fill={isLiked ? "currentColor" : "none"} 
                  className={`transition-all duration-300 ${isAnimate ? 'scale-150 rotate-12' : 'scale-100 rotate-0'}`}
                />
              </button>
            </div>

            {/* Status Badge */}
            <div className="pointer-events-auto scale-75 group-hover:scale-100 transition-all duration-500 delay-100 -translate-y-4 group-hover:translate-y-0">
               <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[8px] font-black uppercase tracking-[0.15em] backdrop-blur-2xl border transition-all duration-500 ${
                 manhwa.status === 'ongoing' 
                 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                 : 'bg-white border-white text-black'
               }`}>
                 {manhwa.status === 'ongoing' ? (
                   <>
                     <span className="relative flex h-1.5 w-1.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                     </span>
                     {t('status_ongoing')}
                   </>
                 ) : (
                   <>
                     <CheckCircle size={10} />
                     {t('status_completed')}
                   </>
                 )}
               </span>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex flex-col items-center w-full space-y-3 md:space-y-4">
            {/* Name */}
            <h3 className="text-white font-black text-base md:text-xl translate-y-6 group-hover:translate-y-0 transition-all duration-500 delay-150 line-clamp-2 tracking-tight leading-tight">
              {title}
            </h3>
            
            {/* Classification (Genres) */}
            <div className="flex flex-wrap justify-center gap-1.5 translate-y-6 group-hover:translate-y-0 transition-all duration-500 delay-200">
              {manhwa.genres.slice(0, 2).map(genre => (
                <span key={genre} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border backdrop-blur-md" style={{ color: 'var(--accent-color)', backgroundColor: 'rgba(var(--accent-rgb), 0.1)', borderColor: 'rgba(var(--accent-rgb), 0.2)' }}>
                  {language === 'en' ? GenreEn[genre] || genre : genre}
                </span>
              ))}
            </div>

            {/* Bio (Description) */}
            <p className="text-neutral-300 text-[9px] md:text-[10px] font-medium line-clamp-3 md:line-clamp-4 translate-y-6 group-hover:translate-y-0 transition-all duration-500 delay-250 leading-relaxed max-w-[90%] opacity-80">
              {language === 'en' ? manhwa.descriptionEn || manhwa.description : manhwa.description}
            </p>

            {/* Ratings */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 translate-y-6 group-hover:translate-y-0 transition-all duration-500 delay-300">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-black text-white">{manhwa.rating}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ManhwaCard;
