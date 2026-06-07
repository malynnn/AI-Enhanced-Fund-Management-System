"use client";

export const dynamic = 'force-dynamic';

import { useMemo } from 'react';
import { CircleDollarSign, WalletCards, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Header from '@/components/Header';

// Mock Financial Data
const duesHistory = [
  { date: 'Apr 2026', amount: 500, status: 'PAID', method: 'Salary Deduction' },
  { date: 'Mar 2026', amount: 500, status: 'PAID', method: 'Salary Deduction' },
  { date: 'Feb 2026', amount: 500, status: 'PAID', method: 'Salary Deduction' },
  { date: 'Jan 2026', amount: 500, status: 'PAID', method: 'Online Transfer' },
];

const loanData = {
  id: 'LN-2025-071',
  type: 'Regular Loan',
  originalAmount: 30000,
  remainingBalance: 22100,
  monthlyPayment: 2900,
  nextDueDate: 'May 12, 2026',
  status: 'CURRENT'
};

const CHART_COLORS = ['#10b981', '#f59e0b'];

export default function FinancialDashboard() {
  const duesChartData = useMemo(() => [
    { name: 'Paid', value: 8, fill: '#10b981' },
    { name: 'Unpaid', value: 1, fill: '#f59e0b' },
  ], []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="p-4 md:p-8 max-w-[1400px] w-full mx-auto space-y-6">

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#04152d] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Remaining Loan Balance</p>
            <p className="text-3xl font-black tracking-tight">₱{loanData.remainingBalance.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg w-fit">
              <CircleDollarSign size={14} /> {loanData.id}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Dues</p>
            <p className="text-3xl font-black text-[#04152d]">₱{500.00.toLocaleString()}</p>
            <div className="mt-4 text-xs font-medium text-gray-500">
              Next Due: <span className="text-[#04152d] font-bold">{loanData.nextDueDate}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="h-20 w-20 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={duesChartData} dataKey="value" nameKey="name" innerRadius={20} outerRadius={35} paddingAngle={4} />
                  <Tooltip formatter={(value: any) => `${value} months`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dues Payment Status</p>
              <p className="text-sm font-semibold text-gray-800">8 Months Paid</p>
              <p className="text-xs text-gray-500">1 Month Pending</p>
            </div>
          </div>
        </div>

        {/* Table & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-black text-[#04152d]">Dues Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {duesHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{row.date}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#04152d]">₱{row.amount}</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{row.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-[#04152d] mb-6">Current Loan Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500">Loan ID</span>
                <span className="text-sm font-bold text-[#04152d] font-mono">{loanData.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500">Status</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{loanData.status}</span>
              </div>
              <div className="pt-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-blue-900">
                 <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Information</span>
                 </div>
                 <p className="text-[11px] leading-relaxed font-medium">
                   This dashboard is for monitoring purposes only. If you identify any discrepancies in your ledger, please contact the BDOEA Treasurer directly for reconciliation.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}