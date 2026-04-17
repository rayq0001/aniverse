
import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.68-2.33 1.09-3.71 1.09-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.87 14.15c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.13H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.87l3.69-2.72z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.13l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335"/>
  </svg>
);



interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const syncUserToFirestore = async (user: any, displayName?: string) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: displayName || user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          avatarUrl: user.photoURL || '',
          bannerUrl: '',
          bio: '',
          role: 'user',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await syncUserToFirestore(userCredential.user, name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl bg-white dark:bg-neutral-950 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden min-h-[500px] md:min-h-[550px]"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-neutral-500 z-50"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col md:flex-row h-full min-h-[500px] md:min-h-[550px]">
              {/* Visual Side */}
              <div className="hidden md:flex md:w-5/12 bg-neutral-900 relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
                  <div className="grid grid-cols-6 gap-3 p-6 opacity-20">
                    {[...Array(36)].map((_, i) => (
                      <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }}></div>
                    ))}
                  </div>
                </div>
                
                <div className="relative z-10 text-center space-y-6">
                  <motion.div 
                    key={isLogin ? 'login-icon' : 'signup-icon'}
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="w-32 h-32 mx-auto bg-white/5 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden"
                  >
                    <img 
                      src="/logo-white.png" 
                      alt="Logo" 
                      className="w-full h-full object-contain p-4"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Form Side */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center space-y-8 bg-white dark:bg-neutral-950">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {isLogin ? t('login_btn') : t('signup_btn')}
                    </h2>
                    <div className="h-1 w-8 bg-black dark:bg-white rounded-full"></div>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
                    <button 
                      onClick={() => setIsLogin(true)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${isLogin ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xl' : 'text-neutral-500 hover:text-neutral-400'}`}
                    >
                      <LogIn size={14} />
                      <span className="hidden sm:inline">{t('login_btn')}</span>
                    </button>
                    <button 
                      onClick={() => setIsLogin(false)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${!isLogin ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xl' : 'text-neutral-500 hover:text-neutral-400'}`}
                    >
                      <UserPlus size={14} />
                      <span className="hidden sm:inline">{t('signup_btn')}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Social Row - Icon Based */}
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      title={t('continue_google')}
                      className="w-16 h-16 flex items-center justify-center rounded-2xl border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-xl hover:scale-110 active:scale-95 disabled:opacity-50"
                    >
                      <GoogleIcon />
                    </button>

                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200 dark:border-white/5"></span>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white dark:bg-neutral-950 px-4 text-[10px] uppercase font-black tracking-widest text-neutral-500">{t('or_email')}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                      {!isLogin && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="relative group"
                        >
                          <User className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors`} size={20} />
                          <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-black dark:focus:border-white/30 transition-all dark:text-white font-bold`}
                            placeholder={t('full_name')}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative group">
                      <Mail className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors`} size={20} />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-black dark:focus:border-white/30 transition-all dark:text-white font-bold`}
                        placeholder={t('email')}
                      />
                    </div>

                    <div className="relative group">
                      <Lock className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors`} size={20} />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-black dark:focus:border-white/30 transition-all dark:text-white font-bold`}
                        placeholder={t('password')}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-5 rounded-2xl transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 text-lg disabled:opacity-50 group"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-4 border-current/20 border-t-current rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="group-hover:translate-x-1 transition-transform">
                            {isLogin ? <LogIn size={24} /> : <UserPlus size={24} />}
                          </span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center">
                    <button 
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {isLogin ? t('register_now') : t('login_now')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
