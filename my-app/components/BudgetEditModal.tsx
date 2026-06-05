"use client";

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  budget: number;
  actual: number;
}

interface BudgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currentYear: number;
  onSubmit: (updatedCategories: { id: string; newBudget: number }[]) => void;
}

export default function BudgetEditModal({ isOpen, onClose, categories, currentYear, onSubmit }: BudgetEditModalProps) {
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      categories.forEach(c => initial[c.id] = c.budget);
      setDraftBudgets(initial);
      setIsSubmitting(false);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API delay for backend dev
    setTimeout(() => {
      const updates = Object.entries(draftBudgets).map(([id, newBudget]) => ({ id, newBudget }));
      onSubmit(updates);
      setIsSubmitting(false);
    }, 800);
  };

  const totalDraftBudget = Object.values(draftBudgets).reduce((sum, val) => sum + (Number(val) || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3)] border border-white/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div>
            <h3 className="font-black text-lg text-[#04152d]">Fiscal Year {currentYear} Budget Planning</h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Enter or revise budget allocations per account category.</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <form id="budget-form" onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 shrink-1">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mb-4 text-blue-900">
             <AlertTriangle size={18} className="shrink-0 text-blue-600 mt-0.5" />
             <p className="text-xs font-medium leading-relaxed">
               Mid-year revisions will trigger an audit log. Ensure total allocations align with the Treasurer's approved financial resolution for the current fiscal year.
             </p>
          </div>

          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <div className="col-span-5">Account Category</div>
            <div className="col-span-3 text-right">Current Spend</div>
            <div className="col-span-4 text-right">Annual Budget Allocation</div>
          </div>

          <div className="space-y-3">
            {categories.map(cat => {
              const draftVal = draftBudgets[cat.id] || 0;
              const isDeficit = draftVal < cat.actual;
              return (
                <div key={cat.id} className="grid grid-cols-12 gap-4 items-center px-4">
                  <div className="col-span-5 font-bold text-sm text-[#04152d]">{cat.name}</div>
                  <div className="col-span-3 text-right font-mono text-sm text-gray-500">₱{cat.actual.toLocaleString()}</div>
                  <div className="col-span-4 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₱</span>
                    <input 
                      type="number" 
                      required min="0" 
                      // FIXED: Used nullish coalescing to prevent the uncontrolled input error
                      value={draftBudgets[cat.id] !== undefined ? (draftBudgets[cat.id] === 0 ? '' : draftBudgets[cat.id]) : ''} 
                      onChange={(e) => setDraftBudgets(prev => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                      className={`w-full rounded-xl pl-8 pr-3 py-2.5 text-sm bg-white border-[1.5px] ${isDeficit ? 'border-red-400 focus:ring-red-500/10' : 'border-[#dde3ee] focus:border-[#04152d] focus:ring-[#04152d]/10'} outline-none transition-colors font-mono font-bold text-[#04152d] text-right`}
                    />
                    {isDeficit && <p className="text-[9px] text-red-500 font-bold mt-1 absolute -bottom-4 right-0">Budget cannot be less than actual spend.</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </form>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="text-sm">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Planned Budget: </span>
            <span className="font-black text-[#04152d] text-lg ml-2">₱{totalDraftBudget.toLocaleString()}</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50">Cancel</button>
            <button type="submit" form="budget-form" disabled={isSubmitting || categories.some(c => (draftBudgets[c.id] || 0) < c.actual)} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50">
              {isSubmitting ? 'Saving...' : <><Save size={16} /> Save Allocations</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}