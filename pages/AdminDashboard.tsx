
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
  ShieldAlert, Filter, Lock, BookOpen, Plus, Image, Edit3, Clock, Check, ChevronDown
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
  const [rolePickerUserId, setRolePickerUserId] = useState<string | null>(null);

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
  // Removed: quickUploadChapterNum, quickUploadChapterTitle (automation)
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
  // Bulk upload: only files or drive link
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([]);
  const [bulkUploadDriveLink, setBulkUploadDriveLink] = useState('');
  const [bulkUploadUploading, setBulkUploadUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0 });

  // Chapter editing state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterFiles, setEditChapterFiles] = useState<File[]>([]);
  const [editChapterDriveLink, setEditChapterDriveLink] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const editChapterFileRef = useRef<HTMLInputElement>(null);

  // Chapter Merge State
  const [mergeModal, setMergeModal] = useState<{ manhwaId: string; manhwaTitle: string } | null>(null);
  const [mergeSourceChapters, setMergeSourceChapters] = useState<string[]>([]);
  const [mergeTargetNumber, setMergeTargetNumber] = useState('');
  const [mergeTargetTitle, setMergeTargetTitle] = useState('');
  const [merging, setMerging] = useState(false);

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
    if (!quickUploadModal) return;
    if (quickUploadFiles.length === 0 && !quickUploadDriveLink) {
      toast.error(language === 'ar' ? 'يرجى إرفاق ملفات أو رابط درايف' : 'Please attach files or a Drive link');
      return;
    }
    setQuickUploadUploading(true);
    const toastId = toast.loading(language === 'ar' ? 'جاري رفع الفصل...' : 'Uploading chapter...');

    try {
      const formData = new FormData();
      formData.append('manhwaId', quickUploadModal.manhwaId);
      // No chapterNumber or chapterTitle sent; backend will infer
      if (quickUploadDriveLink) {
        formData.append('driveLink', quickUploadDriveLink);
      } else if (quickUploadFiles.length === 1 && quickUploadFiles[0].name.match(/\.(zip|rar|7z)$/i)) {
        formData.append('zipFile', quickUploadFiles[0]);
      } else {
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
        toast.success(language === 'ar' ? `تم رفع الفصل بنجاح!` : `Chapter uploaded successfully!`);
        setQuickUploadModal(null);
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

  // Merge chapters handler
  const handleMergeChapters = async () => {
    if (!mergeModal || mergeSourceChapters.length < 2 || !mergeTargetNumber) return;
    setMerging(true);
    const toastId = toast.loading(language === 'ar' ? 'جاري دمج الفصول...' : 'Merging chapters...');
    try {
      const response = await fetch('/api/automation/merge-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manhwaId: mergeModal.manhwaId,
          sourceChapters: mergeSourceChapters,
          targetChapterNumber: mergeTargetNumber,
          targetChapterTitle: mergeTargetTitle,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.dismiss(toastId);
        toast.success(language === 'ar' ? `تم دمج ${data.merged} فصول (${data.pages} صفحة)` : `Merged ${data.merged} chapters (${data.pages} pages)`);
        setMergeModal(null);
        setMergeSourceChapters([]);
        setMergeTargetNumber('');
        setMergeTargetTitle('');
      } else {
        toast.dismiss(toastId);
        toast.error(data.error || (language === 'ar' ? 'فشل الدمج' : 'Merge failed'));
      }
    } catch {
      toast.dismiss(toastId);
      toast.error(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setMerging(false);
    }
  };

  // Bulk upload handler (multiple chapters at once)
  const handleBulkUpload = async () => {
    if (!editingManhwa) return;
    if (bulkUploadFiles.length === 0 && !bulkUploadDriveLink) {
      toast.error(language === 'ar' ? 'يرجى إرفاق ملفات أو رابط درايف' : 'Please attach files or a Drive link');
      return;
    }
    setBulkUploadUploading(true);
    setBulkUploadProgress({ current: 0, total: 1 });
    try {
      const formData = new FormData();
      formData.append('manhwaId', editingManhwa.id);
      if (bulkUploadDriveLink) {
        formData.append('driveLink', bulkUploadDriveLink);
      } else if (bulkUploadFiles.length === 1 && bulkUploadFiles[0].name.match(/\.(zip|rar|7z)$/i)) {
        formData.append('zipFile', bulkUploadFiles[0]);
      } else {
        for (const file of bulkUploadFiles) {
          formData.append('imageFiles', file);
        }
      }
      const res = await fetch('/api/automation/quick-chapter-upload', { method: 'POST', body: formData });
      const data = await res.json();
      setBulkUploadUploading(false);
      setBulkUploadModal(false);
      setBulkUploadFiles([]);
      setBulkUploadDriveLink('');
      if (data.success) {
        toast.success(language === 'ar' ? 'تم الرفع بنجاح!' : 'Upload successful!');
        // Refresh chapters
        if (editingManhwa) {
          const chapSnap = await getDocs(query(collection(db, 'manhwas', editingManhwa.id, 'chapters'), orderBy('number', 'asc')));
          setManhwaChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } else {
        toast.error(data.error || (language === 'ar' ? 'حدث خطأ أثناء الرفع' : 'Upload failed'));
      }
    } catch (err) {
      setBulkUploadUploading(false);
      toast.error(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
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
            const allowedRoles = ['founder', 'admin', 'staff', 'staff_plus', 'moderator', 'analyst'];
            setIsAdmin(allowedRoles.includes(userData.role) || user.email === 'me.rayq0001@gmail.com');
          } else {
            // User document might not exist yet if they just signed up
            setIsAdmin(user.email === 'me.rayq0001@gmail.com');
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

  const ROLES = [
    { value: 'user', label: language === 'ar' ? 'عضو' : 'User', color: 'bg-neutral-500/10 text-neutral-400' },
    { value: 'staff', label: language === 'ar' ? 'ستاف' : 'Staff', color: 'bg-emerald-500/10 text-emerald-400' },
    { value: 'staff_plus', label: language === 'ar' ? 'ستاف+' : 'Staff+', color: 'bg-teal-500/10 text-teal-400' },
    { value: 'moderator', label: language === 'ar' ? 'مشرف' : 'Moderator', color: 'bg-blue-500/10 text-blue-400' },
    { value: 'analyst', label: language === 'ar' ? 'محلل' : 'Analyst', color: 'bg-amber-500/10 text-amber-400' },
    { value: 'admin', label: language === 'ar' ? 'أدمن' : 'Admin', color: 'bg-purple-500/10 text-purple-400' },
    { value: 'founder', label: language === 'ar' ? 'المؤسس' : 'Founder', color: 'bg-rose-500/10 text-rose-400' },
  ];

  const FOUNDER_EMAIL = 'me.rayq0001@gmail.com';

  const handleSetRole = async (userId: string, newRole: string) => {
    if (newRole === 'founder') {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser?.email !== FOUNDER_EMAIL) return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setRolePickerUserId(null);
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
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-white/[0.06] border-t-white rounded-full" />
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

  // Role-based tab permissions
  const ROLE_TAB_ACCESS: Record<string, string[]> = {
    founder:    ['overview', 'manhwas', 'users', 'comments', 'analytics', 'schedule', 'reports', 'automation', 'settings'],
    admin:      ['overview', 'manhwas', 'users', 'comments', 'analytics', 'schedule', 'reports', 'automation', 'settings'],
    moderator:  ['overview', 'manhwas', 'users', 'comments', 'analytics', 'schedule', 'reports', 'automation', 'settings'],
    analyst:    ['overview', 'analytics', 'schedule'],
    staff_plus: ['overview', 'manhwas', 'comments', 'reports'],
    staff:      ['overview', 'manhwas'],
  };

  const userRole = currentUser?.role || 'user';
  const allowedTabs = currentUser?.email === 'me.rayq0001@gmail.com'
    ? ['overview', 'manhwas', 'users', 'comments', 'analytics', 'schedule', 'reports', 'automation', 'settings']
    : (ROLE_TAB_ACCESS[userRole] || []);

  const ALL_NAV_ITEMS = [
    { id: 'overview' as const, icon: LayoutDashboard, label: language === 'ar' ? 'الرئيسية' : 'Overview' },
    { id: 'manhwas' as const, icon: BookOpen, label: language === 'ar' ? 'المانهوات' : 'Manhwas' },
    { id: 'users' as const, icon: Users, label: language === 'ar' ? 'المستخدمين' : 'Users' },
    { id: 'comments' as const, icon: MessageSquare, label: language === 'ar' ? 'التعليقات' : 'Comments' },
    { id: 'analytics' as const, icon: TrendingUp, label: language === 'ar' ? 'التحليلات' : 'Analytics' },
    { id: 'schedule' as const, icon: Calendar, label: language === 'ar' ? 'الجدول' : 'Schedule' },
    { id: 'reports' as const, icon: AlertTriangle, label: language === 'ar' ? 'البلاغات' : 'Reports', badge: reports.length },
    { id: 'automation' as const, icon: Cpu, label: language === 'ar' ? 'الأتمتة' : 'Automation' },
    { id: 'settings' as const, icon: Settings, label: language === 'ar' ? 'الإعدادات' : 'Settings' },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter(tab => allowedTabs.includes(tab.id));

  // Mobile bottom nav: show first 5 items
  const MOBILE_NAV = NAV_ITEMS.slice(0, 5);

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col md:flex-row" dir={dir}>

      {/* ═══════════════════════ DESKTOP SIDEBAR ═══════════════════════ */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 h-screen bg-gradient-to-b from-[#080808] to-[#040404] border-r border-white/[0.03]">
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black" style={{ background: 'var(--accent-color)' }}>
              <Shield size={15} />
            </div>
            <div>
              <h2 className="font-black text-[13px] tracking-tight">Aniverse</h2>
              <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-[0.25em]">{language === 'ar' ? 'لوحة التحكم' : 'DASHBOARD'}</p>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pt-4 pb-2">
          <p className="px-3 mb-2.5 text-[8px] font-bold uppercase tracking-[0.3em] text-neutral-700">{language === 'ar' ? 'القائمة' : 'MENU'}</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 relative ${
                  activeTab === tab.id
                    ? 'text-white font-black'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-lg border border-white/[0.04]" style={{ background: 'rgba(var(--accent-rgb), 0.08)' }} transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />
                )}
                <tab.icon size={16} className="relative z-10 shrink-0" style={activeTab === tab.id ? { color: 'var(--accent-color)' } : {}} />
                <span className="text-[12px] font-bold relative z-10 flex-1 text-left">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="relative z-10 text-[8px] font-black min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-500/20 text-red-400">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User card */}
        <div className="p-3 m-3 mt-0 rounded-xl bg-white/[0.02] border border-white/[0.03]">
          <div className="flex items-center gap-2.5">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} className="w-7 h-7 rounded-md object-cover shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-color)' }}>
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="font-bold text-[11px] truncate">{currentUser?.name}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest truncate" style={currentUser?.role === 'founder' ? { color: '#f43f5e' } : { color: '#525252' }}>{currentUser?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════ MOBILE MORE MENU ═══════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0c0c] border-t border-white/[0.05] rounded-t-3xl max-h-[70vh] overflow-hidden"
            >
              <div className="w-8 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-2" />

              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-3 mx-4 mb-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-color)' }}>
                    {currentUser?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-sm truncate text-white">{currentUser?.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={currentUser?.role === 'founder' ? { color: '#f43f5e' } : { color: '#525252' }}>{currentUser?.role || 'user'}</p>
                </div>
              </div>

              <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(70vh - 110px)' }}>
                <p className="px-2 mb-2 text-[8px] font-bold uppercase tracking-[0.3em] text-neutral-700">{language === 'ar' ? 'كل الأقسام' : 'ALL SECTIONS'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {NAV_ITEMS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                        activeTab === tab.id ? 'text-white' : 'text-neutral-500'
                      }`}
                      style={activeTab === tab.id ? { background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.15)' } : { background: 'rgba(255,255,255,0.02)' }}
                    >
                      <tab.icon size={20} style={activeTab === tab.id ? { color: 'var(--accent-color)' } : {}} />
                      <span className="text-[10px] font-black">{tab.label}</span>
                      {tab.badge && tab.badge > 0 && (
                        <span className="absolute top-2 right-2 text-[7px] font-black min-w-[14px] h-3.5 flex items-center justify-center px-1 rounded-full bg-red-500 text-white">{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="mt-4 pt-3 border-t border-white/[0.03]">
                  <button onClick={() => { window.location.href = '/'; }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] active:bg-white/[0.05] transition-all">
                    <Globe size={16} className="text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-400">{language === 'ar' ? 'العودة للموقع' : 'Go to Site'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <main className="flex-1 overflow-y-auto h-full no-scrollbar bg-black pb-28 md:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-black/60 backdrop-blur-2xl border-b border-white/[0.03]">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 md:hidden" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
                  {(() => { const ActiveIcon = NAV_ITEMS.find(t => t.id === activeTab)?.icon || LayoutDashboard; return <ActiveIcon size={14} style={{ color: 'var(--accent-color)' }} />; })()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl font-black tracking-tight truncate">
                    {activeTab === 'overview' && (language === 'ar' ? 'لوحة التحكم' : 'Dashboard')}
                    {activeTab === 'analytics' && (language === 'ar' ? 'التحليلات' : 'Analytics')}
                    {activeTab === 'schedule' && (language === 'ar' ? 'جدول التنزيلات' : 'Schedule')}
                    {activeTab === 'users' && (language === 'ar' ? 'المستخدمين' : 'Users')}
                    {activeTab === 'comments' && (language === 'ar' ? 'التعليقات' : 'Comments')}
                    {activeTab === 'reports' && (language === 'ar' ? 'البلاغات' : 'Reports')}
                    {activeTab === 'settings' && (language === 'ar' ? 'الإعدادات' : 'Settings')}
                    {activeTab === 'manhwas' && (language === 'ar' ? 'المانهوات' : 'Manhwas')}
                    {activeTab === 'automation' && (language === 'ar' ? 'الأتمتة' : 'Automation')}
                  </h1>
                  <p className="text-[9px] text-neutral-600 font-medium hidden md:block mt-0.5">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="relative p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg text-neutral-500 hover:text-white transition-all active:scale-90">
                <Bell size={16} />
                {reports.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-black" />}
              </button>
              <button onClick={() => window.location.href = '/'} className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg font-bold text-[11px] text-neutral-400 hover:text-white transition-all">
                <Globe size={14} />
                <span>{language === 'ar' ? 'الموقع' : 'Site'}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-6 py-4 md:py-5" onClick={() => rolePickerUserId && setRolePickerUserId(null)}>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-5 pb-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: language === 'ar' ? 'المستخدمين' : 'Users', value: stats.totalUsers, icon: Users, gradient: 'from-blue-600/20 to-blue-600/0', accent: '#3b82f6' },
                  { label: language === 'ar' ? 'التعليقات' : 'Comments', value: stats.totalComments, icon: MessageSquare, gradient: 'from-emerald-600/20 to-emerald-600/0', accent: '#10b981' },
                  { label: language === 'ar' ? 'البلاغات' : 'Reports', value: stats.pendingReports, icon: AlertTriangle, gradient: 'from-red-600/20 to-red-600/0', accent: '#ef4444' },
                  { label: language === 'ar' ? 'الجدد اليوم' : 'New Today', value: stats.newUsersToday, icon: UserCheck, gradient: 'from-purple-600/20 to-purple-600/0', accent: '#a855f7' }
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`relative overflow-hidden bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] hover:border-white/[0.08] transition-all group`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <stat.icon size={18} style={{ color: stat.accent }} className="opacity-70" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">{stat.label}</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black">{stat.value}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Charts & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
                {/* Main Chart */}
                <div className="lg:col-span-3 bg-[#0a0a0a] rounded-2xl border border-white/[0.04] p-4 md:p-6 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm md:text-base font-black">{language === 'ar' ? 'نمو المنصة' : 'Platform Growth'}</h3>
                    <select className="bg-white/5 border border-white/[0.04] text-[10px] font-bold rounded-lg px-2.5 py-1.5 outline-none text-neutral-400">
                      <option className="bg-black">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
                      <option className="bg-black">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
                    </select>
                  </div>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff20" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff20" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="users" name={language === 'ar' ? 'المستخدمين' : 'Users'} stroke="var(--accent-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-[#0a0a0a] rounded-2xl border border-white/[0.04] p-4 md:p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm md:text-base font-black">{language === 'ar' ? 'تنزيلات اليوم' : "Today's Releases"}</h3>
                    <button onClick={() => setActiveTab('schedule')} className="text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-80" style={{ color: 'var(--accent-color)' }}>
                      {language === 'ar' ? 'الكل' : 'View All'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 max-h-[300px]">
                    {(() => {
                      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                      const todayManhwas = manhwasList.filter(m => m.releaseSchedule?.includes(today));
                      if (todayManhwas.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-neutral-600 py-10">
                            <Calendar size={28} className="mb-2 opacity-30" />
                            <p className="text-[11px] font-bold">{language === 'ar' ? 'لا يوجد فصول اليوم' : 'No chapters today'}</p>
                          </div>
                        );
                      }
                      return todayManhwas.map(manhwa => (
                        <div key={manhwa.id} className="flex items-center gap-3 p-2.5 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-all">
                          <img src={manhwa.coverImage} className="w-9 h-9 object-cover rounded-lg shrink-0" alt="" />
                          <div className="overflow-hidden flex-1">
                            <p className="font-bold text-xs truncate">{manhwa.title}</p>
                            <p className="text-[9px] text-neutral-600 font-medium">{manhwa.staffName || '---'}</p>
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
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4 pb-8">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className={`absolute ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-neutral-600`} size={16} />
                  <input type="text" placeholder={language === 'ar' ? 'البحث عن مستخدم...' : 'Search users...'} className={`w-full bg-[#0a0a0a] border border-white/[0.04] rounded-xl py-3 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm focus:outline-none focus:border-white/[0.06] transition-all`} />
                </div>
                <button className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border border-white/[0.04] rounded-xl font-bold text-xs text-neutral-500 hover:bg-white/[0.04] transition-all shrink-0">
                  <Filter size={15} />
                  <span className="hidden sm:inline">{language === 'ar' ? 'تصفية' : 'Filter'}</span>
                </button>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-[#0a0a0a] rounded-2xl border border-white/[0.04]">
                <table className="w-full text-left" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{language === 'ar' ? 'الدور' : 'Role'}</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {users.map((user, userIndex) => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={user.avatarUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                            <div>
                              <p className="font-bold text-sm">{user.name}</p>
                              <p className="text-[10px] text-neutral-600 truncate max-w-[180px]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setRolePickerUserId(rolePickerUserId === user.id ? null : user.id); }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all hover:ring-1 hover:ring-white/10 ${
                                ROLES.find(r => r.value === user.role)?.color || 'bg-white/5 text-neutral-500'
                              }`}>
                              {ROLES.find(r => r.value === user.role)?.label || user.role}
                              <ChevronDown size={12} className={`transition-transform ${rolePickerUserId === user.id ? 'rotate-180' : ''}`} />
                            </button>
                            {rolePickerUserId === user.id && (
                              <div className={`absolute ${dir === 'rtl' ? 'right-0' : 'left-0'} z-50 bg-[#111] border border-white/[0.08] rounded-xl shadow-xl shadow-black/50 py-1 min-w-[140px] ${userIndex >= users.length - 3 ? 'bottom-full mb-1' : 'top-full mt-1'}`} onClick={e => e.stopPropagation()}>
                                {ROLES.filter(role => role.value !== 'founder' || user.email === FOUNDER_EMAIL).map(role => (
                                  <button key={role.value} onClick={() => handleSetRole(user.id, role.value)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-all hover:bg-white/[0.06] ${user.role === role.value ? 'text-white bg-white/[0.04]' : 'text-neutral-400'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      role.value === 'founder' ? 'bg-rose-400' : role.value === 'admin' ? 'bg-purple-400' : role.value === 'moderator' ? 'bg-blue-400' : role.value === 'analyst' ? 'bg-amber-400' : role.value === 'staff_plus' ? 'bg-teal-400' : role.value === 'staff' ? 'bg-emerald-400' : 'bg-neutral-500'
                                    }`} />
                                    {role.label}
                                    {user.role === role.value && <Check size={12} className="ml-auto" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1.5 text-[11px] font-bold ${user.isBanned ? 'text-red-400' : 'text-emerald-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${user.isBanned ? 'bg-red-400' : 'bg-emerald-400'}`} />
                            {user.isBanned ? (language === 'ar' ? 'محظور' : 'Banned') : (language === 'ar' ? 'نشط' : 'Active')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleBanUser(user.id, user.isBanned)} className={`p-1.5 rounded-lg transition-all ${user.isBanned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}>
                              {user.isBanned ? <UserCheck size={15} /> : <Ban size={15} />}
                            </button>
                            <button onClick={() => fetchUserAnalytics(user)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                              <Search size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ type: 'user', id: user.id })} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="bg-[#0a0a0a] rounded-xl border border-white/[0.04] p-3.5">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{user.name}</p>
                          <span className={`flex items-center gap-1 text-[9px] font-bold shrink-0 ${user.isBanned ? 'text-red-400' : 'text-emerald-400'}`}>
                            <div className={`w-1 h-1 rounded-full ${user.isBanned ? 'bg-red-400' : 'bg-emerald-400'}`} />
                            {user.isBanned ? (language === 'ar' ? 'محظور' : 'Banned') : (language === 'ar' ? 'نشط' : 'Active')}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-600 truncate mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    {/* Role selector */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.03]">
                      <p className="text-[9px] font-bold uppercase text-neutral-600 mb-1.5">{language === 'ar' ? 'الرتبة' : 'Role'}</p>
                      <div className="flex flex-wrap gap-1">
                        {ROLES.filter(role => role.value !== 'founder' || user.email === FOUNDER_EMAIL).map(role => (
                          <button key={role.value} onClick={() => handleSetRole(user.id, role.value)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                              user.role === role.value
                                ? `${role.color} border-current`
                                : 'bg-white/[0.02] border-white/[0.04] text-neutral-600 hover:bg-white/[0.05]'
                            }`}>
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 mt-2.5 pt-2.5 border-t border-white/[0.03]">
                      <button onClick={() => handleBanUser(user.id, user.isBanned)} className={`p-2 rounded-lg text-xs font-bold transition-all ${user.isBanned ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {user.isBanned ? <UserCheck size={15} /> : <Ban size={15} />}
                      </button>
                      <button onClick={() => fetchUserAnalytics(user)} className="p-2 text-blue-400 bg-blue-500/10 rounded-lg transition-all">
                        <Search size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'user', id: user.id })} className="p-2 text-red-400 bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: language === 'ar' ? 'إجمالي المانهوات' : 'Manhwas', value: stats.totalManhwas || 0, accent: '#3b82f6' },
                  { label: language === 'ar' ? 'إجمالي الفصول' : 'Chapters', value: stats.totalChapters || 0, accent: '#10b981' },
                  { label: language === 'ar' ? 'إجمالي المشاهدات' : 'Views', value: stats.totalViews || 0, accent: '#a855f7' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/[0.04]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2">{s.label}</p>
                    <h3 className="text-3xl font-black" style={{ color: s.accent }}>{s.value}</h3>
                  </div>
                ))}
              </div>
              <div className="bg-[#0a0a0a] p-4 md:p-6 rounded-2xl border border-white/[0.04]">
                <h3 className="text-sm font-black mb-4">{language === 'ar' ? 'المانهوات الأكثر مشاهدة' : 'Most Viewed'}</h3>
                <div className="space-y-2">
                  {stats.mostViewed?.map((manhwa: any, i: number) => (
                    <div key={manhwa.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-all">
                      <span className="font-black text-neutral-700 text-xs w-5 shrink-0">{i + 1}</span>
                      <img src={manhwa.coverImage} className="w-9 h-12 object-cover rounded-lg shrink-0" alt="" />
                      <p className="font-bold text-sm flex-1 truncate">{manhwa.title}</p>
                      <p className="text-xs font-bold text-neutral-500 shrink-0">{manhwa.views}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'schedule' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {DAYS.map((day) => {
                  const dayManhwas = manhwasList.filter(m => m.releaseSchedule?.includes(day.id));
                  return (
                    <div key={day.id} className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-3">
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.03]">
                        <div className="flex items-center gap-2.5">
                          <Calendar size={15} className="text-neutral-600" />
                          <h3 className="text-sm font-black">{language === 'ar' ? day.label.ar : day.label.en}</h3>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-600 px-1.5 py-0.5 bg-white/[0.03] rounded-md">{dayManhwas.length}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {dayManhwas.map((manhwa) => (
                          <div key={manhwa.id} className="flex items-center gap-3 p-2.5 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-all group">
                            <img src={manhwa.coverImage} className="w-9 h-12 object-cover rounded-lg shrink-0" alt="" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{manhwa.title}</p>
                              <p className="text-[9px] text-neutral-600">{manhwa.staffName || '---'}</p>
                            </div>
                            <span className="text-[9px] text-neutral-700">{manhwa.status}</span>
                          </div>
                        ))}
                        {dayManhwas.length === 0 && (
                          <div className="py-5 text-center border border-dashed border-white/[0.04] rounded-xl">
                            <p className="text-[10px] text-neutral-700 font-bold">{language === 'ar' ? 'لا توجد مانهوا مجدولة' : 'No scheduled manhwas'}</p>
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
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-3 pb-8">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-[#0a0a0a] p-4 rounded-2xl border border-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <img src={comment.userAvatar} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm">{comment.userName}</h4>
                        {!comment.isApproved && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[8px] font-bold uppercase rounded">
                            {language === 'ar' ? 'معلق' : 'Pending'}
                          </span>
                        )}
                        <span className="text-[9px] text-neutral-700">{new Date(comment.createdAt?.toDate()).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{comment.content}</p>
                      {comment.media && comment.media.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {comment.media.map((url: string, i: number) => (
                            <img key={i} src={url} className="w-14 h-14 rounded-lg object-cover border border-white/[0.04] shrink-0" alt="" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.03]">
                    {!comment.isApproved && (
                      <button onClick={() => handleApproveComment(comment.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-bold rounded-lg text-[10px] hover:bg-emerald-500/20 transition-all">
                        <CheckCircle size={13} />
                        <span>{language === 'ar' ? 'موافقة' : 'Approve'}</span>
                      </button>
                    )}
                    <button onClick={() => setDeleteConfirm({ type: 'comment', id: comment.id })} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 font-bold rounded-lg text-[10px] hover:bg-red-500/20 transition-all">
                      <Trash2 size={13} />
                      <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                    </button>
                    <button onClick={() => handlePinComment(comment.id, !comment.isPinned)} className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg text-[10px] transition-all ${comment.isPinned ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06]'}`}>
                      <Pin size={13} className={comment.isPinned ? 'fill-current' : ''} />
                      <span>{comment.isPinned ? (language === 'ar' ? 'إلغاء' : 'Unpin') : (language === 'ar' ? 'تثبيت' : 'Pin')}</span>
                    </button>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-14 bg-[#0a0a0a] rounded-2xl border border-dashed border-white/[0.06]">
                  <MessageSquare size={28} className="mx-auto text-neutral-800 mb-2" />
                  <p className="text-xs text-neutral-600 font-bold">{language === 'ar' ? 'لا توجد تعليقات' : 'No comments'}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-3 pb-8">
              {reports.map((report) => (
                <div key={report.id} className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm">{report.reason}</h3>
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[8px] font-bold uppercase rounded">{report.status}</span>
                      </div>
                      <p className="text-[10px] text-neutral-600 mt-0.5">{language === 'ar' ? 'بواسطة:' : 'By:'} {report.reporterName}</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl">
                    <p className="text-xs text-neutral-400 leading-relaxed">{report.commentContent}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleResolveReport(report.id, 'delete')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 font-bold rounded-lg text-[10px] hover:bg-red-500/20 transition-all">
                      <Trash2 size={13} />
                      <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                    </button>
                    <button onClick={() => handleResolveReport(report.id, 'ban')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-neutral-400 font-bold rounded-lg text-[10px] hover:bg-white/10 transition-all">
                      <Ban size={13} />
                      <span>{language === 'ar' ? 'حظر' : 'Ban'}</span>
                    </button>
                    <button onClick={() => handleResolveReport(report.id, 'dismiss')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] text-neutral-500 font-bold rounded-lg text-[10px] hover:bg-white/[0.06] transition-all">
                      <XCircle size={13} />
                      <span>{language === 'ar' ? 'تجاهل' : 'Dismiss'}</span>
                    </button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-14 bg-[#0a0a0a] rounded-2xl border border-dashed border-white/[0.06]">
                  <CheckCircle size={28} className="mx-auto text-neutral-800 mb-2" />
                  <p className="text-xs text-neutral-600 font-bold">{language === 'ar' ? 'لا توجد بلاغات' : 'No pending reports'}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl pb-8">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] p-4 md:p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <Lock size={16} className="text-neutral-500" />
                    <h3 className="font-black text-sm">{language === 'ar' ? 'الرقابة التلقائية' : 'Auto-Moderation'}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'الكلمات المحظورة' : 'Banned Words'}</label>
                    <textarea 
                      value={siteSettings?.bannedWords?.join(', ') || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, bannedWords: e.target.value.split(',').map(s => s.trim()) })}
                      className="w-full bg-black border border-white/[0.06] rounded-xl p-3.5 min-h-[100px] text-sm focus:outline-none focus:border-white/[0.06] transition-all text-neutral-300"
                      placeholder="word1, word2, word3..."
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] rounded-xl">
                    <div>
                      <p className="font-bold text-sm">{language === 'ar' ? 'الموافقة التلقائية' : 'Auto-Approve Comments'}</p>
                      <p className="text-[10px] text-neutral-600 mt-0.5">{language === 'ar' ? 'نشر التعليقات مباشرة' : 'Publish comments without review'}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSiteSettings({ ...siteSettings, autoApprove: !siteSettings.autoApprove })}
                      className={`w-10 h-5 rounded-full relative transition-all duration-300 ${siteSettings?.autoApprove ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                    >
                      <motion.div animate={{ x: siteSettings?.autoApprove ? 22 : 3 }} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] p-4 md:p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className="text-neutral-500" />
                    <h3 className="font-black text-sm">{language === 'ar' ? 'إعدادات عامة' : 'General Settings'}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'اسم الموقع' : 'Site Name'}</label>
                      <input type="text" value={siteSettings?.siteName || ''} onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })} className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'البريد الإلكتروني' : 'Support Email'}</label>
                      <input type="email" value={siteSettings?.supportEmail || ''} onChange={(e) => setSiteSettings({ ...siteSettings, supportEmail: e.target.value })} className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="flex items-center justify-center gap-2 w-full md:w-auto md:ml-auto px-8 py-3 font-black text-sm rounded-xl transition-all" style={{ background: 'var(--accent-color)', color: '#000' }}>
                  <Save size={16} />
                  <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'manhwas' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4 pb-8">

              {/* Top Bar */}
              <div className="flex items-center justify-between">
                {manhwaView !== 'list' && (
                  <button onClick={() => { setManhwaView('list'); setManhwaForm(null); setAnilistData(null); setEditingManhwa(null); setAnilistSearch(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-bold text-xs transition-all">
                    <ChevronRight size={15} className={language === 'ar' ? '' : 'rotate-180'} />
                    <span>{language === 'ar' ? 'العودة' : 'Back'}</span>
                  </button>
                )}
                {manhwaView === 'list' && (
                  <button onClick={() => { setManhwaView('add'); setManhwaForm(null); setAnilistData(null); setEditingManhwa(null); }}
                    className="flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl transition-all" style={{ background: 'var(--accent-color)', color: '#000' }}>
                    <Plus size={15} />
                    <span>{language === 'ar' ? 'إضافة مانهوا' : 'Add Manhwa'}</span>
                  </button>
                )}
              </div>

              {/* LIST VIEW */}
              {manhwaView === 'list' && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search size={15} className={`absolute ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-neutral-600`} />
                    <input
                      type="text"
                      value={manhwaSearchQuery}
                      onChange={(e) => setManhwaSearchQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'ابحث عن مانهوا...' : 'Search manhwa...'}
                      className={`w-full bg-[#0a0a0a] border border-white/[0.04] rounded-xl py-3 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm focus:outline-none focus:border-white/[0.06] transition-all`}
                    />
                    {manhwaSearchQuery && (
                      <button onClick={() => setManhwaSearchQuery('')} className={`absolute ${dir === 'rtl' ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors`}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {manhwasList.filter(m => {
                    if (!manhwaSearchQuery.trim()) return true;
                    const q = manhwaSearchQuery.toLowerCase();
                    return (m.title || '').toLowerCase().includes(q) || 
                           (m.titleEn || '').toLowerCase().includes(q) || 
                           (m.originalTitle || '').toLowerCase().includes(q) ||
                           (m.author || '').toLowerCase().includes(q);
                  }).map((manhwa) => (
                    <div key={manhwa.id} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden group hover:border-white/[0.08] transition-all">
                      <div className="relative h-28 overflow-hidden">
                        <img src={manhwa.bannerImage || manhwa.coverImage} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-end gap-2.5">
                          <img src={manhwa.coverImage} className="w-11 h-16 object-cover rounded-lg border-2 border-[#0a0a0a] shrink-0" alt="" />
                          <div className="overflow-hidden pb-0.5">
                            <p className="font-bold text-xs truncate">{manhwa.title}</p>
                            <p className="text-[9px] text-neutral-500 truncate">{manhwa.author || '---'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            manhwa.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-400' : 
                            manhwa.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>{manhwa.status}</span>
                          {manhwa.releaseSchedule?.slice(0, 3).map((day: string) => (
                            <span key={day} className="px-1.5 py-0.5 bg-white/[0.03] rounded text-[8px] font-medium text-neutral-600">
                              {DAYS.find(d => d.id === day)?.[language === 'ar' ? 'label' : 'label']?.[language] || day}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => startEditManhwa(manhwa)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg font-bold text-[10px] transition-all">
                            <Edit3 size={12} />
                            <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                          </button>
                          <button onClick={() => setQuickUploadModal({ manhwaId: manhwa.id, manhwaTitle: manhwa.title })}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 rounded-lg font-bold text-[10px] transition-all">
                            <Upload size={12} />
                          </button>
                          <button onClick={() => setMergeModal({ manhwaId: manhwa.id, manhwaTitle: manhwa.title })}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 rounded-lg font-bold text-[10px] transition-all">
                            <Zap size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: 'manhwa', id: manhwa.id })}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/15 rounded-lg transition-all ml-auto">
                            <Trash2 size={13} />
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
                    <div className="col-span-full text-center py-10 bg-[#0a0a0a] rounded-2xl border border-dashed border-white/[0.06]">
                      <Search size={24} className="mx-auto text-neutral-800 mb-2" />
                      <p className="text-xs text-neutral-600 font-bold">{language === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
                    </div>
                  )}
                  {manhwasList.length === 0 && !manhwaSearchQuery && (
                    <div className="col-span-full text-center py-14 bg-[#0a0a0a] rounded-2xl border border-dashed border-white/[0.06]">
                      <BookOpen size={28} className="mx-auto text-neutral-800 mb-2" />
                      <p className="text-xs text-neutral-600 font-bold">{language === 'ar' ? 'لا توجد مانهوات بعد' : 'No manhwas yet'}</p>
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* ADD VIEW */}
              {manhwaView === 'add' && (
                <div className="space-y-6">
                  {/* AniList Search */}
                  <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Search size={16} className="text-blue-400" />
                      <h3 className="font-black text-sm">{language === 'ar' ? 'البحث من AniList' : 'Search AniList'}</h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={anilistSearch}
                        onChange={e => setAnilistSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchAnilist()}
                        placeholder={language === 'ar' ? 'اكتب اسم المانهوا...' : 'Type manhwa name...'}
                        className="flex-1 bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                      />
                      <button onClick={searchAnilist} disabled={anilistLoading || !anilistSearch.trim()}
                        className="px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-sm">
                        {anilistLoading ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
                        <span className="hidden sm:inline">{language === 'ar' ? 'بحث' : 'Search'}</span>
                      </button>
                    </div>
                  </div>

                  {manhwaForm && (
                    <div className="space-y-4">
                      {/* Preview Banner + Cover */}
                      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="relative h-36 md:h-48">
                          <img src={manhwaForm.bannerImage || manhwaForm.coverImage} className="w-full h-full object-cover opacity-60" alt="" />
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column – Info */}
                        <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-4">
                          <h3 className="font-black text-sm flex items-center gap-2">
                            <FileText size={15} className="text-neutral-600" />
                            {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}
                          </h3>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                              <input type="text" value={manhwaForm.title} onChange={e => setManhwaForm({ ...manhwaForm, title: e.target.value })}
                                className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'المؤلف' : 'Author'}</label>
                                <input type="text" value={manhwaForm.author} onChange={e => setManhwaForm({ ...manhwaForm, author: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الرسام' : 'Artist'}</label>
                                <input type="text" value={manhwaForm.artist} onChange={e => setManhwaForm({ ...manhwaForm, artist: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الناشر' : 'Publisher'}</label>
                                <input type="text" value={manhwaForm.publisher || ''} onChange={e => setManhwaForm({ ...manhwaForm, publisher: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'تاريخ النشر' : 'Release Date'}</label>
                                <input type="date" value={manhwaForm.releaseDate} onChange={e => setManhwaForm({ ...manhwaForm, releaseDate: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                              <select value={manhwaForm.status} onChange={e => setManhwaForm({ ...manhwaForm, status: e.target.value })}
                                className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all">
                                <option value="ongoing" className="bg-black">{language === 'ar' ? 'مستمرة' : 'Ongoing'}</option>
                                <option value="completed" className="bg-black">{language === 'ar' ? 'مكتملة' : 'Completed'}</option>
                                <option value="hiatus" className="bg-black">{language === 'ar' ? 'متوقفة' : 'Hiatus'}</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'النبذة (عربي)' : 'Synopsis (Arabic)'}</label>
                              <textarea value={manhwaForm.description} onChange={e => setManhwaForm({ ...manhwaForm, description: e.target.value })}
                                rows={4}
                                className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all resize-none" />
                            </div>
                          </div>
                        </div>

                        {/* Right Column – Images + Schedule + Staff */}
                        <div className="space-y-6">
                          {/* Images */}
                          <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-5">
                            <h3 className="font-black text-sm flex items-center gap-2">
                              <Image size={18} className="text-neutral-500" />
                              {language === 'ar' ? 'الصور' : 'Images'}
                            </h3>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رابط الغلاف' : 'Cover URL'}</label>
                                <input type="text" value={manhwaForm.coverImage} onChange={e => setManhwaForm({ ...manhwaForm, coverImage: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رابط البنر' : 'Banner URL'}</label>
                                <input type="text" value={manhwaForm.bannerImage} onChange={e => setManhwaForm({ ...manhwaForm, bannerImage: e.target.value })}
                                  className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                              </div>
                              <button type="button" onClick={() => setManhwaForm({ ...manhwaForm, bannerImage: manhwaForm.coverImage })}
                                className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                {language === 'ar' ? '← استخدم الغلاف كبنر' : '← Use cover as banner'}
                              </button>
                            </div>
                          </div>

                          {/* Weekly Schedule */}
                          <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-5">
                            <h3 className="font-black text-sm flex items-center gap-2">
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
                          <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-5">
                            <h3 className="font-black text-sm flex items-center gap-2">
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
                        className="w-full py-3.5 text-black font-black rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-3 text-base" style={{ background: 'var(--accent-color)' }}>
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
                  <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
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
                    <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-5">
                      <h3 className="font-black text-sm flex items-center gap-2">
                        <FileText size={18} className="text-neutral-500" />
                        {language === 'ar' ? 'المعلومات' : 'Info'}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                          <input type="text" value={manhwaForm.title} onChange={e => setManhwaForm({ ...manhwaForm, title: e.target.value })}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'المؤلف' : 'Author'}</label>
                            <input type="text" value={manhwaForm.author} onChange={e => setManhwaForm({ ...manhwaForm, author: e.target.value })}
                              className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الرسام' : 'Artist'}</label>
                            <input type="text" value={manhwaForm.artist} onChange={e => setManhwaForm({ ...manhwaForm, artist: e.target.value })}
                              className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الناشر' : 'Publisher'}</label>
                            <input type="text" value={manhwaForm.publisher || ''} onChange={e => setManhwaForm({ ...manhwaForm, publisher: e.target.value })}
                              className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'تاريخ النشر' : 'Release Date'}</label>
                            <input type="date" value={manhwaForm.releaseDate} onChange={e => setManhwaForm({ ...manhwaForm, releaseDate: e.target.value })}
                              className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                          <select value={manhwaForm.status} onChange={e => setManhwaForm({ ...manhwaForm, status: e.target.value })}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all">
                            <option value="ongoing" className="bg-black">{language === 'ar' ? 'مستمرة' : 'Ongoing'}</option>
                            <option value="completed" className="bg-black">{language === 'ar' ? 'مكتملة' : 'Completed'}</option>
                            <option value="hiatus" className="bg-black">{language === 'ar' ? 'متوقفة' : 'Hiatus'}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'النبذة' : 'Synopsis'}</label>
                          <textarea value={manhwaForm.description} onChange={e => setManhwaForm({ ...manhwaForm, description: e.target.value })}
                            rows={4}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all resize-none" />
                        </div>

                        {/* Images */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رابط الغلاف' : 'Cover URL'}</label>
                          <input type="text" value={manhwaForm.coverImage} onChange={e => setManhwaForm({ ...manhwaForm, coverImage: e.target.value })}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رابط البنر' : 'Banner URL'}</label>
                          <input type="text" value={manhwaForm.bannerImage} onChange={e => setManhwaForm({ ...manhwaForm, bannerImage: e.target.value })}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-white/15 outline-none transition-all" />
                        </div>
                        <button type="button" onClick={() => setManhwaForm({ ...manhwaForm, bannerImage: manhwaForm.coverImage })}
                          className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
                          {language === 'ar' ? '← استخدم الغلاف كبنر' : '← Use cover as banner'}
                        </button>

                        {/* Schedule */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'موعد التنزيل الأسبوعي' : 'Weekly Schedule'}</label>
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
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'الأعضاء المسؤولون' : 'Assigned Staff'}</label>
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
                        className="w-full py-3 text-black font-black rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2" style={{ background: 'var(--accent-color)' }}>
                        {savingManhwa ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save size={16} />}
                        <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
                      </button>
                    </div>

                    {/* Right – Chapters */}
                    <div className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm flex items-center gap-2">
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
                          <div key={ch.id} className="bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/15 transition-all overflow-hidden">
                            {editingChapterId === ch.id ? (
                              /* Editing mode */
                              <div className="p-3 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{ch.number}</span>
                                  <input type="text" value={editChapterTitle} onChange={e => setEditChapterTitle(e.target.value)}
                                    placeholder={ch.title || (language === 'ar' ? `الفصل ${ch.number}` : `Chapter ${ch.number}`)}
                                    className="flex-1 bg-black border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none transition-all" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => editChapterFileRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-white/5 text-[10px] font-black text-neutral-400 transition-all">
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
                                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 font-black rounded-lg text-xs transition-all">
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
                          <div className="text-center py-10 border border-dashed border-white/[0.04] rounded-2xl">
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
                        ? tab.color === 'blue'    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/10'
                        : tab.color === 'purple'  ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/10'
                        :                          'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/10'
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
                    <motion.div key="scraper" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0"><Download size={20} /></div>
                        <div>
                          <h3 className="font-black text-sm">{language === 'ar' ? 'أدوات السحب' : 'Scraper'}</h3>
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
                            <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'المعرّف ID' : 'Series ID'}</label>
                            <input type="text" value={automationSeriesId} onChange={e => setAutomationSeriesId(e.target.value)}
                              className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                              placeholder={language === 'ar' ? 'مثلاً: 848496' : 'e.g. 848496'} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'من فصل' : 'From'}</label>
                              <input type="number" min="1" value={automationStartChapter} onChange={e => setAutomationStartChapter(e.target.value)}
                                className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-blue-500/50 outline-none transition-all" placeholder="1" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'إلى فصل' : 'To'}</label>
                              <input type="number" min="1" value={automationEndChapter} onChange={e => setAutomationEndChapter(e.target.value)}
                                className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-blue-500/50 outline-none transition-all" placeholder="5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رابط المانهوا' : 'Manhwa URL'}</label>
                          <input type="text" value={automationUrl} onChange={e => setAutomationUrl(e.target.value)}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-blue-500/50 outline-none transition-all" placeholder="https://..." />
                        </div>
                      )}

                      <button onClick={() => startAutomation('scrape')} disabled={isScrapeActionDisabled}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10">
                        {isAutomationRunning
                          ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          : <Zap size={16} />}
                        <span>{language === 'ar' ? 'بدء السحب' : 'Start Scraping'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* AI */}
                  {activeAutomationSection === 'ai' && (
                    <motion.div key="ai" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center shrink-0"><Cpu size={20} /></div>
                        <div>
                          <h3 className="font-black text-sm">{language === 'ar' ? 'معالجة الذكاء الاصطناعي' : 'AI Processing'}</h3>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'تبييض · ترجمة · OCR' : 'In-paint · Translate · OCR'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-2">
                          <Eraser size={18} className="text-yellow-400" />
                          <p className="font-black text-sm">{language === 'ar' ? 'التبييض' : 'In-painting'}</p>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'تنظيف الفقاعات' : 'Clean bubbles'}</p>
                        </div>
                        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-2">
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
                        className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/10">
                        {isAutomationRunning || automationReadiness.loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Terminal size={16} />}
                        <span>{language === 'ar' ? 'تشغيل خط الإنتاج' : 'Run Pipeline'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* STAFF */}
                  {activeAutomationSection === 'staff' && (
                    <motion.div key="staff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-white/[0.04] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0"><Upload size={20} /></div>
                        <div>
                          <h3 className="font-black text-sm">{language === 'ar' ? 'تسليم أعمال الستاف' : 'Staff Delivery'}</h3>
                          <p className="text-[10px] text-neutral-500">{language === 'ar' ? 'ZIP أو رابط درايف' : 'ZIP or Drive link'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'معرف المانهوا' : 'Manhwa ID'}</label>
                          <input type="text" value={manhwaName} onChange={e => setManhwaName(e.target.value)}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                            placeholder="solo-leveling" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest">{language === 'ar' ? 'رقم الفصل' : 'Chapter #'}</label>
                          <input type="text" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)}
                            className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                            placeholder="1" />
                        </div>
                      </div>
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/[0.06] rounded-2xl hover:border-white/30 hover:bg-white/[0.04] transition-all cursor-pointer group">
                        <Upload className="w-7 h-7 mb-2 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                        <p className="text-xs font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors">
                          {staffFile ? staffFile.name : (language === 'ar' ? 'اضغط لاختيار ملف ZIP' : 'Click to select ZIP')}
                        </p>
                        <input type="file" accept=".zip" className="hidden" onChange={e => setStaffFile(e.target.files?.[0] || null)} />
                      </label>
                      <div className="text-center text-neutral-600 font-black text-[10px] uppercase">— {language === 'ar' ? 'أو' : 'or'} —</div>
                      <input type="text" value={staffDriveLink} onChange={e => setStaffDriveLink(e.target.value)}
                        className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all"
                        placeholder="https://drive.google.com/drive/folders/..." />
                      <button onClick={startStaffPublishing} disabled={isAutomationRunning || (!staffFile && !staffDriveLink)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10">
                        {isAutomationRunning ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                        <span>{language === 'ar' ? 'تسليم ونشر' : 'Publish & Sync'}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* Progress + Logs */}
                  <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                    <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.03] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Terminal size={13} className="text-neutral-500 shrink-0" />
                        <span className="text-[10px] font-bold uppercase text-neutral-600 tracking-widest truncate">
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
                  <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden h-full min-h-[400px] flex flex-col">
                    <div className="px-5 py-4 bg-white/[0.03] border-b border-white/[0.03] flex items-center justify-between">
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
        </div>
      </main>

      {/* ═══════════════════════ MOBILE BOTTOM TAB BAR ═══════════════════════ */}
      <div className="fixed bottom-3 left-3 right-3 z-30 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <nav className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl px-1 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-around py-1">
            {MOBILE_NAV.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all active:scale-90 ${
                  activeTab === tab.id ? 'text-white' : 'text-neutral-600'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div layoutId="mobile-active" className="absolute inset-0 rounded-xl" style={{ background: 'rgba(var(--accent-rgb), 0.12)' }} transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <tab.icon size={18} className="relative z-10" style={activeTab === tab.id ? { color: 'var(--accent-color)' } : {}} />
                <span className="text-[8px] font-bold relative z-10">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-1 right-1 z-20 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-neutral-600 active:scale-90 transition-all"
            >
              <Menu size={18} />
              <span className="text-[8px] font-bold">{language === 'ar' ? 'المزيد' : 'More'}</span>
            </button>
          </div>
        </nav>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] p-5 md:p-6 rounded-2xl border border-white/[0.06] w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">{selectedUser.name}</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-white/[0.03] rounded-lg transition-all"><X size={18} className="text-neutral-500" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: language === 'ar' ? 'التعليقات' : 'Comments', value: userAnalytics?.commentsCount || 0 },
                { label: language === 'ar' ? 'المشاهدات' : 'Views', value: userAnalytics?.viewsCount || 0 },
                { label: language === 'ar' ? 'المانهوات' : 'Manhwas', value: userAnalytics?.manhwasCount || 0 },
                { label: language === 'ar' ? 'الفصول' : 'Chapters', value: userAnalytics?.chaptersCount || 0 },
              ].map((s, i) => (
                <div key={i} className="bg-white/[0.03] p-3 rounded-xl">
                  <p className="text-neutral-600 text-[9px] font-bold uppercase">{s.label}</p>
                  <h3 className="text-xl font-black">{s.value}</h3>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-bold text-xs mb-2">{language === 'ar' ? 'آخر التعليقات' : 'Recent Comments'}</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {userAnalytics?.recentComments.map((c: any, i: number) => (
                  <p key={i} className="text-xs bg-white/[0.03] p-2.5 rounded-lg text-neutral-400">{c.content}</p>
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
              onClick={() => { if (!quickUploadUploading) { setQuickUploadModal(null); setQuickUploadFiles([]); setQuickUploadDriveLink(''); } }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 md:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
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
                <button onClick={() => { if (!quickUploadUploading) { setQuickUploadModal(null); setQuickUploadFiles([]); setQuickUploadDriveLink(''); } }} className="p-2 hover:bg-white/[0.03] rounded-xl transition-all">
                  <X size={18} className="text-neutral-400" />
                </button>
              </div>

              {/* Chapter Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'رقم الفصل *' : 'Chapter # *'}</label>
                  <input type="number" placeholder="1" className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'عنوان الفصل' : 'Title (optional)'}</label>
                  <input type="text" placeholder={language === 'ar' ? 'اختياري' : 'Optional'} className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                </div>
              </div>

              {/* Upload Methods */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'طريقة الرفع' : 'Upload Method'}</p>
                
                {/* File/Folder Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => quickUploadFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <Image size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">{language === 'ar' ? 'صور' : 'Images'}</span>
                  </button>
                  <input ref={quickUploadFileRef} type="file" multiple accept="image/*,.zip,.rar,.7z" className="hidden" onChange={handleQuickUploadFileChange} />
                  
                  <button
                    onClick={() => quickUploadFolderRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <FileText size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">{language === 'ar' ? 'مجلد' : 'Folder'}</span>
                  </button>
                  <input ref={quickUploadFolderRef} type="file" {...{ webkitdirectory: '', directory: '' } as any} className="hidden" onChange={handleQuickUploadFileChange} />
                  
                  <button
                    onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.zip,.rar,.7z'; input.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) setQuickUploadFiles([f]); }; input.click(); }}
                    className="flex flex-col items-center gap-2 p-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <Download size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-black text-neutral-400 group-hover:text-white">ZIP</span>
                  </button>
                </div>

                {/* Drive Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe size={12} />
                    {language === 'ar' ? 'أو رابط Google Drive' : 'Or Google Drive Link'}
                  </label>
                  <input 
                    type="url" 
                    value={quickUploadDriveLink} 
                    onChange={(e) => setQuickUploadDriveLink(e.target.value)} 
                    placeholder="https://drive.google.com/..." 
                    className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" 
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
                disabled={quickUploadUploading || (quickUploadFiles.length === 0 && !quickUploadDriveLink)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10"
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

      {/* Chapter Merge Modal */}
      <AnimatePresence>
        {mergeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !merging && setMergeModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 md:p-6 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-white">{language === 'ar' ? 'دمج الفصول' : 'Merge Chapters'}</h3>
                  <p className="text-[10px] text-neutral-500 font-bold truncate max-w-[200px]">{mergeModal.manhwaTitle}</p>
                </div>
                <button onClick={() => !merging && setMergeModal(null)} className="p-2 hover:bg-white/[0.03] rounded-xl transition-all">
                  <X size={18} className="text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'أرقام الفصول المصدر (مفصولة بفواصل)' : 'Source chapter numbers (comma-separated)'}</label>
                  <input
                    type="text"
                    value={mergeSourceChapters.join(', ')}
                    onChange={(e) => setMergeSourceChapters(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder={language === 'ar' ? 'مثال: 1, 2, 3' : 'e.g. 1, 2, 3'}
                    className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'رقم الفصل الهدف *' : 'Target Chapter # *'}</label>
                    <input type="number" value={mergeTargetNumber} onChange={(e) => setMergeTargetNumber(e.target.value)} placeholder="1" className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{language === 'ar' ? 'العنوان' : 'Title (optional)'}</label>
                    <input type="text" value={mergeTargetTitle} onChange={(e) => setMergeTargetTitle(e.target.value)} placeholder={language === 'ar' ? 'اختياري' : 'Optional'} className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all" />
                  </div>
                </div>

                {mergeSourceChapters.length >= 2 && (
                  <div className="bg-blue-500/10 text-blue-400 rounded-2xl p-3 text-xs font-bold">
                    {language === 'ar' 
                      ? `سيتم دمج ${mergeSourceChapters.length} فصول (${mergeSourceChapters.join(' + ')}) → فصل ${mergeTargetNumber || '?'}`
                      : `Will merge ${mergeSourceChapters.length} chapters (${mergeSourceChapters.join(' + ')}) → Chapter ${mergeTargetNumber || '?'}`}
                  </div>
                )}
              </div>

              <button
                onClick={handleMergeChapters}
                disabled={merging || mergeSourceChapters.length < 2 || !mergeTargetNumber}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10"
              >
                {merging ? (
                  <><Cpu size={18} className="animate-spin" /> <span>{language === 'ar' ? 'جاري الدمج...' : 'Merging...'}</span></>
                ) : (
                  <><Zap size={18} /> <span>{language === 'ar' ? 'دمج الفصول' : 'Merge Chapters'}</span></>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal - Only two options: Computer or Drive Link */}
      <AnimatePresence>
        {bulkUploadModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !bulkUploadUploading && setBulkUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm flex items-center gap-2">
                  <Upload size={18} className="text-blue-400" />
                  {language === 'ar' ? 'رفع فصول بالجملة' : 'Bulk Chapter Upload'}
                </h3>
                <button onClick={() => !bulkUploadUploading && setBulkUploadModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
              </div>
              <p className="text-xs text-neutral-500 font-bold">{language === 'ar' ? 'اختر طريقة الرفع: من الكمبيوتر أو رابط Google Drive.' : 'Choose upload method: from computer or Google Drive link.'}</p>

              <div className="space-y-4">
                {/* Upload from computer */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Image size={14} />
                    {language === 'ar' ? 'من الكمبيوتر' : 'From Computer'}
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.zip,.rar,.7z"
                    className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all mt-2"
                    onChange={e => setBulkUploadFiles(Array.from(e.target.files || []))}
                  />
                  {bulkUploadFiles && bulkUploadFiles.length > 0 && (
                    <div className="mt-2 text-xs text-neutral-400">
                      {bulkUploadFiles.length} {language === 'ar' ? 'ملف' : 'file(s)'}
                    </div>
                  )}
                </div>

                {/* Or Google Drive link */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe size={14} />
                    {language === 'ar' ? 'أو رابط Google Drive' : 'Or Google Drive Link'}
                  </label>
                  <input
                    type="url"
                    value={bulkUploadDriveLink}
                    onChange={e => setBulkUploadDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-black border border-white/[0.06] rounded-xl p-3 text-sm focus:outline-none focus:border-white/[0.06] transition-all mt-2"
                    dir="ltr"
                  />
                </div>
              </div>

              {bulkUploadUploading && (
                <div className="space-y-2">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${bulkUploadProgress.total > 0 ? (bulkUploadProgress.current / bulkUploadProgress.total) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-bold text-center">
                    {language === 'ar' ? `جاري الرفع...` : `Uploading...`}
                  </p>
                </div>
              )}

              <button
                onClick={handleBulkUpload}
                disabled={bulkUploadUploading || (!bulkUploadFiles?.length && !bulkUploadDriveLink)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all text-sm shadow-md shadow-blue-600/10">
                {bulkUploadUploading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Upload size={18} />}
                <span>{bulkUploadUploading
                  ? (language === 'ar' ? `جاري الرفع...` : `Uploading...`)
                  : (language === 'ar' ? `رفع` : `Upload`)}</span>
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
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 md:p-6 shadow-xl text-center space-y-5"
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
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md shadow-red-600/10 transition-all"
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
