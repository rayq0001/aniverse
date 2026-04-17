import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Details from './pages/Details';
import Reader from './pages/Reader';
import Library from './pages/Library';
import AdvancedSearch from './pages/AdvancedSearch';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactUs from './pages/ContactUs';
import { LanguageProvider } from './contexts/LanguageContext';

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
      <Router>
        <Layout>
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
          </Routes>
        </Layout>
        <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
      </Router>
    </LanguageProvider>
  );
};

export default App;
