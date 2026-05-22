"use client";

import { useState } from 'react';
import { Wallet, Printer, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

// --- MOCK DATABASE ---
const initialFunds = [
  { id: 'GF', name: 'General Fund', balance: 1812350, txCount: 248 },
  { id: 'UF', name: 'Union Fund', balance: 4520900, txCount: 112 },
  { id: 'LN', name: 'Loans', balance: 1518750, txCount: 45 },
  { id: 'FA', name: 'Foreign Assistance', balance: 2500000, txCount: 30 },
  { id: 'DA', name: 'Death Assistance', balance: 850000, txCount: 20 },
];

const initialLedger = [
  { id: 1, fundId: 'GF', date: '2026-04-22', desc: 'Member Dues Batch Remittance', type: 'Credit', amount: 15000, ref: 'REF-8812' },
  { id: 2, fundId: 'LN', date: '2026-04-26', desc: 'Disbursement: VINLUAN, VEN', type: 'Debit', amount: 30000, ref: 'LN-2026-071' },
  { id: 3, fundId: 'GF', date: '2026-04-20', desc: 'Office Supplies Vendor Payment', type: 'Debit', amount: 4500, ref: 'REF-8809' },
  { id: 4, fundId: 'UF', date: '2026-04-18', desc: 'Union Assembly Expense', type: 'Debit', amount: 12000, ref: 'UN-2026-004' },
  { id: 5, fundId: 'FA', date: '2026-04-15', desc: 'Foreign Grant Received', type: 'Credit', amount: 500000, ref: 'FG-8801' },
  { id: 6, fundId: 'DA', date: '2026-04-10', desc: 'Death Claim Benefit Release', type: 'Debit', amount: 20000, ref: 'DC-2026-012' },
];

// MOCK INPUT: Incoming Webhook Payload from LAS (From your image)
const incomingWebhookQueue = [
  { 
    disbursement_txn_id: 'DISB-2026-9921', 
    loan_ref: 'LN-2026-088', 
    member_id: 'M-2023-112',
    member_name: 'DELA CRUZ, JUAN',
    amount: 50000, 
    date: '2026-05-11', 
    payment_method: 'Bank Transfer', 
    fund_to_debit: 'Loans', 
    fund_id: 'LN',
    authorised_by: 'LAS_SYSTEM_AUTO' 
  },
];

export default function TreasurerDashboardPage() {
  const [funds, setFunds] = useState(initialFunds);
  const [ledger, setLedger] = useState(initialLedger);
  const [pendingDisbursements, setPendingDisbursements] = useState(incomingWebhookQueue);
  const [selectedFund, setSelectedFund] = useState(initialFunds[0]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // TASK REQUIREMENT: Treasurer confirmation logic
  const handleConfirmDisbursement = (txn: any) => {
    setIsProcessing(txn.disbursement_txn_id);

    // Simulate Output: Debit Fund -> Generate DV -> Notify LAS -> Add to Ledger
    setTimeout(() => {
      // 1. Update Real-time Balance
      setFunds(prev => prev.map(f => 
        f.id === txn.fund_id ? { ...f, balance: f.balance - txn.amount, txCount: f.txCount + 1 } : f
      ));

      // 2. Add to Transaction History Table
      setLedger(prev => [{
        id: Date.now(),
        fundId: txn.fund_id,
        date: txn.date,
        desc: `Disbursement: ${txn.member_name}`,
        type: 'Debit',
        amount: txn.amount,
        ref: `DV-${txn.disbursement_txn_id.split('-')[2]}` // Generates mock DV reference
      }, ...prev]);

      // 3. Remove from pending queue
      setPendingDisbursements(prev => prev.filter(p => p.disbursement_txn_id !== txn.disbursement_txn_id));
      setIsProcessing(null);

      alert(`✅ Success: Loan Fund debited by ₱${txn.amount.toLocaleString()}.\nDisbursement Voucher generated.\nConfirmation webhook sent back to LAS.`);
    }, 1200);
  };

  const activeTransactions = ledger.filter(tx => tx.fundId === selectedFund.id);

  return (
    <div className="p-8 min-h-screen pb-12 flex flex-col gap-6 bg-gray-50">
      
      {/* Header */}
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fund Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time liquidity monitoring and fund ledgers.</p>
        </div>
      </div>

      {/* TASK REQUIREMENT: Real-time balance card per fund */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 flex-shrink-0">
        {funds.map((fund) => (
          <div 
            key={fund.id}
            onClick={() => {
              const updatedFund = funds.find(f => f.id === fund.id) || fund;
              setSelectedFund(updatedFund);
            }}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm relative overflow-hidden ${
              selectedFund.id === fund.id 
                ? 'bg-white border-bdoea-yellow ring-4 ring-yellow-400/10 scale-[1.02] z-10' 
                : 'bg-white border-transparent hover:border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-3 rounded-xl ${selectedFund.id === fund.id ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                <Wallet size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Balance</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{fund.name}</h3>
              <p className="text-4xl font-black text-gray-900 mt-1 tracking-tight">
                ₱{fund.balance.toLocaleString()}
              </p>
            </div>
            {selectedFund.id === fund.id && (
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-black"><Wallet size={140} /></div>
            )}
          </div>
        ))}
      </div>

      {/* NEW: Pending Disbursements Queue (from spreadsheet input/output) */}
      {pendingDisbursements.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-yellow-400 p-6 shadow-md flex-shrink-0 mt-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-2 rounded-lg text-black"><Clock size={20} /></div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Pending LAS Disbursements</h2>
                <p className="text-xs text-gray-500 font-medium">Webhook payloads requiring Treasurer confirmation.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 uppercase">
              <ShieldCheck size={14} /> Encrypted LAS Tunnel
            </div>
          </div>

          <div className="space-y-4">
            {pendingDisbursements.map((txn) => (
              <div key={txn.disbursement_txn_id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col xl:flex-row justify-between items-center gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1 w-full">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member / Loan Ref</label>
                    <p className="text-sm font-bold text-gray-900">{txn.member_name}</p>
                    <p className="text-[11px] font-mono text-blue-600 bg-blue-50 w-fit px-1.5 rounded mt-0.5">{txn.loan_ref}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount to Debit</label>
                    <p className="text-lg font-black text-red-600 tracking-tighter">₱{txn.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target Fund</label>
                    <p className="text-sm font-bold text-gray-700">{txn.fund_to_debit}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Method / Auth</label>
                    <p className="text-[11px] font-mono text-gray-500">{txn.payment_method}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{txn.authorised_by}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full xl:w-auto">
                  <button 
                    onClick={() => handleConfirmDisbursement(txn)}
                    disabled={!!isProcessing}
                    className="flex-1 xl:flex-none bg-black text-white px-8 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isProcessing === txn.disbursement_txn_id ? 'Confirming...' : <><CheckCircle2 size={16} /> Confirm & Generate DV</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASK REQUIREMENT: Per-fund transaction history table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-[500px] mt-2">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedFund.name} Ledger
          </h2>
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">
            <Printer size={14} /> Export Register
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10">
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
                  <td className="px-6 py-5 text-gray-500 font-medium whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-5 font-bold text-gray-900 min-w-[250px]">{tx.desc}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {tx.type === 'Credit' ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[10px] uppercase bg-green-50 px-2.5 py-1 rounded-md border border-green-100">
                        <ArrowUpRight size={14}/> Credit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                        <ArrowDownRight size={14}/> Debit
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-gray-900 whitespace-nowrap">
                    {tx.type === 'Debit' ? '-' : ''} ₱{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-xs text-blue-600 cursor-pointer hover:underline whitespace-nowrap">
                    {tx.ref}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
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