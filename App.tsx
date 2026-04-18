import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';

const Details = lazy(() => import('./pages/Details'));
const Reader = lazy(() => import('./pages/Reader'));
const Library = lazy(() => import('./pages/Library'));
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
import { LanguageProvider } from './contexts/LanguageContext';
import { ManhwaProvider } from './contexts/ManhwaContext';

const App: React.FC = () => {
  useEffect(() => {
    const applyTheme = () => {
      const accentColor = localStorage.getItem('accent_color') || '#71717a';
      document.documentElement.style.setProperty('--accent-color', accentColor);
      
      // Convert hex to rgb for opacity support
      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);
      document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      
      const theme = localStorage.getItem('theme') || 'dark';
      if (theme === 'light') {
        document.documentElement.style.setProperty('--bg-amoled', '#ffffff');
        document.documentElement.classList.add('light-mode');
      } else {
        document.documentElement.style.setProperty('--bg-amoled', '#000000');
        document.documentElement.classList.remove('light-mode');
      }
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);
    window.addEventListener('themeUpdated', applyTheme);
    
    // Prevent right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('themeUpdated', applyTheme);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <LanguageProvider>
      <ManhwaProvider>
      <Router>
        <Layout>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/details/:id" element={<Details />} />
            <Route path="/reader/:manhwaId/:chapterId" element={<Reader />} />
            <Route path="/library" element={<Library />} />
            <Route path="/advanced-search" element={<AdvancedSearch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/user/:uid" element={<UserProfile />} />
          </Routes>
          </Suspense>
        </Layout>
        <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
      </Router>
      </ManhwaProvider>
    </LanguageProvider>
  );
};

export default App;
