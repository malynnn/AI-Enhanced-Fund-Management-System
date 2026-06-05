// components/FundTransferModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface Fund {
  id: string;
  name: string;
  balance: number;
}

interface FundTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: Fund[];
  onSubmit: (transferData: { sourceId: string; destId: string; amount: number; notes: string }) => void;
}

export default function FundTransferModal({ isOpen, onClose, funds, onSubmit }: FundTransferModalProps) {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setSourceId('');
      setDestId('');
      setAmount('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sourceFund = funds.find(f => f.id === sourceId);
  const isInsufficient = sourceFund && Number(amount) > sourceFund.balance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !destId || !amount || sourceId === destId || isInsufficient) return;
    
    setIsSubmitting(true);
    // Simulate API Delay
    setTimeout(() => {
      onSubmit({ sourceId, destId, amount: Number(amount), notes });
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop flex flex-col">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-blue-500" /> Internal Fund Transfer
          </h3>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <form id="transfer-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="grid grid-cols-1 gap-4 bg-[#f8faff] p-4 rounded-xl border border-blue-100">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Source Fund (From)</label>
              <select value={sourceId} onChange={e => setSourceId(e.target.value)} required className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d] cursor-pointer">
                <option value="" disabled>Select Source...</option>
                {funds.map(f => <option key={`src-${f.id}`} value={f.id}>{f.name} (Bal: ₱{f.balance.toLocaleString()})</option>)}
              </select>
            </div>
            
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white p-1.5 rounded-full border border-gray-200 shadow-sm text-gray-400"><ArrowRightLeft size={16} className="rotate-90" /></div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Destination Fund (To)</label>
              <select value={destId} onChange={e => setDestId(e.target.value)} required className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d] cursor-pointer">
                <option value="" disabled>Select Destination...</option>
                {funds.map(f => <option key={`dst-${f.id}`} value={f.id} disabled={f.id === sourceId}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Transfer Amount (₱)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required min="1" className={`w-full rounded-xl pl-8 pr-4 py-3 text-sm bg-white border-[1.5px] ${isInsufficient ? 'border-red-500 focus:ring-red-500/10' : 'border-[#dde3ee] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10'} outline-none transition-colors font-mono font-black text-[#04152d] text-lg`} />
            </div>
            {isInsufficient && <p className="text-xs font-bold text-red-500 mt-1.5">Insufficient balance in source fund.</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Transfer Notes / Resolution Ref</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} required placeholder="E.g., Board Reso #2026-05" className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d]" />
          </div>

        </form>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50">Cancel</button>
          <button type="submit" form="transfer-form" disabled={isSubmitting || isInsufficient || !sourceId || !destId || sourceId === destId} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Processing...' : <><CheckCircle2 size={16} /> Execute Transfer</>}
          </button>
        </div>

      </div>
    </div>
  );
}