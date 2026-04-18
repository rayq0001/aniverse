import React, { useEffect, useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Play, Bookmark, Share2, List, CheckCircle2, ArrowDownWideNarrow, ArrowUpWideNarrow, Calendar, ClipboardCheck, Star, Info, Sparkles, Loader2 } from 'lucide-react';
import { getDeepManhwaAnalysis } from '../services/geminiService';
import { GenreEn } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CommentSection from '../components/CommentSection';
import { doc, onSnapshot, collection, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useManhwas } from '../contexts/ManhwaContext';

const { useParams, Link } = ReactRouterDOM as any;

const Details: React.FC = () => {
  const { id } = useParams();
  const [manhwa, setManhwa] = useState<any>(null);
  const [manhwaChapters, setManhwaChapters] = useState<any[]>([]);
  const { t, language } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAllChapters, setShowAllChapters] = useState(false);
  const { manhwas: allManhwas } = useManhwas();

  useEffect(() => {
    if (!id) return;
    const unsubManhwa = onSnapshot(doc(db, 'manhwas', id), (docSnap) => {
      if (docSnap.exists()) setManhwa({ id: docSnap.id, ...docSnap.data() });
    }, (err) => handleFirestoreError(err, OperationType.GET, `manhwas/${id}`));

    const q = query(collection(db, `manhwas/${id}/chapters`), orderBy('number', 'asc'));
    const unsubChapters = onSnapshot(q, (snap) => {
      if (!snap.empty) setManhwaChapters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, `manhwas/${id}/chapters`));

    return () => { unsubManhwa(); unsubChapters(); };
  }, [id]);

  useEffect(() => {
    if (manhwa) {
      window.scrollTo(0, 0);
      const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      setIsFavorite(favs.includes(manhwa.id));
      const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
      setReadChapters(history.filter((h: any) => h.manhwaId === manhwa.id).map((h: any) => h.chapterId));
    }
  }, [manhwa, id]);

  const sortedChapters = useMemo(() => {
    const chapters = manhwaChapters.length > 0 ? [...manhwaChapters] : (manhwa?.chapters ? [...manhwa.chapters] : []);
    return sortOrder === 'desc' ? chapters.reverse() : chapters;
  }, [manhwa, manhwaChapters, sortOrder]);

  const toggleFavorite = () => {
    if (!manhwa) return;
    const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    const newFavs = isFavorite ? favs.filter((fid: string) => fid !== manhwa.id) : [...favs, manhwa.id];
    localStorage.setItem('user_favorites', JSON.stringify(newFavs));
    setIsFavorite(!isFavorite);
    // Sync to Firestore
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), { favorites: newFavs }).catch(() => {});
    }
  };

  const handleShare = async () => {
    if (!manhwa) return;
    const shareUrl = window.location.href;
    try {
      const shareData = { title: manhwa.title, text: `Check out ${manhwa.title} on Aniverse!`, url: shareUrl };
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

  if (!manhwa) return <div className="p-12 text-center text-neutral-500">{language === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>;

  const displayTitle = language === 'en' ? manhwa.titleEn || manhwa.title : manhwa.title;
  const displayDescription = language === 'en' ? manhwa.descriptionEn || manhwa.description : manhwa.description;

  const similarManhwas = allManhwas.filter(m => m.id !== id).slice(0, 4);

  return (
    <div className="pb-20">
      {/* ===== Banner — Full Bleed ===== */}
      <div className="-mx-3 sm:-mx-4 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 mb-8">
        <div className="relative h-56 sm:h-64 md:h-80 overflow-hidden">
          <img
            src={manhwa.bannerImage || manhwa.coverImage}
            className="w-full h-full object-cover"
            alt=""
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>
      </div>

      {/* ===== Main Info ===== */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-8 -mt-32 sm:-mt-36 md:-mt-40 relative z-10 px-1">
        {/* Cover */}
        <div className="w-36 sm:w-40 md:w-52 shrink-0 mx-auto md:mx-0">
          <img
            src={manhwa.coverImage}
            className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border-2 border-black/50"
            alt={displayTitle}
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4 text-center md:text-start" style={{ textAlign: language === 'ar' ? 'right' : undefined }}>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            {displayTitle}
          </h1>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
            <span className="text-neutral-400">{manhwa.author}</span>
            <span className="text-neutral-700">·</span>
            <span className={`font-semibold ${manhwa.status === 'ongoing' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {manhwa.status === 'ongoing' ? t('status_ongoing') : t('status_completed')}
            </span>
            <span className="text-neutral-700">·</span>
            <span className="flex items-center gap-1 text-yellow-500">
              <Star size={13} className="fill-yellow-500" /> {manhwa.rating}
            </span>
            <span className="text-neutral-700">·</span>
            <span className="flex items-center gap-1 text-neutral-500"><List size={13} /> {manhwaChapters.length} {language === 'en' ? 'Chapters' : 'فصل'}</span>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
            {manhwa.genres?.map((genre: string) => (
              <span key={genre} className="text-[11px] font-medium text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md">
                {language === 'en' ? GenreEn[genre] || genre : genre}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
            {lastReadChapterId && (
              <Link
                to={`/reader/${manhwa.id}/${lastReadChapterId}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm text-black active:scale-95 transition-transform"
                style={{ background: 'var(--accent-color)' }}
              >
                <Play size={15} className="fill-current" />
                {readChapters.length > 0 ? (language === 'ar' ? 'متابعة القراءة' : 'Continue') : t('read_now')}
              </Link>
            )}
            <button
              onClick={toggleFavorite}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                isFavorite ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <Bookmark size={15} fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? t('in_favorite') : t('add_favorite')}
            </button>
            <div className="relative">
              <button
                onClick={handleShare}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
                title={t('share')}
              >
                <Share2 size={16} className="text-neutral-300" />
              </button>
              {showShareToast && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <ClipboardCheck size={12} /> {t('copied')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Content Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 mt-8 md:mt-12">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-neutral-500" />
                <h2 className="text-base font-bold text-white">{t('story_title')}</h2>
              </div>
              {!aiSummary && (
                <button
                  onClick={async () => {
                    setIsLoadingAI(true);
                    const result = await getDeepManhwaAnalysis(
                      displayTitle, displayDescription, [], language
                    );
                    setAiSummary(result);
                    setIsLoadingAI(false);
                  }}
                  disabled={isLoadingAI}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isLoadingAI ? (language === 'en' ? 'Analyzing...' : 'جاري التحليل...') : (language === 'en' ? 'AI Summary' : 'تلخيص ذكي')}
                </button>
              )}
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-line">
              {displayDescription}
            </p>
            {aiSummary && (
              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={13} className="text-yellow-500" />
                  <span className="text-xs font-bold text-neutral-300">{language === 'en' ? 'AI Summary' : 'تلخيص ذكي'}</span>
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">{aiSummary}</p>
              </div>
            )}
          </section>

          {/* Chapters */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <List size={16} className="text-neutral-500" />
                <h2 className="text-base font-bold text-white">{t('chapter_list')}</h2>
                <span className="text-xs text-neutral-600 ml-1">({manhwaChapters.length})</span>
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {sortOrder === 'desc' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
                {sortOrder === 'desc' ? (language === 'ar' ? 'الأحدث' : 'Newest') : (language === 'ar' ? 'الأقدم' : 'Oldest')}
              </button>
            </div>

            <div className="rounded-xl border border-neutral-800/50 overflow-hidden divide-y divide-neutral-800/50">
              {(showAllChapters ? sortedChapters : sortedChapters.slice(0, 15)).map(chapter => {
                const isRead = readChapters.includes(chapter.id);
                return (
                  <Link
                    key={chapter.id}
                    to={`/reader/${manhwa.id}/${chapter.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${isRead ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold tabular-nums w-8 ${isRead ? 'text-neutral-600' : 'text-neutral-300'}`}>
                        {chapter.number}
                      </span>
                      <span className={`text-sm ${isRead ? 'text-neutral-500' : 'text-neutral-200'}`}>
                        {language === 'en' ? `Chapter ${chapter.number}` : `الفصل ${chapter.number}`}
                      </span>
                      {isRead && <CheckCircle2 size={13} className="text-neutral-600" />}
                    </div>
                    <span className="text-[11px] text-neutral-600 flex items-center gap-1 shrink-0">
                      <Calendar size={10} />
                      {(chapter.releaseDate || chapter.createdAt) ? new Date(chapter.releaseDate || chapter.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </Link>
                );
              })}
            </div>

            {sortedChapters.length > 15 && (
              <button
                onClick={() => setShowAllChapters(!showAllChapters)}
                className="w-full mt-3 py-3 text-sm font-semibold text-neutral-500 hover:text-white transition-colors"
              >
                {showAllChapters
                  ? (language === 'ar' ? 'عرض أقل' : 'Show Less')
                  : (language === 'ar' ? `عرض الكل (${sortedChapters.length})` : `Show All (${sortedChapters.length})`)}
              </button>
            )}
          </section>

          {/* Comments */}
          <CommentSection manhwaId={manhwa.id} />
        </div>

        {/* Sidebar */}
        <aside>
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* Info Card */}
            <div className="rounded-xl border border-neutral-800/50 p-5 space-y-3.5">
              <h3 className="text-sm font-bold text-neutral-400 mb-4">{t('data_card')}</h3>
              {[
                [t('author'), manhwa.author],
                [t('artist'), manhwa.artist],
                [t('status'), manhwa.status === 'ongoing' ? t('status_ongoing') : t('status_completed')],
                [t('release_date'), manhwa.releaseDate],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">{label}</span>
                  <span className="text-neutral-300 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Similar */}
            {similarManhwas.length > 0 && (
              <div className="rounded-xl border border-neutral-800/50 p-5">
                <h3 className="text-sm font-bold text-neutral-400 mb-4">{t('similar_works')}</h3>
                <div className="space-y-3">
                  {similarManhwas.map(m => (
                    <Link key={m.id} to={`/details/${m.id}`} className="flex items-center gap-3 group">
                      <img
                        src={m.coverImage}
                        className="w-10 h-13 object-cover rounded-md shrink-0"
                        alt=""
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-medium text-neutral-300 truncate group-hover:text-white transition-colors">
                          {language === 'en' ? m.titleEn || m.title : m.title}
                        </h4>
                        <p className="text-[10px] text-neutral-600 mt-0.5">{m.genres?.slice(0, 2).join(' · ')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Details;