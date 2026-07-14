"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { 
  Plus, Search, Filter, FileText, Clock, CheckCircle2, Ban, 
  Eye, X, Landmark, CreditCard, AlertTriangle, Loader2, Activity
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

// Types
interface AssistanceRequest {
  id: string;
  type: string;
  amount: number;
  reason: string;
  paymentMethod: string;
  paymentDetails: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  processedAt?: string;
  referenceNumber?: string;
  rejectedReason?: string;
}

export default function MemberRequestsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user?.name || "Ven"; 
  const currentUserId = (session?.user as any)?.id || "BDOEA-001";

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);

  // Global Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // New Request Form State
  const [formData, setFormData] = useState({
    type: 'EMERGENCY_ASSISTANCE',
    amount: '',
    reason: '',
    paymentMethod: 'BANK_TRANSFER',
    paymentDetails: ''
  });

  // --- MOCK DATA (Frontend State for Demonstration) ---
  const [requests, setRequests] = useState<AssistanceRequest[]>([
    {
      id: 'REQ-2026-089',
      type: 'EMERGENCY_ASSISTANCE',
      amount: 15000,
      reason: 'Typhoon damage repair assistance.',
      paymentMethod: 'GCASH',
      paymentDetails: '09171234567',
      status: 'COMPLETED',
      createdAt: '2026-06-15T08:30:00Z',
      processedAt: '2026-06-18T14:20:00Z',
      referenceNumber: '000123984712'
    },
    {
      id: 'REQ-2026-102',
      type: 'REFUND',
      amount: 500,
      reason: 'Double deduction of union dues last month.',
      paymentMethod: 'BANK_TRANSFER',
      paymentDetails: 'BDO 00123456789',
      status: 'PENDING',
      createdAt: '2026-06-25T10:15:00Z'
    },
    {
      id: 'REQ-2026-045',
      type: 'MEMBER_BENEFIT',
      amount: 5000,
      reason: 'Annual medical reimbursement claim.',
      paymentMethod: 'CASH',
      paymentDetails: 'Pick up at office',
      status: 'REJECTED',
      createdAt: '2026-05-10T09:00:00Z',
      processedAt: '2026-05-12T11:00:00Z',
      rejectedReason: 'Missing attached official receipts for medical expenses.'
    }
  ]);

  // --- DERIVED DATA & FILTERS ---
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchSearch = req.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.type.replace('_', ' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'ALL' ? true : req.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, filterStatus]);

  const pendingCount = requests.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
  const totalReceived = requests.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + r.amount, 0);

  // --- HANDLERS ---
  const handleNewRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newRequest: AssistanceRequest = {
        id: `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
        type: formData.type,
        amount: Number(formData.amount),
        reason: formData.reason,
        paymentMethod: formData.paymentMethod,
        paymentDetails: formData.paymentMethod === 'CASH' || formData.paymentMethod === 'CHECK' ? 'Pick up at BDOEA Office' : formData.paymentDetails,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      setRequests([newRequest, ...requests]);
      setIsSubmitting(false);
      setIsRequestModalOpen(false);
      
      setFormData({ type: 'EMERGENCY_ASSISTANCE', amount: '', reason: '', paymentMethod: 'BANK_TRANSFER', paymentDetails: '' });
      
      setActionModal({ 
        isOpen: true, 
        title: 'Request Submitted', 
        message: '', 
        status: 'success', 
        resultMsg: `Your request (${newRequest.id}) has been forwarded to the Treasurer for review.` 
      });
    }, 1200);
  };

  // UI Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12}/> Released</span>;
      case 'REJECTED': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-700 border border-red-200"><Ban size={12}/> Rejected</span>;
      case 'UNDER_REVIEW': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200"><Search size={12}/> Reviewing</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"><Clock size={12}/> Pending</span>;
    }
  };

  const formatType = (type: string) => type.replace('_', ' ');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      
      <ActionModal 
        isOpen={actionModal.isOpen} title={actionModal.title} message={actionModal.message} status={actionModal.status} resultMsg={actionModal.resultMsg}
        onConfirm={() => setActionModal({ ...actionModal, isOpen: false })} onClose={() => setActionModal({ ...actionModal, isOpen: false })} confirmText="Close"
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1400px] w-full mx-auto animate-fade-in">
        
        {/* Right-Aligned Action Button with proper spacing */}
        <div className="flex justify-end mb-6 w-full">
          <button 
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-7 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all"
          >
            <Plus size={18} /> New Request
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><FileText size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total Requests</p>
              <p className="text-2xl font-black text-[#04152d]">{requests.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Pending Action</p>
              <p className="text-2xl font-black text-[#04152d]">{pendingCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Landmark size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Total Received</p>
              <p className="text-2xl font-black text-[#04152d]">₱{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Tracker Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
          
          <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
            <div className="flex-1 min-w-[250px] max-w-md relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" placeholder="Search by Reference ID or Type..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 focus:border-blue-500 outline-none font-bold text-[#04152d] transition-all shadow-sm"
              />
            </div>
            
            <div className="relative inline-block w-full sm:w-auto min-w-[180px]">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select 
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} 
                className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-white border border-gray-200 focus:border-blue-500 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending / Review</option>
                <option value="COMPLETED">Released</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-white shadow-[0_1px_0_rgba(229,231,235,1)]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Submitted</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map((req) => (
                  <tr 
                    key={req.id} 
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#04152d] font-mono">{req.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-700">{formatType(req.type)}</td>
                    <td className="px-6 py-4 text-sm font-black text-[#04152d] text-right">₱{req.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button className="inline-flex items-center gap-2 bg-gray-50 text-gray-600 group-hover:bg-[#04152d] group-hover:text-white border border-gray-200 font-bold py-1.5 px-4 rounded-lg text-xs transition-all shadow-sm">
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400 font-medium">No requests match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- NEW REQUEST MODAL (Fixed Scroll & Height) --- */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 sm:p-6">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-white/80 flex flex-col max-h-[90vh] animate-pop">
            
            {/* Header (Fixed) */}
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 bg-[#f8faff] rounded-t-2xl">
              <div>
                <h3 className="font-black text-xl text-[#04152d] tracking-tight">Assistance Request</h3>
                <p className="text-xs font-medium text-gray-500 mt-1">Submit a new claim or request to the Treasurer.</p>
              </div>
              <button onClick={() => !isSubmitting && setIsRequestModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form onSubmit={handleNewRequestSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Request Category</label>
                    <select 
                      value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} 
                      className="w-full rounded-xl px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-[#04152d] cursor-pointer"
                    >
                      <option value="EMERGENCY_ASSISTANCE">Emergency / Calamity Assistance</option>
                      <option value="DEATH_ASSISTANCE">Death Assistance</option>
                      <option value="MEMBER_BENEFIT">Union Member Benefit / Claim</option>
                      <option value="REFUND">Refund Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Requested Amount (PHP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                      <input 
                        required type="number" min="1" step="0.01" placeholder="0.00"
                        value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full rounded-xl pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-[#04152d]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Reason / Justification</label>
                  <textarea 
                    required rows={3} placeholder="Please provide details about your request..."
                    value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-600 outline-none transition-all font-medium text-[#04152d] resize-none"
                  />
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5"><CreditCard size={12}/> Disbursement Method</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {['BANK_TRANSFER', 'GCASH', 'CASH', 'CHECK'].map(method => (
                      <button
                        key={method} type="button"
                        onClick={() => setFormData({...formData, paymentMethod: method, paymentDetails: ''})}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${formData.paymentMethod === method ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'GCASH') && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">
                        {formData.paymentMethod === 'GCASH' ? 'GCash Number & Name' : 'Bank Name & Account Number'} *
                      </label>
                      <input 
                        required type="text" placeholder={formData.paymentMethod === 'GCASH' ? "e.g., 09171234567 - Juan Dela Cruz" : "e.g., BDO 00123456789 - Juan Dela Cruz"}
                        value={formData.paymentDetails} onChange={(e) => setFormData({...formData, paymentDetails: e.target.value})}
                        className="w-full rounded-xl px-4 py-3 text-sm bg-blue-50/50 border border-blue-200 focus:border-blue-600 outline-none transition-all font-mono font-bold text-[#04152d]"
                      />
                    </div>
                  )}
                  {(formData.paymentMethod === 'CASH' || formData.paymentMethod === 'CHECK') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                      <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 font-medium leading-relaxed">You will be required to visit the BDOEA Office to sign the physical voucher to receive your {formData.paymentMethod.toLowerCase()}.</p>
                    </div>
                  )}
                </div>

                <div className="pt-8 flex justify-end gap-4 mt-auto">
                  <button type="button" onClick={() => setIsRequestModalOpen(false)} disabled={isSubmitting} className="font-bold text-sm text-gray-500 hover:text-gray-800 px-4 py-2 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-8 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all disabled:opacity-50">
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* --- VIEW DETAILS / TRACKER MODAL (Fixed Scroll & Height) --- */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 sm:p-6">
          <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl border border-white/80 flex flex-col max-h-[90vh] animate-pop">
            
            {/* Header (Fixed) */}
            <div className="shrink-0 p-6 md:p-8 border-b border-gray-100 flex justify-between items-start bg-[#f8faff] rounded-t-[24px]">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 px-2 py-1 rounded mb-2 inline-block">Ref: {selectedRequest.id}</span>
                <h3 className="font-black text-2xl text-[#04152d]">{formatType(selectedRequest.type)}</h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-gray-400 hover:text-[#04152d] bg-white rounded-full shadow-sm border border-gray-100 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              
              {/* Top Details */}
              <div className="flex justify-between items-end pb-6 border-b border-gray-100">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requested Amount</p>
                  <p className="text-4xl font-black text-[#04152d]">₱{selectedRequest.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Disbursement</p>
                  <p className="text-sm font-bold text-[#04152d] uppercase">{selectedRequest.paymentMethod.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reason / Justification</p>
                 <p className="text-base text-gray-700 font-medium bg-gray-50 p-5 rounded-xl border border-gray-100 leading-relaxed">{selectedRequest.reason}</p>
              </div>

              {/* APPLICATION TRACKER (The "Story") */}
              <div>
                <p className="text-[10px] font-black text-[#04152d] uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={14}/> Application Status</p>
                
                <div className="relative pl-5 space-y-8 before:absolute before:inset-0 before:ml-[27px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:to-transparent">
                  
                  {/* Step 1: Submitted */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white bg-blue-500 text-white shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#04152d] text-sm">Request Submitted</span>
                      </div>
                      <span className="text-xs font-mono text-gray-400">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Step 2: Resolution (Completed/Rejected/Pending) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${
                      selectedRequest.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 
                      selectedRequest.status === 'REJECTED' ? 'bg-red-500 text-white' : 
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {selectedRequest.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : selectedRequest.status === 'REJECTED' ? <Ban size={16} /> : <Clock size={16} />}
                    </div>
                    
                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      {selectedRequest.status === 'COMPLETED' ? (
                        <>
                          <div className="font-bold text-emerald-700 text-sm mb-1">Disbursement Released</div>
                          <span className="text-xs font-mono text-gray-400 block mb-3">{new Date(selectedRequest.processedAt || '').toLocaleString()}</span>
                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                             <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">Treasurer Ref No.</span>
                             <span className="text-sm font-mono font-bold text-[#04152d]">{selectedRequest.referenceNumber}</span>
                          </div>
                        </>
                      ) : selectedRequest.status === 'REJECTED' ? (
                        <>
                          <div className="font-bold text-red-700 text-sm mb-1">Request Rejected</div>
                          <span className="text-xs font-mono text-gray-400 block mb-3">{new Date(selectedRequest.processedAt || '').toLocaleString()}</span>
                          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                             <span className="text-[10px] font-black text-red-800 uppercase tracking-widest block mb-1">Reason from Treasurer</span>
                             <span className="text-sm font-medium text-red-900 leading-tight">{selectedRequest.rejectedReason}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-gray-500 text-sm mb-1">Pending Treasurer Review</div>
                          <span className="text-xs text-gray-400 block">Waiting for system validation and fund allocation.</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}