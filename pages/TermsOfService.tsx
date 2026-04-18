
import React from 'react';
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
    <div className="min-h-screen py-10 space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto border border-white/[0.06]">
          <Scale size={24} className="text-blue-500" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold">
          {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
        </h1>
        <p className="text-neutral-500 text-sm">
          {language === 'ar' ? 'يرجى قراءة هذه الشروط بعناية قبل استخدام منصتنا' : 'Please read these terms carefully before using our platform'}
        </p>
      </section>

      {/* Terms */}
      <div className="grid gap-4">
        {terms.map((term, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/[0.06] flex-shrink-0">
                <term.icon size={18} />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-bold">{term.title}</h2>
                <p className="text-neutral-400 leading-relaxed text-sm">{term.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Acceptance */}
      <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col md:flex-row items-center gap-5">
        <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/10">
          <CheckCircle2 size={22} />
        </div>
        <div className="flex-1 text-center md:text-right space-y-1">
          <h3 className="font-bold text-sm">{language === 'ar' ? 'الموافقة على الشروط' : 'Acceptance of Terms'}</h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {language === 'ar' 
              ? 'باستخدامك لأنيفيرس، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط.' 
              : 'By using Aniverse, you acknowledge that you have read, understood, and agreed to be bound by these terms.'}
          </p>
        </div>
      </div>

      {/* Violation Note */}
      <div className="flex items-center gap-2 justify-center text-neutral-600 text-xs font-bold">
        <AlertCircle size={14} className="text-red-500/50" />
        {language === 'ar' ? 'أي مخالفة لهذه الشروط قد تؤدي إلى إغلاق حسابك فوراً' : 'Any violation of these terms may lead to immediate account termination'}
      </div>
    </div>
  );
};

export default TermsOfService;
