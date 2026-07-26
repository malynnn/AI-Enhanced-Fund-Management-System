"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { 
  Database, FileSpreadsheet, Play, CheckCircle2, 
  AlertTriangle, Loader2, Search, Download, RefreshCw, Layers,
  Wallet, ArrowRightLeft, TrendingUp, TrendingDown, FileText, ChevronRight
} from 'lucide-react';
import Header from '@/components/Header';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

// Interfaces for response
interface Stats {
  initial_count: number;
  final_count: number;
  total_dropped: number;
  drop_reasons: Record<string, number>;
}

interface ExtractionResult {
  success: boolean;
  message: string;
  security_check: {
    verified: boolean;
    message: string;
  } | null;
  stats: {
    funds: Stats;
    transactions: Stats;
  };
  data: {
    funds: any[];
    transactions: any[];
  };
  error_details?: string;
}

interface FundDetail {
  id: string;
  name: string;
  code: string;
  balance: number;
}

interface FundTxStats {
  deposits: number;
  withdrawals: number;
  loans: number;
  tx_count: number;
}

interface AnalyticsResult {
  total_balance: number;
  total_tx_count: number;
  total_deposits: number;
  total_withdrawals: number;
  total_loans: number;
  total_correcting: number;
  deposit_count: number;
  withdrawal_count: number;
  loan_count: number;
  correcting_count: number;
  avg_deposit: number;
  avg_withdrawal: number;
  avg_loan: number;
  net_flow: number;
  fund_balances: Record<string, number>;
  fund_details: FundDetail[];
  fund_tx_stats: Record<string, FundTxStats>;
}

interface AnalyticsPayload {
  summary: AnalyticsResult;
  trends: {
    monthly_trends: Array<{
      period: string;
      deposits: number;
      withdrawals: number;
      loans: number;
      net_flow: number;
      tx_count: number;
    }>;
    daily_flow: Array<{
      date: string;
      net_change: number;
      cumulative: number;
    }>;
  };
}

