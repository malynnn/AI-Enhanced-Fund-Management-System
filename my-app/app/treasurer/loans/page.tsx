"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, RefreshCw, Landmark, Search, Activity, 
  ChevronLeft, ChevronRight, Eye, ArrowLeft, BookOpen, Clock,
  Calendar, CircleDashed, CheckCircle, CircleDollarSign, Filter, Tag, Loader2, AlertTriangle, X
} from 'lucide-react';
import Header from '@/components/Header';

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
  processedAt: string;
}

export default function LoansDashboard() {
  const [funds, setFunds] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  
  // Pagination
  const [repaymentPage, setRepaymentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [loading, setLoading] = useState(true);

  // Detailed View State
  const [selectedLedger, setSelectedLedger] = useState<{ memberName: string; loanReference: string; memberId: string } | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'amortization' | 'ledger'>('amortization');
  
  // Backend Fetch State for Detailed View
  const [detailData, setDetailData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState('');

  // 1. Fetch Main Dashboard Data
  const loadData = async () => {
    try {
      setLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const [fundsRes, repaymentsRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/finance/funds`).catch(() => null),
        fetch(`${gatewayUrl}/api/finance/repayments`).catch(() => null)
      ]);

      if (fundsRes?.ok) setFunds(await fundsRes.json());
      if (repaymentsRes?.ok) {
        const repaymentsData = await repaymentsRes.json();
        setRepayments(repaymentsData.map((r: any) => ({
          ...r, 
          amount: Number(r.amount || 0), 
          principalAmount: Number(r.principalAmount || 0), 
          serviceFeeAmount: Number(r.serviceFeeAmount || 0),
          overpaymentAmount: Number(r.overpaymentAmount || 0)
        })));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // 2. Fetch Individual Ledger Data dynamically from backend
  useEffect(() => {
    if (!selectedLedger) {
      setDetailData(null);
      setDetailError('');
      return;
    }

    const fetchLoanDetails = async () => {
      setIsLoadingDetails(true);
      setDetailError('');
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        // Calling backend endpoint for the specific loan details
        const res = await fetch(`${gatewayUrl}/api/finance/loans/${selectedLedger.loanReference}/details`);
        
        if (res.ok) {
          const data = await res.json();
          setDetailData(data);
        } else {
          throw new Error("Unable to retrieve loan details from the server.");
        }
      } catch (err: any) {
        setDetailError(err.message || "A network error occurred.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchLoanDetails();
  }, [selectedLedger]);

  // Reset Pagination on Filter Change
  useEffect(() => {
    setRepaymentPage(1);
  }, [searchTerm, filterMethod, filterMonth]);

  // Simultaneous Filters (Search, Method, Month)
  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      const matchesSearch = r.loanReference.toLowerCase().includes(searchTerm.toLowerCase()) || r.memberName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = filterMethod === 'ALL' ? true : r.paymentMethod === filterMethod;
      const matchesMonth = filterMonth === '' ? true : (r.processedAt && new Date(r.processedAt).toISOString().startsWith(filterMonth));
      
      return matchesSearch && matchesMethod && matchesMonth;
    });
  }, [repayments, searchTerm, filterMethod, filterMonth]);

  const totalRepaymentPages = Math.max(1, Math.ceil(filteredRepayments.length / itemsPerPage));
  const paginatedRepayments = filteredRepayments.slice((repaymentPage - 1) * itemsPerPage, repaymentPage * itemsPerPage);

  // --- KPI SUMMARY CALCULATIONS ---
  const totalRepaymentsValue = repayments.filter(r => r.status === 'PROCESSED').reduce((acc, curr) => acc + curr.amount, 0);
  const uniqueLoansCount = new Set(repayments.map(r => r.loanReference)).size;
  const globalProcessedPrincipal = repayments.filter(r => r.status === 'PROCESSED').reduce((acc, curr) => acc + curr.principalAmount, 0);
  const totalReceivables = uniqueLoansCount > 0 ? (uniqueLoansCount * 50000) - globalProcessedPrincipal : 0;

  const getStatusBadge = (status: string) => {
    if (!status) return null;
    if (status.toLowerCase() === 'paid') return <span className="bg-[#e8f3f8] text-[#34769c] px-3 py-1 rounded-full text-xs font-bold tracking-wide">Paid</span>;
    if (status.toLowerCase() === 'overdue') return <span className="bg-[#fcecec] text-[#b64949] px-3 py-1 rounded-full text-xs font-bold tracking-wide">Overdue</span>;
    if (status.toLowerCase() === 'unpaid') return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold tracking-wide">Unpaid</span>;
    return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold tracking-wide">{status}</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto flex-1 overflow-hidden relative">
        
        {/* IN-PAGE DETAILED VIEW (Swaps with the main table smoothly) */}
        {selectedLedger ? (
          <div className="w-full h-full animate-fade-in transition-all duration-500 ease-out translate-x-0">
            
            <button 
              onClick={() => setSelectedLedger(null)} 
              className="flex items-center gap-2 text-[#04152d] hover:text-blue-600 font-bold text-sm mb-8 transition-colors bg-white/50 px-4 py-2 rounded-xl shadow-sm border border-white/80 w-fit"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[24px] shadow-sm border border-white/80">
                <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                <p className="text-[#04152d] font-black text-lg">Fetching loan details...</p>
                <p className="text-gray-500 font-medium text-sm mt-1">Retrieving data from the server</p>
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[24px] shadow-sm border border-white/80">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <p className="text-[#04152d] font-black text-lg">Unable to load details</p>
                <p className="text-gray-500 font-medium text-sm mt-1">{detailError}</p>
                <button onClick={() => setSelectedLedger(null)} className="mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-xl transition-all">Go Back</button>
              </div>
            ) : detailData ? (
              <div className="bg-white rounded-[24px] shadow-lg border border-white/80 overflow-hidden flex flex-col p-6 md:p-10 animate-slide-up">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-3xl font-black text-[#2e261e] mb-1">{selectedLedger.memberName}</h1>
                    <p className="text-sm font-mono text-gray-500">{selectedLedger.loanReference} · Regular Member ({selectedLedger.memberId})</p>
                  </div>
                  {detailData.outstanding > 0 ? (
                    <span className="bg-[#fcecec] text-[#b64949] px-4 py-1.5 rounded-full text-sm font-black tracking-widest uppercase shadow-sm">
                      Active Balance
                    </span>
                  ) : (
                     <span className="bg-[#e8f3f8] text-[#34769c] px-4 py-1.5 rounded-full text-sm font-black tracking-widest uppercase shadow-sm">
                      Cleared
                    </span>
                  )}
                </div>

                {/* Summary Banner */}
                <div className="bg-[#fcfaf6] border border-[#eee6d8] rounded-[20px] p-6 mb-8 flex flex-wrap gap-8 md:gap-12 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Principal</span>
                    <span className="text-xl font-black text-[#2e261e]">₱{Number(detailData.principal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rate (P.A.)</span>
                    <span className="text-xl font-black text-[#2e261e]">{(Number(detailData.ratePA || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Term</span>
                    <span className="text-xl font-black text-[#2e261e]">{detailData.term || 0} months</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Release Date</span>
                    <span className="text-xl font-black text-[#2e261e]">{detailData.releaseDate || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Outstanding</span>
                    <span className="text-xl font-black text-[#2e261e]">₱{Number(detailData.outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col hidden md:flex">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Interest Earned</span>
                    <span className="text-xl font-black text-[#2e261e]">₱{Number(detailData.interestEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Next Due</span>
                    <span className="text-xl font-black text-[#2e261e]">{detailData.nextDue || 'N/A'}</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b-2 border-gray-200 mb-6">
                  <button 
                    onClick={() => setActiveDetailTab('amortization')}
                    className={`pb-3 text-sm font-black transition-all relative ${activeDetailTab === 'amortization' ? 'text-[#a98135] border-b-4 border-[#a98135] translate-y-[2px]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Amortization Schedule
                  </button>
                  <button 
                    onClick={() => setActiveDetailTab('ledger')}
                    className={`pb-3 text-sm font-black transition-all relative ${activeDetailTab === 'ledger' ? 'text-[#a98135] border-b-4 border-[#a98135] translate-y-[2px]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Account Ledger
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="bg-[#fcfaf6] border border-[#eee6d8] rounded-[20px] shadow-sm overflow-hidden">
                  {activeDetailTab === 'amortization' && (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left whitespace-nowrap text-sm">
                        <thead className="border-b border-[#eee6d8]">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Beginning Balance</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Principal</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Interest</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Due</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ending Balance</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee6d8]">
                          {(detailData.amort || []).map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4 font-mono text-gray-500">{row.no || idx + 1}</td>
                              <td className="px-6 py-4 font-medium text-[#2e261e]">{row.date}</td>
                              <td className="px-6 py-4 font-medium text-[#2e261e] text-right">₱{Number(row.begBal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 font-medium text-gray-600 text-right">₱{Number(row.prin || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 font-medium text-gray-600 text-right">₱{Number(row.int || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 font-black text-[#2e261e] text-right">₱{Number(row.due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 font-medium text-[#2e261e] text-right">₱{Number(row.endBal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 text-center">{getStatusBadge(row.status)}</td>
                            </tr>
                          ))}
                          {(!detailData.amort || detailData.amort.length === 0) && (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">No amortization schedule found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeDetailTab === 'ledger' && (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left whitespace-nowrap text-sm">
                        <thead className="border-b border-[#eee6d8]">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Particulars</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Debit</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Credit</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee6d8]">
                          {(detailData.ledger || []).map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-[#2e261e]">{row.date}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.type?.toLowerCase().includes('disbursement') ? 'bg-[#fcecec] text-[#b64949]' : 'bg-[#eefcf4] text-[#3e895d]'}`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-medium text-gray-500">{row.ref}</td>
                              <td className="px-6 py-4 font-medium text-[#2e261e]">{row.part}</td>
                              <td className="px-6 py-4 font-medium text-[#b64949] text-right">{row.debit ? `₱${Number(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                              <td className="px-6 py-4 font-medium text-[#3e895d] text-right">{row.credit ? `₱${Number(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                              <td className="px-6 py-4 font-black text-[#2e261e] text-right">₱{Number(row.bal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                          {(!detailData.ledger || detailData.ledger.length === 0) && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">No ledger records found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="w-full space-y-8 animate-fade-in transition-all duration-500 ease-out">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mt-2">
              <div className="flex gap-8 border-b-2 border-gray-200/60 w-full sm:w-auto px-2">
                <button className="pb-3 flex items-center gap-2 text-sm font-black text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px] transition-colors">
                  <FileText size={18} /> Global Repayment Ledger
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={loadData} disabled={loading} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Ledger
                </button>
              </div>
            </div>

            {/* KPI SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-600"><Activity size={24} /></div>
                <div className="min-w-0">
                  <p className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-0.5 text-left">Total Repayments Value</p>
                  <p className="text-2xl font-black text-[#04152d] truncate text-left">₱{totalRepaymentsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-600"><FileText size={24} /></div>
                <div className="min-w-0">
                  <p className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-0.5 text-left">Total Unique Active Loans</p>
                  <p className="text-2xl font-black text-[#04152d] truncate text-left">{uniqueLoansCount} Loans</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex-shrink-0 flex items-center justify-center text-purple-600"><Landmark size={24} /></div>
                <div className="min-w-0">
                  <p className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-0.5 text-left">Global Processed Principal</p>
                  <p className="text-2xl font-black text-[#04152d] truncate text-left">₱{globalProcessedPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex-shrink-0 flex items-center justify-center text-amber-600"><CircleDollarSign size={24} /></div>
                <div className="min-w-0">
                  <p className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-0.5 text-left">Estimated Total Receivables</p>
                  <p className="text-2xl font-black text-[#04152d] truncate text-left">₱{Math.max(0, totalReceivables).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col w-full">
              <div className="w-full flex flex-col gap-6">
                
                {/* Search and Filters Row */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[250px] relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by Loan Ref or Member Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 outline-none font-bold text-[#04152d] transition-all"/>
                  </div>

                  {/* Month Picker Filter */}
                  <div className="relative inline-flex items-center w-full sm:w-auto min-w-[160px] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-blue-500 transition-colors">
                    <div className="pl-4 pr-2 flex items-center pointer-events-none">
                      <Calendar size={14} className="text-gray-400" />
                    </div>
                    <div className="relative flex-1">
                      <input 
                        type="month" 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)} 
                        className="w-full py-2.5 text-sm outline-none font-bold text-[#04152d] bg-transparent cursor-pointer opacity-0 absolute inset-0 z-10" 
                      />
                      <div className="py-2.5 text-sm font-bold text-[#04152d] pointer-events-none truncate pr-2">
                        {filterMonth ? new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'All Time'}
                      </div>
                    </div>
                    {filterMonth ? (
                      <button onClick={() => setFilterMonth('')} className="pr-4 pl-2 text-gray-400 hover:text-red-500 z-20 transition-colors">
                        <X size={14} />
                      </button>
                    ) : (
                      <div className="pr-4 pl-2 pointer-events-none">
                        <Calendar size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Payment Method Filter */}
                  <div className="relative inline-block w-full sm:w-auto min-w-[180px]">
                    <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                      <option value="ALL">All Methods</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="SALARY_DEDUCTION">Salary Deduction</option>
                      <option value="CASH">Cash</option>
                      <option value="CHECK">Check</option>
                    </select>
                  </div>
                </div>

                {/* Main Table */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full whitespace-nowrap min-w-[1500px]">
                      <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                        <tr>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Processed Date</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Loan Ref</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Member ID</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Member Name</th>
                          <th className="px-5 py-4 text-[10px] font-black text-[#04152d] uppercase tracking-wide text-right">Amount Paid</th>
                          <th className="px-5 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-wide text-right">Principal</th>
                          <th className="px-5 py-4 text-[10px] font-black text-blue-600 uppercase tracking-wide text-right">Service Fee</th>
                          <th className="px-5 py-4 text-[10px] font-black text-purple-600 uppercase tracking-wide text-right">Overpayment</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Method</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Ref Number</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-center">Status</th>
                          <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedRepayments.map((rep) => (
                          <tr 
                            key={rep.id} 
                            onClick={() => setSelectedLedger({ memberName: rep.memberName, loanReference: rep.loanReference, memberId: rep.memberId })}
                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="px-5 py-4 text-sm text-gray-500 font-medium text-left">
                              {new Date(rep.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-blue-600 font-mono text-left">{rep.loanReference}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 font-mono font-medium text-left">{rep.memberId}</td>
                            <td className="px-5 py-4 text-sm font-bold text-[#04152d] text-left">{rep.memberName}</td>
                            <td className="px-5 py-4 text-sm font-black text-[#04152d] text-right">₱{rep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-4 text-sm font-bold text-emerald-600 text-right">₱{rep.principalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-4 text-sm font-bold text-blue-600 text-right">₱{rep.serviceFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-4 text-sm font-bold text-purple-600 text-right">₱{rep.overpaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">{rep.paymentMethod.replace('_', ' ')}</td>
                            <td className="px-5 py-4 text-[11px] font-mono font-medium text-gray-500 text-left">{rep.referenceNumber || 'N/A'}</td>
                            <td className="px-5 py-4 text-center">
                              {rep.status === 'PROCESSED' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">Processed</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button className="inline-flex items-center gap-2 bg-gray-50 text-gray-600 group-hover:bg-blue-600 group-hover:text-white border border-gray-200 group-hover:border-blue-600 font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm">
                                <Eye size={14} /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {paginatedRepayments.length === 0 && (
                          <tr><td colSpan={12} className="px-6 py-16 text-center text-gray-400 font-medium">No repayment records found matching criteria.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalRepaymentPages > 1 && !loading && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                      <button onClick={() => setRepaymentPage(p => Math.max(1, p - 1))} disabled={repaymentPage === 1} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Page {repaymentPage} of {totalRepaymentPages}</span>
                      <button onClick={() => setRepaymentPage(p => Math.min(totalRepaymentPages, p + 1))} disabled={repaymentPage === totalRepaymentPages} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}