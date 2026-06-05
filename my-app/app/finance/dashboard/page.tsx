"use client";

import { useState, useEffect } from 'react';
import { Wallet, Printer, Clock, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Header from '@/components/Header';

// --- MOCK DATABASE (UNTOUCHED) ---
const initialFunds = [
  { id: 'GF', name: 'General Fund', balance: 1812350, txCount: 248 },
  { id: 'UF', name: 'Union Fund', balance: 4520900, txCount: 112 },
  { id: 'LN', name: 'Loans', balance: 1468000, txCount: 45 },
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

const CHART_COLORS = ['#04152d', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function TreasurerDashboardPage() {
  const [funds, setFunds] = useState(initialFunds);
  const [ledger, setLedger] = useState(initialLedger);
  const [pendingDisbursements, setPendingDisbursements] = useState(incomingWebhookQueue);
  const [selectedFund, setSelectedFund] = useState(initialFunds[0]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState('');
  const [userRole, setUserRole] = useState('Officer');

  useEffect(() => {
    const date = new Date();
    setCurrentDate(`Today, ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);

    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          if (parsedUser?.role) {
            const formattedRole = parsedUser.role.charAt(0).toUpperCase() + parsedUser.role.slice(1).toLowerCase();
            setUserRole(formattedRole);
          }
        } catch (e) {
          console.error("Failed to parse user");
        }
      }
    }
  }, []);

  const handleConfirmDisbursement = (txn: any) => {
    setIsProcessing(txn.disbursement_txn_id);

    setTimeout(() => {
      setFunds(prev => prev.map(f => 
        f.id === txn.fund_id ? { ...f, balance: f.balance - txn.amount, txCount: f.txCount + 1 } : f
      ));

      setLedger(prev => [{
        id: Date.now(),
        fundId: txn.fund_id,
        date: txn.date,
        desc: `Disbursement: ${txn.member_name}`,
        type: 'Debit',
        amount: txn.amount,
        ref: `DV-${txn.disbursement_txn_id.split('-')[2]}` 
      }, ...prev]);

      setPendingDisbursements(prev => prev.filter(p => p.disbursement_txn_id !== txn.disbursement_txn_id));
      setIsProcessing(null);
    }, 1200);
  };

  const activeTransactions = ledger.filter(tx => tx.fundId === selectedFund.id);
  const totalLiquidity = funds.reduce((acc, curr) => acc + curr.balance, 0);

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
        
        {/* HEADER ROW */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Good morning, {userRole}</p>
            {/* UNIFIED SIZING: Page Header */}
            <h1 className="text-3xl font-black text-[#04152d] tracking-tight">Fund Overview</h1>
          </div>
          {currentDate && (
            <div className="bg-[#04152d] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md opacity-90">
              {currentDate}
            </div>
          )}
        </div>

        {/* STATIC TOP FUND CONTAINERS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {funds.map((fund) => (
            <div 
              key={fund.id}
              // The `isolate` class fixes the Z-Index bleeding issue so cards won't overlap the Header
              className={`relative isolate overflow-hidden rounded-[20px] p-5 shadow-sm ${fundStyles[fund.id]}`}
            >
              <div className="relative z-10">
                <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-90 mb-2 truncate">{fund.name}</h3>
                <p className="text-2xl lg:text-[28px] font-black tracking-tight truncate">
                  ₱{fund.balance.toLocaleString()}
                </p>
              </div>
              <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 transform -rotate-12 z-0" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          <div className="xl:col-span-2 space-y-6">
            
            {/* PENDING LAS DISBURSEMENTS */}
            {pendingDisbursements.length > 0 && (
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#fff8e1] p-2.5 rounded-xl text-[#f59e0b]">
                      <Clock size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      {/* UNIFIED SIZING: Section Title */}
                      <h2 className="text-xl font-black text-[#04152d]">Pending LAS Disbursements</h2>
                      {/* UNIFIED SIZING: Subtitle */}
                      <p className="text-sm text-gray-500 font-medium">Webhook payloads requiring confirmation</p>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 rounded-full border border-[#f59e0b] text-[#f59e0b] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} /> ENCRYPTED
                  </div>
                </div>

                <div className="space-y-3">
                  {pendingDisbursements.map((txn) => (
                    <div key={txn.disbursement_txn_id} className="bg-[#f8faff] rounded-2xl border border-blue-100/60 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      
                      <div className="flex flex-wrap gap-x-12 gap-y-4 flex-1">
                        <div className="flex flex-col max-w-[120px]">
                          {/* UNIFIED SIZING: Label Headers */}
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Member</span>
                          <p className="text-sm font-black text-[#04152d] leading-snug">{txn.member_name.replace(', ', ',\n')}</p>
                          <p className="text-[11px] font-bold text-[#3b82f6] mt-1">{txn.loan_ref}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount</span>
                          <p className="text-xl font-black text-[#ef4444] tracking-tighter">₱{txn.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Target Fund</span>
                          <p className="text-sm font-black text-[#04152d]">{txn.fund_to_debit}</p>
                        </div>
                        <div className="flex flex-col">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Authorization</span>
                          <p className="text-xs font-medium text-gray-500">{txn.authorised_by}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleConfirmDisbursement(txn)}
                        disabled={!!isProcessing}
                        className="bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 rounded-xl px-5 py-3 font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
                      >
                        <CheckCircle2 size={18} className="text-[#04152d]" /> 
                        {isProcessing === txn.disbursement_txn_id ? 'Confirming...' : 'Confirm & Generate DV'}
                      </button>
                      
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEDGER TABLE WITH CUSTOM DROPDOWN */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 pb-4 border-b border-gray-50 flex flex-wrap gap-4 justify-between items-center bg-white">
                <div>
                  <div className="flex items-center gap-3 relative">
                    
                    {/* CUSTOM STYLED SELECT DROPDOWN (Matches image_ef0424.png) */}
                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        value={selectedFund.id}
                        onChange={(e) => {
                          const target = funds.find(f => f.id === e.target.value);
                          if (target) setSelectedFund(target);
                        }}
                        // UNIFIED SIZING: Section Title applied to the Select box
                        className="appearance-none bg-white border border-gray-200 text-[#04152d] text-xl font-black pl-5 pr-12 py-3 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm cursor-pointer hover:bg-gray-50 transition-all w-full sm:w-auto"
                      >
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>{fund.name} Ledger</option>
                        ))}
                      </select>
                      {/* Custom Chevron Arrow for the Dropdown */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                        <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                      </div>
                    </div>

                  </div>
                  {/* UNIFIED SIZING: Subtitle */}
                  <p className="text-sm text-gray-500 font-medium mt-3 ml-1">Monthly transaction history</p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div> Credit</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div> Debit</span>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1 p-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {/* UNIFIED SIZING: Label Headers */}
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Transaction Detail</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Amount</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeTransactions.length > 0 ? activeTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-gray-500 font-medium whitespace-nowrap">{tx.date}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'Credit' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></div>
                            <span className="font-bold text-[#04152d]">{tx.desc}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-[#04152d] whitespace-nowrap">
                          {tx.type === 'Debit' ? '- ' : ''}₱{tx.amount.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-xs text-[#3b82f6] cursor-pointer hover:underline whitespace-nowrap">
                          {tx.ref}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-gray-400 font-medium">
                          No transactions recorded for this fund.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Summaries */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* POSITION SWAPPED: Liquidity Summary is now on TOP */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-5 pb-4">
                 {/* UNIFIED SIZING: Section Title */}
                 <h2 className="text-xl font-black text-[#04152d]">Liquidity Summary</h2>
                 <Printer size={16} className="text-gray-400 cursor-pointer hover:text-[#04152d]" />
              </div>
              
              <div className="mb-6">
                {/* UNIFIED SIZING: Label Headers */}
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Active Balance</span>
                <p className="text-4xl font-black text-[#04152d] tracking-tight">₱{totalLiquidity.toLocaleString()}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                {funds.map((fund, idx) => (
                  <div key={fund.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-80" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                        <CreditCard size={14} className="text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#04152d]">{fund.name}</div>
                        <div className="text-[10px] text-gray-500">Status: <span className="text-[#10b981] font-bold">Active</span></div>
                      </div>
                    </div>
                    <div className="text-sm font-black text-[#04152d]">
                      ₱{fund.balance.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POSITION SWAPPED: Fund Distribution is now on BOTTOM */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              {/* UNIFIED SIZING: Section Title */}
              <h2 className="text-xl font-black text-[#04152d] mb-2 pb-4 border-b border-gray-50">Fund Distribution</h2>
              
              {/* LEGEND SPACING FIXED: Increased container height and adjusted Pie cy position */}
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={funds}
                      dataKey="balance"
                      nameKey="name"
                      cx="50%"
                      cy="40%" // Pulled the pie up to leave more room for the legend at the bottom
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {funds.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      /* FIXED TYPESCRIPT ERROR: Used 'any' bypass and safely casted to Number */
                      formatter={(value: any) => `₱${Number(value).toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      height={80} // Increased height to allow grid wrapping
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
      </div>
    </div>
  );
}