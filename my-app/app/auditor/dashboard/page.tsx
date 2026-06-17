"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Tag, LayoutDashboard } from 'lucide-react';
import Header from '@/components/Header';

export default function AuditorDashboard() {
  const [funds, setFunds] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // CASH_IN vs CASH_OUT

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setIsLoading(true);
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        const res = await fetch(`${gatewayUrl}/api/finance/dashboard`);
        const data = await res.json();
        setFunds(data.funds || []);
        setLedger(data.ledger || []);
      } catch (err) {
        console.error('Failed to load audit data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditData();
  }, []);

  const filteredLedger = useMemo(() => {
    return ledger.filter(tx => {
      const matchesSearch = tx.desc.toLowerCase().includes(searchTerm.toLowerCase()) || tx.ref.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' ? true : tx.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [ledger, searchTerm, filterType]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      {/* Tightened padding (p-4 md:p-6) and vertical spacing (space-y-6) */}
      <main className="p-4 md:p-6 max-w-[1400px] w-full mx-auto space-y-6 animate-fade-in">
        
        {/* Auditor Fund Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {funds.map((fund) => (
            <div key={fund.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">{fund.name}</p>
              <p className="text-lg font-black text-[#04152d] text-left">₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>

        {/* Audit Ledger with Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between bg-white">
            <h2 className="text-sm font-black text-[#04152d] text-left flex items-center gap-2">
              <LayoutDashboard size={16} /> Master Transaction Audit Log
            </h2>
            
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search ref or description..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold outline-none focus:border-blue-500" 
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold outline-none cursor-pointer appearance-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="CASH_IN">Cash In</option>
                  <option value="CASH_OUT">Cash Out</option>
                </select>
              </div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Date</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Detail</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLedger.map((tx, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-xs font-medium text-gray-600 text-left">{tx.date}</td>
                  <td className="px-6 py-3 text-xs font-bold text-[#04152d] text-left">{tx.desc}</td>
                  {/* Right aligned amounts and refs as requested */}
                  <td className="px-6 py-3 text-xs font-black text-[#04152d] text-right">
                    {tx.type === 'CASH_OUT' ? '-' : '+'} ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-[10px] font-mono text-gray-500 text-right">{tx.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}