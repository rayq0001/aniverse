
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Scale, UserCheck, Copyright } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TermsOfService: React.FC = () => {
  const { language } = useLanguage();

  const terms = [
    {
      icon: UserCheck,
      title: language === 'ar' ? 'شروط الاستخدام' : 'Usage Terms',
      content: language === 'ar'
        ? 'يجب أن تكون في السن القانوني لاستخدام هذه الخدمة. أنت مسؤول عن الحفاظ على سرية معلومات حسابك وجميع الأنشطة التي تتم من خلاله.'
        : 'You must be of legal age to use this service. You are responsible for maintaining the confidentiality of your account information and all activities that occur under it.'
    },
    {
      icon: Copyright,
      title: language === 'ar' ? 'حقوق الملكية الفكرية' : 'Intellectual Property',
      content: language === 'ar'
        ? 'جميع المحتويات المتوفرة على المنصة محمية بموجب قوانين الملكية الفكرية. لا يسمح بإعادة نشر أو توزيع المحتوى دون إذن كتابي مسبق.'
        : 'All content available on the platform is protected by intellectual property laws. Republication or distribution of content is not permitted without prior written permission.'
    },
    {
      icon: Scale,
      title: language === 'ar' ? 'إخلاء المسؤولية' : 'Disclaimer',
      content: language === 'ar'
        ? 'يتم تقديم الخدمة "كما هي". نحن لا نضمن عدم انقطاع الخدمة أو خلوها من الأخطاء، ونحتفظ بالحق في تعديل أو إيقاف أي جزء من الخدمة في أي وقت.'
        : 'The service is provided "as is". We do not guarantee uninterrupted or error-free service, and we reserve the right to modify or discontinue any part of the service at any time.'
    }
  ];

  return (
    <div className="min-h-screen py-12 space-y-20 max-w-5xl mx-auto relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -ml-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-64 -mb-64 pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }} />

      {/* Header */}
      <section className="text-center space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, rotate: -10 }}
          animate={{ opacity: 1, rotate: 0 }}
          className="w-24 h-24 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-2xl"
          style={{ background: `linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(var(--accent-rgb), 0.2))` }}
        >
          <Scale size={48} className="text-blue-500" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent"
        >
          {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-500 text-lg md:text-xl font-medium tracking-tight"
        >
          {language === 'ar' ? 'يرجى قراءة هذه الشروط بعناية قبل استخدام منصتنا' : 'Please read these terms carefully before using our platform'}
        </motion.p>
      </section>

      {/* Main Content */}
      <div className="grid gap-10 relative z-10">
        {terms.map((term, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group p-10 rounded-[3rem] bg-neutral-900/40 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all shadow-2xl"
          >
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-blue-600/20 group-hover:text-blue-500 transition-all duration-500 shadow-xl border border-white/5 flex-shrink-0">
                <term.icon size={28} />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black tracking-tight text-white">{term.title}</h2>
                <p className="text-neutral-400 leading-relaxed text-lg font-medium">
                  {term.content}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Acceptance Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="p-10 md:p-14 rounded-[4rem] border flex flex-col md:flex-row items-center gap-10"
        style={{ background: `linear-gradient(to right, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.05))`, borderColor: 'rgba(var(--accent-rgb), 0.2)', boxShadow: '0 40px 80px -20px rgba(var(--accent-rgb), 0.1)' }}
      >
        <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shadow-lg border border-blue-500/20">
          <CheckCircle2 size={40} />
        </div>
        <div className="flex-1 text-center md:text-right space-y-2">
          <h3 className="font-black text-2xl tracking-tight text-white">{language === 'ar' ? 'الموافقة على الشروط' : 'Acceptance of Terms'}</h3>
          <p className="text-neutral-400 text-lg font-medium leading-relaxed">
            {language === 'ar' 
              ? 'باستخدامك لأنيفيرس، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط.' 
              : 'By using Aniverse, you acknowledge that you have read, understood, and agreed to be bound by these terms.'}
          </p>
        </div>
      </motion.div>

      {/* Violation Note */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-4 justify-center text-neutral-600 text-xs font-black uppercase tracking-[0.3em]"
      >
        <AlertCircle size={16} className="text-red-500/50" />
        {language === 'ar' ? 'أي مخالفة لهذه الشروط قد تؤدي إلى إغلاق حسابك فوراً' : 'Any violation of these terms may lead to immediate account termination'}
      </motion.div>
    </div>
  );
};

export default TermsOfService;
