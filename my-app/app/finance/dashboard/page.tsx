"use client";

import { useState } from 'react';
import { AlertTriangle, Flag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Backend-ready mock transaction payload
const recentTransactions = [
  { id: 1, date: '26 Apr 21', type: 'Expense', member: 'ALARCO, MICO', amount: '₱500', fund: 'Operating', status: 'PAID', link: '/finance/expenses' },
  { id: 2, date: '26 Apr 19', type: 'Dues', member: 'ZEN, SHEN', amount: '₱500', fund: 'Operating', status: 'PAID', link: '/finance/dues' },
  { id: 3, date: '26 Apr 18', type: 'Loan Repayment', member: 'SUNG, SAM', amount: '₱500', fund: 'Loan Fund', status: 'PAID', link: '/finance/loans' },
  { id: 4, date: '26 Apr 18', type: 'Dues', member: 'SIDI, EYBI', amount: '₱500', fund: 'Operating', status: 'PAID', link: '/finance/dues' },
  { id: 5, date: '26 Apr 17', type: 'Expense', member: 'ADARNA, EMAN', amount: '₱500', fund: 'Operating', status: 'PAID', link: '/finance/expenses' },
];

export default function MonitoringHub() {
  const [timeRange, setTimeRange] = useState('This Month');

  return (
    <div className="space-y-6">
      
      {/* Header Area */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Monitoring Hub</h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">All figures as of April 26, 2026 • Auto-refreshes every 5 min</p>
        </div>
        
        {/* Backend-ready filter */}
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white border border-gray-300 text-gray-900 text-sm font-bold rounded-lg focus:ring-black focus:border-black block py-2 px-4 shadow-sm outline-none"
        >
          <option>This Month</option>
          <option>Last Month</option>
          <option>Year to Date</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Main Data Table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-blue-50/50 border-b border-gray-200 text-gray-900 font-bold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Fund</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{tx.date}</td>
                    <td className="px-6 py-4 text-gray-800">{tx.type}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{tx.member}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{tx.amount}</td>
                    <td className="px-6 py-4 text-gray-600">{tx.fund}</td>
                    <td className="px-6 py-4">
                      <span className="text-green-700 font-bold text-xs tracking-wider">{tx.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={tx.link} className="text-blue-700 hover:text-blue-900 font-bold text-xs tracking-wider hover:underline">
                        VIEW
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Alerts Sidebar (From Mockup) */}
        <div className="space-y-4">
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Pending Alerts</h3>
          
          <div className="bg-[#FFF0F0] p-4 rounded-xl border border-red-200 flex gap-3 items-start">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-800 leading-snug">
              Unreconciled bank statement discrepancy detected in Loan Fund.
            </p>
          </div>

          <div className="bg-[#FFF8E6] p-4 rounded-xl border border-yellow-200 flex gap-3 items-start">
            <Flag size={20} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-yellow-800 leading-snug">
              Budget category "Events & Activities" is at 82% utilization — review or amendment may be required.
            </p>
          </div>

          <div className="bg-[#FFF8E6] p-4 rounded-xl border border-yellow-200 flex gap-3 items-start">
            <Flag size={20} className="text-yellow-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-800 leading-snug">
                3 disbursements pending Treasurer confirmation, totaling ₱245,000.
              </p>
              <button className="mt-2 text-xs font-bold text-yellow-700 hover:text-yellow-900 flex items-center gap-1">
                Review now <ArrowRight size={12} />
              </button>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}