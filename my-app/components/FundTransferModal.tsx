"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface Fund {
  id: string;
  name: string;
  balance: number;
}

interface FundTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: Fund[];
  onSubmit: (data: { sourceId: string; destId: string; amount: number; notes: string }) => void;
}

export default function FundTransferModal({ isOpen, onClose, funds, onSubmit }: FundTransferModalProps) {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSourceId('');
      setDestId('');
      setAmount('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- COMMA FORMATTING HANDLER ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    if (value) {
      const splitValue = value.split('.');
      splitValue[0] = splitValue[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (splitValue[1]) splitValue[1] = splitValue[1].substring(0, 2);
      value = splitValue.join('.');
    }
    setAmount(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (!sourceId || !destId || !numericAmount || sourceId === destId) return;
    onSubmit({ sourceId, destId, amount: numericAmount, notes });
  };

  const selectedSource = funds.find(f => f.id === sourceId);
  const numericAmount = parseFloat(amount.replace(/,/g, '') || '0');
  const isInsufficient = selectedSource && numericAmount > selectedSource.balance;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-[#04152d]" /> Internal Fund Transfer
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl relative">
            <div className="flex flex-col gap-4">
              
              {/* SOURCE FUND */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">
                  Source Fund (From) *
                </label>
                <select 
                  required
                  value={sourceId} 
                  onChange={(e) => setSourceId(e.target.value)} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-blue-500 outline-none transition-colors font-bold text-[#04152d] cursor-pointer"
                >
                  <option value="" disabled>Select Source...</option>
                  {funds.length === 0 && <option value="" disabled>No active funds found in database</option>}
                  {funds.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (Bal: ₱{f.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              {/* ARROW DIVIDER */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm z-10 hidden sm:block">
                <ArrowRightLeft size={14} className="text-gray-400 rotate-90" />
              </div>

              {/* DESTINATION FUND */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">
                  Destination Fund (To) *
                </label>
                <select 
                  required
                  value={destId} 
                  onChange={(e) => setDestId(e.target.value)} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-blue-500 outline-none transition-colors font-bold text-[#04152d] cursor-pointer"
                >
                  <option value="" disabled>Select Destination...</option>
                  {funds.filter(f => f.id !== sourceId).length === 0 && sourceId && (
                    <option value="" disabled>No other funds available for transfer</option>
                  )}
                  {funds.filter(f => f.id !== sourceId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">
              Transfer Amount (₱) *
            </label>
            <input 
              type="text" 
              required
              placeholder="0.00" 
              value={amount} 
              onChange={handleAmountChange} 
              className={`w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] outline-none transition-colors font-mono font-black text-lg ${
                isInsufficient ? 'border-red-400 text-red-600 focus:ring-[3px] focus:ring-red-500/10' : 'border-[#dde3ee] focus:border-[#04152d] text-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10'
              }`} 
            />
            {isInsufficient && (
              <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> Amount exceeds source fund balance.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">
              Transfer Notes / Resolution Ref *
            </label>
            <input 
              type="text" 
              required
              placeholder="E.g., Board Reso #2026-05" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none transition-colors font-medium text-[#04152d]" 
            />
          </div>
          
          <div className="pt-2 border-t border-gray-100 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!sourceId || !destId || !amount || !notes || isInsufficient || sourceId === destId} 
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft size={16} /> Execute Transfer
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}