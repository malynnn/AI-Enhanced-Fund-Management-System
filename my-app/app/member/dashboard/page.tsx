"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { CircleDollarSign, WalletCards, Activity, ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Header from '@/components/Header';

export default function MemberDashboard() {
  const { data: session } = useSession();
  const [repayments, setRepayments] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback for demonstration if session isn't fully wired yet
  const currentUser = session?.user?.name || "Ven"; 
  const currentUserId = (session?.user as any)?.id || "BDOEA-001"; // Dynamically resolved from login session

  useEffect(() => {
    const loadPersonalData = async () => {
      try {
        setIsLoading(true);
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        
        // Fetch both Loans (Repayments) and Dues (Collections)
        const [repaymentsRes, collectionsRes] = await Promise.all([
          fetch(`${gatewayUrl}/api/finance/repayments`),
          fetch(`${gatewayUrl}/api/finance/collections`).catch(() => fetch(`${gatewayUrl}/api/finance/dues`)) // Fallback if endpoint varies
        ]);
        
        if (repaymentsRes.ok) {
          const repData = await repaymentsRes.json();
          setRepayments(repData.filter((r: any) => r.memberName.toLowerCase().includes(currentUser.toLowerCase())));
        }

        if (collectionsRes && collectionsRes.ok) {
          const colData = await collectionsRes.json();
          // Filter collections specifically for 'DUES' for this user
          const userDues = colData.filter((c: any) => 
            c.name?.toLowerCase().includes(currentUser.toLowerCase()) && 
            (c.collectionType === 'DUES' || c.type === 'DUES')
          );
          setCollections(userDues);
        }
      } catch (error) {
        console.error('Error loading personal ledger:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonalData();
  }, [currentUser]);

  // --- LOAN COMPUTATIONS ---
  // Note: Original capital would ideally come from the external loan system API.
  const assumedOriginalCapital = 50000.00; 
  const processedLoans = repayments.filter(r => r.status === 'PROCESSED');
  const totalPrincipalPaid = processedLoans.reduce((acc, curr) => acc + Number(curr.principalAmount || 0), 0);
  const remainingBalance = Math.max(0, assumedOriginalCapital - totalPrincipalPaid);

  // --- DUES COMPUTATIONS ---
  // Assuming a standard 12-month tracking year for the pie chart
  const monthsPaid = collections.filter(c => c.status === 'CONFIRMED').length;
  const monthsPending = collections.filter(c => c.status === 'PENDING').length;
  const monthsUnpaid = Math.max(0, 12 - (monthsPaid + monthsPending));

  const duesChartData = [
    { name: 'Paid', value: monthsPaid, fill: '#10b981' },
    { name: 'Pending', value: monthsPending, fill: '#f59e0b' },
    { name: 'Unpaid', value: monthsUnpaid, fill: '#e5e7eb' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="p-4 md:p-8 max-w-[1400px] w-full mx-auto space-y-6 animate-fade-in">

        {/* Welcome Banner */}
        <div className="bg-[#04152d] rounded-2xl p-6 text-white shadow-lg flex justify-between items-center overflow-hidden relative">
          <div className="relative z-10">
            <h1 className="text-2xl font-black mb-1">Welcome back, {currentUser}</h1>
            <p className="text-blue-200 text-sm">Your personal transparency ledger is up to date.</p>
          </div>
          <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-5 transform rotate-12" />
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#04152d] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1 text-left">Remaining Loan Balance</p>
            <p className="text-3xl font-black tracking-tight text-left">₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg w-fit">
              <CircleDollarSign size={14} /> Active Loan
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Standard Monthly Dues</p>
            <p className="text-3xl font-black text-[#04152d] text-left">₱500.00</p>
            <div className="mt-4 text-xs font-medium text-gray-500 text-left">
              Total Contributions Logged: <span className="text-emerald-600 font-bold">{collections.length}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="h-20 w-20 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={duesChartData} dataKey="value" nameKey="name" innerRadius={20} outerRadius={35} paddingAngle={4} />
                  <Tooltip formatter={(value: any) => `${value} months`} contentStyle={{ borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Dues Status (Annual)</p>
              <p className="text-sm font-semibold text-gray-800 text-left">{monthsPaid} Months Paid</p>
              {monthsPending > 0 && <p className="text-xs text-amber-500 font-bold text-left">{monthsPending} Pending Verification</p>}
            </div>
          </div>
        </div>

        {/* Table & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Dues History Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-black text-[#04152d] text-left">Recent Transactions (Dues & Loans)</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Date</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Type / Ref</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Amount</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-left">Loading records...</td></tr>
                  ) : [...collections, ...repayments].sort((a, b) => new Date(b.createdAt || b.processedAt).getTime() - new Date(a.createdAt || a.processedAt).getTime()).slice(0, 8).map((row, idx) => {
                    
                    const isLoan = !!row.loanReference;
                    const dateDisplay = new Date(row.createdAt || row.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const amount = Number(row.amountPaid || row.amount || 0);

                    return (
                      <tr key={idx} className="hover:bg-[#e8edf8]/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 text-left">{dateDisplay}</td>
                        <td className="px-6 py-4 text-sm text-left">
                          <span className="font-bold text-[#04152d] block">{isLoan ? 'Loan Repayment' : 'Union Dues'}</span>
                          <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-widest mt-0.5">{row.paymentMethod || row.method}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-[#04152d] text-left">₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-left">
                          {(row.status === 'CONFIRMED' || row.status === 'PROCESSED') ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">
                              <CheckCircle2 size={10} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded border border-amber-100 uppercase tracking-wide">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && collections.length === 0 && repayments.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-left">No recent transactions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Current Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-[#04152d] mb-6 text-left">Account Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500 text-left">Member ID</span>
                <span className="text-sm font-bold text-[#04152d] font-mono text-left">{currentUserId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500 text-left">Account Status</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-left">ACTIVE</span>
              </div>
              
              <div className="pt-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-blue-900 mt-4">
                 <div className="flex items-center gap-2 mb-2 text-left">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Information</span>
                 </div>
                 <p className="text-[11px] leading-relaxed font-medium text-left">
                   This dashboard is for monitoring purposes only. If you identify any discrepancies in your transaction ledger or loan balance, please contact the BDOEA Treasurer directly for reconciliation.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}