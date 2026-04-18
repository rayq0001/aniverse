
import React from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ContactUs: React.FC = () => {
  const { language } = useLanguage();

  const contactInfo = [
    { icon: Mail, title: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: 'aniverse.team1@gmail.com' },
    { icon: MessageSquare, title: language === 'ar' ? 'الدردشة المباشرة' : 'Live Chat', value: language === 'ar' ? 'متوفر 24/7' : 'Available 24/7' },
  ];

  return (
    <div className="min-h-screen py-10 space-y-10">
      <section className="text-center space-y-3 max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-neutral-500">
          <Mail size={12} />
          {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </div>
        <h1 className="text-2xl md:text-4xl font-bold">
          {language === 'ar' ? 'لنتواصل معاً' : "Let's Connect"}
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed">
          {language === 'ar' 
            ? 'لديك اقتراح، استفسار، أو واجهت مشكلة؟ نحن هنا لسماعك ومساعدتك في أي وقت.' 
            : 'Have a suggestion, inquiry, or encountered a problem? We are here to listen and help you anytime.'}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {contactInfo.map((info, i) => (
            <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/[0.06]">
                  <info.icon size={18} />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-neutral-500 mb-0.5">{info.title}</h3>
                  <p className="font-bold text-sm">{info.value}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <h3 className="text-[10px] font-bold text-neutral-500">{language === 'ar' ? 'تابعنا على المنصات' : 'Follow Our Platforms'}</h3>
            <div className="flex flex-wrap gap-2">
              <a href="https://discord.gg/4nH6v6kb3d" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/[0.05] text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center border border-white/[0.06]">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
              <input type="text" className="w-full bg-black/30 border border-white/[0.06] rounded-lg py-2.5 px-4 focus:outline-none focus:border-white/[0.15] transition-colors text-sm placeholder:text-neutral-600" placeholder={language === 'ar' ? 'أدخل اسمك...' : 'Enter your name...'} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input type="email" className="w-full bg-black/30 border border-white/[0.06] rounded-lg py-2.5 px-4 focus:outline-none focus:border-white/[0.15] transition-colors text-sm placeholder:text-neutral-600" placeholder="example@mail.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-500">{language === 'ar' ? 'الموضوع' : 'Subject'}</label>
            <input type="text" className="w-full bg-black/30 border border-white/[0.06] rounded-lg py-2.5 px-4 focus:outline-none focus:border-white/[0.15] transition-colors text-sm placeholder:text-neutral-600" placeholder={language === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-500">{language === 'ar' ? 'الرسالة' : 'Message'}</label>
            <textarea rows={5} className="w-full bg-black/30 border border-white/[0.06] rounded-lg py-2.5 px-4 focus:outline-none focus:border-white/[0.15] transition-colors resize-none text-sm placeholder:text-neutral-600" placeholder={language === 'ar' ? 'اكتب رسالتك هنا بالتفصيل...' : 'Write your message here in detail...'} />
          </div>
          <button className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 text-sm">
            <Send size={16} />
            {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
