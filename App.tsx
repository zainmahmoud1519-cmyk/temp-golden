import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Copy, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Mail, 
  Inbox as InboxIcon, 
  AlertTriangle,
  CheckCircle2,
  Menu,
  Shield,
  Wifi,
  WifiOff,
  Crown,
  Infinity as InfinityIcon,
  ServerOff,
  Globe2,
  ChevronRight
} from 'lucide-react';
import { EmailMessage, UserSession } from './types';
import EmailDetail from './components/EmailDetail';
import PremiumModal from './components/PremiumModal';
import { createRealAccount, fetchMessages, fetchMessageDetails, deleteMessage } from './services/mailService';

// --- Constants ---
const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes display timer
const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds for real email

const App: React.FC = () => {
  // --- State ---
  const [session, setSession] = useState<UserSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION_MS);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // --- Effects ---

  // Initialize Session (Create Real Account)
  useEffect(() => {
    handleCreateSession();
  }, []);

  // Timer Countdown (Visual Only for this demo, keeping the session "alive" logic)
  useEffect(() => {
    if (!session) return;
    
    // If premium, no countdown
    if (session.isPremium) {
        setTimeLeft(SESSION_DURATION_MS); // Or just ignore
        return;
    }

    const interval = setInterval(() => {
      if (!session.expiresAt) return;
      const remaining = session.expiresAt.getTime() - new Date().getTime();
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Real Polling for new emails
  useEffect(() => {
    if (!session?.token) return;

    const pollEmails = async () => {
      // Don't show loading spinner on background polls
      const newMessages = await fetchMessages(session.token!);
      
      setEmails(prevEmails => {
        // Simple diffing: if length changed or IDs different
        // In a real app, we might merge data. Here we assume API returns sort by date desc
        if (newMessages.length !== prevEmails.length) {
            // Check if we have a new message to notify?
            return newMessages;
        }
        // If same length, verify top ID (rudimentary check)
        if (newMessages.length > 0 && prevEmails.length > 0 && newMessages[0].id !== prevEmails[0].id) {
            return newMessages;
        }
        return prevEmails;
      });
    };

    // Initial fetch
    pollEmails();

    const pollInterval = setInterval(pollEmails, POLLING_INTERVAL_MS);
    return () => clearInterval(pollInterval);
  }, [session]);

  // Fetch Full Body when an email is selected
  useEffect(() => {
    const fetchBody = async () => {
      if (!selectedEmailId || !session?.token) return;

      const email = emails.find(e => e.id === selectedEmailId);
      if (email && !email.hasFullDetails) {
        // Optimistic UI update or loading state could go here
        const details = await fetchMessageDetails(session.token, selectedEmailId);
        if (details) {
          setEmails(prev => prev.map(e => 
            e.id === selectedEmailId ? { ...e, ...details } : e
          ));
        }
      }
    };

    fetchBody();
  }, [selectedEmailId, session]);

  // --- Handlers ---

  const handleCreateSession = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const newSession = await createRealAccount();
      setSession(newSession);
      setEmails([]);
      setSelectedEmailId(null);
      setTimeLeft(SESSION_DURATION_MS);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "فشل في إنشاء بريد جديد. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePremiumCreate = async (username: string, domain: string) => {
      const newSession = await createRealAccount(username, domain);
      setSession(newSession);
      setEmails([]);
      setSelectedEmailId(null);
      setTimeLeft(SESSION_DURATION_MS); // Ignored for premium
  };

  const extendSession = () => {
    if (!session || session.isPremium) return;
    const now = new Date();
    setSession({
      ...session,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS)
    });
    setTimeLeft(SESSION_DURATION_MS);
  };

  const copyToClipboard = () => {
    if (session?.emailAddress) {
      navigator.clipboard.writeText(session.emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!session?.token) return;
    
    // Optimistic delete
    const prevEmails = [...emails];
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedEmailId === id) setSelectedEmailId(null);

    const success = await deleteMessage(session.token, id);
    if (!success) {
        // Revert if failed (optional, but good UX)
        setEmails(prevEmails);
        alert("فشل حذف الرسالة");
    }
  };

  // --- Render Helpers ---

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      
      {/* --- Navbar --- */}
      <nav className="bg-white border-b border-slate-200 shrink-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 md:h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-1.5 md:p-2 rounded-lg text-white">
                <Mail size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-none">Moaqat Mail</h1>
                <p className="text-[10px] md:text-xs text-slate-500">بريد إلكتروني حقيقي ومؤقت</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-sm text-slate-600">
               <button 
                onClick={() => setIsPremiumModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-[10px] md:text-xs font-bold hover:shadow-md transition-all hover:scale-105"
               >
                 <Crown size={12} className="md:w-3.5 md:h-3.5" fill="currentColor" />
                 نسخة VIP
               </button>
               <div className="hidden md:flex items-center gap-4">
                 <span className="flex items-center gap-1"><Shield size={16} className="text-emerald-500"/> آمن</span>
                 <span className="flex items-center gap-1">
                     <Wifi size={16} className="text-brand-500" title="متصل" />
                    متصل
                 </span>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col md:max-w-7xl md:mx-auto md:w-full md:px-4 md:py-6">
        
        {/* --- Hero / Address Section (Fixed on Mobile Top) --- */}
        <div className={`bg-white md:rounded-2xl shadow-sm border-b md:border border-slate-200 p-4 md:p-6 mb-0 md:mb-6 relative shrink-0 transition-all duration-500 z-20
            ${session?.isPremium ? 'md:bg-gradient-to-br md:from-slate-900 md:to-slate-800 md:border-amber-500/50' : ''}
            ${selectedEmailId ? 'hidden md:block' : 'block'} 
        `}>
          {isRefreshing && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 animate-pulse"></div>}
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex-1 w-full">
              <label className={`hidden md:flex text-sm font-medium mb-2 items-center gap-2 ${session?.isPremium ? 'text-amber-400' : 'text-slate-500'}`}>
                {session?.isPremium ? '💎 عنوان بريدك المميز' : 'عنوان بريدك المؤقت الخاص'}
                {session && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Globe2 size={10}/> حقيقي</span>}
              </label>
              <div className="relative group w-full">
                <input 
                  type="text" 
                  readOnly 
                  value={session?.emailAddress || 'جاري الاتصال...'} 
                  className={`w-full text-base md:text-2xl font-mono py-3 md:py-4 px-4 md:px-6 rounded-xl border transition-all outline-none text-center md:text-right
                    ${session?.isPremium 
                        ? 'bg-slate-800 text-white border-amber-500/30' 
                        : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-brand-500'
                    } 
                    ${error ? 'border-red-300 bg-red-50 text-red-800' : ''}`}
                />
                <button 
                  onClick={copyToClipboard}
                  disabled={!session?.emailAddress}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 rounded-lg shadow-sm border transition-all
                    ${session?.isPremium 
                        ? 'bg-slate-700 text-amber-400 border-slate-600' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                >
                  {copied ? <CheckCircle2 className="text-emerald-500 w-4 h-4 md:w-5 md:h-5" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 w-full md:w-auto">
              {!session?.isPremium && (
                 <button 
                  onClick={() => setIsPremiumModalOpen(true)}
                  className="md:hidden flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-sm shadow-sm"
                >
                  <Crown size={16} fill="currentColor" />
                  <span>تخصيص</span>
                </button>
              )}

              <button 
                onClick={handleCreateSession}
                disabled={isRefreshing}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border font-bold rounded-lg md:rounded-xl transition-all shadow-sm text-sm md:text-base
                    ${session?.isPremium
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">تغيير</span>
                <span className="sm:hidden">جديد</span>
              </button>
              
              <button 
                onClick={extendSession}
                disabled={session?.isPremium}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-lg md:rounded-xl transition-all shadow-md active:transform active:scale-95 text-sm md:text-base
                    ${session?.isPremium
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
              >
                {session?.isPremium ? <InfinityIcon size={18} /> : <Clock size={18} />}
                <span className="font-mono min-w-[50px] md:min-w-[60px]">
                    {session?.isPremium ? 'مفتوح' : formatTime(timeLeft)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* --- Inbox Layout --- */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 md:gap-6 h-full relative">
          
          {/* Inbox List */}
          <div className={`md:col-span-4 lg:col-span-3 bg-white md:rounded-2xl shadow-sm border-b md:border border-slate-200 overflow-hidden flex flex-col h-full
              ${selectedEmailId ? 'hidden md:flex' : 'flex'}
          `}>
            <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base">
                <InboxIcon size={18} />
                صندوق الوارد
              </h2>
              <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {emails.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    {session ? <RefreshCw className="animate-spin-slow opacity-50" size={24} /> : <WifiOff size={24} />}
                  </div>
                  <p className="text-sm md:text-base">{session ? "بانتظار وصول الرسائل..." : "جاري الاتصال..."}</p>
                  <p className="text-xs mt-2 text-slate-300">انسخ البريد واستقبل الرسائل فوراً</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {emails.map(email => (
                    <li key={email.id}>
                      <button 
                        onClick={() => setSelectedEmailId(email.id)}
                        className={`w-full text-right p-4 transition-colors hover:bg-slate-50 active:bg-slate-100
                            ${selectedEmailId === email.id ? 'bg-brand-50 border-r-4 border-brand-500' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold text-sm truncate max-w-[150px] ${email.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                            {email.sender}
                          </span>
                          <span className="text-[10px] md:text-xs text-slate-400 whitespace-nowrap">
                            {email.receivedAt.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 font-medium truncate mb-1">
                          {email.subject || '(بدون عنوان)'}
                        </div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                            {email.preview}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Email Detail / Placeholder */}
          <div className={`md:col-span-8 lg:col-span-9 h-full absolute md:relative inset-0 bg-white md:bg-transparent z-40 md:z-auto
             ${!selectedEmailId ? 'hidden md:block' : 'block'}
          `}>
            {selectedEmail ? (
               selectedEmail.hasFullDetails ? (
                <EmailDetail 
                    email={selectedEmail} 
                    onClose={() => setSelectedEmailId(null)} 
                    onDelete={handleDeleteEmail}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-white md:rounded-2xl shadow-xl">
                    <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
                    <p className="text-slate-500">جاري تحميل محتوى الرسالة...</p>
                </div>
              )
            ) : (
              <div className="h-full bg-white md:rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-80 border-dashed">
                <Mail size={64} className="mb-4 text-slate-300" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">اختر رسالة لعرضها</h3>
                <p className="max-w-md text-sm md:text-base">
                  البريد جاهز لاستقبال رسائل حقيقية.
                  نظام ذكي لتحليل ومكافحة السبام.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- Footer (Hidden on Mobile view when reading email) --- */}
      <footer className={`bg-white border-t border-slate-200 py-4 shrink-0 ${selectedEmailId ? 'hidden md:block' : 'block'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-[10px] md:text-xs text-slate-400 flex items-center justify-center gap-2">
              <span>© 2024 Moaqat Mail</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>Secure & Real</span>
            </p>
        </div>
      </footer>

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)}
        onUpgrade={handlePremiumCreate}
      />

    </div>
  );
};

// Simple loader component needed for App
const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

export default App;