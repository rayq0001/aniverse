import React, { useState, useEffect } from 'react';
import { User, Heart, Clock, MessageSquare, Lock, ArrowLeft, AtSign, Crown, Shield, ShieldCheck, Award, TrendingUp, CircleUserRound, Flame, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import * as ReactRouterDOM from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType, onPresenceChange } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

const { useParams, useNavigate, Link } = ReactRouterDOM as any;

const UserProfile: React.FC = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ favorites: 0, chaptersRead: 0, commentsCount: 0 });
  const [comments, setComments] = useState<any[]>([]);
  const [favoriteManhwas, setFavoriteManhwas] = useState<any[]>([]);
  const [historyManhwas, setHistoryManhwas] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'history' | 'comments'>('overview');

  useEffect(() => {
    const loadProfile = async () => {
      if (!uid) return;
      if (auth.currentUser?.uid === uid) { navigate('/profile'); return; }

      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) { setLoading(false); return; }
        const data = userDoc.data();
        setProfileUser({ uid, ...data });

        if (!data.isPrivate) {
          // Load comments
          const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', uid)));
          setStats(prev => ({ ...prev, commentsCount: commentsSnap.size }));
          const recentComments = commentsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 20);
          setComments(recentComments);

          // Load favorites manhwas
          const favIds: string[] = data.favorites || [];
          setStats(prev => ({ ...prev, favorites: favIds.length }));
          if (favIds.length > 0) {
            const favDocs = await Promise.all(favIds.slice(0, 30).map(id => getDoc(doc(db, 'manhwas', id))));
            setFavoriteManhwas(favDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
          }

          // Load reading history manhwas
          const historyIds: string[] = data.readingHistory || [];
          setStats(prev => ({ ...prev, chaptersRead: historyIds.length }));
          if (historyIds.length > 0) {
            const histDocs = await Promise.all(historyIds.slice(0, 30).map(id => getDoc(doc(db, 'manhwas', id))));
            setHistoryManhwas(histDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
      setLoading(false);
    };
    loadProfile();
  }, [uid, navigate]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onPresenceChange(uid, setIsOnline);
    return () => unsub();
  }, [uid]);

  const getRoleBadge = (role?: string) => {
    if (role === 'founder') return { label: language === 'ar' ? 'المؤسس' : 'Founder', bg: 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500', icon: <Crown size={12} />, glow: 'shadow-rose-500/30' };
    if (role === 'admin') return { label: language === 'ar' ? 'مدير' : 'Admin', bg: 'bg-gradient-to-r from-red-500 to-red-600', icon: <ShieldCheck size={12} />, glow: 'shadow-red-500/30' };
    if (role === 'moderator') return { label: language === 'ar' ? 'مشرف' : 'Moderator', bg: 'bg-gradient-to-r from-purple-500 to-violet-600', icon: <Shield size={12} />, glow: 'shadow-purple-500/30' };
    if (role === 'analyst') return { label: language === 'ar' ? 'محلل' : 'Analyst', bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', icon: <TrendingUp size={12} />, glow: 'shadow-amber-500/30' };
    if (role?.startsWith('staff')) return { label: language === 'ar' ? (role === 'staff_plus' ? 'طاقم+' : 'طاقم') : role === 'staff_plus' ? 'Staff+' : 'Staff', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', icon: <Award size={12} />, glow: 'shadow-emerald-500/30' };
    return { label: language === 'ar' ? 'عضو' : 'Member', bg: 'bg-white/10', icon: <CircleUserRound size={12} />, glow: '' };
  };

  const ManhwaGrid: React.FC<{ items: any[]; emptyText: string }> = ({ items, emptyText }) => (
    items.length > 0 ? (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {items.map((m: any) => (
          <Link key={m.id} to={`/details/${m.id}`} className="group">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.04] group-hover:border-white/10 transition-all relative">
              <img src={m.coverImage} alt={language === 'en' ? m.titleEn || m.title : m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-8">
                <p className="text-[10px] sm:text-xs font-bold text-white line-clamp-2 leading-tight">{language === 'en' ? m.titleEn || m.title : m.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <div className="py-16 text-center space-y-3">
        <div className="w-14 h-14 mx-auto bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.04]">
          <BookOpen size={24} className="text-neutral-700" />
        </div>
        <p className="font-black text-neutral-600 text-sm">{emptyText}</p>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" dir={dir}>
        <User size={48} className="text-neutral-700" />
        <p className="text-neutral-500 font-black text-lg">{language === 'ar' ? 'المستخدم غير موجود' : 'User not found'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-black text-white transition-all">
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profileUser.role);
  const isPrivate = profileUser.isPrivate;
  const userXP = stats.chaptersRead * 10 + stats.commentsCount * 5;
  const userLevel = Math.floor(userXP / 100) + 1;

  const TABS = [
    { id: 'overview' as const, icon: <User size={14} />, label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
    { id: 'favorites' as const, icon: <Heart size={14} />, label: language === 'ar' ? 'المفضلة' : 'Favorites', count: stats.favorites },
    { id: 'history' as const, icon: <Clock size={14} />, label: language === 'ar' ? 'القراءات' : 'History', count: stats.chaptersRead },
    { id: 'comments' as const, icon: <MessageSquare size={14} />, label: language === 'ar' ? 'التعليقات' : 'Comments', count: stats.commentsCount },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24 px-3 sm:px-4" dir={dir}>
      
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all text-sm font-bold"
      >
        <ArrowLeft size={16} />
        {language === 'ar' ? 'رجوع' : 'Back'}
      </motion.button>

      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden mb-8"
      >
        <div className="h-48 sm:h-64 md:h-80 relative">
          <img 
            src={profileUser.bannerUrl || 'https://images.unsplash.com/photo-1614728263952-84ea206f25ab?auto=format&fit=crop&q=80&w=1200&h=400'} 
            className="w-full h-full object-cover" 
            alt="Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 md:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-xl bg-neutral-900 border-4 border-black shadow-2xl overflow-hidden">
                {profileUser.avatarUrl ? (
                  <img src={profileUser.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl md:text-6xl font-black text-white bg-gradient-to-br from-neutral-800 to-neutral-900">
                    {profileUser.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={`absolute -bottom-1 -end-1 w-6 h-6 rounded-full border-[3px] border-black ${isOnline ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-start min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight truncate max-w-full">
                  {profileUser.name}
                </h1>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-lg ${roleBadge.bg} ${roleBadge.glow}`}>
                  {roleBadge.icon}
                  {roleBadge.label}
                </div>
              </div>
              {!isPrivate && (
                <p className="text-neutral-400 text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start gap-2 truncate">
                  <AtSign size={14} className="shrink-0 text-neutral-500" />
                  {profileUser.email}
                </p>
              )}
              {!isPrivate && (
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <Flame size={12} className="text-orange-400" />
                    <span className="text-[10px] font-black text-white">{language === 'ar' ? 'مستوى' : 'LV'} {userLevel}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Private Profile Notice */}
      {isPrivate ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {profileUser.bio && (
            <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 sm:p-8 mb-6">
              <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <User size={16} className="text-neutral-500" />
                {language === 'ar' ? 'النبذة' : 'Bio'}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{profileUser.bio}</p>
            </div>
          )}
          <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-10 sm:p-16 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.06]">
              <Lock size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-black text-white">{language === 'ar' ? 'حساب خاص' : 'Private Profile'}</h3>
            <p className="text-sm text-neutral-500 font-medium max-w-md mx-auto">
              {language === 'ar' ? 'هذا الحساب خاص. لا يمكنك رؤية المزيد من المعلومات.' : 'This profile is private. You cannot view more information.'}
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 p-1 bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl mb-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-black' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeTab === tab.id ? 'bg-black/10' : 'bg-white/10'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                <div className="lg:col-span-4 space-y-4">
                  {/* Bio */}
                  <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 sm:p-8 space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2"><User size={16} className="text-neutral-500" />{language === 'ar' ? 'النبذة' : 'Bio'}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{profileUser.bio || (language === 'ar' ? 'لا يوجد نبذة حالياً.' : 'No bio yet.')}</p>
                  </div>
                  {/* Stats */}
                  <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 sm:p-8 space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2"><TrendingUp size={16} className="text-neutral-500" />{language === 'ar' ? 'الإحصائيات' : 'Stats'}</h3>
                    <div className="space-y-2">
                      {[
                        { icon: <Heart size={16} />, value: stats.favorites, label: language === 'ar' ? 'المفضلة' : 'Favorites', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                        { icon: <BookOpen size={16} />, value: stats.chaptersRead, label: language === 'ar' ? 'القراءات' : 'Read', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { icon: <MessageSquare size={16} />, value: stats.commentsCount, label: language === 'ar' ? 'التعليقات' : 'Comments', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                          <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
                          <div className="flex-1">
                            <span className="block text-lg font-black text-white">{s.value}</span>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{s.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Recent Favorites */}
                  {favoriteManhwas.length > 0 && (
                    <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-white flex items-center gap-2"><Heart size={16} className="text-rose-400" />{language === 'ar' ? 'المفضلة' : 'Favorites'}</h3>
                        {favoriteManhwas.length > 5 && (
                          <button onClick={() => setActiveTab('favorites')} className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors">{language === 'ar' ? 'عرض الكل' : 'View All'}</button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {favoriteManhwas.slice(0, 5).map((m: any) => (
                          <Link key={m.id} to={`/details/${m.id}`} className="group">
                            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.04] group-hover:border-white/10 transition-all">
                              <img src={m.coverImage} alt={language === 'en' ? m.titleEn || m.title : m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <p className="text-[9px] font-bold text-neutral-400 mt-1 line-clamp-1">{language === 'en' ? m.titleEn || m.title : m.title}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Comments */}
                  <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-white flex items-center gap-2"><MessageSquare size={16} className="text-emerald-400" />{language === 'ar' ? 'آخر التعليقات' : 'Recent Comments'}</h3>
                      {comments.length > 3 && (
                        <button onClick={() => setActiveTab('comments')} className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors">{language === 'ar' ? 'عرض الكل' : 'View All'}</button>
                      )}
                    </div>
                    {comments.length > 0 ? (
                      <div className="space-y-2">
                        {comments.slice(0, 3).map((c: any) => (
                          <div key={c.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/10 transition-all cursor-pointer" onClick={() => c.manhwaId && navigate(`/details/${c.manhwaId}`)}>
                            <p className="text-xs text-neutral-300 font-medium line-clamp-2">{c.content}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-neutral-600 font-bold">{c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
                              <span className="text-[9px] text-neutral-500 font-bold">👍 {c.likes || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-600 font-bold text-center py-8">{language === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-5"><Heart size={18} className="text-rose-400" />{language === 'ar' ? 'المفضلة' : 'Favorites'}</h2>
                <ManhwaGrid items={favoriteManhwas} emptyText={language === 'ar' ? 'لا توجد مفضلات بعد' : 'No favorites yet'} />
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-5"><Clock size={18} className="text-blue-400" />{language === 'ar' ? 'سجل القراءة' : 'Reading History'}</h2>
                <ManhwaGrid items={historyManhwas} emptyText={language === 'ar' ? 'لا يوجد سجل قراءة بعد' : 'No reading history yet'} />
              </motion.div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-5"><MessageSquare size={18} className="text-emerald-400" />{language === 'ar' ? 'التعليقات' : 'Comments'} <span className="text-xs text-neutral-500 font-bold">({stats.commentsCount})</span></h2>
                {comments.length > 0 ? (
                  <div className="space-y-2">
                    {comments.map((c: any, i: number) => (
                      <motion.div 
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer"
                        onClick={() => c.manhwaId && navigate(`/details/${c.manhwaId}`)}
                      >
                        <p className="text-sm text-neutral-300 font-medium leading-relaxed line-clamp-3">{c.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-neutral-600 font-bold">{c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
                          <span className="text-[10px] text-neutral-500 font-bold">👍 {c.likes || 0}</span>
                          <span className="text-[10px] text-neutral-500 font-bold">👎 {c.dislikes || 0}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-14 h-14 mx-auto bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.04]"><MessageSquare size={24} className="text-neutral-700" /></div>
                    <p className="font-black text-neutral-600 text-sm">{language === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default UserProfile;
