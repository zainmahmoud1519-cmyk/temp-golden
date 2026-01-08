import React, { useState, useEffect } from 'react';
import { Crown, Check, X, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { getAvailableDomains } from '../services/mailService';
import { Domain } from '../types';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (username: string, domain: string) => Promise<void>;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  const [username, setUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDomains();
    }
  }, [isOpen]);

  const loadDomains = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const available = await getAvailableDomains();
        // Sort to put .com first if available
        available.sort((a, b) => {
            if (a.domain.endsWith('.com') && !b.domain.endsWith('.com')) return -1;
            if (!a.domain.endsWith('.com') && b.domain.endsWith('.com')) return 1;
            return 0;
        });
        setDomains(available);
        if (available.length > 0) {
            setSelectedDomain(available[0].domain);
        } else {
            setError("لم يتم العثور على نطاقات. يرجى التحديث.");
        }
    } catch (e) {
        setError("خطأ في الاتصال");
    } finally {
        setIsLoading(false);
    }
  };

  const handlePaymentAndCreate = async () => {
    if (!username || username.length < 3) {
        setError("يجب أن يتكون الاسم من 3 أحرف على الأقل");
        return;
    }
    if (!selectedDomain) {
        setError("يرجى اختيار نطاق");
        return;
    }
    
    setIsProcessing(true);
    setError(null);

    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        await onUpgrade(username, selectedDomain);
        onClose();
    } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء الإنشاء");
    } finally {
        setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute left-4 top-4 text-white/80 hover:text-white z-20 bg-black/20 p-1 rounded-full"
        >
            <X size={20} />
        </button>

        {/* Header with Premium Gradient */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-red-500 p-6 md:p-8 text-center relative shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-md shadow-lg border border-white/30">
                    <Crown size={32} className="text-white drop-shadow-md" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">النسخة المدفوعة</h2>
                <p className="text-white/90 text-sm font-medium">خصائص حصرية بلا حدود</p>
            </div>
        </div>

        <div className="p-5 md:p-6 flex-1 flex flex-col gap-4">
            <ul className="space-y-2 mb-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <li className="flex items-center gap-2 text-slate-700 text-sm">
                    <div className="bg-green-100 p-1 rounded-full"><Check size={12} className="text-green-600" /></div>
                    <span>وقت غير محدود (لا تنتهي الصلاحية)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 text-sm">
                    <div className="bg-green-100 p-1 rounded-full"><Check size={12} className="text-green-600" /></div>
                    <span>اختيار اسم مخصص (Custom Name)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 text-sm">
                    <div className="bg-green-100 p-1 rounded-full"><Check size={12} className="text-green-600" /></div>
                    <span>نطاقات حقيقية (100% Real Domains)</span>
                </li>
            </ul>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                        placeholder="example"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-left ltr bg-slate-50"
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-bold text-slate-700">النطاق (Domain)</label>
                        <button 
                            onClick={loadDomains} 
                            disabled={isLoading}
                            className="text-xs text-brand-600 flex items-center gap-1 hover:underline"
                        >
                            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                            تحديث القائمة
                        </button>
                    </div>
                    
                    {isLoading ? (
                        <div className="h-12 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                    ) : (
                        <div className="relative">
                            <select 
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-left ltr appearance-none bg-white"
                                style={{direction: 'ltr'}}
                            >
                                {domains.map(d => (
                                    <option key={d.domain} value={d.domain}>@{d.domain}</option>
                                ))}
                            </select>
                            {/* Custom arrow for better mobile UX */}
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs md:text-sm rounded-xl text-center font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <button
                    onClick={handlePaymentAndCreate}
                    disabled={isProcessing || isLoading || domains.length === 0}
                    className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            جاري المعالجة...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} className="text-amber-400" />
                            <span>احصل عليه الآن - مجاناً</span>
                        </>
                    )}
                </button>
                <p className="text-center text-[10px] text-slate-400">محاكاة لعملية الدفع (لن يتم خصم أموال حقيقية)</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;