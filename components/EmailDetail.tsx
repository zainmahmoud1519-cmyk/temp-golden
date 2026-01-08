import React, { useState, useEffect } from 'react';
import { EmailMessage, AIAnalysisResult, AnalysisStatus } from '../types';
import { analyzeEmailWithGemini } from '../services/geminiService';
import { Shield, ShieldAlert, ShieldCheck, Sparkles, X, Trash2 } from 'lucide-react';

interface EmailDetailProps {
  email: EmailMessage;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onClose, onDelete }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);

  // Auto-analyze specific suspicious emails or let user trigger it
  const handleAnalyze = async () => {
    setStatus(AnalysisStatus.ANALYZING);
    try {
      const result = await analyzeEmailWithGemini(email.subject, email.body);
      setAnalysis(result);
      setStatus(result.isPhishing || result.safetyScore < 50 ? AnalysisStatus.SUSPICIOUS : AnalysisStatus.SAFE);
    } catch (error) {
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors md:hidden"
        >
          <X size={20} className="text-slate-600" />
        </button>
        <div className="flex gap-2 mr-auto md:mr-0">
           <button 
            onClick={() => onDelete(email.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">حذف</span>
          </button>
        </div>
      </div>

      {/* Email Metadata */}
      <div className="p-6 pb-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{email.subject}</h2>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
              ${email.type === 'spam' ? 'bg-red-500' : 'bg-brand-500'}`}
            >
              {email.sender.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900">{email.sender}</div>
              <div className="text-sm text-slate-500">{email.senderAddress}</div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {email.receivedAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' })}
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="px-6 mb-4">
        {status === AnalysisStatus.IDLE && (
          <button 
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:shadow-lg transition-all"
          >
            <Sparkles size={18} />
            تحليل الرسالة بالذكاء الاصطناعي (Gemini)
          </button>
        )}

        {status === AnalysisStatus.ANALYZING && (
          <div className="w-full py-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center animate-pulse">
            <div className="text-brand-600 font-medium text-sm">جاري تحليل المحتوى...</div>
          </div>
        )}

        {analysis && status !== AnalysisStatus.ANALYZING && (
          <div className={`rounded-xl p-4 border ${
            status === AnalysisStatus.SAFE 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {status === AnalysisStatus.SAFE ? (
                  <ShieldCheck className="text-emerald-600" size={24} />
                ) : (
                  <ShieldAlert className="text-red-600" size={24} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold ${status === AnalysisStatus.SAFE ? 'text-emerald-800' : 'text-red-800'}`}>
                    {status === AnalysisStatus.SAFE ? 'البريد يبدو آمناً' : 'تحذير أمني'}
                  </h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                     status === AnalysisStatus.SAFE ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                  }`}>
                    درجة الأمان: {analysis.safetyScore}%
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-2">{analysis.summary}</p>
                <div className="text-xs font-medium text-slate-500 bg-white/50 p-2 rounded-lg">
                  💡 {analysis.actionRequired}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div 
          className="prose prose-slate max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>
    </div>
  );
};

export default EmailDetail;