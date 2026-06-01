"use client";

import { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2, Send, Filter, UploadCloud, Terminal, RefreshCw, Layers, Calendar, CreditCard, FileText, BarChart3, Printer } from 'lucide-react';

// --- INITIAL DATA ---
const standardDuesAmount = 500.00;

export default function DuesCollectionPage() {
  const [duesRecords, setDuesRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDuesRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/dues');
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
  
  const [isPosting, setIsPosting] = useState<string | null>(null);

  // Webhook State
  const [webhookData, setWebhookData] = useState({
    transaction_id: `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    member_id: 'M-2026-' + Math.floor(100 + Math.random() * 900),
    full_name: 'Dela Cruz, Juan',
    month_covered: 'May 2026',
    amount: '500.00',
    payment_method: 'Salary Deduction',
    reference_number: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
    fund_to_credit: 'GF'
  });
  const [webhookLogs, setWebhookLogs] = useState<Array<{ timestamp: string; type: string; payload: any }>>([{
    timestamp: new Date().toLocaleTimeString(),
    type: 'SYSTEM_INFO',
    payload: { status: 'ONLINE', message: 'Webhook Listener initialized.' }
  }]);

  // --- FILTERING LOGIC (AC 1) ---
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

  // Extract unique months and methods for dropdowns
  const uniqueMonths = Array.from(new Set(duesRecords.map(r => r.month)));
  const uniqueMethods = Array.from(new Set(duesRecords.map(r => r.method)));

  // --- REPORT AGGREGATION (AC 2) ---
  const reportTotals = useMemo(() => {
    const totalCollected = filteredRecords.reduce((sum, rec) => sum + rec.amountPaid, 0);
    const totalDiscrepancies = filteredRecords.filter(rec => rec.amountPaid !== standardDuesAmount).length;
    const totalConfirmed = filteredRecords.filter(rec => rec.status === 'Confirmed').length;
    return { totalCollected, totalDiscrepancies, totalConfirmed, count: filteredRecords.length };
  }, [filteredRecords]);

  // --- TREASURER: POST & NOTIFY ---
  // Called when Treasurer clicks "Post & Notify" on a Pending dues record.
  // Sends to backend which posts to the fund ledger and notifies the MS.
  const handlePostLedger = async (id: string, name: string) => {
    setIsPosting(id);

    try {
      const response = await fetch(`/api/finance/dues/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const responseData = await response.json();

      // Log to the Webhook Console
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

      if (response.ok) {
        // Refresh table from DB to reflect updated status
        fetchDuesRecords();
        if (responseData.hasDiscrepancy) {
          alert(`⚠️ Posted with DISCREPANCY flagged.\n\nBackend: ${responseData.message}`);
        }
      } else {
        alert(`❌ Failed to post.\n\nError: ${responseData.error}`);
      }

    } catch (error) {
      console.error('Failed to reach confirm API', error);
      setWebhookLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'NETWORK_ERROR',
          payload: String(error)
        },
        ...prev
      ]);
    } finally {
      setIsPosting(null);
    }
  };


  const triggerWebhookSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting('__sim__'); // flag to indicate sending simulator
    
    try {
      const response = await fetch('/api/webhooks/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: webhookData.transaction_id,
          date: webhookData.date,
          memberId: webhookData.member_id,
          fullName: webhookData.full_name,
          monthCovered: webhookData.month_covered,
          amount: parseFloat(webhookData.amount),
          paymentMethod: webhookData.payment_method,
          referenceNumber: webhookData.reference_number,
          fundCredited: webhookData.fund_to_credit
        })
      });

      const responseData = await response.json();

      setWebhookLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: response.ok ? 'WEBHOOK_SUCCESS (201)' : `WEBHOOK_ERROR (${response.status})`,
          payload: responseData
        },
        ...prev
      ]);

      if (response.ok) {
        // Fetch fresh records to reflect new database state
        fetchDuesRecords();
        
        // Reset form to random next
        setWebhookData(prev => ({
          ...prev,
          transaction_id: `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
          reference_number: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
        }));
      }

    } catch (err: any) {
      setWebhookLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'NETWORK_ERROR',
          payload: err.message
        },
        ...prev
      ]);
    } finally {
      setIsPosting(null);
    }
  };

  return (
    <div className="p-8 min-h-screen flex flex-col bg-gray-50 print:p-0 print:bg-white">
      
      {/* Header Area (Hidden on Print) */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 flex-shrink-0 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-[#021124] tracking-tight">Dues Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Review MS remittances, filter records, and generate monthly reports.</p>
        </div>
        {activeTab === 'ledger' && (
          <button className="flex items-center justify-center gap-2 bg-[#021124] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-sm">
            <UploadCloud size={18} strokeWidth={2.5} /> Batch Post to MS
          </button>
        )}
        {activeTab === 'report' && (
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-gray-200 text-[#021124] px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-300 transition-colors shadow-sm">
            <Printer size={18} strokeWidth={2.5} /> Print Report
          </button>
        )}
      </div>

      {/* Tabs (Hidden on Print) */}
      <div className="flex gap-2 border-b border-gray-200 mb-6 print:hidden">
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-white text-[#021124] border-t border-x border-gray-200 shadow-[0_2px_0_white] relative translate-y-px' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <FileText size={16} /> Ledger & Posting
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'report' ? 'bg-white text-[#021124] border-t border-x border-gray-200 shadow-[0_2px_0_white] relative translate-y-px' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <BarChart3 size={16} /> Summary Report
        </button>
      </div>

      {/* FILTER BAR (Visible on both tabs to control the data scope, hidden on print) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center mb-6 print:hidden">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Search Member Name or ID..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#021124] outline-none"
          />
        </div>
        
        {/* AC 1: New Month Filter */}
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#021124] outline-none appearance-none bg-white font-medium">
            <option value="ALL">All Months</option>
            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* AC 1: New Payment Method Filter */}
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#021124] outline-none appearance-none bg-white font-medium">
            <option value="ALL">All Methods</option>
            {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* AC 1: Discrepancy & Status Filter */}
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#021124] outline-none appearance-none bg-white font-medium">
            <option value="ALL">All Status</option>
            <option value="Pending">Pending Review</option>
            <option value="Confirmed">Posted to Ledger</option>
            <option value="DISCREPANCY">⚠️ Discrepancies Only</option>
          </select>
        </div>
      </div>

      {/* ========================================= */}
      {/* TAB 1: LEDGER VIEW (Hidden on Print)      */}
      {/* ========================================= */}
      {activeTab === 'ledger' && (
        <div className="flex flex-col gap-8 flex-1 print:hidden">
          {/* Table Container */}
          <div className="w-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-widest font-bold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Member Details</th>
                    <th className="px-6 py-4">Coverage</th>
                    <th className="px-6 py-4">Method & Ref</th>
                    <th className="px-6 py-4 text-right">Amount Remitted</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ledger Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((rec) => {
                    const isDiscrepancy = rec.amountPaid !== standardDuesAmount;
                    return (
                      <tr key={rec.id} className={`transition-colors ${rec.status === 'Confirmed' ? 'bg-gray-50/50 opacity-70' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{rec.name}</p>
                          <p className="text-xs font-mono text-gray-500 mt-0.5">{rec.memberId}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">{rec.month}</td>
                        <td className="px-6 py-4 text-gray-600">
                          <div>{rec.method}</div>
                          <div className="text-xs font-mono text-blue-600 mt-0.5">{rec.reference_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-mono font-bold text-base ${isDiscrepancy ? (rec.amountPaid < standardDuesAmount ? 'text-red-600' : 'text-orange-600') : 'text-gray-900'}`}>
                              ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            {isDiscrepancy && (
                              <span className="flex items-center gap-1 text-[10px] font-bold mt-1 tracking-wider uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                                <AlertTriangle size={10} /> Discrepancy
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wider border uppercase w-24 ${rec.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                            {rec.status === 'Confirmed' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                            {rec.status === 'Confirmed' ? 'Posted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {rec.status === 'Pending' ? (
                            <button onClick={() => handlePostLedger(rec.id, rec.name)} disabled={isPosting === rec.id} className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md text-xs font-bold transition-colors disabled:opacity-50">
                              {isPosting === rec.id ? 'Posting...' : <><Send size={14} /> Post & Notify</>}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 px-4">Ledger Updated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">No dues records found matching criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhook Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gray-900 rounded-xl text-green-400 p-6 font-mono text-xs flex flex-col shadow-lg overflow-hidden min-h-[300px] border border-gray-800">
              <div className="flex justify-between items-center mb-2 flex-shrink-0 border-b border-gray-800 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Webhook Console Traffic</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {webhookLogs.map((log, index) => (
                  <div key={index} className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap">{log.timestamp} - {log.type}</div>
                ))}
              </div>
            </div>

            <div className="bg-[#021124] text-white p-6 rounded-xl border border-blue-900 shadow-md h-fit">
              <div className="mb-4">
                <span className="bg-blue-600 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full">
                  Integration Simulator
                </span>
                <h2 className="text-xl font-bold mt-2.5">MS Webhook</h2>
                <p className="text-blue-200 text-xs mt-1.5 leading-relaxed">
                  Since MS is not integrated yet, use this panel to simulate receiving a dues posting webhook from the Membership system.
                </p>
              </div>

              <form onSubmit={triggerWebhookSimulation} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Transaction ID</label>
                  <input 
                    type="text" 
                    required 
                    value={webhookData.transaction_id}
                    onChange={(e) => setWebhookData({...webhookData, transaction_id: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Member ID</label>
                    <input 
                      type="text" 
                      required 
                      value={webhookData.member_id}
                      onChange={(e) => setWebhookData({...webhookData, member_id: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Amount (₱)</label>
                    <input 
                      type="number" 
                      required 
                      value={webhookData.amount}
                      onChange={(e) => setWebhookData({...webhookData, amount: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={webhookData.full_name}
                    onChange={(e) => setWebhookData({...webhookData, full_name: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Month Covered</label>
                    <input 
                      type="text" 
                      required 
                      value={webhookData.month_covered}
                      onChange={(e) => setWebhookData({...webhookData, month_covered: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Date</label>
                    <input 
                      type="date" 
                      required 
                      value={webhookData.date}
                      onChange={(e) => setWebhookData({...webhookData, date: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Payment Method</label>
                    <select 
                      value={webhookData.payment_method}
                      onChange={(e) => setWebhookData({...webhookData, payment_method: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                    >
                      <option value="Salary Deduction">Salary Deduction</option>
                      <option value="Online Transfer">Online Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Reference No.</label>
                    <input 
                      type="text" 
                      required 
                      value={webhookData.reference_number}
                      onChange={(e) => setWebhookData({...webhookData, reference_number: e.target.value})}
                      className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Fund Credited</label>
                  <select 
                    value={webhookData.fund_to_credit}
                    onChange={(e) => setWebhookData({...webhookData, fund_to_credit: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="GF">General Fund</option>
                    <option value="UF">Union Fund</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Send size={14} />
                  🚀 Send Mock Webhook
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: SUMMARY REPORT VIEW (AC 2)           */}
      {/* ========================================= */}
      {activeTab === 'report' && (
        <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm w-full max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
          
          {/* Report Header */}
          <div className="text-center mb-10 border-b-2 border-[#021124] pb-6 flex flex-col items-center">
            <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-3" />
            <h2 className="text-xl font-bold bg-[#021124] text-white inline-block px-6 py-1.5 rounded-full uppercase tracking-widest text-sm print:bg-white print:text-[#021124] print:border-2 print:border-[#021124]">
              Monthly Dues Summary Report
            </h2>
            <p className="mt-4 font-bold text-gray-600 uppercase tracking-widest">
              Reporting Period: <span className="text-[#021124]">{filterMonth === 'ALL' ? 'All Data Records' : filterMonth}</span>
            </p>
          </div>

          {/* Aggregate Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Collections</p>
              <p className="text-3xl font-black text-[#021124]">₱{reportTotals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Members Paid</p>
              <p className="text-3xl font-black text-[#021124]">{reportTotals.count}</p>
            </div>
            <div className={`border p-6 rounded-xl text-center ${reportTotals.totalDiscrepancies > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-green-700'}`}>Total Discrepancies</p>
              <p className={`text-3xl font-black ${reportTotals.totalDiscrepancies > 0 ? 'text-red-700' : 'text-green-700'}`}>{reportTotals.totalDiscrepancies}</p>
            </div>
          </div>

          {/* Per-Member Breakdown Table */}
          <h3 className="text-sm font-bold text-[#021124] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Per-Member Collection Breakdown</h3>
          <table className="w-full text-left text-sm mb-12 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-y-2 border-[#021124]">
                <th className="py-3 px-4 text-xs font-bold text-[#021124] uppercase">Member Name & ID</th>
                <th className="py-3 px-4 text-xs font-bold text-[#021124] uppercase">Payment Method</th>
                <th className="py-3 px-4 text-xs font-bold text-[#021124] uppercase text-center">Status</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-[#021124] uppercase">Amount Remitted</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(rec => (
                <tr key={rec.id} className="border-b border-gray-200">
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#021124] block">{rec.name}</span>
                    <span className="text-xs font-mono text-gray-500">{rec.memberId}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{rec.method} <br/><span className="font-mono text-[10px]">{rec.reference_number}</span></td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold uppercase ${rec.status === 'Confirmed' ? 'text-green-600' : 'text-orange-600'}`}>{rec.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#021124]">
                    ₱{rec.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No records to display for this period.</td></tr>
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-16 pt-8 max-w-2xl mx-auto print:mt-12">
            <div>
              <p className="text-xs text-gray-500 mb-10">Prepared & Noted By:</p>
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold text-sm text-[#021124]">Treasurer</p>
                <p className="text-xs text-gray-500">BDOEA Finance</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-10">System Generated On:</p>
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold text-sm text-[#021124]">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-xs text-gray-500">Finance & Dues Module</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}