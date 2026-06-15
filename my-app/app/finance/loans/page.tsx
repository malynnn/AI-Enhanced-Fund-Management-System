"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ShieldCheck, RefreshCw, Send, CheckCircle2, 
  XCircle, AlertCircle, Landmark, Search, Activity, Terminal, 
  CreditCard, Filter, ChevronLeft, ChevronRight, X, Plus
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

const initialWriteOffForm = {
  loanReference: '',
  memberId: '',
  memberName: '',
  amount: '',
  reason: '',
  requestedBy: 'Treasurer Office'
};

export default function LoansDashboard() {
  // --- STATE ---
  const [funds, setFunds] = useState<Fund[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  
  const [activeTab, setActiveTab] = useState<'repayments' | 'writeoffs'>('repayments');
  
  // Repayments Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [repaymentPage, setRepaymentPage] = useState(1);

  // Write-Off Filters & Pagination
  const [writeOffSearch, setWriteOffSearch] = useState('');
  const [writeOffStatus, setWriteOffStatus] = useState('ALL');
  const [writeOffPage, setWriteOffPage] = useState(1);

  const itemsPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Reset pagination when filters change
  useEffect(() => { setRepaymentPage(1); }, [searchTerm, filterStatus, filterMethod]);
  useEffect(() => { setWriteOffPage(1); }, [writeOffSearch, writeOffStatus]);

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

  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState(initialWriteOffForm);

  // --- BACKEND API LOGIC ---
  const loadData = async () => {
    try {
      setLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const [fundsRes, repaymentsRes, writeOffsRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/finance/funds`),
        fetch(`${gatewayUrl}/api/finance/repayments`),
        fetch(`${gatewayUrl}/api/finance/loans/write-offs`)
      ]);

      if (fundsRes.ok) {
        const fundsData = await fundsRes.json();
        setFunds(fundsData.map((f: any) => ({
          ...f,
          currentBalance: Number(f.currentBalance)
        })));
      }
      if (repaymentsRes.ok) {
        const repaymentsData = await repaymentsRes.json();
        setRepayments(repaymentsData.map((r: any) => ({
          ...r,
          amount: Number(r.amount),
          principalAmount: Number(r.principalAmount),
          serviceFeeAmount: Number(r.serviceFeeAmount),
          overpaymentAmount: Number(r.overpaymentAmount)
        })));
      }
      if (writeOffsRes.ok) {
        const writeOffsData = await writeOffsRes.json();
        setWriteOffs(writeOffsData.map((w: any) => ({
          ...w,
          amount: Number(w.amount)
        })));
      }
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

  // --- TRIGGER MODAL LOGIC ---
  const handleCancelWriteOffForm = () => {
    setIsWriteOffModalOpen(false);
    setWriteOffForm(initialWriteOffForm); // Explicitly clears the form when cancelled
  };

  const triggerRequestWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    setIsWriteOffModalOpen(false); // Hide the form modal first to prevent overlapping
    setModal({
      isOpen: true,
      title: 'Confirm Write-Off Request',
      message: `You are about to file an uncollectible write-off request for ${writeOffForm.loanReference} (₱${writeOffForm.amount}). This will be sent to Administration for final approval. Proceed?`,
      actionType: 'requestWriteOff',
      status: 'idle'
    });
  };

  const closeActionModal = () => {
    // If the user aborts the confirmation modal, re-open the form with their typed data
    if (modal.actionType === 'requestWriteOff' && modal.status !== 'success' && modal.status !== 'loading') {
      setIsWriteOffModalOpen(true);
    }
    setModal(prev => ({ ...prev, isOpen: false }));
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
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
    
    try {
      if (modal.actionType === 'requestWriteOff') {
        const res = await fetch(`${gatewayUrl}/api/finance/loans/write-offs`, {
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
          setWriteOffForm(initialWriteOffForm); // Clear form on success
          await loadData();
          setModal(prev => ({ ...prev, status: 'success', resultMsg: 'Write-off request successfully submitted.' }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: data.error || 'Failed to request write-off.' }));
        }
      }

      else if (modal.actionType === 'processWriteOff') {
        const { id, status } = modal.payload;
        const res = await fetch(`${gatewayUrl}/api/finance/loans/write-offs`, {
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

  // --- REPAYMENTS FILTERING & PAGINATION ---
  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      const matchesSearch = r.loanReference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.memberName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' ? true : r.status === filterStatus;
      const matchesMethod = filterMethod === 'ALL' ? true : r.paymentMethod === filterMethod;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [repayments, searchTerm, filterStatus, filterMethod]);

  const totalRepaymentPages = Math.max(1, Math.ceil(filteredRepayments.length / itemsPerPage));
  const paginatedRepayments = filteredRepayments.slice((repaymentPage - 1) * itemsPerPage, repaymentPage * itemsPerPage);
  const uniqueMethods = Array.from(new Set(repayments.map(r => r.paymentMethod)));

  // --- WRITE-OFFS FILTERING & PAGINATION ---
  const filteredWriteOffs = useMemo(() => {
    return writeOffs.filter(w => {
      const matchesSearch = w.loanReference.toLowerCase().includes(writeOffSearch.toLowerCase()) || 
                            w.memberName.toLowerCase().includes(writeOffSearch.toLowerCase());
      const matchesStatus = writeOffStatus === 'ALL' ? true : w.status === writeOffStatus;
      return matchesSearch && matchesStatus;
    });
  }, [writeOffs, writeOffSearch, writeOffStatus]);

  const totalWriteOffPages = Math.max(1, Math.ceil(filteredWriteOffs.length / itemsPerPage));
  const paginatedWriteOffs = filteredWriteOffs.slice((writeOffPage - 1) * itemsPerPage, writeOffPage * itemsPerPage);

  // --- METRICS ---
  const bdoeaFund = funds.find(f => f.code === 'LOAN_BDOEA' || f.code === 'LN');
  const loanBalance = bdoeaFund ? bdoeaFund.currentBalance : 0.0;
  const totalRepaymentsValue = repayments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingOverpayments = repayments.filter(r => r.status === 'OVERPAYMENT_PENDING');
  const pendingWriteOffs = writeOffs.filter(w => w.status === 'PENDING');

  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative">
      
      {/* Toast Notification */}
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
        onClose={closeActionModal}
        confirmText="Confirm Action"
      />

      {/* Write-Off Request Form Modal */}
      {isWriteOffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
              <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2">
                <ShieldCheck size={20} className="text-red-500" /> Request Loan Write-Off
              </h3>
              <button 
                onClick={handleCancelWriteOffForm}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={triggerRequestWriteOff} className="p-6 flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member ID</label>
                  <input 
                    type="text" 
                    placeholder="E.g., M-105" 
                    value={writeOffForm.memberId} 
                    onChange={(e) => setWriteOffForm({...writeOffForm, memberId: e.target.value})} 
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Loan Ref ID</label>
                  <input 
                    type="text" 
                    placeholder="E.g., LN-2026-092" 
                    value={writeOffForm.loanReference} 
                    onChange={(e) => setWriteOffForm({...writeOffForm, loanReference: e.target.value})} 
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d]" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member Name</label>
                <input 
                  type="text" 
                  placeholder="E.g., Juan Dela Cruz" 
                  value={writeOffForm.memberName} 
                  onChange={(e) => setWriteOffForm({...writeOffForm, memberName: e.target.value})} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Write-Off Amount (₱)</label>
                <input 
                  type="number" 
                  placeholder="E.g., 15000" 
                  value={writeOffForm.amount} 
                  onChange={(e) => setWriteOffForm({...writeOffForm, amount: e.target.value})} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10 outline-none transition-colors font-mono font-black text-red-600 text-lg" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Justification Reason</label>
                <textarea 
                  placeholder="E.g., Member has migrated overseas with no remaining collateral..." 
                  value={writeOffForm.reason} 
                  onChange={(e) => setWriteOffForm({...writeOffForm, reason: e.target.value})} 
                  rows={3} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors resize-none font-medium text-[#04152d]" 
                  required 
                />
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={handleCancelWriteOffForm} className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150">Cancel</button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all">
                  File Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

        {/* FIXED KPI Cards: Added min-w-0 to prevent flex blowout on resize */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-600">
              <Landmark size={24} />
            </div>
            <div className="min-w-0">
              <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Active Loan Capital</p>
              <p className="text-2xl md:text-3xl font-black text-[#04152d] truncate">₱{loanBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-600">
              <Activity size={24} />
            </div>
            <div className="min-w-0">
              <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Repayments</p>
              <p className="text-2xl md:text-3xl font-black text-[#04152d] truncate">₱{totalRepaymentsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className={`rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] flex items-center gap-4 animate-slide-up ${
            (pendingWriteOffs.length) > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-white/80'
          }`} style={{ animationDelay: '0.15s' }}>
            <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${
                (pendingWriteOffs.length) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-500'
            }`}>
              <AlertCircle size={24} />
            </div>
            <div className="min-w-0">
              <p className={`block text-xs font-black uppercase tracking-[0.12em] mb-0.5 ${
                (pendingWriteOffs.length) > 0 ? 'text-red-700' : 'text-gray-500'
              }`}>Pending Approvals</p>
              <p className={`text-2xl md:text-3xl font-black truncate ${
                (pendingWriteOffs.length) > 0 ? 'text-red-700' : 'text-[#04152d]'
              }`}>{(pendingWriteOffs.length)} Items</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col w-full">
          
          {/* TAB 1: REPAYMENT LEDGER */}
          {activeTab === 'repayments' && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              
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
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto w-full">
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
                      {/* Using paginated array */}
                      {paginatedRepayments.length > 0 ? paginatedRepayments.map((rep) => (
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

                {/* Repayments Pagination Footer */}
                {totalRepaymentPages > 1 && !loading && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                    <button
                      onClick={() => setRepaymentPage(p => Math.max(1, p - 1))}
                      disabled={repaymentPage === 1}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Page {repaymentPage} of {totalRepaymentPages}
                    </span>
                    <button
                      onClick={() => setRepaymentPage(p => Math.min(totalRepaymentPages, p + 1))}
                      disabled={repaymentPage === totalRepaymentPages}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WRITE-OFF WORKFLOWS */}
          {activeTab === 'writeoffs' && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              
              {/* Write-Offs Filter Bar */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px] relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" placeholder="Search by Loan Ref or Member..." 
                    value={writeOffSearch} onChange={(e) => setWriteOffSearch(e.target.value)}
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
                  />
                </div>

                <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
                  <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={writeOffStatus} onChange={(e) => setWriteOffStatus(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>

                {/* Open Modal Button */}
                <button 
                  onClick={() => setIsWriteOffModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all ml-auto"
                >
                  <Plus size={16} /> Request Write-Off
                </button>
              </div>

              <div className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-black text-[#04152d]">Write-Off Logs</h2>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">{filteredWriteOffs.length} Records</span>
                </div>
                
                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-left text-sm border-collapse min-w-[900px]">
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
                      {paginatedWriteOffs.length > 0 ? paginatedWriteOffs.map((wo) => (
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
                          <td className="px-6 py-5 text-right pr-6">
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

                {/* Write-Offs Pagination Footer */}
                {totalWriteOffPages > 1 && !loading && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                    <button
                      onClick={() => setWriteOffPage(p => Math.max(1, p - 1))}
                      disabled={writeOffPage === 1}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Page {writeOffPage} of {totalWriteOffPages}
                    </span>
                    <button
                      onClick={() => setWriteOffPage(p => Math.min(totalWriteOffPages, p + 1))}
                      disabled={writeOffPage === totalWriteOffPages}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}