"use client";

import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Calculator, AlertTriangle, Receipt } from 'lucide-react';

interface BudgetCategory {
  id: string;
  accountCode: string;
  accountName: string;
  approvedAmount: number;
  fiscalYear: number;
  totalSpent: number;
  remainingBudget: number;
  utilizationPercent: number;
  isExceeded: boolean;
}

interface ExpenseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetCategories: BudgetCategory[];
  onSubmit: (expenseData: {
    voucherNo: string;
    payee: string;
    purpose: string;
    amount: number;
    accountCode: string;
  }) => void;
}

export default function ExpenseVoucherModal({ isOpen, onClose, budgetCategories, onSubmit }: ExpenseVoucherModalProps) {
  const [voucherNo, setVoucherNo] = useState('');
  const [payee, setPayee] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVoucherNo(`EV-${Date.now().toString().slice(-6)}`);
      setPayee('');
      setPurpose('');
      setAmount('');
      setSelectedCategoryId('');
      setFileName(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCategory = budgetCategories.find(c => c.id === selectedCategoryId);
  const projectedSpent = activeCategory ? activeCategory.totalSpent + (Number(amount) || 0) : 0;
  const utilizationPercent = activeCategory && activeCategory.approvedAmount > 0
    ? (projectedSpent / activeCategory.approvedAmount) * 100
    : 0;
  const isApproachingBudget = utilizationPercent >= 80 && utilizationPercent <= 100;
  const isExceedingBudget = utilizationPercent > 100;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedCategoryId || isExceedingBudget || !activeCategory) return;

    setIsSubmitting(true);
    onSubmit({
      voucherNo,
      payee,
      purpose,
      amount: Number(amount),
      accountCode: activeCategory.accountCode,
    });
    // Note: the parent is async; it will close the modal when done
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2">
            <Receipt size={20} className="text-blue-500" /> Expense Voucher Form
          </h3>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 shrink-1">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Voucher Number</label>
                <input type="text" value={voucherNo} disabled className="w-full rounded-xl px-4 py-3 text-sm bg-gray-100 border-[1.5px] border-[#dde3ee] font-mono font-bold text-gray-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Payee</label>
                <input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} required placeholder="E.g., Juan Dela Cruz" className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Purpose of Expense</label>
              <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} required placeholder="E.g., Monthly Office Supplies" className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Amount (₱)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required min="1" className="w-full rounded-xl pl-8 pr-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-black text-[#04152d] text-lg" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Account / Budget Category</label>
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} required className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d] cursor-pointer appearance-none">
                  <option value="" disabled>Select Category...</option>
                  {budgetCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.accountCode} - {cat.accountName}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeCategory && amount !== '' && (
              <div className={`rounded-xl p-5 border flex items-start gap-3 transition-all ${isExceedingBudget ? 'bg-red-50 border-red-200 text-red-800 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.2)]' : isApproachingBudget ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.2)]' : 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-[inset_0_0_0_1.5px_rgba(16,185,129,0.2)]'}`}>
                <Calculator size={20} className="mt-0.5 flex-shrink-0 opacity-80" />
                <div className="flex-1 w-full">
                  <h4 className="text-sm font-black flex justify-between items-center mb-2">
                    Budget Utilization <span className="font-mono">{utilizationPercent.toFixed(1)}%</span>
                  </h4>
                  <div className="w-full bg-white/60 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner">
                    <div className={`h-1.5 rounded-full ${isExceedingBudget ? 'bg-red-500' : isApproachingBudget ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(utilizationPercent, 100)}%` }}></div>
                  </div>
                  <p className="text-xs font-bold opacity-80">
                    Projected: ₱{projectedSpent.toLocaleString()} / ₱{activeCategory.approvedAmount.toLocaleString()}
                    <span className="ml-3 text-[10px] text-gray-500">(₱{activeCategory.remainingBudget.toLocaleString()} remaining)</span>
                  </p>
                  {isExceedingBudget && <p className="text-[10px] uppercase font-black mt-3 flex items-center gap-1.5 text-red-700 bg-red-100/80 w-fit px-2.5 py-1 rounded-md"><AlertTriangle size={12} /> Budget Exceeded</p>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Supporting Document</label>
              <div className="border-[1.5px] border-dashed border-[#dde3ee] rounded-xl p-6 text-center hover:bg-[#f8faff] hover:border-blue-300 transition-colors cursor-pointer relative bg-gray-50/50">
                <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload size={24} className="text-blue-500 mb-2" />
                  {fileName ? <p className="text-sm font-bold text-[#04152d]">{fileName}</p> : <><p className="text-sm font-bold text-[#04152d]">Click or Drag to Upload</p><p className="text-xs font-medium text-gray-400 mt-1">PDF, JPG, or PNG (Max 5MB)</p></>}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50">Cancel</button>
          <button type="submit" form="expense-form" disabled={isSubmitting || isExceedingBudget || !selectedCategoryId} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Posting...' : <><CheckCircle2 size={16} /> Post Voucher</>}
          </button>
        </div>

      </div>
    </div>
  );
}