"use client";

import { useState } from 'react';
import { CheckCircle, Eye, Printer, X, FileText, Clock, Check } from 'lucide-react';

// --- MOCK DATABASE ---
// Backend Devs: Replace this with a GET fetch to your /api/finance/disbursements route
const initialDisbursements = [
  { id: 'DISB-2026-001', memberName: 'Aza Wanimari', loanType: 'Emergency Loan', amount: 15000.00, requestDate: '2026-05-20', status: 'Pending' },
  { id: 'DISB-2026-002', memberName: 'Arawga Bi', loanType: 'Provident Loan', amount: 50000.00, requestDate: '2026-05-21', status: 'Pending' },
  { id: 'DISB-2026-003', memberName: 'Wala Ngano', loanType: 'Calamity Loan', amount: 20000.00, requestDate: '2026-05-22', status: 'Completed' },
];

export default function DisbursementPage() {
  const [disbursements, setDisbursements] = useState(initialDisbursements);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // --- BACKEND ACTION: CONFIRM DISBURSEMENT ---
  const handleConfirm = async (id: string) => {
    setIsProcessing(id);
    
    // Backend Devs: Add your POST/PUT request here to update the DB and debit the Loans Fund
    // await fetch(`/api/finance/disbursements/${id}/confirm`, { method: 'POST' });
    
    setTimeout(() => {
      setDisbursements(prev => 
        prev.map(d => d.id === id ? { ...d, status: 'Completed' } : d)
      );
      setIsProcessing(null);
    }, 800); // Simulated network delay
  };

  return (
    <div className="p-8 max-w-7xl mx-auto print:p-0 print:m-0">
      
      {/* --- DASHBOARD VIEW (Hidden when printing) --- */}
      <div className="print:hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#021124] tracking-tight">Disbursement Queue</h1>
          <p className="text-gray-500 mt-1 font-medium">Review and confirm pending loan disbursements from the Loan App Module.</p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase">Total Requests</p>
              <p className="text-2xl font-black text-[#021124]">{disbursements.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase">Pending Confirmation</p>
              <p className="text-2xl font-black text-[#021124]">
                {disbursements.filter(d => d.status === 'Pending').length}
              </p>
            </div>
          </div>
        </div>

        {/* DISBURSEMENT TABLE */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4">Reference ID</th>
                  <th className="p-4">Payee (Member)</th>
                  <th className="p-4">Loan Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date Requested</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {disbursements.map((disb) => (
                  <tr key={disb.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono font-medium text-[#021124]">{disb.id}</td>
                    <td className="p-4 font-bold">{disb.memberName}</td>
                    <td className="p-4 text-gray-600">{disb.loanType}</td>
                    <td className="p-4 font-bold text-green-700">₱{disb.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-gray-500">{disb.requestDate}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-max ${
                        disb.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {disb.status === 'Pending' ? <Clock size={12} /> : <CheckCircle size={12} />}
                        {disb.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* VIEW VOUCHER BUTTON */}
                        <button 
                          onClick={() => setSelectedVoucher(disb)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Voucher"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {/* CONFIRM DISBURSEMENT BUTTON (Only visible if pending) */}
                        {disb.status === 'Pending' && (
                          <button 
                            onClick={() => handleConfirm(disb.id)}
                            disabled={isProcessing === disb.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#021124] text-white rounded-md text-xs font-bold hover:bg-black transition-colors disabled:opacity-50"
                          >
                            {isProcessing === disb.id ? 'Processing...' : <><Check size={14} /> Confirm</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL / PRINTABLE VOUCHER VIEW --- */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:bg-white print:static print:block print:inset-auto">
          
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:mx-auto">
            
            {/* Modal Header (Hidden on print) */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 print:hidden">
              <h2 className="font-bold text-lg text-[#021124]">Disbursement Voucher Details</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#021124] rounded-lg text-sm font-bold transition-colors"
                >
                  <Printer size={16} /> Print / Save PDF
                </button>
                <button onClick={() => setSelectedVoucher(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* VOUCHER CONTENT (This is the only part that prints) */}
            <div className="p-10 overflow-y-auto print:p-0">
              
              {/* Voucher Header */}
              <div className="text-center mb-10 border-b-2 border-[#021124] pb-6 flex flex-col items-center">
                {/* Logo added here */}
                <img 
                  src="/bdoea-logo-blue.png" 
                  alt="BDOEA Logo" 
                  className="h-16 object-contain mb-3" 
                />
                <p className="text-sm text-gray-500 font-medium">BANCO DE ORO EMPLOYEES ASSOCIATION (BDOEA)<br/>Ortigas Avenue , San Juan, Philippines</p>
                
                <h2 className="mt-6 text-xl font-bold bg-[#021124] text-white inline-block px-6 py-1.5 rounded-full uppercase tracking-widest text-sm print:bg-white print:text-[#021124] print:border-2 print:border-[#021124]">
                  Disbursement Voucher
                </h2>
              </div>

              {/* Voucher Details Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10 text-sm">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Voucher No.</p>
                  <p className="font-mono font-bold text-lg text-[#021124]">{selectedVoucher.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="font-bold text-[#021124]">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payee</p>
                  <p className="font-black text-xl text-[#021124] border-b border-gray-300 pb-1">{selectedVoucher.memberName}</p>
                </div>
              </div>

              {/* Transaction Table */}
              <table className="w-full mb-12 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-y-2 border-[#021124]">
                    <th className="py-3 px-4 text-left text-xs font-bold text-[#021124] uppercase">Particulars / Description</th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-[#021124] uppercase">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-medium text-gray-800">
                      Disbursement for approved <span className="font-bold text-[#021124]">{selectedVoucher.loanType}</span>. <br/>
                      <span className="text-xs text-gray-500 italic">Charge to: Loans Fund</span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-lg">
                      ₱{selectedVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div>
                  <p className="text-xs text-gray-500 mb-8">Prepared By:</p>
                  <div className="border-t border-black pt-2 text-center">
                    <p className="font-bold text-sm text-[#021124]">Loan App System</p>
                    <p className="text-xs text-gray-500">Automated Module</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-8">Confirmed By:</p>
                  <div className="border-t border-black pt-2 text-center">
                    <p className="font-bold text-sm text-[#021124]">Treasurer</p>
                    <p className="text-xs text-gray-500">BDOEA Finance</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-8">Received By:</p>
                  <div className="border-t border-black pt-2 text-center">
                    <p className="font-bold text-sm text-[#021124]">{selectedVoucher.memberName}</p>
                    <p className="text-xs text-gray-500">Member / Payee</p>
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