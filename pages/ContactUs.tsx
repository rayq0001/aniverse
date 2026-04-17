
import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ContactUs: React.FC = () => {
  const { language } = useLanguage();

  const contactInfo = [
    { icon: Mail, title: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: 'aniverse.team1@gmail.com' },
    { icon: MessageSquare, title: language === 'ar' ? 'الدردشة المباشرة' : 'Live Chat', value: language === 'ar' ? 'متوفر 24/7' : 'Available 24/7' },
  ];

  return (
    <div className="min-h-screen py-12 space-y-20 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -ml-64 -mb-64 pointer-events-none" />

      {/* Header */}
      <section className="text-center space-y-6 max-w-3xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500"
        >
          <Mail size={12} />
          {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent"
        >
          {language === 'ar' ? 'لنتواصل معاً' : "Let's Connect"}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-500 text-lg md:text-xl font-medium leading-relaxed"
        >
          {language === 'ar' 
            ? 'لديك اقتراح، استفسار، أو واجهت مشكلة؟ نحن هنا لسماعك ومساعدتك في أي وقت.' 
            : 'Have a suggestion, inquiry, or encountered a problem? We are here to listen and help you anytime.'}
        </motion.p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          {contactInfo.map((info, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[2.5rem] bg-neutral-900/50 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all shadow-2xl"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500 shadow-xl border border-white/5">
                  <info.icon size={28} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">{info.title}</h3>
                  <p className="font-black text-lg md:text-xl tracking-tight text-white">{info.value}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Social Links */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-8 rounded-[2.5rem] bg-gradient-to-br from-neutral-900/50 to-black/50 backdrop-blur-xl border border-white/5 space-y-8 shadow-2xl"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{language === 'ar' ? 'تابعنا على المنصات' : 'Follow Our Platforms'}</h3>
            <div className="flex flex-wrap gap-4">
              <a href="https://discord.gg/4nH6v6kb3d" target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-2xl bg-white/5 text-white hover:bg-white hover:text-black hover:scale-110 transition-all flex items-center justify-center shadow-lg border border-white/5">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 p-8 md:p-16 rounded-[3.5rem] bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-2">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
              <input 
                type="text" 
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-white/40 transition-all text-white font-bold placeholder:text-neutral-700"
                placeholder={language === 'ar' ? 'أدخل اسمك...' : 'Enter your name...'}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input 
                type="email" 
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-white/40 transition-all text-white font-bold placeholder:text-neutral-700"
                placeholder="example@mail.com"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-2">{language === 'ar' ? 'الموضوع' : 'Subject'}</label>
            <input 
              type="text" 
              className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-white/40 transition-all text-white font-bold placeholder:text-neutral-700"
              placeholder={language === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-2">{language === 'ar' ? 'الرسالة' : 'Message'}</label>
            <textarea 
              rows={6}
              className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-white/40 transition-all resize-none text-white font-bold placeholder:text-neutral-700"
              placeholder={language === 'ar' ? 'اكتب رسالتك هنا بالتفصيل...' : 'Write your message here in detail...'}
            />
          </div>
          <button className="w-full py-6 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 shadow-2xl text-lg">
            <Send size={22} />
            {language === 'ar' ? 'إرسال الرسالة الآن' : 'Send Message Now'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
