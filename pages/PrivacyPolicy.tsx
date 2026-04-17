
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Globe, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicy: React.FC = () => {
  const { language } = useLanguage();

  const sections = [
    {
      icon: Eye,
      title: language === 'ar' ? 'المعلومات التي نجمعها' : 'Information We Collect',
      content: language === 'ar' 
        ? 'نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، مثل اسمك وبريدك الإلكتروني. كما نجمع بيانات تقنية حول كيفية استخدامك للمنصة لتحسين تجربتك.'
        : 'We collect information you provide directly to us when creating an account, such as your name and email. We also collect technical data about how you use the platform to improve your experience.'
    },
    {
      icon: Lock,
      title: language === 'ar' ? 'كيفية حماية بياناتك' : 'How We Protect Your Data',
      content: language === 'ar'
        ? 'نستخدم تقنيات تشفير متقدمة (SSL) لحماية بياناتك الشخصية. يتم تخزين جميع المعلومات الحساسة في خوادم آمنة ومحمية بجدران حماية قوية.'
        : 'We use advanced encryption technologies (SSL) to protect your personal data. All sensitive information is stored on secure servers protected by strong firewalls.'
    },
    {
      icon: Globe,
      title: language === 'ar' ? 'ملفات تعريف الارتباط (Cookies)' : 'Cookies',
      content: language === 'ar'
        ? 'نستخدم ملفات تعريف الارتباط لتحسين أداء الموقع وتذكر تفضيلاتك (مثل اللغة والوضع الليلي). يمكنك التحكم في هذه الملفات من خلال إعدادات متصفحك.'
        : 'We use cookies to improve site performance and remember your preferences (like language and dark mode). You can control these cookies through your browser settings.'
    }
  ];

  return (
    <div className="min-h-screen py-12 space-y-20 max-w-5xl mx-auto relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -ml-64 -mb-64 pointer-events-none" />

      {/* Header */}
      <section className="text-center space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-2xl"
          style={{ background: `linear-gradient(to bottom right, rgba(var(--accent-rgb), 0.2), rgba(59, 130, 246, 0.2))` }}
        >
          <Shield size={48} style={{ color: 'var(--accent-color)' }} />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent"
        >
          {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </motion.h1>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-6 text-neutral-500 text-sm font-black uppercase tracking-[0.2em]"
        >
          <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <Clock size={14} style={{ color: 'var(--accent-color)' }} /> 
            {language === 'ar' ? 'آخر تحديث: 11 أبريل 2026' : 'Last Updated: April 11, 2026'}
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <FileText size={14} className="text-blue-500" /> 
            v2.4.0
          </span>
        </motion.div>
      </section>

      {/* Intro */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-10 md:p-14 rounded-[3.5rem] bg-neutral-900/50 backdrop-blur-2xl border border-white/10 leading-relaxed text-neutral-300 text-lg md:text-xl font-medium shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] relative"
      >
        <div className="absolute top-0 left-0 w-20 h-20 blur-3xl rounded-full -ml-10 -mt-10" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }} />
        {language === 'ar' 
          ? 'في أنيفيرس، نولي أهمية قصوى لخصوصيتك. توضح هذه السياسة كيفية تعاملنا مع معلوماتك الشخصية والتزامنا بحمايتها أثناء استخدامك لخدماتنا.'
          : 'At Aniverse, we place the utmost importance on your privacy. This policy explains how we handle your personal information and our commitment to protecting it while you use our services.'}
      </motion.div>

      {/* Sections */}
      <div className="grid gap-10 relative z-10">
        {sections.map((section, i) => (
          <motion.section
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (i * 0.1) }}
            className="group p-10 rounded-[3rem] bg-neutral-900/30 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all shadow-2xl"
          >
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-xl border border-white/5 flex-shrink-0">
                <section.icon size={28} />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black tracking-tight text-white">{section.title}</h2>
                <p className="text-neutral-400 leading-relaxed text-lg font-medium">
                  {section.content}
                </p>
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Footer Note */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pt-16 border-t border-white/5 text-center"
      >
        <p className="text-sm md:text-base text-neutral-600 font-bold uppercase tracking-widest">
          {language === 'ar' 
            ? 'باستخدامك لموقعنا، فإنك توافق على ممارسات الخصوصية الموضحة في هذه الصفحة.' 
            : 'By using our site, you agree to the privacy practices described on this page.'}
        </p>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;
