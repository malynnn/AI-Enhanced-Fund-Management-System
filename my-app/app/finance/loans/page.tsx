"use client";

import { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, HelpCircle, ArrowUpRight, ArrowDownRight, 
  Coins, FileSpreadsheet, RefreshCw, Send, Sparkles, CheckCircle2, 
  XCircle, AlertCircle, TrendingUp, Landmark, User, FileClock, 
  ChevronRight, Laptop, Layers, Activity, DollarSign
} from 'lucide-react';

interface Fund {
  id: string;
  name: string;
  code: string;
  currentBalance: number;
}

interface Repayment {
  id: string;
  loanReference: string;
  memberId: string;
  memberName: string;
  amount: number;
  principalAmount: number;
  serviceFeeAmount: number;
  overpaymentAmount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  treasurerDecision: string;
  processedAt: string;
}

interface WriteOff {
  id: string;
  loanReference: string;
  memberId: string;
  memberName: string;
  amount: number;
  reason: string;
  status: string;
  requestedBy: string;
  authorizedBy: string | null;
  createdAt: string;
}

export default function LoansDashboard() {
  // Lists
  const [funds, setFunds] = useState<Fund[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  
  // Navigation tabs: 'repayments' | 'writeoffs' | 'simulator'
  const [activeTab, setActiveTab] = useState<'repayments' | 'writeoffs' | 'simulator'>('repayments');

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [simulatorForm, setSimulatorForm] = useState({
    loanReference: 'LN-2026-071',
    memberId: 'M-101',
    memberName: 'Ven Vinluan',
    amount: '10500',
    autoSplit: true,
    principalAmount: '10000',
    serviceFeeAmount: '500',
    paymentMethod: 'GCASH',
    referenceNumber: 'GC-98273'
  });

  const [writeOffForm, setWriteOffForm] = useState({
    loanReference: 'LN-2026-092',
    memberId: 'M-105',
    memberName: 'Romalyn Amante',
    amount: '15000',
    reason: 'Member has migrated overseas with no remaining collateral.',
    requestedBy: 'Treasurer Office'
  });

  // Load dashboard data
  const loadData = async () => {
    try {
      setLoading(true);
      const [fundsRes, repaymentsRes, writeOffsRes] = await Promise.all([
        fetch('/api/finance/funds'),
        fetch('/api/webhooks/repayments'),
        fetch('/api/finance/loans/write-off')
      ]);

      if (fundsRes.ok) setFunds(await fundsRes.json());
      if (repaymentsRes.ok) setRepayments(await repaymentsRes.json());
      if (writeOffsRes.ok) setWriteOffs(await writeOffsRes.json());

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showNotification('error', 'Failed to synchronize loan records with the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle Form changes
  const handleSimFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSimulatorForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'amount' && prev.autoSplit) {
        const amt = parseFloat(value) || 0;
        // 95% Principal, 5% Service fee
        updated.principalAmount = (amt * 0.95).toFixed(2);
        updated.serviceFeeAmount = (amt * 0.05).toFixed(2);
      }
      return updated;
    });
  };

  const toggleAutoSplit = () => {
    setSimulatorForm(prev => {
      const auto = !prev.autoSplit;
      const updated = { ...prev, autoSplit: auto };
      if (auto) {
        const amt = parseFloat(prev.amount) || 0;
        updated.principalAmount = (amt * 0.95).toFixed(2);
        updated.serviceFeeAmount = (amt * 0.05).toFixed(2);
      }
      return updated;
    });
  };

  // Submit Mock Webhook (LAS -> Finance System Webhook)
  const triggerRepaymentWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await fetch('/api/webhooks/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: simulatorForm.loanReference,
          memberId: simulatorForm.memberId,
          memberName: simulatorForm.memberName,
          amount: parseFloat(simulatorForm.amount),
          principalAmount: parseFloat(simulatorForm.principalAmount),
          serviceFeeAmount: parseFloat(simulatorForm.serviceFeeAmount),
          paymentMethod: simulatorForm.paymentMethod,
          referenceNumber: simulatorForm.referenceNumber
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        await loadData();
        setActiveTab('repayments'); // Switch back to ledger tab to view result
      } else {
        showNotification('error', data.error || 'Failed to submit repayment.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network failure during webhook simulation.');
    } finally {
      setSimulating(false);
    }
  };

  // Process Overpayment Decision
  const resolveOverpayment = async (repaymentId: string, decision: 'ADVANCE_CREDIT' | 'REFUND') => {
    setActioning(repaymentId);
    try {
      const res = await fetch('/api/finance/loans/overpayment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentId,
          decision,
          authorizedBy: 'Treasurer Romalyn'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        await loadData();
      } else {
        showNotification('error', data.error || 'Failed to process decision.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Error sending overpayment decision.');
    } finally {
      setActioning(null);
    }
  };

  // Submit Write-Off Request
  const requestWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/loans/write-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: writeOffForm.loanReference,
          memberId: writeOffForm.memberId,
          memberName: writeOffForm.memberName,
          amount: parseFloat(writeOffForm.amount),
          reason: writeOffForm.reason,
          requestedBy: writeOffForm.requestedBy
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Write-off request successfully submitted and marked PENDING.');
        setWriteOffForm(prev => ({
          ...prev,
          loanReference: 'LN-2026-0' + Math.floor(100 + Math.random() * 900),
          amount: ''
        }));
        await loadData();
      } else {
        showNotification('error', data.error || 'Failed to request write-off.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network failure during write-off request.');
    }
  };

  // Process Write-off Action (Approve / Reject)
  const processWriteOff = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActioning(id);
    try {
      const res = await fetch('/api/finance/loans/write-off', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          authorizedBy: 'Treasurer Romalyn (FS-005 Workflow)'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        await loadData();
      } else {
        showNotification('error', data.error || 'Failed to complete write-off workflow.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Error updating write-off request.');
    } finally {
      setActioning(null);
    }
  };

  // Calculations for summary card stats
  const bdoeaFund = funds.find(f => f.code === 'LOAN_BDOEA') || funds.find(f => f.code === 'LN');
  const loanBalance = bdoeaFund ? bdoeaFund.currentBalance : 0.0;
  const generalFund = funds.find(f => f.code === 'GF');
  const generalBalance = generalFund ? generalFund.currentBalance : 0.0;

  const totalRepaymentsValue = repayments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingOverpayments = repayments.filter(r => r.status === 'OVERPAYMENT_PENDING');
  const pendingWriteOffs = writeOffs.filter(w => w.status === 'PENDING');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 text-slate-800">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-300 transform translate-y-0 scale-100 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {notification.type === 'success' ? (
            <div className="p-1 rounded-full bg-emerald-500 text-white"><CheckCircle2 size={16} /></div>
          ) : (
            <div className="p-1 rounded-full bg-rose-500 text-white"><XCircle size={16} /></div>
          )}
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Header Banner - BDOEA Brand Identity */}
      <div className="bg-[#021124] text-white py-10 px-8 relative overflow-hidden border-b border-yellow-500/20">
        <div className="absolute right-0 top-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-yellow-500 text-[#021124] text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                Treasurer Panel
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs font-semibold flex items-center gap-1">
                <Activity size={12} className="text-yellow-500 animate-pulse" /> Live Ledger Sync
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Coins className="text-yellow-400" size={36} />
              Loans & Repayments Ledger
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl font-medium">
              Manage automatic repayment allocations, ledger split accounting, uncollectible account write-offs, and overpayments processing.
            </p>
          </div>
          
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 self-start md:self-center bg-white/10 hover:bg-white/15 active:scale-95 text-white px-5 py-3 rounded-xl border border-white/10 font-bold transition-all disabled:opacity-50 shadow-lg whitespace-nowrap"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-yellow-400" : "text-yellow-400"} />
            Sync Ledger Standings
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-6 relative z-20">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          
          {/* Card 1: BDOEA Loans Fund */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[135px]">
            <div className="flex justify-between items-center">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <Landmark size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                LOAN_BDOEA
              </span>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Capital</h3>
              <p className="text-2xl font-black text-[#021124] tracking-tight mt-0.5">
                ₱{loanBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card 2: General Fund */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[135px]">
            <div className="flex justify-between items-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                GENERAL_GF
              </span>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Cash</h3>
              <p className="text-2xl font-black text-[#021124] tracking-tight mt-0.5 overflow-hidden overflow-ellipsis whitespace-nowrap">
                ₱{generalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card 3: Total Repayments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[135px]">
            <div className="flex justify-between items-center">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                <FileSpreadsheet size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                POSTED_LAS
              </span>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Repayments</h3>
              <p className="text-2xl font-black text-[#021124] tracking-tight mt-0.5 overflow-hidden overflow-ellipsis whitespace-nowrap">
                ₱{totalRepaymentsValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card 4: Action Requests */}
          <div className={`p-6 rounded-2xl border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[135px] ${
            (pendingWriteOffs.length + pendingOverpayments.length) > 0 
              ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-500/5' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <div className={`p-2.5 rounded-xl border ${
                (pendingWriteOffs.length + pendingOverpayments.length) > 0
                  ? 'bg-rose-100 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <AlertCircle size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black/5 px-2.5 py-1 rounded-md">
                REQUIRED
              </span>
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pending Approvals</h3>
              <p className={`text-2xl font-black tracking-tight mt-0.5 ${
                (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'text-rose-600' : 'text-[#021124]'
              }`}>
                {pendingWriteOffs.length + pendingOverpayments.length} Active Items
              </p>
            </div>
          </div>

        </div>

        {/* Action Required Banner for Overpayments (Clean UX) */}
        {pendingOverpayments.length > 0 && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-900 text-base">Overpayments Action Required</h4>
                <p className="text-amber-700 text-xs font-semibold mt-0.5">
                  The system detected excess funds on these loan repayments. As the Treasurer, you must decide how to balance these in the ledger:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
              {pendingOverpayments.map(rep => (
                <div key={rep.id} className="bg-white border border-amber-200/60 rounded-xl p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-black text-slate-600 mr-2 uppercase">{rep.loanReference}</span>
                    <span className="font-bold text-slate-800 text-sm">{rep.memberName}</span>
                    <div className="text-[11px] text-slate-400 font-semibold mt-1">
                      Total Paid: ₱{rep.amount.toLocaleString()} | Excess: <span className="text-amber-600 font-bold">₱{rep.overpaymentAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resolveOverpayment(rep.id, 'ADVANCE_CREDIT')}
                      disabled={actioning !== null}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                    >
                      Apply Credit
                    </button>
                    <button
                      onClick={() => resolveOverpayment(rep.id, 'REFUND')}
                      disabled={actioning !== null}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                    >
                      Refund Cash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="mt-8 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs flex gap-2">
          <button
            onClick={() => setActiveTab('repayments')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'repayments' 
                ? 'bg-[#021124] text-white shadow-md' 
                : 'text-slate-600 hover:text-[#021124] hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={16} />
            Repayments Register
          </button>
          
          <button
            onClick={() => setActiveTab('writeoffs')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'writeoffs' 
                ? 'bg-[#021124] text-white shadow-md' 
                : 'text-slate-600 hover:text-[#021124] hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={16} />
            Write-Off Approvals Workflow
            {pendingWriteOffs.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingWriteOffs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'simulator' 
                ? 'bg-[#021124] text-white shadow-md' 
                : 'text-slate-600 hover:text-[#021124] hover:bg-slate-50'
            }`}
          >
            <Laptop size={16} />
            LAS Webhook Simulator
          </button>
        </div>

        {/* Dynamic Content Panel */}
        <div className="mt-6">
          
          {/* TAB 1: REPAYMENTS REGISTER */}
          {activeTab === 'repayments' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-lg font-extrabold text-[#021124]">Processed Loan Repayments</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Real-time ledger audit log of repayments posted by LAS.</p>
                </div>
                <span className="text-xs text-[#021124] font-bold bg-[#021124]/5 px-3 py-1.5 rounded-lg border border-[#021124]/10">
                  {repayments.length} Records Total
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Transaction Date</th>
                      <th className="px-6 py-4">Loan Reference</th>
                      <th className="px-6 py-4">Member Name</th>
                      <th className="px-6 py-4 text-right">Total Remittance</th>
                      <th className="px-6 py-4 text-right">Ledger Allocation Splits</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Overpayment Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {repayments.length > 0 ? (
                      repayments.map((rep) => {
                        const dateFormatted = new Date(rep.processedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        return (
                          <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-medium">{dateFormatted}</td>
                            <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">{rep.loanReference}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{rep.memberName}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{rep.memberId} • Method: {rep.paymentMethod}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                              ₱{rep.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex flex-col text-[11px] text-slate-500 font-semibold gap-0.5">
                                <span>Principal: ₱{rep.principalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                <span>Service Fee: ₱{rep.serviceFeeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              {rep.status === 'PROCESSED' && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                  Processed
                                </span>
                              )}
                              {rep.status === 'OVERPAYMENT_PENDING' && (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] uppercase bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                  Pending Action
                                </span>
                              )}
                              {rep.status === 'OVERPAYMENT_CREDITED' && (
                                <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-[10px] uppercase bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                  Applied Credit
                                </span>
                              )}
                              {rep.status === 'OVERPAYMENT_REFUNDED' && (
                                <span className="inline-flex items-center gap-1 text-purple-700 font-bold text-[10px] uppercase bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                                  Refunded
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              {rep.overpaymentAmount > 0 ? (
                                <div className="flex flex-col text-[11px] text-slate-500 font-bold gap-0.5">
                                  <span className="text-amber-600">Excess: ₱{rep.overpaymentAmount.toLocaleString()}</span>
                                  <span className="text-[10px] text-slate-400 capitalize">Decision: {rep.treasurerDecision.toLowerCase().replace('_', ' ')}</span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs italic">No overpayment</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                          No repayment ledger logs detected in database. Go to the **Webhook Simulator** tab to simulate repayments.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: WRITE-OFF WORKFLOWS */}
          {activeTab === 'writeoffs' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Write-off setup form */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 self-start flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#021124] flex items-center gap-2">
                    <FileClock className="text-rose-700" size={18} />
                    Request Loan Write-Off
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Submit request to write-off uncollectible credit balances.</p>
                </div>
                
                <form onSubmit={requestWriteOff} className="text-xs flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Member ID</label>
                    <input 
                      type="text" value={writeOffForm.memberId} onChange={(e) => setWriteOffForm({...writeOffForm, memberId: e.target.value})}
                      className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Member Name</label>
                    <input 
                      type="text" value={writeOffForm.memberName} onChange={(e) => setWriteOffForm({...writeOffForm, memberName: e.target.value})}
                      className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Loan Reference ID</label>
                    <input 
                      type="text" value={writeOffForm.loanReference} onChange={(e) => setWriteOffForm({...writeOffForm, loanReference: e.target.value})}
                      className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Write-off Amount (₱)</label>
                    <input 
                      type="number" value={writeOffForm.amount} onChange={(e) => setWriteOffForm({...writeOffForm, amount: e.target.value})}
                      className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 font-black text-rose-600 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-600">Justification & Audit Reason</label>
                    <textarea 
                      value={writeOffForm.reason} onChange={(e) => setWriteOffForm({...writeOffForm, reason: e.target.value})}
                      rows={3}
                      className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all resize-none" required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#021124] hover:bg-[#0c223c] active:scale-95 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all shadow-md"
                  >
                    <FileClock size={16} />
                    File Write-off Request
                  </button>
                </form>
              </div>

              {/* Write-offs Register Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div>
                    <h3 className="text-base font-extrabold text-[#021124]">Write-off Register History</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Approval registry logs and corresponding write-off decisions.</p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">
                    {writeOffs.length} Filed Requests
                  </span>
                </div>

                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-4 py-3.5">Date Filed</th>
                        <th className="px-4 py-3.5">Loan Ref</th>
                        <th className="px-4 py-3.5">Member Name</th>
                        <th className="px-4 py-3.5 text-right">Write-off Amount</th>
                        <th className="px-4 py-3.5">Justification Reason</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-4 py-3.5 text-right">Approvals Workflow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {writeOffs.length > 0 ? (
                        writeOffs.map((wo) => {
                          const dateObj = new Date(wo.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          });
                          return (
                            <tr key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-4 text-slate-500 whitespace-nowrap font-medium">{dateObj}</td>
                              <td className="px-4 py-4 font-bold text-red-600 whitespace-nowrap">{wo.loanReference}</td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{wo.memberName}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{wo.memberId}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right font-black text-rose-600 whitespace-nowrap">
                                ₱{wo.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 max-w-[180px] truncate" title={wo.reason}>
                                <div className="flex flex-col">
                                  <span className="text-slate-800 font-medium truncate">{wo.reason}</span>
                                  <span className="text-[10px] text-slate-400">By: {wo.requestedBy}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center whitespace-nowrap">
                                {wo.status === 'PENDING' && (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[9px] uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Pending
                                  </span>
                                )}
                                {wo.status === 'APPROVED' && (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[9px] uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    Approved
                                  </span>
                                )}
                                {wo.status === 'REJECTED' && (
                                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[9px] uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                    Rejected
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right whitespace-nowrap">
                                {wo.status === 'PENDING' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => processWriteOff(wo.id, 'APPROVED')}
                                      disabled={actioning !== null}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-md text-[10px] font-bold transition-all disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => processWriteOff(wo.id, 'REJECTED')}
                                      disabled={actioning !== null}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-md text-[10px] font-bold transition-all disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 font-semibold italic">
                                    Auth: {wo.authorizedBy || 'N/A'}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-slate-400 font-medium">
                            No write-off requests registered in the audit database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: LAS WEBHOOK SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-[#021124] flex items-center gap-2">
                    <Sparkles className="text-yellow-500 animate-pulse" size={20} />
                    LAS Webhook Payload Simulator
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Mock transactions payload trigger to test repayments posting lifecycle.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-800 uppercase tracking-widest border border-yellow-200">
                  LAS SANDBOX
                </span>
              </div>

              <form onSubmit={triggerRepaymentWebhook} className="flex flex-col gap-6">
                
                {/* Section A: Member Identifiers */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={12} /> Member Identifiers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Member System ID</label>
                      <input 
                        type="text" name="memberId" value={simulatorForm.memberId} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Member Full Name</label>
                      <input 
                        type="text" name="memberName" value={simulatorForm.memberName} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Remittance values */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign size={12} /> Payment Allocation Details
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Loan Reference ID</label>
                      <input 
                        type="text" name="loanReference" value={simulatorForm.loanReference} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Total Remitted Amount (₱)</label>
                      <input 
                        type="number" name="amount" value={simulatorForm.amount} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm font-black text-[#021124] bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all" required
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex flex-col gap-3 mt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-xs text-yellow-900 flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" checked={simulatorForm.autoSplit} onChange={toggleAutoSplit}
                          className="rounded text-yellow-600 focus:ring-yellow-500"
                        />
                        Auto-calculate splits (95% Principal / 5% Service Fee)
                      </label>
                      
                      <span title="95% goes to Loan Principal, 5% goes to service-fee income" className="cursor-pointer text-yellow-600">
                        <HelpCircle size={16} />
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[10px] text-yellow-800">Principal Repayment (₱)</label>
                        <input 
                          type="number" name="principalAmount" value={simulatorForm.principalAmount} onChange={handleSimFormChange}
                          disabled={simulatorForm.autoSplit}
                          className="p-2 border border-yellow-100 rounded-lg text-xs bg-white disabled:bg-yellow-100/50 disabled:text-yellow-900/60 font-bold outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[10px] text-yellow-800">Service Fee Income (₱)</label>
                        <input 
                          type="number" name="serviceFeeAmount" value={simulatorForm.serviceFeeAmount} onChange={handleSimFormChange}
                          disabled={simulatorForm.autoSplit}
                          className="p-2 border border-yellow-100 rounded-lg text-xs bg-white disabled:bg-yellow-100/50 disabled:text-yellow-900/60 font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C: Audit Trails */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck size={12} /> Audit Trail Identifiers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Payment Gateway/Method</label>
                      <select 
                        name="paymentMethod" value={simulatorForm.paymentMethod} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all"
                      >
                        <option value="GCASH">GCash Webhook</option>
                        <option value="BANK_TRANSFER">Bank API Transfer</option>
                        <option value="CASH">Counter Over-the-counter Cash</option>
                        <option value="CHECK">Clearing Check Deposit</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-xs text-slate-600">Reference / Voucher Number</label>
                      <input 
                        type="text" name="referenceNumber" value={simulatorForm.referenceNumber} onChange={handleSimFormChange}
                        className="p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={simulating}
                  className="w-full bg-[#021124] hover:bg-[#0c223c] active:scale-98 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg disabled:opacity-50 text-base"
                >
                  {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                  Trigger LAS Repayment Webhook Event
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
