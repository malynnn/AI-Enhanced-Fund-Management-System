"use client";

// --- REPLACE YOUR CURRENT IMPORTS WITH THIS EXACT BLOCK ---
import { useState, useEffect, useMemo } from 'react';
import { 
  Search, AlertTriangle, CheckCircle2, Send, Filter, UploadCloud, 
  Terminal, RefreshCw, Calendar, CreditCard, FileText, BarChart3, Printer 
} from 'lucide-react';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';
// -----------------------------------------------------------

// ... rest of your code remains exactly the same
// --- INITIAL DATA (UNTOUCHED) ---
const standardDuesAmount = 500.00;

export default function DuesCollectionPage() {
  const [isPosting, setIsPosting] = useState<string | null>(null);
  const [duesRecords, setDuesRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDuesRecords = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';
      const res = await fetch(`${gatewayUrl}/api/finance/dues`);
      if (res.ok) {
        const data = await res.json();
        setDuesRecords(data);
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

  // --- NEW: MODAL STATE MANAGEMENT ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionId?: number | 'batch';
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });



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

  const uniqueMonths = Array.from(new Set(duesRecords.map(r => r.month)));
  const uniqueMethods = Array.from(new Set(duesRecords.map(r => r.method)));

  // --- REPORT AGGREGATION ---
  const reportTotals = useMemo(() => {
    const totalCollected = filteredRecords.reduce((sum, rec) => sum + rec.amountPaid, 0);
    const totalDiscrepancies = filteredRecords.filter(rec => rec.amountPaid !== standardDuesAmount).length;
    const totalConfirmed = filteredRecords.filter(rec => rec.status === 'Confirmed').length;
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
    const pendingCount = filteredRecords.filter(r => r.status === 'Pending').length;
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

    if (modal.actionId === 'batch') {
      // Mocking batch post delay
      setTimeout(() => {
        setDuesRecords(prev => prev.map(rec => {
          const isPendingInView = filteredRecords.some(fr => fr.id === rec.id && fr.status === 'Pending');
          return isPendingInView ? { ...rec, status: 'Confirmed' } : rec;
        }));
        setModal(prev => ({ ...prev, status: 'success', resultMsg: 'Batch posting completed successfully!' }));
      }, 1500);
      return;
    }

    // Single record post logic (Your original fetch logic untouched)
    const recordId = modal.actionId as number;
    const record = duesRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      const response = await fetch(`/api/mock/ms-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: record.transaction_id,
          member_id: record.memberId,
          reference_number: record.reference_number,
          posted_amount: record.amountPaid,
          fund_credited: record.fund_to_credit,
          requesting_role: 'MS_Admin', 
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        setDuesRecords(prev => prev.map(rec => 
          rec.id === recordId ? { ...rec, status: 'Confirmed' } : rec
        ));
      }

      setWebhookLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: response.ok
            ? `✅ LEDGER_POSTED + MS_NOTIFIED (200)`
            : `❌ ERROR (${response.status})`,
          payload: responseData
        },
        ...prev
      ]);
      
      if (!response.ok) {
        setModal(prev => ({ ...prev, status: 'error', resultMsg: `Status: ${response.status} - Error: ${responseData.error}` }));
      } else {
        setModal(prev => ({ ...prev, status: 'success', resultMsg: `Backend response: ${responseData.message}` }));
      }

    } catch (error) {
      console.error("Failed to reach API", error);
      setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Network error. Failed to reach the API.' }));
    }
  };




  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative">
      
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


      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-none">
        
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
                disabled={filteredRecords.filter(r => r.status === 'Pending').length === 0}
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
            
            {/* FILTER BAR - Full Width */}
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
                  <option value="Pending">Pending Review</option>
                  <option value="Confirmed">Posted to Ledger</option>
                  <option value="DISCREPANCY">Discrepancies Only</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            {/* TOP COMPONENT: LEDGER TABLE - FULL WIDTH */}
            <div className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#04152d]">Collection Ledger</h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)]">{filteredRecords.length} Records</span>
              </div>

              <div className="overflow-x-auto w-full max-h-[500px] overflow-y-auto">
                <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Member Details</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Coverage</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Method & Ref</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount Remitted</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Ledger Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.map((rec) => {
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
                            {rec.status === 'Confirmed' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]">
                                <CheckCircle2 size={12} /> Posted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.3)]">
                                <AlertTriangle size={12} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            {rec.status === 'Pending' ? (
                              <button 
                                onClick={() => triggerSinglePost(rec.id, rec.name)} 
                                className="inline-flex items-center justify-center gap-2 bg-[#facc15] text-[#04152d] font-black py-2.5 px-5 rounded-xl text-xs shadow-[0_6px_0_rgba(110,76,0,0.45),0_4px_18px_rgba(250,204,21,0.4)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(110,76,0,0.45),0_2px_8px_rgba(250,204,21,0.25)] transition-all"
                              >
                                <Send size={14} /> Post & Notify
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-4">Ledger Updated</span>
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
            </div>



          </div>
        )}

        {/* ========================================= */}
        {/* TAB 2: SUMMARY REPORT VIEW                */}
        {/* ========================================= */}
        {activeTab === 'report' && (
          <div className="bg-white p-10 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 w-full max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 animate-fade-in">
            
            {/* Report Header */}
            <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 flex flex-col items-center">
              <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-6" />
              <h2 className="text-lg font-black bg-[#04152d] text-white inline-block px-10 py-3 rounded-full uppercase tracking-widest shadow-[0_4px_12px_rgba(4,21,45,0.2)] print:bg-white print:text-[#04152d] print:border-2 print:border-[#04152d] print:shadow-none">
                Monthly Dues Summary Report
              </h2>
              <p className="mt-6 font-bold text-gray-500 uppercase tracking-widest text-xs">
                Reporting Period: <span className="text-[#04152d] text-sm">{filterMonth === 'ALL' ? 'All Data Records' : filterMonth}</span>
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="border-t-4 border-[#04152d] bg-gray-50 p-6 rounded-2xl text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Collections</p>
                <p className="text-3xl font-black text-[#04152d] tracking-tight">₱{reportTotals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="border-t-4 border-[#04152d] bg-gray-50 p-6 rounded-2xl text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Members Paid</p>
                <p className="text-3xl font-black text-[#04152d] tracking-tight">{reportTotals.count}</p>
              </div>
              <div className={`border-t-4 p-6 rounded-2xl text-center ${reportTotals.totalDiscrepancies > 0 ? 'border-[#ef4444] bg-red-50' : 'border-[#10b981] bg-emerald-50'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Total Discrepancies</p>
                <p className={`text-3xl font-black tracking-tight ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{reportTotals.totalDiscrepancies}</p>
              </div>
            </div>

            {/* Per-Member Breakdown Table */}
            <table className="w-full text-left text-sm mb-16 border-collapse">
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
                        <span className="font-bold text-[#04152d] block text-sm">{rec.name}</span>
                        <span className="text-xs font-mono text-gray-500 mt-1 block">{rec.memberId}</span>
                      </td>
                      <td className="py-4 px-2 text-[#04152d] font-bold text-sm">
                        {rec.method} <br/>
                        <span className="font-mono font-medium text-gray-400 mt-1 block text-xs">{rec.reference_number}</span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${rec.status === 'Confirmed' ? 'text-gray-500' : (isDiscrepancy ? 'text-[#ef4444]' : 'text-[#04152d]')}`}>
                          {isDiscrepancy && rec.status === 'Pending' ? 'Discrepancy' : rec.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`font-mono font-black text-lg ${isDiscrepancy ? 'text-[#ef4444]' : 'text-[#04152d]'}`}>
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

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-16 pt-8 max-w-3xl mx-auto print:mt-16">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-12">Prepared & Noted By:</p>
                <div className="border-t-2 border-[#04152d] pt-3 text-center">
                  <p className="font-black text-sm text-[#04152d] uppercase tracking-wider">Treasurer</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">BDOEA Finance</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-12">System Generated On:</p>
                <div className="border-t-2 border-[#04152d] pt-3 text-center">
                  <p className="font-black text-sm text-[#04152d] uppercase tracking-wider">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">Finance & Dues Module</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}