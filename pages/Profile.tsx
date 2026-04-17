
import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, LogOut, Settings, Heart, Clock, Star, Camera, Globe, Sun, Zap, Trash2, X, Sparkles, Upload, BookOpen, Bell, MessageSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import * as ReactRouterDOM from 'react-router-dom';
import { toast } from 'sonner';
import { Notification } from '../types';

import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const { useNavigate } = ReactRouterDOM as any;

const Profile: React.FC = () => {
  const { t, language, dir, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ 
    uid: string;
    name: string; 
    email: string; 
    provider?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    role?: string;
  } | null>(null);
  const [stats, setStats] = useState({ favorites: 0, history: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'security' | 'notifications'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (!firebaseUser) {
        navigate('/');
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      
      // Real-time listener for profile
      unsubDoc = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUser({
            uid: firebaseUser.uid,
            name: data.name,
            email: data.email,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
            bannerUrl: data.bannerUrl,
            role: data.role
          });
          setEditData({
            name: data.name || '',
            bio: data.bio || (language === 'ar' ? 'لا يوجد نبذة تعريفية حالياً.' : 'No bio yet.')
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
      });

      // Stats from local storage (or could be moved to Firestore later)
      const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
      setStats({ favorites: favs.length, history: history.length });
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubscribe();
    };
  }, [navigate, language]);

  useEffect(() => {
    if (user?.email) {
      const savedNotifications = JSON.parse(localStorage.getItem(`notifications_${user.email}`) || '[]');
      setNotifications(savedNotifications);
    }
  }, [user?.email]);

  const saveUser = async (updates: any) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, updates);
      toast.success(language === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully');
    } catch (err) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving changes');
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await saveUser({ name: editData.name, bio: editData.bio });
    setIsEditing(false);
  };

  const handleSelectAvatar = async (url: string) => {
    await saveUser({ avatarUrl: url });
    setShowAvatarModal(false);
  };

  const handleSelectBanner = async (url: string) => {
    await saveUser({ bannerUrl: url });
    setShowBannerModal(false);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const toastId = toast.loading(language === 'ar' ? 'جاري رفع الصورة...' : 'Uploading image...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await saveUser({ avatarUrl: base64String });
        toast.dismiss(toastId);
        setShowAvatarModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const toastId = toast.loading(language === 'ar' ? 'جاري رفع الغلاف...' : 'Uploading banner...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await saveUser({ bannerUrl: base64String });
        toast.dismiss(toastId);
        setShowBannerModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', bio: '' });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accent_color') || '#71717a');
  const [fastReading, setFastReading] = useState(() => localStorage.getItem('fast_reading') === 'true');
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const ACCENT_COLORS = [
    { name: 'Gray', value: '#71717a' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
  ];

  const BADGES = [
    { id: 1, name: language === 'ar' ? 'قارئ نهم' : 'Avid Reader', desc: language === 'ar' ? 'لقد قرأت أكثر من 100 فصل!' : 'You have read over 100 chapters!', icon: <BookOpen size={16} />, color: 'bg-blue-500' },
    { id: 2, name: language === 'ar' ? 'داعم ذهبي' : 'Gold Supporter', desc: language === 'ar' ? 'شكراً لدعمك المستمر للمنصة' : 'Thank you for your continuous support', icon: <Star size={16} />, color: 'bg-yellow-500' },
    { id: 3, name: language === 'ar' ? 'مستكشف' : 'Explorer', desc: language === 'ar' ? 'قمت بزيارة جميع أقسام الموقع' : 'You have visited all site sections', icon: <Globe size={16} />, color: 'bg-emerald-500' },
    { id: 4, name: language === 'ar' ? 'عضو قديم' : 'Veteran', desc: language === 'ar' ? 'عضو في أنيفيرس منذ البداية' : 'A member of Aniverse since the beginning', icon: <Shield size={16} />, color: 'bg-neutral-500' },
  ];

  const AVATARS = [
    'https://picsum.photos/id/64/200/200',
    'https://picsum.photos/id/65/200/200',
    'https://picsum.photos/id/66/200/200',
    'https://picsum.photos/id/67/200/200',
    'https://picsum.photos/id/68/200/200',
    'https://picsum.photos/id/69/200/200',
  ];

  const BANNERS = [
    'https://images.unsplash.com/photo-1614728263952-84ea206f25ab?auto=format&fit=crop&q=80&w=1200&h=400',
    'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1200&h=400',
    'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&q=80&w=1200&h=400',
    'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?auto=format&fit=crop&q=80&w=1200&h=400',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200&h=400',
  ];

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event('themeUpdated'));
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('accent_color', color);
    window.dispatchEvent(new Event('themeUpdated'));
  };

  const toggleFastReading = () => {
    const newVal = !fastReading;
    setFastReading(newVal);
    localStorage.setItem('fast_reading', String(newVal));
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !passwords.new) return;
    try {
      await updatePassword(auth.currentUser, passwords.new);
      setPasswords({ current: '', new: '' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      // Delete user comments
      const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', uid)));
      for (const c of commentsSnap.docs) await deleteDoc(doc(db, 'comments', c.id));
      // Delete user views
      const viewsSnap = await getDocs(query(collection(db, 'views'), where('userId', '==', uid)));
      for (const v of viewsSnap.docs) await deleteDoc(doc(db, 'views', v.id));
      // Delete Firestore user doc
      await deleteDoc(doc(db, 'users', uid));
      // Delete Firebase Auth account
      await auth.currentUser.delete();
      navigate('/');
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20" dir={dir}>
      {/* Modern Header */}
      <div className="relative rounded-2xl sm:rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl group">
        <div className="absolute inset-0 h-64 md:h-80">
          <img 
            src={user.bannerUrl || BANNERS[0]} 
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" 
            alt="Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
        </div>
        
        <div className="relative pt-20 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-8 md:px-16 flex flex-col md:flex-row items-center md:items-end gap-5 sm:gap-8">
          <div className="relative group/avatar">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-2xl sm:rounded-[3rem] bg-neutral-900 border-[6px] sm:border-[10px] border-black flex items-center justify-center text-white text-3xl sm:text-5xl md:text-7xl font-black shadow-2xl overflow-hidden transition-all duration-500 group-hover/avatar:scale-105 group-hover/avatar:rotate-2">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <button 
              onClick={() => setShowAvatarModal(true)}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all rounded-2xl sm:rounded-[3rem] backdrop-blur-sm"
            >
              <Camera size={32} className="text-white" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-right space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <h1 className="text-2xl sm:text-4xl md:text-7xl font-black text-white tracking-tighter leading-none">
                  {user.name}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`text-[10px] uppercase font-black px-4 py-1.5 rounded-full shadow-xl border ${
                    user.role === 'admin' ? 'bg-red-500 text-white border-red-400' :
                    user.role === 'moderator' ? 'bg-purple-500 text-white border-purple-400' :
                    user.role?.startsWith('staff') ? 'bg-emerald-500 text-white border-emerald-400' :
                    'bg-white text-black border-neutral-200'
                  }`}>
                    {user.role ? user.role.replace('_', ' ') : (language === 'ar' ? 'عضو' : 'Member')}
                  </div>
                </div>
              </div>
              <p className="text-neutral-400 text-sm sm:text-lg font-bold flex items-center justify-center md:justify-start gap-2">
                <Mail size={18} />
                {user.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {BADGES.map(badge => (
                <button 
                  key={badge.id} 
                  onClick={() => toast.info(badge.desc, {
                    description: badge.name,
                    icon: badge.icon
                  })}
                  className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all cursor-pointer active:scale-90" 
                  title={badge.name}
                >
                  {badge.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 sm:gap-3 flex-wrap justify-center">
            {(['admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'alitabash0@gmail.com') && (
              <button 
                onClick={() => navigate('/admin')}
                className="px-6 py-3 rounded-2xl font-black text-xs transition-all border flex items-center gap-2 hover:text-white"
                style={{ 
                  backgroundColor: 'rgba(var(--accent-rgb), 0.1)', 
                  color: 'var(--accent-color)', 
                  borderColor: 'rgba(var(--accent-rgb), 0.2)' 
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-color)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.1)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
              >
                <Shield size={18} />
                {language === 'ar' ? 'لوحة التحكم' : 'Admin Panel'}
              </button>
            )}
            <button 
              onClick={() => setShowBannerModal(true)}
              className="px-6 py-3 bg-white/5 hover:bg-white hover:text-black backdrop-blur-md rounded-2xl text-white font-black text-xs transition-all border border-white/10 flex items-center gap-2"
            >
              <Camera size={18} />
              {language === 'ar' ? 'تغيير الغلاف' : 'Change Banner'}
            </button>
            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black text-xs transition-all border border-red-500/20 flex items-center gap-2"
            >
              <LogOut size={18} />
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8">
        {/* Stats Bento Card */}
        <div className="md:col-span-4 bg-neutral-950 border border-white/5 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all"></div>
          
          <div className="space-y-1">
            <h3 className="text-xs font-black text-neutral-600 uppercase tracking-[0.3em]">{language === 'ar' ? 'إحصائياتك' : 'Your Stats'}</h3>
            <p className="text-2xl font-black text-white tracking-tight">{language === 'ar' ? 'رحلة القراءة' : 'Reading Journey'}</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all">
              <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl">
                <Heart size={28} className="fill-current" />
              </div>
              <div>
                <span className="block text-3xl font-black text-white">{stats.favorites}</span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{language === 'ar' ? 'مفضلة' : 'Favorites'}</span>
              </div>
            </div>
            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all">
              <div className="w-14 h-14 bg-neutral-800 text-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Clock size={28} />
              </div>
              <div>
                <span className="block text-3xl font-black text-white">{stats.history}</span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{language === 'ar' ? 'فصل' : 'Chapters'}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-neutral-500">
              <span>LVL 42</span>
              <span>75%</span>
            </div>
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full rounded-full accent-bg"
              />
            </div>
          </div>
        </div>

        {/* Main Content Bento Card */}
        <div className="md:col-span-8 space-y-8">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 bg-neutral-950 p-2 rounded-[2rem] border border-white/5 shadow-2xl">
            {[
              { id: 'overview', icon: <User size={18} />, label: language === 'ar' ? 'الملف' : 'Profile' },
              { id: 'notifications', icon: <Bell size={18} />, label: language === 'ar' ? 'التنبيهات' : 'Alerts' },
              { id: 'settings', icon: <Settings size={18} />, label: language === 'ar' ? 'الإعدادات' : 'Settings' },
              { id: 'security', icon: <Shield size={18} />, label: language === 'ar' ? 'الأمان' : 'Security' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'accent-bg text-black shadow-xl scale-[1.02]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'notifications' && notifications.some(n => !n.read) && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-neutral-950 border border-white/5 rounded-[3rem] p-10 shadow-2xl min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white tracking-tighter">{language === 'ar' ? 'المعلومات الشخصية' : 'Personal Info'}</h2>
                      <p className="text-sm text-neutral-500 font-bold">{language === 'ar' ? 'كيف يراك الآخرون في الموقع' : 'How others see you on the platform'}</p>
                    </div>
                    <button 
                      onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white/5 text-neutral-400 hover:bg-white hover:text-black'} shadow-xl`}
                    >
                      {isEditing ? (language === 'ar' ? 'حفظ' : 'Save') : (language === 'ar' ? 'تعديل' : 'Edit')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-2">{language === 'ar' ? 'الاسم' : 'Name'}</label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-2xl p-5 text-base font-black text-white focus:outline-none focus:border-white/30 transition-all"
                        />
                      ) : (
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-white font-black">{user.name}</div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-2">{language === 'ar' ? 'البريد' : 'Email'}</label>
                      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-neutral-500 font-black opacity-60">{user.email}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-2">{language === 'ar' ? 'النبذة' : 'Bio'}</label>
                    {isEditing ? (
                      <textarea 
                        value={editData.bio}
                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl p-6 text-neutral-400 font-bold text-sm leading-relaxed min-h-[150px] focus:outline-none focus:border-white/30 transition-all"
                      />
                    ) : (
                      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl min-h-[150px] text-neutral-400 font-bold text-sm leading-relaxed">
                        {user.bio || (language === 'ar' ? 'لا يوجد نبذة حالياً.' : 'No bio yet.')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div 
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-white tracking-tighter">{language === 'ar' ? 'التنبيهات' : 'Notifications'}</h2>
                    <button onClick={() => setNotifications([])} className="text-[10px] font-black text-neutral-500 hover:text-red-500 uppercase tracking-widest transition-colors">{language === 'ar' ? 'مسح' : 'Clear'}</button>
                  </div>
                  <div className="space-y-4">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                          <img src={n.fromUserAvatar} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-300 font-bold leading-tight">
                            <span className="text-white font-black">{n.fromUserName}</span> {n.type === 'like' ? 'liked' : 'replied to'} your comment.
                          </p>
                          <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mt-1 block">{new Date(n.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl text-neutral-500">
                          {n.type === 'like' ? <Heart size={18} className="fill-current" /> : <MessageSquare size={18} />}
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center space-y-4 opacity-30">
                        <Bell size={64} className="mx-auto" />
                        <p className="font-black text-lg">{language === 'ar' ? 'لا توجد تنبيهات' : 'No notifications'}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <h2 className="text-3xl font-black text-white tracking-tighter">{t('theme_settings')}</h2>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 gap-4">
                      <div className="flex items-center gap-4">
                        <Sun size={20} className="text-neutral-500" />
                        <span className="font-black text-white">{t('amoled_mode')}</span>
                      </div>
                      <div className="flex bg-black p-1 rounded-xl border border-white/10">
                        <button onClick={() => toggleTheme('dark')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${theme === 'dark' ? 'bg-white text-black' : 'text-neutral-500'}`}>AMOLED</button>
                        <button onClick={() => toggleTheme('light')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${theme === 'light' ? 'bg-white text-black' : 'text-neutral-500'}`}>LIGHT</button>
                      </div>
                    </div>

                    <div className="flex flex-col p-6 bg-white/5 rounded-[2rem] border border-white/5 gap-6">
                      <div className="flex items-center gap-4">
                        <Sparkles size={20} className="text-neutral-500" />
                        <span className="font-black text-white">{t('accent_color')}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {ACCENT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => handleAccentChange(color.value)}
                            className={`h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${accentColor === color.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: color.value }}
                          >
                            {accentColor === color.value && <Check size={20} className="text-white drop-shadow-md" />}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t('select_accent_color')}</p>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <div className="flex items-center gap-4">
                        <Globe size={20} className="text-neutral-500" />
                        <span className="font-black text-white">{t('language')}</span>
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white outline-none"
                      >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <div className="flex items-center gap-4">
                        <Zap size={20} className="text-neutral-500" />
                        <span className="font-black text-white">{language === 'ar' ? 'القراءة السريعة' : 'Fast Reading'}</span>
                      </div>
                      <button 
                        onClick={toggleFastReading}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${fastReading ? 'bg-white' : 'bg-neutral-800'}`}
                      >
                        <motion.div animate={{ x: fastReading ? 24 : 4 }} className={`absolute top-1 w-4 h-4 rounded-full ${fastReading ? 'bg-black' : 'bg-white'}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <h2 className="text-3xl font-black text-white tracking-tighter">{language === 'ar' ? 'الأمان' : 'Security'}</h2>
                  <div className="space-y-6">
                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-6">
                      <div className="flex items-center gap-4">
                        <Shield size={24} className="text-neutral-500" />
                        <span className="font-black text-white">{language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                      </div>
                      <div className="space-y-4">
                        <input type="password" placeholder="Current Password" className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-white/30 transition-all" />
                        <input type="password" placeholder="New Password" className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-white/30 transition-all" />
                      </div>
                      <button onClick={handleChangePassword} className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all uppercase tracking-widest text-xs">Update</button>
                    </div>
                    <div className="p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="block font-black text-red-500 uppercase tracking-widest text-xs">{language === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}</span>
                        <span className="text-sm text-neutral-500 font-bold">{language === 'ar' ? 'حذف الحساب نهائياً' : 'Delete account permanently'}</span>
                      </div>
                      <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all text-xs uppercase tracking-widest">Delete</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-neutral-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">{language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}</h3>
                <p className="text-sm text-neutral-500 font-bold">{language === 'ar' ? 'سيتم حذف جميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء.' : 'All your data will be permanently deleted and this action cannot be undone.'}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  {language === 'ar' ? 'نعم، احذف حسابي' : 'Yes, delete my account'}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-black rounded-xl transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAvatarModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-neutral-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white">{language === 'ar' ? 'اختر صورتك الرمزية' : 'Choose Your Avatar'}</h3>
                <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-white/5 rounded-full text-neutral-500"><X size={20} /></button>
              </div>
              
              <div className="mb-8">
                <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-3xl hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-neutral-500 group-hover:text-white transition-colors" />
                    <p className="text-sm font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors">
                      {language === 'ar' ? 'ارفع صورة مخصصة' : 'Upload custom image'}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCustomAvatarUpload} />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {AVATARS.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectAvatar(url)}
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-white transition-all active:scale-95"
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Banner Selection Modal */}
      <AnimatePresence>
        {showBannerModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBannerModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white">{language === 'ar' ? 'اختر غلاف الصفحة' : 'Choose Your Banner'}</h3>
                <button onClick={() => setShowBannerModal(false)} className="p-2 hover:bg-white/5 rounded-full text-neutral-500"><X size={20} /></button>
              </div>

              <div className="mb-8">
                <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-3xl hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-neutral-500 group-hover:text-white transition-colors" />
                    <p className="text-sm font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors">
                      {language === 'ar' ? 'ارفع غلاف مخصص' : 'Upload custom banner'}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCustomBannerUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {BANNERS.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectBanner(url)}
                    className="h-24 md:h-32 w-full rounded-2xl overflow-hidden border-2 border-transparent hover:border-white transition-all active:scale-[0.98]"
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Banner ${i}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
