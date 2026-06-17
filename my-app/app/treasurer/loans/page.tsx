"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, RefreshCw, CheckCircle2, 
  XCircle, Landmark, Search, Activity, 
  CreditCard, Filter, ChevronLeft, ChevronRight, Eye, X, BookOpen, Clock,
  Calendar, CircleDashed, CheckCircle, TrendingDown, Info
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [repaymentPage, setRepaymentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(true);

  // --- INDIVIDUAL LEDGER STATE ---
  const [selectedLedger, setSelectedLedger] = useState<{ memberName: string; loanReference: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const [fundsRes, repaymentsRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/finance/funds`),
        fetch(`${gatewayUrl}/api/finance/repayments`)
      ]);

      if (fundsRes.ok) setFunds(await fundsRes.json());
      if (repaymentsRes.ok) {
        const repaymentsData = await repaymentsRes.json();
        setRepayments(repaymentsData.map((r: any) => ({
          ...r, amount: Number(r.amount), principalAmount: Number(r.principalAmount), serviceFeeAmount: Number(r.serviceFeeAmount)
        })));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      const matchesSearch = r.loanReference.toLowerCase().includes(searchTerm.toLowerCase()) || r.memberName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = filterMethod === 'ALL' ? true : r.paymentMethod === filterMethod;
      return matchesSearch && matchesMethod;
    });
  }, [repayments, searchTerm, filterMethod]);

  const totalRepaymentPages = Math.max(1, Math.ceil(filteredRepayments.length / itemsPerPage));
  const paginatedRepayments = filteredRepayments.slice((repaymentPage - 1) * itemsPerPage, repaymentPage * itemsPerPage);

  // Global Metrics (Processed only)
  const totalRepaymentsValue = repayments.filter(r => r.status === 'PROCESSED').reduce((acc, curr) => acc + curr.amount, 0);

  // --- DERIVED MEMBER LEDGER COMPUTATIONS & SCHEDULE MOCKING ---
  const memberHistory = selectedLedger ? repayments.filter(r => r.loanReference === selectedLedger.loanReference).sort((a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime()) : [];
  
  // Note: Backend should eventually provide 'originalCapital' and 'loanTerm'. Using standard parameters for now.
  const assumedOriginalCapital = 50000.00; 
  const assumedLoanTerm = 12; // 12 Months
  const assumedMonthlyFee = 500.00; // 1% Interest
  const expectedMonthlyPrincipal = assumedOriginalCapital / assumedLoanTerm;
  const expectedMonthlyAmortization = expectedMonthlyPrincipal + assumedMonthlyFee;

  const processedHistory = memberHistory.filter(r => r.status === 'PROCESSED');
  const processedPrincipal = processedHistory.reduce((acc, curr) => acc + curr.principalAmount, 0);
  const pendingAmount = memberHistory.filter(r => r.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
  
  const remainingBalance = assumedOriginalCapital - processedPrincipal;
  const progressPercentage = Math.min((processedHistory.length / assumedLoanTerm) * 100, 100);

  // Generate the full schedule (Paid + Unpaid months)
  const fullSchedule = Array.from({ length: Math.max(assumedLoanTerm, memberHistory.length) }, (_, index) => {
    const pastPayment = memberHistory[index];
    
    // Mocking future due dates based on the first payment (or just relative months)
    let displayDate = 'Upcoming';
    if (pastPayment) {
      displayDate = new Date(pastPayment.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (memberHistory.length > 0) {
      const lastDate = new Date(memberHistory[0].processedAt);
      lastDate.setMonth(lastDate.getMonth() + index);
      displayDate = `Est. ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    return {
      monthNo: index + 1,
      date: displayDate,
      method: pastPayment ? pastPayment.paymentMethod : 'N/A',
      ref: pastPayment ? pastPayment.referenceNumber : 'N/A',
      amount: pastPayment ? pastPayment.amount : expectedMonthlyAmortization,
      principal: pastPayment ? pastPayment.principalAmount : expectedMonthlyPrincipal,
      fee: pastPayment ? pastPayment.serviceFeeAmount : assumedMonthlyFee,
      status: pastPayment ? pastPayment.status : 'UPCOMING'
    };
  });


  return (
    <div className="flex flex-col min-h-screen bg-transparent print:bg-white relative">
      
      {/* INDIVIDUAL MEMBER LEDGER MODAL */}
      {selectedLedger && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white w-full max-w-5xl rounded-[24px] shadow-2xl border border-white/80 overflow-hidden animate-pop flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#04152d] text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <BookOpen size={28} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-black text-2xl leading-tight">{selectedLedger.memberName}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-mono text-blue-200 uppercase tracking-widest bg-blue-900/50 px-2 py-0.5 rounded">Ref: {selectedLedger.loanReference}</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle size={12}/> Active Loan</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedLedger(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-[#f8faff] flex-1">
              
              {/* Top Details & Progress Bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-3/4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Original Capital</p>
                      <p className="text-xl font-black text-[#04152d]">₱{assumedOriginalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Loan Term</p>
                      <p className="text-xl font-black text-[#04152d]">{assumedLoanTerm} Months</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Amortization</p>
                      <p className="text-xl font-black text-[#04152d]">₱{expectedMonthlyAmortization.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Interest Rate / Fee</p>
                      <p className="text-xl font-black text-[#04152d]">1.00% /mo</p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-1/4 flex flex-col items-end">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Outstanding Balance</p>
                    <p className="text-4xl font-black text-blue-600 tracking-tight">₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-black text-[#04152d] uppercase tracking-wide">Repayment Progress</p>
                    <p className="text-xs font-bold text-gray-500">{processedHistory.length} of {assumedLoanTerm} Months Paid</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                    </div>
                  </div>
                  {pendingAmount > 0 && (
                     <p className="text-xs text-amber-600 mt-3 font-bold flex items-center gap-1.5 bg-amber-50 w-fit px-3 py-1 rounded-lg">
                       <Clock size={12}/> Floating / Pending Verifications: ₱{pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </p>
                  )}
                </div>
              </div>

              {/* Full Amortization Schedule Table */}
              <div className="flex items-center gap-2 mb-4 mt-8">
                <Calendar size={18} className="text-[#04152d]"/>
                <h4 className="text-sm font-black text-[#04152d] uppercase tracking-widest">Complete Payment Schedule</h4>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">No.</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Date Logged / Due</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Method & Ref</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Total Amortization</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Split (Principal / Fee)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fullSchedule.map((sched, idx) => (
                      <tr key={idx} className={`transition-colors ${sched.status === 'UPCOMING' ? 'bg-gray-50/50 text-gray-400' : 'bg-white hover:bg-blue-50/30'}`}>
                        <td className="px-6 py-4 font-black text-left text-xs">{sched.monthNo}</td>
                        <td className="px-6 py-4 font-medium text-left">
                          {sched.status === 'UPCOMING' ? (
                            <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400"/> {sched.date}</span>
                          ) : (
                            <span className="text-[#04152d]">{sched.date}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-left">
                          {sched.status === 'UPCOMING' ? '-' : (
                            <>
                              <span className="font-bold text-[#04152d] block">{sched.method}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block uppercase tracking-widest">{sched.ref || 'N/A'}</span>
                            </>
                          )}
                        </td>
                        <td className={`px-6 py-4 font-black text-left ${sched.status === 'UPCOMING' ? 'text-gray-400' : 'text-[#04152d]'}`}>
                          ₱{sched.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-left text-xs">
                          <span className={sched.status === 'UPCOMING' ? 'text-gray-400' : 'text-[#04152d] font-bold'}>₱{sched.principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-300 mx-1 font-black">/</span>
                          <span className={sched.status === 'UPCOMING' ? 'text-gray-400' : 'text-emerald-600 font-bold'}>₱{sched.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          {sched.status === 'PROCESSED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={10} className="mr-1"/> Processed</span>
                          ) : sched.status === 'PENDING' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"><Clock size={10} className="mr-1"/> Pending</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200"><CircleDashed size={10} className="mr-1"/> Upcoming</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE BACKGROUND --- */}
      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-8 flex-1 print:p-0 print:m-0 print:max-w-none">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mt-2">
          <div className="flex gap-8 border-b-2 border-gray-200/60 w-full sm:w-auto px-2">
            <button className="pb-3 flex items-center gap-2 text-sm font-black text-[#04152d] border-b-4 border-[#04152d] translate-y-[2px]">
              <FileText size={18} /> Global Repayment Ledger
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={loadData} disabled={loading} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Ledger
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-2xl p-5 shadow-md border border-white/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-600"><Landmark size={24} /></div>
            <div className="min-w-0">
              <p className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">Global Processed Transactions</p>
              <p className="text-2xl md:text-3xl font-black text-[#04152d] truncate">{repayments.filter(r => r.status === 'PROCESSED').length} Payments</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md border border-white/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-600"><Activity size={24} /></div>
            <div className="min-w-0">
              <p className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">Total Global Repayments (Processed)</p>
              <p className="text-2xl md:text-3xl font-black text-[#04152d] truncate">₱{totalRepaymentsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full">
          <div className="w-full flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-white/80 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px] relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by Loan Ref or Member..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none font-bold text-[#04152d]"/>
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-lg border border-white/80 overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto w-full">
                <table className="w-full whitespace-nowrap min-w-[900px]">
                  <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Transaction Date</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Loan Reference</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Member Name</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Amount Remitted</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Ledger Split (Principal / Fee)</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRepayments.map((rep) => (
                      <tr key={rep.id} className="hover:bg-[#e8edf8]/60 transition-colors">
                        <td className="px-6 py-5 text-sm text-gray-500 font-medium text-left">{new Date(rep.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-6 py-5 text-sm font-bold text-blue-600 font-mono text-left">{rep.loanReference}</td>
                        <td className="px-6 py-5 text-sm text-left">
                          <span className="font-bold text-[#04152d] block">{rep.memberName}</span>
                          <span className="text-[10px] font-mono text-gray-400 mt-1 block uppercase tracking-widest">{rep.paymentMethod}</span>
                        </td>
                        <td className="px-6 py-5 text-sm font-black text-[#04152d] text-lg text-left">₱{rep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-5 text-sm text-left text-xs">
                          <span className="text-[#04152d] font-bold">₱{rep.principalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-300 mx-2 font-black">/</span>
                          <span className="text-emerald-600 font-bold">₱{rep.serviceFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-5 text-sm text-left">
                          <button onClick={() => setSelectedLedger({ memberName: rep.memberName, loanReference: rep.loanReference })} className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-2 px-4 rounded-lg text-xs transition-all">
                            <Eye size={14} /> Open Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedRepayments.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium text-left">No repayment records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}