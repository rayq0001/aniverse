
import React from 'react';
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
    <div className="min-h-screen py-10 space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto border border-white/[0.06]">
          <Shield size={24} style={{ color: 'var(--accent-color)' }} />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold">
          {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3 text-neutral-500 text-xs font-bold">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Clock size={12} /> 
            {language === 'ar' ? 'آخر تحديث: 11 أبريل 2026' : 'Last Updated: April 11, 2026'}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <FileText size={12} /> v2.4.0
          </span>
        </div>
      </section>

      {/* Intro */}
      <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] text-neutral-300 text-sm leading-relaxed">
        {language === 'ar' 
          ? 'في أنيفيرس، نولي أهمية قصوى لخصوصيتك. توضح هذه السياسة كيفية تعاملنا مع معلوماتك الشخصية والتزامنا بحمايتها أثناء استخدامك لخدماتنا.'
          : 'At Aniverse, we place the utmost importance on your privacy. This policy explains how we handle your personal information and our commitment to protecting it while you use our services.'}
      </div>

      {/* Sections */}
      <div className="grid gap-4">
        {sections.map((section, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/[0.06] flex-shrink-0">
                <section.icon size={18} />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-bold">{section.title}</h2>
                <p className="text-neutral-400 leading-relaxed text-sm">{section.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="pt-8 border-t border-white/[0.04] text-center">
        <p className="text-xs text-neutral-600">
          {language === 'ar' 
            ? 'باستخدامك لموقعنا، فإنك توافق على ممارسات الخصوصية الموضحة في هذه الصفحة.' 
            : 'By using our site, you agree to the privacy practices described on this page.'}
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
