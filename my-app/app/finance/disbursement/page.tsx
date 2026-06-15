// app/finance/disbursement/page.tsx
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, Eye, Printer, X, FileText, Clock, Check, Send, 
  AlertTriangle, Download, Loader, Ban, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

interface Disbursement {
  id: string;
  loanReference: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  paymentDetails: string;
  status: string;
  authorizedBy: string | null;
  createdAt: string;
  rejectedReason?: string;
  reason?: string; 
}

export default function DisbursementPage() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Disbursement | null>(null);
  const [selectedForAction, setSelectedForAction] = useState<Disbursement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  // --- Modals State ---
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch Disbursements Queue
  const fetchDisbursements = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/disbursements`);
      if (res.ok) {
        const data = await res.json();
        setDisbursements(data);
      }
    } catch (err) {
      console.error('Error fetching disbursements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisbursements();
  }, []);

  // --- Pagination Logic ---
  const totalPages = Math.max(1, Math.ceil(disbursements.length / itemsPerPage));
  const paginatedDisbursements = disbursements.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // --- DIRECT PDF DOWNLOAD ---
  const downloadVoucherPDF = async () => {
    if (!selectedVoucher) return;
    setIsGeneratingPDF(true);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '820px';
    iframe.style.height = '1150px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    try {
      let logoBase64 = '';
      try {
        const logoRes = await fetch('/bdoea-logo-blue.png');
        if (logoRes.ok) {
          const blob = await logoRes.blob();
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.error('Failed to load logo in Base64:', err);
      }

      const postingDate = new Date(selectedVoucher.createdAt).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const amount = selectedVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
      
      // Clean the title from the name for the signature block
      const authorizedByRaw = selectedVoucher.authorizedBy || 'PENDING';
      const cleanAuthorizedBy = authorizedByRaw.replace(/Treasurer\s+/i, '');
      
      const voucherHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Disbursement Voucher</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; padding: 30px; font-size: 13px; }
    .voucher-container { border: 1px solid #cbd5e1; padding: 40px; border-radius: 12px; position: relative; }
    .voucher-container::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #021124 0%, #005a9c 50%, #e6b012 100%); border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 22px; margin-bottom: 28px; }
    .logo-container { display: flex; justify-content: center; margin-bottom: 12px; }
    .logo { height: 55px; object-fit: contain; }
    .org-name { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #021124; }
    .title-badge { display: inline-block; margin-top: 16px; background: #021124; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; padding: 6px 28px; border-radius: 30px; border: 2px solid #e6b012; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; margin-bottom: 28px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .value { font-weight: 700; font-size: 13px; color: #021124; }
    .payee-block { grid-column: 1 / -1; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead th { background: #021124; padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ffffff; }
    tbody td { padding: 18px 16px; border-bottom: 1px solid #cbd5e1; }
    .amount-cell { text-align: right; font-size: 22px; font-weight: 900; color: #15803d; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
    .sig-block { text-align: center; }
    .sig-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #04152d; margin-bottom: 50px; letter-spacing: 1px; }
    .sig-line { border-top: 1px solid #04152d; padding-top: 8px; width: 100%; }
    .name { font-size: 11px; font-weight: 800; color: #04152d; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 10px; font-weight: 700; color: #04152d; text-transform: uppercase; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="voucher-container">
    <div class="header">
      ${logoBase64 ? `<div class="logo-container"><img src="${logoBase64}" alt="Logo" class="logo" /></div>` : ''}
      <div class="org-name">Banco de Oro Employees Association (BDOEA)</div>
      <div class="title-badge">Disbursement Voucher</div>
    </div>
    <div class="details-grid">
      <div><div class="label">Voucher Reference</div><div class="value">${selectedVoucher.id}</div></div>
      <div><div class="label">Posting Date</div><div class="value">${postingDate}</div></div>
      <div class="payee-block"><div class="label">Payee</div><div class="value">${selectedVoucher.memberName}</div></div>
    </div>
    <table>
      <thead><tr><th>Particulars</th><th style="text-align: right;">Amount (PHP)</th></tr></thead>
      <tbody>
        <tr><td>Disbursement release for loan ${selectedVoucher.loanReference}.</td><td class="amount-cell">₱${amount}</td></tr>
      </tbody>
    </table>
    
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-label">Prepared By</div>
        <div class="sig-line">
          <div class="name">Loan App System</div>
          <div class="title">LAS Authorized Personnel</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Confirmed By</div>
        <div class="sig-line">
          <div class="name">${cleanAuthorizedBy}</div>
          <div class="title">Treasurer</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Received By Payee</div>
        <div class="sig-line">
          <div class="name">${selectedVoucher.memberName}</div>
          <div class="title">Member</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      
      doc.open();
      doc.write(voucherHTML);
      doc.close();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(doc.body, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const imgWidth = pageWidth - (margin * 2); 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`Disbursement-Voucher-${selectedVoucher.loanReference}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      setIsGeneratingPDF(false);
    }
  };

  const printVoucher = () => window.print();

  // --- ACTIONS (ACCEPT / REJECT) ---
  const triggerAccept = (disb: Disbursement) => {
    setSelectedForAction(disb);
    setActionModal({
      isOpen: true,
      title: 'Authorize Disbursement',
      message: `You are about to authorize the release of ₱${disb.amount.toLocaleString()} to ${disb.memberName} (Ref: ${disb.loanReference}). This action cannot be undone. Proceed?`,
      status: 'idle'
    });
  };

  const handleAcceptConfirm = async () => {
    if (!selectedForAction) return;
    setActionModal(prev => ({ ...prev, status: 'loading' }));
    
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/disbursements/${selectedForAction.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizedBy: 'Treasurer Romalyn Amante' })
      });
      
      if (res.ok) {
        await fetchDisbursements();
        setActionModal({
          isOpen: true,
          title: 'Authorization Successful',
          message: '',
          status: 'success',
          resultMsg: `Disbursement ${selectedForAction.loanReference} has been successfully authorized.`
        });
      } else {
        throw new Error("Backend failed to confirm");
      }
    } catch (err) {
      console.error('Error confirming disbursement:', err);
      setActionModal({ isOpen: true, title: 'Authorization Failed', message: '', status: 'error', resultMsg: 'An error occurred while confirming the disbursement.' });
    }
  };

  const triggerReject = (disb: Disbursement) => {
    setSelectedForAction(disb);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForAction || !rejectReason.trim()) return;
    
    setIsRejecting(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/disbursements/${selectedForAction.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason, authorizedBy: 'Treasurer Romalyn Amante' })
      });
      
      if (res.ok) {
        setDisbursements(prev => prev.map(d => 
          d.id === selectedForAction.id 
            ? { ...d, status: 'REJECTED', rejectedReason: rejectReason, authorizedBy: 'Treasurer Romalyn Amante' } 
            : d
        ));
        
        await fetchDisbursements();
        
        setDisbursements(prev => prev.map(d => 
          d.id === selectedForAction.id 
            ? { ...d, status: 'REJECTED', rejectedReason: d.rejectedReason || d.reason || rejectReason, authorizedBy: d.authorizedBy || 'Treasurer Romalyn Amante' } 
            : d
        ));

        setIsRejectModalOpen(false);
        setActionModal({
          isOpen: true,
          title: 'Disbursement Rejected',
          message: '',
          status: 'success',
          resultMsg: `The disbursement request for ${selectedForAction.memberName} has been rejected.`
        });
      } else {
        throw new Error("Backend failed to reject the disbursement request.");
      }
    } catch (err: any) {
      console.error('Error rejecting disbursement:', err);
      setIsRejectModalOpen(false);
      setActionModal({
        isOpen: true,
        title: 'Rejection Failed',
        message: '',
        status: 'error',
        resultMsg: err.message || 'An error occurred while rejecting the disbursement request.'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const pendingCount = disbursements.filter(d => d.status === 'PENDING').length;
  const completedCount = disbursements.filter(d => d.status === 'COMPLETED').length;
  const rejectedCount = disbursements.filter(d => d.status === 'REJECTED').length;
  const chartData = [
    { name: 'Pending Review', value: pendingCount, fill: '#facc15' }, 
    { name: 'Completed', value: completedCount, fill: '#10b981' },
    { name: 'Rejected', value: rejectedCount, fill: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col min-h-screen relative">
      
      <div className={selectedVoucher ? "print:hidden" : ""}>
        <ActionModal 
          isOpen={actionModal.isOpen}
          title={actionModal.title}
          message={actionModal.message}
          status={actionModal.status}
          resultMsg={actionModal.resultMsg}
          onConfirm={actionModal.status === 'idle' ? handleAcceptConfirm : () => setActionModal({ ...actionModal, isOpen: false })}
          onClose={() => setActionModal({ ...actionModal, isOpen: false })}
          confirmText="Authorize Disbursement"
        />

        {isRejectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
                <h3 className="font-black text-lg text-[#04152d] flex items-center gap-2">
                  <Ban size={20} className="text-red-500" /> Reject Disbursement
                </h3>
                <button 
                  onClick={() => setIsRejectModalOpen(false)} disabled={isRejecting}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleRejectConfirm} className="p-6 space-y-4">
                <p className="text-sm font-medium text-gray-600">
                  You are about to reject the disbursement for <span className="font-bold text-[#04152d]">{selectedForAction?.memberName}</span>. Please provide a reason for this rejection.
                </p>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Reason for Rejection</label>
                  <textarea 
                    required value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="E.g., Invalid bank details provided..."
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10 outline-none transition-colors font-medium text-[#04152d] resize-none"
                  />
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsRejectModalOpen(false)} disabled={isRejecting} className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isRejecting || !rejectReason.trim()} className="inline-flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(153,27,27,0.45),0_4px_18px_rgba(220,38,38,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(153,27,27,0.45),0_2px_8px_rgba(220,38,38,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isRejecting ? <><Loader size={16} className="animate-spin" /> Rejecting...</> : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Header />

        <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 print:p-0 print:m-0 print:max-w-none">
          <div className="flex flex-col gap-6 mb-8 w-full">
              
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><FileText size={24} /></div>
                  <div>
                    <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Requests</p>
                    <p className="text-3xl font-black text-[#04152d]">{disbursements.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={24} /></div>
                  <div>
                    <p className="block text-xs font-black text-amber-600 uppercase tracking-[0.12em] mb-0.5">Pending Review</p>
                    <p className="text-3xl font-black text-[#04152d]">{pendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
                {chartData.length > 0 ? (
                  <div className="w-full h-[80px] flex items-center justify-between">
                    <div className="h-[80px] w-[80px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <PieChart>
                          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={3} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#04152d' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {chartData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }}></div>
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400">No Chart Data</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col min-h-[400px] w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#04152d]">Treasurer Confirmation Queue</h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">Real-Time Sync</span>
              </div>
              
              <div className="overflow-x-auto w-full">
                {isLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-gray-500">
                    <Loader size={32} className="animate-spin mb-4 text-[#04152d]" />
                    <p className="font-bold">Loading records...</p>
                  </div>
                ) : disbursements.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-gray-400">
                    <AlertTriangle className="mb-4 text-amber-400" size={48} />
                    <p className="font-black text-[#04152d] text-lg">No requests found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff]">Reference</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff]">Payee (Member)</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff] text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff]">Bank Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff] text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide bg-[#f8faff] text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedDisbursements.map((disb) => (
                        <tr key={disb.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                          
                          <td className="px-6 py-5 text-sm text-gray-700">
                            <div className="font-mono font-medium text-[#04152d]">{disb.loanReference}</div>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{disb.id.substring(0, 8)}...</span>
                          </td>
                          
                          <td className="px-6 py-5 text-sm text-gray-700">
                            <div className="font-medium text-[#04152d]">{disb.memberName}</div>
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">ID: {disb.memberId}</span>
                          </td>
                          
                          <td className="px-6 py-5 text-sm text-right font-semibold text-emerald-600">
                            ₱{disb.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          
                          <td className="px-6 py-5 text-sm text-gray-700">
                            <div className="font-mono text-xs font-medium text-[#04152d]">{disb.bankAccount}</div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{disb.paymentMethod}</span>
                          </td>
                          
                          <td className="px-6 py-5 text-center text-sm">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                              disb.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 
                              disb.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200/50' : 
                              'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            }`}>
                              {disb.status}
                            </span>
                          </td>
                          
                          <td className="px-6 py-5 text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => setSelectedVoucher(disb)}
                                className="text-gray-400 hover:text-[#04152d] hover:bg-gray-100 p-2 rounded-xl transition-all duration-150"
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                              
                              {disb.status === 'PENDING' && (
                                <>
                                  <button 
                                    onClick={() => triggerAccept(disb)}
                                    className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-xl transition-all duration-150"
                                    title="Authorize"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button 
                                    onClick={() => triggerReject(disb)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150"
                                    title="Reject"
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
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
        </main>
      </div>

      {/* --- MODAL / PRINTABLE VOUCHER VIEW --- */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm print:bg-transparent print:static print:block print:inset-auto animate-fade-in p-4 print:p-0">
          <div className="bg-white w-full max-w-3xl rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:mx-auto animate-pop overflow-hidden print:overflow-visible">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100 print:hidden bg-gray-50/80">
              <h2 className="font-black text-xl text-[#04152d]">Disbursement Details</h2>
              <div className="flex gap-3">
                {selectedVoucher.status === 'COMPLETED' && (
                  <>
                    <button onClick={printVoucher} className="inline-flex items-center justify-center gap-2 border-2 border-[#04152d] text-[#04152d] hover:bg-[#04152d] hover:text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150"><Printer size={16} /> Print</button>
                    <button onClick={downloadVoucherPDF} disabled={isGeneratingPDF} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_5px_0_rgba(5,70,40,0.45),0_4px_14px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:shadow-[0_1px_0_rgba(5,70,40,0.45),0_1px_6px_rgba(16,185,129,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {isGeneratingPDF ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> PDF</>}
                    </button>
                  </>
                )}
                <button onClick={() => { setSelectedVoucher(null); setJustConfirmed(false); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"><X size={24} /></button>
              </div>
            </div>

            <div ref={voucherRef} className="p-8 md:p-12 overflow-y-auto print:p-0 bg-white print:overflow-visible">
              
              {selectedVoucher.status === 'REJECTED' && (
                <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)] print:hidden">
                  <Ban size={24} className="text-red-600 shrink-0" />
                  <div>
                    <p className="text-red-800 font-black text-base">Disbursement Request Rejected</p>
                    <p className="text-red-700 text-sm mt-1.5 font-medium">Reason: {selectedVoucher.rejectedReason || selectedVoucher.reason || 'No reason provided.'}</p>
                  </div>
                </div>
              )}

              <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 flex flex-col items-center">
                <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-4" />
                <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Banco de Oro Employees Association</p>
                <h2 className="mt-6 text-lg font-black bg-[#04152d] text-white inline-block px-8 py-2 rounded-full uppercase tracking-widest text-xs shadow-md print:bg-white print:text-[#04152d] print:border-2 print:border-[#04152d] print:shadow-none">
                  Disbursement Voucher
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10 text-sm bg-[#f8faff] p-6 rounded-2xl border border-gray-100">
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Voucher Reference</p><p className="font-mono font-bold text-sm text-[#04152d]">{selectedVoucher.id}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Posting Date</p><p className="font-medium text-[#04152d]">{new Date(selectedVoucher.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Loan Reference Code</p><p className="font-mono font-medium text-[#04152d] text-base">{selectedVoucher.loanReference}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Disbursement Method</p><p className="font-medium text-blue-700 text-xs font-mono bg-blue-50 px-3 py-1.5 rounded-lg inline-block">{selectedVoucher.paymentMethod} &mdash; {selectedVoucher.bankAccount}</p></div>
                <div className="col-span-2 pt-4 border-t border-gray-200"><p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Payee (Member Name & ID)</p><p className="font-black text-2xl text-[#04152d]">{selectedVoucher.memberName} <span className="text-sm font-medium text-gray-400 font-mono ml-2">ID: {selectedVoucher.memberId}</span></p></div>
              </div>

              <table className="w-full mb-12 border-collapse text-sm">
                <thead>
                  <tr className="bg-[#04152d] text-white border-y-2 border-[#04152d]">
                    <th className="py-3.5 px-5 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-lg">Particulars / Narrative</th>
                    <th className="py-3.5 px-5 text-right text-[10px] font-black uppercase tracking-widest rounded-tr-lg">Debit Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="py-6 px-5 font-medium text-gray-800 leading-relaxed">
                      Disbursement release for approved loan reference <span className="font-black text-[#04152d]">{selectedVoucher.loanReference}</span>. <br/>
                      <span className="text-xs text-gray-500 font-medium italic mt-2 block">Description: {selectedVoucher.paymentDetails || 'Approved disbursement'}</span>
                    </td>
                    <td className="py-6 px-5 text-right font-black text-2xl text-emerald-700 align-top">₱{selectedVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              
              {/* UPDATED: React UI Signature Block */}
              <div className="grid grid-cols-3 gap-8 pt-12 print:pt-16">
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12">Prepared By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide">Loan App System</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1">LAS Authorized Personnel</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12">Confirmed By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide">
                      {selectedVoucher.authorizedBy ? selectedVoucher.authorizedBy.replace(/Treasurer\s+/i, '') : 'PENDING'}
                    </p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1">Treasurer</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12">Received By Payee</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide">{selectedVoucher.memberName}</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1">Member</p>
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