
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageSquare, AlertTriangle, UserCheck, 
  Trash2, Shield, Search, Bell, Globe, 
  CheckCircle, Pin, Calendar, 
  ChevronRight, Save, 
  Download, Cpu, Terminal, Zap, Eraser, 
  FileText, Upload, Ban, XCircle, 
  Settings, Menu, X, LayoutDashboard, TrendingUp,
  ShieldAlert, Filter, Lock, BookOpen, Plus, Image, Edit3, Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  collection, query, getDocs, orderBy, 
  updateDoc, doc, where, limit, deleteDoc,
  onSnapshot, serverTimestamp, getDoc, setDoc, addDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const DAYS = [
  { id: 'mon', label: { ar: 'الإثنين', en: 'Monday' } },
  { id: 'tue', label: { ar: 'الثلاثاء', en: 'Tuesday' } },
  { id: 'wed', label: { ar: 'الأربعاء', en: 'Wednesday' } },
  { id: 'thu', label: { ar: 'الخميس', en: 'Thursday' } },
  { id: 'fri', label: { ar: 'الجمعة', en: 'Friday' } },
  { id: 'sat', label: { ar: 'السبت', en: 'Saturday' } },
  { id: 'sun', label: { ar: 'الأحد', en: 'Sunday' } }
];

