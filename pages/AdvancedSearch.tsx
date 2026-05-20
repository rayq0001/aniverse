import React, { useState, useMemo, useRef } from 'react';
import ManhwaCard from '../components/ManhwaCard';
import { Genre, GenreEn } from '../types';
import { Search, User, Paintbrush, ChevronDown, Tags, Image as ImageIcon, Loader2, X, Upload, ExternalLink, Percent } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useManhwas } from '../contexts/ManhwaContext';
import { toast } from 'sonner';

const AdvancedSearch: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isGenreExpanded, setIsGenreExpanded] = useState(true);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<any>(null);
  const [imageError, setImageError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
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
    const allGenres: string[] = [...staticGenres];
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

  const openImageModal = () => {
    setIsImageModalOpen(true);
    setImagePreview(null);
    setImageResults(null);
    setImageError('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    // Search
    performImageSearch(file);
  };

  const performImageSearch = async (file: File) => {
    setIsSearchingImage(true);
    setImageResults(null);
    setImageError('');

    const formData = new FormData();
    formData.append('mangaImage', file);

    try {
      const res = await fetch('/api/search-manga', {
        method: 'POST',
        body: formData
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response from server:', text);
        throw new Error(`Server returned status ${res.status} with non-JSON response`);
      }

      if (res.ok && data.success) {
        setImageResults(data);
      } else {
        setImageError(data.message || data.error || (language === 'en' ? 'No match found' : 'لم يتم العثور على نتيجة'));
      }
    } catch (err: any) {
      console.error('Image search frontend error:', err);
      setImageError(language === 'en' ? `Connection error: ${err.message || 'Unknown'}` : `خطأ في الاتصال: ${err.message || 'غير معروف'}`);
    } finally {
      setIsSearchingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const useImageResult = (title: string, chapterStr?: string) => {
    if (!title) return;
    
    const cleanTitle = title.replace(/https?:\/\/[^\s]+/g, '').trim();
    const cleanTitleLower = cleanTitle.toLowerCase();
    
    // First try exact match
    let matchedManhwa = manhwas.find(m => 
      m.title?.toLowerCase() === cleanTitleLower || 
      m.titleEn?.toLowerCase() === cleanTitleLower ||
      m.originalTitle?.toLowerCase() === cleanTitleLower
    );

    // Then try partial match
    if (!matchedManhwa) {
      const words = cleanTitleLower.split(/[\s/]+/).filter(w => w.length > 2);
      if (words.length > 0) {
        matchedManhwa = manhwas.find(m => {
          const t1 = m.title?.toLowerCase() || '';
          const t2 = m.titleEn?.toLowerCase() || '';
          const t3 = m.originalTitle?.toLowerCase() || '';
          return words.some(w => t1.includes(w) || t2.includes(w) || t3.includes(w));
        });
      }
    }

    if (matchedManhwa) {
      setIsImageModalOpen(false);
      if (chapterStr && matchedManhwa.chapters) {
        const chapterNum = parseFloat(chapterStr);
        const chapter = matchedManhwa.chapters.find(c => c.number === chapterNum || c.title.includes(chapterStr));
        if (chapter) {
          navigate(`/read/${matchedManhwa.id}/${chapter.id}`);
          return;
        }
      }
      navigate(`/manga/${matchedManhwa.id}`);
      return;
    }

    // Fallback to text search if no exact match found
    if (cleanTitle) {
      const titleWords = cleanTitle.split(/[\s/]+/).filter((w: string) => w.length > 1);
      setSearchQuery(titleWords.slice(0, 3).join(' '));
    }
    setIsImageModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto pt-4 md:pt-8 pb-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t('advanced_search_title')}</h1>
          <p className="text-neutral-500 max-w-md text-xs md:text-sm">{t('advanced_search_subtitle')}</p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl relative flex gap-3">
            <div className="flex-1 flex items-center bg-white/[0.03] rounded-xl border border-white/[0.06] focus-within:border-white/[0.12] transition-colors overflow-hidden shadow-lg">
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
            
            {/* Glowing Image Search Button */}
            <button 
              onClick={openImageModal}
              className="group relative shrink-0 flex items-center justify-center w-[46px] h-[46px] bg-neutral-900 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-color)] to-purple-500 opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="absolute inset-0 rounded-xl shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)] group-hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.6)] transition-shadow"></div>
              <ImageIcon size={18} className="text-white relative z-10" />
            </button>
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

      {/* Image Search Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsImageModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-[10vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] max-h-[80vh] overflow-y-auto bg-neutral-950 border border-white/10 rounded-2xl z-[201] shadow-[0_40px_80px_rgba(0,0,0,0.8)] no-scrollbar"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-neutral-950/90 backdrop-blur-xl flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-color)' }}>
                    <ImageIcon size={16} className="text-black" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{language === 'en' ? 'Image Search' : 'البحث بالصورة'}</h3>
                    <p className="text-[10px] text-neutral-500">{language === 'en' ? 'Find manga by screenshot' : 'ابحث عن المانجا بلقطة شاشة'}</p>
                  </div>
                </div>
                <button onClick={() => setIsImageModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Upload Area */}
                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl cursor-pointer transition-colors group">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                      <Upload size={24} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-neutral-400">{language === 'en' ? 'Click to upload image' : 'اضغط لرفع الصورة'}</p>
                      <p className="text-[10px] text-neutral-600 mt-1">{language === 'en' ? 'PNG, JPG, WEBP' : 'PNG, JPG, WEBP'}</p>
                    </div>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </label>
                ) : (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.06]">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain bg-black/50" />
                      <button 
                        onClick={() => { setImagePreview(null); setImageResults(null); setImageError(''); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-lg text-neutral-400 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Loading */}
                    {isSearchingImage && (
                      <div className="flex items-center justify-center gap-3 py-6">
                        <Loader2 size={20} className="animate-spin text-white" />
                        <span className="text-xs font-bold text-neutral-400">{language === 'en' ? 'Searching...' : 'جاري البحث...'}</span>
                      </div>
                    )}

                    {/* Error */}
                    {imageError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                        <p className="text-xs font-bold text-red-400">{imageError}</p>
                      </div>
                    )}

                    {/* Results */}
                    {imageResults && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">
                          {language === 'en' ? 'Results' : 'النتائج'}
                        </p>

                        {/* Best Result */}
                        <div 
                          onClick={() => useImageResult(imageResults.mangaTitle, imageResults.chapter)}
                          className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 cursor-pointer transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            {imageResults.thumbnail && (
                              <img src={imageResults.thumbnail} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0 border border-white/[0.06]" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate group-hover:text-[var(--accent-color)] transition-colors">
                                {imageResults.mangaTitle}
                              </p>
                              {imageResults.chapter && (
                                <p className="text-[11px] text-neutral-500 mt-0.5">{imageResults.chapter}</p>
                              )}
                              {imageResults.author && (
                                <p className="text-[10px] text-neutral-600 mt-0.5">{imageResults.author}</p>
                              )}
                              {/* Similarity Bar */}
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min(imageResults.similarity, 100)}%`,
                                      background: imageResults.similarity >= 80 ? '#10b981' : imageResults.similarity >= 50 ? '#f59e0b' : '#ef4444'
                                    }}
                                  />
                                </div>
                                <span className={`text-[11px] font-bold tabular-nums ${
                                  imageResults.similarity >= 80 ? 'text-emerald-400' : imageResults.similarity >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {Math.round(imageResults.similarity)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Results */}
                        {imageResults.allResults?.slice(1).map((r: any, i: number) => (
                          <div 
                            key={i}
                            onClick={() => useImageResult(r.title, r.chapter)}
                            className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/10 cursor-pointer transition-all flex items-center gap-3"
                          >
                            {r.thumbnail && (
                              <img src={r.thumbnail} alt="" className="w-8 h-10 object-cover rounded-md shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-neutral-300 truncate">{r.title}</p>
                              {r.chapter && <p className="text-[10px] text-neutral-600">{r.chapter}</p>}
                            </div>
                            <span className={`text-[10px] font-bold tabular-nums shrink-0 ${
                              r.similarity >= 80 ? 'text-emerald-400' : r.similarity >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {Math.round(r.similarity)}%
                            </span>
                          </div>
                        ))}

                        {/* External Links */}
                        {imageResults.extUrls?.length > 0 && (
                          <div className="pt-2 border-t border-white/[0.04]">
                            <p className="text-[10px] font-bold text-neutral-600 mb-1.5 px-1">{language === 'en' ? 'Source Links' : 'روابط المصدر'}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {imageResults.extUrls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-neutral-400 bg-white/[0.03] rounded-md hover:bg-white/[0.08] hover:text-white transition-colors">
                                  <ExternalLink size={9} />
                                  {new URL(url).hostname.replace('www.', '')}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {imageResults.lowConfidence && (
                          <p className="text-[10px] text-amber-500/80 text-center pt-1">🤔 {language === 'en' ? 'Low confidence — try a clearer image' : 'نسبة تطابق ضعيفة — جرب صورة أوضح'}</p>
                        )}
                      </div>
                    )}

                    {/* Re-upload */}
                    {!isSearchingImage && (
                      <label className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] cursor-pointer transition-colors">
                        <Upload size={13} className="text-neutral-500" />
                        <span className="text-[11px] font-bold text-neutral-400">{language === 'en' ? 'Try another image' : 'جرب صورة أخرى'}</span>
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSearch;
