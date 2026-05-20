import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight, Save, 
  Type, Move, Type as FontIcon, AlignCenter, AlignLeft, AlignRight, Bold, Info, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../firebase';

interface VisualTypesetterProps {
  manhwaId: string;
  chapter: any;
  onClose: () => void;
  language: 'ar' | 'en';
}

interface TextBox {
  id: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  w: number; // percentage (0 to 100)
  h: number; // percentage (0 to 100)
  text: string;
  translation: string;
  fontSize: number; // in pt
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  align: 'center' | 'left' | 'right';
  fontWeight: 'normal' | 'bold';
}

export default function VisualTypesetter({ manhwaId, chapter, onClose, language }: VisualTypesetterProps) {
  const images = chapter.images || chapter.pages || [];
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ boxId: string; startX: number; startY: number; boxX: number; boxY: number } | null>(null);
  const resizeStartRef = useRef<{ boxId: string; startX: number; startY: number; boxW: number; boxH: number } | null>(null);

  const selectedPageUrl = images[selectedPageIdx] || '';
  const selectedPageName = selectedPageUrl.split('/').pop() || `page-${selectedPageIdx + 1}.webp`;

  // Fetch page image dimensions for scaling text
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 1200 });

  useEffect(() => {
    // Reset boxes on page change
    setBoxes([]);
    setSelectedBoxId(null);
  }, [selectedPageIdx]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgNaturalSize({ w: naturalWidth, h: naturalHeight });
  };

  // Run AI Text detection and translation using Gemini
  const runAiDetection = async () => {
    setLoading(true);
    const toastId = toast.loading(language === 'ar' ? 'جاري الكشف والترجمة بالذكاء الاصطناعي...' : 'AI detecting and translating text...');
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/automation/detect-text-boxes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          manhwaId,
          chapterNumber: chapter.number,
          pageName: selectedPageName
        })
      });
      const data = await response.json();
      if (data.success && data.boxes) {
        toast.dismiss(toastId);
        toast.success(language === 'ar' ? 'تم التعرف على النصوص بنجاح' : 'Text areas detected successfully');
        
        // Convert yMin, xMin, yMax, xMax (0-1000) to percentages
        const newBoxes: TextBox[] = data.boxes.map((box: any, idx: number) => {
          const x = box.xMin / 10;
          const y = box.yMin / 10;
          const w = (box.xMax - box.xMin) / 10;
          const h = (box.yMax - box.yMin) / 10;
          
          return {
            id: `box_${Date.now()}_${idx}`,
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
            w: Math.max(5, Math.min(100, w)),
            h: Math.max(3, Math.min(100, h)),
            text: box.text || '',
            translation: box.translation || '',
            fontSize: 20,
            fontFamily: 'Cairo',
            color: '#000000',
            strokeColor: '#ffffff',
            strokeWidth: 4,
            align: 'center',
            fontWeight: 'bold'
          };
        });
        setBoxes(newBoxes);
      } else {
        toast.dismiss(toastId);
        toast.error(data.error || 'Failed to detect');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const addCustomBox = () => {
    const newBox: TextBox = {
      id: `box_${Date.now()}`,
      x: 35,
      y: 40,
      w: 30,
      h: 15,
      text: 'New Text',
      translation: language === 'ar' ? 'نص جديد' : 'New dialogue text',
      fontSize: 22,
      fontFamily: 'Cairo',
      color: '#000000',
      strokeColor: '#ffffff',
      strokeWidth: 4,
      align: 'center',
      fontWeight: 'bold'
    };
    setBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  };

  const deleteBox = (id: string) => {
    setBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const updateBoxProperty = (id: string, key: keyof TextBox, value: any) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, [key]: value } : b));
  };

  // Drag logic
  const handleDragStart = (e: React.MouseEvent, box: TextBox) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBoxId(box.id);
    dragStartRef.current = {
      boxId: box.id,
      startX: e.clientX,
      startY: e.clientY,
      boxX: box.x,
      boxY: box.y
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    const { boxId, startX, startY, boxX, boxY } = dragStartRef.current;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
    const deltaY = ((e.clientY - startY) / containerRect.height) * 100;

    setBoxes(prev => prev.map(b => {
      if (b.id === boxId) {
        return {
          ...b,
          x: Math.max(0, Math.min(100 - b.w, boxX + deltaX)),
          y: Math.max(0, Math.min(100 - b.h, boxY + deltaY))
        };
      }
      return b;
    }));
  };

  const handleDragEnd = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // Resize logic
  const handleResizeStart = (e: React.MouseEvent, box: TextBox) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBoxId(box.id);
    resizeStartRef.current = {
      boxId: box.id,
      startX: e.clientX,
      startY: e.clientY,
      boxW: box.w,
      boxH: box.h
    };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeStartRef.current || !containerRef.current) return;
    const { boxId, startX, startY, boxW, boxH } = resizeStartRef.current;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaW = ((e.clientX - startX) / containerRect.width) * 100;
    const deltaH = ((e.clientY - startY) / containerRect.height) * 100;

    setBoxes(prev => prev.map(b => {
      if (b.id === boxId) {
        return {
          ...b,
          w: Math.max(5, Math.min(100 - b.x, boxW + deltaW)),
          h: Math.max(3, Math.min(100 - b.y, boxH + deltaH))
        };
      }
      return b;
    }));
  };

  const handleResizeEnd = () => {
    resizeStartRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Render text boxes on canvas and upload typeset image
  const savePage = async () => {
    if (!imageRef.current) return;
    setSaving(true);
    const toastId = toast.loading(language === 'ar' ? 'جاري دمج النصوص وحفظ الصفحة...' : 'Rendering and saving page...');

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const img = imageRef.current;
      canvas.width = imgNaturalSize.w;
      canvas.height = imgNaturalSize.h;

      // Draw original image as background
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw each text box
      boxes.forEach(box => {
        const absX = (box.x / 100) * canvas.width;
        const absY = (box.y / 100) * canvas.height;
        const absW = (box.w / 100) * canvas.width;
        const absH = (box.h / 100) * canvas.height;

        // Configure font styling
        ctx.fillStyle = box.color;
        ctx.font = `${box.fontWeight} ${box.fontSize}px "${box.fontFamily}", Cairo, sans-serif`;
        ctx.textBaseline = 'top';

        // Alignment coordinate adjustment
        let textX = absX;
        if (box.align === 'center') {
          ctx.textAlign = 'center';
          textX = absX + absW / 2;
        } else if (box.align === 'right') {
          ctx.textAlign = 'right';
          textX = absX + absW;
        } else {
          ctx.textAlign = 'left';
        }

        // Draw wrapped lines
        const lineHeight = box.fontSize * 1.3;
        const text = box.translation || '';
        
        // Wrap text algorithm
        const words = text.split(/\s+/);
        let line = '';
        let lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          let metrics = ctx.measureText(testLine);
          if (metrics.width > absW && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        // Vertical centering alignment
        const totalTextHeight = lines.length * lineHeight;
        let startY = absY + (absH - totalTextHeight) / 2;
        if (startY < absY) startY = absY; // clamp top

        lines.forEach((lineText, index) => {
          const drawY = startY + (index * lineHeight);
          // Apply white outline (stroke) for better contrast on colorful manga pages
          if (box.strokeWidth > 0) {
            ctx.strokeStyle = box.strokeColor;
            ctx.lineWidth = box.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(lineText, textX, drawY);
          }
          ctx.fillText(lineText, textX, drawY);
        });
      });

      // Export canvas image
      const imageData = canvas.toDataURL('image/webp', 0.95);

      // Save to server
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/automation/save-typeset-page', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          manhwaId,
          chapterNumber: chapter.number,
          pageName: selectedPageName,
          imageData
        })
      });

      const resData = await response.json();
      if (resData.success) {
        toast.dismiss(toastId);
        toast.success(language === 'ar' ? 'تم حفظ الصفحة بنجاح!' : 'Page saved successfully!');
      } else {
        toast.dismiss(toastId);
        toast.error(resData.error || 'Failed to save page');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Error occurred');
    } finally {
      setSaving(false);
    }
  };

  const selectedBox = boxes.find(b => b.id === selectedBoxId);

  return (
    <div className="fixed inset-0 z-50 flex bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar - Settings & File Info */}
      <div className="w-[380px] shrink-0 bg-neutral-900 border-r border-white/5 flex flex-col h-full z-10 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg"><Sparkles size={16} /></span>
            <div>
              <h2 className="text-sm font-black">{language === 'ar' ? 'محرر الترجمة والتبييض' : 'Visual Typesetter'}</h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Ch.{chapter.number} • Page {selectedPageIdx + 1}/{images.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Selected Box Editing controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {selectedBox ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Type size={12} className="text-purple-400" />
                  {language === 'ar' ? 'تعديل مربع النص' : 'Edit Text Box'}
                </h3>
                <button onClick={() => deleteBox(selectedBox.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-all">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Text Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'النص الأصلي' : 'Original Text'}</label>
                <div className="p-2 bg-black/30 border border-white/5 rounded-lg text-xs text-neutral-400 break-all select-all font-mono">
                  {selectedBox.text || '(no text detected)'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'الترجمة العربية' : 'Arabic Translation'}</label>
                <textarea
                  value={selectedBox.translation}
                  onChange={(e) => updateBoxProperty(selectedBox.id, 'translation', e.target.value)}
                  dir="rtl"
                  rows={3}
                  className="w-full p-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm font-bold focus:border-purple-500 focus:outline-none transition-all placeholder-neutral-700"
                  placeholder="اكتب الترجمة هنا..."
                />
              </div>

              {/* Style parameters */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'حجم الخط' : 'Font Size'}</label>
                  <input
                    type="number"
                    value={selectedBox.fontSize}
                    min={10}
                    max={120}
                    onChange={(e) => updateBoxProperty(selectedBox.id, 'fontSize', parseInt(e.target.value) || 20)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-white/10 rounded-lg text-xs text-center font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'نوع الخط' : 'Font Family'}</label>
                  <select
                    value={selectedBox.fontFamily}
                    onChange={(e) => updateBoxProperty(selectedBox.id, 'fontFamily', e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-white/10 rounded-lg text-xs font-bold"
                  >
                    <option value="Cairo">Cairo</option>
                    <option value="Amiri">Amiri</option>
                    <option value="Reem Kufi">Reem Kufi</option>
                    <option value="Tajawal">Tajawal</option>
                    <option value="sans-serif">System Sans</option>
                  </select>
                </div>
              </div>

              {/* Align, Style & Colors */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">{language === 'ar' ? 'تنسيق النص' : 'Text Options'}</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateBoxProperty(selectedBox.id, 'align', 'left')}
                    className={`p-2 rounded-lg transition-all ${selectedBox.align === 'left' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => updateBoxProperty(selectedBox.id, 'align', 'center')}
                    className={`p-2 rounded-lg transition-all ${selectedBox.align === 'center' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    onClick={() => updateBoxProperty(selectedBox.id, 'align', 'right')}
                    className={`p-2 rounded-lg transition-all ${selectedBox.align === 'right' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                  >
                    <AlignRight size={14} />
                  </button>
                  <button
                    onClick={() => updateBoxProperty(selectedBox.id, 'fontWeight', selectedBox.fontWeight === 'bold' ? 'normal' : 'bold')}
                    className={`p-2 rounded-lg transition-all ml-auto ${selectedBox.fontWeight === 'bold' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                  >
                    <Bold size={14} />
                  </button>
                </div>
              </div>

              {/* Text Color & Stroke/Outline */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'لون النص' : 'Text Color'}</label>
                  <div className="flex items-center gap-2 bg-neutral-950 p-1.5 border border-white/10 rounded-lg">
                    <input
                      type="color"
                      value={selectedBox.color}
                      onChange={(e) => updateBoxProperty(selectedBox.id, 'color', e.target.value)}
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
                    />
                    <span className="text-[10px] font-mono select-all uppercase">{selectedBox.color}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'لون الإطار' : 'Outline Color'}</label>
                  <div className="flex items-center gap-2 bg-neutral-950 p-1.5 border border-white/10 rounded-lg">
                    <input
                      type="color"
                      value={selectedBox.strokeColor}
                      onChange={(e) => updateBoxProperty(selectedBox.id, 'strokeColor', e.target.value)}
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
                    />
                    <span className="text-[10px] font-mono select-all uppercase">{selectedBox.strokeColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{language === 'ar' ? 'عرض الإطار (Outline)' : 'Outline Size'}</label>
                  <span className="text-[10px] font-bold text-neutral-400">{selectedBox.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={selectedBox.strokeWidth}
                  onChange={(e) => updateBoxProperty(selectedBox.id, 'strokeWidth', parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          ) : (
            <div className="h-48 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-4">
              <Info size={24} className="text-neutral-600 mb-2" />
              <p className="text-xs text-neutral-500 font-bold">
                {language === 'ar' ? 'انقر على أي مربع نص لبدء التعديل أو قم بإنشاء مربع جديد.' : 'Select a text box on the canvas to configure styling options.'}
              </p>
            </div>
          )}

          {/* AI Helper Card */}
          <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-2">
            <h4 className="text-xs font-black text-purple-400 flex items-center gap-1.5">
              <Sparkles size={12} />
              {language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Translation Assistant'}
            </h4>
            <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
              {language === 'ar' 
                ? 'استخدم Gemini لتقسيم الصفحة والتعرف التلقائي على أماكن بالونات الحوار والترجمة التلقائية إلى العربية بلمسة واحدة.'
                : 'Run Gemini to segment page speech bubbles, perform OCR, and translate Korean/English dialogues into Arabic automatically.'}
            </p>
            <button
              onClick={runAiDetection}
              disabled={loading || saving}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-purple-600/10"
            >
              <Sparkles size={14} />
              {loading ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : (language === 'ar' ? 'كشف الحوار وترجمته (Gemini)' : 'Auto-Detect Dialogues (Gemini)')}
            </button>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={addCustomBox}
            disabled={loading || saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-all border border-white/5"
          >
            <Plus size={14} />
            {language === 'ar' ? 'إضافة مربع نص يدوي' : 'Add Custom Text Box'}
          </button>

          <button
            onClick={savePage}
            disabled={loading || saving || boxes.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/10"
          >
            <Save size={14} />
            {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ وتطبيق التعديل على الصفحة' : 'Apply & Overwrite Page')}
          </button>
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 flex flex-col h-full relative bg-neutral-950">
        {/* Navigation Bar */}
        <div className="h-14 bg-neutral-900 border-b border-white/5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-400 select-none">
              {language === 'ar' ? 'عرض الصفحة:' : 'Page:'}
            </span>
            <span className="px-2 py-1 bg-white/5 rounded-lg text-xs font-black">
              {selectedPageName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPageIdx(p => Math.max(0, p - 1))}
              disabled={selectedPageIdx === 0}
              className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg text-neutral-300 hover:text-white transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-xs font-black select-none px-2">{selectedPageIdx + 1} / {images.length}</span>
            <button
              onClick={() => setSelectedPageIdx(p => Math.min(images.length - 1, p + 1))}
              disabled={selectedPageIdx === images.length - 1}
              className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg text-neutral-300 hover:text-white transition-all"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black transition-all">-</button>
            <span className="text-[10px] font-mono text-neutral-400 select-none">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black transition-all">+</button>
            <button onClick={() => setScale(1)} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black transition-all">Reset</button>
          </div>
        </div>

        {/* Canvas Workspace wrapper */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 no-scrollbar bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px]">
          <div 
            ref={containerRef}
            className="relative shadow-2xl border border-white/5 select-none bg-neutral-900 transition-transform duration-100"
            style={{ 
              transform: `scale(${scale})`,
              width: '600px', // Responsive layout wrapper width
              aspectRatio: `${imgNaturalSize.w} / ${imgNaturalSize.h}`,
            }}
          >
            {/* Page image underlay */}
            {selectedPageUrl ? (
              <img
                ref={imageRef}
                src={selectedPageUrl}
                alt="Manga Canvas"
                onLoad={handleImageLoad}
                className="w-full h-full object-fill pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-600 font-bold">
                {language === 'ar' ? 'فشل تحميل الصورة' : 'Failed to load page image'}
              </div>
            )}

            {/* Boxes overlay */}
            {boxes.map((box) => {
              const isSelected = box.id === selectedBoxId;
              
              return (
                <div
                  key={box.id}
                  onMouseDown={(e) => handleDragStart(e, box)}
                  className={`absolute group cursor-move border transition-colors ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/20' 
                      : 'border-white/20 hover:border-white/60 bg-black/10'
                  }`}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`
                  }}
                >
                  {/* Rendering preview text inside box on the client */}
                  <div 
                    dir="rtl"
                    className="w-full h-full flex flex-col justify-center overflow-hidden px-1"
                    style={{
                      color: box.color,
                      fontSize: `${box.fontSize * scale * 0.35}px`,
                      fontFamily: `"${box.fontFamily}", Cairo, sans-serif`,
                      textAlign: box.align,
                      fontWeight: box.fontWeight,
                      textShadow: box.strokeWidth > 0 
                        ? `${box.strokeColor} 0px 0px ${box.strokeWidth * scale * 0.35}px, ${box.strokeColor} 0px 0px ${box.strokeWidth * scale * 0.35}px`
                        : 'none'
                    }}
                  >
                    {box.translation || (language === 'ar' ? 'أضف ترجمة...' : 'Add text...')}
                  </div>

                  {/* Resize handle (bottom right corner) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, box)}
                    className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 hover:bg-purple-400 cursor-se-resize rounded-tl-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  
                  {/* Delete bubble button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform text-[10px]"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