const AdminDashboard: React.FC = () => {
  const { language, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'schedule' | 'users' | 'comments' | 'reports' | 'settings' | 'automation' | 'manhwas'>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [manhwasList, setManhwasList] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [growthData, setGrowthData] = useState<any[]>([]);

  // Automation Hub States
  const [automationUrl, setAutomationUrl] = useState('');
  const [automationSeriesId, setAutomationSeriesId] = useState('');
  const [automationStartChapter, setAutomationStartChapter] = useState('');
  const [automationEndChapter, setAutomationEndChapter] = useState('');
  const [manhwaName, setManhwaName] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [selectedSource, setSelectedSource] = useState<'Naver' | 'Kakao' | 'AIO'>('Naver');
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [automationLogs]);

  // Staff Publisher State
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [staffDriveLink, setStaffDriveLink] = useState('');
  const [automationReadiness, setAutomationReadiness] = useState<{
    loading: boolean;
    ready: boolean;
    detectReason: string;
    translateReason: string;
  }>({
    loading: false,
    ready: true,
    detectReason: '',
    translateReason: '',
  });
  // Manhwa Management State
  const [anilistSearch, setAnilistSearch] = useState('');
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [anilistData, setAnilistData] = useState<any>(null);
  const [manhwaForm, setManhwaForm] = useState<any>(null);
  const [editingManhwa, setEditingManhwa] = useState<any>(null);
  const [manhwaChapters, setManhwaChapters] = useState<any[]>([]);
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [savingManhwa, setSavingManhwa] = useState(false);
  const [manhwaView, setManhwaView] = useState<'list' | 'add' | 'edit'>('list');
  const [manhwaSearchQuery, setManhwaSearchQuery] = useState('');
  
  // Quick Chapter Upload State
  const [quickUploadModal, setQuickUploadModal] = useState<{ manhwaId: string; manhwaTitle: string } | null>(null);
  const [quickUploadChapterNum, setQuickUploadChapterNum] = useState('');
  const [quickUploadChapterTitle, setQuickUploadChapterTitle] = useState('');
  const [quickUploadDriveLink, setQuickUploadDriveLink] = useState('');
  const [quickUploadFiles, setQuickUploadFiles] = useState<File[]>([]);
  const [quickUploadUploading, setQuickUploadUploading] = useState(false);
  const quickUploadFolderRef = useRef<HTMLInputElement>(null);
  const quickUploadFileRef = useRef<HTMLInputElement>(null);

  // Bulk Download State
  const [bulkDownloadSource, setBulkDownloadSource] = useState<'Naver' | 'Kakao'>('Naver');
  const [bulkDownloadContentId, setBulkDownloadContentId] = useState('');
  const [bulkDownloadStart, setBulkDownloadStart] = useState('');
  const [bulkDownloadEnd, setBulkDownloadEnd] = useState('');
  const [bulkDownloadTaskId, setBulkDownloadTaskId] = useState<string | null>(null);
  const [bulkDownloadRunning, setBulkDownloadRunning] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);
  const [bulkDownloadLogs, setBulkDownloadLogs] = useState<string[]>([]);
  const bulkLogRef = useRef<HTMLDivElement>(null);

  // Bulk Upload State (multi-chapter upload with files/drive links)
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [bulkUploadChapters, setBulkUploadChapters] = useState<{ num: string; title: string; driveLink: string; files: File[] }[]>([{ num: '', title: '', driveLink: '', files: [] }]);
  const [bulkUploadUploading, setBulkUploadUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0 });

  // Chapter editing state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterFiles, setEditChapterFiles] = useState<File[]>([]);
  const [editChapterDriveLink, setEditChapterDriveLink] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const editChapterFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bulkLogRef.current) {
      bulkLogRef.current.scrollTop = bulkLogRef.current.scrollHeight;
    }
  }, [bulkDownloadLogs]);

  const searchAnilist = async () => {
    if (!anilistSearch.trim()) return;
    setAnilistLoading(true);
    setAnilistData(null);
    
    // Show loading toast with translation status
    const loadingToastId = toast.loading(
      language === 'ar' ? 'جاري البحث والترجمة في AniList...' : 'Searching and translating from AniList...'
    );
    
    try {
      const res = await fetch('/api/anilist/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: anilistSearch.trim() })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.dismiss(loadingToastId);
        toast.success(
          language === 'ar' 
            ? `✓ تمت ترجمة المعلومات بنجاح` 
            : '✓ Information translated successfully'
        );
        
        setAnilistData(data);
        setManhwaForm({
          title: data.title || '',
          titleEn: data.title || '',
          originalTitle: data.titleOriginal || '',
          description: data.descriptionAr || '',
          descriptionEn: data.descriptionEn || '',
          author: data.author || '',
          artist: data.artist || '',
          coverImage: data.coverImage || '',
          bannerImage: data.bannerImage || data.coverImage || '',
          releaseDate: data.releaseDate || '',
          status: data.status || 'ongoing',
          genres: data.genresAr || [],
          genresEn: data.genresEn || [],
          publisher: '',
          releaseSchedule: [] as string[],
          staffIds: [] as string[],
          anilistId: data.anilistId || 0,
          rating: 0,
        });
      } else {
        toast.dismiss(loadingToastId);
        toast.error(data.error || 'Not found');
      }
    } catch (err) {
      toast.dismiss(loadingToastId);
      toast.error(
        language === 'ar' 
          ? 'فشل البحث والترجمة في AniList' 
          : 'Failed to search and translate from AniList'
      );
    }
    setAnilistLoading(false);
  };

  const saveManhwa = async () => {
    if (!manhwaForm) return;
    setSavingManhwa(true);
    try {
      if (editingManhwa) {
        await updateDoc(doc(db, 'manhwas', editingManhwa.id), {
          ...manhwaForm,
          updatedAt: serverTimestamp(),
        });
        toast.success(language === 'ar' ? 'تم تحديث المانهوا' : 'Manhwa updated');
      } else {
        await addDoc(collection(db, 'manhwas'), {
          ...manhwaForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          chapters: [],
        });
        toast.success(language === 'ar' ? 'تمت إضافة المانهوا' : 'Manhwa added');
      }
      setManhwaView('list');
      setManhwaForm(null);
      setAnilistData(null);
      setAnilistSearch('');
      setEditingManhwa(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'manhwas');
    }
    setSavingManhwa(false);
  };

  const startEditManhwa = async (manhwa: any) => {
    setEditingManhwa(manhwa);
    setManhwaForm({
      title: manhwa.title || '',
      titleEn: manhwa.titleEn || '',
      originalTitle: manhwa.originalTitle || '',
      description: manhwa.description || '',
      descriptionEn: manhwa.descriptionEn || '',
      author: manhwa.author || '',
      artist: manhwa.artist || '',
      coverImage: manhwa.coverImage || '',
      bannerImage: manhwa.bannerImage || '',
      releaseDate: manhwa.releaseDate || '',
      status: manhwa.status || 'ongoing',
      genres: manhwa.genres || [],
      publisher: manhwa.publisher || '',
      releaseSchedule: manhwa.releaseSchedule || [],
      staffIds: manhwa.staffIds || [],
      anilistId: manhwa.anilistId || 0,
      rating: manhwa.rating || 0,
    });
    // Load chapters
    try {
      const chapSnap = await getDocs(query(collection(db, 'manhwas', manhwa.id, 'chapters'), orderBy('number', 'asc')));
      setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setManhwaChapters([]);
    }
    setManhwaView('edit');
  };

  const addChapter = async () => {
    if (!editingManhwa || !newChapterNumber) return;
    try {
      await addDoc(collection(db, 'manhwas', editingManhwa.id, 'chapters'), {
        number: parseInt(newChapterNumber),
        title: newChapterTitle || `الفصل ${newChapterNumber}`,
        releaseDate: new Date().toISOString(),
        pages: [],
        createdAt: serverTimestamp(),
      });
      toast.success(language === 'ar' ? 'تمت إضافة الفصل' : 'Chapter added');
      setNewChapterNumber('');
      setNewChapterTitle('');
      // Refresh chapters
      const chapSnap = await getDocs(query(collection(db, 'manhwas', editingManhwa.id, 'chapters'), orderBy('number', 'asc')));
      setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `manhwas/${editingManhwa.id}/chapters`);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!editingManhwa) return;
    try {
      await deleteDoc(doc(db, 'manhwas', editingManhwa.id, 'chapters', chapterId));
      setManhwaChapters(prev => prev.filter(c => c.id !== chapterId));
      toast.success(language === 'ar' ? 'تم حذف الفصل' : 'Chapter deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `manhwas/${editingManhwa.id}/chapters/${chapterId}`);
    }
  };

  const handleQuickUpload = async () => {
    if (!quickUploadModal || !quickUploadChapterNum) return;
    if (quickUploadFiles.length === 0 && !quickUploadDriveLink) {
      toast.error(language === 'ar' ? 'يرجى إرفاق ملفات أو رابط درايف' : 'Please attach files or a Drive link');
      return;
    }
    setQuickUploadUploading(true);
    const toastId = toast.loading(language === 'ar' ? 'جاري رفع الفصل...' : 'Uploading chapter...');

    try {
      const formData = new FormData();
      formData.append('manhwaId', quickUploadModal.manhwaId);
      formData.append('chapterNumber', quickUploadChapterNum);
      if (quickUploadChapterTitle) formData.append('chapterTitle', quickUploadChapterTitle);
      
      if (quickUploadDriveLink) {
        formData.append('driveLink', quickUploadDriveLink);
      } else if (quickUploadFiles.length === 1 && quickUploadFiles[0].name.match(/\.(zip|rar|7z)$/i)) {
        // Single ZIP file
        formData.append('zipFile', quickUploadFiles[0]);
      } else {
        // Multiple image files - send each
        for (const file of quickUploadFiles) {
          formData.append('imageFiles', file);
        }
      }

      const response = await fetch('/api/automation/quick-chapter-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        toast.dismiss(toastId);
        toast.success(language === 'ar' ? `تم رفع الفصل ${quickUploadChapterNum} بنجاح!` : `Chapter ${quickUploadChapterNum} uploaded successfully!`);
        setQuickUploadModal(null);
        setQuickUploadChapterNum('');
        setQuickUploadChapterTitle('');
        setQuickUploadDriveLink('');
        setQuickUploadFiles([]);
      } else {
        toast.dismiss(toastId);
        toast.error(data.error || (language === 'ar' ? 'حدث خطأ أثناء الرفع' : 'Upload failed'));
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setQuickUploadUploading(false);
    }
  };

  const handleQuickUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setQuickUploadFiles(prev => [...prev, ...files]);
  };

  // Bulk upload handler (multiple chapters at once)
  const handleBulkUpload = async () => {
    if (!editingManhwa) return;
    const validChapters = bulkUploadChapters.filter(c => c.num && (c.files.length > 0 || c.driveLink));
    if (validChapters.length === 0) {
      toast.error(language === 'ar' ? 'أضف فصول مع ملفات أو روابط درايف' : 'Add chapters with files or Drive links');
      return;
    }
    setBulkUploadUploading(true);
    setBulkUploadProgress({ current: 0, total: validChapters.length });
    let successCount = 0;
    for (let i = 0; i < validChapters.length; i++) {
      const ch = validChapters[i];
      setBulkUploadProgress({ current: i + 1, total: validChapters.length });
      try {
        const formData = new FormData();
        formData.append('manhwaId', editingManhwa.id);
        formData.append('chapterNumber', ch.num);
        if (ch.title) formData.append('chapterTitle', ch.title);
        if (ch.driveLink) {
          formData.append('driveLink', ch.driveLink);
        } else if (ch.files.length === 1 && ch.files[0].name.match(/\.(zip|rar|7z)$/i)) {
          formData.append('zipFile', ch.files[0]);
        } else {
          for (const file of ch.files) formData.append('imageFiles', file);
        }
        const res = await fetch('/api/automation/quick-chapter-upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) successCount++;
      } catch {}
    }
    setBulkUploadUploading(false);
    if (successCount === validChapters.length) {
      toast.success(language === 'ar' ? `تم رفع ${successCount} فصل بنجاح!` : `${successCount} chapters uploaded successfully!`);
    } else {
      toast.success(language === 'ar' ? `تم رفع ${successCount}/${validChapters.length} فصل` : `${successCount}/${validChapters.length} chapters uploaded`);
    }
    setBulkUploadModal(false);
    setBulkUploadChapters([{ num: '', title: '', driveLink: '', files: [] }]);
    // Refresh chapters
    if (editingManhwa) {
      const chapSnap = await getDocs(query(collection(db, 'manhwas', editingManhwa.id, 'chapters'), orderBy('number', 'asc')));
      setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
  };

  // Save chapter edits (title / replace files)
  const saveChapterEdit = async (ch: any) => {
    if (!editingManhwa) return;
    setSavingChapter(true);
    try {
      const updates: any = {};
      if (editChapterTitle && editChapterTitle !== (ch.title || '')) updates.title = editChapterTitle;

      // If new files or drive link provided, re-upload
      if (editChapterFiles.length > 0 || editChapterDriveLink) {
        const formData = new FormData();
        formData.append('manhwaId', editingManhwa.id);
        formData.append('chapterNumber', String(ch.number));
        if (editChapterTitle) formData.append('chapterTitle', editChapterTitle);
        if (editChapterDriveLink) {
          formData.append('driveLink', editChapterDriveLink);
        } else if (editChapterFiles.length === 1 && editChapterFiles[0].name.match(/\.(zip|rar|7z)$/i)) {
          formData.append('zipFile', editChapterFiles[0]);
        } else {
          for (const file of editChapterFiles) formData.append('imageFiles', file);
        }
        const res = await fetch('/api/automation/quick-chapter-upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success(language === 'ar' ? 'تم تحديث الفصل بنجاح' : 'Chapter updated successfully');
      } else if (Object.keys(updates).length > 0) {
        // Only title update
        await updateDoc(doc(db, 'manhwas', editingManhwa.id, 'chapters', ch.id), updates);
        toast.success(language === 'ar' ? 'تم تحديث العنوان' : 'Title updated');
      }

      setEditingChapterId(null);
      setEditChapterTitle('');
      setEditChapterFiles([]);
      setEditChapterDriveLink('');
      // Refresh
      const chapSnap = await getDocs(query(collection(db, 'manhwas', editingManhwa.id, 'chapters'), orderBy('number', 'asc')));
      setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      toast.error(err.message || (language === 'ar' ? 'فشل التحديث' : 'Update failed'));
    } finally {
      setSavingChapter(false);
    }
  };

  const startBulkDownload = async () => {
    if (!editingManhwa || !bulkDownloadContentId || !bulkDownloadStart || !bulkDownloadEnd) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    const start = parseInt(bulkDownloadStart);
    const end = parseInt(bulkDownloadEnd);
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      toast.error(language === 'ar' ? 'نطاق الفصول غير صالح' : 'Invalid chapter range');
      return;
    }

    setBulkDownloadRunning(true);
    setBulkDownloadProgress(0);
    setBulkDownloadLogs([`[SYSTEM]: بدء تنزيل ${end - start + 1} فصل...`]);

    try {
      const res = await fetch('/api/automation/bulk-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: bulkDownloadSource,
          contentId: bulkDownloadContentId,
          startChapter: bulkDownloadStart,
          endChapter: bulkDownloadEnd,
          manhwaId: editingManhwa.id,
        }),
      });
      const data = await res.json();
      if (data.taskId) {
        setBulkDownloadTaskId(data.taskId);
      } else {
        toast.error(data.error || 'Failed');
        setBulkDownloadRunning(false);
      }
    } catch {
      toast.error(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
      setBulkDownloadRunning(false);
    }
  };

  // Poll bulk download progress
  useEffect(() => {
    if (!bulkDownloadRunning || !bulkDownloadTaskId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/automation/tasks');
        const data = await res.json();
        const task = data.tasks.find((t: any) => t.id === bulkDownloadTaskId);
        if (task) {
          setBulkDownloadLogs(task.logs);
          setBulkDownloadProgress(task.progress || 0);
          if (task.status !== 'running' && task.status !== 'pending') {
            setBulkDownloadRunning(false);
            if (task.status === 'completed') {
              toast.success(language === 'ar' ? 'تم تنزيل جميع الفصول بنجاح!' : 'All chapters downloaded successfully!');
              // Refresh chapters list
              if (editingManhwa) {
                const chapSnap = await getDocs(query(collection(db, 'manhwas', editingManhwa.id, 'chapters'), orderBy('number', 'asc')));
                setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
              }
            }
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [bulkDownloadRunning, bulkDownloadTaskId]);

  // Stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalComments: number;
    pendingReports: number;
    newUsersToday: number;
    totalManhwas?: number;
    totalChapters?: number;
    totalViews?: number;
    mostViewed?: any[];
  }>({
    totalUsers: 0,
    totalComments: 0,
    pendingReports: 0,
    newUsersToday: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUser(userData);
            const allowedRoles = ['admin', 'staff', 'staff_plus', 'moderator', 'analyst'];
            setIsAdmin(allowedRoles.includes(userData.role) || user.email === 'alitabash0@gmail.com');
          } else {
            // User document might not exist yet if they just signed up
            setIsAdmin(user.email === 'alitabash0@gmail.com');
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch Stats
    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(allUsers);
      setStats(prev => ({ ...prev, totalUsers: snap.size }));

      // Calculate real growth data for the last 7 days
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });

      const growth = last7Days.map(date => {
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const usersCount = allUsers.filter((u: any) => {
          if (!u.createdAt) return false;
          const uDate = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
          return uDate.getDate() === date.getDate() && uDate.getMonth() === date.getMonth() && uDate.getFullYear() === date.getFullYear();
        }).length;
        return { name: dayStr, users: usersCount };
      });
      setGrowthData(growth);
    }, (err) => {
      console.error("Firestore users error:", err);
      toast.error(language === 'ar' ? 'فشل تحميل المستخدمين: صلاحيات غير كافية' : 'Failed to load users: Insufficient permissions');
    });

    // Update manhwasUnsub to also fetch chapters
    const manhwasUnsub = onSnapshot(collection(db, 'manhwas'), async (snap) => {
      const manhwas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManhwasList(manhwas);
      let totalViews = 0;
      const manhwasWithViews = await Promise.all(manhwas.map(async (m) => {
        const chaptersSnap = await getDocs(collection(db, 'manhwas', m.id, 'chapters'));
        const views = chaptersSnap.docs.reduce((acc, ch) => acc + (ch.data().views || 0), 0);
        totalViews += views;
        return { ...m, views };
      }));
      
      const totalChapters = (await Promise.all(manhwas.map(async (m) => (await getDocs(collection(db, 'manhwas', m.id, 'chapters'))).size))).reduce((acc, count) => acc + count, 0);
      
      setStats(prev => ({ 
        ...prev, 
        totalManhwas: snap.size,
        totalChapters,
        totalViews,
        mostViewed: manhwasWithViews.sort((a, b) => b.views - a.views).slice(0, 5)
      }));
    }, (err) => {
      console.error("Firestore manhwas error:", err);
      toast.error(language === 'ar' ? 'فشل تحميل المانهوا: صلاحيات غير كافية' : 'Failed to load manhwas: Insufficient permissions');
    });

    const commentsUnsub = onSnapshot(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setStats(prev => ({ ...prev, totalComments: snap.size }));
    }, (err) => {
      console.error("Firestore comments error:", err);
      toast.error(language === 'ar' ? 'فشل تحميل التعليقات: صلاحيات غير كافية' : 'Failed to load comments: Insufficient permissions');
    });

    const reportsUnsub = onSnapshot(query(collection(db, 'reports'), where('status', '==', 'pending')), (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setStats(prev => ({ ...prev, pendingReports: snap.size }));
    }, (err) => {
      console.error("Firestore reports error:", err);
      toast.error(language === 'ar' ? 'فشل تحميل البلاغات: صلاحيات غير كافية' : 'Failed to load reports: Insufficient permissions');
    });

    const settingsUnsub = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSiteSettings(doc.data());
      }
    }, (err) => {
      console.error("Firestore settings error:", err);
      toast.error(language === 'ar' ? 'فشل تحميل الإعدادات: صلاحيات غير كافية' : 'Failed to load settings: Insufficient permissions');
    });

    return () => {
      usersUnsub();
      manhwasUnsub();
      commentsUnsub();
      reportsUnsub();
      settingsUnsub();
    };
  }, [isAdmin]);

  const fetchUserAnalytics = async (user: any) => {
    setSelectedUser(user);
    const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', user.id)));
    const viewsSnap = await getDocs(query(collection(db, 'views'), where('userId', '==', user.id)));
    
    // Get unique manhwas and chapters viewed by user
    const viewedManhwas = new Set();
    const viewedChapters = new Set();
    viewsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.manhwaId) viewedManhwas.add(data.manhwaId);
      if (data.chapterId) viewedChapters.add(data.chapterId);
    });

    setUserAnalytics({
      commentsCount: commentsSnap.size,
      viewsCount: viewsSnap.size,
      manhwasCount: viewedManhwas.size,
      chaptersCount: viewedChapters.size,
      recentComments: commentsSnap.docs.slice(0, 5).map(d => d.data())
    });
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !isBanned });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'manhwa' | 'comment' | 'user', id: string } | null>(null);

  const handlePinComment = async (id: string, isPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'comments', id), { isPinned });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const handleDeleteManhwa = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'manhwas', id));
      // Also delete chapters
      const chaptersSnap = await getDocs(collection(db, 'manhwas', id, 'chapters'));
      for (const chapterDoc of chaptersSnap.docs) {
        await deleteDoc(doc(db, 'manhwas', id, 'chapters', chapterDoc.id));
      }
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `manhwas/${id}`);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const roles = ['user', 'staff', 'staff_plus', 'moderator', 'analyst', 'admin'];
    const currentIndex = roles.indexOf(currentRole);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    try {
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      await updateDoc(doc(db, 'comments', commentId), { isApproved: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete user comments
      const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', userId)));
      for (const c of commentsSnap.docs) await deleteDoc(doc(db, 'comments', c.id));
      // Delete user views
      const viewsSnap = await getDocs(query(collection(db, 'views'), where('userId', '==', userId)));
      for (const v of viewsSnap.docs) await deleteDoc(doc(db, 'views', v.id));
      // Delete Firestore user doc
      await deleteDoc(doc(db, 'users', userId));
      // Delete Firebase Auth user via server
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      toast.success(language === 'ar' ? 'تم حذف المستخدم' : 'User deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'ban' | 'delete') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { 
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: currentUser.uid,
        actionTaken: action
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'settings', 'site'), siteSettings);
      toast.success(language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/site');
    }
  };

  const startStaffPublishing = async () => {
    if (!manhwaName || !chapterNumber) {
      toast.error(language === 'ar' ? 'يرجى كتابة اسم المانهوا ورقم الفصل بالأعلى' : 'Please provide Manhwa Name and Chapter above.');
      return;
    }
    if (!staffFile && !staffDriveLink) {
      toast.error(language === 'ar' ? 'يرجى إرفاق ملف ZIP أو رابط درايف' : 'Please attach a ZIP file or Drive Link.');
      return;
    }

    setIsAutomationRunning(true);
    setAutomationLogs([]);
    setProgress(0);

    const formData = new FormData();
    formData.append('manhwaId', manhwaName);
    formData.append('chapterNumber', chapterNumber);
    if (staffDriveLink) formData.append('driveLink', staffDriveLink);
    if (staffFile) formData.append('zipFile', staffFile);

    try {
      const response = await fetch('/api/automation/staff-publish', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.taskId) {
        setCurrentTaskId(data.taskId);
      } else {
        toast.error("Error initiating staff publish.");
        setIsAutomationRunning(false);
      }
    } catch (err) {
      setIsAutomationRunning(false);
      toast.error("Server error during staff publish.");
    }
  };

  const startAutomation = async (type: 'scrape' | 'ai') => {
    const isRangeScraper = selectedSource === 'Naver' || selectedSource === 'Kakao';

    if (type === 'ai' && !automationReadiness.ready) {
      toast.error(
        language === 'ar'
          ? 'أدوات التبييض/الترجمة غير جاهزة. راجع حالة الأدوات في بطاقة AI.'
          : 'AI tools are not ready. Check readiness details in the AI card.'
      );
      return;
    }

    if (type === 'scrape') {
      const isMissingRangeInput = !automationSeriesId || !automationStartChapter || !automationEndChapter;
      const isMissingUrlInput = !automationUrl;

      if ((isRangeScraper && isMissingRangeInput) || (!isRangeScraper && isMissingUrlInput)) {
        toast.error(
          language === 'ar'
            ? isRangeScraper
              ? 'يرجى إدخال المعرف ورقم الفصل الأول والأخير.'
              : 'يرجى إدخال رابط المانهوا.'
            : isRangeScraper
              ? 'Please provide the series ID, first chapter, and last chapter.'
              : 'Please provide the manhwa URL.'
        );
        return;
      }
    }

    setIsAutomationRunning(true);
    setAutomationLogs(prev => [...prev, `[SYSTEM]: Initiating ${type} sequence...`]);
    
    try {
      const response = await fetch('/api/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          url: isRangeScraper ? '' : automationUrl,
          contentId: isRangeScraper ? automationSeriesId : '',
          startChapter: isRangeScraper ? automationStartChapter : '',
          endChapter: isRangeScraper ? automationEndChapter : '',
          source: selectedSource,
          name: manhwaName,
          chapter: chapterNumber
        })
      });
      const data = await response.json();
      if (data.taskId) {
        setCurrentTaskId(data.taskId);
      }
    } catch (err) {
      console.error("Failed to start automation:", err);
      setIsAutomationRunning(false);
      setAutomationLogs(prev => [...prev, `[ERROR]: Failed to connect to server.`]);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isAutomationRunning) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/automation/tasks');
          const data = await response.json();
          const currentTask = data.tasks.find((t: any) => t.id === currentTaskId);
          
          if (currentTask) {
            setAutomationLogs(currentTask.logs);
            setProgress(currentTask.progress || 0);
            if (currentTask.status !== 'running' && currentTask.status !== 'pending') {
              setIsAutomationRunning(false);
              if (currentTask.status === 'completed' && currentTask.images?.length) {
                setScrapedImages(currentTask.images);
                setScrapedChapterLabel(currentTask.chapterLabel || '');
              }
            }
          }
        } catch (err) {
          console.error("Error polling logs:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAutomationRunning, currentTaskId]);

  useEffect(() => {
    if (activeTab !== 'automation') return;

    const fetchReadiness = async () => {
      try {
        setAutomationReadiness(prev => ({ ...prev, loading: true }));
        const response = await fetch('/api/automation/readiness');
        const data = await response.json();
        setAutomationReadiness({
          loading: false,
          ready: !!data.ready,
          detectReason: data.detect?.reason || '',
          translateReason: data.translate?.reason || '',
        });
      } catch (err) {
        setAutomationReadiness({
          loading: false,
          ready: false,
          detectReason: 'Readiness API error',
          translateReason: 'Readiness API error',
        });
      }
    };

    fetchReadiness();
  }, [activeTab]);

  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [scrapedChapterLabel, setScrapedChapterLabel] = useState('');
  const [activeAutomationSection, setActiveAutomationSection] = useState<'scraper' | 'ai' | 'staff'>('scraper');

  const isRangeScraper = selectedSource === 'Naver' || selectedSource === 'Kakao';
  const isScrapeActionDisabled = isAutomationRunning || (isRangeScraper
    ? !automationSeriesId || !automationStartChapter || !automationEndChapter
    : !automationUrl);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-8 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6" />
        <h1 className="text-3xl font-black mb-4">{language === 'ar' ? 'غير مصرح لك' : 'Unauthorized Access'}</h1>
        <p className="text-neutral-500 max-w-md">{language === 'ar' ? 'هذه الصفحة مخصصة للمشرفين فقط. يرجى العودة إلى الصفحة الرئيسية.' : 'This page is for administrators only. Please return to the home page.'}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-8 py-3 bg-white text-black font-black rounded-2xl">{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col md:flex-row" dir={dir}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#050505] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
            <Shield size={18} />
          </div>
          <h2 className="font-black text-lg tracking-tight">Admin</h2>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/5 rounded-xl text-white"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar / Drawer */}
      <AnimatePresence>
        {(isMobileMenuOpen || windowWidth >= 768) && (
          <motion.aside 
            initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:sticky top-0 h-screen z-40 w-72 bg-[#050505] border-r border-white/5 p-6 space-y-8 overflow-y-auto no-scrollbar shadow-2xl shadow-black md:shadow-none"
          >
            <div className="hidden md:flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black">
                <Shield size={24} />
              </div>
              <h2 className="font-black text-xl tracking-tight">Admin Panel</h2>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'overview', icon: LayoutDashboard, label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
                { id: 'analytics', icon: TrendingUp, label: language === 'ar' ? 'التحليلات' : 'Analytics' },
                { id: 'schedule', icon: Calendar, label: language === 'ar' ? 'جدول التنزيلات' : 'Schedule' },
                { id: 'manhwas', icon: BookOpen, label: language === 'ar' ? 'المانهوات' : 'Manhwas' },
                { id: 'users', icon: Users, label: language === 'ar' ? 'المستخدمين' : 'Users' },
                { id: 'comments', icon: MessageSquare, label: language === 'ar' ? 'التعليقات' : 'Comments' },
                { id: 'reports', icon: AlertTriangle, label: language === 'ar' ? 'البلاغات' : 'Reports', badge: reports.length },
                { id: 'automation', icon: Cpu, label: language === 'ar' ? 'الأتمتة' : 'Automation' },
                { id: 'settings', icon: Settings, label: language === 'ar' ? 'الإعدادات' : 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] group ${activeTab === tab.id ? 'bg-white text-black font-black shadow-xl shadow-white/10' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={20} />
                    <span className="text-sm">{tab.label}</span>
                  </div>
                  {tab.badge && tab.badge > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-black text-white' : 'bg-red-500 text-white'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="pt-10 mt-10 border-t border-white/5">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl">
                <img src={currentUser?.avatarUrl} className="w-10 h-10 rounded-xl object-cover" alt="" />
                <div className="overflow-hidden">
                  <p className="font-black text-sm truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Administrator</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full custom-scrollbar bg-black">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2">
              {activeTab === 'overview' && (language === 'ar' ? 'لوحة التحكم' : 'Dashboard Overview')}
              {activeTab === 'analytics' && (language === 'ar' ? 'التحليلات' : 'Analytics')}
              {activeTab === 'schedule' && (language === 'ar' ? 'جدول التنزيلات' : 'Schedule')}
              {activeTab === 'users' && (language === 'ar' ? 'إدارة المستخدمين' : 'User Management')}
              {activeTab === 'comments' && (language === 'ar' ? 'إدارة التعليقات' : 'Comment Moderation')}
              {activeTab === 'reports' && (language === 'ar' ? 'بلاغات المحتوى' : 'Content Reports')}
              {activeTab === 'settings' && (language === 'ar' ? 'إعدادات الموقع' : 'Site Settings')}
              {activeTab === 'manhwas' && (language === 'ar' ? 'إدارة المانهوات' : 'Manhwa Management')}
            </h1>
            <p className="text-neutral-500 font-medium text-sm md:text-base">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-3 bg-white/5 rounded-2xl text-neutral-400 hover:text-white transition-colors relative active:scale-90">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
            </button>
            <div className="h-10 w-px bg-white/10"></div>
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs md:text-sm transition-all active:scale-95">
              <Globe size={18} />
              <span>{language === 'ar' ? 'عرض الموقع' : 'View Site'}</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col gap-6 pb-20 md:pb-0">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: language === 'ar' ? 'المستخدمين' : 'Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: language === 'ar' ? 'التعليقات' : 'Comments', value: stats.totalComments, icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: language === 'ar' ? 'البلاغات' : 'Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
                  { label: language === 'ar' ? 'الجدد اليوم' : 'New Today', value: stats.newUsersToday, icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0a0a0a] p-5 rounded-3xl border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all">
                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shrink-0`}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-2xl font-black mt-0.5">{stat.value}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts & Activity Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black">{language === 'ar' ? 'نمو المنصة' : 'Platform Growth'}</h3>
                    <select className="bg-white/5 border-none text-xs font-black rounded-xl px-3 py-1.5 outline-none">
                      <option className="bg-black">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
                      <option className="bg-black">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
                    </select>
                  </div>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                        <Area type="monotone" dataKey="users" name={language === 'ar' ? 'المستخدمين' : 'Users'} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Today's Schedule Mini */}
                <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black">{language === 'ar' ? 'تنزيلات اليوم' : "Today's Releases"}</h3>
                    <button onClick={() => setActiveTab('schedule')} className="text-emerald-500 hover:text-emerald-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                      {language === 'ar' ? 'الكل' : 'View All'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {(() => {
                      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                      const todayManhwas = manhwasList.filter(m => m.releaseSchedule?.includes(today));
                      
                      if (todayManhwas.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                            <Calendar size={32} className="mb-2 opacity-20" />
                            <p className="text-xs font-black">{language === 'ar' ? 'لا يوجد فصول اليوم' : 'No chapters today'}</p>
                          </div>
                        );
                      }

                      return todayManhwas.map(manhwa => (
                        <div key={manhwa.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                          <img src={manhwa.coverImage} className="w-10 h-10 object-cover rounded-xl shrink-0" alt="" />
                          <div className="overflow-hidden flex-1">
                            <p className="font-black text-sm truncate">{manhwa.title}</p>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{manhwa.staffName || '---'}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                  <input type="text" placeholder={language === 'ar' ? 'البحث عن مستخدم...' : 'Search users...'} className="w-full bg-neutral-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-white/20 transition-all" />
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-4 bg-neutral-950 border border-white/5 rounded-2xl font-black text-sm hover:bg-white/5 transition-all">
                  <Filter size={18} />
                  <span>{language === 'ar' ? 'تصفية' : 'Filter'}</span>
                </button>
              </div>

              <div className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-neutral-500">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                        <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-neutral-500">{language === 'ar' ? 'الدور' : 'Role'}</th>
                        <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-neutral-500">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-neutral-500">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <img src={user.avatarUrl} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                              <div>
                                <p className="font-black text-sm">{user.name}</p>
                                <p className="text-xs text-neutral-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`flex items-center gap-2 text-xs font-bold ${user.isBanned ? 'text-red-500' : 'text-emerald-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.isBanned ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                              {user.isBanned ? (language === 'ar' ? 'محظور' : 'Banned') : (language === 'ar' ? 'نشط' : 'Active')}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleBanUser(user.id, user.isBanned)} className={`p-2 rounded-lg transition-all active:scale-90 ${user.isBanned ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`} title={user.isBanned ? 'Unban' : 'Ban'}>
                                {user.isBanned ? <UserCheck size={18} className="shrink-0" /> : <Ban size={18} className="shrink-0" />}
                              </button>
                              <button onClick={() => handleToggleAdmin(user.id, user.role)} className="p-2 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 rounded-lg transition-all active:scale-90" title="Toggle Admin">
                                <Shield size={18} className="shrink-0" />
                              </button>
                              <button onClick={() => fetchUserAnalytics(user)} className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all active:scale-90" title="View Details">
                                <Search size={18} className="shrink-0" />
                              </button>
                              <button onClick={() => setDeleteConfirm({ type: 'user', id: user.id })} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all active:scale-90" title={language === 'ar' ? 'حذف المستخدم' : 'Delete User'}>
                                <Trash2 size={18} className="shrink-0" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-950 p-8 rounded-3xl border border-white/5">
                  <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">{language === 'ar' ? 'إجمالي المانهوات' : 'Total Manhwas'}</p>
                  <h3 className="text-4xl font-black mt-2">{stats.totalManhwas || 0}</h3>
                </div>
                <div className="bg-neutral-950 p-8 rounded-3xl border border-white/5">
                  <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">{language === 'ar' ? 'إجمالي الفصول' : 'Total Chapters'}</p>
                  <h3 className="text-4xl font-black mt-2">{stats.totalChapters || 0}</h3>
                </div>
                <div className="bg-neutral-950 p-8 rounded-3xl border border-white/5">
                  <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">{language === 'ar' ? 'إجمالي المشاهدات' : 'Total Views'}</p>
                  <h3 className="text-4xl font-black mt-2">{stats.totalViews || 0}</h3>
                </div>
              </div>
              <div className="bg-neutral-950 p-8 rounded-3xl border border-white/5">
                <h3 className="text-xl font-black mb-6">{language === 'ar' ? 'المانهوات الأكثر مشاهدة' : 'Most Viewed Manhwas'}</h3>
                <div className="space-y-4">
                  {stats.mostViewed?.map((manhwa: any, i: number) => (
                    <div key={manhwa.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <span className="font-black text-neutral-500 w-6 shrink-0">{i + 1}</span>
                        <img src={manhwa.coverImage} className="w-12 h-16 object-cover rounded-lg shrink-0" alt="" />
                        <p className="font-black">{manhwa.title}</p>
                      </div>
                      <p className="font-black text-neutral-400 shrink-0">{manhwa.views} {language === 'ar' ? 'مشاهدة' : 'views'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'schedule' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {DAYS.map((day) => {
                  const dayManhwas = manhwasList.filter(m => m.releaseSchedule?.includes(day.id));
                  return (
                    <div key={day.id} className="bg-neutral-950 p-8 rounded-3xl border border-white/5 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white">
                            <Calendar size={20} />
                          </div>
                          <h3 className="text-xl font-black">{language === 'ar' ? day.label.ar : day.label.en}</h3>
                        </div>
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {dayManhwas.length} {language === 'ar' ? 'مانهوا' : 'Manhwas'}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        {dayManhwas.map((manhwa) => (
                          <div key={manhwa.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/20 transition-all">
                            <div className="flex items-center gap-4">
                              <img src={manhwa.coverImage} className="w-12 h-16 object-cover rounded-xl shadow-lg" alt="" />
                              <div>
                                <p className="font-black text-sm group-hover:text-white transition-colors">{manhwa.title}</p>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{manhwa.status}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{language === 'ar' ? 'المسؤول' : 'Staff'}</p>
                                <p className="text-xs font-bold">{manhwa.staffName || '---'}</p>
                              </div>
                              <button 
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-500 hover:text-white"
                              >
                                <ChevronRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {dayManhwas.length === 0 && (
                          <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                            <p className="text-xs text-neutral-600 font-black uppercase tracking-widest">{language === 'ar' ? 'لا توجد مانهوا مجدولة' : 'No scheduled manhwas'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'comments' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-neutral-950 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-6">
                    <div className="flex items-start gap-4">
                      <img src={comment.userAvatar} className="w-12 h-12 rounded-2xl object-cover shrink-0" alt="" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-black">{comment.userName}</h4>
                          {!comment.isApproved && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">
                              {language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">{new Date(comment.createdAt?.toDate()).toLocaleString()}</p>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mt-4">
                          <p className="text-neutral-300 text-sm leading-relaxed">{comment.content}</p>
                        </div>
                        {comment.media && comment.media.length > 0 && (
                          <div className="flex gap-2 mt-4">
                            {comment.media.map((url: string, i: number) => (
                              <img key={i} src={url} className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0" alt="" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex md:flex-col justify-end gap-3 md:ml-auto shrink-0">
                      {!comment.isApproved && (
                        <button onClick={() => handleApproveComment(comment.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 transition-all text-sm">
                          <CheckCircle size={18} className="shrink-0" />
                          <span>{language === 'ar' ? 'موافقة' : 'Approve'}</span>
                        </button>
                      )}
                      <button onClick={() => setDeleteConfirm({ type: 'comment', id: comment.id })} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 font-black rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm">
                        <Trash2 size={18} className="shrink-0" />
                        <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                      <button onClick={() => handlePinComment(comment.id, !comment.isPinned)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 font-black rounded-xl transition-all text-sm ${comment.isPinned ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>
                        <Pin size={18} className={comment.isPinned ? 'fill-current' : ''} />
                        <span>{comment.isPinned ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (language === 'ar' ? 'تثبيت' : 'Pin')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                {reports.map((report) => (
                  <div key={report.id} className="bg-neutral-950 p-8 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{report.reason}</h3>
                          <p className="text-sm text-neutral-500">{language === 'ar' ? 'تم التبليغ بواسطة:' : 'Reported by:'} <span className="text-white font-bold">{report.reporterName}</span></p>
                        </div>
                      </div>
                      <span className="px-4 py-1.5 bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-widest rounded-full border border-red-500/20">
                        {report.status}
                      </span>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                      <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-2">{language === 'ar' ? 'المحتوى المبلّغ عنه:' : 'Reported Content:'}</p>
                      <p className="text-neutral-200">{report.commentContent}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4">
                      <button onClick={() => handleResolveReport(report.id, 'delete')} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-black font-black rounded-xl hover:bg-red-400 transition-all text-sm">
                        <Trash2 size={18} />
                        <span>{language === 'ar' ? 'حذف المحتوى' : 'Delete Content'}</span>
                      </button>
                      <button onClick={() => handleResolveReport(report.id, 'ban')} className="flex items-center gap-2 px-6 py-3 bg-neutral-800 text-white font-black rounded-xl hover:bg-neutral-700 transition-all text-sm">
                        <Ban size={18} />
                        <span>{language === 'ar' ? 'حظر المستخدم' : 'Ban User'}</span>
                      </button>
                      <button onClick={() => handleResolveReport(report.id, 'dismiss')} className="flex items-center gap-2 px-6 py-3 bg-white/5 text-neutral-400 font-black rounded-xl hover:bg-white/10 transition-all text-sm">
                        <XCircle size={18} />
                        <span>{language === 'ar' ? 'تجاهل البلاغ' : 'Dismiss Report'}</span>
                      </button>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="text-center py-20 bg-neutral-950 rounded-3xl border border-dashed border-white/10">
                    <CheckCircle size={64} className="mx-auto text-neutral-800 mb-4" />
                    <p className="text-neutral-500 font-black">{language === 'ar' ? 'لا توجد بلاغات معلقة' : 'No pending reports'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl">
              <form onSubmit={handleUpdateSettings} className="space-y-12">
                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-neutral-400 mb-8">
                    <Lock size={24} />
                    <h3 className="text-2xl font-black text-white">{language === 'ar' ? 'الرقابة التلقائية' : 'Auto-Moderation'}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-neutral-400 uppercase tracking-widest">{language === 'ar' ? 'الكلمات المحظورة (مفصولة بفاصلة)' : 'Banned Words (comma separated)'}</label>
                    <textarea 
                      value={siteSettings?.bannedWords?.join(', ') || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, bannedWords: e.target.value.split(',').map(s => s.trim()) })}
                      className="w-full bg-neutral-950 border border-white/5 rounded-3xl p-6 min-h-[150px] focus:outline-none focus:border-white/20 transition-all text-neutral-200"
                      placeholder="word1, word2, word3..."
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div>
                      <p className="font-black text-white">{language === 'ar' ? 'الموافقة التلقائية' : 'Auto-Approve Comments'}</p>
                      <p className="text-xs text-neutral-500">{language === 'ar' ? 'نشر التعليقات مباشرة دون مراجعة' : 'Publish comments immediately without review'}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSiteSettings({ ...siteSettings, autoApprove: !siteSettings.autoApprove })}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${siteSettings?.autoApprove ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                    >
                      <motion.div animate={{ x: siteSettings?.autoApprove ? 26 : 4 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-neutral-400 mb-8">
                    <Globe size={24} />
                    <h3 className="text-2xl font-black text-white">{language === 'ar' ? 'إعدادات عامة' : 'General Settings'}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">{language === 'ar' ? 'اسم الموقع' : 'Site Name'}</label>
                      <input type="text" value={siteSettings?.siteName || ''} onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })} className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 focus:outline-none focus:border-white/20 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">{language === 'ar' ? 'البريد الإلكتروني للدعم' : 'Support Email'}</label>
                      <input type="email" value={siteSettings?.supportEmail || ''} onChange={(e) => setSiteSettings({ ...siteSettings, supportEmail: e.target.value })} className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 focus:outline-none focus:border-white/20 transition-all" />
                    </div>
                  </div>
                </section>

                <div className="pt-8 border-t border-white/5 flex justify-end">
                  <button type="submit" className="flex items-center gap-3 px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all shadow-2xl shadow-white/10">
                    <Save size={20} />
                    <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'manhwas' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">

              {/* Top Bar */}
              <div className="flex items-center justify-between">
                {manhwaView !== 'list' && (
                  <button onClick={() => { setManhwaView('list'); setManhwaForm(null); setAnilistData(null); setEditingManhwa(null); setAnilistSearch(''); }}
                    className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-sm transition-all">
                    <ChevronRight size={18} className={language === 'ar' ? '' : 'rotate-180'} />
                    <span>{language === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
                  </button>
                )}
                {manhwaView === 'list' && (
                  <button onClick={() => { setManhwaView('add'); setManhwaForm(null); setAnilistData(null); setEditingManhwa(null); }}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all shadow-lg shadow-white/10">
                    <Plus size={18} />
                    <span>{language === 'ar' ? 'إضافة مانهوا' : 'Add Manhwa'}</span>
                  </button>
                )}
              </div>

              {/* LIST VIEW */}
              {manhwaView === 'list' && (
                <div className="space-y-4">
                  {/* Search Box */}
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      value={manhwaSearchQuery}
                      onChange={(e) => setManhwaSearchQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'ابحث عن مانهوا...' : 'Search manhwa...'}
                      className="w-full bg-neutral-950 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                    />
                    {manhwaSearchQuery && (
                      <button onClick={() => setManhwaSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {manhwasList.filter(m => {
                    if (!manhwaSearchQuery.trim()) return true;
                    const q = manhwaSearchQuery.toLowerCase();
                    return (m.title || '').toLowerCase().includes(q) || 
                           (m.titleEn || '').toLowerCase().includes(q) || 
                           (m.originalTitle || '').toLowerCase().includes(q) ||
                           (m.author || '').toLowerCase().includes(q);
                  }).map((manhwa) => (
                    <div key={manhwa.id} className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden group hover:border-white/15 transition-all">
                      <div className="relative h-32 overflow-hidden">
                        <img src={manhwa.bannerImage || manhwa.coverImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                          <img src={manhwa.coverImage} className="w-14 h-20 object-cover rounded-xl border-2 border-neutral-950 shadow-lg shrink-0" alt="" />
                          <div className="overflow-hidden pb-1">
                            <p className="font-black text-sm truncate text-white">{manhwa.title}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{manhwa.author || '---'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            manhwa.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500' : 
                            manhwa.status === 'completed' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'
                          }`}>{manhwa.status}</span>
                          {manhwa.releaseSchedule?.map((day: string) => (
                            <span key={day} className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-bold text-neutral-500">
                              {DAYS.find(d => d.id === day)?.[language === 'ar' ? 'label' : 'label']?.[language] || day}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditManhwa(manhwa)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-black text-xs transition-all">
                              <Edit3 size={14} />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>
                            <button onClick={() => setQuickUploadModal({ manhwaId: manhwa.id, manhwaTitle: manhwa.title })}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-black text-xs transition-all">
                              <Upload size={14} />
                              <span>{language === 'ar' ? 'رفع فصل' : 'Upload Ch.'}</span>
                            </button>
                          </div>
                          <button onClick={() => setDeleteConfirm({ type: 'manhwa', id: manhwa.id })}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {manhwasList.filter(m => {
                    if (!manhwaSearchQuery.trim()) return true;
                    const q = manhwaSearchQuery.toLowerCase();
                    return (m.title || '').toLowerCase().includes(q) || (m.titleEn || '').toLowerCase().includes(q) || (m.originalTitle || '').toLowerCase().includes(q) || (m.author || '').toLowerCase().includes(q);
                  }).length === 0 && manhwaSearchQuery && (
                    <div className="col-span-full text-center py-12 bg-neutral-950 rounded-3xl border border-dashed border-white/10">
                      <Search size={36} className="mx-auto text-neutral-700 mb-3" />
                      <p className="text-neutral-500 font-black text-sm">{language === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
                    </div>
                  )}
                  {manhwasList.length === 0 && !manhwaSearchQuery && (
                    <div className="col-span-full text-center py-20 bg-neutral-950 rounded-3xl border border-dashed border-white/10">
                      <BookOpen size={48} className="mx-auto text-neutral-700 mb-4" />
                      <p className="text-neutral-500 font-black">{language === 'ar' ? 'لا توجد مانهوات بعد' : 'No manhwas yet'}</p>
                      <p className="text-neutral-600 text-sm mt-2">{language === 'ar' ? 'اضغط "إضافة مانهوا" للبدء' : 'Click "Add Manhwa" to get started'}</p>
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* ADD VIEW */}
              {manhwaView === 'add' && (
                <div className="space-y-6">
                  {/* AniList Search */}
                  <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0"><Search size={20} /></div>
                      <div>
                        <h3 className="font-black text-base">{language === 'ar' ? 'البحث من AniList' : 'Search AniList'}</h3>
                        <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'ابحث باسم المانهوا لسحب المعلومات تلقائياً' : 'Search by name to auto-fetch info'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={anilistSearch}
                        onChange={e => setAnilistSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchAnilist()}
                        placeholder={language === 'ar' ? 'اكتب اسم المانهوا بالإنجليزية...' : 'Type manhwa name in English...'}
                        className="flex-1 bg-black border border-white/10 rounded-xl p-3.5 text-sm focus:border-blue-500 outline-none transition-all"
                      />
                      <button onClick={searchAnilist} disabled={anilistLoading || !anilistSearch.trim()}
                        className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-xl flex items-center gap-2 transition-all">
                        {anilistLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                        <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
                      </button>
                    </div>
                  </div>

                  {/* AniList Result / Form */}
                  {manhwaForm && (
                    <div className="space-y-6">
                      {/* Preview Banner + Cover */}
                      <div className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="relative h-48 md:h-64">
                          <img src={manhwaForm.bannerImage || manhwaForm.coverImage} className="w-full h-full object-cover opacity-70" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-5">
                            <div className="relative group/cover shrink-0">
                              <img src={manhwaForm.coverImage} className="w-24 h-36 object-cover rounded-2xl border-4 border-neutral-950 shadow-2xl" alt="" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                <Image size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="pb-2 overflow-hidden">
                              <h2 className="text-xl md:text-2xl font-black text-white truncate">{manhwaForm.title || (language === 'ar' ? 'عنوان المانهوا' : 'Manhwa Title')}</h2>
                              <p className="text-sm text-neutral-400">{manhwaForm.originalTitle}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {manhwaForm.genres?.slice(0, 4).map((g: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold text-neutral-300">{g}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Edit Form */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column – Info */}
                        <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                          <h3 className="font-black text-lg flex items-center gap-2">
                            <FileText size={18} className="text-neutral-500" />
                            {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}
                          </h3>

                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                              <input type="text" value={manhwaForm.title} onChange={e => setManhwaForm({ ...manhwaForm, title: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'المؤلف' : 'Author'}</label>
                                <input type="text" value={manhwaForm.author} onChange={e => setManhwaForm({ ...manhwaForm, author: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الرسام' : 'Artist'}</label>
                                <input type="text" value={manhwaForm.artist} onChange={e => setManhwaForm({ ...manhwaForm, artist: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الناشر' : 'Publisher'}</label>
                                <input type="text" value={manhwaForm.publisher || ''} onChange={e => setManhwaForm({ ...manhwaForm, publisher: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'تاريخ النشر' : 'Release Date'}</label>
                                <input type="date" value={manhwaForm.releaseDate} onChange={e => setManhwaForm({ ...manhwaForm, releaseDate: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                              <select value={manhwaForm.status} onChange={e => setManhwaForm({ ...manhwaForm, status: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all">
                                <option value="ongoing" className="bg-black">{language === 'ar' ? 'مستمرة' : 'Ongoing'}</option>
                                <option value="completed" className="bg-black">{language === 'ar' ? 'مكتملة' : 'Completed'}</option>
                                <option value="hiatus" className="bg-black">{language === 'ar' ? 'متوقفة' : 'Hiatus'}</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'النبذة (عربي)' : 'Synopsis (Arabic)'}</label>
                              <textarea value={manhwaForm.description} onChange={e => setManhwaForm({ ...manhwaForm, description: e.target.value })}
                                rows={4}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all resize-none" />
                            </div>
                          </div>
                        </div>

                        {/* Right Column – Images + Schedule + Staff */}
                        <div className="space-y-6">
                          {/* Images */}
                          <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <Image size={18} className="text-neutral-500" />
                              {language === 'ar' ? 'الصور' : 'Images'}
                            </h3>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رابط الغلاف' : 'Cover URL'}</label>
                                <input type="text" value={manhwaForm.coverImage} onChange={e => setManhwaForm({ ...manhwaForm, coverImage: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رابط البنر' : 'Banner URL'}</label>
                                <input type="text" value={manhwaForm.bannerImage} onChange={e => setManhwaForm({ ...manhwaForm, bannerImage: e.target.value })}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                              </div>
                              <button type="button" onClick={() => setManhwaForm({ ...manhwaForm, bannerImage: manhwaForm.coverImage })}
                                className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                {language === 'ar' ? '← استخدم الغلاف كبنر' : '← Use cover as banner'}
                              </button>
                            </div>
                          </div>

                          {/* Weekly Schedule */}
                          <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <Clock size={18} className="text-neutral-500" />
                              {language === 'ar' ? 'موعد التنزيل الأسبوعي' : 'Weekly Schedule'}
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                              {DAYS.map(day => {
                                const isSelected = manhwaForm.releaseSchedule?.includes(day.id);
                                return (
                                  <button key={day.id} type="button"
                                    onClick={() => {
                                      const schedule = manhwaForm.releaseSchedule || [];
                                      setManhwaForm({
                                        ...manhwaForm,
                                        releaseSchedule: isSelected
                                          ? schedule.filter((d: string) => d !== day.id)
                                          : [...schedule, day.id]
                                      });
                                    }}
                                    className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                                      isSelected ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'
                                    }`}>
                                    {language === 'ar' ? day.label.ar : day.label.en}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Staff Assignment */}
                          <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <Users size={18} className="text-neutral-500" />
                              {language === 'ar' ? 'الأعضاء المسؤولون' : 'Assigned Staff'}
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                              {users.filter(u => ['staff', 'staff_plus', 'moderator', 'admin'].includes(u.role)).map(staffUser => {
                                const isAssigned = manhwaForm.staffIds?.includes(staffUser.id);
                                return (
                                  <button key={staffUser.id} type="button"
                                    onClick={() => {
                                      const ids = manhwaForm.staffIds || [];
                                      setManhwaForm({
                                        ...manhwaForm,
                                        staffIds: isAssigned
                                          ? ids.filter((id: string) => id !== staffUser.id)
                                          : [...ids, staffUser.id],
                                        staffName: !isAssigned ? staffUser.name : manhwaForm.staffName
                                      });
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                                      isAssigned ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}>
                                    <img src={staffUser.avatarUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                                    <div className="text-left flex-1 overflow-hidden">
                                      <p className="font-black text-xs truncate">{staffUser.name}</p>
                                      <p className="text-[10px] text-neutral-500">{staffUser.role}</p>
                                    </div>
                                    {isAssigned && <CheckCircle size={16} className="text-purple-500 shrink-0" />}
                                  </button>
                                );
                              })}
                              {users.filter(u => ['staff', 'staff_plus', 'moderator', 'admin'].includes(u.role)).length === 0 && (
                                <p className="text-xs text-neutral-600 text-center py-4">{language === 'ar' ? 'لا يوجد أعضاء ستاف' : 'No staff members found'}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <button onClick={saveManhwa} disabled={savingManhwa || !manhwaForm.title}
                        className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 disabled:opacity-40 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 text-lg">
                        {savingManhwa ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save size={20} />}
                        <span>{editingManhwa ? (language === 'ar' ? 'تحديث المانهوا' : 'Update Manhwa') : (language === 'ar' ? 'حفظ المانهوا' : 'Save Manhwa')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* EDIT VIEW (same form + chapters) */}
              {manhwaView === 'edit' && manhwaForm && (
                <div className="space-y-6">
                  {/* Same form as add */}
                  <div className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="relative h-48 md:h-64">
                      <img src={manhwaForm.bannerImage || manhwaForm.coverImage} className="w-full h-full object-cover opacity-70" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                      <div className="absolute bottom-4 left-6 right-6 flex items-end gap-5">
                        <img src={manhwaForm.coverImage} className="w-24 h-36 object-cover rounded-2xl border-4 border-neutral-950 shadow-2xl shrink-0" alt="" />
                        <div className="pb-2 overflow-hidden">
                          <h2 className="text-xl md:text-2xl font-black text-white truncate">{manhwaForm.title}</h2>
                          <p className="text-sm text-neutral-400">{manhwaForm.originalTitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left – Edit Info */}
                    <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                      <h3 className="font-black text-lg flex items-center gap-2">
                        <FileText size={18} className="text-neutral-500" />
                        {language === 'ar' ? 'المعلومات' : 'Info'}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                          <input type="text" value={manhwaForm.title} onChange={e => setManhwaForm({ ...manhwaForm, title: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'المؤلف' : 'Author'}</label>
                            <input type="text" value={manhwaForm.author} onChange={e => setManhwaForm({ ...manhwaForm, author: e.target.value })}
                              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الرسام' : 'Artist'}</label>
                            <input type="text" value={manhwaForm.artist} onChange={e => setManhwaForm({ ...manhwaForm, artist: e.target.value })}
                              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الناشر' : 'Publisher'}</label>
                            <input type="text" value={manhwaForm.publisher || ''} onChange={e => setManhwaForm({ ...manhwaForm, publisher: e.target.value })}
                              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'تاريخ النشر' : 'Release Date'}</label>
                            <input type="date" value={manhwaForm.releaseDate} onChange={e => setManhwaForm({ ...manhwaForm, releaseDate: e.target.value })}
                              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                          <select value={manhwaForm.status} onChange={e => setManhwaForm({ ...manhwaForm, status: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all">
                            <option value="ongoing" className="bg-black">{language === 'ar' ? 'مستمرة' : 'Ongoing'}</option>
                            <option value="completed" className="bg-black">{language === 'ar' ? 'مكتملة' : 'Completed'}</option>
                            <option value="hiatus" className="bg-black">{language === 'ar' ? 'متوقفة' : 'Hiatus'}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'النبذة' : 'Synopsis'}</label>
                          <textarea value={manhwaForm.description} onChange={e => setManhwaForm({ ...manhwaForm, description: e.target.value })}
                            rows={4}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all resize-none" />
                        </div>

                        {/* Images */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رابط الغلاف' : 'Cover URL'}</label>
                          <input type="text" value={manhwaForm.coverImage} onChange={e => setManhwaForm({ ...manhwaForm, coverImage: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رابط البنر' : 'Banner URL'}</label>
                          <input type="text" value={manhwaForm.bannerImage} onChange={e => setManhwaForm({ ...manhwaForm, bannerImage: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-white/30 outline-none transition-all" />
                        </div>
                        <button type="button" onClick={() => setManhwaForm({ ...manhwaForm, bannerImage: manhwaForm.coverImage })}
                          className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
                          {language === 'ar' ? '← استخدم الغلاف كبنر' : '← Use cover as banner'}
                        </button>

                        {/* Schedule */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'موعد التنزيل الأسبوعي' : 'Weekly Schedule'}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {DAYS.map(day => {
                              const isSelected = manhwaForm.releaseSchedule?.includes(day.id);
                              return (
                                <button key={day.id} type="button"
                                  onClick={() => {
                                    const schedule = manhwaForm.releaseSchedule || [];
                                    setManhwaForm({
                                      ...manhwaForm,
                                      releaseSchedule: isSelected
                                        ? schedule.filter((d: string) => d !== day.id)
                                        : [...schedule, day.id]
                                    });
                                  }}
                                  className={`py-2 rounded-xl font-black text-[10px] transition-all border ${
                                    isSelected ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'
                                  }`}>
                                  {language === 'ar' ? day.label.ar : day.label.en}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Staff */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'الأعضاء المسؤولون' : 'Assigned Staff'}</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {users.filter(u => ['staff', 'staff_plus', 'moderator', 'admin'].includes(u.role)).map(staffUser => {
                              const isAssigned = manhwaForm.staffIds?.includes(staffUser.id);
                              return (
                                <button key={staffUser.id} type="button"
                                  onClick={() => {
                                    const ids = manhwaForm.staffIds || [];
                                    setManhwaForm({
                                      ...manhwaForm,
                                      staffIds: isAssigned
                                        ? ids.filter((id: string) => id !== staffUser.id)
                                        : [...ids, staffUser.id],
                                      staffName: !isAssigned ? staffUser.name : manhwaForm.staffName
                                    });
                                  }}
                                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border ${
                                    isAssigned ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                  }`}>
                                  <img src={staffUser.avatarUrl} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                                  <p className="font-bold text-xs truncate flex-1 text-left">{staffUser.name}</p>
                                  {isAssigned && <CheckCircle size={14} className="text-purple-500 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button onClick={saveManhwa} disabled={savingManhwa}
                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 disabled:opacity-40 transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2">
                        {savingManhwa ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save size={16} />}
                        <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
                      </button>
                    </div>

                    {/* Right – Chapters */}
                    <div className="bg-neutral-950 p-6 rounded-3xl border border-white/5 space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-lg flex items-center gap-2">
                          <BookOpen size={18} className="text-neutral-500" />
                          {language === 'ar' ? 'الفصول' : 'Chapters'}
                          <span className="text-xs text-neutral-500 font-bold">{manhwaChapters.length}</span>
                        </h3>
                        <button onClick={() => setBulkUploadModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl font-black text-[10px] transition-all">
                          <Upload size={12} />
                          {language === 'ar' ? 'رفع بالجملة' : 'Bulk Upload'}
                        </button>
                      </div>

                      {/* Chapters List */}
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                        <input ref={editChapterFileRef} type="file" multiple accept="image/*,.zip,.rar,.7z" className="hidden"
                          onChange={(e) => setEditChapterFiles(Array.from(e.target.files || []))} />
                        {manhwaChapters.map((ch) => (
                          <div key={ch.id} className="bg-white/5 rounded-xl border border-white/5 hover:border-white/15 transition-all overflow-hidden">
                            {editingChapterId === ch.id ? (
                              /* Editing mode */
                              <div className="p-3 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{ch.number}</span>
                                  <input type="text" value={editChapterTitle} onChange={e => setEditChapterTitle(e.target.value)}
                                    placeholder={ch.title || (language === 'ar' ? `الفصل ${ch.number}` : `Chapter ${ch.number}`)}
                                    className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none transition-all" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => editChapterFileRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[10px] font-black text-neutral-400 transition-all">
                                    <Image size={12} />
                                    {editChapterFiles.length > 0 ? `${editChapterFiles.length} ${language === 'ar' ? 'ملف' : 'files'}` : (language === 'ar' ? 'استبدال الملفات' : 'Replace files')}
                                  </button>
                                  <input type="url" value={editChapterDriveLink} onChange={e => setEditChapterDriveLink(e.target.value)}
                                    placeholder="Drive link" dir="ltr"
                                    className="flex-1 bg-black border border-white/5 rounded-lg px-2 py-2 text-[10px] focus:border-emerald-500 outline-none transition-all" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveChapterEdit(ch)} disabled={savingChapter}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black rounded-lg text-xs flex items-center justify-center gap-1 transition-all">
                                    {savingChapter ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
                                    {language === 'ar' ? 'حفظ' : 'Save'}
                                  </button>
                                  <button onClick={() => { setEditingChapterId(null); setEditChapterTitle(''); setEditChapterFiles([]); setEditChapterDriveLink(''); }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-400 font-black rounded-lg text-xs transition-all">
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* View mode */
                              <div className="flex items-center justify-between p-3 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{ch.number}</span>
                                  <div className="overflow-hidden">
                                    <p className="font-bold text-sm truncate">{ch.title || `${language === 'ar' ? 'الفصل' : 'Chapter'} ${ch.number}`}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                                      <span>{(ch.images?.length || ch.pages?.length || 0)} {language === 'ar' ? 'صفحة' : 'pages'}</span>
                                      {(ch.createdAt || ch.releaseDate) && (
                                        <>
                                          <span>•</span>
                                          <Clock size={10} className="shrink-0" />
                                          <span>{new Date(ch.createdAt?.toDate?.() || ch.createdAt || ch.releaseDate).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => { setEditingChapterId(ch.id); setEditChapterTitle(ch.title || ''); setEditChapterFiles([]); setEditChapterDriveLink(''); }}
                                    className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all">
                                    <Edit3 size={14} />
                                  </button>
                                  <button onClick={() => deleteChapter(ch.id)}
                                    className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {manhwaChapters.length === 0 && (
                          <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl">
                            <BookOpen size={32} className="mx-auto text-neutral-700 mb-2" />
                            <p className="text-xs text-neutral-600 font-black">{language === 'ar' ? 'لا توجد فصول بعد' : 'No chapters yet'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'automation' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5 pb-24">

              {/* ── Section tabs ── */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'scraper', icon: Download, label: language === 'ar' ? 'السحب' : 'Scraper', color: 'blue' },
                  { id: 'ai',      icon: Cpu,      label: language === 'ar' ? 'الذكاء الاصطناعي' : 'AI Tools', color: 'purple' },
                  { id: 'staff',   icon: Upload,   label: language === 'ar' ? 'الستاف' : 'Staff',   color: 'emerald' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAutomationSection(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all border ${
                      activeAutomationSection === tab.id
                        ? tab.color === 'blue'    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                        : tab.color === 'purple'  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                        :                          'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* ── LEFT: forms ── */}
                <div className="lg:col-span-2 space-y-5">

                  {/* SCRAPER */}
                  {activeAutomationSection === 'scraper' && (
                    <motion.div key="scraper" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-neutral-950 p-5 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0"><Download size={20} /></div>
                        <div>
                          <h3 className="font-black text-base">{language === 'ar' ? 'أدوات السحب' : 'Scraper'}</h3>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'Naver · Kakao · AIO' : 'Naver · Kakao · AIO'}</p>
                        </div>
                      </div>

                      {/* Source selector */}
                      <div className="grid grid-cols-3 gap-2">
                        {(['Naver', 'Kakao', 'AIO'] as const).map(src => (
                          <button key={src} onClick={() => setSelectedSource(src)}
                            className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                              selectedSource === src ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'
                            }`}>{src}</button>
                        ))}
                      </div>

                      {/* Fields */}
                      {isRangeScraper ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'المعرّف ID' : 'Series ID'}</label>
                            <input type="text" value={automationSeriesId} onChange={e => setAutomationSeriesId(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all"
                              placeholder={language === 'ar' ? 'مثلاً: 848496' : 'e.g. 848496'} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'من فصل' : 'From'}</label>
                              <input type="number" min="1" value={automationStartChapter} onChange={e => setAutomationStartChapter(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="1" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'إلى فصل' : 'To'}</label>
                              <input type="number" min="1" value={automationEndChapter} onChange={e => setAutomationEndChapter(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رابط المانهوا' : 'Manhwa URL'}</label>
                          <input type="text" value={automationUrl} onChange={e => setAutomationUrl(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="https://..." />
                        </div>
                      )}

                      <button onClick={() => startAutomation('scrape')} disabled={isScrapeActionDisabled}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                        {isAutomationRunning
                          ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          : <Zap size={16} />}
                        <span>{language === 'ar' ? 'بدء السحب' : 'Start Scraping'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* AI */}
                  {activeAutomationSection === 'ai' && (
                    <motion.div key="ai" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-neutral-950 p-5 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center shrink-0"><Cpu size={20} /></div>
                        <div>
                          <h3 className="font-black text-base">{language === 'ar' ? 'معالجة الذكاء الاصطناعي' : 'AI Processing'}</h3>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'تبييض · ترجمة · OCR' : 'In-paint · Translate · OCR'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <Eraser size={18} className="text-yellow-400" />
                          <p className="font-black text-sm">{language === 'ar' ? 'التبييض' : 'In-painting'}</p>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'تنظيف الفقاعات' : 'Clean bubbles'}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <FileText size={18} className="text-emerald-400" />
                          <p className="font-black text-sm">{language === 'ar' ? 'الترجمة' : 'Translation'}</p>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'TsengScans AI' : 'TsengScans AI'}</p>
                        </div>
                      </div>
                      {!automationReadiness.ready && (
                        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 space-y-1">
                          <p className="text-[11px] font-black text-red-300">
                            {language === 'ar' ? 'أدوات AI غير جاهزة' : 'AI tools are not ready'}
                          </p>
                          <p className="text-[10px] text-red-200/80">Detect: {automationReadiness.detectReason}</p>
                          <p className="text-[10px] text-red-200/80">Translate: {automationReadiness.translateReason}</p>
                        </div>
                      )}

                      <button onClick={() => startAutomation('ai')} disabled={isAutomationRunning || automationReadiness.loading || !automationReadiness.ready}
                        className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20">
                        {isAutomationRunning || automationReadiness.loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Terminal size={16} />}
                        <span>{language === 'ar' ? 'تشغيل خط الإنتاج' : 'Run Pipeline'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* STAFF */}
                  {activeAutomationSection === 'staff' && (
                    <motion.div key="staff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-neutral-950 p-5 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0"><Upload size={20} /></div>
                        <div>
                          <h3 className="font-black text-base">{language === 'ar' ? 'تسليم أعمال الستاف' : 'Staff Delivery'}</h3>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'ZIP أو رابط درايف' : 'ZIP or Drive link'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'معرف المانهوا' : 'Manhwa ID'}</label>
                          <input type="text" value={manhwaName} onChange={e => setManhwaName(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                            placeholder="solo-leveling" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'ar' ? 'رقم الفصل' : 'Chapter #'}</label>
                          <input type="text" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                            placeholder="1" />
                        </div>
                      </div>
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/10 rounded-2xl hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group">
                        <Upload className="w-7 h-7 mb-2 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                        <p className="text-xs font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors">
                          {staffFile ? staffFile.name : (language === 'ar' ? 'اضغط لاختيار ملف ZIP' : 'Click to select ZIP')}
                        </p>
                        <input type="file" accept=".zip" className="hidden" onChange={e => setStaffFile(e.target.files?.[0] || null)} />
                      </label>
                      <div className="text-center text-neutral-600 font-black text-[10px] uppercase">— {language === 'ar' ? 'أو' : 'or'} —</div>
                      <input type="text" value={staffDriveLink} onChange={e => setStaffDriveLink(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                        placeholder="https://drive.google.com/drive/folders/..." />
                      <button onClick={startStaffPublishing} disabled={isAutomationRunning || (!staffFile && !staffDriveLink)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20">
                        {isAutomationRunning ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                        <span>{language === 'ar' ? 'تسليم ونشر' : 'Publish & Sync'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* Progress + Logs */}
                  <div className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Terminal size={13} className="text-neutral-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest truncate">
                          {isAutomationRunning ? (language === 'ar' ? 'جاري التنفيذ...' : 'Running...') : (language === 'ar' ? 'سجل العمليات' : 'Logs')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isAutomationRunning && (
                          <span className="text-[10px] font-black text-blue-400">{progress}%</span>
                        )}
                        {automationLogs.length > 0 && (
                          <button onClick={() => setAutomationLogs([])} className="text-[10px] font-black text-red-500 hover:text-red-400 transition-colors uppercase">
                            {language === 'ar' ? 'مسح' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>
                    {isAutomationRunning && (
                      <div className="h-1 w-full bg-white/5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      </div>
                    )}
                    <div ref={logContainerRef} className="p-4 h-56 font-mono text-[11px] text-neutral-400 overflow-y-auto space-y-1 custom-scrollbar bg-black">
                      {automationLogs.length === 0
                        ? <p className="text-neutral-700 italic">{language === 'ar' ? 'في انتظار الأوامر...' : 'Waiting for input...'}</p>
                        : automationLogs.map((log, i) => (
                          <p key={i} className={`p-1 border-l-2 pl-3 rounded-sm ${
                            log.includes('❌') || log.includes('[ERROR]') || log.includes('🛑') ? 'text-red-400 border-red-500 bg-red-500/5' :
                            log.includes('✅') || log.includes('🎉') || log.includes('🏁') ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5' :
                            log.includes('🚀') || log.includes('⚙️') || log.includes('[SYSTEM]') ? 'text-blue-400 border-blue-500 bg-blue-500/5' :
                            log.includes('⚠️') ? 'text-yellow-400 border-yellow-500 bg-yellow-500/5' :
                            'text-neutral-500 border-neutral-800'
                          }`}>{log}</p>
                        ))}
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Chapter preview ── */}
                <div className="lg:col-span-3">
                  <div className="bg-neutral-950 rounded-3xl border border-white/5 overflow-hidden h-full min-h-[400px] flex flex-col">
                    <div className="px-5 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationPlayState: isAutomationRunning ? 'running' : 'paused' }} />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                          {scrapedImages.length > 0
                            ? (language === 'ar' ? `معاينة الفصل ${scrapedChapterLabel}` : `Chapter ${scrapedChapterLabel} Preview`)
                            : (language === 'ar' ? 'معاينة الفصل المسحوب' : 'Scraped Chapter Preview')}
                        </span>
                      </div>
                      {scrapedImages.length > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-neutral-500 font-black">{scrapedImages.length} {language === 'ar' ? 'صورة' : 'images'}</span>
                          <button onClick={() => setScrapedImages([])} className="text-[10px] font-black text-neutral-500 hover:text-white transition-colors uppercase">
                            {language === 'ar' ? 'مسح' : 'Clear'}
                          </button>
                        </div>
                      )}
                    </div>

                    {scrapedImages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                        {isAutomationRunning ? (
                          <>
                            <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                            <div>
                              <p className="font-black text-white">{language === 'ar' ? 'جاري السحب...' : 'Scraping...'}</p>
                              <p className="text-xs text-neutral-500 mt-1">{language === 'ar' ? 'ستظهر الصور هنا فور الانتهاء' : 'Images will appear here when done'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center">
                              <Download size={28} className="text-neutral-600" />
                            </div>
                            <div>
                              <p className="font-black text-neutral-400">{language === 'ar' ? 'لا توجد فصول مسحوبة بعد' : 'No chapters scraped yet'}</p>
                              <p className="text-xs text-neutral-600 mt-1">{language === 'ar' ? 'ابدأ السحب لرؤية الصور هنا' : 'Start scraping to preview images'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {scrapedImages.map((img, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/5 group"
                            >
                              <img
                                src={img}
                                alt={`page-${i + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                                <span className="text-[10px] font-black text-white/70">{i + 1}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setSelectedUser(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-950 p-8 rounded-3xl border border-white/10 w-full max-w-2xl space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">{selectedUser.name}</h2>
              <button onClick={() => setSelectedUser(null)}><XCircle /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-neutral-500 text-xs font-black uppercase">{language === 'ar' ? 'التعليقات' : 'Comments'}</p>
                <h3 className="text-2xl font-black">{userAnalytics?.commentsCount || 0}</h3>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-neutral-500 text-xs font-black uppercase">{language === 'ar' ? 'المشاهدات' : 'Views'}</p>
                <h3 className="text-2xl font-black">{userAnalytics?.viewsCount || 0}</h3>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-neutral-500 text-xs font-black uppercase">{language === 'ar' ? 'المانهوات' : 'Manhwas'}</p>
                <h3 className="text-2xl font-black">{userAnalytics?.manhwasCount || 0}</h3>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-neutral-500 text-xs font-black uppercase">{language === 'ar' ? 'الفصول' : 'Chapters'}</p>
                <h3 className="text-2xl font-black">{userAnalytics?.chaptersCount || 0}</h3>
              </div>
            </div>
            <div>
              <h4 className="font-black mb-4">{language === 'ar' ? 'آخر التعليقات' : 'Recent Comments'}</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userAnalytics?.recentComments.map((c: any, i: number) => (
                  <p key={i} className="text-sm bg-white/5 p-3 rounded-xl">{c.content}</p>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {/* Quick Chapter Upload Modal */}
      <AnimatePresence>
        {quickUploadModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!quickUploadUploading) { setQuickUploadModal(null); setQuickUploadFiles([]); setQuickUploadChapterNum(''); setQuickUploadChapterTitle(''); setQuickUploadDriveLink(''); } }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-neutral-950 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">{language === 'ar' ? 'رفع فصل سريع' : 'Quick Chapter Upload'}</h3>
                    <p className="text-[10px] text-neutral-500 font-bold truncate max-w-[200px]">{quickUploadModal.manhwaTitle}</p>
                  </div>
                </div>
                <button onClick={() => { if (!quickUploadUploading) { setQuickUploadModal(null); setQuickUploadFiles([]); setQuickUploadChapterNum(''); setQuickUploadChapterTitle(''); setQuickUploadDriveLink(''); } }} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X size={18} className="text-neutral-400" />
                </button>
              </div>

              {/* Chapter Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{language === 'ar' ? 'رقم الفصل *' : 'Chapter # *'}</label>
                  <input type="number" value={quickUploadChapterNum} onChange={(e) => setQuickUploadChapterNum(e.target.value)} placeholder="1" className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-white/20 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{language === 'ar' ? 'عنوان الفصل' : 'Title (optional)'}</label>
                  <input type="text" value={quickUploadChapterTitle} onChange={(e) => setQuickUploadChapterTitle(e.target.value)} placeholder={language === 'ar' ? 'اختياري' : 'Optional'} className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-white/20 transition-all" />
                </div>
              </div>

              {/* Upload Methods */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{language === 'ar' ? 'طريقة الرفع' : 'Upload Method'}</p>
                
                {/* File/Folder Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => quickUploadFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <Image size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">{language === 'ar' ? 'صور' : 'Images'}</span>
                  </button>
                  <input ref={quickUploadFileRef} type="file" multiple accept="image/*,.zip,.rar,.7z" className="hidden" onChange={handleQuickUploadFileChange} />
                  
                  <button
                    onClick={() => quickUploadFolderRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <FileText size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">{language === 'ar' ? 'مجلد' : 'Folder'}</span>
                  </button>
                  <input ref={quickUploadFolderRef} type="file" {...{ webkitdirectory: '', directory: '' } as any} className="hidden" onChange={handleQuickUploadFileChange} />
                  
                  <button
                    onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.zip,.rar,.7z'; input.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) setQuickUploadFiles([f]); }; input.click(); }}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <Download size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">ZIP</span>
                  </button>
                </div>

                {/* Drive Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe size={12} />
                    {language === 'ar' ? 'أو رابط Google Drive' : 'Or Google Drive Link'}
                  </label>
                  <input 
                    type="url" 
                    value={quickUploadDriveLink} 
                    onChange={(e) => setQuickUploadDriveLink(e.target.value)} 
                    placeholder="https://drive.google.com/..." 
                    className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-white/20 transition-all" 
                    dir="ltr"
                  />
                </div>

                {/* Selected Files Preview */}
                {quickUploadFiles.length > 0 && (
                  <div className="bg-black rounded-2xl border border-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-neutral-300">
                        {quickUploadFiles.length} {language === 'ar' ? 'ملف' : 'file(s)'}
                        <span className="text-neutral-600 mx-1">•</span>
                        <span className="text-neutral-500">{(quickUploadFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </span>
                      <button onClick={() => setQuickUploadFiles([])} className="text-red-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1">
                      {quickUploadFiles.slice(0, 10).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <FileText size={10} className="shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                      {quickUploadFiles.length > 10 && (
                        <p className="text-[10px] text-neutral-600 font-bold">+{quickUploadFiles.length - 10} {language === 'ar' ? 'ملفات أخرى' : 'more files'}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleQuickUpload}
                disabled={quickUploadUploading || !quickUploadChapterNum || (quickUploadFiles.length === 0 && !quickUploadDriveLink)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                {quickUploadUploading ? (
                  <><Cpu size={18} className="animate-spin" /> <span>{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span></>
                ) : (
                  <><Upload size={18} /> <span>{language === 'ar' ? 'رفع الفصل' : 'Upload Chapter'}</span></>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {bulkUploadModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !bulkUploadUploading && setBulkUploadModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Upload size={18} className="text-blue-400" />
                  {language === 'ar' ? 'رفع فصول بالجملة' : 'Bulk Chapter Upload'}
                </h3>
                <button onClick={() => !bulkUploadUploading && setBulkUploadModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
              </div>
              <p className="text-xs text-neutral-500 font-bold">{language === 'ar' ? 'أضف حتى 300+ فصل دفعة واحدة. لكل فصل أرفق صور أو ملف مضغوط أو رابط درايف.' : 'Add up to 300+ chapters at once. For each chapter attach images, a ZIP, or a Drive link.'}</p>

              {/* Quick range fill */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase">{language === 'ar' ? 'تعبئة سريعة من-إلى' : 'Quick fill range'}</label>
                  <div className="flex gap-2 mt-1">
                    <input id="bulkFillFrom" type="number" min="1" placeholder={language === 'ar' ? 'من' : 'From'}
                      className="flex-1 bg-black border border-white/10 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none" />
                    <input id="bulkFillTo" type="number" min="1" placeholder={language === 'ar' ? 'إلى' : 'To'}
                      className="flex-1 bg-black border border-white/10 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <button onClick={() => {
                  const from = parseInt((document.getElementById('bulkFillFrom') as HTMLInputElement)?.value || '0');
                  const to = parseInt((document.getElementById('bulkFillTo') as HTMLInputElement)?.value || '0');
                  if (from > 0 && to >= from && to - from < 500) {
                    const rows = [];
                    for (let i = from; i <= to; i++) rows.push({ num: String(i), title: '', driveLink: '', files: [] });
                    setBulkUploadChapters(rows);
                  }
                }} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all shrink-0">
                  {language === 'ar' ? 'تعبئة' : 'Fill'}
                </button>
              </div>

              {/* Chapter rows */}
              <div className="space-y-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                {bulkUploadChapters.map((ch, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/5">
                    <input type="number" min="1" value={ch.num} onChange={e => {
                      const copy = [...bulkUploadChapters]; copy[i] = { ...copy[i], num: e.target.value }; setBulkUploadChapters(copy);
                    }} placeholder="#" className="w-16 bg-black border border-white/10 rounded-lg p-2 text-sm text-center focus:border-blue-500 outline-none" />
                    <input type="text" value={ch.title} onChange={e => {
                      const copy = [...bulkUploadChapters]; copy[i] = { ...copy[i], title: e.target.value }; setBulkUploadChapters(copy);
                    }} placeholder={language === 'ar' ? 'عنوان (اختياري)' : 'Title (opt)'}
                      className="flex-1 bg-black border border-white/10 rounded-lg p-2 text-sm focus:border-blue-500 outline-none min-w-0" />
                    <input type="url" value={ch.driveLink} onChange={e => {
                      const copy = [...bulkUploadChapters]; copy[i] = { ...copy[i], driveLink: e.target.value }; setBulkUploadChapters(copy);
                    }} placeholder="Drive link" dir="ltr"
                      className="flex-1 bg-black border border-white/10 rounded-lg p-2 text-[10px] focus:border-blue-500 outline-none min-w-0" />
                    <label className="cursor-pointer shrink-0 flex items-center gap-1 px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[10px] font-black text-neutral-400 transition-all">
                      <Image size={12} />
                      {ch.files.length > 0 ? ch.files.length : ''}
                      <input type="file" multiple accept="image/*,.zip,.rar,.7z" className="hidden" onChange={e => {
                        const copy = [...bulkUploadChapters]; copy[i] = { ...copy[i], files: Array.from(e.target.files || []) }; setBulkUploadChapters(copy);
                      }} />
                    </label>
                    <button onClick={() => setBulkUploadChapters(bulkUploadChapters.filter((_, j) => j !== i))}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>

              <button onClick={() => setBulkUploadChapters([...bulkUploadChapters, { num: String(bulkUploadChapters.length > 0 ? parseInt(bulkUploadChapters[bulkUploadChapters.length - 1].num || '0') + 1 : 1), title: '', driveLink: '', files: [] }])}
                className="w-full py-2 border border-dashed border-white/10 hover:border-white/20 rounded-xl text-xs font-black text-neutral-500 hover:text-neutral-300 flex items-center justify-center gap-1 transition-all">
                <Plus size={14} /> {language === 'ar' ? 'إضافة فصل' : 'Add Chapter'}
              </button>

              {bulkUploadUploading && (
                <div className="space-y-2">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${bulkUploadProgress.total > 0 ? (bulkUploadProgress.current / bulkUploadProgress.total) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-bold text-center">
                    {language === 'ar' ? `جاري رفع الفصل ${bulkUploadProgress.current} من ${bulkUploadProgress.total}...` : `Uploading chapter ${bulkUploadProgress.current} of ${bulkUploadProgress.total}...`}
                  </p>
                </div>
              )}

              <button onClick={handleBulkUpload} disabled={bulkUploadUploading || bulkUploadChapters.filter(c => c.num && (c.files.length > 0 || c.driveLink)).length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-blue-600/20">
                {bulkUploadUploading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Upload size={18} />}
                <span>{bulkUploadUploading
                  ? (language === 'ar' ? `جاري الرفع... ${bulkUploadProgress.current}/${bulkUploadProgress.total}` : `Uploading... ${bulkUploadProgress.current}/${bulkUploadProgress.total}`)
                  : (language === 'ar' ? `رفع ${bulkUploadChapters.filter(c => c.num && (c.files.length > 0 || c.driveLink)).length} فصل` : `Upload ${bulkUploadChapters.filter(c => c.num && (c.files.length > 0 || c.driveLink)).length} chapters`)}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
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
                <p className="text-sm text-neutral-500 font-bold">
                  {deleteConfirm.type === 'manhwa' 
                    ? (language === 'ar' ? 'سيتم حذف المانهوا وجميع فصولها نهائياً.' : 'The manhwa and all its chapters will be permanently deleted.')
                    : deleteConfirm.type === 'user'
                    ? (language === 'ar' ? 'سيتم حذف المستخدم وجميع بياناته نهائياً.' : 'The user and all their data will be permanently deleted.')
                    : (language === 'ar' ? 'سيتم حذف التعليق نهائياً.' : 'The comment will be permanently deleted.')}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => deleteConfirm.type === 'manhwa' ? handleDeleteManhwa(deleteConfirm.id) : deleteConfirm.type === 'user' ? handleDeleteUser(deleteConfirm.id) : handleDeleteComment(deleteConfirm.id)}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  {language === 'ar' ? 'نعم، احذف' : 'Yes, delete'}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-black rounded-xl transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
