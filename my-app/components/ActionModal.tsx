// components/ActionModal.tsx
"use client";

import { CheckCircle2, AlertTriangle, X, Loader } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  resultMsg?: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
}

export default function ActionModal({ 
  isOpen, title, message, status, resultMsg, onConfirm, onClose, confirmText = "Confirm Action" 
}: ActionModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <h3 className="font-black text-lg text-[#04152d]">{title}</h3>
          <button 
            onClick={onClose}
            disabled={status === 'loading'}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-[inset_0_0_0_2px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-xl font-black text-[#04152d]">Action Successful</h4>
              <p className="text-sm font-medium text-gray-500">{resultMsg || 'The operation was completed successfully.'}</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2 shadow-[inset_0_0_0_2px_rgba(220,38,38,0.2)]">
                <AlertTriangle size={32} />
              </div>
              <h4 className="text-xl font-black text-[#04152d]">Operation Failed</h4>
              <p className="text-sm font-medium text-gray-500">{resultMsg || 'An error occurred while processing the request.'}</p>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-full shrink-0">
                <AlertTriangle size={24} />
              </div>
              <p className="text-sm font-medium text-gray-600 leading-relaxed pt-1">
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          {status === 'success' || status === 'error' ? (
            <button 
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
            >
              Close
            </button>
          ) : (
            <>
              <button 
                onClick={onClose}
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 bg-[#facc15] text-[#04152d] font-black py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(110,76,0,0.45),0_4px_18px_rgba(250,204,21,0.4)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(110,76,0,0.45),0_2px_8px_rgba(250,204,21,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <><Loader size={16} className="animate-spin" /> Processing...</>
                ) : confirmText}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}