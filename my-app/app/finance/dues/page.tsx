"use client";

import { useState, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle2, Send, Filter, UploadCloud, Terminal, RefreshCw, HelpCircle, Layers } from 'lucide-react';

// --- INITIAL DATA ---
const standardDuesAmount = 500.00;

const initialDues = [
  { id: 1, transaction_id: 'TXN-MS-881203', memberId: 'M-2023-001', name: 'ALARCO, MICO', month: 'April 2026', amountPaid: 500.00, method: 'Salary Deduction', reference_number: 'REF-8812', fund_to_credit: 'General Fund', status: 'Pending' },
  { id: 2, transaction_id: 'TXN-MS-451992', memberId: 'M-2023-045', name: 'ZEN, SHEN', month: 'April 2026', amountPaid: 500.00, method: 'Online Transfer', reference_number: 'REF-9921', fund_to_credit: 'Union Fund', status: 'Pending' },
  // Discrepancy: Underpaid
  { id: 3, transaction_id: 'TXN-MS-112349', memberId: 'M-2024-112', name: 'SIDI, EYBI', month: 'April 2026', amountPaid: 250.00, method: 'Cash', reference_number: 'REF-0012', fund_to_credit: 'General Fund', status: 'Pending' },
  { id: 4, transaction_id: 'TXN-MS-998822', memberId: 'M-2022-088', name: 'KU, JUSS', month: 'April 2026', amountPaid: 500.00, method: 'Salary Deduction', reference_number: 'REF-8210', fund_to_credit: 'General Fund', status: 'Confirmed' },
  // Discrepancy: Overpaid (Advance Payment)
  { id: 5, transaction_id: 'TXN-MS-331290', memberId: 'M-2025-019', name: 'VINLUAN, VEN', month: 'April 2026', amountPaid: 1000.00, method: 'Online Transfer', reference_number: 'REF-4902', fund_to_credit: 'Loans', status: 'Pending' },
];