function ForecastingContent() {
  const [sourceTab, setSourceTab] = useState<'db' | 'csv'>('db');
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'finance_db',
    user: 'readonly_user',
    password: 'readonly_pass'
  });

  const [csvFiles, setCsvFiles] = useState<{
    fundsName: string;
    fundsContent: string;
    txName: string;
    txContent: string;
  }>({
    fundsName: '',
    fundsContent: '',
    txName: '',
    txContent: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<{
    tested: boolean;
    secure: boolean;
    message: string;
  }>({
    tested: false,
    secure: false,
    message: 'Security connection audit not yet run.'
  });

  // Analytics Engine States
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsPayload | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Table Preview State
  const [previewTab, setPreviewTab] = useState<'funds' | 'transactions'>('funds');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Mock CSV templates
  const mockFundsCsv = `id,name,code,balance
GF,General Fund,GF,1812350
UF,Union Fund,UF,4520900
LN,Loans,LN,1468000
FA,Foreign Assistance,FA,2500000
DA,Death Assistance,DA,850000`;

  const mockTxCsv = `id,fund_id,amount,type,description,reference_id,timestamp
tx-101,GF,4500,WITHDRAWAL,Office Supplies Vendor Payment,REF-8809,2026-04-20T00:00:00Z
tx-102,GF,15000,DEPOSIT,Member Dues Batch Remittance,REF-8812,2026-04-22T00:00:00Z
tx-103,UF,12000,WITHDRAWAL,Union Assembly Expense,UN-2026-004,2026-04-18T00:00:00Z
tx-104,FA,500000,DEPOSIT,Foreign Grant Received,FG-8801,2026-04-15T00:00:00Z
tx-105,GF,-100,DEPOSIT,Invalid Negative Amount (Should Drop),REF-9999,2026-04-20T00:00:00Z
tx-106,GF,100,INVALID_TYPE,Invalid Tx Type (Should Drop),REF-9999,2026-04-20T00:00:00Z
tx-107,GF,100,DEPOSIT,Invalid Date (Should Drop),REF-9999,bad-date-format`;

  const handleLoadMockCsv = () => {
    setCsvFiles({
      fundsName: 'mock_funds.csv (Preloaded)',
      fundsContent: mockFundsCsv,
      txName: 'mock_transactions.csv (Preloaded)',
      txContent: mockTxCsv
    });
  };

  const handleFileUpload = (type: 'funds' | 'tx', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvFiles(prev => ({
        ...prev,
        [type === 'funds' ? 'fundsName' : 'txName']: file.name,
        [type === 'funds' ? 'fundsContent' : 'txContent']: text
      }));
    };
    reader.readAsText(file);
  };

  const runVerifySecurity = async () => {
    setIsVerifyingSecurity(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/forecasting/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'db',
          dbConfig
        })
      });
      const data = await res.json();
      if (data.success || data.security_check) {
        setSecurityStatus({
          tested: true,
          secure: data.security_check?.verified || false,
          message: data.security_check?.message || 'Verification complete.'
        });
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err: any) {
      setSecurityStatus({
        tested: true,
        secure: false,
        message: `Security Audit Error: ${err.message}`
      });
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const runAnalytics = async () => {
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch('/api/forecasting/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setAnalyticsResult(data.data);
      } else {
        setAnalyticsError(data.message || 'Analytics calculations failed.');
      }
    } catch (err: any) {
      setAnalyticsError(`Failed to fetch analytics: ${err.message}`);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const runExtraction = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setAnalyticsResult(null);
    setAnalyticsError(null);
    setCurrentPage(1);

    try {
      const payload = {
        source: sourceTab,
        dbConfig: sourceTab === 'db' ? dbConfig : undefined,
        csvData: sourceTab === 'csv' ? {
          funds: csvFiles.fundsContent,
          transactions: csvFiles.txContent
        } : undefined
      };

      const res = await fetch('/api/forecasting/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setResult(data);
        if (sourceTab === 'db' && data.security_check) {
          setSecurityStatus({
            tested: true,
            secure: data.security_check.verified,
            message: data.security_check.message
          });
        }
        
        // Chain the analytics processing
        await runAnalytics();
      } else {
        setErrorMsg(data.message || 'Data extraction execution failed.');
      }
    } catch (err: any) {
      setErrorMsg(`Failed to connect to extraction service: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runExtraction();
  }, []);

  const activePreviewData = useMemo(() => {
    if (!result) return [];
    return previewTab === 'funds' ? result.data.funds : result.data.transactions;
  }, [result, previewTab]);

  const filteredPreviewData = useMemo(() => {
    return activePreviewData.filter((item: any) => {
      const stringified = JSON.stringify(item).toLowerCase();
      return stringified.includes(searchTerm.toLowerCase());
    });
  }, [activePreviewData, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPreviewData.length / itemsPerPage));
  
  const paginatedPreviewData = useMemo(() => {
    return filteredPreviewData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPreviewData, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Recharts Helper Formatter
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e6) {
      return `₱${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `₱${(value / 1e3).toFixed(0)}K`;
    }
    return `₱${value}`;
  };

  // Recharts memoized structures
  const balanceChartData = useMemo(() => {
    if (!analyticsResult) return [];
    return analyticsResult.trends.daily_flow;
  }, [analyticsResult]);

  const monthlyChartData = useMemo(() => {
    if (!analyticsResult) return [];
    return analyticsResult.trends.monthly_trends;
  }, [analyticsResult]);

  const pieChartData = useMemo(() => {
    if (!analyticsResult) return [];
    const CHART_COLORS = ['#04152d', '#3b82f6', '#facc15', '#10b981', '#f43f5e', '#8b5cf6'];
    return analyticsResult.summary.fund_details
      .filter((f: any) => f.balance > 0)
      .map((f: any, idx: number) => ({
        name: f.name,
        value: f.balance,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
  }, [analyticsResult]);

  const exportPDFReport = async () => {
    const element = document.getElementById('analytics-dashboard-report');
    if (!element) return;
    setIsExportingPDF(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f4f5f7'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`FMS_Financial_Analytics_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // iOS 26/27-style liquid glass primitives — compact, refractive, subtly tinted
  const ultraGlassCard = "glass-sheen bg-gradient-to-br from-white/55 via-white/40 to-white/30 backdrop-blur-[34px] backdrop-saturate-[190%] border border-white/70 shadow-[0_10px_30px_rgba(20,30,70,0.09),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 md:p-6 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]";
  const pillBtn = "glass-sheen px-4 py-2 bg-white/70 hover:bg-white/90 backdrop-blur-xl backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_14px_rgba(20,30,70,0.08),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(20,30,70,0.13),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full text-[12.5px] font-black text-[#04152d] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7] overflow-hidden">
      <style jsx global>{`
        @keyframes liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        /* iOS 26/27-style liquid glass: standing specular highlight + refraction rim + hover bloom */
        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%),
            radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.85;
          transition: opacity 0.35s ease;
          pointer-events: none;
          z-index: 1;
        }
        .glass-sheen:hover::before {
          opacity: 1;
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -10px 18px -14px rgba(80,110,220,0.22),
            inset 1px 0 0 rgba(255,255,255,0.35),
            inset -1px 0 0 rgba(255,255,255,0.12),
            inset 0 0 0 1px rgba(255,255,255,0.05);
          transition: box-shadow 0.35s ease;
          pointer-events: none;
          z-index: 1;
          border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 -10px 20px -12px rgba(80,110,220,0.3),
            inset 1px 0 0 rgba(255,255,255,0.5),
            inset -1px 0 0 rgba(255,255,255,0.18),
            inset 0 0 0 1px rgba(255,255,255,0.55);
        }
        .glass-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(100px);
          pointer-events: none;
          animation: liquid-drift 20s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient liquid glass backdrop */}
      <div className="glass-blob w-[480px] h-[480px] bg-blue-400/45 -top-32 -left-20" />
      <div className="glass-blob w-[440px] h-[440px] bg-amber-300/40 top-1/3 -right-32" style={{ animationDelay: '4s' }} />
      <div className="glass-blob w-[360px] h-[360px] bg-emerald-300/35 bottom-0 left-1/3" style={{ animationDelay: '8s' }} />

      <Header />

      <main className="p-4 md:p-5 max-w-[1600px] w-full mx-auto space-y-5 flex-1 text-left relative z-10">

        {/* Source toggle — floating, centered, no rectangle container */}
        <div className="flex justify-center">
          <div className="glass-sheen flex gap-1 p-1 bg-white/55 backdrop-blur-2xl backdrop-saturate-[190%] rounded-full border border-white/70 shadow-[0_12px_28px_rgba(20,30,70,0.12),inset_0_2px_3px_rgba(255,255,255,0.95)]">
            <button 
              onClick={() => setSourceTab('db')}
              className={`glass-sheen px-4 py-2 rounded-full text-[12.5px] font-black transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 flex items-center gap-1.5 ${
                sourceTab === 'db' 
                  ? 'bg-white/95 shadow-[0_4px_14px_rgba(20,30,70,0.14),inset_0_1px_2px_rgba(255,255,255,1)] text-[#04152d] scale-100 border border-white' 
                  : 'text-gray-500 hover:text-[#04152d] hover:bg-white/70 border border-transparent hover:border-white/70'
              }`}
            >
              <Database size={15} className={sourceTab === 'db' ? "text-blue-500" : "opacity-70"} /> Live Database
            </button>
            <button 
              onClick={() => setSourceTab('csv')}
              className={`glass-sheen px-4 py-2 rounded-full text-[12.5px] font-black transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 flex items-center gap-1.5 ${
                sourceTab === 'csv' 
                  ? 'bg-white/95 shadow-[0_4px_14px_rgba(20,30,70,0.14),inset_0_1px_2px_rgba(255,255,255,1)] text-[#04152d] scale-100 border border-white' 
                  : 'text-gray-500 hover:text-[#04152d] hover:bg-white/70 border border-transparent hover:border-white/70'
              }`}
            >
              <FileSpreadsheet size={15} className={sourceTab === 'csv' ? "text-amber-500" : "opacity-70"} /> Upload CSV
            </button>
          </div>
        </div>

        {/* Data Source Settings — Live Database Audit Form */}
        {sourceTab === 'db' && !result && (
          <div className={`flex flex-col max-w-xl mx-auto ${ultraGlassCard}`}>
            <h3 className="text-base font-black text-[#04152d] mb-4 flex items-center gap-2 tracking-tighter">
              <Database size={17} className="text-blue-500" /> Database Connection settings
            </h3>
            <div className="space-y-3.5 text-[12.5px] font-bold text-gray-700">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block mb-1 opacity-70">Database Host</label>
                  <input 
                    type="text" 
                    value={dbConfig.host} 
                    onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-white/80 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1 opacity-70">Port</label>
                  <input 
                    type="text" 
                    value={dbConfig.port} 
                    onChange={e => setDbConfig({...dbConfig, port: e.target.value})}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-white/80 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 opacity-70">Database Name</label>
                <input 
                  type="text" 
                  value={dbConfig.database} 
                  onChange={e => setDbConfig({...dbConfig, database: e.target.value})}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-white/80 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 opacity-70">User (Read-only)</label>
                  <input 
                    type="text" 
                    value={dbConfig.user} 
                    onChange={e => setDbConfig({...dbConfig, user: e.target.value})}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-white/80 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1 opacity-70">Password</label>
                  <input 
                    type="password" 
                    value={dbConfig.password} 
                    onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-white/80 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button 
                  onClick={runVerifySecurity}
                  disabled={isVerifyingSecurity || isLoading}
                  className="glass-sheen px-4 py-2.5 rounded-full border border-white/80 bg-white/70 text-[#04152d] font-black text-[12px] flex items-center justify-center gap-1.5 flex-1 hover:bg-white active:scale-95 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.04)] disabled:opacity-40"
                >
                  {isVerifyingSecurity ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} 
                  Test Secure Connection
                </button>
                <button 
                  onClick={runExtraction}
                  disabled={isVerifyingSecurity || isLoading}
                  className="glass-sheen px-4 py-2.5 rounded-full bg-[#04152d]/90 text-white font-black text-[12px] flex items-center justify-center gap-1.5 flex-1 hover:bg-[#04152d] active:scale-95 transition-all shadow-[0_4px_10px_rgba(4,21,45,0.2)] disabled:opacity-40"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-white" />}
                  Execute Extraction
                </button>
              </div>

              {securityStatus.tested && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 mt-2 animate-in fade-in duration-300 ${
                  securityStatus.secure 
                    ? 'bg-emerald-50/75 border-emerald-200/60 text-emerald-900' 
                    : 'bg-red-50/75 border-red-200/60 text-red-900'
                }`}>
                  {securityStatus.secure ? <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={16} /> : <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={16} />}
                  <div>
                    <span className="font-black text-[12.5px] block">{securityStatus.secure ? 'Secure Connection Audited' : 'Security Audit Refused'}</span>
                    <span className="text-[11.5px] font-bold opacity-80 mt-0.5 block leading-normal">{securityStatus.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Source Settings — CSV Upload Form */}
        {sourceTab === 'csv' && (
          <div className={`flex flex-col ${ultraGlassCard}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-base font-black text-[#04152d] flex items-center gap-2 tracking-tighter">
                <Layers size={17} className="text-amber-500" /> Data Source Settings
              </h3>
              <button 
                onClick={handleLoadMockCsv}
                className={pillBtn}
              >
                <RefreshCw size={15} /> Preload Mock Data
              </button>
            </div>

            <div className="flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* File Upload 1 */}
                <div className="glass-sheen bg-gradient-to-br from-blue-50/50 via-white/45 to-white/35 backdrop-blur-2xl backdrop-saturate-[180%] border border-white/70 hover:border-white hover:shadow-[0_12px_28px_rgba(20,60,150,0.1)] rounded-[20px] p-6 md:p-7 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 active:scale-[0.97] active:translate-y-0 relative shadow-[0_4px_16px_rgba(20,30,70,0.05),inset_0_2px_6px_rgba(255,255,255,0.9)] group">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={e => handleFileUpload('funds', e)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-11 h-11 rounded-full bg-white/90 shadow-[0_4px_14px_rgba(20,60,150,0.12),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group-hover:scale-110 transition-transform duration-400 ease-out">
                    <FileSpreadsheet className="text-blue-600" size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <span className="block text-[12.5px] font-black text-[#04152d] tracking-tight">
                      {csvFiles.fundsName || 'Upload funds.csv'}
                    </span>
                    <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-widest mt-1">id, name, code, balance</span>
                  </div>
                </div>

                {/* File Upload 2 */}
                <div className="glass-sheen bg-gradient-to-br from-emerald-50/50 via-white/45 to-white/35 backdrop-blur-2xl backdrop-saturate-[180%] border border-white/70 hover:border-white hover:shadow-[0_12px_28px_rgba(16,150,90,0.1)] rounded-[20px] p-6 md:p-7 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 active:scale-[0.97] active:translate-y-0 relative shadow-[0_4px_16px_rgba(20,30,70,0.05),inset_0_2px_6px_rgba(255,255,255,0.9)] group">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={e => handleFileUpload('tx', e)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-11 h-11 rounded-full bg-white/90 shadow-[0_4px_14px_rgba(16,150,90,0.12),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center group-hover:scale-110 transition-transform duration-400 ease-out">
                    <FileSpreadsheet className="text-emerald-600" size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <span className="block text-[12.5px] font-black text-[#04152d] tracking-tight">
                      {csvFiles.txName || 'Upload transactions.csv'}
                    </span>
                    <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-widest mt-1">id, fund, amount, type</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex">
              <button 
                onClick={runExtraction}
                disabled={isLoading || isVerifyingSecurity || !csvFiles.fundsContent || !csvFiles.txContent}
                className="glass-sheen w-full bg-[#04152d]/88 backdrop-blur-2xl backdrop-saturate-150 text-white font-black py-3 rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:bg-[#04152d]/95 hover:shadow-[0_14px_30px_rgba(4,21,45,0.4)] active:scale-[0.97] active:translate-y-0 flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(4,21,45,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_22px_rgba(4,21,45,0.3)] tracking-tight text-[12.5px] border border-white/10"
              >
                {isLoading ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} className="fill-white" />} 
                Execute Secure Extraction
              </button>
            </div>
          </div>
        )}

        {/* Global Loading / Error indicators */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/45 backdrop-blur-[34px] border border-white/70 rounded-[24px] max-w-md mx-auto shadow-md">
            <Loader2 className="animate-spin text-blue-500 w-10 h-10 mb-4" />
            <p className="text-[13px] font-black text-[#04152d]">Running secure pipeline extraction...</p>
          </div>
        )}

        {errorMsg && (
          <div className="max-w-xl mx-auto p-5 bg-red-50/80 border border-red-200/60 text-red-900 rounded-[22px] flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-[13.5px] font-black text-[#04152d]">Extraction Pipeline Error</h4>
              <p className="text-[12px] font-bold opacity-80 mt-1 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && result.success && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Funds Extracted', val: result.stats.funds.initial_count, icon: Database, color: 'text-blue-600', tint: 'from-blue-50/55 via-white/45 to-white/30' },
                { title: 'Clean Funds', val: result.stats.funds.final_count, icon: CheckCircle2, color: 'text-emerald-500', tint: 'from-emerald-50/55 via-white/45 to-white/30' },
                { title: 'Tx Extracted', val: result.stats.transactions.initial_count, icon: FileSpreadsheet, color: 'text-amber-500', tint: 'from-amber-50/55 via-white/45 to-white/30' },
                { title: 'Clean Tx', val: result.stats.transactions.final_count, icon: CheckCircle2, color: 'text-emerald-500', tint: 'from-emerald-50/55 via-white/45 to-white/30' },
              ].map((stat, i) => (
                <div key={i} className={`glass-sheen bg-gradient-to-br ${stat.tint} backdrop-blur-[34px] backdrop-saturate-[190%] border border-white/70 shadow-[0_8px_24px_rgba(20,30,70,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[20px] p-5 flex flex-col items-center text-center group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(20,30,70,0.1),inset_0_2px_3px_rgba(255,255,255,1)] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]`}>
                  <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(20,30,70,0.08),inset_0_1px_2px_rgba(255,255,255,1)] group-hover:scale-110 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] mb-2.5">
                    <stat.icon size={18} strokeWidth={2.5} className={stat.color} />
                  </div>
                  <div>
                    <p className={`text-[24px] leading-none font-black tracking-tighter drop-shadow-sm mb-1 ${stat.color}`}>{stat.val}</p>
                    <span className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.16em]">{stat.title}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Drop Alert */}
            {(result.stats.funds.total_dropped > 0 || result.stats.transactions.total_dropped > 0) && (
              <div className="glass-sheen bg-gradient-to-br from-amber-50/60 via-white/55 to-white/40 backdrop-blur-2xl backdrop-saturate-[190%] border border-amber-200/60 text-amber-900 p-5 rounded-[22px] flex flex-col md:flex-row gap-4 shadow-[0_8px_22px_rgba(217,155,15,0.12),inset_0_2px_3px_rgba(255,255,255,0.9)] hover:-translate-y-1 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                <div className="w-10 h-10 bg-amber-100/85 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,1)]">
                  <AlertTriangle className="text-amber-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-black tracking-tight text-[#04152d]">Validation Cleaning Alert: Malformed Records Dropped</h4>
                  <p className="text-[12.5px] font-bold mt-1.5 leading-relaxed opacity-80 max-w-3xl">
                    The validator clean-filtered <span className="font-black text-amber-600">{result.stats.funds.total_dropped}</span> invalid fund(s) and <span className="font-black text-amber-600">{result.stats.transactions.total_dropped}</span> invalid transaction(s). 
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4 pt-4 border-t border-amber-200/50">
                    {result.stats.funds.total_dropped > 0 && (
                      <div className="text-[13px]">
                        <span className="font-black text-[#04152d] tracking-tight">Fund drop reasons:</span>
                        <ul className="list-disc pl-5 mt-2 space-y-1.5 font-bold opacity-80">
                          {Object.entries(result.stats.funds.drop_reasons).map(([reason, count]) => 
                            count > 0 ? <li key={reason}>{reason.replace(/_/g, ' ')}: {count} dropped</li> : null
                          )}
                        </ul>
                      </div>
                    )}
                    {result.stats.transactions.total_dropped > 0 && (
                      <div className="text-[13px]">
                        <span className="font-black text-[#04152d] tracking-tight">Transaction drop reasons:</span>
                        <ul className="list-disc pl-5 mt-2 space-y-1.5 font-bold opacity-80">
                          {Object.entries(result.stats.transactions.drop_reasons).map(([reason, count]) => 
                            count > 0 ? <li key={reason}>{reason.replace(/_/g, ' ')}: {count} dropped</li> : null
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Dashboard Section */}
            {isAnalyticsLoading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white/45 backdrop-blur-[34px] border border-white/70 rounded-[24px] shadow-sm">
                <Loader2 className="animate-spin text-blue-500 w-9 h-9 mb-3" />
                <p className="text-[12.5px] font-black text-[#04152d]">Generating business intelligence dashboards and compiling reports...</p>
              </div>
            )}

            {analyticsError && (
              <div className="p-5 bg-red-50 border border-red-200 text-red-900 rounded-[22px] flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={18} />
                <p className="text-[12.5px] font-black">{analyticsError}</p>
              </div>
            )}

            {analyticsResult && !isAnalyticsLoading && (
              <div className="space-y-5">
                {/* Analytics Header Control Card */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${ultraGlassCard}`}>
                  <div>
                    <h2 className="text-[17px] font-black tracking-tight text-[#04152d] flex items-center gap-2">
                      <TrendingUp size={20} className="text-emerald-500" /> AI Forecasting & Fund Analytics
                    </h2>
                    <p className="text-[11.5px] font-bold text-gray-500 mt-0.5">
                      Aggregated calculations derived from validated SQLite data store.
                    </p>
                  </div>
                  <button 
                    onClick={exportPDFReport}
                    disabled={isExportingPDF}
                    className="glass-sheen px-4 py-2 bg-[#04152d] text-white hover:bg-[#04152d]/90 font-black text-[12px] rounded-full flex items-center gap-1.5 shadow-[0_4px_12px_rgba(4,21,45,0.25)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Export PDF Report
                  </button>
                </div>

                {/* Main print container for pdf export */}
                <div id="analytics-dashboard-report" className="space-y-5 p-1">
                  
                  {/* KPI summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Total Running Assets */}
                    <div className="glass-sheen bg-gradient-to-br from-blue-50/50 via-white/40 to-white/30 backdrop-blur-[34px] border border-white/70 shadow-[0_8px_24px_rgba(20,30,70,0.06)] rounded-[20px] p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-all duration-300">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                        <Wallet className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-wider">Total Net Assets</span>
                        <p className="text-[20px] font-black text-[#04152d] tracking-tight mt-0.5">
                          ₱{analyticsResult.summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Net Cash Flow */}
                    <div className="glass-sheen bg-gradient-to-br from-emerald-50/50 via-white/40 to-white/30 backdrop-blur-[34px] border border-white/70 shadow-[0_8px_24px_rgba(20,30,70,0.06)] rounded-[20px] p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-all duration-300">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        analyticsResult.summary.net_flow >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                      }`}>
                        <ArrowRightLeft className={analyticsResult.summary.net_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'} size={20} />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-wider">Net Cash Flow</span>
                        <p className={`text-[20px] font-black tracking-tight mt-0.5 ${
                          analyticsResult.summary.net_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {analyticsResult.summary.net_flow >= 0 ? '+' : ''} ₱{analyticsResult.summary.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Cash Inflow */}
                    <div className="glass-sheen bg-gradient-to-br from-emerald-50/50 via-white/40 to-white/30 backdrop-blur-[34px] border border-white/70 shadow-[0_8px_24px_rgba(20,30,70,0.06)] rounded-[20px] p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-all duration-300">
                      <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                        <TrendingUp className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-wider">Total Inflows</span>
                        <p className="text-[20px] font-black text-emerald-600 tracking-tight mt-0.5">
                          ₱{analyticsResult.summary.total_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Cash Outflow */}
                    <div className="glass-sheen bg-gradient-to-br from-rose-50/50 via-white/40 to-white/30 backdrop-blur-[34px] border border-white/70 shadow-[0_8px_24px_rgba(20,30,70,0.06)] rounded-[20px] p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-all duration-300">
                      <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 border border-rose-100">
                        <TrendingDown className="text-rose-600" size={20} />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-black text-gray-400 uppercase tracking-wider">Total Outflows</span>
                        <p className="text-[20px] font-black text-rose-600 tracking-tight mt-0.5">
                          ₱{(analyticsResult.summary.total_withdrawals + analyticsResult.summary.total_loans).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* Running balance area chart */}
                    <div className={`lg:col-span-2 ${ultraGlassCard}`}>
                      <h3 className="text-[13px] font-black text-[#04152d] tracking-tight uppercase tracking-wider border-b border-white/50 pb-2 mb-4">
                        Treasury Balance History (Running Cumulative)
                      </h3>
                      <div className="h-64 sm:h-80 w-full">
                        {balanceChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={balanceChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(20,30,70,0.06)" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={formatCurrency} />
                              <ChartTooltip 
                                formatter={(value: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Assets Balance']}
                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }}
                              />
                              <Area type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCumulative)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 font-bold">No historical data available</div>
                        )}
                      </div>
                    </div>

                    {/* Donut asset distribution chart */}
                    <div className={ultraGlassCard}>
                      <h3 className="text-[13px] font-black text-[#04152d] tracking-tight uppercase tracking-wider border-b border-white/50 pb-2 mb-4">
                        Asset Allocation (By Fund)
                      </h3>
                      <div className="h-64 sm:h-80 w-full flex items-center justify-center">
                        {pieChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {pieChartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ChartTooltip 
                                formatter={(value: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`, 'Balance']}
                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 'bold' }}
                              />
                              <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10.5px', fontWeight: 'bold', bottom: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-gray-400 font-bold">No allocation data available</div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Monthly inflows and outflows bar chart */}
                  <div className={ultraGlassCard}>
                    <h3 className="text-[13px] font-black text-[#04152d] tracking-tight uppercase tracking-wider border-b border-white/50 pb-2 mb-4">
                      Monthly Cash Flow Trends (Inflows vs Outflows)
                    </h3>
                    <div className="h-64 sm:h-80 w-full">
                      {monthlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(20,30,70,0.06)" />
                            <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={formatCurrency} />
                            <ChartTooltip 
                              formatter={(value: any, name: any) => {
                                const label = name === 'deposits' ? 'Deposits (Inflow)' : name === 'withdrawals' ? 'Withdrawals' : 'Loans';
                                return [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, label];
                              }}
                              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            <Bar dataKey="deposits" name="Deposits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="withdrawals" name="Withdrawals" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="loans" name="Loans" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 font-bold">No periodic trends available</div>
                      )}
                    </div>
                  </div>

                  {/* Fund Details and Activity Grid */}
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-black text-[#04152d] tracking-tight uppercase tracking-wider px-1">
                      Fund Summary & Transaction Activity
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsResult.summary.fund_details.map((fund) => {
                        const stats = analyticsResult.summary.fund_tx_stats[fund.id] || { deposits: 0, withdrawals: 0, loans: 0, tx_count: 0 };
                        return (
                          <div key={fund.id} className="glass-sheen bg-white/45 backdrop-blur-2xl border border-white/80 shadow-[0_4px_16px_rgba(20,30,70,0.04)] rounded-[20px] p-5 flex flex-col justify-between hover:shadow-[0_10px_24px_rgba(20,30,70,0.08)] transition-all duration-300">
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{fund.code}</span>
                                  <h4 className="text-[14px] font-black text-[#04152d] tracking-tight mt-0.5 truncate max-w-[180px]">{fund.name}</h4>
                                </div>
                                <span className="glass-sheen bg-white/85 px-2.5 py-1 border border-white rounded-lg text-[9.5px] font-black text-[#04152d] shadow-[0_2px_6px_rgba(20,30,70,0.04)] font-mono">
                                  ID: {fund.id}
                                </span>
                              </div>

                              <div className="mt-4">
                                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Available Balance</span>
                                <p className="text-[20px] font-black text-[#04152d] tracking-tight mt-0.5">
                                  ₱{fund.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 pt-3.5 border-t border-white/60 text-[11.5px] font-bold text-gray-500 space-y-1.5">
                              <div className="flex justify-between">
                                <span>Total Inflows (Deposits)</span>
                                <span className="font-black text-emerald-600">₱{stats.deposits.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Outflows (Withdrawals)</span>
                                <span className="font-black text-rose-500">₱{stats.withdrawals.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Loan Disbursements</span>
                                <span className="font-black text-amber-500">₱{stats.loans.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-dashed border-white/60 text-[11px]">
                                <span>Transactions Processed</span>
                                <span className="font-black text-[#04152d] flex items-center gap-1">
                                  {stats.tx_count} tx <ChevronRight size={12} />
                                </span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* DataFrame Preview */}
            <div className={`!p-0 overflow-hidden flex flex-col !rounded-[22px] ${ultraGlassCard}`}>
              
              {/* Header & Tabs */}
              <div className="p-5 border-b border-white/50 flex flex-wrap gap-4 items-center justify-between bg-white/30 backdrop-blur-xl backdrop-saturate-[180%]">
                <div className="glass-sheen flex gap-1 p-1 bg-white/45 backdrop-blur-2xl backdrop-saturate-[190%] rounded-full border border-white/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95)]">
                  <button 
                    onClick={() => { setPreviewTab('funds'); setCurrentPage(1); }}
                    className={`glass-sheen px-4 py-2 rounded-full text-[12.5px] font-black transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 ${
                      previewTab === 'funds' 
                        ? 'bg-white/95 shadow-[0_4px_12px_rgba(20,30,70,0.12),inset_0_1px_2px_rgba(255,255,255,1)] text-[#04152d] scale-100 border border-white' 
                        : 'text-gray-500 hover:bg-white/70 hover:text-[#04152d] border border-transparent hover:border-white/70'
                    }`}
                  >
                    Cleaned Funds ({result.data.funds.length})
                  </button>
                  <button 
                    onClick={() => { setPreviewTab('transactions'); setCurrentPage(1); }}
                    className={`glass-sheen px-4 py-2 rounded-full text-[12.5px] font-black transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 ${
                      previewTab === 'transactions' 
                        ? 'bg-white/95 shadow-[0_4px_12px_rgba(20,30,70,0.12),inset_0_1px_2px_rgba(255,255,255,1)] text-[#04152d] scale-100 border border-white' 
                        : 'text-gray-500 hover:bg-white/70 hover:text-[#04152d] border border-transparent hover:border-white/70'
                    }`}
                  >
                    Cleaned Transactions ({result.data.transactions.length})
                  </button>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="glass-sheen relative w-full sm:w-60 rounded-full">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                    <input 
                      type="text" 
                      placeholder="Search data..." 
                      value={searchTerm} 
                      onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="relative w-full pl-9 pr-4 py-2 rounded-full bg-white/55 hover:bg-white/75 backdrop-blur-xl backdrop-saturate-[180%] border border-white/70 shadow-[inset_0_2px_6px_rgba(20,30,70,0.04)] text-[12.5px] font-bold outline-none focus:bg-white/85 focus:shadow-[0_4px_16px_rgba(20,30,70,0.1)] focus:scale-[1.01] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] placeholder:text-gray-400 text-[#04152d]" 
                    />
                  </div>
                  
                  <button 
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activePreviewData, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `cleaned_${previewTab}_dataframe.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className={pillBtn}
                  >
                    <Download size={15} /> JSON
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap min-w-[700px] border-collapse">
                  <thead className="bg-white/50 backdrop-blur-2xl backdrop-saturate-[190%] shadow-[0_1px_0_rgba(255,255,255,0.9)] text-[9.5px] font-black text-gray-400 uppercase tracking-[0.16em]">
                    {previewTab === 'funds' ? (
                      <tr>
                        <th className="px-5 py-3">Fund ID</th>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Code</th>
                        <th className="px-5 py-3">Balance</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-5 py-3">Tx ID</th>
                        <th className="px-5 py-3">Fund</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Timestamp</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-white/50 text-[12.5px] font-bold text-[#04152d] bg-white/25 backdrop-blur-xl backdrop-saturate-[180%]">
                    {paginatedPreviewData.length > 0 ? (
                      paginatedPreviewData.map((row: any, idx) => (
                        <tr key={row.id || idx} className="hover:bg-white/65 hover:backdrop-blur-xl hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
                          {previewTab === 'funds' ? (
                            <>
                              <td className="px-5 py-3 font-mono text-[11px] opacity-60">{row.id}</td>
                              <td className="px-5 py-3 tracking-tight">{row.name}</td>
                              <td className="px-5 py-3">
                                <span className="glass-sheen bg-white/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/80 text-[10.5px] shadow-[0_2px_6px_rgba(20,30,70,0.05)]">{row.code}</span>
                              </td>
                              <td className="px-5 py-3 text-[#04152d] font-black text-[15px]">
                                ₱{Number(row.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-5 py-3 font-mono text-[11px] opacity-60 max-w-[100px] truncate" title={row.id}>{row.id}</td>
                              <td className="px-5 py-3 font-mono text-[11px]"><span className="glass-sheen bg-white/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/80 shadow-[0_2px_6px_rgba(20,30,70,0.05)]">{row.fund_id}</span></td>
                              <td className="px-5 py-3 font-black text-[15px]">
                                ₱{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-5 py-3">
                                <span className="glass-sheen inline-flex items-center justify-center px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border border-white/80 bg-white/75 backdrop-blur-md shadow-[0_2px_8px_rgba(20,30,70,0.06)]">
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-[13px] text-gray-500 max-w-[200px] truncate" title={row.description}>
                                {row.description}
                              </td>
                              <td className="px-5 py-3 text-[11px] font-mono text-gray-400">
                                {new Date(row.timestamp).toLocaleString()}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={previewTab === 'funds' ? 4 : 6} className="px-5 py-20 text-center text-gray-400 font-bold">
                          No preview records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/50 bg-white/35 backdrop-blur-2xl backdrop-saturate-[190%]">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className={pillBtn}
                  >
                    Previous
                  </button>
                  <span className="glass-sheen text-[9.5px] font-black text-gray-400 uppercase tracking-[0.16em] bg-white/55 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/70">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className={pillBtn}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default function ForecastingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-[#04152d]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    }>
      <ForecastingContent />
    </Suspense>
  );
}