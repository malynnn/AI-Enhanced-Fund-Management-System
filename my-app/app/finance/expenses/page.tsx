"use client";

import { useState } from 'react';
import { 
  Receipt, 
  Wallet, 
  AlertTriangle, 
  Upload, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator
} from 'lucide-react';

// --- MOCK DATA ---
const initialBudgetCategories = [
  { id: 'BC-001', code: 'OFFICE-SUPPLIES', name: 'Office Supplies', budget: 15000, spent: 12000 },
  { id: 'BC-002', code: 'TRAVEL', name: 'Travel & Transpo', budget: 10000, spent: 4500 },
  { id: 'BC-003', code: 'MEALS', name: 'Meals & Representation', budget: 8000, spent: 7500 },
];

const initialPettyCashLedger = [
  { id: 1, date: '2026-06-01', desc: 'Replenishment from Gen Fund', type: 'REPLENISHMENT', amount: 5000, balanceAfter: 5000 },
  { id: 2, date: '2026-06-02', desc: 'Disbursement: Bond paper', type: 'DISBURSEMENT', amount: 150, balanceAfter: 4850 },
  { id: 3, date: '2026-06-03', desc: 'Disbursement: Taxi fare', type: 'DISBURSEMENT', amount: 350, balanceAfter: 4500 },
];

export default function ExpensesAndPettyCashPage() {
  const [budgetCategories, setBudgetCategories] = useState(initialBudgetCategories);
  const [pettyCashLedger, setPettyCashLedger] = useState(initialPettyCashLedger);
  const [pettyCashBalance, setPettyCashBalance] = useState(4500);

  // Form State
  const [voucherNo, setVoucherNo] = useState(`EV-${Date.now().toString().slice(-6)}`);
  const [payee, setPayee] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state for budget warning
  const activeCategory = budgetCategories.find(c => c.id === selectedCategory);
  const projectedSpent = activeCategory ? activeCategory.spent + (Number(amount) || 0) : 0;
  const utilizationPercent = activeCategory ? (projectedSpent / activeCategory.budget) * 100 : 0;
  const isApproachingBudget = utilizationPercent >= 80 && utilizationPercent <= 100;
  const isExceedingBudget = utilizationPercent > 100;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedCategory) return;

    setIsSubmitting(true);

    setTimeout(() => {
      // 1. Update budget spent amount
      setBudgetCategories(prev => prev.map(cat => 
        cat.id === selectedCategory 
          ? { ...cat, spent: cat.spent + Number(amount) } 
          : cat
      ));

      // 2. Add to Petty Cash Ledger if it's a small amount (e.g., < 1000)
      // Usually, expenses can be from bank or petty cash. For this user story, 
      // let's assume all recorded expenses here draw from petty cash to demonstrate the sub-ledger update.
      const newBalance = pettyCashBalance - Number(amount);
      setPettyCashBalance(newBalance);
      
      setPettyCashLedger(prev => [{
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: `Expense: ${purpose} (EV: ${voucherNo})`,
        type: 'DISBURSEMENT',
        amount: Number(amount),
        balanceAfter: newBalance
      }, ...prev]);

      alert(`✅ Success: Expense Voucher ${voucherNo} posted successfully!`);
      
      // Reset form
      setVoucherNo(`EV-${Date.now().toString().slice(-6)}`);
      setPayee('');
      setPurpose('');
      setAmount('');
      setSelectedCategory('');
      setFileName(null);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="p-8 min-h-screen pb-12 flex flex-col gap-6 bg-gray-50">
      
      {/* Header */}
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Expenses & Petty Cash</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Record pre-approved expenses and manage the petty cash sub-ledger.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: EXPENSE VOUCHER FORM */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 p-5 text-white flex items-center gap-3">
              <Receipt size={20} className="text-gray-300" />
              <h2 className="text-lg font-bold">Expense Voucher Form</h2>
            </div>
            
            <form onSubmit={handleSubmitVoucher} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Voucher Number</label>
                  <input 
                    type="text" 
                    value={voucherNo}
                    disabled
                    className="w-full bg-gray-100 border-none rounded-lg text-sm font-mono text-gray-600 px-4 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payee</label>
                  <input 
                    type="text" 
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    required
                    placeholder="E.g., Juan Dela Cruz"
                    className="w-full bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose of Expense</label>
                <input 
                  type="text" 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  placeholder="E.g., Monthly Office Supplies"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₱</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      required
                      min="1"
                      className="w-full bg-white border border-gray-300 rounded-lg text-sm pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Code</label>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-300 rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                  >
                    <option value="" disabled>Select Category...</option>
                    {budgetCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.code} - {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BUDGET UTILIZATION WARNING BANNER */}
              {activeCategory && amount !== '' && (
                <div className={`rounded-xl p-4 border flex items-start gap-3 transition-all ${
                  isExceedingBudget 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : isApproachingBudget 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <Calculator size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold flex justify-between items-center">
                      Budget Utilization
                      <span className="text-xs font-black">{utilizationPercent.toFixed(1)}%</span>
                    </h4>
                    <div className="w-full bg-white/50 rounded-full h-1.5 mt-2 mb-2 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${isExceedingBudget ? 'bg-red-500' : isApproachingBudget ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-medium">
                      Projected Spent: ₱{projectedSpent.toLocaleString()} / ₱{activeCategory.budget.toLocaleString()}
                    </p>
                    {isExceedingBudget && (
                      <p className="text-[10px] uppercase font-bold mt-2 flex items-center gap-1 text-red-600 bg-red-100 w-fit px-2 py-0.5 rounded">
                        <AlertTriangle size={10} /> Budget Exceeded
                      </p>
                    )}
                    {isApproachingBudget && (
                      <p className="text-[10px] uppercase font-bold mt-2 flex items-center gap-1 text-yellow-700 bg-yellow-100 w-fit px-2 py-0.5 rounded">
                        <AlertTriangle size={10} /> Approaching Limit
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Supporting Document</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <Upload size={24} className="text-gray-400 mb-2" />
                    {fileName ? (
                      <p className="text-sm font-bold text-gray-900">{fileName}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-900">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || isExceedingBudget}
                className="w-full bg-black text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : <><CheckCircle2 size={18} /> Post Expense Voucher</>}
              </button>

            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PETTY CASH SUB-LEDGER */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* Petty Cash Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <Wallet size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Petty Cash Balance</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₱{pettyCashBalance.toLocaleString()}</h3>
              </div>
            </div>
            <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
              + Replenish Fund
            </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Petty Cash Sub-Ledger</h2>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 whitespace-nowrap">Description</th>
                    <th className="px-5 py-3 whitespace-nowrap">Type</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Amount</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Running Bal.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pettyCashLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-500 font-medium whitespace-nowrap">{tx.date}</td>
                      <td className="px-5 py-4 font-bold text-gray-900">{tx.desc}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {tx.type === 'REPLENISHMENT' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[10px] uppercase bg-green-50 px-2.5 py-1 rounded-md border border-green-100">
                            <ArrowUpRight size={12}/> In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                            <ArrowDownRight size={12}/> Out
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-gray-900 whitespace-nowrap">
                        {tx.type === 'DISBURSEMENT' ? '-' : ''} ₱{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-blue-600 whitespace-nowrap">
                        ₱{tx.balanceAfter.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {pettyCashLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-medium">
                        No transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
