import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import ManhwaCard from '../components/ManhwaCard';
import { Genre, GenreEn } from '../types';
import { Search, User, RotateCcw, Paintbrush, ChevronDown, ChevronUp, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const AdvancedSearch: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isGenreExpanded, setIsGenreExpanded] = useState(true);
  const [manhwas, setManhwas] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'manhwas'), (snap) => {
      const fetchedManhwas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManhwas(fetchedManhwas);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'manhwas');
    });
    return () => unsub();
  }, []);

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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
            {t('advanced_search_title')}
          </h1>
          <p className="text-neutral-500 max-w-xl font-bold text-sm md:text-base">
            {t('advanced_search_subtitle')}
          </p>
        </div>

        {/* Simplified Search Bar */}
        <div className="w-full max-w-3xl bg-neutral-900/50 p-2 rounded-[2rem] border border-white/5 shadow-2xl flex items-center group transition-all focus-within:ring-4 focus-within:ring-white/5 backdrop-blur-xl">
          <div className="p-4 text-neutral-500 group-focus-within:text-white transition-colors">
            <Search size={24} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_keyword_placeholder')}
            className="flex-1 bg-transparent border-none focus:outline-none py-4 text-xl font-black text-white placeholder:text-neutral-700"
          />
          <button 
            onClick={clearAll}
            className="p-4 text-neutral-500 hover:text-white transition-colors"
            title={t('reset')}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Simplified Filters Row */}
      <div className="bg-neutral-950/50 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <User size={12} /> {t('author_label')}
            </label>
            <input 
              type="text" 
              value={authorQuery}
              onChange={(e) => setAuthorQuery(e.target.value)}
              placeholder={t('search_author_placeholder')} 
              className="w-full bg-black border border-white/5 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-white/20 transition-all text-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Paintbrush size={12} /> {t('artist_label')}
            </label>
            <input 
              type="text" 
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder={t('search_artist_placeholder')} 
              className="w-full bg-black border border-white/5 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-white/20 transition-all text-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Tags size={12} /> {t('genres_label')}
            </label>
            <button 
              onClick={() => setIsGenreExpanded(!isGenreExpanded)}
              className="w-full bg-black border border-white/5 rounded-2xl px-5 py-3 text-sm flex items-center justify-between text-neutral-400 font-bold hover:border-white/20 transition-all"
            >
              <span>{selectedGenres.length > 0 ? `${selectedGenres.length} ${t('genres_label')}` : t('select_all')}</span>
              {isGenreExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isGenreExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <button onClick={selectAllGenres} className="text-[10px] font-black text-white hover:text-neutral-400 transition-colors uppercase tracking-widest">{t('select_all')}</button>
                  <button onClick={clearGenres} className="text-[10px] font-black text-neutral-500 hover:text-red-500 transition-colors uppercase tracking-widest">{t('clear_selection')}</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {genresList.map(genre => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button 
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all border ${isSelected ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent hover:bg-white/10 text-neutral-500'}`}
                      >
                        <span className="text-[11px] font-black truncate">
                          {language === 'en' ? dynamicGenreEn[genre] || genre : genre}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <h3 className="font-black text-2xl text-white tracking-tight">
             {t('search_results')} <span className="text-neutral-500 ml-2 text-lg">({filteredManhwas.length})</span>
          </h3>
        </div>

        {filteredManhwas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filteredManhwas.map(manhwa => (
              <ManhwaCard key={manhwa.id} manhwa={manhwa} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 rounded-[3rem] border-4 border-dashed border-white/5 opacity-40">
            <Search size={80} className="mb-6 text-neutral-800" />
            <p className="text-2xl font-black text-neutral-600">{t('no_results')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
