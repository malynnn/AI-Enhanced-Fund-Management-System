"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, Eye, Printer, X, FileText, Clock, Check, 
  AlertTriangle, Download, Loader, Ban, ChevronLeft, ChevronRight,
  Search, Filter, Wallet, Tag, Calendar, Plus, CreditCard, Activity, Landmark, Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

interface Collection {
  id: string;
  memberId: string;
  memberName: string;
  collectionType: string;
  amountPaid: number | string;
  paymentMethod: string;
  referenceNumber: string;
  depositFund: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  reason?: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // --- MODALS ---
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedVerify, setSelectedVerify] = useState<Collection | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Collection | null>(null);
  
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // --- FORMS ---
  const [logFormData, setLogFormData] = useState({
    memberId: '', memberName: '', collectionType: 'DUES', amount: '', 
    paymentMethod: 'BANK_TRANSFER', referenceNumber: '', depositFund: 'GENERAL_FUND'
  });
  const [rejectReason, setRejectReason] = useState('');

  // --- FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterType, filterMonth]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const [colRes, funRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/finance/collections`).catch(() => null),
        fetch(`${gatewayUrl}/api/finance/funds`).catch(() => null)
      ]);

      if (colRes?.ok) {
        const data = await colRes.json();
        const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCollections(sorted);
      }
      if (funRes?.ok) setFunds(await funRes.json());
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredCollections = useMemo(() => {
    return collections.filter(c => {
      const matchSearch = c.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.memberId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'ALL' ? true : c.status === filterStatus;
      const matchType = filterType === 'ALL' ? true : c.collectionType === filterType;
      const matchMonth = filterMonth === '' ? true : (c.createdAt || '').startsWith(filterMonth);
      
      return matchSearch && matchStatus && matchType && matchMonth;
    });
  }, [collections, searchTerm, filterStatus, filterType, filterMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / itemsPerPage));
  const paginatedCollections = filteredCollections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- KPIs ---
  const totalPostedValue = collections.filter(c => c.status === 'CONFIRMED' || c.status === 'PROCESSED').reduce((acc, curr) => acc + Number(curr.amountPaid || 0), 0);
  const pendingCount = collections.filter(c => c.status === 'PENDING').length;
  const uniqueContributors = new Set(collections.filter(c => c.status === 'CONFIRMED' || c.status === 'PROCESSED').map(c => c.memberId)).size;

  // --- HANDLERS ---
  const handleRowClick = (rec: Collection) => {
    if (rec.status === 'PENDING') {
      setSelectedVerify(rec);
      setRejectReason('');
    } else {
      setSelectedReceipt(rec);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const payload = { ...logFormData, amountPaid: Number(logFormData.amount), status: 'CONFIRMED', processedAt: new Date().toISOString() };
      
      const res = await fetch(`${gatewayUrl}/api/finance/collections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await loadData();
        setIsLogModalOpen(false);
        setLogFormData({ memberId: '', memberName: '', collectionType: 'DUES', amount: '', paymentMethod: 'BANK_TRANSFER', referenceNumber: '', depositFund: 'GENERAL_FUND' });
        setActionModal({ isOpen: true, title: 'Collection Logged', message: '', status: 'success', resultMsg: 'The collection has been successfully posted to the ledger.' });
      } else throw new Error("Failed to post collection");
    } catch (err: any) {
      setActionModal({ isOpen: true, title: 'Error', message: '', status: 'error', resultMsg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAction = async (action: 'CONFIRM' | 'REJECT') => {
    if (!selectedVerify) return;
    if (action === 'REJECT' && !rejectReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const status = action === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED';
      
      const res = await fetch(`${gatewayUrl}/api/finance/collections/${selectedVerify.id}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status, reason: rejectReason, processedAt: new Date().toISOString() })
      });
      
      if (res.ok) {
        await loadData();
        setSelectedVerify(null);
        setActionModal({ isOpen: true, title: action === 'CONFIRM' ? 'Payment Verified' : 'Payment Rejected', message: '', status: 'success', resultMsg: `The collection status is now ${status}.` });
      } else throw new Error("Backend failed to update status");
    } catch (err: any) {
      setActionModal({ isOpen: true, title: 'Update Failed', message: '', status: 'error', resultMsg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RECEIPT HTML ENGINE (FOR PRINTING AND PDF) ---
  const getReceiptHTML = async (receipt: Collection) => {
    let logoBase64 = '';
    try {
      const logoRes = await fetch('/bdoea-logo-blue.png');
      if (logoRes.ok) {
        const blob = await logoRes.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob);
        });
      }
    } catch (err) {}

    const postingDate = new Date(receipt.processedAt || receipt.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const amount = Number(receipt.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const typeDisplay = receipt.collectionType?.replace('_', ' ') || 'COLLECTION';
    const fundDisplay = receipt.depositFund?.replace('_', ' ') || 'GENERAL FUND';
    const refDisplay = receipt.referenceNumber || 'N/A';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Official Receipt - ${receipt.id}</title>
        <style>
          @media print { @page { size: portrait; margin: 15mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; } }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; padding: 30px; font-size: 13px; background: #ffffff; }
          .voucher-container { border: 1px solid #cbd5e1; padding: 40px; border-radius: 12px; position: relative; max-width: 800px; margin: 0 auto; page-break-inside: avoid; }
          .voucher-container::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #021124 0%, #10b981 50%, #e6b012 100%); border-top-left-radius: 12px; border-top-right-radius: 12px; }
          .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 22px; margin-bottom: 28px; }
          .logo-container { display: flex; justify-content: center; margin-bottom: 12px; }
          .logo { height: 55px; object-fit: contain; }
          .org-name { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #021124; }
          .title-badge { display: inline-block; margin-top: 16px; background: #021124; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; padding: 6px 28px; border-radius: 30px; border: 2px solid #10b981; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; margin-bottom: 28px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
          .value { font-weight: 700; font-size: 13px; color: #021124; }
          .payee-block { grid-column: 1 / -1; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          thead th { background: #021124; padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ffffff; }
          tbody td { padding: 18px 16px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          .amount-cell { font-size: 22px; font-weight: 900; color: #10b981; text-align: right; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
          .sig-block { text-align: center; }
          .sig-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #04152d; margin-bottom: 50px; letter-spacing: 1px; text-align: center; }
          .sig-line { border-top: 1px solid #04152d; padding-top: 8px; width: 100%; }
          .name { font-size: 11px; font-weight: 800; color: #04152d; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
          .title { font-size: 10px; font-weight: 700; color: #04152d; text-transform: uppercase; margin-top: 4px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="header">
            ${logoBase64 ? `<div class="logo-container"><img src="${logoBase64}" alt="Logo" class="logo" /></div>` : ''}
            <div class="org-name">Banco de Oro Employees Association (BDOEA)</div>
            <div class="title-badge">Acknowledgement Receipt</div>
          </div>
          <div class="details-grid">
            <div><div class="label">Receipt Number</div><div class="value">${receipt.id}</div></div>
            <div><div class="label">Date Posted</div><div class="value">${postingDate}</div></div>
            <div><div class="label">Collection Category</div><div class="value" style="color: #0369a1;">${typeDisplay}</div></div>
            <div><div class="label">Credited To Fund</div><div class="value" style="color: #10b981;">${fundDisplay}</div></div>
            <div class="payee-block"><div class="label">Received From</div><div class="value">${receipt.memberName} (ID: ${receipt.memberId})</div></div>
          </div>
          <table>
            <thead><tr><th style="text-align: left;">Particulars</th><th style="text-align: right;">Amount (PHP)</th></tr></thead>
            <tbody>
              <tr><td style="text-align: left;">Payment received for ${typeDisplay}. <br><span style="font-size: 10px; color: #64748b; font-weight: 500;">Method: ${receipt.paymentMethod}</span><br /><span style="font-size: 10px; color: #04152d; font-weight: 700;">Transaction Ref: ${refDisplay}</span></td><td class="amount-cell">₱${amount}</td></tr>
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="sig-block">
              <div class="sig-label">System Generated By</div>
              <div class="sig-line">
                <div class="name">BDOEA Platform</div>
                <div class="title">Automated Receipt</div>
              </div>
            </div>
            <div class="sig-block">
              <div class="sig-label">Verified & Posted By</div>
              <div class="sig-line">
                <div class="name">Romalyn Amante</div>
                <div class="title">Treasurer</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>`;
  };

  const handlePrint = async () => {
    if (!selectedReceipt) return;
    setIsPrinting(true);
    try {
      const html = await getReceiptHTML(selectedReceipt);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        if (iframe.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
      }, 500);
    } catch (err) { alert('Failed to print. Please try again.'); } finally { setIsPrinting(false); }
  };

  const handleDownload = async () => {
    if (!selectedReceipt) return;
    setIsGeneratingPDF(true);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '820px'; iframe.style.height = '1150px'; iframe.style.border = '0'; iframe.style.opacity = '0'; iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    try {
      const html = await getReceiptHTML(selectedReceipt);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      doc.open(); doc.write(html); doc.close();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([ import('html2canvas'), import('jspdf') ]);
      const canvas = await html2canvas(doc.body, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth(); const margin = 15; const imgWidth = pageWidth - (margin * 2); const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`Receipt-${selectedReceipt.id}.pdf`);
    } catch (err) { alert('Failed to generate PDF.'); } finally {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent relative print:block print:h-auto print:min-h-0 print:overflow-visible">
      
      <div className={selectedReceipt ? "print:hidden" : ""}>
        <ActionModal 
          isOpen={actionModal.isOpen} title={actionModal.title} message={actionModal.message} status={actionModal.status} resultMsg={actionModal.resultMsg}
          onConfirm={() => setActionModal({ ...actionModal, isOpen: false })} onClose={() => setActionModal({ ...actionModal, isOpen: false })} confirmText="Close"
        />

        <Header />

        <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto animate-fade-in">
          
          {/* Top Actions & Button (Fixed Spacing) */}
          <div className="flex justify-end mb-6 pt-2 w-full">
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-7 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all"
            >
              <Plus size={18} /> Log Collection
            </button>
          </div>

          {/* KPIs (Fixed Text Overflow) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-6">
            
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Activity size={24} /></div>
                <div className="text-left min-w-0 flex-1">
                  <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5 truncate" title="Total Posted">Total Posted</p>
                  <p className="text-2xl lg:text-3xl font-black text-[#04152d] truncate" title={`₱${totalPostedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                    ₱{totalPostedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><Clock size={24} /></div>
                <div className="text-left min-w-0 flex-1">
                  <p className="block text-xs font-black text-amber-600 uppercase tracking-[0.12em] mb-0.5 truncate" title="Pending Verification">Pending Verification</p>
                  <p className="text-2xl lg:text-3xl font-black text-[#04152d] truncate" title={`${pendingCount}`}>
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Landmark size={24} /></div>
                <div className="text-left min-w-0 flex-1">
                  <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5 truncate" title="Unique Contributors">Unique Contributors</p>
                  <p className="text-2xl lg:text-3xl font-black text-[#04152d] truncate" title={`${uniqueContributors}`}>
                    {uniqueContributors}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><FileText size={24} /></div>
                <div className="text-left min-w-0 flex-1">
                  <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5 truncate" title="Default Dues">Default Dues</p>
                  <p className="text-2xl lg:text-3xl font-black text-[#04152d] truncate" title="₱500.00">
                    ₱500.00
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col min-h-[400px] w-full">
            
            {/* Filters */}
            <div className="p-6 border-b border-gray-100 flex flex-col gap-5 bg-white/50">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[250px] relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search Reference, Member Name, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none transition-colors font-bold text-[#04152d]" />
                </div>
                
                <div className="relative inline-flex items-center w-full sm:w-auto min-w-[160px] bg-white border-[1.5px] border-[#dde3ee] rounded-xl overflow-hidden focus-within:border-[#04152d] transition-colors">
                  <div className="pl-4 pr-2 flex items-center pointer-events-none"><Calendar size={14} className="text-gray-400" /></div>
                  <div className="relative flex-1">
                    <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full py-2.5 text-sm outline-none font-bold text-[#04152d] bg-transparent cursor-pointer opacity-0 absolute inset-0 z-10" />
                    <div className="py-2.5 text-sm font-bold text-[#04152d] pointer-events-none truncate pr-2">
                      {filterMonth ? new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'All Time'}
                    </div>
                  </div>
                  {filterMonth ? (
                    <button onClick={() => setFilterMonth('')} className="pr-4 pl-2 text-gray-400 hover:text-red-500 z-20 transition-colors"><X size={14} /></button>
                  ) : (
                    <div className="pr-4 pl-2 pointer-events-none"><Calendar size={14} className="text-gray-400" /></div>
                  )}
                </div>

                <div className="relative inline-block w-full sm:w-auto min-w-[150px]">
                  <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                    <option value="ALL">All Categories</option>
                    <option value="DUES">Union Dues</option>
                    <option value="LOAN_REPAYMENT">Loan Repayment</option>
                    <option value="PENALTY">Penalty</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="relative inline-block w-full sm:w-auto min-w-[150px]">
                  <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-white border-[1.5px] border-[#dde3ee] focus:border-[#04152d] outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="CONFIRMED">Posted / Confirmed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto w-full">
              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center text-gray-500">
                  <Loader size={32} className="animate-spin mb-4 text-[#04152d]" />
                  <p className="font-bold text-left">Loading records...</p>
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-gray-400">
                  <AlertTriangle className="mb-4 text-amber-400" size={48} />
                  <p className="font-black text-[#04152d] text-lg text-left">No collections found matching filters.</p>
                </div>
              ) : (
                <table className="w-full text-left whitespace-nowrap min-w-[1100px]">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Date Logged</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Ref Number</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Member ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Member Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Method</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedCollections.map((col) => {
                      const isPosted = col.status === 'CONFIRMED' || col.status === 'PROCESSED';
                      const isRejected = col.status === 'REJECTED';
                      return (
                        <tr 
                          key={col.id} 
                          onClick={() => handleRowClick(col)}
                          className="hover:bg-blue-50/50 transition-colors duration-100 cursor-pointer group"
                        >
                          <td className="px-6 py-5 text-sm font-medium text-gray-500 text-left">
                            {new Date(col.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5 text-sm font-mono font-bold text-[#04152d] text-left">
                            {col.referenceNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-5 text-sm font-mono font-bold text-gray-500 text-left">
                            {col.memberId}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-[#04152d] text-left">
                            {col.memberName}
                          </td>
                          <td className="px-6 py-5 text-[11px] font-black text-blue-700 uppercase tracking-widest text-left">
                            {col.collectionType?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-5 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-left">
                            {col.paymentMethod?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-[#04152d] text-base">
                            ₱{Number(col.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-center text-sm">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                              isPosted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 
                              isRejected ? 'bg-red-50 text-red-700 border border-red-200/50' : 
                              'bg-amber-50 text-amber-700 border border-amber-200/50'
                            }`}>
                              {isPosted ? 'POSTED' : col.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button className="inline-flex items-center justify-center gap-2 bg-gray-50 text-gray-600 group-hover:bg-[#04152d] group-hover:text-white border border-gray-200 font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm">
                              {col.status === 'PENDING' ? <><CheckCircle size={14} /> Verify</> : <><Eye size={14} /> View</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && !isLoading && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)]">
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#04152d] hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50 shadow-[0_4px_0_rgba(229,231,235,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(229,231,235,1)]">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- LOG NEW COLLECTION MODAL --- */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-white/80 flex flex-col max-h-[90vh] animate-pop my-auto">
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 bg-[#f8faff] rounded-t-2xl">
              <div>
                <h3 className="font-black text-xl text-[#04152d] tracking-tight flex items-center gap-2"><Plus size={20} className="text-emerald-600"/> Log Collection</h3>
                <p className="text-xs font-medium text-gray-500 mt-1">Manually post an incoming payment to the ledger.</p>
              </div>
              <button onClick={() => !isSubmitting && setIsLogModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form onSubmit={handleLogSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member ID</label>
                    <input required type="text" placeholder="e.g. 2021-00123" value={logFormData.memberId} onChange={(e) => setLogFormData({...logFormData, memberId: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#04152d] outline-none transition-all font-mono font-bold text-[#04152d]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Member Name</label>
                    <input required type="text" placeholder="Full Name" value={logFormData.memberName} onChange={(e) => setLogFormData({...logFormData, memberName: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#04152d] outline-none transition-all font-bold text-[#04152d]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Category</label>
                    <select value={logFormData.collectionType} onChange={(e) => setLogFormData({...logFormData, collectionType: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#04152d] outline-none transition-all font-bold text-[#04152d] cursor-pointer">
                      <option value="DUES">Union Dues</option>
                      <option value="LOAN_REPAYMENT">Loan Repayment</option>
                      <option value="PENALTY">Penalty</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Target Deposit Fund</label>
                    <select value={logFormData.depositFund} onChange={(e) => setLogFormData({...logFormData, depositFund: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-blue-50 border border-blue-200 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-blue-800 cursor-pointer">
                      <option value="GENERAL_FUND">General Fund</option>
                      <option value="UNION_FUND">Union Fund</option>
                      <option value="LOAN_FUND">Loan Fund</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5"><CreditCard size={12}/> Payment Method</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {['BANK_TRANSFER', 'GCASH', 'CASH', 'CHECK'].map(method => (
                      <button key={method} type="button" onClick={() => setLogFormData({...logFormData, paymentMethod: method})} className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${logFormData.paymentMethod === method ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Amount (PHP)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                        <input required type="number" min="1" step="0.01" placeholder="0.00" value={logFormData.amount} onChange={(e) => setLogFormData({...logFormData, amount: e.target.value})} className="w-full rounded-xl pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#04152d] outline-none transition-all font-black text-[#04152d]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1">Trace / Ref Number *</label>
                      <input required type="text" placeholder="e.g. 000123456789" value={logFormData.referenceNumber} onChange={(e) => setLogFormData({...logFormData, referenceNumber: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm bg-emerald-50/50 border border-emerald-200 focus:border-emerald-600 outline-none transition-all font-mono font-bold text-[#04152d]" />
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-end gap-4 mt-auto">
                  <button type="button" onClick={() => setIsLogModalOpen(false)} disabled={isSubmitting} className="font-bold text-sm text-gray-500 hover:text-gray-800 px-4 py-2 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-3 px-8 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all disabled:opacity-50">
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Posting...</> : 'Post to Ledger'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- VERIFY COLLECTION MODAL --- */}
      {selectedVerify && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-white/80 flex flex-col max-h-[90vh] animate-pop my-auto">
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 bg-[#f8faff] rounded-t-2xl">
              <h3 className="font-black text-xl text-[#04152d] flex items-center gap-2"><Clock size={20} className="text-amber-500" /> Verify Payment</h3>
              <button onClick={() => !isSubmitting && setSelectedVerify(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Member</span>
                  <span className="font-bold text-[#04152d] text-sm text-right">{selectedVerify.memberName} <br/><span className="font-mono text-gray-400 text-[10px]">{selectedVerify.memberId}</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</span>
                  <span className="font-black text-lg text-emerald-600">₱{Number(selectedVerify.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ref Number</span>
                  <span className="font-mono font-bold text-[#04152d]">{selectedVerify.referenceNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</span>
                  <span className="font-bold text-blue-700 text-xs">{selectedVerify.collectionType?.replace('_', ' ')}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Rejection Reason (Optional if Confirming)</label>
                <textarea rows={2} placeholder="If rejecting, explain why..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm bg-white border border-gray-200 focus:border-red-500 outline-none transition-all font-medium text-[#04152d] resize-none" />
              </div>

              <div className="pt-4 flex justify-between gap-4 mt-auto">
                <button onClick={() => handleVerifyAction('REJECT')} disabled={isSubmitting || !rejectReason.trim()} className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-100 hover:border-red-600 font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50">
                  <Ban size={16} /> Reject
                </button>
                <button onClick={() => handleVerifyAction('CONFIRM')} disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm shadow-[0_4px_0_rgba(5,70,40,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(5,70,40,0.55)] transition-all disabled:opacity-50">
                  {isSubmitting ? <><Loader size={16} className="animate-spin" /> Verifying...</> : <><CheckCircle size={16} /> Confirm</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW OFFICIAL RECEIPT MODAL --- */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-transparent print:items-start print:justify-start print:p-0 animate-fade-in p-4 sm:p-6">
          <div className="bg-white w-full max-w-3xl rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full animate-pop overflow-hidden print:overflow-visible">
            
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 print:hidden bg-gray-50/80 rounded-t-[24px]">
              <div>
                <h2 className="font-black text-xl text-[#04152d] text-left">Official Receipt</h2>
                <p className="text-xs font-medium text-gray-500 mt-1">Confirmed transaction receipt for member.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrint} disabled={isPrinting} className="inline-flex items-center justify-center gap-2 border-2 border-[#04152d] text-[#04152d] hover:bg-[#04152d] hover:text-white font-bold py-2 px-4 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all duration-150 disabled:opacity-40">
                  {isPrinting ? <><Loader size={16} className="animate-spin" /> Printing...</> : <><Printer size={16} /> Print</>}
                </button>
                <button onClick={handleDownload} disabled={isGeneratingPDF} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-[0_6px_0_rgba(5,70,40,0.45)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(5,70,40,0.45)] transition-all disabled:opacity-40">
                  {isGeneratingPDF ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> PDF</>}
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"><X size={24} /></button>
              </div>
            </div>

            <div ref={receiptRef} className="flex-1 overflow-y-auto p-6 md:p-12 print:p-0 bg-white print:overflow-visible print:h-auto print:block">
              <div className="hidden print:flex w-full justify-end pb-8">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">BDOEA Financial System</span>
              </div>

              <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 flex flex-col items-center print:border-b print:pb-6 print:mb-6 print:block">
                <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-4 print:mx-auto" />
                <p className="text-xs text-gray-500 font-black uppercase tracking-widest text-center">Banco de Oro Employees Association</p>
                <h2 className="mt-6 text-lg font-black bg-[#04152d] text-white inline-block px-8 py-2 rounded-full uppercase tracking-widest text-xs shadow-md print:bg-white print:text-[#04152d] print:border-2 print:border-[#04152d] print:shadow-none text-center">
                  Acknowledgement Receipt
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10 text-sm bg-[#f8faff] p-6 rounded-2xl border border-gray-100 print:bg-white print:border-none print:p-0">
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Receipt Number</p><p className="font-mono font-bold text-sm text-[#04152d] text-left">{selectedReceipt.id}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Date Posted</p><p className="font-medium text-[#04152d] text-left">{new Date(selectedReceipt.processedAt || selectedReceipt.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Collection Category</p><p className="font-medium text-blue-700 text-xs font-mono bg-blue-50 px-3 py-1.5 rounded-lg inline-block print:bg-transparent print:px-0 print:text-blue-800 print:font-bold text-left">{selectedReceipt.collectionType?.replace('_', ' ')}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Credited To Fund</p><p className="font-medium text-emerald-700 text-xs font-mono bg-emerald-50 px-3 py-1.5 rounded-lg inline-block print:bg-transparent print:px-0 print:text-emerald-800 print:font-bold text-left">{selectedReceipt.depositFund?.replace('_', ' ')}</p></div>
                <div className="col-span-2 pt-4 border-t border-gray-200"><p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Received From</p><p className="font-black text-2xl text-[#04152d] text-left">{selectedReceipt.memberName} <span className="text-sm font-medium text-gray-400 font-mono ml-2">ID: {selectedReceipt.memberId}</span></p></div>
              </div>

              <table className="w-full mb-12 border-collapse text-sm">
                <thead>
                  <tr className="bg-[#04152d] text-white border-y-2 border-[#04152d] print:bg-white print:text-[#04152d]">
                    <th className="py-3.5 px-5 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-lg print:border-b-2 print:border-[#04152d]">Particulars</th>
                    <th className="py-3.5 px-5 text-right text-[10px] font-black uppercase tracking-widest rounded-tr-lg print:border-b-2 print:border-[#04152d]">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="py-6 px-5 font-medium text-gray-800 leading-relaxed text-left">
                      Payment received for {selectedReceipt.collectionType?.replace('_', ' ')}. <br/>
                      <span className="text-xs text-gray-500 font-medium italic mt-2 block text-left">Method: {selectedReceipt.paymentMethod?.replace('_', ' ')}</span><br /><span className="text-xs text-[#04152d] font-bold mt-1 block text-left">Transaction Ref: {selectedReceipt.referenceNumber || 'N/A'}</span>
                    </td>
                    <td className="py-6 px-5 text-right font-black text-2xl text-emerald-700 align-top print:text-[#04152d]">₱{Number(selectedReceipt.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="grid grid-cols-2 gap-8 pt-12 print:pt-16 max-w-lg mx-auto">
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12 text-center">System Generated By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide text-center">BDOEA Platform</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 text-center">Automated Receipt</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12 text-center">Verified & Posted By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide text-center">Romalyn Amante</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 text-center">Treasurer</p>
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