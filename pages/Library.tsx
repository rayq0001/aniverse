
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import ManhwaCard from '../components/ManhwaCard';
import { Heart, Clock, Trash2, Bookmark, BookOpen, Calendar, ChevronLeft, ArrowLeftCircle, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const { Link } = ReactRouterDOM as any;

const Library: React.FC = () => {
  const { t, language } = useLanguage() as any;
  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'schedule'>('favorites');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<{ manhwaId: string; chapterId: string; timestamp: number }[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [manhwas, setManhwas] = useState<any[]>([]);

  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'manhwas'), (snap) => {
      setManhwas(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), chapters: [] })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'manhwas');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const savedFavs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    const savedHistory = JSON.parse(localStorage.getItem('reading_history') || '[]');
    setFavorites(savedFavs);
    setHistory(savedHistory.sort((a: any, b: any) => b.timestamp - a.timestamp));

    const handleUpdate = () => {
      setFavorites(JSON.parse(localStorage.getItem('user_favorites') || '[]'));
    };
    window.addEventListener('favoritesUpdated', handleUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleUpdate);
  }, []);

  const favoritedManhwas = manhwas.filter(m => favorites.includes(m.id));
  const historyItems = history.map(h => {
    const manhwa = manhwas.find(m => m.id === h.manhwaId);
    const chapter = manhwa?.chapters?.find((c: any) => c.id === h.chapterId);
    return { manhwa, chapter, timestamp: h.timestamp };
  }).filter(item => {
    if (!item.manhwa) return false;
    if (!historySearchQuery) return true;
    
    const query = historySearchQuery.toLowerCase();
    const title = language === 'ar' ? item.manhwa.title.toLowerCase() : (item.manhwa.titleEn || item.manhwa.title).toLowerCase();
    const author = item.manhwa.author ? item.manhwa.author.toLowerCase() : '';
    
    return title.includes(query) || author.includes(query);
  });

  const clearHistory = () => {
    if (window.confirm('هل أنت متأكد من مسح سجل القراءة بالكامل؟')) {
      localStorage.removeItem('reading_history');
      setHistory([]);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-5 sm:gap-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter flex items-center gap-3 sm:gap-4">
            <Bookmark className="text-neutral-400 shrink-0" size={28} />
            {language === 'ar' ? 'المكتبة الخاصة' : 'Private Library'}
          </h1>
          <p className="text-neutral-500 font-bold text-xs sm:text-sm md:text-base px-1">
            {language === 'ar' ? 'تتبع مفضلاتك وتاريخ قراءتك في مكان واحد' : 'Track your favorites and reading history in one place'}
          </p>
        </div>
        <div className="flex bg-neutral-900/30 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-xl w-full md:w-auto shadow-2xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'favorites' ? 'bg-neutral-100 text-black shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Heart size={18} fill={activeTab === 'favorites' ? "currentColor" : "none"} />
            {language === 'ar' ? 'المفضلة' : 'Favorites'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-neutral-100 text-black shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Clock size={18} />
            {t('history_tab')}
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-neutral-100 text-black shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Calendar size={18} />
            {t('schedule_tab')}
          </button>
        </div>
      </div>

      {activeTab === 'favorites' ? (
        <section>
          {favoritedManhwas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
              {favoritedManhwas.map(manhwa => (
                <ManhwaCard key={manhwa.id} manhwa={manhwa} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-24 md:py-40 bg-neutral-950/50 rounded-2xl sm:rounded-[3rem] border border-dashed border-white/5">
              <div className="p-6 md:p-8 bg-neutral-900/50 inline-block rounded-[2rem] mb-6 shadow-2xl">
                 <Heart size={48} className="text-neutral-800" />
              </div>
              <p className="text-xl md:text-2xl text-neutral-500 font-black tracking-tight">{language === 'ar' ? 'مجموعتك المفضلة فارغة حالياً' : 'Your favorites collection is empty'}</p>
              <Link to="/" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl mt-8 font-black hover:bg-neutral-200 transition-all active:scale-95 shadow-xl">
                 {language === 'ar' ? 'تصفح أحدث المانهوا' : 'Browse latest manhwa'} 
                 <ArrowLeftCircle size={20} className={language === 'ar' ? '' : 'rotate-180'} />
              </Link>
            </div>
          )}
        </section>
      ) : activeTab === 'history' ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs md:text-sm font-black text-neutral-500 uppercase tracking-widest">
                {language === 'ar' ? `لديك ${historyItems.length} مانهوا في السجل` : `You have ${historyItems.length} manhwa in history`}
              </span>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <input 
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث في السجل...' : 'Search history...'}
                  className="w-full bg-neutral-900/50 border border-white/5 rounded-2xl py-3 px-5 pr-12 text-sm font-bold focus:outline-none focus:border-white/30 transition-all text-white placeholder:text-neutral-700"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-700">
                  <Search size={18} />
                </div>
              </div>

              {historyItems.length > 0 && !historySearchQuery && (
                <button onClick={clearHistory} className="text-neutral-500 hover:text-red-500 flex items-center gap-2 text-xs md:text-sm font-black transition-colors bg-neutral-900/50 px-5 py-3 rounded-2xl border border-white/5 shrink-0 uppercase tracking-widest">
                  <Trash2 size={16} />
                  {language === 'ar' ? 'مسح السجل' : 'Clear History'}
                </button>
              )}
            </div>
          </div>
          {historyItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {historyItems.map((item, idx) => (
                <div key={idx} className="bg-neutral-950/50 p-5 rounded-[2rem] border border-white/5 flex flex-col sm:flex-row gap-6 md:gap-8 group hover:border-neutral-700 transition-all hover:shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                  <Link to={`/details/${item.manhwa?.id}`} className="shrink-0 relative overflow-hidden rounded-2xl w-full sm:w-32 h-56 sm:h-auto aspect-[2/3] shadow-2xl">
                    <img src={item.manhwa?.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.manhwa?.title} />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between relative z-10">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <Link to={`/details/${item.manhwa?.id}`} className="font-black text-xl md:text-2xl group-hover:text-neutral-300 transition-colors text-white line-clamp-1 tracking-tighter">{language === 'ar' ? item.manhwa?.title : item.manhwa?.titleEn || item.manhwa?.title}</Link>
                        <span className="text-neutral-500 text-xs font-black uppercase tracking-widest">{language === 'ar' ? 'بواسطة:' : 'By:'} {item.manhwa?.author}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div className="bg-neutral-900/30 p-4 rounded-2xl border border-white/5">
                          <span className="block text-[10px] text-neutral-600 uppercase font-black mb-1 tracking-widest">{language === 'ar' ? 'آخر فصل' : 'Last read'}</span>
                          <span className="text-neutral-200 font-black text-lg md:text-xl">{language === 'ar' ? 'الفصل' : 'Chapter'} {item.chapter?.number}</span>
                        </div>
                        <div className="bg-neutral-900/30 p-4 rounded-2xl border border-white/5">
                          <span className="block text-[10px] text-neutral-600 uppercase font-black mb-1 tracking-widest">{language === 'ar' ? 'تاريخ الإصدار' : 'Release'}</span>
                          <div className="flex items-center gap-2 text-neutral-400 font-black text-sm">
                            <Calendar size={14} className="text-neutral-700" />
                            <span>{item.chapter?.releaseDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-8">
                      <div className="text-[11px] text-neutral-600 font-black uppercase tracking-widest">
                         {language === 'ar' ? 'آخر نشاط:' : 'Last activity:'} {new Date(item.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <Link 
                        to={`/reader/${item.manhwa?.id}/${item.chapter?.id}`}
                        className="bg-white text-black hover:bg-neutral-200 px-8 py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 group/btn"
                      >
                        <BookOpen size={18} />
                        {language === 'ar' ? `متابعة القراءة` : `Continue Reading`}
                        <ChevronLeft size={18} className={`group-hover/btn:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-0' : 'rotate-180'}`} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : historySearchQuery ? (
            <div className="text-center py-20 md:py-32 bg-neutral-950 rounded-3xl md:rounded-[2rem] border border-dashed border-neutral-800">
              <div className="p-4 md:p-6 bg-neutral-900 inline-block rounded-full mb-4">
                 <Search size={36} className="text-neutral-700" />
              </div>
              <p className="text-lg md:text-xl text-neutral-500 font-bold">{language === 'ar' ? `لا توجد نتائج للبحث عن "${historySearchQuery}"` : `No results found for "${historySearchQuery}"`}</p>
              <button onClick={() => setHistorySearchQuery('')} className="text-white mt-4 font-bold hover:underline">
                {language === 'ar' ? 'إعادة تعيين البحث' : 'Reset search'}
              </button>
            </div>
          ) : (
            <div className="text-center py-20 md:py-32 bg-neutral-950 rounded-3xl md:rounded-[2rem] border border-dashed border-neutral-800">
              <div className="p-4 md:p-6 bg-neutral-900 inline-block rounded-full mb-4">
                 <Clock size={36} className="text-neutral-700" />
              </div>
              <p className="text-lg md:text-xl text-neutral-500 font-bold">{language === 'ar' ? 'لا توجد مانهوا في سجل القراءة الخاص بك' : 'No manhwa in your reading history'}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-10">
          {favoritedManhwas.length > 0 ? (
            <div className="space-y-10">
              {/* Horizontal Day Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                  const isSelected = selectedDay === dayIndex;
                  const isToday = new Date().getDay() === dayIndex;
                  const dayManhwas = favoritedManhwas.filter(m => m.releaseSchedule && m.releaseSchedule.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex]));
                  const hasUpdates = dayManhwas.length > 0;

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => setSelectedDay(dayIndex)}
                      className={`relative shrink-0 flex flex-col items-center justify-center min-w-[100px] py-4 rounded-2xl border transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white text-black border-white shadow-2xl scale-105 z-10' 
                          : 'bg-neutral-900/50 text-neutral-500 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-black/50' : 'text-neutral-600'}`}>
                        {isToday ? (language === 'ar' ? 'اليوم' : 'Today') : (language === 'ar' ? 'يوم' : 'Day')}
                      </span>
                      <span className="text-sm font-black tracking-tight">
                        {language === 'ar' ? daysAr[dayIndex] : daysEn[dayIndex]}
                      </span>
                      
                      {hasUpdates && !isSelected && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-neutral-400 rounded-full"></span>
                      )}
                      {isSelected && (
                        <motion.div 
                          layoutId="activeDay"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Content */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {favoritedManhwas.filter(m => m.releaseSchedule && m.releaseSchedule.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][selectedDay])).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
                    {favoritedManhwas
                      .filter(m => m.releaseSchedule && m.releaseSchedule.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][selectedDay]))
                      .map(manhwa => (
                        <ManhwaCard key={manhwa.id} manhwa={manhwa} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-neutral-950/30 rounded-[2.5rem] border border-dashed border-white/5">
                    <p className="text-neutral-500 font-black tracking-tight">
                      {language === 'ar' 
                        ? `لا توجد مانهوا مفضلة تصدر يوم ${daysAr[selectedDay]}` 
                        : `No favorite manhwa releasing on ${daysEn[selectedDay]}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 sm:py-24 md:py-40 bg-neutral-950/50 rounded-2xl sm:rounded-[3rem] border border-dashed border-white/5">
              <div className="p-6 md:p-8 bg-neutral-900/50 inline-block rounded-[2rem] mb-6 shadow-2xl">
                 <Calendar size={48} className="text-neutral-800" />
              </div>
              <p className="text-xl md:text-2xl text-neutral-500 font-black tracking-tight">{language === 'ar' ? 'أضف مانهوا للمفضلة لمتابعة مواعيد صدورها' : 'Add manhwa to favorites to track release schedule'}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Library;
