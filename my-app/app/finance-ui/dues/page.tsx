"use client";

import { useState, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle2, Send, Filter, UploadCloud } from 'lucide-react';

// --- MOCK DATABASE (Simulating payload from Membership System) ---
const standardDuesAmount = 500.00; // This would typically come from your System Config

const initialDues = [
  { id: 1, memberId: 'M-2023-001', name: 'ALARCO, MICO', month: 'April 2026', amountPaid: 500.00, method: 'Salary Deduction', status: 'Pending' },
  { id: 2, memberId: 'M-2023-045', name: 'ZEN, SHEN', month: 'April 2026', amountPaid: 500.00, method: 'Online Transfer', status: 'Pending' },
  // Discrepancy: Underpaid
  { id: 3, memberId: 'M-2024-112', name: 'SIDI, EYBI', month: 'April 2026', amountPaid: 250.00, method: 'Cash', status: 'Pending' },
  { id: 4, memberId: 'M-2022-088', name: 'KU, JUSS', month: 'April 2026', amountPaid: 500.00, method: 'Salary Deduction', status: 'Confirmed' },
  // Discrepancy: Overpaid (Advance Payment)
  { id: 5, memberId: 'M-2025-019', name: 'VINLUAN, VEN', month: 'April 2026', amountPaid: 1000.00, method: 'Online Transfer', status: 'Pending' },
];

export default function DuesCollectionPage() {
  const [duesRecords, setDuesRecords] = useState(initialDues);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isPosting, setIsPosting] = useState<number | null>(null);

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

    // MOCK API DELAY: Simulating inserting to Ledger AND sending confirmation to MS
    setTimeout(() => {
      setDuesRecords(duesRecords.map(rec => 
        rec.id === id ? { ...rec, status: 'Confirmed' } : rec
      ));
      setIsPosting(null);
      
      // Temporary alert to prove the MS signal works
      alert(`Ledger entry inserted for ${name}. \nConfirmation signal sent back to MS (Membership System) successfully.`);
    }, 800);
  };

  const handleBatchPost = () => {
    const pendingIds = filteredRecords.filter(r => r.status === 'Pending').map(r => r.id);
    if (pendingIds.length === 0) return;
    
    if(confirm(`Are you sure you want to post ${pendingIds.length} ledger entries and notify the MS?`)) {
      setDuesRecords(duesRecords.map(rec => 
        pendingIds.includes(rec.id) ? { ...rec, status: 'Confirmed' } : rec
      ));
    }
  };

  return (
    <div className="p-8 h-full flex flex-col min-h-0 bg-gray-50">
      
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

      {/* Control Bar & Metrics */}
      <div className="bg-white p-4 rounded-t-xl shadow-sm border border-gray-200 border-b-0 flex flex-wrap gap-4 items-center flex-shrink-0">
        <div className="flex-1 min-w-[250px] relative">
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

      {/* Main Table */}
      <div className="bg-white shadow-sm border border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden rounded-b-xl">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3.5">Member Details</th>
                <th className="px-6 py-3.5">Coverage</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5 text-right">Amount Remitted</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Ledger Action</th>
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
                    <td className="px-6 py-4 text-gray-600">{rec.method}</td>
                    
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
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wider border ${
                        rec.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {rec.status === 'Confirmed' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {rec.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {rec.status === 'Pending' ? (
                        <button 
                          onClick={() => handlePostLedger(rec.id, rec.name)}
                          disabled={isPosting === rec.id}
                          className="inline-flex items-center gap-1.5 bg-bdoea-yellow hover:bg-yellow-500 text-black px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
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

    </div>
  );
}