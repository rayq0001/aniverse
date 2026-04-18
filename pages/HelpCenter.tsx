
import React, { useState } from 'react';
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
    <div className="min-h-screen py-10 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-5 max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-neutral-500">
          <HelpCircle size={12} />
          {language === 'ar' ? 'الدعم الفني' : 'Technical Support'}
        </div>
        <h1 className="text-2xl md:text-4xl font-bold">
          {language === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}
        </h1>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث عن إجابات...' : 'Search for answers...'}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-white/[0.15] transition-colors text-sm"
          />
        </div>
      </section>

      {/* Categories */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4 border border-white/[0.06]">
              <cat.icon size={20} />
            </div>
            <h3 className="font-bold text-sm mb-1">{cat.title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">{cat.desc}</p>
          </div>
        ))}
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold">{language === 'ar' ? 'الأسئلة الأكثر شيوعاً' : 'Frequently Asked Questions'}</h2>
          <p className="text-neutral-500 text-sm">{language === 'ar' ? 'إليك بعض الإجابات السريعة على أكثر الأسئلة تكراراً' : 'Quick answers to the most frequently asked questions'}</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="group p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors cursor-pointer">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm">{faq.q}</h4>
                  <p className="text-neutral-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <ChevronRight size={14} className="text-neutral-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 md:p-12 text-center space-y-4">
        <h2 className="text-lg md:text-xl font-bold">
          {language === 'ar' ? 'هل ما زلت بحاجة للمساعدة؟' : "Still need help?"}
        </h2>
        <p className="text-neutral-400 max-w-xl mx-auto text-sm leading-relaxed">
          {language === 'ar'
            ? 'فريق الدعم الفني لدينا متاح للإجابة على جميع استفساراتكم.'
            : 'Our support team is available to answer all your inquiries.'}
        </p>
        <a href="mailto:aniverse.team1@gmail.com" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-sm">
          <MessageCircle size={16} />
          {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </a>
      </section>
    </div>
  );
};

export default HelpCenter;
