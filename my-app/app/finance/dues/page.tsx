"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, AlertTriangle, CheckCircle2, Send, Filter, UploadCloud, 
  Terminal, RefreshCw, Calendar, CreditCard, FileText, BarChart3, Printer,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';

// --- INITIAL DATA (UNTOUCHED) ---
const standardDuesAmount = 500.00;

export default function DuesCollectionPage() {
  const [isPosting, setIsPosting] = useState<string | null>(null);
  const [duesRecords, setDuesRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- BACKEND LOGIC (UNTOUCHED) ---
  const fetchDuesRecords = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/dues`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((d: any) => ({
          ...d,
          amountPaid: Number(d.amountPaid)
        }));
        setDuesRecords(formatted);
      }
    } catch (err) {
      console.error('Error fetching dues:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuesRecords();
  }, []);

  const [activeTab, setActiveTab] = useState<'ledger' | 'report'>('ledger');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');

  // --- MODAL STATE MANAGEMENT ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionId?: number | 'batch';
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterMonth, filterMethod]);

  // --- FILTERING LOGIC ---
  const filteredRecords = useMemo(() => {
    return duesRecords.filter(record => {
      const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.memberId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' ? true : 
                            filterStatus === 'DISCREPANCY' ? record.amountPaid !== standardDuesAmount :
                            record.status === filterStatus;
      const matchesMonth = filterMonth === 'ALL' ? true : record.month === filterMonth;
      const matchesMethod = filterMethod === 'ALL' ? true : record.method === filterMethod;
      
      return matchesSearch && matchesStatus && matchesMonth && matchesMethod;
    });
  }, [duesRecords, searchTerm, filterStatus, filterMonth, filterMethod]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const uniqueMonths = Array.from(new Set(duesRecords.map(r => r.month)));
  const uniqueMethods = Array.from(new Set(duesRecords.map(r => r.method)));

  // --- REPORT AGGREGATION ---
  const reportTotals = useMemo(() => {
    const totalCollected = filteredRecords.reduce((sum, rec) => sum + rec.amountPaid, 0);
    const totalDiscrepancies = filteredRecords.filter(rec => rec.amountPaid !== standardDuesAmount).length;
    const totalConfirmed = filteredRecords.filter(rec => rec.status === 'CONFIRMED').length;
    return { totalCollected, totalDiscrepancies, totalConfirmed, count: filteredRecords.length };
  }, [filteredRecords]);

  // --- TRIGGER MODALS ---
  const triggerSinglePost = (id: number, name: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Ledger Posting',
      message: `Are you sure you want to verify and post the remittance for ${name} to the active ledger? This will notify the member system.`,
      actionId: id,
      status: 'idle'
    });
  };

  const triggerBatchPost = () => {
    const pendingCount = filteredRecords.filter(r => r.status === 'PENDING').length;
    if (pendingCount === 0) return;
    
    setModal({
      isOpen: true,
      title: 'Confirm Batch Posting',
      message: `You are about to verify and post ${pendingCount} pending records from the current view. Proceed?`,
      actionId: 'batch',
      status: 'idle'
    });
  };

  // --- EXECUTE HTTP REQUEST VIA MODAL ---
  const executeModalAction = async () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

    if (modal.actionId === 'batch') {
      try {
        const pendingRecords = filteredRecords.filter(r => r.status === 'PENDING');
        const promises = pendingRecords.map(async (record) => {
          const res = await fetch(`${gatewayUrl}/api/finance/dues/${record.id}/confirm`, {
            method: 'PATCH',
          });
          if (!res.ok) {
            throw new Error(`Failed to confirm record for ${record.name}`);
          }
          return record.id;
        });

        await Promise.all(promises);

        setDuesRecords(prev => prev.map(rec => {
          const wasPending = pendingRecords.some(pr => pr.id === rec.id);
          return wasPending ? { ...rec, status: 'CONFIRMED' } : rec;
        }));

        setModal(prev => ({ ...prev, status: 'success', resultMsg: `Successfully batch posted ${pendingRecords.length} records to the ledger.` }));
      } catch (error: any) {
        console.error('Batch post error:', error);
        setModal(prev => ({ ...prev, status: 'error', resultMsg: error.message || 'Failed to complete batch posting.' }));
      }
      return;
    }

    const recordId = modal.actionId as string | number;
    const record = duesRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      const response = await fetch(`${gatewayUrl}/api/finance/dues/${recordId}/confirm`, {
        method: 'PATCH',
      });

      const responseData = await response.json();

      if (response.ok) {
        setDuesRecords(prev => prev.map(rec => 
          rec.id === recordId ? { ...rec, status: 'CONFIRMED' } : rec
        ));
        setModal(prev => ({ ...prev, status: 'success', resultMsg: `Dues record confirmed and posted successfully!` }));
      } else {
        setModal(prev => ({ ...prev, status: 'error', resultMsg: `Status: ${response.status} - Error: ${responseData.message || responseData.error}` }));
      }

    } catch (error) {
      console.error("Failed to reach API", error);
      setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Network error. Failed to reach the API.' }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative print:block print:min-h-0 print:h-auto print:w-full print:overflow-visible">
      
      {/* Deep Print Override CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Removes Browser Default Headers/Footers */
          @page {
            size: portrait;
            margin: 0 !important; 
          }
          /* Applies internal safe margin for the actual content */
          body {
            padding: 15mm !important;
          }
        }
      `}} />

      {/* GLOBAL MODAL COMPONENT */}
      <ActionModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        status={modal.status}
        resultMsg={modal.resultMsg}
        onConfirm={executeModalAction}
        onClose={() => setModal({ ...modal, isOpen: false })}
        confirmText="Confirm & Post"
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-full print:w-full print:block print:overflow-visible">
        
        {/* TOP TABS & ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 flex-shrink-0 print:hidden mt-2">
          
          <div className="flex gap-8 border-b-2 border-gray-200/60 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${
                activeTab === 'ledger' 
                  ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' 
                  : 'text-gray-400 hover:text-[#04152d]'
              }`}
            >
              <FileText size={18} /> Ledger & Posting
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`pb-3 flex items-center gap-2 text-sm font-black transition-all relative ${
                activeTab === 'report' 
                  ? 'text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]' 
                  : 'text-gray-400 hover:text-[#04152d]'
              }`}
            >
              <BarChart3 size={18} /> Summary Report
            </button>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === 'ledger' && (
              <button 
                onClick={triggerBatchPost}
                disabled={filteredRecords.filter(r => r.status === 'PENDING').length === 0}
                className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloud size={16} /> Batch Post to MS
              </button>
            )}
            {activeTab === 'report' && (
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 border-2 border-[#04152d] text-[#04152d] hover:bg-[#04152d] hover:text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150">
                <Printer size={16} /> Print Report
              </button>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* TAB 1: LEDGER VIEW                        */}
        {/* ========================================= */}
        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-6 flex-1 print:hidden animate-fade-in">
            
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center">
              
              <div className="flex-1 min-w-[250px] relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" placeholder="Search Member Name or ID..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
                />
              </div>
              
              <div className="relative inline-block w-full sm:w-auto min-w-[180px]">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                  <option value="ALL">All Months</option>
                  {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
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
                  <option value="PENDING">Pending Review</option>
                  <option value="CONFIRMED">Posted to Ledger</option>
                  <option value="DISCREPANCY">Discrepancies Only</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
                <h2 className="text-xl font-black text-[#04152d]">Collection Ledger</h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)]">{filteredRecords.length} Records Found</span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Member Details</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Coverage</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Method & Ref</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount Remitted</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right pr-6">Ledger Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRecords.map((rec) => {
                      const isDiscrepancy = rec.amountPaid !== standardDuesAmount;
                      return (
                        <tr key={rec.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                          <td className="px-6 py-4 text-sm">
                            <p className="font-bold text-[#04152d]">{rec.name}</p>
                            <p className="text-xs font-mono text-gray-400 mt-0.5">{rec.memberId}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#04152d] font-medium">{rec.month}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-bold text-[#04152d]">{rec.method}</div>
                            <div className="text-xs font-mono text-blue-500 mt-0.5">{rec.reference_number || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            <div className="flex flex-col items-end">
                              <span className={`font-black text-lg ${isDiscrepancy ? 'text-red-600' : 'text-[#04152d]'}`}>
                                ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              {isDiscrepancy && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)] mt-1 uppercase tracking-widest">
                                  <AlertTriangle size={10} /> Discrepancy
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {rec.status === 'CONFIRMED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]">
                                <CheckCircle2 size={12} /> Posted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.3)]">
                                <AlertTriangle size={12} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right pr-6">
                            {rec.status === 'PENDING' ? (
                              <button 
                                onClick={() => triggerSinglePost(rec.id, rec.name)} 
                                className="inline-flex items-center justify-center gap-2 bg-[#facc15] text-[#04152d] font-black py-2.5 px-5 rounded-xl text-xs shadow-[0_6px_0_rgba(110,76,0,0.45),0_4px_18px_rgba(250,204,21,0.4)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(110,76,0,0.45),0_2px_8px_rgba(250,204,21,0.25)] transition-all"
                              >
                                <Send size={14} /> Post & Notify
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-2">Ledger Updated</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRecords.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">No dues records found matching criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================= */}
        {/* TAB 2: SUMMARY REPORT VIEW                */}
        {/* ========================================= */}
        {activeTab === 'report' && (
          <div className="bg-white p-10 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 w-full max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:block print:overflow-visible animate-fade-in relative">
            
            {/* EXPLICIT CUSTOM HEADER FOR PRINT ONLY */}
            <div className="hidden print:flex w-full justify-end pb-6">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BDOEA Financial System</span>
            </div>

            {/* Report Header */}
            <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 print:border-b print:pb-6 print:mb-6 print:block">
              <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-6 mx-auto print:h-12 print:mb-4" />
              <h2 className="text-lg font-black bg-[#04152d] text-white inline-block px-10 py-3 rounded-full uppercase tracking-widest shadow-[0_4px_12px_rgba(4,21,45,0.2)] print:bg-white print:text-[#04152d] print:border-2 print:border-[#04152d] print:shadow-none print:px-6 print:py-2 print:text-sm">
                Monthly Dues Summary Report
              </h2>
              <p className="mt-6 font-bold text-gray-500 uppercase tracking-widest text-xs print:mt-4 print:text-[10px]">
                Reporting Period: <span className="text-[#04152d] text-sm print:text-xs">{filterMonth === 'ALL' ? 'All Data Records' : filterMonth}</span>
              </p>
            </div>

            {/* Redesigned BDOEA KPI Cards (Outlines) */}
            <div className="grid grid-cols-3 gap-6 mb-12 print:gap-4 print:mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center print:bg-white print:border-2 print:border-[#04152d] print:p-4 print:shadow-none">
                <p className="text-[10px] font-black text-[#04152d] uppercase tracking-widest mb-2 print:text-[8px]">Total Collections</p>
                <p className="text-3xl font-black text-[#04152d] tracking-tight print:text-xl">₱{reportTotals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-[#04152d] text-center print:bg-white print:border-2 print:border-[#04152d] print:p-4 print:shadow-none">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 print:text-[8px]">Members Paid</p>
                <p className="text-3xl font-black text-[#04152d] tracking-tight print:text-xl">{reportTotals.count}</p>
              </div>
              <div className={`p-6 rounded-2xl text-center shadow-md border-2 print:border-2 print:p-4 print:shadow-none ${reportTotals.totalDiscrepancies > 0 ? 'border-[#ef4444] bg-red-50 print:bg-red-50 print:border-[#ef4444]' : 'border-[#10b981] bg-emerald-50 print:bg-emerald-50 print:border-[#10b981]'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 print:text-[8px] ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Total Discrepancies</p>
                <p className={`text-3xl font-black tracking-tight print:text-xl ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{reportTotals.totalDiscrepancies}</p>
              </div>
            </div>

            {/* Per-Member Breakdown Table */}
            <table className="w-full text-left text-sm mb-16 border-collapse print:mb-8 print:text-xs">
              <thead>
                <tr className="bg-white border-y-2 border-[#04152d]">
                  <th className="py-4 px-2 text-[10px] font-black text-[#04152d] uppercase tracking-widest">Member Name & ID</th>
                  <th className="py-4 px-2 text-[10px] font-black text-[#04152d] uppercase tracking-widest">Payment Method</th>
                  <th className="py-4 px-2 text-[10px] font-black text-[#04152d] uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 px-2 text-[10px] font-black text-[#04152d] uppercase tracking-widest text-right">Amount Remitted</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(rec => {
                  const isDiscrepancy = rec.amountPaid !== standardDuesAmount;
                  return (
                    <tr key={rec.id} className="border-b border-gray-100">
                      <td className="py-4 px-2">
                        <span className="font-bold text-[#04152d] block text-sm print:text-xs">{rec.name}</span>
                        <span className="text-xs font-mono text-gray-500 mt-1 block print:text-[10px]">{rec.memberId}</span>
                      </td>
                      <td className="py-4 px-2 text-[#04152d] font-bold text-sm print:text-xs">
                        {rec.method} <br/>
                        <span className="font-mono font-medium text-gray-400 mt-1 block text-xs print:text-[10px]">{rec.reference_number}</span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest print:text-[8px] ${rec.status === 'CONFIRMED' ? 'text-gray-500' : (isDiscrepancy ? 'text-[#ef4444]' : 'text-[#04152d]')}`}>
                          {isDiscrepancy && rec.status === 'PENDING' ? 'Discrepancy' : rec.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`font-mono font-black text-lg print:text-sm ${isDiscrepancy ? 'text-[#ef4444]' : 'text-[#04152d]'}`}>
                          ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-medium">No records to display for this period.</td></tr>
                )}
              </tbody>
            </table>

            {/* True Signature Block (Centered) */}
            <div className="flex justify-center pt-8 print:pt-12 print:max-w-full print:w-full">
              <div className="flex flex-col items-center text-center w-full max-w-[300px]">
                <p className="text-[11px] font-black text-[#04152d] uppercase tracking-widest mb-12 print:text-[10px] print:mb-10">Prepared And Noted By</p>
                <div className="w-full border-t-2 border-[#04152d] pt-3">
                  <p className="font-black text-xs text-[#04152d] uppercase tracking-wide print:text-[11px]">(ROMALYN AMANTE)</p>
                  <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 print:text-[9px]">Treasurer, BDOEA</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-6 border-t border-dashed border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-mono print:mt-16 print:pt-4 print:text-[8px]">
              <span>BDOEA Financial System • Finance & Dues Module</span>
              <span>Generated On: {new Date().toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}