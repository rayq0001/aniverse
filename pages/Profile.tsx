import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, LogOut, Settings, Heart, Clock, Star, Camera, Globe, Sun, Zap, Trash2, X, Sparkles, Upload, BookOpen, Bell, MessageSquare, Check, Crown, Award, TrendingUp, Eye, Flame, ChevronRight, Lock, KeyRound, Languages, Palette, MonitorSmartphone, CircleUserRound, PenLine, AtSign, FileText, ShieldCheck, AlertTriangle, ImagePlus, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import * as ReactRouterDOM from 'react-router-dom';
import { toast } from 'sonner';
import { Notification } from '../types';

import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    isPrivate?: boolean;
  } | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [stats, setStats] = useState({ favorites: 0, history: 0, commentsCount: 0, chaptersRead: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'security' | 'notifications'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', bio: '' });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accent_color') || '#71717a');
  const [fastReading, setFastReading] = useState(() => localStorage.getItem('fast_reading') === 'true');
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (!firebaseUser) { navigate('/'); return; }
      const userRef = doc(db, 'users', firebaseUser.uid);
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
            role: data.role,
            isPrivate: data.isPrivate || false
          });
          setIsPrivate(data.isPrivate || false);
          setEditData({
            name: data.name || '',
            bio: data.bio || (language === 'ar' ? 'لا يوجد نبذة تعريفية حالياً.' : 'No bio yet.')
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
      });

      const favs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      const history = JSON.parse(localStorage.getItem('reading_history') || '[]');
      const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', firebaseUser.uid)));
      setStats({ favorites: favs.length, history: history.length, commentsCount: commentsSnap.size, chaptersRead: history.length });
    });
    return () => { if (unsubDoc) unsubDoc(); unsubscribe(); };
  }, [navigate, language]);

  useEffect(() => {
    if (user?.email) {
      const savedNotifications = JSON.parse(localStorage.getItem(`notifications_${user.email}`) || '[]');
      setNotifications(savedNotifications);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent-color', accentColor);
    // Convert hex to rgb
    const hex = accentColor.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

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

  const handleSelectAvatar = async (url: string) => { await saveUser({ avatarUrl: url }); setShowAvatarModal(false); };
  const handleSelectBanner = async (url: string) => { await saveUser({ bannerUrl: url }); setShowBannerModal(false); };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)' : 'File too large (max 50MB)');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === 'ar' ? 'نوع ملف غير مدعوم' : 'Unsupported file type');
      return;
    }
    const toastId = toast.loading(language === 'ar' ? 'جاري رفع الصورة...' : 'Uploading image...');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await saveUser({ avatarUrl: downloadUrl });
      toast.dismiss(toastId);
      setShowAvatarModal(false);
    } catch {
      toast.dismiss(toastId);
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Upload failed');
    }
  };

  const handleCustomBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)' : 'File too large (max 50MB)');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === 'ar' ? 'نوع ملف غير مدعوم' : 'Unsupported file type');
      return;
    }
    const toastId = toast.loading(language === 'ar' ? 'جاري رفع الغلاف...' : 'Uploading banner...');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `profiles/${user.uid}/banner_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await saveUser({ bannerUrl: downloadUrl });
      toast.dismiss(toastId);
      setShowBannerModal(false);
    } catch {
      toast.dismiss(toastId);
      toast.error(language === 'ar' ? 'فشل رفع الغلاف' : 'Upload failed');
    }
  };

  const togglePrivacy = async () => {
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    await saveUser({ isPrivate: newVal });
  };

  const ACCENT_COLORS = [
    { name: 'Gray', value: '#71717a' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
  ];

  const BADGES = [
    { id: 1, name: language === 'ar' ? 'قارئ نهم' : 'Avid Reader', desc: language === 'ar' ? 'لقد قرأت أكثر من 100 فصل!' : 'Read over 100 chapters!', icon: <BookOpen size={16} />, color: 'from-blue-500 to-cyan-400', earned: stats.chaptersRead >= 100 },
    { id: 2, name: language === 'ar' ? 'معلق نشط' : 'Active Commenter', desc: language === 'ar' ? 'كتبت أكثر من 50 تعليق' : 'Written over 50 comments', icon: <MessageSquare size={16} />, color: 'from-yellow-500 to-orange-400', earned: stats.commentsCount >= 50 },
    { id: 3, name: language === 'ar' ? 'مستكشف' : 'Explorer', desc: language === 'ar' ? 'قرأت أكثر من 10 فصول' : 'Read over 10 chapters', icon: <Globe size={16} />, color: 'from-emerald-500 to-teal-400', earned: stats.chaptersRead >= 10 },
    { id: 4, name: language === 'ar' ? 'مبتدئ' : 'Newcomer', desc: language === 'ar' ? 'مرحباً بك في أنيفيرس!' : 'Welcome to Aniverse!', icon: <Sparkles size={16} />, color: 'from-purple-500 to-pink-400', earned: true },
    { id: 5, name: language === 'ar' ? 'اجتماعي' : 'Social', desc: language === 'ar' ? 'كتبت أكثر من 10 تعليقات' : 'Written over 10 comments', icon: <MessageSquare size={16} />, color: 'from-pink-500 to-rose-400', earned: stats.commentsCount >= 10 },
    { id: 6, name: language === 'ar' ? 'محب المانهوا' : 'Manhwa Lover', desc: language === 'ar' ? 'قرأت أكثر من 50 فصل' : 'Read over 50 chapters', icon: <Heart size={16} />, color: 'from-red-500 to-pink-400', earned: stats.chaptersRead >= 50 },
  ];

  const userXP = stats.chaptersRead * 10 + stats.commentsCount * 5;
  const userLevel = Math.floor(userXP / 100) + 1;
  const xpProgress = (userXP % 100);

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
      toast.success(language === 'ar' ? 'تم تحديث كلمة المرور' : 'Password updated');
    } catch (err: any) {
      toast.error(language === 'ar' ? 'فشل تحديث كلمة المرور' : 'Failed to update password');
    }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', uid)));
      for (const c of commentsSnap.docs) await deleteDoc(doc(db, 'comments', c.id));
      const viewsSnap = await getDocs(query(collection(db, 'views'), where('userId', '==', uid)));
      for (const v of viewsSnap.docs) await deleteDoc(doc(db, 'views', v.id));
      await deleteDoc(doc(db, 'users', uid));
      await auth.currentUser.delete();
      navigate('/');
    } catch (err: any) {
      toast.error(language === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account');
    }
  };

  const getRoleBadge = () => {
    const role = user?.role;
    if (role === 'founder') return { label: language === 'ar' ? 'المؤسس' : 'Founder', bg: 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500', icon: <Crown size={12} />, glow: 'shadow-rose-500/30' };
    if (role === 'admin') return { label: language === 'ar' ? 'مدير' : 'Admin', bg: 'bg-gradient-to-r from-red-500 to-red-600', icon: <ShieldCheck size={12} />, glow: 'shadow-red-500/30' };
    if (role === 'moderator') return { label: language === 'ar' ? 'مشرف' : 'Moderator', bg: 'bg-gradient-to-r from-purple-500 to-violet-600', icon: <Shield size={12} />, glow: 'shadow-purple-500/30' };
    if (role === 'analyst') return { label: language === 'ar' ? 'محلل' : 'Analyst', bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', icon: <TrendingUp size={12} />, glow: 'shadow-amber-500/30' };
    if (role?.startsWith('staff')) return { label: language === 'ar' ? (role === 'staff_plus' ? 'طاقم+' : 'طاقم') : role === 'staff_plus' ? 'Staff+' : 'Staff', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', icon: <Award size={12} />, glow: 'shadow-emerald-500/30' };
    return { label: language === 'ar' ? 'عضو' : 'Member', bg: 'bg-white/10', icon: <CircleUserRound size={12} />, glow: '' };
  };

  if (!user) return null;

  const roleBadge = getRoleBadge();
  const earnedBadges = BADGES.filter(b => b.earned);

  return (
    <div className="max-w-7xl mx-auto pb-24 px-3 sm:px-4" dir={dir}>
      
      {/* Hero Banner */}
      <div className="relative rounded-xl overflow-hidden mb-6 group">
        <div className="h-44 sm:h-56 md:h-72 relative">
          <img 
            src={user.bannerUrl || BANNERS[0]} 
            className="w-full h-full object-cover" 
            alt="Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <button 
            onClick={() => setShowBannerModal(true)}
            className="absolute top-3 end-3 p-2 bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-lg text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <ImagePlus size={16} />
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div 
              className="relative group/avatar cursor-pointer shrink-0"
              onClick={() => setShowAvatarModal(true)}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl bg-neutral-900 border-2 border-black overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white bg-neutral-800">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-xl">
                <Camera size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -end-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black" />
            </div>

            <div className="flex-1 text-center sm:text-start min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate max-w-full">{user.name}</h1>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${roleBadge.bg}`}>
                  {roleBadge.icon}
                  {roleBadge.label}
                </div>
              </div>
              <p className="text-neutral-400 text-xs flex items-center justify-center sm:justify-start gap-1.5 truncate">
                <AtSign size={12} className="shrink-0 text-neutral-500" />
                {user.email}
              </p>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06]">
                  <Flame size={10} className="text-orange-400" />
                  <span className="text-[10px] font-bold text-white">{language === 'ar' ? 'مستوى' : 'LV'} {userLevel}</span>
                </div>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div style={{ width: `${xpProgress}%` }} className="h-full bg-orange-400 rounded-full transition-all" />
                </div>
                <span className="text-[10px] text-neutral-500">{xpProgress}%</span>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col gap-2 shrink-0">
              {(['founder', 'admin', 'staff', 'staff_plus', 'moderator', 'analyst'].includes(user.role || '') || user.email === 'me.rayq0001@gmail.com') && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="px-3 py-2 rounded-lg font-bold text-[10px] transition-colors border flex items-center gap-1.5 bg-white/[0.06] text-white border-white/[0.06] hover:bg-white hover:text-black"
                >
                  <Shield size={14} />
                  <span className="hidden sm:inline">{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg font-bold text-[10px] bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-colors flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{language === 'ar' ? 'خروج' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-4">

          {/* Stats Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/[0.04] rounded-lg">
                <TrendingUp size={14} className="text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{language === 'ar' ? 'إحصائياتك' : 'Your Stats'}</h3>
                <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'رحلة القراءة' : 'Reading Journey'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: <Heart size={16} className="fill-current" />, value: stats.favorites, label: language === 'ar' ? 'مفضلة' : 'Favorites', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { icon: <Eye size={16} />, value: stats.chaptersRead, label: language === 'ar' ? 'فصل مقروء' : 'Chapters Read', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: <MessageSquare size={16} />, value: stats.commentsCount, label: language === 'ar' ? 'تعليقات' : 'Comments', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
                  <div className="flex-1">
                    <span className="block text-lg font-bold text-white">{stat.value}</span>
                    <span className="text-[10px] text-neutral-500">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* XP Progress */}
            <div className="space-y-2 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-400" />
                  <span className="text-xs font-bold text-white">{language === 'ar' ? 'المستوى' : 'Level'} {userLevel}</span>
                </div>
                <span className="text-[10px] text-neutral-500">{userXP} XP</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                <div style={{ width: `${xpProgress}%` }} className="h-full bg-orange-400 rounded-full transition-all" />
              </div>
              <p className="text-[10px] text-neutral-600">{100 - xpProgress} XP {language === 'ar' ? 'للمستوى التالي' : 'to next level'}</p>
            </div>
          </div>

          {/* Badges Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/[0.04] rounded-lg">
                <Award size={14} className="text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{language === 'ar' ? 'الأوسمة' : 'Badges'}</h3>
                <p className="text-[10px] text-neutral-500">{earnedBadges.length}/{BADGES.length} {language === 'ar' ? 'مفتوحة' : 'unlocked'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {BADGES.map((badge) => (
                <button 
                  key={badge.id}
                  onClick={() => toast(badge.name, { description: badge.desc })}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 border transition-colors ${
                    badge.earned 
                      ? 'bg-gradient-to-br ' + badge.color + ' border-white/10 text-white cursor-pointer hover:opacity-90' 
                      : 'bg-white/[0.02] border-white/[0.04] text-neutral-700 cursor-not-allowed'
                  }`}
                >
                  <div className={badge.earned ? '' : 'opacity-30'}>{badge.icon}</div>
                  <span className="text-[8px] font-bold leading-tight text-center px-1">{badge.name}</span>
                  {!badge.earned && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={12} className="text-neutral-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Navigation Tabs */}
          <div className="bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] flex gap-1">
            {[
              { id: 'overview' as const, icon: <CircleUserRound size={14} />, label: language === 'ar' ? 'الملف الشخصي' : 'Profile' },
              { id: 'notifications' as const, icon: <Bell size={14} />, label: language === 'ar' ? 'التنبيهات' : 'Alerts' },
              { id: 'settings' as const, icon: <Settings size={14} />, label: language === 'ar' ? 'الإعدادات' : 'Settings' },
              { id: 'security' as const, icon: <Shield size={14} />, label: language === 'ar' ? 'الأمان' : 'Security' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-[10px] sm:text-xs transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white text-black' 
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'notifications' && notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 sm:p-6 min-h-[400px]">
            <AnimatePresence mode="wait">

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText size={16} className="text-neutral-500" />
                        {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Info'}
                      </h2>
                      <p className="text-[10px] text-neutral-500 mt-0.5 ps-6">{language === 'ar' ? 'كيف يراك الآخرون' : 'How others see you'}</p>
                    </div>
                    <button 
                      onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                      className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 ${
                        isEditing 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white/[0.04] text-neutral-400 hover:bg-white hover:text-black border border-white/[0.06]'
                      }`}
                    >
                      {isEditing ? <Check size={14} /> : <PenLine size={14} />}
                      {isEditing ? (language === 'ar' ? 'حفظ' : 'Save') : (language === 'ar' ? 'تعديل' : 'Edit')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                        <User size={10} />
                        {language === 'ar' ? 'الاسم' : 'Display Name'}
                      </label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                          className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.15] transition-colors placeholder:text-neutral-600"
                        />
                      ) : (
                        <div className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.04] rounded-lg text-white text-sm">{user.name}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                        <AtSign size={10} />
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <div className="px-3 py-2.5 bg-white/[0.02] border border-white/[0.03] rounded-lg text-neutral-500 text-sm">{user.email}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 ps-0.5">
                      <FileText size={10} />
                      {language === 'ar' ? 'النبذة التعريفية' : 'Bio'}
                    </label>
                    {isEditing ? (
                      <textarea 
                        value={editData.bio}
                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-3 text-neutral-300 text-sm leading-relaxed min-h-[120px] focus:outline-none focus:border-white/[0.15] transition-colors resize-none placeholder:text-neutral-600"
                      />
                    ) : (
                      <div className="px-3 py-3 bg-white/[0.03] border border-white/[0.04] rounded-lg min-h-[120px] text-neutral-400 text-sm leading-relaxed">
                        {user.bio || (language === 'ar' ? 'لا يوجد نبذة حالياً.' : 'No bio yet.')}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-white/[0.04]">
                    <p className="text-[10px] font-bold text-neutral-600 mb-3">{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { icon: <Camera size={14} />, label: language === 'ar' ? 'تغيير الصورة' : 'Change Avatar', action: () => setShowAvatarModal(true) },
                        { icon: <ImagePlus size={14} />, label: language === 'ar' ? 'تغيير الغلاف' : 'Change Banner', action: () => setShowBannerModal(true) },
                        { icon: <BookOpen size={14} />, label: language === 'ar' ? 'المكتبة' : 'Library', action: () => navigate('/library') },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className="flex items-center gap-2 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] rounded-lg transition-colors text-start"
                        >
                          <div className="text-neutral-500">{item.icon}</div>
                          <span className="text-xs text-neutral-300">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ NOTIFICATIONS TAB ═══ */}
              {activeTab === 'notifications' && (
                <motion.div 
                  key="notifications"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Bell size={16} className="text-neutral-500" />
                      {language === 'ar' ? 'التنبيهات' : 'Notifications'}
                    </h2>
                    {notifications.length > 0 && (
                      <button onClick={() => { setNotifications([]); if (user?.email) localStorage.removeItem(`notifications_${user.email}`); }} className="text-[10px] font-bold text-neutral-500 hover:text-red-400 transition-colors">
                        {language === 'ar' ? 'مسح الكل' : 'Clear All'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={n.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/[0.06]">
                          {n.fromUserAvatar ? (
                            <img src={n.fromUserAvatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white">{n.fromUserName?.charAt(0)}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-300 leading-snug">
                            <span className="text-white font-bold">{n.fromUserName}</span>{' '}
                            {n.type === 'like' ? (language === 'ar' ? 'أعجب بتعليقك' : 'liked your comment') : (language === 'ar' ? 'رد على تعليقك' : 'replied to your comment')}
                          </p>
                          <span className="text-[10px] text-neutral-600 mt-0.5 block">{new Date(n.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className={`p-1.5 rounded-md ${n.type === 'like' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {n.type === 'like' ? <Heart size={12} className="fill-current" /> : <MessageSquare size={12} />}
                        </div>
                      </div>
                    )) : (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-white/[0.03] rounded-xl flex items-center justify-center border border-white/[0.04]">
                          <Bell size={22} className="text-neutral-700" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-600">{language === 'ar' ? 'لا توجد تنبيهات' : 'No notifications yet'}</p>
                          <p className="text-[11px] text-neutral-700 mt-1">{language === 'ar' ? 'ستصلك التنبيهات عندما يتفاعل أحد مع تعليقاتك' : "You'll get notified when someone interacts with your comments"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ═══ SETTINGS TAB ═══ */}
              {activeTab === 'settings' && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Settings size={16} className="text-neutral-500" />
                    {t('theme_settings')}
                  </h2>

                  <div className="space-y-3">
                    {/* Theme Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><MonitorSmartphone size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{t('amoled_mode')}</span>
                          <span className="text-[10px] text-neutral-600">{language === 'ar' ? 'اختر مظهر الواجهة' : 'Choose interface appearance'}</span>
                        </div>
                      </div>
                      <div className="flex bg-black/50 p-0.5 rounded-lg border border-white/[0.06]">
                        <button onClick={() => toggleTheme('dark')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors ${theme === 'dark' ? 'bg-white text-black' : 'text-neutral-500'}`}>AMOLED</button>
                        <button onClick={() => toggleTheme('light')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors ${theme === 'light' ? 'bg-white text-black' : 'text-neutral-500'}`}>LIGHT</button>
                      </div>
                    </div>

                    {/* Accent Colors */}
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><Palette size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{t('accent_color')}</span>
                          <span className="text-[10px] text-neutral-600">{t('select_accent_color')}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {ACCENT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => handleAccentChange(color.value)}
                            className={`h-9 rounded-lg border-2 transition-colors flex items-center justify-center ${accentColor === color.value ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            style={{ backgroundColor: color.value }}
                          >
                            {accentColor === color.value && <Check size={14} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><Languages size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{t('language')}</span>
                          <span className="text-[10px] text-neutral-600">{language === 'ar' ? 'اختر لغة الواجهة' : 'Select interface language'}</span>
                        </div>
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="bg-black/50 border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-white/[0.15] transition-colors"
                      >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    {/* Fast Reading */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><Zap size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{language === 'ar' ? 'القراءة السريعة' : 'Fast Reading'}</span>
                          <span className="text-[10px] text-neutral-600">{language === 'ar' ? 'تحميل أسرع للفصول' : 'Faster chapter loading'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={toggleFastReading}
                        className={`w-10 h-5 rounded-full relative transition-colors ${fastReading ? 'bg-white' : 'bg-neutral-800'}`}
                      >
                        <motion.div animate={{ x: fastReading ? (dir === 'rtl' ? 2 : 20) : (dir === 'rtl' ? 20 : 2) }} className={`absolute top-0.5 w-4 h-4 rounded-full ${fastReading ? 'bg-black' : 'bg-neutral-500'} transition-colors`} />
                      </button>
                    </div>

                    {/* Private Profile */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><Lock size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{language === 'ar' ? 'حساب خاص' : 'Private Profile'}</span>
                          <span className="text-[10px] text-neutral-600">{language === 'ar' ? 'إخفاء المعلومات عن الزوار' : 'Hide info from visitors'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={togglePrivacy}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isPrivate ? 'bg-white' : 'bg-neutral-800'}`}
                      >
                        <motion.div animate={{ x: isPrivate ? (dir === 'rtl' ? 2 : 20) : (dir === 'rtl' ? 20 : 2) }} className={`absolute top-0.5 w-4 h-4 rounded-full ${isPrivate ? 'bg-black' : 'bg-neutral-500'} transition-colors`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ SECURITY TAB ═══ */}
              {activeTab === 'security' && (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-neutral-500" />
                    {language === 'ar' ? 'الأمان والخصوصية' : 'Security & Privacy'}
                  </h2>

                  <div className="space-y-3">
                    {/* Password Change */}
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><KeyRound size={14} className="text-neutral-400" /></div>
                        <div>
                          <span className="font-bold text-white text-sm block">{language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                          <span className="text-[10px] text-neutral-600">{language === 'ar' ? 'تأكد من استخدام كلمة مرور قوية' : 'Make sure to use a strong password'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="password" 
                          placeholder={language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-neutral-600" 
                        />
                        <input 
                          type="password" 
                          placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                          value={passwords.new}
                          onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                          className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-neutral-600" 
                        />
                      </div>
                      <button 
                        onClick={handleChangePassword} 
                        className="w-full py-2.5 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-xs"
                      >
                        {language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}
                      </button>
                    </div>

                    {/* Account Info */}
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/[0.04] rounded-lg"><Lock size={14} className="text-neutral-400" /></div>
                        <span className="font-bold text-white text-sm">{language === 'ar' ? 'معلومات الحساب' : 'Account Info'}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-xs text-neutral-500">{language === 'ar' ? 'طريقة الدخول' : 'Sign-in Method'}</span>
                          <span className="text-xs text-white font-bold">{user.provider || 'Email'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-xs text-neutral-500">{language === 'ar' ? 'البريد' : 'Email'}</span>
                          <span className="text-xs text-white font-bold">{user.email}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-neutral-500">{language === 'ar' ? 'الرتبة' : 'Role'}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${roleBadge.bg} text-white`}>{roleBadge.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="p-4 bg-red-500/[0.03] rounded-xl border border-red-500/10">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle size={14} className="text-red-500" /></div>
                          <div>
                            <span className="block font-bold text-red-400 text-sm">{language === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}</span>
                            <span className="text-[10px] text-neutral-500">{language === 'ar' ? 'حذف الحساب نهائياً' : 'Permanently delete your account'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowDeleteConfirm(true)} 
                          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-lg transition-colors text-xs border border-red-500/20 whitespace-nowrap"
                        >
                          {language === 'ar' ? 'حذف الحساب' : 'Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-black border border-white/[0.08] rounded-xl p-6 text-center space-y-5"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mx-auto">
                <Trash2 size={22} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">{language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{language === 'ar' ? 'سيتم حذف جميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء.' : 'All your data will be permanently deleted. This action cannot be undone.'}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleDeleteAccount} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm">
                  {language === 'ar' ? 'نعم، احذف حسابي' : 'Yes, delete my account'}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold rounded-lg transition-colors text-sm">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAvatarModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-black border border-white/[0.08] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera size={16} className="text-neutral-500" />
                  {language === 'ar' ? 'الصورة الرمزية' : 'Profile Picture'}
                </h3>
                <button onClick={() => setShowAvatarModal(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-500 transition-colors"><X size={16} /></button>
              </div>
              
              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/[0.1] rounded-lg hover:border-white/[0.2] hover:bg-white/[0.02] transition-colors cursor-pointer group mb-4">
                <Upload className="w-5 h-5 mb-1.5 text-neutral-500 group-hover:text-white transition-colors" />
                <p className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
                  {language === 'ar' ? 'ارفع صورة مخصصة' : 'Upload custom image'}
                </p>
                <p className="text-[9px] text-neutral-600 mt-0.5">JPG, PNG, GIF, WEBP — Max 50MB</p>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleCustomAvatarUpload} />
              </label>

              <div className="grid grid-cols-3 gap-2">
                {AVATARS.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectAvatar(url)}
                    className="aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-white/[0.2] transition-colors"
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Banner Modal */}
      <AnimatePresence>
        {showBannerModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBannerModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-black border border-white/[0.08] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-neutral-500" />
                  {language === 'ar' ? 'غلاف الصفحة' : 'Page Banner'}
                </h3>
                <button onClick={() => setShowBannerModal(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-500 transition-colors"><X size={16} /></button>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/[0.1] rounded-lg hover:border-white/[0.2] hover:bg-white/[0.02] transition-colors cursor-pointer group mb-4">
                <Upload className="w-5 h-5 mb-1.5 text-neutral-500 group-hover:text-white transition-colors" />
                <p className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
                  {language === 'ar' ? 'ارفع غلاف مخصص' : 'Upload custom banner'}
                </p>
                <p className="text-[9px] text-neutral-600 mt-0.5">JPG, PNG, GIF, WEBP — Max 50MB</p>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleCustomBannerUpload} />
              </label>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pe-1 no-scrollbar">
                {BANNERS.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectBanner(url)}
                    className="h-20 md:h-24 w-full rounded-lg overflow-hidden border border-white/[0.06] hover:border-white/[0.2] transition-colors"
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
