
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Heart, CheckCircle, BookOpen, Clock } from 'lucide-react';
import { Manhwa, GenreEn } from '../types';
import * as ReactRouterDOM from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useInView } from 'react-intersection-observer';
import { collection, getCountFromServer, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const { Link } = ReactRouterDOM as any;

interface ManhwaCardProps {
  manhwa: Manhwa;
}

const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const ManhwaCard: React.FC<ManhwaCardProps> = ({ manhwa }) => {
  const { t, language } = useLanguage();
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimate, setIsAnimate] = useState(false);

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    setIsLiked(favs.includes(manhwa.id));
  }, [manhwa.id]);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimate(true);
    setTimeout(() => setIsAnimate(false), 300);

    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    let newFavs = isLiked ? favs.filter((id: string) => id !== manhwa.id) : [...favs, manhwa.id];
    localStorage.setItem('user_favorites', JSON.stringify(newFavs));
    setIsLiked(!isLiked);
    window.dispatchEvent(new Event('favoritesUpdated'));
    // Sync to Firestore
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), { favorites: newFavs }).catch(() => {});
    }
  }, [isLiked, manhwa.id]);

  const title = language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title;
  const [chapterCount, setChapterCount] = useState(manhwa.chapters?.length || 0);

  useEffect(() => {
    getCountFromServer(collection(db, 'manhwas', manhwa.id, 'chapters'))
      .then(snap => setChapterCount(snap.data().count))
      .catch(() => {});
  }, [manhwa.id]);

  const nextChapterText = useMemo(() => {
    if (manhwa.status !== 'ongoing') return null;
    const scheduleDays = manhwa.releaseSchedule;
    const updateDay = manhwa.updateDay;
    if (!scheduleDays?.length && updateDay == null) return null;

    const today = new Date();
    const todayDay = today.getDay();
    let targetDays: number[] = [];

    if (scheduleDays?.length) {
      targetDays = scheduleDays.map(d => dayMap[d.toLowerCase()] ?? -1).filter(d => d >= 0);
    } else if (updateDay != null) {
      targetDays = [updateDay];
    }
    if (!targetDays.length) return null;

    let minDiff = 8;
    for (const td of targetDays) {
      let diff = td - todayDay;
      if (diff <= 0) diff += 7;
      if (diff < minDiff) minDiff = diff;
    }

    if (language === 'ar') {
      return minDiff === 1 ? 'غداً' : `بعد ${minDiff} أيام`;
    }
    return minDiff === 1 ? 'Tomorrow' : `In ${minDiff} days`;
  }, [manhwa.releaseSchedule, manhwa.updateDay, manhwa.status, language]);

  const { ref: cardRef, inView } = useInView({ triggerOnce: true, rootMargin: '200px' });

  return (
    <div ref={cardRef} className="h-full">
      {!inView ? (
        <div className="aspect-[2/3] bg-neutral-900 rounded-xl animate-pulse" />
      ) : (
      <Link 
        to={`/details/${manhwa.id}`}
        className="group block h-full"
      >
        {/* Cover Image */}
        <div className="relative aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden mb-2.5">
          <LazyLoadImage 
            src={manhwa.coverImage} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            wrapperClassName="w-full h-full"
            effect="opacity"
            threshold={100}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Heart button */}
          <button 
            onClick={toggleLike}
            className={`absolute top-2 end-2 p-2 rounded-lg backdrop-blur-sm transition-all ${isLiked ? 'bg-white text-black' : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'}`}
          >
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} className={isAnimate ? 'scale-125' : ''} />
          </button>

          {/* Status badge */}
          <div className="absolute top-2 start-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold backdrop-blur-sm ${
              manhwa.status === 'ongoing' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-white/90 text-black'
            }`}>
              {manhwa.status === 'ongoing' ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{t('status_ongoing')}</>
              ) : (
                <><CheckCircle size={10} />{t('status_completed')}</>
              )}
            </span>
          </div>

          {/* Bottom info on hover */}
          <div className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
              <BookOpen size={11} className="text-white/70" />
              <span className="text-[10px] font-bold text-white">{chapterCount}</span>
            </div>
            {nextChapterText && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                <Clock size={11} className="text-white/70" />
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{nextChapterText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Genres */}
        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-neutral-300 transition-colors">{title}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          {manhwa.genres.slice(0, 2).map(genre => (
            <span key={genre} className="text-[10px] text-neutral-500">
              {language === 'en' ? GenreEn[genre] || genre : genre}
            </span>
          ))}
        </div>
      </Link>
      )}
    </div>
  );
};

export default React.memo(ManhwaCard);