export default function DuesCollectionPage() {
  const [duesRecords, setDuesRecords] = useState(initialDues);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isPosting, setIsPosting] = useState<number | null>(null);

  // Webhook form state
  const [webhookData, setWebhookData] = useState({
    transaction_id: `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    member_id: 'M-2026-' + Math.floor(100 + Math.random() * 900),
    full_name: 'Dela Cruz, Juan',
    month_covered: 'May 2026',
    amount: '500.00',
    payment_method: 'Salary Deduction',
    reference_number: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
    fund_to_credit: 'General Fund'
  });

  // Webhook Logs Console
  const [webhookLogs, setWebhookLogs] = useState<Array<{ timestamp: string; type: string; payload: any }>>([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM_INFO',
      payload: { status: 'ONLINE', message: 'Webhook Listener initialized. Listening on MS endpoint /api/webhooks/dues (Mocked)' }
    }
  ]);

  // --- FILTERING LOGIC ---
  const filteredRecords = useMemo(() => {
    return duesRecords.filter(record => {
      const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.memberId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' ? true : 
                            filterStatus === 'DISCREPANCY' ? record.amountPaid !== standardDuesAmount :
                            record.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [duesRecords, searchTerm, filterStatus]);

  // --- HANDLERS (Fulfills the specific backlog requirement) ---
  const handlePostLedger = (id: number, name: string) => {
    setIsPosting(id);
    const record = duesRecords.find(r => r.id === id);

    setTimeout(() => {
      setDuesRecords(prev => prev.map(rec => 
        rec.id === id ? { ...rec, status: 'Confirmed' } : rec
      ));
      setIsPosting(null);
      
      if (record) {
        // Send confirmation output payload mock to MS
        const responsePayload = {
          status: 'SUCCESS',
          http_code: 200,
          posted_at: new Date().toISOString(),
          transaction_id: record.transaction_id,
          member_id: record.memberId,
          reference_number: record.reference_number,
          posted_amount: record.amountPaid,
          fund_credited: record.fund_to_credit,
          message: `Confirmation successfully returned. Ledger entry debited to ${record.fund_to_credit}.`
        };

        setWebhookLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'CONFIRMATION_RESPONSE_OUT',
            payload: responsePayload
          },
          ...prev
        ]);
        
        alert(`Ledger entry inserted for ${name} under ${record.fund_to_credit}. \nConfirmation signal sent back to MS (Membership System) successfully.`);
      }
    }, 800);
  };

  const handleBatchPost = () => {
    const pendingRecords = filteredRecords.filter(r => r.status === 'Pending');
    if (pendingRecords.length === 0) return;
    
    if(confirm(`Are you sure you want to post ${pendingRecords.length} ledger entries and notify the MS for all?`)) {
      setDuesRecords(prev => prev.map(rec => 
        pendingRecords.some(p => p.id === rec.id) ? { ...rec, status: 'Confirmed' } : rec
      ));

      pendingRecords.forEach(record => {
        const responsePayload = {
          status: 'SUCCESS',
          http_code: 200,
          posted_at: new Date().toISOString(),
          transaction_id: record.transaction_id,
          member_id: record.memberId,
          reference_number: record.reference_number,
          posted_amount: record.amountPaid,
          fund_credited: record.fund_to_credit,
          message: `Batch Posted Confirmation sent to MS.`
        };

        setWebhookLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'CONFIRMATION_RESPONSE_OUT',
            payload: responsePayload
          },
          ...prev
        ]);
      });
    }
  };

  // --- TRIGGER SIMULATED WEBHOOK ---
  const triggerWebhookSimulation = (e: React.FormEvent) => {
    e.preventDefault();

    const newRecord = {
      id: Date.now(),
      transaction_id: webhookData.transaction_id,
      memberId: webhookData.member_id,
      name: webhookData.full_name.toUpperCase(),
      month: webhookData.month_covered,
      amountPaid: parseFloat(webhookData.amount) || 0,
      method: webhookData.payment_method,
      reference_number: webhookData.reference_number,
      fund_to_credit: webhookData.fund_to_credit,
      status: 'Pending'
    };

    // Add to Local State list
    setDuesRecords(prev => [newRecord, ...prev]);

    // Append Incoming webhook to console logs
    const incomingPayload = {
      event: 'member.dues.remitted',
      timestamp: new Date().toISOString(),
      payload: {
        transaction_id: webhookData.transaction_id,
        date: webhookData.date,
        member_id: webhookData.member_id,
        full_name: webhookData.full_name.toUpperCase(),
        month_covered: webhookData.month_covered,
        amount: parseFloat(webhookData.amount) || 0,
        payment_method: webhookData.payment_method,
        reference_number: webhookData.reference_number,
        fund_to_credit: webhookData.fund_to_credit
      }
    };

    setWebhookLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        type: 'INCOMING_WEBHOOK_IN',
        payload: incomingPayload
      },
      ...prev
    ]);

    // Regenerate unique IDs for next simulation
    setWebhookData(prev => ({
      ...prev,
      transaction_id: `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
      reference_number: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
    }));
  };

  const clearLogs = () => {
    setWebhookLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        type: 'SYSTEM_INFO',
        payload: { status: 'ONLINE', message: 'Webhook console cleared.' }
      }
    ]);
  };

  return (
    <div className="p-8 min-h-screen flex flex-col bg-gray-50">
      
      {/* Header Area */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dues Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Review MS remittances, handle discrepancies, and post ledger entries.</p>
        </div>
        <button 
          onClick={handleBatchPost}
          className="flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm"
        >
          <UploadCloud size={18} strokeWidth={2.5} /> Batch Post to MS
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* Left Column: Dues Table */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Controls inside table wrapper */}
          <div className="bg-white p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center flex-shrink-0">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" placeholder="Search Member Name or ID..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-shadow"
              />
            </div>
            
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select 
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none appearance-none bg-white font-medium"
              >
                <option value="ALL">All Records</option>
                <option value="Pending">Pending Review</option>
                <option value="Confirmed">Posted to Ledger</option>
                <option value="DISCREPANCY">⚠️ Discrepancies Only</option>
              </select>
            </div>

            {/* Global Standard Amount Indicator */}
            <div className="px-4 py-1.5 bg-gray-100 rounded-lg border border-gray-200 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">System Standard:</span>
              <span className="font-mono font-bold text-gray-900">₱{standardDuesAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-[500px]">
            <table className="w-full text-left text-sm relative">
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
                        <span className="text-[10px] text-gray-400 block mt-1 font-mono">TXN: {rec.transaction_id}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{rec.month}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{rec.method}</div>
                        <div className="text-xs font-mono text-blue-600 mt-0.5">{rec.reference_number || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Layers size={10} /> Credit to: {rec.fund_to_credit || 'General Fund'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        {/* Flagging logic per your requirement */}
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-bold text-base ${isDiscrepancy ? (rec.amountPaid < standardDuesAmount ? 'text-red-600' : 'text-orange-600') : 'text-gray-900'}`}>
                            ₱{rec.amountPaid.toFixed(2)}
                          </span>
                          {isDiscrepancy && (
                            <span className="flex items-center gap-1 text-[10px] font-bold mt-1 tracking-wider uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                              <AlertTriangle size={10} /> Discrepancy
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wider border uppercase ${
                          rec.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {rec.status === 'Confirmed' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {rec.status === 'Confirmed' ? 'Posted' : 'Pending'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {rec.status === 'Pending' ? (
                          <button 
                            onClick={() => handlePostLedger(rec.id, rec.name)}
                            disabled={isPosting === rec.id}
                            className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {isPosting === rec.id ? 'Posting...' : <><Send size={14} /> Post & Notify MS</>}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">Ledger Updated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      No dues records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Webhook Simulator & Monitor */}
        <div className="w-full lg:w-96 flex flex-col gap-6 flex-shrink-0">
          
          {/* Webhook Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-md font-bold text-gray-900 flex items-center gap-2 mb-2">
              <span className="bg-purple-100 text-purple-700 p-1.5 rounded-lg"><Terminal size={16} /></span>
              MS Webhook Simulator
            </h2>
            <p className="text-xs text-gray-500 mb-4">Simulate an incoming JSON payload sent from the Membership System (MS).</p>

            <form onSubmit={triggerWebhookSimulation} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Transaction ID</label>
                <input 
                  type="text" value={webhookData.transaction_id} readOnly 
                  className="w-full p-2 border border-gray-200 rounded text-xs font-mono bg-gray-50 text-gray-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member ID</label>
                  <input 
                    type="text" value={webhookData.member_id} onChange={e => setWebhookData({...webhookData, member_id: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs" required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Coverage Month</label>
                  <input 
                    type="text" value={webhookData.month_covered} onChange={e => setWebhookData({...webhookData, month_covered: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs" required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Member Full Name</label>
                <input 
                  type="text" value={webhookData.full_name} onChange={e => setWebhookData({...webhookData, full_name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-xs" required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount Paid (₱)</label>
                  <input 
                    type="number" step="0.01" value={webhookData.amount} onChange={e => setWebhookData({...webhookData, amount: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs font-mono" required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                  <select 
                    value={webhookData.payment_method} onChange={e => setWebhookData({...webhookData, payment_method: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option>Salary Deduction</option>
                    <option>Online Transfer</option>
                    <option>Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ref Number</label>
                  <input 
                    type="text" value={webhookData.reference_number} onChange={e => setWebhookData({...webhookData, reference_number: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs font-mono" required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fund to Credit</label>
                  <select 
                    value={webhookData.fund_to_credit} onChange={e => setWebhookData({...webhookData, fund_to_credit: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-xs bg-white font-bold"
                  >
                    <option>General Fund</option>
                    <option>Union Fund</option>
                    <option>Loans</option>
                    <option>Foreign Assistance</option>
                    <option>Death Assistance</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <RefreshCw size={14} /> Send Webhook Event
              </button>
            </form>
          </div>

          {/* Webhook Traffic Monitor */}
          <div className="bg-gray-900 rounded-xl text-green-400 p-6 font-mono text-xs flex-1 flex flex-col shadow-lg overflow-hidden min-h-[300px] border border-gray-800">
            <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-gray-800 pb-2">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider flex items-center gap-1.5 uppercase">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                Webhook Console Traffic
              </span>
              <button onClick={clearLogs} className="text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase">Clear</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {webhookLogs.map((log, index) => (
                <div key={index} className="border-b border-gray-800/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                    <span>{log.timestamp}</span>
                    <span className={`font-bold px-1 rounded ${
                      log.type === 'INCOMING_WEBHOOK_IN' ? 'bg-purple-950 text-purple-400' :
                      log.type === 'CONFIRMATION_RESPONSE_OUT' ? 'bg-green-950 text-green-400' : 'bg-gray-850 text-gray-400'
                    }`}>{log.type}</span>
                  </div>
                  <pre className="overflow-x-auto text-[10px] text-gray-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}