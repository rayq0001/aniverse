import React, { useState, useRef, useEffect } from 'react';
import { Search, Home, BookOpen, Moon, Sun, X, SlidersHorizontal, User, RefreshCw, Globe, Shield } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './AuthModal';
import AiConcierge from './AiConcierge';
import { useLanguage } from '../contexts/LanguageContext';

import { auth, db, handleFirestoreError, OperationType, startPresence, stopPresence } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

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

        // Real-time listener for profile updates (includes initial data)
        unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
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
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        // Start presence tracking
        startPresence();
      } else {
        stopPresence();
        setUser(null);
      }
    });

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      if (unsubDoc) unsubDoc();
      unsubscribe();
      stopPresence();
    };
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
  });

  // On mount, set accent color from localStorage
  useEffect(() => {
    const accent = localStorage.getItem('accent_color');
    if (accent) {
      document.documentElement.style.setProperty('--accent-color', accent);
      // Convert hex to rgb
      const hex = accent.replace('#', '');
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    }
  }, []);

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
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm">
          <div className={`px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-lg border ${isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-neutral-100 border-black/10 text-black'}`}>
             <div className="flex items-center gap-2.5">
               <RefreshCw size={14} className="animate-spin" />
               <span className="font-bold text-xs">{t('updates_available')}</span>
             </div>
             <div className="flex items-center gap-2">
               <button onClick={() => window.location.reload()} className="bg-white text-black px-3 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95">{t('refresh')}</button>
               <button onClick={() => setShowRefreshBanner(false)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
             </div>
          </div>
        </div>
      )}

      <nav className={`sticky top-0 z-50 transition-colors duration-300 border-b px-4 md:px-8 py-2.5 ${isDark ? 'bg-[var(--bg-amoled)]/90 backdrop-blur-xl border-white/[0.06]' : 'bg-white/90 backdrop-blur-xl border-gray-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-between">
          
          {/* Left Actions (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {[
              { to: '/', icon: <Home size={18} /> },
              { to: '/library', icon: <BookOpen size={18} /> },
              { to: '/advanced-search', icon: <SlidersHorizontal size={18} /> },
            ].map(item => (
              <Link 
                key={item.to} 
                to={item.to} 
                className={`p-2 rounded-lg transition-colors ${location.pathname === item.to ? (isDark ? 'text-white bg-white/[0.06]' : 'text-black bg-black/[0.06]') : (isDark ? 'text-neutral-500 hover:text-white hover:bg-white/[0.04]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.04]')}`}
              >
                {item.icon}
              </Link>
            ))}
          </div>

          {/* Logo (Always centered) */}
          <Link to="/" className="flex items-center justify-center shrink-0">
            <img 
              src={isDark ? "/logo-white.png" : "/logo-black.png"} 
              alt="Logo" 
              className="h-7 sm:h-8 md:h-9 w-auto object-contain"
            />
          </Link>

          {/* Right Actions (Desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative">
              <AnimatePresence>
                {isSearchOpen ? (
                  <motion.form
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    onSubmit={handleGlobalSearch}
                    className="overflow-hidden"
                  >
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      placeholder={t('search_placeholder')}
                      className={`w-full rounded-lg py-1.5 px-3 text-xs focus:outline-none transition-colors ${isDark ? 'bg-white/[0.06] text-white placeholder:text-neutral-600' : 'bg-black/[0.04] text-black placeholder:text-neutral-400'}`}
                    />
                  </motion.form>
                ) : null}
              </AnimatePresence>
            </div>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>

            <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={toggleLanguage} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
              <Globe size={18} />
            </button>

            {user && (['founder', 'admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'me.rayq0001@gmail.com') && (
              <Link to="/admin" className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
                <Shield size={18} />
              </Link>
            )}

            {user ? (
              <Link to="/profile" className={`flex items-center gap-2 p-1 pe-3 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.06]'}`}>
                <div className="w-7 h-7 rounded-md bg-neutral-700 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                  {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : user.name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
                <User size={18} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 transition-colors duration-300 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`border-t ${isDark ? 'bg-black border-white/[0.06]' : 'bg-gray-50 border-gray-200'} pt-12 pb-28 md:pb-12 px-4 md:px-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link to="/">
                <img src={isDark ? "/logo-white.png" : "/logo-black.png"} alt="Logo" className="h-8 w-auto object-contain" />
              </Link>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                {language === 'ar' 
                  ? 'منصتكم الأولى لمتابعة أحدث فصول المانهوا والمانجا المترجمة.' 
                  : 'Your premier platform for the latest translated manhwa and manga chapters.'}
              </p>
              <div className="flex items-center gap-2">
                <a href="https://tiktok.com/@aniverse" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-500 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13 3.1-.12 6.2-.13 9.3-.01 1.43-.35 2.91-1.17 4.09-1.19 1.71-3.23 2.61-5.27 2.61-2.04 0-4.08-.9-5.27-2.61-.82-1.18-1.16-2.66-1.17-4.09.01-1.43.35-2.91 1.17-4.09 1.19-1.71 3.23-2.61 5.27-2.61.16 0 .33.01.49.03v4.03c-.16-.02-.33-.03-.49-.03-1.02 0-2.04.45-2.63 1.3-.41.59-.58 1.33-.59 2.04.01.71.18 1.45.59 2.04.59.85 1.61 1.3 2.63 1.3 1.02 0 2.04-.45 2.63-1.3.41-.59.58-1.33.59-2.04V0z"/></svg>
                </a>
                <a href="https://discord.gg/4nH6v6kb3d" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-500 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-500 hover:text-black hover:bg-black/[0.06]'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className={`font-bold text-xs mb-4 ${isDark ? 'text-white' : 'text-black'}`}>{language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h4>
              <ul className={`space-y-2.5 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                <li><Link to="/" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{t('home')}</Link></li>
                <li><Link to="/library" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{t('library')}</Link></li>
                <li><Link to="/advanced-search" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}</Link></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className={`font-bold text-xs mb-4 ${isDark ? 'text-white' : 'text-black'}`}>{language === 'ar' ? 'الأقسام' : 'Categories'}</h4>
              <ul className={`space-y-2.5 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                <li><Link to="/advanced-search?genre=Action" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'أكشن' : 'Action'}</Link></li>
                <li><Link to="/advanced-search?genre=Fantasy" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'فانتازيا' : 'Fantasy'}</Link></li>
                <li><Link to="/advanced-search?genre=Romance" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'رومانسية' : 'Romance'}</Link></li>
                <li><Link to="/advanced-search?genre=Comedy" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'كوميديا' : 'Comedy'}</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className={`font-bold text-xs mb-4 ${isDark ? 'text-white' : 'text-black'}`}>{language === 'ar' ? 'الدعم' : 'Support'}</h4>
              <ul className={`space-y-2.5 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                <li><Link to="/help-center" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'الدعم الفني' : 'Technical Support'}</Link></li>
                <li><Link to="/privacy-policy" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></li>
                <li><Link to="/terms-of-service" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}</Link></li>
                <li><Link to="/contact-us" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>{language === 'ar' ? 'اتصل بنا' : 'Contact Us'}</Link></li>
              </ul>
            </div>
          </div>

          <div className={`pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3 ${isDark ? 'border-white/[0.06] text-neutral-600' : 'border-gray-200 text-neutral-400'}`}>
            <p className="text-[11px]">© {new Date().getFullYear()} Aniverse. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>DMCA</span>
              <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>API</span>
              <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-black'}`}>RSS</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-2 ${isDark ? 'bg-[var(--bg-amoled)]/95 backdrop-blur-xl border-white/[0.06]' : 'bg-white/95 backdrop-blur-xl border-gray-200'}`}>
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { to: '/', icon: <Home size={20} />, label: t('home') },
            { to: '/library', icon: <BookOpen size={20} />, label: t('library') },
            { to: '/advanced-search', icon: <SlidersHorizontal size={20} />, label: language === 'ar' ? 'بحث' : 'Search' },
          ].map(item => (
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${location.pathname === item.to ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
              {item.icon}
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          ))}
          {user && (['founder', 'admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'me.rayq0001@gmail.com') && (
            <Link to="/admin" className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${location.pathname === '/admin' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}>
              <Shield size={20} />
              <span className="text-[9px] font-bold">{language === 'ar' ? 'إدارة' : 'Admin'}</span>
            </Link>
          )}
          <button 
            onClick={() => user ? navigate('/profile') : setIsAuthModalOpen(true)} 
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${location.pathname === '/profile' ? (isDark ? 'text-white' : 'text-black') : 'text-neutral-500'}`}
          >
            {user ? (
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0 ${location.pathname === '/profile' ? 'ring-1.5 ring-current' : ''} bg-neutral-600 text-white`}>
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : user.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User size={20} />
            )}
            <span className="text-[9px] font-bold">{user ? user.name.split(' ')[0] : t('login')}</span>
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
