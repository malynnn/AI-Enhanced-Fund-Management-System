"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, Calendar, X } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';
import FundTransferModal from '@/components/FundTransferModal';

export default function FundPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // --- LIVE BACKEND FETCH WITH TIMEFRAME FILTER ---
  const fetchRealFundsData = async (month?: string) => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      
      // Pass the selected month to the backend to get historical balances if applicable
      const url = month ? `${gatewayUrl}/api/finance/funds?month=${month}` : `${gatewayUrl}/api/finance/funds`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((f: any) => ({
          id: f.code || f.id,
          name: f.name,
          status: 'Active',
          totalIn: Number(f.totalIn ?? 0),
          totalOut: Number(f.totalOut ?? 0),
          balance: Number(f.currentBalance ?? f.balance ?? 0)
        }));
        setFunds(mappedData);
      }
    } catch(err) {
      console.error("Network error fetching funds:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch data whenever the month filter changes
  useEffect(() => {
    fetchRealFundsData(filterMonth);
  }, [filterMonth]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && f.status === 'Active';
    });
  }, [funds, searchTerm]);
  
  // --- ANALYTICS MATH ---
  const totalAssets = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.balance, 0);
  const totalCashIn = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.totalIn, 0);
  const totalCashOut = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.totalOut, 0);

  const CHART_COLORS = ['#04152d', '#3b82f6', '#facc15', '#10b981', '#ef4444', '#8b5cf6'];
  const chartData = useMemo(() => {
    let colorIndex = 0; 
    return funds
      .filter(f => f.status === 'Active' && f.balance > 0)
      .map(f => ({ name: f.name, value: f.balance, fill: CHART_COLORS[colorIndex++ % CHART_COLORS.length] }));
  }, [funds]);

  const handleExecuteTransfer = async (data: { sourceId: string; destId: string; amount: number; notes: string }) => {
    setIsTransferModalOpen(false);
    setActionModal({ isOpen: true, title: 'Processing Transfer', message: 'Executing transaction securely...', status: 'loading' });

    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/funds/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });

      if (res.ok) {
        setFunds(prev => prev.map(f => {
          if (f.id === data.sourceId) return { ...f, balance: f.balance - data.amount, totalOut: f.totalOut + data.amount };
          if (f.id === data.destId) return { ...f, balance: f.balance + data.amount, totalIn: f.totalIn + data.amount };
          return f;
        }));
        setActionModal({ isOpen: true, title: 'Transfer Successful', message: '', status: 'success', resultMsg: `Successfully transferred ₱${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.` });
      } else {
        const errData = await res.json().catch(() => ({ error: 'Server error' }));
        setActionModal({ isOpen: true, title: 'Transfer Failed', message: '', status: 'error', resultMsg: errData.error || 'Request refused.' });
      }
    } catch (error) {
      setActionModal({ isOpen: true, title: 'Network Error', message: '', status: 'error', resultMsg: 'Failed to communicate with the server.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      
      <ActionModal 
        isOpen={actionModal.isOpen} title={actionModal.title} message={actionModal.message} status={actionModal.status} resultMsg={actionModal.resultMsg}
        onConfirm={() => setActionModal({ ...actionModal, isOpen: false })} onClose={() => setActionModal({ ...actionModal, isOpen: false })} confirmText="Acknowledge"
      />

      <FundTransferModal 
        isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} funds={funds.filter(f => f.status === 'Active')} onSubmit={handleExecuteTransfer}
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#04152d] rounded-2xl p-6 shadow-xl flex flex-col justify-center relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <Wallet size={120} strokeWidth={1} className="absolute -right-6 -bottom-6 text-white/10" />
            <div className="relative z-10">
              <p className="block text-[10px] font-black text-blue-300 uppercase tracking-[0.12em] mb-1 text-left">Total Running Balance</p>
              <p className="text-4xl font-black text-white tracking-tight text-left">
                {isLoading ? '...' : `₱${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-emerald-100 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-1 text-left">
              <TrendingUp size={14} className="text-emerald-500" />
              <p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em]">Total Collections (Cash In)</p>
            </div>
            <p className="text-2xl font-black text-emerald-600 text-left">
              {isLoading ? '...' : `+ ₱${totalCashIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-red-100 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-1 text-left">
              <TrendingDown size={14} className="text-red-500" />
              <p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em]">Total Disbursements (Cash Out)</p>
            </div>
            <p className="text-2xl font-black text-red-600 text-left">
              {isLoading ? '...' : `- ₱${totalCashOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          {/* Recharts Analytics */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {chartData.length > 0 && !isLoading ? (
              <div className="w-full h-[80px] flex items-center justify-between">
                <div className="h-[80px] w-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={3} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#04152d' }} formatter={(value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 w-1/2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Asset Distribution</p>
                  <div className="grid grid-cols-1 gap-y-1">
                    {chartData.slice(0, 3).map((d, idx) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 truncate text-left" title={d.name}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-400 text-left">{isLoading ? 'Analyzing Data...' : 'No Asset Data'}</p>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex-1 min-w-[250px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search fund pot..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d]"
            />
          </div>
          
          {/* Calendar / Month Picker Filter */}
          <div className="relative inline-flex items-center w-full sm:w-auto min-w-[160px] bg-white border-[1.5px] border-[#dde3ee] rounded-xl overflow-hidden focus-within:border-[#04152d] transition-colors">
            <div className="pl-4 pr-2 flex items-center pointer-events-none">
              <Calendar size={14} className="text-gray-400" />
            </div>
            <div className="relative flex-1">
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="w-full py-3 text-sm outline-none font-bold text-[#04152d] bg-transparent cursor-pointer opacity-0 absolute inset-0 z-10" 
              />
              <div className="py-3 text-sm font-bold text-[#04152d] pointer-events-none truncate pr-2">
                {filterMonth ? new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'All Time'}
              </div>
            </div>
            {filterMonth ? (
              <button 
                onClick={() => setFilterMonth('')} 
                className="pr-4 pl-2 text-gray-400 hover:text-red-500 z-20 transition-colors"
              >
                <X size={14} />
              </button>
            ) : (
              <div className="pr-4 pl-2 pointer-events-none">
                <Calendar size={14} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex-1 flex flex-col overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
          
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#04152d] text-left">Fund Overview</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">{filteredFunds.length} Active Pots</span>
            </div>
            
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] transition-all"
            >
              <ArrowRightLeft size={16} /> Inter-Fund Transfer
            </button>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
              <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Fund Name</th>
                  <th className="px-6 py-4 text-xs font-black text-emerald-600 uppercase tracking-wide text-right">Collections (In)</th>
                  <th className="px-6 py-4 text-xs font-black text-red-600 uppercase tracking-wide text-right">Disbursements (Out)</th>
                  <th className="px-6 py-4 text-xs font-black text-[#04152d] uppercase tracking-wide text-right pr-6">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-medium text-sm text-left">Loading fund data from database...</td></tr>
                ) : filteredFunds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                    <td className="px-6 py-5 text-left">
                      <p className="font-bold text-[#04152d] text-sm">{fund.name}</p>
                      <p className="font-mono text-xs text-gray-400 mt-0.5">{fund.id}</p>
                    </td>
                    <td className="px-6 py-5 text-right font-medium text-emerald-600 text-sm">
                      + ₱{fund.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-right font-medium text-red-600 text-sm">
                      - ₱{fund.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-right pr-6">
                      <span className="font-black text-lg text-[#04152d]">
                        ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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