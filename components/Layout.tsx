
import React, { useState, useRef, useEffect } from 'react';
import { Search, Home, BookOpen, Moon, Sun, X, SlidersHorizontal, User, RefreshCw, Globe, Shield } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './AuthModal';
import AiConcierge from './AiConcierge';
import { useLanguage } from '../contexts/LanguageContext';

import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { language, setLanguage, t, dir } = useLanguage();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string; role?: string } | null>(null);

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    
    let unsubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (firebaseUser) {
        // Get extra data from Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial fetch
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            name: data.name,
            email: data.email,
            avatarUrl: data.avatarUrl,
            role: data.role
          });
        } else {
          // Fallback to auth info if doc doesn't exist yet
          setUser({
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || undefined
          });
        }

        // Real-time listener for profile updates
        unsubDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUser({
              name: data.name,
              email: data.email,
              avatarUrl: data.avatarUrl,
              role: data.role
            });
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      if (unsubDoc) unsubDoc();
      unsubscribe();
    };
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
  });

  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/?q=${encodeURIComponent(searchVal)}`);
      setIsSearchOpen(false);
      setSearchVal('');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-700 ease-in-out ${isDark ? 'bg-[var(--bg-amoled)] text-white' : 'bg-white text-slate-900'} font-['Cairo']`} dir={dir}>
      
      {showRefreshBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-10 fade-in duration-500 px-4 w-full max-w-sm">
          <div className={`px-5 py-3 rounded-2xl flex items-center justify-between gap-4 shadow-2xl border transition-all duration-700 ${isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-neutral-100 border-black/10 text-black'}`}>
             <div className="flex items-center gap-3">
               <div className="relative">
                 <RefreshCw size={18} className="animate-spin-slow" />
                 <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                 </span>
               </div>
               <div className="flex flex-col">
                 <span className="font-black text-xs">{t('updates_available')}</span>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <button 
                 onClick={() => window.location.reload()}
                 className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 whitespace-nowrap"
               >
                 {t('refresh')}
               </button>
               <button onClick={() => setShowRefreshBanner(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                 <X size={16} />
               </button>
             </div>
          </div>
          <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 3s linear infinite; }`}</style>
        </div>
      )}

      <nav className={`sticky top-0 z-50 transition-all duration-700 ease-in-out border-b px-3 sm:px-4 md:px-8 py-2.5 md:py-3 ${isDark ? 'bg-[var(--bg-amoled)]/80 backdrop-blur-xl border-white/5' : 'bg-white/80 backdrop-blur-xl border-gray-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between md:grid md:grid-cols-3">
          
          {/* Left: Home, Library (Desktop Only) */}
          <div className="hidden md:flex items-center gap-8 justify-start">
            <Link to="/" className={`flex items-center gap-2 transition-colors duration-300 ${location.pathname === '/' ? (isDark ? 'text-white font-black' : 'text-black font-black') : (isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-black')}`}>
              <Home size={20} />
              <span className="text-xs font-black uppercase tracking-widest">{t('home')}</span>
            </Link>
            <Link to="/library" className={`flex items-center gap-2 transition-colors duration-300 ${location.pathname === '/library' ? (isDark ? 'text-white font-black' : 'text-black font-black') : (isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-black')}`}>
              <BookOpen size={20} />
              <span className="text-xs font-black uppercase tracking-widest">{t('library')}</span>
            </Link>
          </div>

          {/* Center: Logo (Always Centered) */}
          <div className="flex justify-center flex-1 md:flex-none">
            <Link to="/" className="flex items-center">
              <img 
                src={isDark ? "/logo-white.png" : "/logo-black.png"} 
                alt="Logo" 
                className="h-8 sm:h-10 md:h-12 w-auto object-contain transition-all duration-700"
              />
            </Link>
          </div>

          {/* Right: Search, Theme, Language, Profile */}
          <div className="hidden md:flex items-center gap-2 md:gap-3 justify-end">
            <div className="flex items-center gap-1">
              <div className="relative flex items-center">
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-full transition-all duration-300 ${isSearchOpen ? (isDark ? 'text-white bg-white/10' : 'text-black bg-black/10') : (isDark ? 'text-neutral-500 hover:bg-white/10' : 'text-neutral-500 hover:bg-black/10')}`}>
                  {isSearchOpen ? <X size={20} className="shrink-0" /> : <Search size={20} className="shrink-0" />}
                </button>
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 150, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden ml-2 absolute right-10 md:relative md:right-auto"
                    >
                      <form onSubmit={handleGlobalSearch}>
                        <input 
                          ref={searchInputRef}
                          type="text" 
                          value={searchVal}
                          onChange={(e) => setSearchVal(e.target.value)}
                          placeholder={t('search_placeholder')}
                          className={`w-full border rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-neutral-500 transition-all ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-100 border-gray-200 text-slate-900'}`}
                        />
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} 
                className={`p-2 rounded-full transition-all duration-500 hover:scale-110 active:scale-95 ${isDark ? 'text-neutral-400 hover:bg-neutral-900' : 'text-neutral-600 hover:bg-gray-200'}`}
              >
                {isDark ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
              </button>

              <button 
                onClick={toggleLanguage}
                className={`p-2 rounded-full transition-all duration-500 hover:scale-110 active:scale-95 ${isDark ? 'text-neutral-400 hover:bg-neutral-900' : 'text-neutral-600 hover:bg-gray-200'}`}
              >
                <Globe size={20} className="shrink-0" />
              </button>
              {user && (['admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'alitabash0@gmail.com') && (
                <Link 
                  to="/admin"
                  className={`hidden md:flex p-2 rounded-full transition-all duration-500 hover:scale-110 active:scale-95 ${isDark ? 'text-neutral-400 hover:bg-neutral-900' : 'text-neutral-600 hover:bg-gray-200'}`}
                >
                  <Shield size={20} className="shrink-0" />
                </Link>
              )}
            </div>

            {user ? (
              <Link 
                to="/profile"
                className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full border transition-all duration-500 hover:border-white/50 hover:bg-white/5 ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-100 border-gray-200'}`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-black font-black text-xs overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className={`hidden lg:block text-[10px] font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden md:flex items-center gap-2 bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-xl font-black transition-all shadow-xl active:scale-95 shrink-0 text-xs"
              >
                <User size={16} className="shrink-0" />
                <span>{t('login')}</span>
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* Mobile Search Bar (below nav) - desktop only */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`hidden md:block border-b px-4 py-2 ${isDark ? 'bg-[var(--bg-amoled)] border-white/5' : 'bg-white border-gray-200'}`}
          >
            <form onSubmit={handleGlobalSearch}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder={t('search_placeholder')}
                className={`w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-neutral-500 transition-all ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-gray-100 border-gray-200 text-slate-900'}`}
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8 transition-colors duration-700 ease-in-out pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`transition-all duration-700 border-t ${isDark ? 'bg-black border-white/5' : 'bg-gray-50 border-gray-200'} pt-12 md:pt-16 pb-32 md:pb-16 px-4 md:px-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Section */}
            <div className="space-y-6">
              <Link to="/" className="flex items-center">
                <img 
                  src={isDark ? "/logo-white.png" : "/logo-black.png"} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain transition-all duration-700"
                />
              </Link>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {language === 'ar' 
                  ? 'أنيفيرس هي منصتكم الأولى لمتابعة أحدث فصول المانهوا والمانجا المترجمة بجودة عالية وتجربة قراءة فريدة.' 
                  : 'Aniverse is your premier platform for following the latest translated manhwa and manga chapters with high quality and a unique reading experience.'}
              </p>
              <div className="flex items-center gap-4">
                <a href="https://tiktok.com/@aniverse" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10' : 'bg-black/5 text-neutral-600 hover:text-black hover:bg-black/10'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13 3.1-.12 6.2-.13 9.3-.01 1.43-.35 2.91-1.17 4.09-1.19 1.71-3.23 2.61-5.27 2.61-2.04 0-4.08-.9-5.27-2.61-.82-1.18-1.16-2.66-1.17-4.09.01-1.43.35-2.91 1.17-4.09 1.19-1.71 3.23-2.61 5.27-2.61.16 0 .33.01.49.03v4.03c-.16-.02-.33-.03-.49-.03-1.02 0-2.04.45-2.63 1.3-.41.59-.58 1.33-.59 2.04.01.71.18 1.45.59 2.04.59.85 1.61 1.3 2.63 1.3 1.02 0 2.04-.45 2.63-1.3.41-.59.58-1.33.59-2.04V0z"/></svg>
                </a>
                <a href="https://discord.gg/4nH6v6kb3d" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10' : 'bg-black/5 text-neutral-600 hover:text-black hover:bg-black/10'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-6">{language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h4>
              <ul className={`space-y-4 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                <li><Link to="/" className="hover:text-white transition-colors">{t('home')}</Link></li>
                <li><Link to="/library" className="hover:text-white transition-colors">{t('library')}</Link></li>
                <li><Link to="/advanced-search" className="hover:text-white transition-colors">{language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}</Link></li>
                <li><Link to="/profile" className="hover:text-white transition-colors">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</Link></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-6">{language === 'ar' ? 'الأقسام' : 'Categories'}</h4>
              <ul className={`space-y-4 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                <li><Link to="/advanced-search?genre=Action" className="hover:text-white transition-colors">{language === 'ar' ? 'أكشن' : 'Action'}</Link></li>
                <li><Link to="/advanced-search?genre=Fantasy" className="hover:text-white transition-colors">{language === 'ar' ? 'فانتازيا' : 'Fantasy'}</Link></li>
                <li><Link to="/advanced-search?genre=Romance" className="hover:text-white transition-colors">{language === 'ar' ? 'رومانسية' : 'Romance'}</Link></li>
                <li><Link to="/advanced-search?genre=Comedy" className="hover:text-white transition-colors">{language === 'ar' ? 'كوميديا' : 'Comedy'}</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-6">{language === 'ar' ? 'الدعم' : 'Support'}</h4>
              <ul className={`space-y-4 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                <li><Link to="/help-center" className="hover:text-white transition-colors">{language === 'ar' ? 'الدعم الفني' : 'Technical Support'}</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">{language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}</Link></li>
                <li><Link to="/contact-us" className="hover:text-white transition-colors">{language === 'ar' ? 'اتصل بنا' : 'Contact Us'}</Link></li>
              </ul>
            </div>
          </div>

          <div className={`pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'border-white/5 text-neutral-500' : 'border-gray-200 text-neutral-400'}`}>
            <p className="text-xs font-medium">
              © {new Date().getFullYear()} Aniverse. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-6 text-xs font-black uppercase tracking-widest">
              <span className="cursor-pointer hover:text-white transition-colors">DMCA</span>
              <span className="cursor-pointer hover:text-white transition-colors">API</span>
              <span className="cursor-pointer hover:text-white transition-colors">RSS</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t px-6 py-3 transition-all duration-700 ${isDark ? 'bg-[var(--bg-amoled)]/90 backdrop-blur-xl border-neutral-900' : 'bg-white/90 backdrop-blur-xl border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]'}`}>
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
            <Home size={24} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('home')}</span>
          </Link>
          <Link to="/library" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/library' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
            <BookOpen size={24} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('library')}</span>
          </Link>
          <Link to="/advanced-search" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/advanced-search' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
            <SlidersHorizontal size={24} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'ar' ? 'بحث متقدم' : 'Advanced'}</span>
          </Link>
          {user && (['admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'alitabash0@gmail.com') && (
            <Link to="/admin" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/admin' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
              <Shield size={24} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">{language === 'ar' ? 'الإدارة' : 'Admin'}</span>
            </Link>
          )}
          <button 
            onClick={() => user ? navigate('/profile') : setIsAuthModalOpen(true)} 
            className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/profile' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}
          >
            {user ? (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-black font-black text-[10px] overflow-hidden shrink-0 ${location.pathname === '/profile' ? (isDark ? 'bg-white ring-2 ring-white/50' : 'bg-black ring-2 ring-black/50 text-white') : 'bg-neutral-600'}`}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            ) : (
              <User size={24} className="shrink-0" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{user ? user.name.split(' ')[0] : t('login')}</span>
          </button>
        </div>
      </div>

      <AiConcierge />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default Layout;
