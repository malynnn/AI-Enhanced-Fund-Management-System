"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { 
  Wallet, Clock, CheckCircle2, ShieldCheck, CreditCard, WalletCards, 
  CircleDollarSign, Activity, Loader2, ChevronDown, PieChart as PieChartIcon 
} from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

// Strictly BDOEA Palette
const CHART_COLORS = ['#04152d', '#2563eb', '#eab308', '#60a5fa', '#fef08a'];

function TreasurerDashboardContent() {
  const [funds, setFunds] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [pendingDisbursements, setPendingDisbursements] = useState<any[]>([]);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  
  const [duesOverview, setDuesOverview] = useState({ collectedThisMonth: 0, targetThisMonth: 0, collectionRate: 0, unpaidMembers: 0 });
  const [loansOverview, setLoansOverview] = useState({ activeLoans: 0, totalReceivables: 0, pendingApplications: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: React.ReactNode; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: React.ReactNode; payload?: any;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

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

  // Inject a structured, receipt-style payload into the modal instead of a flat string
  const triggerDisbursementConfirm = (txn: any) => {
    setActionModal({
      isOpen: true,
      title: 'Authorize Disbursement',
      message: (
        <div className="flex flex-col gap-3 text-left w-full mt-3">
          <p className="text-center text-[#04152d]/80">You are about to generate a Disbursement Voucher for <span className="font-black text-[#04152d] uppercase">{txn.member_name}</span>.</p>
          
          <div className="bg-white/60 backdrop-blur-md p-4 rounded-[20px] border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_2px_8px_rgba(4,21,45,0.04)] flex flex-col gap-2 my-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest">Amount</span>
              <span className="text-xl font-black text-blue-600 tracking-tighter">₱{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/60 pt-2 mt-1">
              <span className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest">Source Ledger</span>
              <span className="text-[12px] font-black text-[#04152d]">{txn.fund_to_debit}</span>
            </div>
          </div>
          
          <p className="text-[11.5px] text-center text-yellow-700 bg-yellow-50/80 border border-yellow-200/60 p-3 rounded-xl font-bold">This action will automatically deduct funds and write to the ledger. Proceed?</p>
        </div>
      ),
      status: 'idle',
      payload: txn
    });
  };

  const executeDisbursement = () => {
    setActionModal(prev => ({ ...prev, status: 'loading' }));
    const txn = actionModal.payload;

    setTimeout(() => {
      setFunds(prev => prev.map(f => 
        f.id === txn.fund_id ? { ...f, balance: f.balance - txn.amount, txCount: f.txCount + 1 } : f
      ));

      setLedger(prev => [{
        id: Date.now(),
        fundId: txn.fund_id,
        date: txn.date,
        desc: `Disbursement: ${txn.member_name}`,
        type: 'CASH_OUT',
        amount: txn.amount,
        ref: `DV-${txn.disbursement_txn_id.split('-')[2]}` 
      }, ...prev]);

      setPendingDisbursements(prev => prev.filter(p => p.disbursement_txn_id !== txn.disbursement_txn_id));
      
      setActionModal(prev => ({ 
        ...prev, 
        status: 'success', 
        resultMsg: (
          <div className="flex flex-col gap-3 mt-3 w-full">
            <p className="text-center">Disbursement authorized and written to ledger.</p>
            <div className="bg-blue-50/60 border border-blue-200/60 p-4 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,1)]">
              <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-1 text-center">Generated Voucher ID</p>
              <p className="text-2xl font-mono font-black text-blue-700 tracking-tight text-center">DV-{txn.disbursement_txn_id.split('-')[2]}</p>
            </div>
          </div>
        )
      }));
    }, 1200);
  };

  const activeTransactions = selectedFund ? ledger.filter(tx => tx.fundId === selectedFund.id) : [];

  // StudioSeven Liquid Glass Primitives
  const ultraGlassCard = "glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 md:p-6 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]";
  const pillBtn = "glass-sheen px-5 py-2.5 bg-white/70 hover:bg-white/90 backdrop-blur-xl backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(4,21,45,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full text-[13px] font-black text-[#04152d] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      
      <style jsx global>{`
        @keyframes liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%), radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.85; transition: opacity 0.35s ease; pointer-events: none; z-index: 1;
        }
        .glass-sheen:hover::before { opacity: 1; }
        .glass-sheen::after {
          content: ''; position: absolute; inset: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -10px 18px -14px rgba(4,21,45,0.15), inset 1px 0 0 rgba(255,255,255,0.4), inset -1px 0 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.1);
          transition: box-shadow 0.35s ease; pointer-events: none; z-index: 1; border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -10px 20px -12px rgba(4,21,45,0.2), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.4);
        }
        .glass-blob {
          position: absolute; border-radius: 9999px; filter: blur(100px); pointer-events: none; animation: liquid-drift 20s ease-in-out infinite;
        }
      `}</style>

      {/* Isolated Liquid Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glass-blob w-[480px] h-[480px] bg-blue-400/30 -top-32 -left-20" />
        <div className="glass-blob w-[440px] h-[440px] bg-yellow-300/30 top-1/3 -right-32" style={{ animationDelay: '4s' }} />
        <div className="glass-blob w-[360px] h-[360px] bg-white/60 bottom-0 left-1/3" style={{ animationDelay: '8s' }} />
      </div>

      <ActionModal 
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        message={actionModal.message}
        status={actionModal.status}
        resultMsg={actionModal.resultMsg}
        onConfirm={executeDisbursement}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        confirmText="Authorize & Generate DV"
      />

      {/* Sticky Header - Confined strictly to the main content area */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 animate-fade-in flex-1 relative z-10">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-[40px] border border-white/80 rounded-[28px] shadow-sm max-w-md mx-auto">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-[14px] font-black text-[#04152d] tracking-tight">Initializing Dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {funds.map((fund, index) => {
                const isBlue = index % 2 === 0;
                return (
                  <div key={fund.id} className="glass-sheen bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 flex flex-col group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)] hover:bg-white/60 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="w-10 h-10 bg-white/90 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] group-hover:scale-110 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] border border-white">
                        <Wallet size={18} strokeWidth={2.5} className={isBlue ? 'text-blue-600' : 'text-yellow-500'} />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.16em] mb-1.5 truncate text-left">{fund.name}</h3>
                      <p className="text-2xl lg:text-[26px] font-black text-[#04152d] tracking-tighter truncate text-left">
                        ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Collections Overview */}
                  <div className={`${ultraGlassCard} flex flex-col justify-between`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/90 p-2.5 rounded-2xl border border-white shadow-[0_4px_10px_rgba(4,21,45,0.06)] group-hover:scale-110 transition-transform duration-400">
                          <WalletCards size={20} className="text-blue-600" />
                        </div>
                        <h2 className="text-[15px] font-black text-[#04152d] tracking-tight uppercase tracking-widest text-left">Collections</h2>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest mb-1 text-left">Collections this month</p>
                          <p className="text-2xl font-black text-[#04152d] tracking-tighter text-left">₱{duesOverview.collectedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <p className="text-[13px] font-black text-blue-600">{duesOverview.collectionRate}%</p>
                      </div>
                      <div className="w-full bg-white/50 border border-white/60 rounded-full h-2 mb-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${duesOverview.collectionRate}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-[#04152d]/60">
                        <span>Target: ₱{duesOverview.targetThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50/80 border border-yellow-100/50 px-2.5 py-1 rounded-lg">
                          <Activity size={12}/> {duesOverview.unpaidMembers} Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Loan Ledgers Overview */}
                  <div className={`${ultraGlassCard} flex flex-col justify-between`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/90 p-2.5 rounded-2xl border border-white shadow-[0_4px_10px_rgba(4,21,45,0.06)] group-hover:scale-110 transition-transform duration-400">
                          <CircleDollarSign size={20} className="text-blue-500" />
                        </div>
                        <h2 className="text-[15px] font-black text-[#04152d] tracking-tight uppercase tracking-widest text-left">Member Loan Ledgers</h2>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest mb-1 text-left">Total Receivables</p>
                          <p className="text-2xl font-black text-[#04152d] tracking-tighter text-left">₱{loansOverview.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <p className="text-[13px] font-black text-blue-500">{loansOverview.activeLoans} Active</p>
                      </div>
                      <div className="mt-5 flex justify-between items-center text-[11px] font-bold text-[#04152d]/60 border-t border-white/60 pt-3">
                        <span>Current Portfolio Status</span>
                        {loansOverview.pendingApplications > 0 && (
                          <span className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50/80 border border-yellow-100/50 px-2.5 py-1 rounded-lg font-black tracking-tight">
                            {loansOverview.pendingApplications} Pending Approvals
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending Disbursements */}
                {pendingDisbursements.length > 0 && (
                  <div className={ultraGlassCard}>
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-6 border-b border-white/60 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/90 p-2.5 rounded-2xl border border-white shadow-[0_4px_10px_rgba(4,21,45,0.06)]">
                          <Clock size={20} className="text-yellow-500" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-black text-[#04152d] tracking-tight uppercase tracking-widest text-left">Pending Disbursements</h2>
                          <p className="text-[11px] text-[#04152d]/60 font-bold text-left mt-0.5">Payloads requiring security confirmation</p>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 rounded-full border border-yellow-400 text-yellow-600 bg-yellow-50/50 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                        <ShieldCheck size={14} /> ENCRYPTED
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pendingDisbursements.map((txn) => (
                        <div key={txn.disbursement_txn_id} className="bg-white/60 backdrop-blur-md border border-white/90 p-5 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,1)] hover:bg-white/80 transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-6">
                          <div className="flex flex-wrap gap-x-12 gap-y-4 flex-1">
                            <div className="flex flex-col max-w-[140px]">
                              <span className="block text-[9px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5 text-left">Member</span>
                              <p className="text-[13px] font-black text-[#04152d] leading-snug text-left truncate">{txn.member_name.replace(', ', ',\n')}</p>
                              <p className="text-[10px] font-bold text-blue-500 mt-1 text-left font-mono">{txn.loan_ref}</p>
                            </div>
                            <div className="flex flex-col">
                              <span className="block text-[9px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5 text-left">Amount</span>
                              <p className="text-xl font-black text-yellow-600 tracking-tighter text-left">₱{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex flex-col">
                              <span className="block text-[9px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5 text-left">Target Fund</span>
                              <p className="text-[13px] font-black text-[#04152d] text-left">{txn.fund_to_debit}</p>
                            </div>
                            <div className="flex flex-col">
                              <span className="block text-[9px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5 text-left">Authorization</span>
                              <p className="text-[11px] font-bold text-[#04152d]/60 text-left">{txn.authorised_by}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => triggerDisbursementConfirm(txn)}
                            className={pillBtn}
                          >
                            <CheckCircle2 size={16} className="text-blue-600" /> 
                            Generate DV
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transaction Ledger Table */}
                <div className={`!p-0 overflow-hidden flex flex-col !rounded-[24px] ${ultraGlassCard}`}>
                  <div className="p-6 md:p-8 border-b border-white/60 flex flex-wrap gap-5 justify-between items-center bg-white/40 backdrop-blur-2xl backdrop-saturate-[190%]">
                    <div>
                      <div className="flex items-center gap-3 relative">
                        <div className="relative inline-block w-full sm:w-auto">
                          <select
                            value={selectedFund?.id || ''}
                            onChange={(e) => {
                              const target = funds.find(f => f.id === e.target.value);
                              if (target) setSelectedFund(target);
                            }}
                            className="appearance-none bg-white/50 backdrop-blur-2xl rounded-full border border-white/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_4px_12px_rgba(4,21,45,0.05)] pl-6 pr-10 py-3 font-black text-[13px] tracking-tight text-[#04152d] cursor-pointer outline-none hover:bg-white/70 transition-all w-full sm:w-auto"
                          >
                            {funds.map((fund) => (
                              <option key={fund.id} value={fund.id}>{fund.name} Matrix</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]/50">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#04152d]/60 font-bold mt-2 ml-2 text-left">Monthly transaction history</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px] font-bold text-[#04152d]/60 bg-white/50 px-4 py-2 rounded-full border border-white/60">
                      <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"></div> Cash In</span>
                      <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"></div> Cash Out</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left whitespace-nowrap min-w-[700px] border-collapse">
                      <thead className="bg-white/60 backdrop-blur-2xl backdrop-saturate-[200%] shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em]">
                        <tr>
                          <th className="py-4 px-6 border-b border-white/50 text-left">Date</th>
                          <th className="py-4 px-6 border-b border-white/50 text-left">Transaction Detail</th>
                          <th className="py-4 px-6 border-b border-white/50 text-left">Amount</th>
                          <th className="py-4 px-6 border-b border-white/50 text-left">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/60 text-[13.5px] font-bold text-[#04152d] bg-white/30 backdrop-blur-xl backdrop-saturate-[180%]">
                        {activeTransactions.length > 0 ? activeTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/70 hover:backdrop-blur-xl hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
                            <td className="py-4 px-6 text-[#04152d]/60 font-medium text-[12px] whitespace-nowrap text-left">{tx.date}</td>
                            <td className="py-4 px-6 text-[13px] text-left">
                              <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] ${tx.type === 'CASH_IN' || tx.type === 'Credit' ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                                <span className="font-black text-[#04152d] tracking-tight">{tx.desc}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-black text-[#04152d] text-[15px] whitespace-nowrap text-left tracking-tighter">
                              {tx.type === 'CASH_OUT' || tx.type === 'Debit' ? '- ' : '+ '}₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 font-mono text-[11px] text-blue-600 cursor-pointer hover:underline whitespace-nowrap text-left">
                              {tx.ref}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="py-24 text-center text-[#04152d]/40 font-black text-[11px] uppercase tracking-widest text-left">
                              No transactions recorded for this matrix.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Fund Distribution Chart */}
              <div className="xl:col-span-1 space-y-6">
                <div className={ultraGlassCard}>
                  <h2 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5 flex items-center gap-2">
                    <PieChartIcon size={18} className="text-blue-500" /> Asset Allocation
                  </h2>
                  
                  <div className="h-[300px] w-full mt-4 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="balance"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                        >
                          {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Balance']}
                          contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 30px rgba(4,21,45,0.08)', fontSize: '11.5px', fontWeight: '900' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          align="center"
                          height={80}
                          iconType="circle" 
                          iconSize={10} 
                          wrapperStyle={{ fontSize: '11px', fontWeight: '900', color: '#04152d', paddingTop: '20px' }}
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

export default function TreasurerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-[#04152d]">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    }>
      <TreasurerDashboardContent />
    </Suspense>
  );
}