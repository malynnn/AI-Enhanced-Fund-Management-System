"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ShieldCheck, RefreshCw, Send, CheckCircle2, 
  XCircle, AlertCircle, Landmark, Search, Activity, Terminal
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
  // --- STATE ---
  const [funds, setFunds] = useState<Fund[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  
  const [activeTab, setActiveTab] = useState<'repayments' | 'writeoffs' | 'simulator'>('repayments');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  // --- BACKEND API LOGIC (Preserved) ---
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

  const handleSimFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        setActiveTab('repayments'); 
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

  const resolveOverpayment = async (repaymentId: string, decision: 'ADVANCE_CREDIT' | 'REFUND') => {
    setActioning(repaymentId);
    try {
      const res = await fetch('/api/finance/loans/overpayment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repaymentId, decision, authorizedBy: 'Treasurer Romalyn' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        await loadData();
      } else showNotification('error', data.error || 'Failed to process decision.');
    } catch (err) {
      showNotification('error', 'Error sending overpayment decision.');
    } finally {
      setActioning(null);
    }
  };

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
        showNotification('success', 'Write-off request successfully submitted.');
        setWriteOffForm(prev => ({ ...prev, loanReference: 'LN-2026-0' + Math.floor(100 + Math.random() * 900), amount: '' }));
        await loadData();
      } else showNotification('error', data.error || 'Failed to request write-off.');
    } catch (err) {
      showNotification('error', 'Network failure during write-off request.');
    }
  };

  const processWriteOff = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActioning(id);
    try {
      const res = await fetch('/api/finance/loans/write-off', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, authorizedBy: 'Treasurer Workflow' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        await loadData();
      } else showNotification('error', data.error || 'Failed to complete workflow.');
    } catch (err) {
      showNotification('error', 'Error updating write-off request.');
    } finally {
      setActioning(null);
    }
  };

  // --- DATA FILTERING & AGGREGATION ---
  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => 
      r.loanReference.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.memberName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [repayments, searchTerm]);

  const bdoeaFund = funds.find(f => f.code === 'LOAN_BDOEA' || f.code === 'LN');
  const loanBalance = bdoeaFund ? bdoeaFund.currentBalance : 0.0;
  const totalRepaymentsValue = repayments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingOverpayments = repayments.filter(r => r.status === 'OVERPAYMENT_PENDING');
  const pendingWriteOffs = writeOffs.filter(w => w.status === 'PENDING');

  return (
    <div className="p-8 min-h-screen flex flex-col bg-gray-50 print:p-0 print:bg-white">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-600" />}
          <span className="text-sm font-bold">{notification.text}</span>
        </div>
      )}

      {/* Standardized Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-[#021124] tracking-tight">Loans & Repayments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage repayment allocations, uncollectible write-offs, and overpayments.</p>
        </div>
        <button 
          onClick={loadData} disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#021124] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Sync Ledger
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 flex-shrink-0">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Landmark size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Loan Capital</p>
            <p className="text-2xl font-black text-[#021124]">₱{loanBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Activity size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Repayments</p>
            <p className="text-2xl font-black text-[#021124]">₱{totalRepaymentsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${
          (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
             (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}><AlertCircle size={24} /></div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${
              (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'text-red-700' : 'text-gray-500'
            }`}>Pending Approvals</p>
            <p className={`text-2xl font-black ${
              (pendingWriteOffs.length + pendingOverpayments.length) > 0 ? 'text-red-700' : 'text-[#021124]'
            }`}>{(pendingWriteOffs.length + pendingOverpayments.length)} Items</p>
          </div>
        </div>
      </div>

      {/* Clean Overpayments Alert Banner */}
      {pendingOverpayments.length > 0 && (
        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className="text-orange-600" />
            <h4 className="font-bold text-orange-900">Overpayments Action Required</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOverpayments.map(rep => (
              <div key={rep.id} className="bg-white border border-orange-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-bold text-gray-600 mr-2 uppercase">{rep.loanReference}</span>
                  <span className="font-bold text-gray-900 text-sm">{rep.memberName}</span>
                  <div className="text-[11px] text-gray-500 font-medium mt-1">
                    Excess: <span className="text-orange-600 font-bold">₱{rep.overpaymentAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => resolveOverpayment(rep.id, 'ADVANCE_CREDIT')} disabled={actioning !== null} className="px-3 py-1.5 bg-[#021124] hover:bg-black text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50">
                    Apply Credit
                  </button>
                  <button onClick={() => resolveOverpayment(rep.id, 'REFUND')} disabled={actioning !== null} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-[#021124] rounded-md text-xs font-bold transition-colors disabled:opacity-50">
                    Refund
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs matching Dues page */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button onClick={() => setActiveTab('repayments')} className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'repayments' ? 'bg-white text-[#021124] border-t border-x border-gray-200 shadow-[0_2px_0_white] relative translate-y-px' : 'text-gray-500 hover:bg-gray-100'}`}>
          <FileText size={16} /> Repayment Ledger
        </button>
        <button onClick={() => setActiveTab('writeoffs')} className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'writeoffs' ? 'bg-white text-[#021124] border-t border-x border-gray-200 shadow-[0_2px_0_white] relative translate-y-px' : 'text-gray-500 hover:bg-gray-100'}`}>
          <ShieldCheck size={16} /> Write-Off Workflow
          {pendingWriteOffs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingWriteOffs.length}</span>}
        </button>
        <button onClick={() => setActiveTab('simulator')} className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'simulator' ? 'bg-white text-[#021124] border-t border-x border-gray-200 shadow-[0_2px_0_white] relative translate-y-px' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Terminal size={16} /> MS Webhook Simulator
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        
        {/* TAB 1: REPAYMENT LEDGER */}
        {activeTab === 'repayments' && (
          <div className="w-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Search Filter for Per-Loan View */}
            <div className="bg-white p-4 border-b border-gray-100 flex gap-4 items-center">
              <div className="flex-1 max-w-sm relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" placeholder="Search by Loan Ref or Member Name..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#021124] outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-widest font-bold sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Transaction Date</th>
                    <th className="px-6 py-4">Loan Reference</th>
                    <th className="px-6 py-4">Member Name</th>
                    <th className="px-6 py-4 text-right">Amount Remitted</th>
                    <th className="px-6 py-4 text-right">Ledger Split (Principal / Fee)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRepayments.length > 0 ? filteredRepayments.map((rep) => (
                    <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {new Date(rep.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600 font-mono text-xs">{rep.loanReference}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 block">{rep.memberName}</span>
                        <span className="text-[10px] text-gray-400">{rep.paymentMethod}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        ₱{rep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <span className="text-gray-900 font-bold">₱{rep.principalAmount.toLocaleString()}</span>
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-orange-600 font-bold">₱{rep.serviceFeeAmount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded uppercase border ${
                          rep.status === 'PROCESSED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {rep.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">No repayment records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: WRITE-OFF WORKFLOWS */}
        {activeTab === 'writeoffs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 self-start">
              <h3 className="text-base font-bold text-[#021124] mb-4">Request Loan Write-Off</h3>
              <form onSubmit={requestWriteOff} className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member ID</label>
                  <input type="text" value={writeOffForm.memberId} onChange={(e) => setWriteOffForm({...writeOffForm, memberId: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#021124]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member Name</label>
                  <input type="text" value={writeOffForm.memberName} onChange={(e) => setWriteOffForm({...writeOffForm, memberName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#021124]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loan Ref ID</label>
                  <input type="text" value={writeOffForm.loanReference} onChange={(e) => setWriteOffForm({...writeOffForm, loanReference: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#021124] font-mono" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount (₱)</label>
                  <input type="number" value={writeOffForm.amount} onChange={(e) => setWriteOffForm({...writeOffForm, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#021124] font-mono font-bold text-red-600" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Justification Reason</label>
                  <textarea value={writeOffForm.reason} onChange={(e) => setWriteOffForm({...writeOffForm, reason: e.target.value})} rows={3} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#021124] resize-none" required />
                </div>
                <button type="submit" className="w-full bg-[#021124] hover:bg-black text-white py-2.5 rounded-lg font-bold transition-colors">File Request</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-4 py-4">Loan Ref</th>
                      <th className="px-4 py-4">Member Name</th>
                      <th className="px-4 py-4 text-right">Amount</th>
                      <th className="px-4 py-4">Justification</th>
                      <th className="px-4 py-4 text-center">Status</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {writeOffs.length > 0 ? writeOffs.map((wo) => (
                      <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-bold text-red-600 font-mono text-xs">{wo.loanReference}</td>
                        <td className="px-4 py-4 font-bold text-gray-900">{wo.memberName}</td>
                        <td className="px-4 py-4 text-right font-black text-gray-900">₱{wo.amount.toLocaleString()}</td>
                        <td className="px-4 py-4 max-w-[150px] truncate text-xs text-gray-600" title={wo.reason}>{wo.reason}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                            wo.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                            wo.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>{wo.status}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {wo.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => processWriteOff(wo.id, 'APPROVED')} disabled={actioning !== null} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">Approve</button>
                              <button onClick={() => processWriteOff(wo.id, 'REJECTED')} disabled={actioning !== null} className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">Reject</button>
                            </div>
                          ) : <span className="text-xs text-gray-400 italic">Resolved</span>}
                        </td>
                      </tr>
                    )) : <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No write-off requests found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-lg font-bold text-[#021124] flex items-center gap-2 mb-6"><Terminal size={18} className="text-purple-600" /> Webhook Simulator</h2>
            <form onSubmit={triggerRepaymentWebhook} className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loan Reference ID</label>
                  <input type="text" name="loanReference" value={simulatorForm.loanReference} onChange={handleSimFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none font-mono" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount (₱)</label>
                  <input type="number" name="amount" value={simulatorForm.amount} onChange={handleSimFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none font-mono font-bold text-[#021124]" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member ID</label><input type="text" name="memberId" value={simulatorForm.memberId} onChange={handleSimFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" required /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member Name</label><input type="text" name="memberName" value={simulatorForm.memberName} onChange={handleSimFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" required /></div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mt-2">
                <label className="font-bold text-xs text-gray-700 flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={simulatorForm.autoSplit} onChange={toggleAutoSplit} className="rounded" /> Auto-calculate splits (95% Principal / 5% Fee)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Principal (₱)</label><input type="number" name="principalAmount" value={simulatorForm.principalAmount} onChange={handleSimFormChange} disabled={simulatorForm.autoSplit} className="w-full p-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-100" /></div>
                  <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Service Fee (₱)</label><input type="number" name="serviceFeeAmount" value={simulatorForm.serviceFeeAmount} onChange={handleSimFormChange} disabled={simulatorForm.autoSplit} className="w-full p-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-100" /></div>
                </div>
              </div>
              <button type="submit" disabled={simulating} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {simulating ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Trigger Webhook Event
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}