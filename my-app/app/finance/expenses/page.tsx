"use client";

import { useState, useMemo } from 'react';
import { Wallet, Search, Filter, Layers, ArrowUpRight, ArrowDownRight, Plus, Receipt } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';
import ExpenseVoucherModal from '@/components/ExpenseVoucherModal';

// --- MOCK DATA ---
const initialBudgetCategories = [
  { id: 'BC-001', code: 'OFFICE-SUPPLIES', name: 'Office Supplies', budget: 15000, spent: 12000 },
  { id: 'BC-002', code: 'TRAVEL', name: 'Travel & Transpo', budget: 10000, spent: 4500 },
  { id: 'BC-003', code: 'MEALS', name: 'Meals & Representation', budget: 8000, spent: 7500 },
];

const initialPettyCashLedger = [
  { id: 1, date: '2026-06-01', desc: 'Replenishment from Gen Fund', type: 'REPLENISHMENT', amount: 5000, balanceAfter: 5000, categoryId: null },
  { id: 2, date: '2026-06-02', desc: 'Disbursement: Bond paper', type: 'DISBURSEMENT', amount: 150, balanceAfter: 4850, categoryId: 'BC-001' },
  { id: 3, date: '2026-06-03', desc: 'Disbursement: Taxi fare', type: 'DISBURSEMENT', amount: 350, balanceAfter: 4500, categoryId: 'BC-002' },
];

export default function ExpensesAndPettyCashPage() {
  const [budgetCategories, setBudgetCategories] = useState(initialBudgetCategories);
  const [pettyCashLedger, setPettyCashLedger] = useState(initialPettyCashLedger);
  const [pettyCashBalance, setPettyCashBalance] = useState(4500);

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // --- DERIVED DATA & FILTERS ---
  const filteredLedger = useMemo(() => {
    return pettyCashLedger.filter(tx => {
      const matchSearch = tx.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || tx.type === filterType;
      const matchCategory = filterCategory === 'ALL' || tx.categoryId === filterCategory;
      return matchSearch && matchType && matchCategory;
    });
  }, [pettyCashLedger, searchTerm, filterType, filterCategory]);

  const CHART_COLORS = ['#04152d', '#3b82f6', '#facc15', '#10b981', '#ef4444'];

  const chartData = useMemo(() => {
    let colorIndex = 0;
    return budgetCategories
      .filter(cat => cat.spent > 0)
      .map(cat => ({ 
        name: cat.name, 
        value: cat.spent,
        fill: CHART_COLORS[colorIndex++ % CHART_COLORS.length]
      }));
  }, [budgetCategories]);

  const totalDisbursed = pettyCashLedger.filter(t => t.type === 'DISBURSEMENT').reduce((sum, t) => sum + t.amount, 0);

  // --- HANDLERS ---
  const triggerReplenish = () => {
    setActionModal({
      isOpen: true,
      title: 'Replenish Petty Cash',
      message: `You are about to request a standard ₱5,000.00 replenishment from the General Fund to the Petty Cash Ledger. Proceed?`,
      status: 'idle'
    });
  };

  const handleExecuteReplenish = () => {
    setActionModal(prev => ({ ...prev, status: 'loading' }));
    setTimeout(() => {
      const addAmount = 5000;
      const newBalance = pettyCashBalance + addAmount;
      setPettyCashBalance(newBalance);
      setPettyCashLedger(prev => [{
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: `Replenishment from Gen Fund`,
        type: 'REPLENISHMENT',
        amount: addAmount,
        balanceAfter: newBalance,
        categoryId: null
      }, ...prev]);
      setActionModal(prev => ({ ...prev, status: 'success', resultMsg: 'Petty Cash successfully replenished.' }));
    }, 800);
  };

  const handlePostExpense = (data: { voucherNo: string; payee: string; purpose: string; amount: number; categoryId: string }) => {
    const newBalance = pettyCashBalance - data.amount;
    setPettyCashBalance(newBalance);
    setBudgetCategories(prev => prev.map(cat => cat.id === data.categoryId ? { ...cat, spent: cat.spent + data.amount } : cat));
    
    setPettyCashLedger(prev => [{
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      desc: `Expense: ${data.purpose} (EV: ${data.voucherNo})`,
      type: 'DISBURSEMENT',
      amount: data.amount,
      balanceAfter: newBalance,
      categoryId: data.categoryId
    }, ...prev]);

    setIsExpenseModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      
      <ActionModal 
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        message={actionModal.message}
        status={actionModal.status}
        resultMsg={actionModal.resultMsg}
        onConfirm={handleExecuteReplenish}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        confirmText="Confirm Action"
      />

      <ExpenseVoucherModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        budgetCategories={budgetCategories}
        onSubmit={handlePostExpense}
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#f8faff] rounded-2xl p-6 shadow-[inset_0_0_0_1.5px_rgba(219,234,254,0.5),0_4px_12px_rgba(0,0,0,0.03)] border border-blue-50 flex flex-col justify-center relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <Wallet size={120} strokeWidth={1} className="absolute -right-6 -bottom-6 text-blue-100 opacity-50" />
            <div className="relative z-10">
              <p className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.12em] mb-1">Active Petty Cash</p>
              <p className="text-4xl font-black text-[#04152d] tracking-tight">₱{pettyCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1">Total Disbursed</p>
            <p className="text-3xl font-black text-[#04152d]">₱{totalDisbursed.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">Current active ledger scope</p>
          </div>

          {/* Recharts Analytics */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {chartData.length > 0 ? (
              <div className="w-full h-[80px] flex items-center justify-between">
                <div className="h-[80px] w-[80px]">
                  {/* FIXED: minWidth and minHeight added here */}
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={3} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                        itemStyle={{ color: '#04152d' }} 
                        formatter={(value: any) => `₱${Number(value).toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 w-1/2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Spend by Category</p>
                  <div className="grid grid-cols-1 gap-y-1">
                    {chartData.slice(0, 3).map((d, idx) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 truncate">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-400">No Expense Data</p>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex-1 min-w-[250px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search description..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
            />
          </div>
          
          <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] outline-none font-bold text-[#04152d] appearance-none cursor-pointer">
              <option value="ALL">All Types</option>
              <option value="REPLENISHMENT">Replenishments</option>
              <option value="DISBURSEMENT">Disbursements</option>
            </select>
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] outline-none font-bold text-[#04152d] appearance-none cursor-pointer">
              <option value="ALL">All Categories</option>
              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex-1 flex flex-col overflow-hidden animate-slide-up" style={{ animationDelay: '0.25s' }}>
          
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#04152d]">Petty Cash Sub-Ledger</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">{filteredLedger.length} Records</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
              >
                <Receipt size={16} /> Record Expense
              </button>
              <button 
                onClick={triggerReplenish}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#04152d] border-[1.5px] border-[#dde3ee] font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_2px_0_rgba(221,227,238,1)] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Plus size={16} /> Replenish
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
              <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-right pr-6">Running Bal.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLedger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                    <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 font-medium text-[#04152d] text-sm">{tx.desc}</td>
                    <td className="px-6 py-5 text-center">
                      {tx.type === 'REPLENISHMENT' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]">
                          <ArrowUpRight size={12}/> In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-700 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)]">
                          <ArrowDownRight size={12}/> Out
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-[#04152d] text-sm">
                      {tx.type === 'DISBURSEMENT' ? '-' : ''} ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-blue-600 text-sm pr-6">
                      ₱{tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium text-sm">
                      No transactions match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}