// app/finance/funds/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Briefcase, Search, Filter, Layers, ArrowRightLeft, ShieldAlert, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';
import FundTransferModal from '@/components/FundTransferModal';

export default function FundManagementPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- LIVE BACKEND FETCH ---
  const fetchRealFundsData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/funds');
      if (res.ok) {
        const data = await res.json();
        setFunds(data);
      } else {
        console.error("Failed to fetch funds data from backend.");
      }
    } catch(err) {
      console.error("Network error fetching funds:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the fetch on initial mount
  useEffect(() => {
    fetchRealFundsData();
  }, []);

  // Modal States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('Active');

  // --- DERIVED DATA & FILTERS ---
  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || f.type === filterType;
      const matchStatus = filterStatus === 'ALL' || f.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [funds, searchTerm, filterType, filterStatus]);

  const uniqueTypes = Array.from(new Set(funds.map(f => f.type)));
  
  // Analytics Math
  const totalAssets = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.balance, 0);
  const operationalFunds = funds.filter(f => f.status === 'Active' && f.type === 'Operational').reduce((sum, f) => sum + f.balance, 0);

  // Chart Data
  const CHART_COLORS = ['#04152d', '#3b82f6', '#facc15', '#10b981', '#ef4444', '#8b5cf6'];

  const chartData = useMemo(() => {
    let colorIndex = 0; 
    return funds
      .filter(f => f.status === 'Active' && f.balance > 0)
      .map(f => ({ 
        name: f.name, 
        value: f.balance,
        fill: CHART_COLORS[colorIndex++ % CHART_COLORS.length] 
      }));
  }, [funds]);

  // --- LIVE BACKEND TRANSFER HANDLER ---
  const handleExecuteTransfer = async (data: { sourceId: string; destId: string; amount: number; notes: string }) => {
    // 1. Close the input form and show the loading modal
    setIsTransferModalOpen(false);
    setActionModal({
      isOpen: true,
      title: 'Processing Transfer',
      message: 'Executing transaction securely with the database...',
      status: 'loading'
    });

    try {
      // 2. Send actual data to backend
      const res = await fetch('/api/finance/funds/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        // 3. Locally update UI so it feels instantaneous
        setFunds(prev => prev.map(f => {
          if (f.id === data.sourceId) return { ...f, balance: f.balance - data.amount };
          if (f.id === data.destId) return { ...f, balance: f.balance + data.amount };
          return f;
        }));

        // 4. Show Success
        setActionModal({
          isOpen: true,
          title: 'Transfer Successful',
          message: '',
          status: 'success',
          resultMsg: `Successfully transferred ₱${data.amount.toLocaleString()} based on ${data.notes}.`
        });
      } else {
        const errData = await res.json();
        setActionModal({
          isOpen: true,
          title: 'Transfer Failed',
          message: '',
          status: 'error',
          resultMsg: errData.error || 'The backend refused the transfer request.'
        });
      }
    } catch (error) {
      setActionModal({
        isOpen: true,
        title: 'Network Error',
        message: '',
        status: 'error',
        resultMsg: 'Failed to communicate with the server. Please check your connection.'
      });
    }
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

      <FundTransferModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        funds={funds.filter(f => f.status === 'Active')} 
        onSubmit={handleExecuteTransfer}
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#f8faff] rounded-2xl p-6 shadow-[inset_0_0_0_1.5px_rgba(219,234,254,0.5),0_4px_12px_rgba(0,0,0,0.03)] border border-blue-50 flex flex-col justify-center relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <Briefcase size={120} strokeWidth={1} className="absolute -right-6 -bottom-6 text-blue-100 opacity-50" />
            <div className="relative z-10">
              <p className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.12em] mb-1">Total Active Assets</p>
              <p className="text-4xl font-black text-[#04152d] tracking-tight">
                {isLoading ? '...' : `₱${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1">Operational Liquidity</p>
            <p className="text-3xl font-black text-[#04152d]">
              {isLoading ? '...' : `₱${operationalFunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-xs font-bold text-emerald-600 mt-2 bg-emerald-50 w-fit px-2 py-0.5 rounded-md shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]">
              {((operationalFunds / totalAssets) * 100 || 0).toFixed(1)}% of total assets
            </p>
          </div>

          {/* Recharts Analytics */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {chartData.length > 0 && !isLoading ? (
              <div className="w-full h-[80px] flex items-center justify-between">
                <div className="h-[80px] w-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={chartData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={25} 
                        outerRadius={38} 
                        paddingAngle={3} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                        itemStyle={{ color: '#04152d' }} 
                        formatter={(value: any) => `₱${Number(value).toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 w-1/2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Asset Distribution</p>
                  <div className="grid grid-cols-1 gap-y-1">
                    {chartData.slice(0, 3).map((d, idx) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 truncate" title={d.name}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-400">{isLoading ? 'Analyzing Data...' : 'No Asset Data'}</p>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex-1 min-w-[250px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search fund name..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
            />
          </div>
          
          <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] outline-none font-bold text-[#04152d] appearance-none cursor-pointer">
              <option value="ALL">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] outline-none font-bold text-[#04152d] appearance-none cursor-pointer">
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex-1 flex flex-col overflow-hidden animate-slide-up" style={{ animationDelay: '0.25s' }}>
          
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#04152d]">Fund Ledger Overview</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">{filteredFunds.length} Funds</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsTransferModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
              >
                <ArrowRightLeft size={16} /> Inter-Fund Transfer
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
              <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide">Fund Name</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide">System ID</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-center">Type Classification</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-right pr-6">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium text-sm">Loading fund data from database...</td></tr>
                ) : filteredFunds.map((fund) => (
                  <tr key={fund.id} className={`transition-colors duration-100 ${fund.status === 'Inactive' ? 'bg-gray-50/70 opacity-60 grayscale hover:bg-gray-100/70' : 'hover:bg-[#e8edf8]/60'}`}>
                    
                    <td className="px-6 py-5 font-medium text-[#04152d] text-sm">{fund.name}</td>
                    <td className="px-6 py-5 font-mono text-sm text-gray-500">{fund.id}</td>
                    <td className="px-6 py-5 text-center text-sm text-gray-600">{fund.type}</td>
                    
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide ${
                        fund.status === 'Inactive' ? 'bg-gray-200 text-gray-600 border border-gray-300/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                      }`}>
                        {fund.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-5 text-right font-semibold text-[#04152d] text-sm pr-6">
                      ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredFunds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium text-sm">
                      No funds match your current filters.
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