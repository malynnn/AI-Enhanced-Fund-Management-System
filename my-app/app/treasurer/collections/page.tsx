"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, AlertTriangle, CheckCircle2, Send, 
  FileText, BarChart3, Printer, Plus, X, Loader, 
  Banknote, Wallet, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';

const standardDuesAmount = 500.00;

export default function CollectionsPage() {
  const [collectionRecords, setCollectionRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form & Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Unified Review Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'verify';
    recordId?: string | number;
    data: { memberId: string; memberName: string; collectionType: string; amount: string | number; referenceNumber: string; depositFund: string; method: string; }
  }>({ isOpen: false, mode: 'create', data: { memberId: '', memberName: '', collectionType: '', amount: '', referenceNumber: '', depositFund: '', method: '' } });

  const [formData, setFormData] = useState({
    memberId: '', memberName: '', collectionType: 'DUES', amount: '', method: 'BANK_TRANSFER', referenceNumber: '', depositFund: 'GENERAL_FUND'
  });

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      let res = await fetch(`${gatewayUrl}/api/finance/collections`).catch(() => null);
      if (!res?.ok) res = await fetch(`${gatewayUrl}/api/finance/dues`).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        const formatted = data.map((d: any) => ({
          ...d, 
          amountPaid: Number(d.amountPaid), 
          collectionType: d.collectionType || 'DUES',
          month: d.month || new Date(d.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }));
        // Sort newest first
        formatted.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCollectionRecords(formatted);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const [activeTab, setActiveTab] = useState<'ledger' | 'report'>('ledger');
  
  // Filtering & Search Autocomplete States
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Global Success/Error Modal
  const [modal, setModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Reset pagination when any filter changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, statusFilter]);

  // Search Autocomplete Logic
  const searchSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    
    // Map used to ensure we only show unique members in the dropdown
    const memberMap = new Map();
    collectionRecords.forEach(rec => {
      if ((rec.name?.toLowerCase().includes(term) || rec.memberId?.toLowerCase().includes(term)) && rec.memberId) {
        if (!memberMap.has(rec.memberId)) {
          memberMap.set(rec.memberId, { name: rec.name, memberId: rec.memberId });
        }
      }
    });
    
    // Return max 5 suggestions
    return Array.from(memberMap.values()).slice(0, 5);
  }, [collectionRecords, searchTerm]);

  // Combined Filtering Logic
  const filteredRecords = useMemo(() => {
    return collectionRecords.filter(record => {
      const matchesSearch = record.name?.toLowerCase().includes(searchTerm.toLowerCase()) || record.memberId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || record.collectionType === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [collectionRecords, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Detailed report calculations based on filtered records
  const reportDetails = useMemo(() => {
    let totalCollected = 0;
    let totalConfirmed = 0;
    
    const breakdown = {
      GENERAL_FUND: 0,
      LOAN_FUND: 0,
      UNION_FUND: 0,
    };

    filteredRecords.forEach((rec) => {
      if (rec.status === 'CONFIRMED') {
        totalConfirmed += 1;
        totalCollected += Number(rec.amountPaid || 0);
        
        // Fund Breakdown
        const fund = rec.depositFund || 'GENERAL_FUND';
        if (breakdown[fund as keyof typeof breakdown] !== undefined) {
          breakdown[fund as keyof typeof breakdown] += Number(rec.amountPaid || 0);
        }
      }
    });

    return { 
      totalCollected, 
      totalConfirmed, 
      count: filteredRecords.length,
      breakdown
    };
  }, [filteredRecords]);

  // --- HANDLERS ---
  const handleMemberIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value.toUpperCase().trim();
    const existingRecord = collectionRecords.find(r => r.memberId === id);
    let autoName = '';
    if (existingRecord) {
      autoName = existingRecord.name;
    } else if (id.length >= 7) {
      autoName = 'Member Not Found';
    }
    setFormData(prev => ({ ...prev, memberId: id, memberName: autoName }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    let autoFund = 'GENERAL_FUND';
    if (type === 'LOAN_PAYMENT') autoFund = 'LOAN_FUND';
    if (type === 'CONTRIBUTION') autoFund = 'UNION_FUND';
    setFormData(prev => ({ ...prev, collectionType: type, depositFund: autoFund }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    if (value) {
      const splitValue = value.split('.');
      splitValue[0] = splitValue[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (splitValue[1]) splitValue[1] = splitValue[1].substring(0, 2);
      value = splitValue.join('.');
    }
    setFormData(prev => ({ ...prev, amount: value }));
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormData({
      memberId: '', memberName: '', collectionType: 'DUES', amount: '', method: 'BANK_TRANSFER', referenceNumber: '', depositFund: 'GENERAL_FUND'
    });
  };

  const triggerCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewModal({
      isOpen: true,
      mode: 'create',
      data: { ...formData }
    });
  };

  const triggerVerifyReview = (rec: any) => {
    setReviewModal({
      isOpen: true,
      mode: 'verify',
      recordId: rec.id,
      data: {
        memberId: rec.memberId,
        memberName: rec.name,
        collectionType: rec.collectionType,
        amount: rec.amountPaid,
        referenceNumber: rec.referenceNumber || 'N/A',
        depositFund: rec.depositFund || 'GENERAL_FUND',
        method: rec.method
      }
    });
  };

  const processReviewSubmit = async () => {
    setIsSubmitting(true);
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
    
    try {
      if (reviewModal.mode === 'create') {
        const numericAmount = parseFloat(reviewModal.data.amount.toString().replace(/,/g, ''));
        const payload = { ...reviewModal.data, amount: numericAmount };
        
        let res = await fetch(`${gatewayUrl}/api/finance/collections`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.ok) res = await fetch(`${gatewayUrl}/api/finance/dues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);

        if (res?.ok) {
          setReviewModal(prev => ({...prev, isOpen: false}));
          closeAddModal();
          await fetchCollections();
          setModal({ isOpen: true, title: 'Transaction Confirmed', message: '', status: 'success', resultMsg: 'Collection has been successfully mapped to the ledger.' });
        } else throw new Error('Failed to record collection');
      
      } else if (reviewModal.mode === 'verify') {
        const recordId = reviewModal.recordId;
        let res = await fetch(`${gatewayUrl}/api/finance/collections/${recordId}/confirm`, { method: 'PATCH' }).catch(() => null);
        if (!res?.ok) res = await fetch(`${gatewayUrl}/api/finance/dues/${recordId}/confirm`, { method: 'PATCH' }).catch(() => null);

        if (res?.ok) {
          setReviewModal(prev => ({...prev, isOpen: false}));
          await fetchCollections();
          setModal({ isOpen: true, title: 'Ledger Updated', message: '', status: 'success', resultMsg: 'Collection confirmed and posted successfully!' });
        } else throw new Error('Error confirming record.');
      }
    } catch (err: any) {
      setReviewModal(prev => ({...prev, isOpen: false}));
      setModal({ isOpen: true, title: 'Error', message: '', status: 'error', resultMsg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background-color: white !important;
          }
          @page { margin: 15mm; }
        }
      `}</style>

      <div className="flex flex-col min-h-screen bg-transparent print:bg-white print:block print:h-auto print:overflow-visible relative">
        
        <ActionModal 
          isOpen={modal.isOpen} title={modal.title} message={modal.message} status={modal.status} resultMsg={modal.resultMsg}
          onConfirm={() => setModal({ ...modal, isOpen: false })} onClose={() => setModal({ ...modal, isOpen: false })} confirmText="Close"
        />

        {/* REVIEW & VERIFY MODAL */}
        {reviewModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 print:hidden">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-pop overflow-hidden flex flex-col">
              <div className="bg-[#04152d] p-5 text-center">
                  <h3 className="font-black text-white text-lg tracking-wide">Review Transaction Details</h3>
              </div>
              <div className="p-6 space-y-5">
                  <div className="flex justify-between items-start pb-4 border-b border-gray-100 mt-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">Member</span>
                    <div className="text-right">
                      <span className="text-[15px] font-black text-[#04152d] block">{reviewModal.data.memberName}</span>
                      <span className="text-[11px] font-mono font-bold text-gray-400 mt-0.5 block">{reviewModal.data.memberId}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Category</span>
                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">{reviewModal.data.collectionType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Target Fund</span>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider">{reviewModal.data.depositFund.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount</span>
                    <span className="text-2xl font-black text-[#04152d]">₱{Number(reviewModal.data.amount.toString().replace(/,/g, '')).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Reference</span>
                    <span className="text-[13px] font-black font-mono text-gray-600">{reviewModal.data.referenceNumber || 'N/A'}</span>
                  </div>
              </div>
              <div className="p-6 pt-4 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                  <button disabled={isSubmitting} onClick={() => setReviewModal(prev => ({...prev, isOpen: false}))} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold py-3.5 rounded-xl shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)] transition-all">
                    {reviewModal.mode === 'create' ? 'Edit' : 'Cancel'}
                  </button>
                  <button disabled={isSubmitting} onClick={processReviewSubmit} className="flex-1 bg-[#04152d] text-white font-bold py-3.5 rounded-xl shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader size={16} className="animate-spin" /> : 'Confirm & Post'}
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* COLLECTION FORM MODAL */}
        {isAddModalOpen && !reviewModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 print:hidden">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-white/80 overflow-hidden animate-pop flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
                <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2"><Banknote size={20} /> Record New Collection</h3>
                <button onClick={closeAddModal} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={triggerCreateReview} className="p-6 flex flex-col gap-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Category *</label>
                    <select required value={formData.collectionType} onChange={handleTypeChange} className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-blue-200 focus:border-blue-600 outline-none font-black text-[#04152d] cursor-pointer">
                      <option value="DUES">Regular Dues</option>
                      <option value="LOAN_PAYMENT">Loan Repayment</option>
                      <option value="CONTRIBUTION">Contribution</option>
                    </select>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Wallet size={12}/> Target Fund (Auto)</label>
                    <p className="text-[15px] font-black text-emerald-900 tracking-tight">
                      {formData.depositFund.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Member ID *</label>
                    <input type="text" required placeholder="e.g. M-2021-022" value={formData.memberId} onChange={handleMemberIdChange} className="w-full rounded-xl px-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-mono font-bold text-[#04152d] uppercase" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Amount (₱) *</label>
                    <input type="text" required value={formData.amount} onChange={handleAmountChange} className="w-full rounded-xl px-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-emerald-500 outline-none font-mono font-black text-emerald-600 text-lg" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Member Name (Auto-filled) *</label>
                  <input type="text" required readOnly placeholder="Type ID to fetch name..." value={formData.memberName} className="w-full rounded-xl px-4 py-3 text-sm border-[1.5px] border-gray-200 bg-gray-50 outline-none font-bold text-[#04152d] cursor-not-allowed" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Payment Method *</label>
                    <select required value={formData.method} onChange={(e) => setFormData({...formData, method: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d] cursor-pointer">
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="SALARY_DEDUCTION">Salary Deduction</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Reference Number *</label>
                    <input type="text" required placeholder="e.g., Ref-12345 or N/A" value={formData.referenceNumber} onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-mono font-medium text-[#04152d]" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-2">
                  <button type="button" onClick={closeAddModal} className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)] transition-all">Cancel</button>
                  <button type="submit" disabled={!formData.amount || !formData.memberName || formData.memberName === 'Member Not Found'} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all disabled:opacity-50">
                    Review Details
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="print:hidden">
          <Header />
        </div>

        <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-none print:block print:h-auto print:overflow-visible print:space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 print:hidden mt-2">
            <div className="flex gap-8 border-b-2 border-gray-200/60 w-full sm:w-auto">
              <button onClick={() => setActiveTab('ledger')} className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${activeTab === 'ledger' ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' : 'text-gray-400 hover:text-[#04152d]'}`}>
                <FileText size={18} /> Collection Ledger
              </button>
              <button onClick={() => setActiveTab('report')} className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${activeTab === 'report' ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' : 'text-gray-400 hover:text-[#04152d]'}`}>
                <BarChart3 size={18} /> Summary Report
              </button>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'ledger' && (
                <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all">
                  <Plus size={16} /> Add Collection
                </button>
              )}
              {activeTab === 'report' && (
                <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#04152d] text-[#04152d] font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all hover:bg-gray-50">
                  <Printer size={16} /> Print Report
                </button>
              )}
            </div>
          </div>

          {/* Global Filters with for Autocomplete MouseDown */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-white/80 flex flex-col md:flex-row gap-4 items-center print:hidden">
            <div className="flex-1 w-full relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input 
                type="text" 
                placeholder="Search Member Name or ID..." 
                value={searchTerm} 
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
                className="w-full rounded-xl pl-11 pr-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d] relative z-0" 
              />
              {/* Search Dropdown Results */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                  {searchSuggestions.map((suggestion) => (
                    <li 
                      key={suggestion.memberId}
                      className="px-4 py-3 hover:bg-[#e8edf8]/60 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault(); // FIX: Prevents input blur before click registers
                        setSearchTerm(suggestion.name); // FIX: Populates the name instead of the ID
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-bold text-[#04152d] text-sm truncate pr-4">{suggestion.name}</span>
                      <span className="font-mono text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{suggestion.memberId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="w-full md:w-56 flex items-center gap-2 bg-white rounded-xl border-[1.5px] border-[#dde3ee] px-4 overflow-hidden focus-within:border-[#04152d] transition-colors">
              <Filter size={16} className="text-gray-400" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full py-3 text-sm outline-none font-bold text-[#04152d] bg-transparent cursor-pointer">
                <option value="ALL">All Categories</option>
                <option value="DUES">Regular Dues</option>
                <option value="LOAN_PAYMENT">Loan Repayment</option>
                <option value="CONTRIBUTION">Contribution</option>
              </select>
            </div>

            <div className="w-full md:w-56 flex items-center gap-2 bg-white rounded-xl border-[1.5px] border-[#dde3ee] px-4 overflow-hidden focus-within:border-[#04152d] transition-colors">
              <Filter size={16} className="text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full py-3 text-sm outline-none font-bold text-[#04152d] bg-transparent cursor-pointer">
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          {activeTab === 'ledger' && (
            <div className="flex flex-col gap-6 animate-fade-in print:hidden">
              <div className="w-full bg-white rounded-2xl shadow-lg border border-white/80 overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto w-full flex-1">
                  <table className="w-full text-left whitespace-nowrap min-w-[1200px]">
                    <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Transaction ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Member ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Member Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Month Covered</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-right">Amount Paid</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Fund to Credit</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {isLoading ? (
                        <tr><td colSpan={9} className="px-6 py-16 text-center text-gray-400 font-medium text-left">Loading collections...</td></tr>
                      ) : paginatedRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#e8edf8]/60 transition-colors">
                          <td className="px-6 py-4 text-sm text-left font-mono font-bold text-gray-500">
                            {rec.referenceNumber && rec.referenceNumber !== 'N/A' ? rec.referenceNumber : (rec.id ? String(rec.id).substring(0,8).toUpperCase() : 'N/A')}
                          </td>
                          <td className="px-6 py-4 text-sm text-left font-mono font-bold text-[#04152d]">
                            {rec.memberId}
                          </td>
                          <td className="px-6 py-4 text-sm text-left font-bold text-[#04152d]">
                            {rec.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-left text-gray-600 font-medium">
                            {rec.month}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-lg text-[#04152d]">
                            ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-sm text-left font-bold text-gray-500 text-[11px] uppercase tracking-widest">
                            {rec.collectionType?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 text-sm text-left">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {rec.depositFund?.replace('_', ' ') || 'GENERAL FUND'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-left">
                            {rec.status === 'CONFIRMED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12}/> Posted</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle size={12}/> Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-left">
                            {rec.status === 'PENDING' ? (
                              <button onClick={() => triggerVerifyReview(rec)} className="inline-flex items-center gap-2 bg-[#facc15] text-[#04152d] font-black py-2 px-4 rounded-lg text-xs shadow-[0_4px_0_rgba(202,138,4,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(202,138,4,1)] transition-all hover:bg-[#eab308]"><Send size={12} /> Verify</button>
                            ) : <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ledger Updated</span>}
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && !isLoading && (
                        <tr><td colSpan={9} className="px-6 py-16 text-center text-gray-400 font-medium text-left">No records found matching your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && !isLoading && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Report Print*/}
          {activeTab === 'report' && (
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-white/80 w-full max-w-5xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-full print:block print:h-auto print:overflow-visible">
               <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 print:border-b print:pb-4 print:mb-6 print:block">
                <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-6 mx-auto print:h-10 print:mb-2" />
                <h2 className="text-lg font-black bg-[#04152d] text-white inline-block px-10 py-3 rounded-full uppercase tracking-widest print:text-sm print:py-1.5 print:px-6 print:mb-0">Collections Summary Report</h2>
                
                {/* Display active filters for print context */}
                <p className="mt-5 text-[11px] font-black text-gray-500 uppercase tracking-widest print:mt-3 print:text-[9px]">
                  Filters Applied: <span className="text-[#04152d]">{categoryFilter !== 'ALL' ? categoryFilter.replace('_', ' ') : 'All Categories'}</span> | <span className="text-[#04152d]">{statusFilter !== 'ALL' ? statusFilter : 'All Statuses'}</span>
                  {searchTerm && <span> | Search: <span className="text-[#04152d]">{searchTerm}</span></span>}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 print:grid-cols-3 print:gap-4 print:mb-6">
                <div className="p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center bg-white print:p-3 print:shadow-none print:border print:rounded-lg">
                  <p className="text-[10px] font-black text-[#04152d] uppercase tracking-widest mb-2 print:text-[8px] print:mb-1">Total Amount Collected</p>
                  <p className="text-3xl font-black text-emerald-600 print:text-xl">₱{reportDetails.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center bg-white print:p-3 print:shadow-none print:border print:rounded-lg">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 print:text-[8px] print:mb-1">Total Confirmed Records</p>
                  <p className="text-3xl font-black text-blue-600 print:text-xl">{reportDetails.totalConfirmed}</p>
                </div>
                <div className="p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center bg-white print:p-3 print:shadow-none print:border print:rounded-lg">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 print:text-[8px] print:mb-1">Total Record Count</p>
                  <p className="text-3xl font-black text-[#04152d] print:text-xl">{reportDetails.count}</p>
                </div>
              </div>

              <div className="mb-10 print:mb-6 animate-fade-in">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2 print:text-[10px] print:mb-2">Fund Allocation Breakdown <span className="text-[10px] lowercase normal-case print:text-[8px]">(Confirmed Only)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center print:bg-transparent print:p-2 print:rounded-md">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest print:text-[9px]">General Fund</span>
                    <span className="text-lg font-black text-[#04152d] print:text-sm">₱{reportDetails.breakdown.GENERAL_FUND.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center print:bg-transparent print:p-2 print:rounded-md">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest print:text-[9px]">Loan Fund</span>
                    <span className="text-lg font-black text-[#04152d] print:text-sm">₱{reportDetails.breakdown.LOAN_FUND.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center print:bg-transparent print:p-2 print:rounded-md">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest print:text-[9px]">Union Fund</span>
                    <span className="text-lg font-black text-[#04152d] print:text-sm">₱{reportDetails.breakdown.UNION_FUND.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="animate-fade-in">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2 print:text-[10px] print:mb-2">Included Transactions</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-xl print:overflow-visible print:border-none print:rounded-none">
                  <table className="w-full text-left text-sm whitespace-nowrap print:whitespace-normal print:text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 print:bg-transparent print:border-black print:border-b-2">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest print:py-1 print:px-2 print:text-[8px] print:text-black">Date</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest print:py-1 print:px-2 print:text-[8px] print:text-black">Member Details</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest print:py-1 print:px-2 print:text-[8px] print:text-black">Category</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest print:py-1 print:px-2 print:text-[8px] print:text-black">Status</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right print:py-1 print:px-2 print:text-[8px] print:text-black">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.length > 0 ? filteredRecords.map(rec => (
                        <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors print:break-inside-avoid print:border-b print:border-gray-200">
                          <td className="py-3 px-4 text-xs font-medium text-gray-500 print:py-1.5 print:px-2">{new Date(rec.createdAt || Date.now()).toLocaleDateString()}</td>
                          <td className="py-3 px-4 print:py-1.5 print:px-2">
                            <span className="font-bold text-[#04152d] block">{rec.name}</span>
                            <span className="font-mono text-[10px] font-bold text-gray-400 mt-0.5">{rec.memberId}</span>
                          </td>
                          <td className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest print:py-1.5 print:px-2">{rec.collectionType?.replace('_', ' ')}</td>
                          <td className="py-3 px-4 print:py-1.5 print:px-2">
                            {rec.status === 'CONFIRMED' ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest print:bg-transparent print:p-0">Posted</span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest print:bg-transparent print:p-0">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#04152d] print:py-1.5 print:px-2">₱{Number(rec.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 text-sm font-medium">No records found matching current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  );
}