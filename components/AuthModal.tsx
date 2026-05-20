
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row min-h-[600px] border border-white/10"
            style={{ background: 'linear-gradient(145deg, rgba(30,30,30,0.9), rgba(10,10,10,0.9))', backdropFilter: 'blur(20px)' }}
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/20 transition-all text-white z-50 hover:rotate-90 duration-300"
            >
              <X size={18} />
            </button>

            {/* Left Visual Side */}
            <div className="hidden md:flex md:w-5/12 relative overflow-hidden items-center justify-center p-12">
              <div className="absolute inset-0 bg-black">
                {/* Animated Orbs */}
                <div className="absolute top-0 left-0 w-full h-full">
                  <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse-subtle" style={{ background: 'var(--accent-color)' }}></div>
                  <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-subtle" style={{ animationDelay: '2s' }}></div>
                </div>
                {/* Grid Pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                <motion.div 
                  key={isLogin ? 'login' : 'signup'}
                  initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-32 h-32 rounded-[2rem] bg-white/5 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center p-6 backdrop-blur-md"
                >
                  <img src="/logo-white.png" alt="Aniverse" className="w-full h-full object-contain" />
                </motion.div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {isLogin ? 'Welcome Back!' : 'Join Aniverse'}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {isLogin 
                      ? 'Dive back into your favorite manhwa and continue your journey.' 
                      : 'Create an account to track your reading, bookmark favorites, and more.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Form Side */}
            <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center relative bg-white/5">
              <div className="max-w-sm mx-auto w-full space-y-8 relative z-10">
                {/* Header */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {isLogin ? t('login_btn') : t('signup_btn')}
                  </h2>
                  <p className="text-neutral-400 text-sm">
                    {isLogin ? 'Enter your details to access your account' : 'Fill in your details to get started'}
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5"><X size={14} className="bg-red-500/20 rounded-full p-0.5" /></div>
                    <p>{error}</p>
                  </motion.div>
                )}

                {/* Google Button */}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <div className="relative px-6 py-4 flex items-center justify-center gap-3">
                    <GoogleIcon />
                    <span className="text-sm font-bold text-white tracking-wide">{t('continue_google')}</span>
                  </div>
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('or_email')}</span>
                  <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="relative group">
                          <User className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors`} size={20} />
                          <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-white/30 transition-all text-white placeholder:text-neutral-600 font-medium`}
                            placeholder={t('full_name')}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative group">
                    <Mail className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors`} size={20} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-white/30 transition-all text-white placeholder:text-neutral-600 font-medium`}
                      placeholder={t('email')}
                    />
                  </div>

                  <div className="relative group">
                    <Lock className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors`} size={20} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-white/30 transition-all text-white placeholder:text-neutral-600 font-medium`}
                      placeholder={t('password')}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full relative group overflow-hidden rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-50 mt-2"
                    style={{ background: 'var(--accent-color)' }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative px-6 py-4 flex items-center justify-center gap-2 text-black">
                      {loading ? (
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="font-black text-lg tracking-wide">{isLogin ? t('login_btn') : t('signup_btn')}</span>
                          <span className="group-hover:translate-x-1 transition-transform">
                            {isLogin ? <LogIn size={20} strokeWidth={3} /> : <UserPlus size={20} strokeWidth={3} />}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-sm text-neutral-500">
                    {isLogin ? (language === 'ar' ? "ليس لديك حساب؟" : "Don't have an account?") : (language === 'ar' ? "لديك حساب بالفعل؟" : "Already have an account?")}{' '}
                    <button 
                      onClick={() => setIsLogin(!isLogin)}
                      className="font-bold text-white hover:underline transition-all"
                    >
                      {isLogin ? t('register_now') : t('login_now')}
                    </button>
                  </p>
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
