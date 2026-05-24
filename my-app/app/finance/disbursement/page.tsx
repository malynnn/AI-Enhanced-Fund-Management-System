// app/finance/disbursement/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Eye, Printer, X, FileText, Clock, Check, Send, AlertTriangle, Download, Loader } from 'lucide-react';

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
}

export default function DisbursementPage() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Disbursement | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  // --- Webhook Simulator Form State ---
  const [simLoanRef, setSimLoanRef] = useState('LN-2026-004');
  const [simMemberId, setSimMemberId] = useState('MEM-9981');
  const [simMemberName, setSimMemberName] = useState('Aza Wanimari');
  const [simAmount, setSimAmount] = useState('35000.00');
  const [simPayMethod, setSimPayMethod] = useState('BANK_TRANSFER');
  const [simBankAccount, setSimBankAccount] = useState('BDO-5521098231');
  const [simDetails, setSimDetails] = useState('Approved Provident Loan Release');
  const [simSuccessMsg, setSimSuccessMsg] = useState('');
  const [simErrMsg, setSimErrMsg] = useState('');
  const [isSendingSim, setIsSendingSim] = useState(false);

  // Fetch Disbursements Queue from real database
  const fetchDisbursements = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/disbursements');
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

  // --- DIRECT PDF DOWNLOAD (no print dialog) ---
  const downloadVoucherPDF = async () => {
    if (!selectedVoucher) return;
    setIsGeneratingPDF(true);

    // Create a temporary hidden iframe to render the voucher
    // This isolates the styling from Tailwind v4's lab() / oklch() color functions which crash html2canvas.
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
      // Helper function to fetch the local BDOEA logo and convert it to Base64
      // This guarantees the image displays instantly and renders perfectly inside the canvas capture.
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
      const authorizedBy = selectedVoucher.authorizedBy || 'PENDING';
      
      const voucherHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Disbursement Voucher</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #1a202c;
      background: #ffffff;
      padding: 30px;
      font-size: 13px;
      line-height: 1.5;
    }
    .voucher-container {
      border: 1px solid #cbd5e1;
      padding: 40px;
      border-radius: 12px;
      position: relative;
      background: #ffffff;
    }
    .voucher-container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #021124 0%, #005a9c 50%, #e6b012 100%);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #e2e8f0;
      padding-bottom: 22px;
      margin-bottom: 28px;
    }
    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }
    .logo {
      height: 55px;
      object-fit: contain;
    }
    .org-name {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #021124;
      margin-top: 4px;
    }
    .org-address { 
      font-size: 10px; 
      color: #64748b; 
      margin-top: 4px;
      font-weight: 500;
    }
    .title-badge {
      display: inline-block;
      margin-top: 16px;
      background: #021124;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      padding: 6px 28px;
      border-radius: 30px;
      border: 2px solid #e6b012;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 40px;
      margin-bottom: 28px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .value {
      font-weight: 700;
      font-size: 13px;
      color: #021124;
    }
    .value-mono { 
      font-family: 'SFMono-Regular', Consolas, Menlo, monospace; 
      font-size: 11.5px;
    }
    .payee-block { 
      grid-column: 1 / -1; 
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 4px;
    }
    .payee-name {
      font-size: 18px;
      font-weight: 800;
      color: #021124;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead tr {
      background: #021124;
    }
    thead th {
      padding: 12px 16px;
      text-align: left;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #ffffff;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    thead th.right { text-align: right; }
    tbody td {
      padding: 18px 16px;
      border-bottom: 1px solid #cbd5e1;
      vertical-align: top;
      line-height: 1.6;
      background: #ffffff;
    }
    .charge { 
      color: #ef4444; 
      font-weight: 700; 
      font-size: 11px;
      margin-top: 6px;
      display: block;
    }
    .italic { 
      font-style: italic; 
      color: #475569; 
      font-size: 11px;
      display: block;
      margin-top: 4px;
    }
    .amount-cell {
      text-align: right;
      font-size: 22px;
      font-weight: 900;
      color: #15803d;
      white-space: nowrap;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 30px;
      margin-top: 15px;
    }
    .sig-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 50px;
    }
    .sig-line {
      border-top: 1.5px solid #021124;
      padding-top: 8px;
      text-align: center;
    }
    .sig-name { font-weight: 800; font-size: 11px; color: #021124; }
    .sig-role { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <div class="header">
      ${logoBase64 ? `
      <div class="logo-container">
        <img src="${logoBase64}" alt="BDOEA Logo" class="logo" />
      </div>` : ''}
      <div class="org-name">Banco de Oro Employees Association (BDOEA)</div>
      <div class="org-address">Ortigas Avenue, San Juan, Metro Manila, Philippines</div>
      <div class="title-badge">Disbursement Voucher</div>
    </div>

    <div class="details-grid">
      <div>
        <div class="label">Voucher Reference</div>
        <div class="value value-mono">${selectedVoucher.id}</div>
      </div>
      <div>
        <div class="label">Posting Date</div>
        <div class="value">${postingDate}</div>
      </div>
      <div>
        <div class="label">Loan Reference Code</div>
        <div class="value value-mono">${selectedVoucher.loanReference}</div>
      </div>
      <div>
        <div class="label">Disbursement Method</div>
        <div class="value" style="font-size:11px; text-transform: uppercase; letter-spacing: 0.5px;">${selectedVoucher.paymentMethod} &mdash; ${selectedVoucher.bankAccount}</div>
      </div>
      <div class="payee-block">
        <div class="label">Payee (Member Name &amp; ID)</div>
        <div class="payee-name">${selectedVoucher.memberName} <span style="font-size:12px;font-weight:500;color:#64748b">(ID: ${selectedVoucher.memberId})</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Particulars / Narrative</th>
          <th class="right">Debit Amount (PHP)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            Disbursement release for approved loan reference <strong>${selectedVoucher.loanReference}</strong>.<br/>
            <span class="italic">Description: ${selectedVoucher.paymentDetails || 'Approved disbursement'}</span>
            <span class="charge">Charge Account: BDOEA Loans Fund (LOAN_BDOEA)</span>
          </td>
          <td class="amount-cell">₱${amount}</td>
        </tr>
      </tbody>
    </table>

    <div class="signatures">
      <div>
        <div class="sig-label">Prepared By</div>
        <div class="sig-line">
          <div class="sig-name">Loan App System</div>
          <div class="sig-role">LAS Webhook (Mocked)</div>
        </div>
      </div>
      <div>
        <div class="sig-label">Confirmed By (Treasurer)</div>
        <div class="sig-line">
          <div class="sig-name">${authorizedBy}</div>
          <div class="sig-role">Authorized Signature</div>
        </div>
      </div>
      <div>
        <div class="sig-label">Received By Payee</div>
        <div class="sig-line">
          <div class="sig-name">${selectedVoucher.memberName}</div>
          <div class="sig-role">Member Signature</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by BDOEA Financial System &bull; ${new Date().toLocaleString('en-PH')} &bull; This is a system-generated document.
    </div>
  </div>
</body>
</html>`;

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      
      doc.open();
      doc.write(voucherHTML);
      doc.close();

      // Wait a tiny bit for render to complete inside iframe
      await new Promise((resolve) => setTimeout(resolve, 150));

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(doc.body, {
        scale: 2,          // Keep high resolution for sharp text/PDF
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Leave 15mm margins on each side
      const margin = 15;
      const imgWidth = pageWidth - (margin * 2); 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`Disbursement-Voucher-${selectedVoucher.loanReference}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // Clean up the iframe
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setIsGeneratingPDF(false);
    }
  };

  // Simple print handler utilizing browser print (Tailwind handles hiding other page elements with print:hidden)
  const printVoucher = () => {
    window.print();
  };

  // --- CONFIRM DISBURSEMENT ACTION ---
  const handleConfirm = async (id: string) => {
    setIsProcessing(id);
    try {
      const res = await fetch(`/api/finance/disbursements/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizedBy: 'Treasurer Romalyn Amante' })
      });
      if (res.ok) {
        await fetchDisbursements();
        // Find the confirmed disbursement and open voucher modal
        const confirmedDisb = disbursements.find(d => d.id === id);
        if (confirmedDisb) {
          const completedDisb: Disbursement = {
            ...confirmedDisb,
            status: 'COMPLETED',
            authorizedBy: 'Treasurer Romalyn Amante'
          };
          setJustConfirmed(true);
          setSelectedVoucher(completedDisb);
          // Auto-download PDF right after confirm
          setTimeout(() => downloadVoucherPDF(), 300);
        }
      }
    } catch (err) {
      console.error('Error confirming disbursement:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  // --- SIMULATE LAS WEBHOOK ACTION ---
  const handleSendWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingSim(true);
    setSimSuccessMsg('');
    setSimErrMsg('');

    try {
      const res = await fetch('/api/webhooks/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: simLoanRef,
          memberId: simMemberId,
          memberName: simMemberName,
          amount: parseFloat(simAmount),
          paymentMethod: simPayMethod,
          bankAccount: simBankAccount,
          paymentDetails: simDetails
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSimSuccessMsg('Webhook sent! Fund auto-debited and request queued.');
        // Refresh data
        await fetchDisbursements();
        // Generate new random loan reference for convenience
        setSimLoanRef(`LN-2026-${Math.floor(100 + Math.random() * 900)}`);
      } else {
        setSimErrMsg(data.error || 'Failed to send webhook');
      }
    } catch (err: any) {
      setSimErrMsg(err.message || 'Network error simulating webhook');
    } finally {
      setIsSendingSim(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto print:p-0 print:m-0 font-sans">
      
      {/* --- DASHBOARD VIEW (Hidden when printing) --- */}
      <div className="print:hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#021124] tracking-tight">Disbursement Control Center</h1>
          <p className="text-gray-500 mt-1 font-medium">Automatic debit ledger posting, verification, and Treasurer confirmation queue (User Story FS-004).</p>
        </div>

        {/* TOP LAYOUT: QUEUE + SIMULATOR SIDE-BY-SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 items-start">
          
          {/* LEFT SIDE: QUEUE LIST */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Requests</p>
                  <p className="text-2xl font-black text-[#021124]">{disbursements.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Pending Review</p>
                  <p className="text-2xl font-black text-[#021124]">
                    {disbursements.filter(d => d.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </div>

            {/* DISBURSEMENT TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#021124]">Treasurer Confirmation Queue</h2>
                <span className="text-xs text-gray-400 font-mono">Real-Time Sync</span>
              </div>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500 font-medium">Loading ledger records...</div>
                ) : disbursements.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <AlertTriangle className="mx-auto mb-3 text-gray-300" size={36} />
                    <p className="font-bold">No disbursement requests found.</p>
                    <p className="text-xs mt-1">Use the simulator on the right to send a mock LAS webhook request!</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                        <th className="p-4">Reference</th>
                        <th className="p-4">Payee (Member)</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Bank Details</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {disbursements.map((disb) => (
                        <tr key={disb.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-mono font-bold text-[#021124]">{disb.loanReference}</div>
                            <span className="text-[10px] text-gray-400 font-mono block">{disb.id.substring(0, 8)}...</span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-[#021124]">{disb.memberName}</div>
                            <span className="text-xs text-gray-500">ID: {disb.memberId}</span>
                          </td>
                          <td className="p-4 font-extrabold text-green-700">₱{disb.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-4">
                            <div className="font-mono text-xs">{disb.bankAccount}</div>
                            <span className="text-xs text-gray-400 block">{disb.paymentMethod}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              disb.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              {disb.status === 'PENDING' ? <Clock size={11} /> : <CheckCircle size={11} />}
                              {disb.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* VIEW VOUCHER BUTTON */}
                              <button 
                                onClick={() => setSelectedVoucher(disb)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="View / Print Voucher"
                              >
                                <Eye size={18} />
                              </button>
                              
                              {/* CONFIRM DISBURSEMENT BUTTON (Only if pending) */}
                              {disb.status === 'PENDING' ? (
                                <button 
                                  onClick={() => handleConfirm(disb.id)}
                                  disabled={isProcessing === disb.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-[#021124] text-white rounded-md text-xs font-bold hover:bg-black transition-colors disabled:opacity-50"
                                >
                                  {isProcessing === disb.id ? 'Saving...' : <><Check size={13} /> Confirm</>}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 font-bold italic pr-2">Fully Posted</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: INTERACTIVE MOCK SIMULATOR */}
          <div className="bg-[#021124] text-white p-6 rounded-xl border border-blue-900 shadow-md">
            <div className="mb-4">
              <span className="bg-blue-600 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full">
                Integration Simulator
              </span>
              <h2 className="text-xl font-bold mt-2.5">Loan App (LAS) Webhook</h2>
              <p className="text-blue-200 text-xs mt-1.5 leading-relaxed">
                Since LAS is not integrated yet, use this panel to simulate receiving an approved loan webhook from the Loan system.
              </p>
            </div>

            {simSuccessMsg && (
              <div className="mb-4 bg-green-900/60 border border-green-700 text-green-200 p-3 rounded text-xs font-bold flex gap-2">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <p>{simSuccessMsg}</p>
              </div>
            )}

            {simErrMsg && (
              <div className="mb-4 bg-red-950/60 border border-red-800 text-red-200 p-3 rounded text-xs font-bold flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>{simErrMsg}</p>
              </div>
            )}

            <form onSubmit={handleSendWebhook} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Loan Reference</label>
                <input 
                  type="text" 
                  required 
                  value={simLoanRef}
                  onChange={(e) => setSimLoanRef(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Member ID</label>
                  <input 
                    type="text" 
                    required 
                    value={simMemberId}
                    onChange={(e) => setSimMemberId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Disbursement (₱)</label>
                  <input 
                    type="number" 
                    required 
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Payee (Member Name)</label>
                <input 
                  type="text" 
                  required 
                  value={simMemberName}
                  onChange={(e) => setSimMemberName(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Payment Method</label>
                  <select 
                    value={simPayMethod}
                    onChange={(e) => setSimPayMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Bank Account</label>
                  <input 
                    type="text" 
                    required 
                    value={simBankAccount}
                    onChange={(e) => setSimBankAccount(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Narrative / Description</label>
                <textarea 
                  value={simDetails}
                  onChange={(e) => setSimDetails(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-900 border border-blue-900 rounded text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingSim}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Send size={14} />
                {isSendingSim ? 'Firing Webhook...' : '🚀 Send Mock Webhook'}
              </button>
            </form>
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
                  onClick={printVoucher}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#021124] rounded-lg text-sm font-bold transition-colors"
                >
                  <Printer size={16} /> Print
                </button>
                <button 
                  onClick={downloadVoucherPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800/80 text-white rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader size={16} className="animate-spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download PDF
                    </>
                  )}
                </button>
                <button onClick={() => { setSelectedVoucher(null); setJustConfirmed(false); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Success Banner (shown only right after confirmation) */}
            {justConfirmed && (
              <div className="print:hidden mx-4 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 font-bold text-sm">Disbursement Successfully Confirmed!</p>
                  <p className="text-green-600 text-xs mt-0.5">The voucher has been authorized. A PDF voucher file was generated and downloaded automatically to your device.</p>
                </div>
              </div>
            )}

            {/* VOUCHER CONTENT (This is the only part that prints/gets captured) */}
            <div ref={voucherRef} className="p-10 overflow-y-auto print:p-0 bg-white">
              
              {/* Voucher Header */}
              <div className="text-center mb-10 border-b-2 border-[#021124] pb-6 flex flex-col items-center">
                <img 
                  src="/bdoea-logo-blue.png" 
                  alt="BDOEA Logo" 
                  className="h-16 object-contain mb-3" 
                />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Banco de Oro Employees Association (BDOEA)</p>
                <p className="text-[10px] text-gray-400 font-medium">Ortigas Avenue, San Juan, Metro Manila, Philippines</p>
                
                <h2 className="mt-5 text-lg font-bold bg-[#021124] text-white inline-block px-6 py-1 rounded-full uppercase tracking-widest text-xs print:bg-white print:text-[#021124] print:border-2 print:border-[#021124]">
                  Disbursement Voucher
                </h2>
              </div>

              {/* Voucher Details Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-12 mb-8 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Voucher Reference</p>
                  <p className="font-mono font-bold text-sm text-[#021124]">{selectedVoucher.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Posting Date</p>
                  <p className="font-bold text-[#021124]">{new Date(selectedVoucher.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Loan Reference Code</p>
                  <p className="font-mono font-black text-[#021124]">{selectedVoucher.loanReference}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Disbursement Method</p>
                  <p className="font-bold text-blue-800 text-xs font-mono">{selectedVoucher.paymentMethod} ({selectedVoucher.bankAccount})</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Payee (Member Name & ID)</p>
                  <p className="font-black text-lg text-[#021124] border-b border-gray-200 pb-1">{selectedVoucher.memberName} <span className="text-xs font-medium text-gray-400">(ID: {selectedVoucher.memberId})</span></p>
                </div>
              </div>

              {/* Transaction Table */}
              <table className="w-full mb-10 border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-y-2 border-[#021124]">
                    <th className="py-2.5 px-4 text-left text-xs font-bold text-[#021124] uppercase">Particulars / Narrative</th>
                    <th className="py-2.5 px-4 text-right text-xs font-bold text-[#021124] uppercase">Debit Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-medium text-gray-800">
                      Disbursement release for approved loan reference <span className="font-bold text-[#021124]">{selectedVoucher.loanReference}</span>. <br/>
                      <span className="text-xs text-gray-500 font-medium italic mt-1 block">Description: {selectedVoucher.paymentDetails || 'Approved disbursement'}</span>
                      <span className="text-xs text-red-600 font-bold block mt-1">Charge Account: BDOEA Loans Fund (LOAN_BDOEA)</span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-lg text-green-700">
                      ₱{selectedVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 pt-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-8">Prepared By</p>
                  <div className="border-t border-black pt-1.5 text-center">
                    <p className="font-bold text-xs text-[#021124]">Loan App System</p>
                    <p className="text-[10px] text-gray-500">LAS Webhook (Mocked)</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-8">Confirmed By</p>
                  <div className="border-t border-black pt-1.5 text-center">
                    <p className="font-black text-xs text-blue-900">{selectedVoucher.authorizedBy || 'PENDING'}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Authorized signature</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-8">Received By Payee</p>
                  <div className="border-t border-black pt-1.5 text-center">
                    <p className="font-bold text-xs text-[#021124]">{selectedVoucher.memberName}</p>
                    <p className="text-[10px] text-gray-500">Member Signature</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Print/PDF instructions footer (shown only in modal, hidden on print) */}
            <div className="print:hidden p-3 bg-gray-50 border-t border-gray-100 rounded-b-xl text-center">
              <p className="text-xs text-gray-400">
                💡 Tip: Click <strong>Download PDF</strong> for instant direct download, or <strong>Print</strong> for physical copy printing.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}