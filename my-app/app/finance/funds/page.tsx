"use client";

import { useState } from 'react';
import { Wallet, Printer, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const fundData = [
  { id: 'GF', name: 'General Fund', balance: 1812350, txCount: 248 },
  { id: 'UF', name: 'Union Fund', balance: 4520900, txCount: 112 },
  { id: 'LN', name: 'Loans', balance: 1518750, txCount: 45 },
  { id: 'FA', name: 'Foreign Assistance', balance: 2500000, txCount: 30 },
  { id: 'DA', name: 'Death Assistance', balance: 850000, txCount: 20 },
];

const mockLedger = [
  { id: 1, fundId: 'GF', date: '2026-04-22', desc: 'Member Dues Batch Remittance', type: 'Credit', amount: 15000, ref: 'REF-8812' },
  { id: 2, fundId: 'LN', date: '2026-04-26', desc: 'Disbursement: VINLUAN, VEN', type: 'Debit', amount: 30000, ref: 'LN-2026-071' },
  { id: 3, fundId: 'GF', date: '2026-04-20', desc: 'Office Supplies Vendor Payment', type: 'Debit', amount: 4500, ref: 'REF-8809' },
  { id: 4, fundId: 'UF', date: '2026-04-18', desc: 'Union Assembly Expense', type: 'Debit', amount: 12000, ref: 'UN-2026-004' },
  { id: 5, fundId: 'FA', date: '2026-04-15', desc: 'Foreign Grant Received', type: 'Credit', amount: 500000, ref: 'FG-8801' },
  { id: 6, fundId: 'DA', date: '2026-04-10', desc: 'Death Claim Benefit Release', type: 'Debit', amount: 20000, ref: 'DC-2026-012' },
];

export default function FundBalancePanel() {
  const [selectedFund, setSelectedFund] = useState(fundData[0]);
  const activeTransactions = mockLedger.filter(tx => tx.fundId === selectedFund.id);

  return (
    // FIX 1: Changed `h-full overflow-hidden` to `min-h-full pb-10` to allow natural page scrolling
    <div className="p-8 min-h-full pb-12 flex flex-col gap-6 bg-gray-50">
      
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fund Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time liquidity monitoring and fund ledgers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 flex-shrink-0">
        {fundData.map((fund) => (
          <div 
            key={fund.id}
            onClick={() => setSelectedFund(fund)}
            className={`p-6 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden ${
              selectedFund.id === fund.id 
                ? 'bg-white border-bdoea-yellow ring-2 ring-yellow-100' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-2.5 rounded-lg ${selectedFund.id === fund.id ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>
                <Wallet size={20} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Balance</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{fund.name}</h3>
              <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight">
                ₱{fund.balance.toLocaleString()}
              </p>
            </div>
            
            {selectedFund.id === fund.id && (
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-black">
                  <Wallet size={120} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FIX 2: Added `min-h-[500px]` to the table wrapper so it never gets crushed vertically */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedFund.name} Ledger
          </h2>
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">
            <Printer size={14} /> Export Register
          </button>
        </div>
        
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Transaction Detail</th>
                <th className="px-6 py-4 whitespace-nowrap">Type</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTransactions.length > 0 ? activeTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 min-w-[250px]">{tx.desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {tx.type === 'Credit' ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[10px] uppercase bg-green-50 px-2 py-1 rounded border border-green-100">
                        <ArrowUpRight size={12}/> Credit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded border border-red-100">
                        <ArrowDownRight size={12}/> Debit
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-900 whitespace-nowrap">
                    {tx.type === 'Debit' ? '-' : ''} ₱{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-blue-600 cursor-pointer hover:underline whitespace-nowrap">
                    {tx.ref}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No transactions recorded for this fund yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}