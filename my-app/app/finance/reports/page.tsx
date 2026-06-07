"use client";

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FileText, Download, Eye, Filter, Calendar, Layers, CheckCircle2, BarChart3, Database } from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

// --- MOCK DATABASE ---
const reportTypes = [
  { id: 'balances', title: 'Statement of Balances', desc: 'Current standing of all fund accounts.' },
  { id: 'income_expense', title: 'Income & Expense', desc: 'Net revenue against operational costs.' },
  { id: 'cash_flow', title: 'Cash Flow Statement', desc: 'Inflows and outflows of liquid assets.' },
  { id: 'fund_utilization', title: 'Fund Utilization Report', desc: 'Budget vs. actuals for specific funds.' },
  { id: 'dues_summary', title: 'Dues Summary Report', desc: 'Collection rates and delinquency.' },
  { id: 'general_ledger', title: 'General Ledger', desc: 'Master record of all transactions.' },
];

export default function FinancialReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'Auditor';

  // --- STATE ---
  const [filterType, setFilterType] = useState('All Report Types');
  const [filterMonth, setFilterMonth] = useState('April 2026');
  const [filterFund, setFilterFund] = useState('All Funds');

  // --- MODAL STATE MANAGEMENT ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'view' | 'download' | null;
    payload?: any;
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', actionType: null, status: 'idle' });

  // --- MODAL TRIGGERS ---
  const triggerReportGeneration = (report: any, action: 'view' | 'download') => {
    setModal({
      isOpen: true,
      title: `Confirm Report ${action === 'view' ? 'Generation' : 'Download'}`,
      message: `You are about to generate the official ${report.title} for ${filterMonth} (${filterFund}). This action will be logged in the system audit trail. Proceed?`,
      actionType: action,
      payload: { reportId: report.id, reportTitle: report.title },
      status: 'idle'
    });
  };

  // --- EXECUTE API LOGIC VIA MODAL ---
  const executeModalAction = () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    
    // Simulate backend PDF/View generation delay
    setTimeout(() => {
      const { reportTitle } = modal.payload;
      setModal(prev => ({ 
        ...prev, 
        status: 'success', 
        resultMsg: modal.actionType === 'download' 
          ? `${reportTitle} successfully generated and downloaded.`
          : `${reportTitle} data successfully compiled for viewing.`
      }));
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      
      {/* Global Confirmation Modal */}
      <ActionModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        status={modal.status}
        resultMsg={modal.resultMsg}
        onConfirm={executeModalAction}
        onClose={() => setModal({ ...modal, isOpen: false })}
        confirmText={modal.actionType === 'download' ? "Generate & Download" : "Generate & View"}
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">
        
        {/* KPI STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Available Reports</p>
                <p className="text-3xl font-black text-[#04152d]">{reportTypes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Generated This Month</p>
                <p className="text-3xl font-black text-[#04152d]">14</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Database size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">System Status</p>
                <p className="text-xl font-black text-[#04152d] mt-1 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" /> Synced
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INLINE FILTER BAR */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="flex-1 min-w-[200px] relative">
            <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer"
            >
              <option value="All Report Types">All Report Types</option>
              <option value="Monthly Statements">Monthly Statements</option>
              <option value="Annual Statements">Annual Statements</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
          
          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select 
              value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} 
              className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer"
            >
              <option value="April 2026">April 2026</option>
              <option value="March 2026">March 2026</option>
              <option value="February 2026">February 2026</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select 
              value={filterFund} onChange={(e) => setFilterFund(e.target.value)} 
              className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer"
            >
              <option value="All Funds">All Funds</option>
              <option value="General Fund">General Fund</option>
              <option value="Union Fund">Union Fund</option>
              <option value="Loans">Loans</option>
              <option value="Foreign Assistance">Foreign Assistance</option>
              <option value="Death Assistance">Death Assistance</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        {/* REPORTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          {reportTypes.map((report) => (
            <div key={report.id} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08),0_24px_60px_rgba(0,0,0,0.12)] transition-all duration-300">
              
              <div className="flex items-start gap-4 mb-8">
                <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600 shadow-[inset_0_0_0_1.5px_rgba(250,204,21,0.2)] shrink-0">
                  <FileText size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#04152d] leading-tight mb-1.5">{report.title}</h3>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">{report.desc}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-auto pt-5 border-t border-gray-100">
                <button 
                  onClick={() => triggerReportGeneration(report, 'view')}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-150 border border-gray-200"
                >
                  <Eye size={16} /> View
                </button>
                <button 
                  onClick={() => triggerReportGeneration(report, 'download')}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-[0_4px_0_rgba(2,6,15,0.55),0_4px_12px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
                >
                  <Download size={16} /> Download
                </button>
              </div>
              
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}