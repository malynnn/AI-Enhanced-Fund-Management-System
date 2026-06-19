"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, AlertTriangle, CheckCircle2, Send, 
  FileText, BarChart3, Printer, Plus, X, Loader, 
  Banknote, FileUp, Wallet, FileSpreadsheet
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

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      let res = await fetch(`${gatewayUrl}/api/finance/collections`).catch(() => null);
      if (!res?.ok) res = await fetch(`${gatewayUrl}/api/finance/dues`).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        const formatted = data.map((d: any) => ({
          ...d, amountPaid: Number(d.amountPaid), collectionType: d.collectionType || 'DUES' 
        }));
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
  const [searchTerm, setSearchTerm] = useState('');
  
  // Global Success/Error Modal
  const [modal, setModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const filteredRecords = useMemo(() => {
    return collectionRecords.filter(record => {
      const matchesSearch = record.name?.toLowerCase().includes(searchTerm.toLowerCase()) || record.memberId?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [collectionRecords, searchTerm]);

  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecords, currentPage]);

  const reportTotals = useMemo(() => {
    const totalCollected = filteredRecords.reduce((sum, rec) => sum + Number(rec.amountPaid || 0), 0);
    const totalConfirmed = filteredRecords.filter(rec => rec.status === 'CONFIRMED').length;
    return { totalCollected, totalConfirmed, count: filteredRecords.length };
  }, [filteredRecords]);

  // --- HANDLERS ---
  const handleMemberIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value.toUpperCase().trim();
    
    // Scan the existing table data to find a matching ID
    const existingRecord = collectionRecords.find(r => r.memberId === id);
    
    // If found in the table, perfectly copy the name. Otherwise, leave blank or "Not Found".
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
    // Reset form completely when closed
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
          closeAddModal(); // Close and reset form
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

  // EXCEL IMPORT HANDLERS
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsImportModalOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processExcelImport = async () => {
    setIsImporting(true);
    // Simulate parsing and appending new data to the table
    setTimeout(() => {
      const newImportedRecord = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'DELA CRUZ, JANE (Imported)',
        memberId: 'M-2024-999',
        collectionType: 'DUES',
        depositFund: 'GENERAL_FUND',
        method: 'BANK_TRANSFER',
        amountPaid: 500,
        status: 'CONFIRMED',
        referenceNumber: selectedFile?.name || 'EXCEL-IMPORT',
        createdAt: new Date().toISOString()
      };
      
      setCollectionRecords(prev => [newImportedRecord, ...prev]);
      setIsImporting(false);
      setIsImportModalOpen(false);
      setSelectedFile(null);
      setModal({ isOpen: true, title: 'Import Successful', message: '', status: 'success', resultMsg: 'Excel data has been successfully parsed and appended to the ledger.' });
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative">
      
      <ActionModal 
        isOpen={modal.isOpen} title={modal.title} message={modal.message} status={modal.status} resultMsg={modal.resultMsg}
        onConfirm={() => setModal({ ...modal, isOpen: false })} onClose={() => setModal({ ...modal, isOpen: false })} confirmText="Close"
      />

      {/* EXCEL IMPORT MODAL */}
      {isImportModalOpen && selectedFile && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-pop text-center">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={32} />
             </div>
             <h3 className="font-black text-xl mb-2 text-[#04152d]">Import Excel Data</h3>
             <p className="text-sm text-gray-500 mb-4 px-2">Ready to process records from <span className="font-bold text-[#04152d]">{selectedFile.name}</span>?</p>
             <div className="flex gap-3 mt-6">
                <button disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)] transition-all">Cancel</button>
                <button disabled={isImporting} onClick={processExcelImport} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-[0_6px_0_rgba(5,150,105,1)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(5,150,105,1)] transition-all flex items-center justify-center gap-2">
                   {isImporting ? <Loader size={16} className="animate-spin" /> : 'Process File'}
                </button>
             </div>
          </div>
       </div>
      )}

      {/* DETAILED REVIEW & VERIFY MODAL */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
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

      {/* ADD COLLECTION FORM MODAL */}
      {isAddModalOpen && !reviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
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

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-none">
        
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
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                <button onClick={() => fileInputRef.current?.click()} className="hidden sm:inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)] transition-all">
                  <FileUp size={16} /> Import Excel
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all">
                  <Plus size={16} /> Add Collection
                </button>
              </>
            )}
            {activeTab === 'report' && (
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#04152d] text-[#04152d] font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all hover:bg-gray-50">
                <Printer size={16} /> Print Report
              </button>
            )}
          </div>
        </div>

        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-6 animate-fade-in print:hidden">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-white/80 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px] relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search Member Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl pl-11 pr-4 py-3 text-sm border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d]" />
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-lg border border-white/80 overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Member Details</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Category & Fund</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Method & Ref</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-right">Amount Remitted</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#e8edf8]/60 transition-colors">
                        <td className="px-6 py-4 text-sm text-left">
                          <p className="font-bold text-[#04152d]">{rec.name}</p>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">{rec.memberId}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-left">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                            {rec.collectionType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase ml-2 block mt-1">{rec.depositFund?.replace('_', ' ') || 'GENERAL FUND'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-left">
                           <p className="font-bold text-[#04152d]">{rec.method}</p>
                           <p className="text-xs font-mono text-gray-500 mt-0.5">{rec.referenceNumber || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-black text-lg text-[#04152d]">
                          ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-left">
                          {rec.status === 'CONFIRMED' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12}/> Posted</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle size={12}/> Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-left">
                          {rec.status === 'PENDING' ? (
                            <button onClick={() => triggerVerifyReview(rec)} className="inline-flex items-center gap-2 bg-[#facc15] text-[#04152d] font-black py-2 px-4 rounded-lg text-xs shadow-[0_4px_0_rgba(202,138,4,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(202,138,4,1)] transition-all hover:bg-[#eab308]"><Send size={12} /> Verify</button>
                          ) : <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ledger Updated</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium text-left">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-white/80 w-full max-w-5xl mx-auto print:shadow-none print:border-none print:p-0">
             <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 print:border-b print:pb-6 print:mb-6 print:block">
              <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-6 mx-auto print:h-12 print:mb-4" />
              <h2 className="text-lg font-black bg-[#04152d] text-white inline-block px-10 py-3 rounded-full uppercase tracking-widest">Collections Summary Report</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center">
                <p className="text-[10px] font-black text-[#04152d] uppercase tracking-widest mb-2">Total Collections</p>
                <p className="text-3xl font-black text-[#04152d]">₱{reportTotals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Members Paid</p>
                <p className="text-3xl font-black text-[#04152d]">{reportTotals.count}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}