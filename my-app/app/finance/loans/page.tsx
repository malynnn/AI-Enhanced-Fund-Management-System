"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ShieldCheck, RefreshCw, Send, CheckCircle2, 
  XCircle, AlertCircle, Landmark, Search, Activity, Terminal, CreditCard, Filter
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

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
  // --- STATE ---
  const [funds, setFunds] = useState<Fund[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  
  const [activeTab, setActiveTab] = useState<'repayments' | 'writeoffs'>('repayments');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- MODAL STATE MANAGEMENT ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'overpayment' | 'requestWriteOff' | 'processWriteOff' | 'simulateWebhook' | null;
    payload?: any;
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', actionType: null, status: 'idle' });

  // --- FORMS ---
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

  // --- BACKEND API LOGIC ---
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

  const handleSimFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSimulatorForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'amount' && prev.autoSplit) {
        const amt = parseFloat(value) || 0;
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

  // --- MODAL TRIGGERS ---
  const triggerRepaymentWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setModal({
      isOpen: true,
      title: 'Confirm Webhook Simulation',
      message: `You are about to inject a mock repayment payload of ₱${simulatorForm.amount} for ${simulatorForm.loanReference}. Proceed?`,
      actionType: 'simulateWebhook',
      status: 'idle'
    });
  };

  const triggerResolveOverpayment = (repaymentId: string, decision: 'ADVANCE_CREDIT' | 'REFUND') => {
    setModal({
      isOpen: true,
      title: decision === 'ADVANCE_CREDIT' ? 'Confirm Advance Credit' : 'Confirm Cash Refund',
      message: `Are you sure you want to process this overpayment as ${decision === 'ADVANCE_CREDIT' ? 'credit towards the principal balance' : 'a cash refund to the member'}?`,
      actionType: 'overpayment',
      payload: { repaymentId, decision },
      status: 'idle'
    });
  };

  const triggerRequestWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    setModal({
      isOpen: true,
      title: 'Confirm Write-Off Request',
      message: `You are about to file an uncollectible write-off request for ${writeOffForm.loanReference} (₱${writeOffForm.amount}). This will be sent to Administration for final approval. Proceed?`,
      actionType: 'requestWriteOff',
      status: 'idle'
    });
  };

  const triggerProcessWriteOff = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setModal({
      isOpen: true,
      title: `Confirm Write-Off ${status === 'APPROVED' ? 'Approval' : 'Rejection'}`,
      message: `Are you sure you want to ${status.toLowerCase()} this write-off request? This action will permanently update the ledger.`,
      actionType: 'processWriteOff',
      payload: { id, status },
      status: 'idle'
    });
  };

  // --- EXECUTE API LOGIC VIA MODAL ---
  const executeModalAction = async () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    
    try {
      if (modal.actionType === 'simulateWebhook') {
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
          await loadData();
          setActiveTab('repayments');
          setModal(prev => ({ ...prev, status: 'success', resultMsg: 'Webhook fired successfully. Ledger updated.' }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: data.error || 'Failed to submit repayment.' }));
        }
      }

      else if (modal.actionType === 'overpayment') {
        const { repaymentId, decision } = modal.payload;
        const res = await fetch('/api/finance/loans/overpayment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repaymentId, decision, authorizedBy: 'Treasurer Romalyn' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await loadData();
          setModal(prev => ({ ...prev, status: 'success', resultMsg: data.message }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: data.error || 'Failed to process decision.' }));
        }
      } 
      
      else if (modal.actionType === 'requestWriteOff') {
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
          setWriteOffForm(prev => ({ ...prev, loanReference: 'LN-2026-0' + Math.floor(100 + Math.random() * 900), amount: '' }));
          await loadData();
          setModal(prev => ({ ...prev, status: 'success', resultMsg: 'Write-off request successfully submitted.' }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: data.error || 'Failed to request write-off.' }));
        }
      }

      else if (modal.actionType === 'processWriteOff') {
        const { id, status } = modal.payload;
        const res = await fetch('/api/finance/loans/write-off', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, authorizedBy: 'Treasurer Workflow' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await loadData();
          setModal(prev => ({ ...prev, status: 'success', resultMsg: data.message }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: data.error || 'Failed to complete workflow.' }));
        }
      }

    } catch (err) {
      console.error(err);
      setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Network failure during action execution.' }));
    }
  };

  // --- DATA FILTERING & AGGREGATION ---
  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      const matchesSearch = r.loanReference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.memberName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' ? true : r.status === filterStatus;
      const matchesMethod = filterMethod === 'ALL' ? true : r.paymentMethod === filterMethod;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [repayments, searchTerm, filterStatus, filterMethod]);

  const uniqueMethods = Array.from(new Set(repayments.map(r => r.paymentMethod)));

  const bdoeaFund = funds.find(f => f.code === 'LOAN_BDOEA' || f.code === 'LN');
  const loanBalance = bdoeaFund ? bdoeaFund.currentBalance : 0.0;
  const totalRepaymentsValue = repayments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingOverpayments = repayments.filter(r => r.status === 'OVERPAYMENT_PENDING');
  const pendingWriteOffs = writeOffs.filter(w => w.status === 'PENDING');

  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative">
      
      {/* Toast Notification (Used for generic Syncs) */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all animate-slide-up ${
          notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
          <span className="text-sm font-bold">{notification.text}</span>
        </div>
      )}

      {/* Global Confirmation Modal */}
      <ActionModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        status={modal.status}
        resultMsg={modal.resultMsg}
        onConfirm={executeModalAction}
        onClose={() => setModal({ ...modal, isOpen: false })}
        confirmText="Confirm Action"
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-none">
        
        {/* TOP TABS & ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 flex-shrink-0 print:hidden mt-2">
          
          <div className="flex gap-8 border-b-2 border-gray-200/60 w-full sm:w-auto px-2">
            <button 
              onClick={() => setActiveTab('repayments')}
              className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${
                activeTab === 'repayments' 
                  ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' 
                  : 'text-gray-400 hover:text-[#04152d]'
              }`}
            >
              <FileText size={18} /> Repayment Ledger
            </button>
            <button 
              onClick={() => setActiveTab('writeoffs')}
              className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${
                activeTab === 'writeoffs' 
                  ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' 
                  : 'text-gray-400 hover:text-[#04152d]'
              }`}
            >
              <ShieldCheck size={18} /> Write-Off Workflow
              {pendingWriteOffs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{pendingWriteOffs.length}</span>}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={loadData} disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Ledger
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Landmark size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Active Loan Capital</p>
                <p className="text-3xl font-black text-[#04152d]">₱{loanBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Repayments</p>
                <p className="text-3xl font-black text-[#04152d]">₱{totalRepaymentsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] flex flex-col justify-center animate-slide-up ${
            (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-white/80'
          }`} style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                 (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-500'
              }`}>
                <AlertCircle size={24} />
              </div>
              <div>
                <p className={`block text-xs font-black uppercase tracking-[0.12em] mb-0.5 ${
                  (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'text-red-700' : 'text-gray-500'
                }`}>Pending Approvals</p>
                <p className={`text-3xl font-black ${
                  (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'text-red-700' : 'text-[#04152d]'
                }`}>{(pendingWriteOffs.length + pendingOverpayments.length)} Items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Overpayments Alert Banner */}
        {pendingOverpayments.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.2)] animate-pop">
            <div className="flex items-center gap-3 mb-5">
              <AlertCircle size={22} className="text-orange-600" />
              <h4 className="font-black text-orange-900 text-lg">Overpayments Action Required</h4>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingOverpayments.map(rep => (
                <div key={rep.id} className="bg-white border border-orange-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <span className="text-[10px] bg-gray-100 border border-gray-200 px-2.5 py-1 rounded font-black text-gray-600 mr-3 uppercase tracking-widest">{rep.loanReference}</span>
                    <span className="font-black text-[#04152d] text-base">{rep.memberName}</span>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                      Excess Balance: <span className="text-orange-600 font-black text-sm ml-1">₱{rep.overpaymentAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => triggerResolveOverpayment(rep.id, 'ADVANCE_CREDIT')} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-[0_4px_0_rgba(2,6,15,0.55),0_4px_12px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all">
                      Apply Credit
                    </button>
                    <button onClick={() => triggerResolveOverpayment(rep.id, 'REFUND')} className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-600 hover:border-[#04152d] hover:text-[#04152d] font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-150">
                      Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          
          {/* TAB 1: REPAYMENT LEDGER */}
          {activeTab === 'repayments' && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              
              {/* Added Filter Bar for Repayments */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px] relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" placeholder="Search by Loan Ref or Member..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
                  />
                </div>
                
                <div className="relative inline-block w-full sm:w-auto min-w-[180px]">
                  <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                    <option value="ALL">All Methods</option>
                    {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>

                <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
                  <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                    <option value="ALL">All Status</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="OVERPAYMENT_PENDING">Overpayment Pending</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Transaction Date</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Loan Reference</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Member Name</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount Remitted</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Ledger Split (Principal / Fee)</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRepayments.length > 0 ? filteredRepayments.map((rep) => (
                        <tr key={rep.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                          <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                            {new Date(rep.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-blue-600 font-mono text-xs">{rep.loanReference}</td>
                          <td className="px-6 py-5 text-sm">
                            <span className="font-bold text-[#04152d] block">{rep.memberName}</span>
                            <span className="text-[10px] font-mono text-gray-400 mt-1 block">{rep.paymentMethod}</span>
                          </td>
                          <td className="px-6 py-5 text-sm text-right font-black text-[#04152d] text-lg">
                            ₱{rep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-sm text-right text-xs">
                            <span className="text-[#04152d] font-bold">₱{rep.principalAmount.toLocaleString()}</span>
                            <span className="text-gray-300 mx-2 font-black">/</span>
                            <span className="text-emerald-600 font-bold">₱{rep.serviceFeeAmount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 text-sm text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              rep.status === 'PROCESSED' ? 'bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]' : 'bg-orange-100 text-orange-700 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.3)]'
                            }`}>
                              {rep.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">No repayment records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WRITE-OFF WORKFLOWS */}
          {activeTab === 'writeoffs' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
              <div className="xl:col-span-1 bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 p-8 self-start">
                <h3 className="text-lg font-black text-[#04152d] mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <ShieldCheck size={20} className="text-red-500" /> Request Loan Write-Off
                </h3>
                <form onSubmit={triggerRequestWriteOff} className="flex flex-col gap-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member ID</label>
                      <input type="text" value={writeOffForm.memberId} onChange={(e) => setWriteOffForm({...writeOffForm, memberId: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Loan Ref ID</label>
                      <input type="text" value={writeOffForm.loanReference} onChange={(e) => setWriteOffForm({...writeOffForm, loanReference: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member Name</label>
                    <input type="text" value={writeOffForm.memberName} onChange={(e) => setWriteOffForm({...writeOffForm, memberName: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Write-Off Amount (₱)</label>
                    <input type="number" value={writeOffForm.amount} onChange={(e) => setWriteOffForm({...writeOffForm, amount: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10 outline-none transition-colors font-mono font-black text-red-600 text-lg" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Justification Reason</label>
                    <textarea value={writeOffForm.reason} onChange={(e) => setWriteOffForm({...writeOffForm, reason: e.target.value})} rows={3} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors resize-none font-medium text-[#04152d]" required />
                  </div>
                  <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all mt-4">
                    File Request
                  </button>
                </form>
              </div>

              <div className="xl:col-span-2 bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#f8faff] border-b border-gray-100 text-gray-500 font-black uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)]">Loan Ref</th>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)]">Member Name</th>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount</th>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)]">Justification</th>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Status</th>
                        <th className="px-6 py-5 shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {writeOffs.length > 0 ? writeOffs.map((wo) => (
                        <tr key={wo.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                          <td className="px-6 py-5 font-bold text-red-600 font-mono text-xs">{wo.loanReference}</td>
                          <td className="px-6 py-5 font-bold text-[#04152d]">{wo.memberName}</td>
                          <td className="px-6 py-5 text-right font-black text-[#04152d] text-lg">₱{wo.amount.toLocaleString()}</td>
                          <td className="px-6 py-5 max-w-[200px] truncate text-xs font-medium text-gray-600" title={wo.reason}>{wo.reason}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${
                              wo.status === 'PENDING' ? 'bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.3)]' : 
                              wo.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]' : 'bg-red-100 text-red-700 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)]'
                            }`}>{wo.status}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            {wo.status === 'PENDING' ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => triggerProcessWriteOff(wo.id, 'APPROVED')} className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-[0_3px_0_rgba(5,70,40,0.45),0_2px_8px_rgba(16,185,129,0.3)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(5,70,40,0.45),0_1px_4px_rgba(16,185,129,0.2)] transition-all">Approve</button>
                                <button onClick={() => triggerProcessWriteOff(wo.id, 'REJECTED')} className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-[0_3px_0_rgba(130,10,10,0.45),0_2px_8px_rgba(220,38,38,0.3)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(130,10,10,0.45),0_1px_4px_rgba(220,38,38,0.2)] transition-all">Reject</button>
                              </div>
                            ) : <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-2">Resolved</span>}
                          </td>
                        </tr>
                      )) : <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">No write-off requests found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GLOBAL SIMULATOR FORM - Always fixed at bottom to provide table breathing room */}
          <div className="w-full bg-white rounded-2xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 mt-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                <span className="text-[#8b5cf6]">{`>_`}</span> MS Webhook Simulator
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Inject test payload into the loans collection queue to test Ledger processing.
              </p>
            </div>
            
            <form onSubmit={triggerRepaymentWebhook} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Loan Reference ID</label>
                  <input type="text" name="loanReference" value={simulatorForm.loanReference} onChange={handleSimFormChange} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#04152d] uppercase tracking-[0.12em] mb-1.5">Amount Remitted (₱)</label>
                  <input type="number" name="amount" value={simulatorForm.amount} onChange={handleSimFormChange} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-black text-[#04152d] text-lg" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member ID</label>
                  <input type="text" name="memberId" value={simulatorForm.memberId} onChange={handleSimFormChange} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member Name</label>
                  <input type="text" name="memberName" value={simulatorForm.memberName} onChange={handleSimFormChange} className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" required />
                </div>
              </div>

              <div className="xl:col-span-1 bg-[#f8faff] border border-blue-100 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <label className="font-black text-xs text-[#04152d] flex items-center gap-3 mb-6 cursor-pointer select-none border-b border-blue-100 pb-4">
                    <input type="checkbox" checked={simulatorForm.autoSplit} onChange={toggleAutoSplit} className="w-4 h-4 rounded border-gray-300 text-[#04152d] focus:ring-[#04152d]" /> 
                    Auto-calculate splits (95% / 5%)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Principal (₱)</label>
                      <input type="number" name="principalAmount" value={simulatorForm.principalAmount} onChange={handleSimFormChange} disabled={simulatorForm.autoSplit} className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-[#dde3ee] font-mono font-bold text-[#04152d] outline-none disabled:bg-gray-100 disabled:text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Service Fee (₱)</label>
                      <input type="number" name="serviceFeeAmount" value={simulatorForm.serviceFeeAmount} onChange={handleSimFormChange} disabled={simulatorForm.autoSplit} className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-[#dde3ee] font-mono font-bold text-[#04152d] outline-none disabled:bg-gray-100 disabled:text-gray-500" />
                    </div>
                  </div>
                </div>
                
                <button type="button" onClick={triggerRepaymentWebhook} disabled={modal.status === 'loading'} className="w-full inline-flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black py-3.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(109,40,217,0.45),0_4px_18px_rgba(139,92,246,0.4)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(109,40,217,0.45),0_2px_8px_rgba(139,92,246,0.25)] transition-all mt-8">
                  <Send size={16} /> Trigger Webhook Event
                </button>
              </div>

            </form>
          </div>

        </div>
      </main>
    </div>
  );
} 