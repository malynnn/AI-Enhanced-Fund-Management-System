"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Eye, Printer, X, FileText, Clock, ShieldCheck,
  AlertTriangle, Download, Loader, Ban, ChevronLeft, ChevronRight,
  Search, Filter, Tag, Calendar
} from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header';

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
  disbursementType?: string; 
  fundSource?: string;
  referenceNumber?: string;       
}

export default function AuditorDisbursementPage() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Disbursement | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, filterMonth]);

  const fetchDisbursements = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/disbursements`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((d: any) => ({
          ...d,
          disbursementType: d.disbursementType || 'LOAN_RELEASE',
          fundSource: d.fundSource || 'PENDING'
        }));
        formatted.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDisbursements(formatted);
      }
    } catch (err) {
      console.error('Error fetching disbursements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDisbursements(); }, []);

  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      const matchesSearch = d.loanReference?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.memberId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' ? true : d.status === filterStatus;
      const matchesType = filterType === 'ALL' ? true : d.disbursementType === filterType;
      const matchesMonth = filterMonth === '' ? true : d.createdAt.startsWith(filterMonth);
      
      return matchesSearch && matchesStatus && matchesType && matchesMonth;
    });
  }, [disbursements, searchTerm, filterStatus, filterType, filterMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredDisbursements.length / itemsPerPage));
  const paginatedDisbursements = filteredDisbursements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- VOUCHER HTML ENGINE (FOR PRINTING AND PDF) ---
  const getVoucherHTML = async (voucher: Disbursement) => {
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
    } catch (err) { console.error('Failed to load logo in Base64:', err); }

    const postingDate = new Date(voucher.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const amount = Number(voucher.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    
    const authorizedByRaw = voucher.authorizedBy || 'PENDING';
    const cleanAuthorizedBy = authorizedByRaw.replace(/Treasurer\s+/i, '');
    const typeDisplay = voucher.disbursementType?.replace('_', ' ') || 'LOAN RELEASE';
    const fundDisplay = voucher.fundSource?.replace('_', ' ') || 'GENERAL FUND';
    const refDisplay = voucher.referenceNumber || 'PENDING ASSIGNMENT';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Disbursement Voucher - ${voucher.loanReference}</title>
        <style>
          @media print {
            @page { size: portrait; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; padding: 30px; font-size: 13px; background: #ffffff; }
          .voucher-container { border: 1px solid #cbd5e1; padding: 40px; border-radius: 12px; position: relative; max-width: 800px; margin: 0 auto; page-break-inside: avoid; }
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
          tbody td { padding: 18px 16px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          .amount-cell { font-size: 22px; font-weight: 900; color: #15803d; text-align: right; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
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
            <div class="title-badge">Disbursement Voucher</div>
          </div>
          <div class="details-grid">
            <div><div class="label">Voucher Reference</div><div class="value">${voucher.id}</div></div>
            <div><div class="label">Posting Date</div><div class="value">${postingDate}</div></div>
            <div><div class="label">Disbursement Category</div><div class="value" style="color: #0369a1;">${typeDisplay}</div></div>
            <div><div class="label">Deducted From Fund</div><div class="value" style="color: #b45309;">${fundDisplay}</div></div>
            <div class="payee-block"><div class="label">Payee</div><div class="value">${voucher.memberName} (ID: ${voucher.memberId})</div></div>
          </div>
          <table>
            <thead><tr><th style="text-align: left;">Particulars / Narrative</th><th style="text-align: right;">Debit Amount (PHP)</th></tr></thead>
            <tbody>
              <tr><td style="text-align: left;">Disbursement release for reference: ${voucher.loanReference}. <br><span style="font-size: 10px; color: #64748b; font-weight: 500;">Method: ${voucher.paymentMethod} ${voucher.bankAccount && voucher.bankAccount !== 'N/A' ? `(${voucher.bankAccount})` : ''}</span><br><span style="font-size: 10px; color: #04152d; font-weight: 700;">Transaction Ref: ${refDisplay}</span></td><td class="amount-cell">₱${amount}</td></tr>
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="sig-block">
              <div class="sig-label">Prepared By</div>
              <div class="sig-line">
                <div class="name">System Admin</div>
                <div class="title">BDOEA Officer</div>
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
                <div class="name">${voucher.memberName}</div>
                <div class="title">Member</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>`;
  };

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
      const voucherHTML = await getVoucherHTML(selectedVoucher);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      
      doc.open(); doc.write(voucherHTML); doc.close();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([ import('html2canvas'), import('jspdf') ]);

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
      alert('Failed to generate PDF. Please try again.');
    } finally {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      setIsGeneratingPDF(false);
    }
  };

  const printVoucher = async () => {
    if (!selectedVoucher) return;
    setIsPrinting(true);

    try {
      const voucherHTML = await getVoucherHTML(selectedVoucher);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error('Cannot access iframe document');
      
      doc.open();
      doc.write(voucherHTML);
      doc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }, 500);

    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to print voucher. Please try again.');
    } finally {
      setIsPrinting(false);
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
    <div className="flex flex-col min-h-screen bg-transparent relative print:block print:h-auto print:min-h-0 print:overflow-visible">
      
      <div className={selectedVoucher ? "print:hidden" : ""}>

        <Header />

        <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 print:p-0 print:m-0 print:max-w-none">
          <div className="flex flex-col gap-6 mb-8 w-full">

            {/* Header / Read-Only Badge */}
            <div className="flex justify-between items-center w-full px-2 mt-2">
              <h2 className="text-xl font-black text-[#04152d]">Disbursement Ledger</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-widest shadow-sm">
                <ShieldCheck size={14} /> Audit Mode (Read-Only)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><FileText size={24} /></div>
                  <div className="text-left">
                    <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Requests</p>
                    <p className="text-3xl font-black text-[#04152d]">{disbursements.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={24} /></div>
                  <div className="text-left">
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
                        <div key={d.name} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide text-left">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }}></div>
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 text-left">No Chart Data</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 overflow-hidden flex flex-col min-h-[400px] w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
              
              <div className="p-6 border-b border-gray-100 flex flex-col gap-5 bg-white/50">
                
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[250px] relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search Reference or Member..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 focus:border-blue-500 outline-none transition-colors font-bold text-[#04152d]" />
                  </div>
                  
                  <div className="relative inline-flex items-center w-full sm:w-auto min-w-[160px] bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors shadow-sm">
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
                      <button 
                        onClick={() => setFilterMonth('')} 
                        className="pr-4 pl-2 text-gray-400 hover:text-red-500 z-20 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <div className="pr-4 pl-2 pointer-events-none">
                        <Calendar size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="relative inline-block w-full sm:w-auto min-w-[150px]">
                    <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-white border border-gray-200 focus:border-blue-500 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer shadow-sm">
                      <option value="ALL">All Categories</option>
                      <option value="LOAN_RELEASE">Loan Release</option>
                      <option value="DEATH_ASSISTANCE">Death Assistance</option>
                      <option value="EMERGENCY_ASSISTANCE">Emergency / Calamity</option>
                      <option value="FOREIGN_ASSISTANCE">Foreign Assistance</option>
                      <option value="MEMBER_BENEFIT">Member Benefit</option>
                      <option value="REFUND">Refund</option>
                    </select>
                  </div>

                  <div className="relative inline-block w-full sm:w-auto min-w-[150px]">
                    <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-10 pr-8 py-2.5 text-sm bg-white border border-gray-200 focus:border-blue-500 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer shadow-sm">
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto w-full">
                {isLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-gray-500">
                    <Loader size={32} className="animate-spin mb-4 text-[#04152d]" />
                    <p className="font-bold text-left">Loading records...</p>
                  </div>
                ) : filteredDisbursements.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-gray-400">
                    <AlertTriangle className="mb-4 text-amber-400" size={48} />
                    <p className="font-black text-[#04152d] text-lg text-left">No requests found matching filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left whitespace-nowrap min-w-[1100px]">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Date Created</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Loan Reference</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Member ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Member Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Payment Method</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Bank Account</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-left">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedDisbursements.map((disb) => (
                        <tr 
                          key={disb.id} 
                          onClick={() => setSelectedVoucher(disb)}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-5 text-sm font-medium text-gray-500 text-left">
                            {new Date(disb.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5 text-sm font-mono font-bold text-blue-600 text-left">
                            {disb.loanReference}
                          </td>
                          <td className="px-6 py-5 text-sm font-mono font-bold text-gray-500 text-left">
                            {disb.memberId}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-[#04152d] text-left">
                            {disb.memberName}
                          </td>
                          <td className="px-6 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest text-left">
                            {disb.paymentMethod}
                          </td>
                          <td className="px-6 py-5 text-sm font-mono font-medium text-[#04152d] text-left">
                            {disb.bankAccount || 'N/A'}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-emerald-700 text-base">
                            ₱{Number(disb.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-left text-sm">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                              disb.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 
                              disb.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200/50' : 
                              'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            }`}>
                              {disb.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button className="inline-flex items-center justify-center gap-2 bg-gray-50 text-gray-600 group-hover:bg-[#04152d] group-hover:text-white border border-gray-200 font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm">
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
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
          </div>
        </main>
      </div>

      {/* VOUCHER MODAL (Read Only) */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-transparent print:items-start print:justify-start print:p-0 animate-fade-in p-4 sm:p-6">
          <div className="bg-white w-full max-w-3xl rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full animate-pop overflow-hidden print:overflow-visible">
            
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-100 print:hidden bg-gray-50/80 rounded-t-[24px]">
              <div>
                <h2 className="font-black text-xl text-[#04152d] text-left">Disbursement Details</h2>
                <p className="text-xs font-medium text-gray-500 mt-1">Audit verification view. Transactions are locked.</p>
              </div>
              <div className="flex gap-3">
                {selectedVoucher.status === 'COMPLETED' && (
                  <>
                    <button onClick={printVoucher} disabled={isPrinting} className="inline-flex items-center justify-center gap-2 border-2 border-[#04152d] text-[#04152d] hover:bg-[#04152d] hover:text-white font-bold py-2 px-4 rounded-xl text-sm shadow-[0_4px_0_rgba(2,6,15,0.55)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,6,15,0.55)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
                      {isPrinting ? <><Loader size={16} className="animate-spin" /> Printing...</> : <><Printer size={16} /> Print</>}
                    </button>
                    <button onClick={downloadVoucherPDF} disabled={isGeneratingPDF} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-[0_6px_0_rgba(5,70,40,0.45)] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(5,70,40,0.45)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {isGeneratingPDF ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> PDF</>}
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedVoucher(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"><X size={24} /></button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div ref={voucherRef} className="flex-1 overflow-y-auto p-6 md:p-12 print:p-0 bg-white print:overflow-visible print:h-auto print:block">
              
              <div className="hidden print:flex w-full justify-end pb-8">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">BDOEA Financial System</span>
              </div>

              {selectedVoucher.status === 'REJECTED' && (
                <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)] print:hidden">
                  <Ban size={24} className="text-red-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-red-800 font-black text-base text-left">Disbursement Request Rejected</p>
                    <p className="text-red-700 text-sm mt-1.5 font-medium text-left">Reason: {selectedVoucher.rejectedReason || selectedVoucher.reason || 'No reason provided.'}</p>
                  </div>
                </div>
              )}

              <div className="text-center mb-10 border-b-2 border-[#04152d] pb-8 flex flex-col items-center print:border-b print:pb-6 print:mb-6 print:block">
                <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="h-16 object-contain mb-4 print:mx-auto" />
                <p className="text-xs text-gray-500 font-black uppercase tracking-widest text-center">Banco de Oro Employees Association</p>
                <h2 className="mt-6 text-lg font-black bg-[#04152d] text-white inline-block px-8 py-2 rounded-full uppercase tracking-widest text-xs shadow-md print:bg-white print:text-[#04152d] print:border-2 print:border-[#04152d] print:shadow-none text-center">
                  Disbursement Voucher
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10 text-sm bg-[#f8faff] p-6 rounded-2xl border border-gray-100 print:bg-white print:border-none print:p-0">
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Voucher Reference</p><p className="font-mono font-bold text-sm text-[#04152d] text-left">{selectedVoucher.id}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Posting Date</p><p className="font-medium text-[#04152d] text-left">{new Date(selectedVoucher.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Disbursement Category</p><p className="font-medium text-blue-700 text-xs font-mono bg-blue-50 px-3 py-1.5 rounded-lg inline-block print:bg-transparent print:px-0 print:text-blue-800 print:font-bold text-left">{selectedVoucher.disbursementType?.replace('_', ' ') || 'LOAN RELEASE'}</p></div>
                <div><p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Deducted From Fund</p><p className="font-medium text-amber-700 text-xs font-mono bg-amber-50 px-3 py-1.5 rounded-lg inline-block print:bg-transparent print:px-0 print:text-amber-800 print:font-bold text-left">{selectedVoucher.fundSource?.replace('_', ' ') || 'PENDING ASSIGNMENT'}</p></div>

                <div className="col-span-2 pt-4 border-t border-gray-200"><p className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5 text-left">Payee (Member Name & ID)</p><p className="font-black text-2xl text-[#04152d] text-left">{selectedVoucher.memberName} <span className="text-sm font-medium text-gray-400 font-mono ml-2">ID: {selectedVoucher.memberId}</span></p></div>
              </div>

              <table className="w-full mb-12 border-collapse text-sm">
                <thead>
                  <tr className="bg-[#04152d] text-white border-y-2 border-[#04152d] print:bg-white print:text-[#04152d]">
                    <th className="py-3.5 px-5 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-lg print:border-b-2 print:border-[#04152d]">Particulars / Narrative</th>
                    <th className="py-3.5 px-5 text-right text-[10px] font-black uppercase tracking-widest rounded-tr-lg print:border-b-2 print:border-[#04152d]">Debit Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="py-6 px-5 font-medium text-gray-800 leading-relaxed text-left">
                      Disbursement release for reference: <span className="font-black text-[#04152d]">{selectedVoucher.loanReference}</span>. <br/>
                      <span className="text-xs text-gray-500 font-medium italic mt-2 block text-left">Method: {selectedVoucher.paymentMethod} {selectedVoucher.bankAccount && selectedVoucher.bankAccount !== 'N/A' ? `(${selectedVoucher.bankAccount})` : ''}</span><br /><span className="text-xs text-[#04152d] font-bold mt-1 block text-left">Transaction Ref: {selectedVoucher.referenceNumber || 'PENDING ASSIGNMENT'}</span>
                    </td>
                    <td className="py-6 px-5 text-right font-black text-2xl text-emerald-700 align-top print:text-[#04152d]">₱{Number(selectedVoucher.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="grid grid-cols-3 gap-8 pt-12 print:pt-16">
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12 text-center">Prepared By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide text-center">System Admin</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 text-center">BDOEA Officer</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12 text-center">Confirmed By</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide text-center">
                      {selectedVoucher.authorizedBy ? selectedVoucher.authorizedBy.replace(/Treasurer\s+/i, '') : 'PENDING'}
                    </p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 text-center">Treasurer</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="block text-[11px] font-black text-[#04152d] uppercase tracking-[0.1em] mb-12 text-center">Received By Payee</p>
                  <div className="w-full border-t border-[#04152d] pt-3">
                    <p className="font-black text-xs text-[#04152d] uppercase tracking-wide text-center">{selectedVoucher.memberName}</p>
                    <p className="text-[10px] text-[#04152d] font-bold uppercase mt-1 text-center">Member</p>
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