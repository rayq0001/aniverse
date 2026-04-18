
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, ThumbsUp, ThumbsDown, Reply, Flag, 
  Trash2, Pin, CheckCircle, Shield, Award,
  Image as ImageIcon, Youtube, Search, ChevronDown, ChevronUp, X, Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth, db, handleFirestoreError, OperationType, onPresenceChange } from '../firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  increment, getDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

interface Comment {
  id: string;
  manhwaId: string;
  chapterId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  content: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  isPinned: boolean;
  isApproved: boolean;
  media: string[];
  createdAt: any;
}

interface CommentSectionProps {
  manhwaId: string;
  chapterId?: string;
}

const CommentItem: React.FC<{
  comment: Comment;
  replies: Comment[];
  onReply: (parentId: string, content: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, isPinned: boolean) => void;
  onReport: (id: string, reason: string) => void;
  isAdmin: boolean;
  allComments: Comment[];
  currentUserId?: string;
}> = ({ comment, replies, onReply, onLike, onDislike, onDelete, onPin, onReport, isAdmin, allComments, currentUserId }) => {
  const { t, language } = useLanguage();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!comment.userId) return;
    const unsub = onPresenceChange(comment.userId, setIsOnline);
    return () => unsub();
  }, [comment.userId]);

  const getReplies = (parentId: string) => allComments.filter(c => c.parentId === parentId);

  const renderMedia = (content: string) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
    const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/g;

    const youtubeMatches = content.matchAll(youtubeRegex);
    const imageMatches = content.matchAll(imageRegex);

    const embeds = [];

    for (const match of youtubeMatches) {
      const videoId = match[1].split('&')[0];
      embeds.push(
        <div key={videoId} className="mt-4 aspect-video rounded-xl overflow-hidden border border-white/10">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    }

    for (const match of imageMatches) {
      embeds.push(
        <img 
          key={match[0]} 
          src={match[0]} 
          alt="Comment attachment" 
          className="mt-4 max-h-96 rounded-xl object-contain border border-white/10"
          referrerPolicy="no-referrer"
        />
      );
    }

    return embeds;
  };

  return (
    <div className={`relative ${comment.parentId ? 'ml-6 md:ml-10 mt-3 border-l border-white/[0.06] pl-4' : 'mt-5'}`}>
      <div className={`group relative p-3 rounded-xl transition-colors ${comment.isPinned ? 'bg-white/[0.04] border border-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
        {comment.isPinned && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 mb-2">
            <Pin size={10} className="fill-current" />
            <span>{t('pinned_comment')}</span>
          </div>
        )}

        <div className="flex gap-3">
          <div className="shrink-0 cursor-pointer relative" onClick={() => comment.userId && window.location.assign(`#/user/${comment.userId}`)}>
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/[0.06]">
              {comment.userAvatar ? (
                <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{comment.userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-neutral-900 ${isOnline ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="font-bold text-sm text-white hover:text-neutral-300 cursor-pointer transition-colors"
                  onClick={() => comment.userId && window.location.assign(`#/user/${comment.userId}`)}
                >{comment.userName}</span>
                {comment.userRole && comment.userRole !== 'user' && (
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                    comment.userRole === 'admin' ? 'bg-red-500 text-white' :
                    comment.userRole === 'moderator' ? 'bg-purple-500 text-white' :
                    comment.userRole.startsWith('staff') ? 'bg-emerald-500 text-white' :
                    'bg-white text-black'
                  }`}>
                    <Shield size={8} />
                    {comment.userRole.replace('_', ' ')}
                  </span>
                )}
                {comment.userRole === 'verified' && (
                  <CheckCircle size={14} className="text-blue-400" />
                )}
                <span className="text-[10px] text-neutral-500 font-bold">
                  {comment.createdAt?.toDate().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && (
                  <button 
                    onClick={() => onPin(comment.id, !comment.isPinned)}
                    className={`p-1.5 rounded-lg transition-colors ${comment.isPinned ? 'text-white bg-white/10' : 'text-neutral-500 hover:bg-white/10'}`}
                    title={comment.isPinned ? t('unpin') : t('pin')}
                  >
                    <Pin size={16} />
                  </button>
                )}
                {(isAdmin || currentUserId === comment.userId) && (
                  <button 
                    onClick={() => onDelete(comment.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="relative">
                  <button 
                    onClick={() => setShowReportOptions(!showReportOptions)}
                    className={`p-1.5 rounded-lg transition-colors ${showReportOptions ? 'text-yellow-500 bg-yellow-500/10' : 'text-neutral-500 hover:text-yellow-500 hover:bg-yellow-500/10'}`}
                    title={t('report')}
                  >
                    <Flag size={16} />
                  </button>
                  
                  <AnimatePresence>
                    {showReportOptions && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={`absolute bottom-full mb-2 ${language === 'ar' ? 'left-0' : 'right-0'} w-44 bg-black border border-white/[0.08] rounded-lg p-1.5 shadow-xl z-50`}
                      >
                        <p className="text-[9px] font-bold text-neutral-500 px-2 py-1.5 border-b border-white/[0.04] mb-0.5">{t('reason')}</p>
                        {[
                          { id: 'offensive_content', label: t('offensive_content') },
                          { id: 'spam', label: t('spam') },
                          { id: 'spoiler', label: t('spoiler') },
                          { id: 'other', label: t('other') }
                        ].map(reason => (
                          <button
                            key={reason.id}
                            onClick={() => {
                              onReport(comment.id, reason.label);
                              setShowReportOptions(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/[0.06] text-xs transition-colors"
                            style={{ textAlign: language === 'ar' ? 'right' : 'left' }}
                          >
                            {reason.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="text-sm text-neutral-300 leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
              {renderMedia(comment.content)}
              {comment.media && comment.media.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {comment.media.map((url, idx) => (
                    <div key={idx} className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-white/10">
                      <img src={url} alt="comment media" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={() => onLike(comment.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors text-neutral-400 hover:text-white"
                >
                  <ThumbsUp size={12} />
                  <span className="text-[10px] font-bold">{comment.likes}</span>
                </button>
                <button 
                  onClick={() => onDislike(comment.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors text-neutral-400 hover:text-white"
                >
                  <ThumbsDown size={12} />
                  <span className="text-[10px] font-bold">{comment.dislikes}</span>
                </button>
              </div>

              <button 
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors text-neutral-400 hover:text-white"
              >
                <Reply size={12} />
                <span className="text-[10px] font-bold">{t('reply')}</span>
              </button>

              {replies.length > 0 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors text-neutral-400 hover:text-white"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span className="text-[10px] font-bold">{replies.length} {t('replies')}</span>
                </button>
              )}
            </div>

            <AnimatePresence>
              {showReplyForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t('write_reply')}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-lg p-3 text-sm focus:outline-none focus:border-white/[0.15] transition-colors min-h-[70px] resize-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (replyContent.trim()) {
                          onReply(comment.id, replyContent);
                          setReplyContent('');
                          setShowReplyForm(false);
                        }
                      }}
                      className="self-end p-2.5 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                replies={getReplies(reply.id)}
                onReply={onReply}
                onLike={onLike}
                onDislike={onDislike}
                onDelete={onDelete}
                onPin={onPin}
                onReport={onReport}
                isAdmin={isAdmin}
                allComments={allComments}
                currentUserId={currentUserId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ manhwaId, chapterId }) => {
  const { t, language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'gif'>('image');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File is too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedMedia(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role || 'user';
          setIsAdmin(user.email === 'me.rayq0001@gmail.com');
          setUserRole(role);
        }
      }
    });

    const settingsUnsub = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSiteSettings(doc.data());
      }
    });

    const q = query(
      collection(db, 'comments'),
      where('manhwaId', '==', manhwaId),
      ...(chapterId ? [where('chapterId', '==', chapterId)] : []),
      orderBy('isPinned', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubComments = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'comments');
    });

    return () => {
      unsubAuth();
      unsubComments();
      settingsUnsub();
    };
  }, [manhwaId, chapterId]);

  const handleSubmit = async (parentId: string | null = null, content: string = newComment) => {
    if (!currentUser) return;
    if (!content.trim()) return;

    // Auto-moderation
    let isApproved = siteSettings?.autoApprove ?? true;
    if (siteSettings?.bannedWords) {
      const hasBannedWord = siteSettings.bannedWords.some((word: string) => 
        content.toLowerCase().includes(word.toLowerCase())
      );
      if (hasBannedWord) {
        isApproved = false;
      }
    }

    try {
      await addDoc(collection(db, 'comments'), {
        manhwaId,
        chapterId: chapterId || null,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: currentUser.photoURL || '',
        userRole: userRole,
        content,
        parentId,
        likes: 0,
        dislikes: 0,
        isPinned: false,
        isApproved,
        media: selectedMedia,
        createdAt: serverTimestamp()
      });
      if (!parentId) {
        setNewComment('');
        setSelectedMedia([]);
      }
      if (!isApproved) {
        toast.success(language === 'ar' ? 'تم إرسال تعليقك للمراجعة' : 'Your comment has been sent for review');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  };

  const handleLike = async (id: string) => {
    try {
      await updateDoc(doc(db, 'comments', id), { likes: increment(1) });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const handleDislike = async (id: string) => {
    try {
      await updateDoc(doc(db, 'comments', id), { dislikes: increment(1) });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'comments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `comments/${id}`);
    }
  };

  const handlePin = async (id: string, isPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'comments', id), { isPinned });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const handleReport = async (id: string, reason: string) => {
    if (!currentUser) return;
    const commentToReport = comments.find(c => c.id === id);
    try {
      await addDoc(collection(db, 'reports'), {
        commentId: id,
        commentContent: commentToReport?.content || '',
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || 'User',
        reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success(t('report_submitted'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
    }
  };

  const filteredComments = comments
    .filter(c => 
      (c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (isAdmin || c.isApproved || c.userId === currentUser?.uid)
    )
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sortBy === 'popular') {
        return (b.likes - b.dislikes) - (a.likes - a.dislikes);
      }
      return 0; // Already sorted by createdAt desc in Firestore query
    });

  const rootComments = filteredComments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => filteredComments.filter(c => c.parentId === parentId);

  return (
    <div className="mt-8 border-t border-white/[0.04] pt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-neutral-400" />
          <h2 className="text-base font-bold">{t('comments')} ({comments.length})</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_comments')}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-white/[0.15] transition-colors w-44"
            />
          </div>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg py-1.5 px-3 text-xs font-bold focus:outline-none focus:border-white/[0.15] transition-colors"
          >
            <option value="newest">{t('newest')}</option>
            <option value="popular">{t('popular')}</option>
          </select>
        </div>
      </div>

      {currentUser ? (
        <div className="mb-8 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/[0.06]">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{currentUser.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('write_comment_placeholder')}
                className="w-full bg-transparent border-none text-white placeholder:text-neutral-500 focus:ring-0 resize-none min-h-[80px] text-sm"
              />

              {selectedMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-3">
                  {selectedMedia.map((media, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-white/[0.06]">
                      <img src={media} alt="preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelectedMedia(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={uploadType === 'gif' ? 'image/gif' : 'image/*'}
                  />
                  <button 
                    onClick={() => {
                      setUploadType('image');
                      setTimeout(() => fileInputRef.current?.click(), 0);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 transition-colors" 
                    title="Add Image"
                  >
                    <ImageIcon size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setUploadType('gif');
                      setTimeout(() => fileInputRef.current?.click(), 0);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 transition-colors" 
                    title="Add GIF"
                  >
                    <Film size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      const url = prompt(language === 'ar' ? 'أدخل رابط يوتيوب:' : 'Enter YouTube URL:');
                      if (url) setNewComment(prev => prev + `\n${url}`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 transition-colors" 
                    title="Add YouTube Video"
                  >
                    <Youtube size={16} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 transition-colors" title="Markdown Support">
                    <Award size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => handleSubmit()}
                  disabled={!newComment.trim()}
                  className="bg-white text-black px-5 py-2 rounded-lg font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs"
                >
                  <Send size={14} />
                  {t('post_comment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12 p-8 rounded-[2rem] border border-dashed border-white/10 text-center">
          <p className="text-neutral-500 font-bold mb-4">{t('login_to_comment')}</p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
            className="bg-white text-black px-8 py-3 rounded-2xl font-black hover:bg-neutral-200 transition-all active:scale-95"
          >
            {t('login')}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : rootComments.length > 0 ? (
          rootComments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              replies={getReplies(comment.id)}
              onReply={(parentId, content) => handleSubmit(parentId, content)}
              onLike={handleLike}
              onDislike={handleDislike}
              onDelete={handleDelete}
              onPin={handlePin}
              onReport={handleReport}
              isAdmin={isAdmin}
              allComments={filteredComments}
              currentUserId={currentUser?.uid}
            />
          ))
        ) : (
          <div className="text-center py-20">
            <MessageSquare size={48} className="mx-auto text-neutral-800 mb-4" />
            <p className="text-neutral-500 font-bold">{t('no_comments_yet')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
