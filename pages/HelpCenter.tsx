
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, HelpCircle, Book, MessageCircle, Shield, CreditCard, User, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const HelpCenter: React.FC = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: User, title: language === 'ar' ? 'الحساب والملف الشخصي' : 'Account & Profile', desc: language === 'ar' ? 'إدارة حسابك وإعدادات الخصوصية' : 'Manage your account and privacy settings' },
    { icon: Book, title: language === 'ar' ? 'القراءة والمكتبة' : 'Reading & Library', desc: language === 'ar' ? 'كيفية استخدام القارئ وتنظيم مكتبتك' : 'How to use the reader and organize your library' },
    { icon: CreditCard, title: language === 'ar' ? 'الاشتراكات والمدفوعات' : 'Subscriptions & Payments', desc: language === 'ar' ? 'معلومات عن العضويات وطرق الدفع' : 'Information about memberships and payment methods' },
    { icon: Shield, title: language === 'ar' ? 'الأمان والخصوصية' : 'Security & Privacy', desc: language === 'ar' ? 'حماية بياناتك وتأمين حسابك' : 'Protecting your data and securing your account' },
  ];

  const faqs = [
    { q: language === 'ar' ? 'كيف يمكنني تغيير جودة الصور في القارئ؟' : 'How can I change image quality in the reader?', a: language === 'ar' ? 'يمكنك تغيير الجودة من خلال إعدادات القارئ (أيقونة الترس) أثناء القراءة.' : 'You can change the quality through the reader settings (gear icon) while reading.' },
    { q: language === 'ar' ? 'هل يمكنني تحميل الفصول للقراءة بدون إنترنت؟' : 'Can I download chapters for offline reading?', a: language === 'ar' ? 'هذه الميزة متاحة حالياً لمشتركي الباقة الممتازة فقط عبر تطبيق الجوال.' : 'This feature is currently available for premium subscribers only via the mobile app.' },
    { q: language === 'ar' ? 'نسيت كلمة المرور، ماذا أفعل؟' : 'I forgot my password, what should I do?', a: language === 'ar' ? 'اضغط على "نسيت كلمة المرور" في صفحة تسجيل الدخول وسنرسل لك رابط إعادة التعيين.' : 'Click on "Forgot Password" on the login page and we will send you a reset link.' },
  ];

  return (
    <div className="min-h-screen py-12 space-y-24 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full -ml-80 -mt-80 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full -mr-80 -mb-80 pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }} />

      {/* Hero Section */}
      <section className="text-center space-y-10 max-w-4xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400"
        >
          <HelpCircle size={14} className="text-blue-500" />
          {language === 'ar' ? 'الدعم الفني' : 'Technical Support'}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent"
        >
          {language === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative max-w-2xl mx-auto group"
        >
          <div className="absolute -inset-1 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" style={{ background: `linear-gradient(to right, rgba(var(--accent-rgb), 0.6), rgba(var(--accent-rgb), 0.3))` }} />
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500" size={22} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن إجابات، مقالات، أو حلول...' : 'Search for answers, articles, or solutions...'}
              className="w-full bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 focus:outline-none focus:border-white/30 transition-all shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] text-lg font-bold"
            />
          </div>
        </motion.div>
      </section>

      {/* Categories Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
        {categories.map((cat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            className="group p-10 rounded-[2.5rem] bg-neutral-900/50 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-inner border border-white/5">
              <cat.icon size={32} className="text-white" />
            </div>
            <h3 className="font-black text-xl mb-3 tracking-tight">{cat.title}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed font-medium">{cat.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* FAQs Section */}
      <section className="max-w-4xl mx-auto space-y-16 relative z-10">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black tracking-tight">{language === 'ar' ? 'الأسئلة الأكثر شيوعاً' : 'Frequently Asked Questions'}</h2>
          <p className="text-neutral-500 text-lg font-medium">{language === 'ar' ? 'إليك بعض الإجابات السريعة على أكثر الأسئلة تكراراً من قبل مجتمعنا' : 'Here are some quick answers to the most frequently asked questions from our community'}</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="group p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-3">
                  <h4 className="font-black text-lg md:text-xl tracking-tight group-hover:text-blue-400 transition-colors">
                    {faq.q}
                  </h4>
                  <p className="text-neutral-400 leading-relaxed font-medium">{faq.a}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-all flex-shrink-0">
                  <ChevronRight size={20} className="text-neutral-500 group-hover:text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="relative rounded-[4rem] p-1 md:p-2 shadow-[0_40px_100px_-20px_rgba(var(--accent-rgb),0.3)]" style={{ background: `linear-gradient(to bottom right, rgba(var(--accent-rgb), 0.8), rgba(var(--accent-rgb), 0.4))` }}>
        <div className="bg-black/90 backdrop-blur-3xl rounded-[3.5rem] p-12 md:p-20 text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
              {language === 'ar' ? 'هل ما زلت بحاجة للمساعدة؟' : "Still need some help?"}
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
              {language === 'ar'
                ? 'فريق الدعم الفني لدينا متاح للإجابة على جميع استفساراتكم وضمان أفضل تجربة قراءة.'
                : 'Our technical support team is available to answer all your inquiries and ensure the best reading experience.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="mailto:aniverse.team1@gmail.com" className="px-12 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 hover:shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] transition-all active:scale-95 flex items-center gap-3 text-lg">
                <MessageCircle size={22} />
                {language === 'ar' ? 'تواصل معنا عبر البريد' : 'Contact us via Email'}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpCenter;
