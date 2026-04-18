import React, { useState, useMemo } from 'react';
import ManhwaCard from '../components/ManhwaCard';
import { Genre, GenreEn } from '../types';
import { Search, User, Paintbrush, ChevronDown, Tags } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useManhwas } from '../contexts/ManhwaContext';

const AdvancedSearch: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isGenreExpanded, setIsGenreExpanded] = useState(true);
  const { manhwas } = useManhwas();

  // Dynamic genres: combine static Genre enum with genres from all manhwas
  const genresList = useMemo(() => {
    const staticGenres = Object.values(Genre);
    const dynamicGenres = new Set<string>();
    manhwas.forEach(m => {
      if (m.genres && Array.isArray(m.genres)) {
        m.genres.forEach((g: string) => dynamicGenres.add(g));
      }
    });
    // Merge: static first, then any new ones from manhwas
    const allGenres = [...staticGenres];
    dynamicGenres.forEach(g => {
      if (!allGenres.includes(g)) {
        allGenres.push(g);
      }
    });
    return allGenres;
  }, [manhwas]);

  // Build dynamic GenreEn map: static + reverse lookup from manhwas genresEn
  const dynamicGenreEn = useMemo(() => {
    const map: Record<string, string> = { ...GenreEn };
    manhwas.forEach(m => {
      if (m.genres && m.genresEn && Array.isArray(m.genres) && Array.isArray(m.genresEn)) {
        m.genres.forEach((g: string, i: number) => {
          if (!map[g] && m.genresEn[i]) {
            map[g] = m.genresEn[i];
          }
        });
      }
    });
    return map;
  }, [manhwas]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const selectAllGenres = () => setSelectedGenres(genresList);
  const clearGenres = () => setSelectedGenres([]);

  const filteredManhwas = useMemo(() => {
    return manhwas.filter(manhwa => {
      const q = searchQuery.toLowerCase();
      const aq = authorQuery.toLowerCase();
      const artq = artistQuery.toLowerCase();
      const dq = descQuery.toLowerCase();

      const titleMatches = manhwa.title?.toLowerCase().includes(q) || 
                           (manhwa.titleEn && manhwa.titleEn.toLowerCase().includes(q));

      const matchesText = !searchQuery || titleMatches;
      const matchesAuthor = !authorQuery || manhwa.author?.toLowerCase().includes(aq);
      const matchesArtist = !artistQuery || manhwa.artist?.toLowerCase().includes(artq);
      const matchesDesc = !descQuery || manhwa.description?.toLowerCase().includes(dq) || (manhwa.descriptionEn && manhwa.descriptionEn.toLowerCase().includes(dq));
      const matchesGenres = selectedGenres.length === 0 || selectedGenres.every(g => manhwa.genres?.includes(g));
      const matchesStatus = !selectedStatus || manhwa.status === selectedStatus;

      return matchesText && matchesAuthor && matchesArtist && matchesDesc && matchesGenres && matchesStatus;
    });
  }, [searchQuery, authorQuery, artistQuery, descQuery, selectedGenres, selectedStatus, manhwas]);

  const clearAll = () => {
    setSearchQuery('');
    setAuthorQuery('');
    setArtistQuery('');
    setDescQuery('');
    setSelectedGenres([]);
    setSelectedStatus(null);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto pt-4 md:pt-8 pb-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t('advanced_search_title')}</h1>
          <p className="text-neutral-500 max-w-md text-xs md:text-sm">{t('advanced_search_subtitle')}</p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl relative">
            <div className="flex items-center bg-white/[0.03] rounded-xl border border-white/[0.06] focus-within:border-white/[0.12] transition-colors overflow-hidden">
              <Search size={16} className="ms-3.5 text-neutral-600 shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_keyword_placeholder')}
                className="flex-1 bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-white placeholder:text-neutral-600"
              />
              {(searchQuery || authorQuery || artistQuery || descQuery || selectedGenres.length > 0 || selectedStatus) && (
                <button onClick={clearAll} className="px-3 py-1.5 me-2 text-[10px] font-bold text-neutral-500 hover:text-red-400 bg-white/[0.03] hover:bg-red-500/10 rounded-md transition-colors">{t('reset')}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-5">
        {/* Filters */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                  <User size={10} /> {t('author_label')}
                </label>
                <input 
                  type="text" 
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder={t('search_author_placeholder')} 
                  className="w-full bg-black/30 border border-white/[0.04] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/[0.1] text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                  <Paintbrush size={10} /> {t('artist_label')}
                </label>
                <input 
                  type="text" 
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  placeholder={t('search_artist_placeholder')} 
                  className="w-full bg-black/30 border border-white/[0.04] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/[0.1] text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                  <Tags size={10} /> {t('genres_label')}
                </label>
                <button 
                  onClick={() => setIsGenreExpanded(!isGenreExpanded)}
                  className="w-full bg-black/30 border border-white/[0.04] rounded-lg px-3 py-2 text-xs flex items-center justify-between text-neutral-500 hover:border-white/[0.1] transition-colors"
                >
                  <span>{selectedGenres.length > 0 ? `${selectedGenres.length} ${t('genres_label')}` : t('select_all')}</span>
                  <ChevronDown size={12} className={`transition-transform ${isGenreExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.03] overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-neutral-500 shrink-0 me-1">{language === 'ar' ? 'الحالة' : 'Status'}:</span>
              {[
                { value: null, label: language === 'ar' ? 'الكل' : 'All' },
                { value: 'ongoing', label: language === 'ar' ? 'مستمرة' : 'Ongoing' },
                { value: 'completed', label: language === 'ar' ? 'مكتملة' : 'Completed' },
                { value: 'hiatus', label: language === 'ar' ? 'متوقفة' : 'Hiatus' },
              ].map(s => (
                <button
                  key={String(s.value)}
                  onClick={() => setSelectedStatus(s.value)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap ${
                    selectedStatus === s.value ? 'bg-white text-black' : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06]'
                  }`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          {/* Genre expansion */}
          <AnimatePresence>
            {isGenreExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-white/[0.03]">
                  <div className="flex items-center gap-3 py-2.5">
                    <button onClick={selectAllGenres} className="text-[10px] font-bold text-white/60 hover:text-white transition-colors">{t('select_all')}</button>
                    <div className="w-px h-3 bg-white/[0.06]" />
                    <button onClick={clearGenres} className="text-[10px] font-bold text-neutral-600 hover:text-red-400 transition-colors">{t('clear_selection')}</button>
                    {selectedGenres.length > 0 && <span className="text-[10px] text-neutral-600 ms-auto">{selectedGenres.length}/{genresList.length}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {genresList.map(genre => (
                      <button 
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          selectedGenres.includes(genre) ? 'bg-white text-black' : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06]'
                        }`}
                      >{language === 'en' ? dynamicGenreEn[genre] || genre : genre}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-sm text-white">{t('search_results')}</h3>
            <span className="text-[10px] text-neutral-500 bg-white/[0.03] px-2 py-0.5 rounded-md">{filteredManhwas.length}</span>
          </div>

          {filteredManhwas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredManhwas.map(manhwa => (
                <ManhwaCard key={manhwa.id} manhwa={manhwa} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-white/[0.06]">
              <Search size={28} className="mb-3 text-neutral-700" />
              <p className="text-sm font-bold text-neutral-600">{t('no_results')}</p>
              <p className="text-[11px] text-neutral-700 mt-1">{language === 'ar' ? 'حاول تغيير الفلاتر' : 'Try adjusting your filters'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
