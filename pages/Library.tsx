
import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import ManhwaCard from '../components/ManhwaCard';
import { Heart, Clock, Trash2, BookOpen, Calendar, ChevronLeft, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useManhwas } from '../contexts/ManhwaContext';

const { Link } = ReactRouterDOM as any;

const Library: React.FC = () => {
  const { t, language } = useLanguage() as any;
  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'schedule'>('favorites');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<{ manhwaId: string; chapterId: string; timestamp: number }[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const { manhwas } = useManhwas();

  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const favoritedManhwas = useMemo(() => manhwas.filter(m => favorites.includes(m.id)), [manhwas, favorites]);
  const historyItems = useMemo(() => history.map(h => {
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
  }), [history, manhwas, historySearchQuery, language]);

  const clearHistory = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من مسح سجل القراءة بالكامل؟' : 'Are you sure you want to clear reading history?')) {
      localStorage.removeItem('reading_history');
      setHistory([]);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{language === 'ar' ? 'المكتبة' : 'Library'}</h1>
          <p className="text-neutral-500 text-sm mt-1">{language === 'ar' ? 'مفضلاتك وسجل القراءة' : 'Your favorites and reading history'}</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06] w-fit">
          {[
            { id: 'favorites' as const, icon: <Heart size={14} />, label: language === 'ar' ? 'المفضلة' : 'Favorites' },
            { id: 'history' as const, icon: <Clock size={14} />, label: t('history_tab') },
            { id: 'schedule' as const, icon: <Calendar size={14} />, label: t('schedule_tab') },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === tab.id ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'favorites' ? (
        <section>
          {favoritedManhwas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {favoritedManhwas.map(manhwa => (
                <ManhwaCard key={manhwa.id} manhwa={manhwa} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 md:py-32 rounded-xl border border-dashed border-white/[0.06]">
              <Heart size={32} className="text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500 font-bold">{language === 'ar' ? 'مجموعتك المفضلة فارغة' : 'Your favorites collection is empty'}</p>
              <Link to="/" className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg mt-5 font-bold text-sm hover:bg-neutral-200 transition-colors">
                {language === 'ar' ? 'تصفح المانهوا' : 'Browse manhwa'}
              </Link>
            </div>
          )}
        </section>
      ) : activeTab === 'history' ? (
        <section className="space-y-5">
          {/* History toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-xs text-neutral-500">{historyItems.length} {language === 'ar' ? 'عنصر' : 'items'}</span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input 
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-2 ps-9 pe-3 text-xs focus:outline-none focus:border-white/[0.12] text-white placeholder:text-neutral-600"
                />
              </div>
              {historyItems.length > 0 && (
                <button onClick={clearHistory} className="text-neutral-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title={language === 'ar' ? 'مسح' : 'Clear'}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {historyItems.length > 0 ? (
            <div className="space-y-2">
              {historyItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-colors group">
                  <Link to={`/details/${item.manhwa?.id}`} className="shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-neutral-800">
                    <img src={item.manhwa?.coverImage} className="w-full h-full object-cover" alt={item.manhwa?.title} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/details/${item.manhwa?.id}`} className="font-bold text-sm text-white line-clamp-1 hover:text-neutral-300 transition-colors">
                      {language === 'ar' ? item.manhwa?.title : item.manhwa?.titleEn || item.manhwa?.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                      <span>{language === 'ar' ? 'الفصل' : 'Ch.'} {item.chapter?.number}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                      <span>{new Date(item.timestamp).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                  <Link 
                    to={`/reader/${item.manhwa?.id}/${item.chapter?.id}`}
                    className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors"
                  >
                    <BookOpen size={14} />
                    <span className="hidden sm:inline">{language === 'ar' ? 'متابعة' : 'Continue'}</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : historySearchQuery ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.06]">
              <Search size={28} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 font-bold text-sm">{language === 'ar' ? `لا نتائج لـ "${historySearchQuery}"` : `No results for "${historySearchQuery}"`}</p>
              <button onClick={() => setHistorySearchQuery('')} className="text-white mt-3 text-xs font-bold hover:underline">{language === 'ar' ? 'إعادة تعيين' : 'Reset'}</button>
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.06]">
              <Clock size={28} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 font-bold text-sm">{language === 'ar' ? 'لا يوجد سجل قراءة' : 'No reading history'}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          {favoritedManhwas.length > 0 ? (
            <>
              {/* Day selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                  const isSelected = selectedDay === dayIndex;
                  const isToday = new Date().getDay() === dayIndex;
                  const dayManhwas = favoritedManhwas.filter(m => m.releaseSchedule && m.releaseSchedule.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex]));

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => setSelectedDay(dayIndex)}
                      className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-white text-black' 
                          : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300 border border-white/[0.04]'
                      }`}
                    >
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-black/50' : ''}`}>{isToday ? (language === 'ar' ? 'اليوم' : 'Today') : ''}</span>
                      <span className="text-xs font-bold">{language === 'ar' ? daysAr[dayIndex] : daysEn[dayIndex]}</span>
                      {dayManhwas.length > 0 && !isSelected && <span className="w-1 h-1 bg-neutral-500 rounded-full mt-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Day content */}
              {(() => {
                const dayManhwas = favoritedManhwas.filter(m => m.releaseSchedule && m.releaseSchedule.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][selectedDay]));
                return dayManhwas.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {dayManhwas.map(manhwa => <ManhwaCard key={manhwa.id} manhwa={manhwa} />)}
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.06]">
                    <p className="text-neutral-500 text-sm font-bold">
                      {language === 'ar' 
                        ? `لا توجد مانهوا مفضلة تصدر يوم ${daysAr[selectedDay]}` 
                        : `No favorite manhwa releasing on ${daysEn[selectedDay]}`}
                    </p>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-center py-20 rounded-xl border border-dashed border-white/[0.06]">
              <Calendar size={28} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 font-bold text-sm">{language === 'ar' ? 'أضف مانهوا للمفضلة لمتابعة مواعيد صدورها' : 'Add manhwa to favorites to track releases'}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Library;
