"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { Wallet, Clock, ShieldCheck, CreditCard, WalletCards, CircleDollarSign, Activity, Loader2, Search } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Header from '@/components/Header';

const CHART_COLORS = ['#04152d', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

function AuditorDashboardContent() {
  const [funds, setFunds] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [pendingDisbursements, setPendingDisbursements] = useState<any[]>([]);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  
  const [duesOverview, setDuesOverview] = useState({ collectedThisMonth: 0, targetThisMonth: 0, collectionRate: 0, unpaidMembers: 0 });
  const [loansOverview, setLoansOverview] = useState({ activeLoans: 0, totalReceivables: 0, pendingApplications: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        const res = await fetch(`${gatewayUrl}/api/finance/dashboard`);
        
        const rawText = await res.text();
        if (!res.ok) {
          console.error("Backend Error:", rawText);
          return; 
        }

        const data = JSON.parse(rawText);
        
        setFunds(data.funds || []);
        setLedger(data.ledger || []);
        setPendingDisbursements(data.incomingWebhookQueue || []);
        if (data.duesOverview) setDuesOverview(data.duesOverview);
        if (data.loansOverview) setLoansOverview(data.loansOverview);
        if (data.funds && data.funds.length > 0) setSelectedFund(data.funds[0]);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const chartData = useMemo(() => {
    return funds.map((f, index) => ({
      ...f,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [funds]);

  const activeTransactions = selectedFund ? ledger.filter(tx => tx.fundId === selectedFund.id) : [];

  const fundStyles: Record<string, string> = {
    'GF': 'bg-[#04152d] text-white', 
    'UF': 'bg-[#10b981] text-white', 
    'LN': 'bg-[#f59e0b] text-white', 
    'FA': 'bg-[#8b5cf6] text-white', 
    'DA': 'bg-[#ef4444] text-white', 
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6]">
      
      <Header />

      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 animate-fade-in flex-1">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading Audit Data...</p>
          </div>
        ) : (
          <>
        {/* Top Fund Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {funds.map((fund) => (
            <div key={fund.id} className={`relative isolate overflow-hidden rounded-[20px] p-5 shadow-sm ${fundStyles[fund.id] || 'bg-[#04152d] text-white'}`}>
              <div className="relative z-10">
                <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-90 mb-2 truncate text-left">{fund.name}</h3>
                <p className="text-2xl lg:text-[28px] font-black tracking-tight truncate text-left">
                  ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 transform -rotate-12 z-0" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          <div className="xl:col-span-2 space-y-6">
            
            {/* Audited Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                      <WalletCards size={24} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-lg font-black text-[#04152d] text-left">Collections Audit</h2>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 text-left">Verified Collections (Month)</p>
                      <p className="text-2xl font-black text-[#04152d] text-left">₱{duesOverview.collectedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-600">{duesOverview.collectionRate}%</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${duesOverview.collectionRate}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-gray-500">
                    <span>Target: ₱{duesOverview.targetThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md"><Activity size={12}/> {duesOverview.unpaidMembers} Pending</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                      <CircleDollarSign size={24} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-lg font-black text-[#04152d] text-left">Loan Portfolio Overview</h2>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 text-left">Total Expected Receivables</p>
                      <p className="text-2xl font-black text-[#04152d] text-left">₱{loansOverview.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{loansOverview.activeLoans} Active</p>
                  </div>
                  <div className="mt-5 flex justify-between items-center text-xs font-medium text-gray-500 border-t border-gray-50 pt-3">
                    <span>Current Portfolio Status</span>
                    {loansOverview.pendingApplications > 0 && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-bold">
                        {loansOverview.pendingApplications} Pending Approvals
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Pending Disbursements (Read-Only Queue Monitor) */}
            {pendingDisbursements.length > 0 && (
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2.5 rounded-xl text-gray-600">
                      <Clock size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#04152d] text-left">Treasurer Action Queue</h2>
                      <p className="text-sm text-gray-500 font-medium text-left">Disbursements awaiting Treasurer confirmation</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {pendingDisbursements.map((txn) => (
                    <div key={txn.disbursement_txn_id} className="bg-gray-50 rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      
                      <div className="flex flex-wrap gap-x-12 gap-y-4 flex-1">
                        <div className="flex flex-col max-w-[120px]">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 text-left">Member</span>
                          <p className="text-sm font-black text-[#04152d] leading-snug text-left">{txn.member_name.replace(', ', ',\n')}</p>
                          <p className="text-[11px] font-bold text-gray-500 mt-1 text-left">{txn.loan_ref}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 text-left">Amount</span>
                          <p className="text-xl font-black text-[#04152d] tracking-tighter text-left">₱{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 text-left">Target Fund</span>
                          <p className="text-sm font-black text-[#04152d] text-left">{txn.fund_to_debit}</p>
                        </div>
                      </div>

                      {/* Read-only status badge */}
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-5 py-3 font-bold text-sm flex items-center gap-2 shadow-sm">
                        <Clock size={16} className="text-amber-600" /> 
                        Awaiting Action
                      </div>
                      
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Master Audit Ledger */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 pb-4 border-b border-gray-50 flex flex-wrap gap-4 justify-between items-center bg-white">
                <div>
                  <div className="flex items-center gap-3 relative">
                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        value={selectedFund?.id || ''}
                        onChange={(e) => {
                          const target = funds.find(f => f.id === e.target.value);
                          if (target) setSelectedFund(target);
                        }}
                        className="appearance-none bg-white border border-gray-200 text-[#04152d] text-xl font-black pl-5 pr-12 py-3 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm cursor-pointer hover:bg-gray-50 transition-all w-full sm:w-auto"
                      >
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>{fund.name} Audit Log</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                        <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium mt-3 ml-1 text-left">Review of historical transaction logs</p>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1 p-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-left">Date</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-left">Transaction Detail</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Amount</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeTransactions.length > 0 ? activeTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-gray-500 font-medium text-sm whitespace-nowrap text-left">{tx.date}</td>
                        <td className="py-4 px-6 text-sm text-left">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'CASH_IN' || tx.type === 'Credit' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></div>
                            <span className="font-medium text-[#04152d]">{tx.desc}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-black text-[#04152d] text-sm whitespace-nowrap text-right">
                          {tx.type === 'CASH_OUT' || tx.type === 'Debit' ? '- ' : '+ '}₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-[#3b82f6] whitespace-nowrap text-right">
                          {tx.ref}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-gray-400 font-medium text-sm text-left">
                          No transactions recorded for this fund.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column Analytics */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-black text-[#04152d] mb-2 pb-4 border-b border-gray-50 text-left">Fund Distribution</h2>
              
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="balance"
                      nameKey="name"
                      cx="50%"
                      cy="40%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    />
                    <Tooltip 
                      formatter={(value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      height={80}
                      iconType="circle" 
                      iconSize={12} 
                      wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default function AuditorDashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <AuditorDashboardContent />
    </Suspense>
  );
}