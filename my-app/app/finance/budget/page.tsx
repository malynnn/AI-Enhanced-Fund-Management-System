// app/finance/budget/page.tsx
"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, Suspense } from 'react';
import { Target, AlertTriangle, ArrowUpRight, TrendingDown, Settings2, CalendarDays } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';
import BudgetEditModal from '@/components/BudgetEditModal';

// --- MOCK DATABASE ---
const initialCategories = [
  { id: 'CAT-001', name: 'Office Supplies & IT', budget: 150000, actual: 135000 }, 
  { id: 'CAT-002', name: 'Travel & Transportation', budget: 80000, actual: 85000 }, 
  { id: 'CAT-003', name: 'Union Assembly & Events', budget: 350000, actual: 120000 }, 
  { id: 'CAT-004', name: 'Legal & Professional Fees', budget: 120000, actual: 40000 }, 
  { id: 'CAT-005', name: 'Miscellaneous Expenses', budget: 50000, actual: 42500 }, 
];

function BudgetMonitoringContent() {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // --- DERIVED DATA ---
  const enrichedCategories = useMemo(() => {
    return categories.map(cat => {
      const variance = cat.budget - cat.actual;
      const utilization = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
      let status = 'ON_TRACK';
      let color = '#10b981'; // Emerald
      
      if (utilization > 100) { status = 'EXCEEDED'; color = '#ef4444'; } // Red
      else if (utilization >= 80) { status = 'WARNING'; color = '#facc15'; } // Yellow

      return { ...cat, variance, utilization, status, color };
    });
  }, [categories]);

  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);
  const overallUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // Alert System Logic
  const exceededCats = enrichedCategories.filter(c => c.status === 'EXCEEDED');
  const warningCats = enrichedCategories.filter(c => c.status === 'WARNING');
  const hasAlerts = exceededCats.length > 0 || warningCats.length > 0;

  // --- HANDLERS ---
  const handleSaveBudget = (updates: { id: string; newBudget: number }[]) => {
    setIsEditModalOpen(false);
    setActionModal({
      isOpen: true,
      title: 'Updating Financial Budget',
      message: 'Processing mid-year budget revisions...',
      status: 'loading'
    });

    // Simulate Backend Save
    setTimeout(() => {
      setCategories(prev => prev.map(cat => {
        const update = updates.find(u => u.id === cat.id);
        return update ? { ...cat, budget: update.newBudget } : cat;
      }));
      
      setActionModal({
        isOpen: true,
        title: 'Budget Revised',
        message: '',
        status: 'success',
        resultMsg: `Successfully updated budget allocations for Fiscal Year ${selectedYear}. Audit logs have been updated.`
      });
    }, 1000);
  };

  // --- COMPONENTS ---
  // Reusable Half-Gauge Chart Component
  const GaugeChart = ({ actual, budget, color }: { actual: number, budget: number, color: string }) => {
    const cappedActual = Math.min(actual, budget); 
    const remainder = Math.max(0, budget - actual);
    const data = [
      { name: 'Utilized', value: actual, fill: color },
      { name: 'Remaining', value: remainder, fill: '#f1f5f9' }
    ];
    
    return (
      <div className="h-[80px] w-[160px] relative flex flex-col items-center">
        {/* REMOVED ResponsiveContainer and explicitly set width/height */}
        <PieChart width={160} height={80}>
          <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value" stroke="none" />
          <Tooltip formatter={(value: any) => `₱${Number(value).toLocaleString()}`} />
        </PieChart>
        
        <div className="absolute bottom-0 text-center">
          <span className="text-xs font-black text-[#04152d]">{((actual / (budget || 1)) * 100).toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      
      <ActionModal 
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        message={actionModal.message}
        status={actionModal.status}
        resultMsg={actionModal.resultMsg}
        onConfirm={() => setActionModal({ ...actionModal, isOpen: false })}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        confirmText="Acknowledge"
      />

      <BudgetEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        categories={categories}
        currentYear={selectedYear}
        onSubmit={handleSaveBudget}
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">

        {/* NEW: Dedicated Control & Filter Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center justify-between animate-slide-up" style={{ animationDelay: '0.05s' }}>
          
          <div className="flex items-center gap-3">
            <div className="relative inline-block min-w-[220px]">
              <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] outline-none font-bold text-[#04152d] appearance-none cursor-pointer transition-colors"
              >
                <option value={2026}>Fiscal Year 2026</option>
                <option value={2025}>Fiscal Year 2025 (Archived)</option>
                <option value={2024}>Fiscal Year 2024 (Archived)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsEditModalOpen(true)}
            disabled={selectedYear !== new Date().getFullYear()} // Only allow editing current year
            className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings2 size={16} /> Edit Allocations
          </button>
        </div>

        {/* Dynamic Alert Banner */}
        {hasAlerts && (
          <div className={`p-4 rounded-xl border flex items-start gap-4 shadow-sm animate-pop ${exceededCats.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`} style={{ animationDelay: '0.1s' }}>
            <AlertTriangle className={`shrink-0 mt-0.5 ${exceededCats.length > 0 ? 'text-red-500' : 'text-amber-500'}`} size={24} />
            <div>
              <h3 className={`font-black text-sm ${exceededCats.length > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                Budget Threshold Alert
              </h3>
              <p className={`text-xs font-medium mt-1 ${exceededCats.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {exceededCats.length > 0 
                  ? `Critical: ${exceededCats.map(c => c.name).join(', ')} have exceeded 100% of their allocated budget. Immediate review required.`
                  : `Warning: ${warningCats.map(c => c.name).join(', ')} are approaching their limit (≥80% utilized).`}
              </p>
            </div>
          </div>
        )}

        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Fiscal Budget</p>
            <p className="text-3xl font-black text-[#04152d]">₱{totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Actual Spend YTD</p>
            <p className="text-3xl font-black text-[#04152d]">₱{totalActual.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden">
            <Target size={100} className="absolute -right-4 -bottom-4 text-gray-50 opacity-50 pointer-events-none" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 relative z-10">Overall Utilization</p>
            <div className="flex items-end gap-3 relative z-10">
              <p className="text-3xl font-black text-[#04152d]">{overallUtilization.toFixed(1)}%</p>
              <span className={`text-xs font-bold mb-1.5 px-2 py-0.5 rounded-md ${overallUtilization > 90 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {totalBudget - totalActual >= 0 ? `₱${(totalBudget - totalActual).toLocaleString()} Left` : 'Deficit'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Utilization Gauges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {enrichedCategories.map(cat => (
            <div key={cat.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-between">
              <p className="text-xs font-bold text-[#04152d] text-center mb-4 truncate w-full" title={cat.name}>{cat.name}</p>
              <GaugeChart actual={cat.actual} budget={cat.budget} color={cat.color} />
            </div>
          ))}
        </div>

        {/* Budget vs Actual Comparison Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px] animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
            <h2 className="text-xl font-black text-[#04152d]">Category Variance Ledger</h2>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-[#f8faff] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Budgeted</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actual Spend</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Variance</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Utilization</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrichedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors duration-100">
                    <td className="px-6 py-5 text-sm font-medium text-[#04152d]">{cat.name}</td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-500 text-right">₱{cat.budget.toLocaleString()}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#04152d] text-right">₱{cat.actual.toLocaleString()}</td>
                    <td className={`px-6 py-5 text-sm font-semibold text-right ${cat.variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {cat.variance < 0 ? '-' : '+'}₱{Math.abs(cat.variance).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center w-48">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(cat.utilization, 100)}%`, backgroundColor: cat.color }}></div>
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-10 text-right">{cat.utilization.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                        cat.status === 'EXCEEDED' ? 'bg-red-50 text-red-700 border-red-200/50' : 
                        cat.status === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                      }`}>
                        {cat.status === 'EXCEEDED' ? <TrendingDown size={12}/> : cat.status === 'WARNING' ? <AlertTriangle size={12}/> : <ArrowUpRight size={12}/>}
                        {cat.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function BudgetMonitoringPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BudgetMonitoringContent />
    </Suspense>
  );
}