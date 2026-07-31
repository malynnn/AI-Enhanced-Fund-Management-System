"use client";

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  status: 'idle' | 'loading' | 'success' | 'error';
  resultMsg?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
}

export default function ActionModal({
  isOpen,
  title,
  message,
  status,
  resultMsg,
  onConfirm,
  onClose,
  confirmText = "Confirm"
}: ActionModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [show, setShow] = useState(false);

  // Handle smooth mount/unmount animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setShow(false);
      const timer = setTimeout(() => setIsRendered(false), 400); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Blurred Dark Overlay */}
      <div 
        className={`absolute inset-0 bg-[#04152d]/40 backdrop-blur-md transition-opacity duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${show ? 'opacity-100' : 'opacity-0'}`} 
        onClick={() => status !== 'loading' && onClose()} 
      />
      
      {/* Liquid Glass Card */}
      <div className={`relative w-full max-w-md flex flex-col glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 text-center transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
        
        {/* Absolute wrapper protects the positioning from the glass-sheen relative override */}
        {status !== 'loading' && status !== 'success' && (
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={onClose} 
              className="glass-sheen flex items-center justify-center bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 text-[#04152d]/60 hover:text-[#04152d] w-8 h-8"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-2 relative z-0">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4 mt-2" />
              <h3 className="text-[18px] font-black text-[#04152d] tracking-tight">{title}</h3>
              <div className="text-[13px] font-bold text-[#04152d]/60 mt-2 w-full">{message}</div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.1),inset_0_1px_2px_rgba(255,255,255,1)] mb-4 mt-2">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-[18px] font-black text-[#04152d] tracking-tight">{title}</h3>
              <div className="text-[13px] font-bold text-[#04152d]/60 mt-2 w-full">{resultMsg || 'Action completed successfully.'}</div>
              <button 
                onClick={onClose} 
                className="mt-6 glass-sheen px-6 py-3 bg-white/70 hover:bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 rounded-full text-[13.5px] font-black text-[#04152d] transition-all duration-300 w-full"
              >
                Close Receipt
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.1),inset_0_1px_2px_rgba(255,255,255,1)] mb-4 mt-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-[18px] font-black text-[#04152d] tracking-tight">{title}</h3>
              <div className="text-[13px] font-bold text-red-500/80 mt-2 w-full">{resultMsg || 'An error occurred during the operation.'}</div>
              <button 
                onClick={onClose} 
                className="mt-6 glass-sheen px-6 py-3 bg-white/70 hover:bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 rounded-full text-[13.5px] font-black text-[#04152d] transition-all duration-300 w-full"
              >
                Close
              </button>
            </>
          )}

          {status === 'idle' && (
            <>
              <div className="w-14 h-14 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(234,179,8,0.1),inset_0_1px_2px_rgba(255,255,255,1)] mb-4 mx-auto">
                <AlertTriangle className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-[18px] font-black text-[#04152d] tracking-tight">{title}</h3>
              
              <div className="text-[13px] font-bold text-[#04152d]/70 mt-2 mb-6 leading-relaxed w-full">
                {message}
              </div>

              <div className="flex w-full gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 glass-sheen py-3 bg-white/50 hover:bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] active:scale-95 rounded-full text-[13.5px] font-black text-[#04152d] transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={onConfirm} 
                  className="flex-1 glass-sheen py-3 bg-[#04152d] hover:bg-[#04152d]/90 text-white border border-white/20 shadow-[0_6px_16px_rgba(4,21,45,0.25)] active:scale-95 rounded-full text-[13.5px] font-black transition-all duration-300"
                >
                  {confirmText}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}