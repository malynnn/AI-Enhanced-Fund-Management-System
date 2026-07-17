"use client";

import { useState, useMemo, Suspense } from 'react';
import { 
  Database, FileSpreadsheet, ShieldCheck, ShieldAlert, Play, CheckCircle2, 
  AlertTriangle, Loader2, Search, ArrowRight, Download, RefreshCw, Layers 
} from 'lucide-react';
import Header from '@/components/Header';

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

  const runExtraction = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
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
      } else {
        setErrorMsg(data.message || 'Data extraction execution failed.');
      }
    } catch (err: any) {
      setErrorMsg(`Failed to connect to extraction service: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Preview Data Filter & Paginate
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

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6]">
      <Header />

      <main className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 flex-1 text-left">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-[#04152d] tracking-tight">AI Forecasting Fund Management</h2>
            <p className="text-sm text-gray-500 font-semibold mt-1">Sprint 1 - Data Extraction, Security Hardening & Data Validation Module</p>
          </div>
          <div className="flex items-center gap-2 bg-[#f4f7fc] border border-gray-100 rounded-2xl px-4 py-2 text-xs font-bold text-gray-600">
            <ShieldCheck className="text-emerald-500 shrink-0" size={16} />
            <span>Role: Treasurer</span>
          </div>
        </div>

        {/* Configurations & Security Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-base font-black text-[#04152d] mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
              <Layers size={18} className="text-[#04152d]" /> Data Extraction Source Settings
            </h3>

            {/* Source Tab Toggle */}
            <div className="flex gap-2 bg-[#f3f4f6] p-1.5 rounded-2xl mb-6">
              <button 
                onClick={() => setSourceTab('db')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all ${
                  sourceTab === 'db' 
                    ? 'bg-white text-[#04152d] shadow-sm' 
                    : 'text-gray-500 hover:text-[#04152d] hover:bg-white/50'
                }`}
              >
                <Database size={16} /> PostgreSQL Database Connection
              </button>
              <button 
                onClick={() => setSourceTab('csv')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all ${
                  sourceTab === 'csv' 
                    ? 'bg-white text-[#04152d] shadow-sm' 
                    : 'text-gray-500 hover:text-[#04152d] hover:bg-white/50'
                }`}
              >
                <FileSpreadsheet size={16} /> CSV Files Upload
              </button>
            </div>

            {/* Tab Forms */}
            <div className="flex-1">
              {sourceTab === 'db' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Host Address</label>
                    <input 
                      type="text" 
                      value={dbConfig.host} 
                      onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 focus:border-[#04152d] outline-none font-semibold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Port</label>
                    <input 
                      type="text" 
                      value={dbConfig.port} 
                      onChange={e => setDbConfig({...dbConfig, port: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 focus:border-[#04152d] outline-none font-semibold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Database Name</label>
                    <input 
                      type="text" 
                      value={dbConfig.database} 
                      onChange={e => setDbConfig({...dbConfig, database: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 focus:border-[#04152d] outline-none font-semibold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Read-Only Database Role User</label>
                    <input 
                      type="text" 
                      value={dbConfig.user} 
                      onChange={e => setDbConfig({...dbConfig, user: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 focus:border-[#04152d] outline-none font-semibold transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Role Password</label>
                    <input 
                      type="password" 
                      value={dbConfig.password} 
                      onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 focus:border-[#04152d] outline-none font-semibold transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button 
                      onClick={handleLoadMockCsv}
                      className="text-xs font-black text-[#04152d] bg-[#f4f7fc] border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-100 transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} /> Preload Mock CSV with Errors
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-gray-200 hover:border-[#04152d] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative">
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={e => handleFileUpload('funds', e)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="text-gray-400" size={32} />
                      <span className="text-xs font-bold text-gray-600">
                        {csvFiles.fundsName || 'Upload funds.csv'}
                      </span>
                      <span className="text-[9px] text-gray-400">Required: id, name, code, balance</span>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 hover:border-[#04152d] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative">
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={e => handleFileUpload('tx', e)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="text-gray-400" size={32} />
                      <span className="text-xs font-bold text-gray-600">
                        {csvFiles.txName || 'Upload transactions.csv'}
                      </span>
                      <span className="text-[9px] text-gray-400">Required: id, fund_id, amount, type, timestamp</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Run Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={runExtraction}
                disabled={isLoading || isVerifyingSecurity || (sourceTab === 'csv' && (!csvFiles.fundsContent || !csvFiles.txContent))}
                className="flex-1 bg-[#04152d] hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Secure Data Extraction
              </button>

              {sourceTab === 'db' && (
                <button 
                  onClick={runVerifySecurity}
                  disabled={isLoading || isVerifyingSecurity}
                  className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isVerifyingSecurity ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Setup & Verify Read-Only Role
                </button>
              )}
            </div>
          </div>

          {/* Security Verification & Auditing Sidebar */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-[#04152d] mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                <ShieldCheck size={18} className="text-[#04152d]" /> Database Security Status
              </h3>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  !securityStatus.tested 
                    ? 'bg-gray-50 border-gray-200 text-gray-500' 
                    : securityStatus.secure 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {securityStatus.secure ? (
                    <ShieldCheck size={28} className="text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <ShieldAlert size={28} className={securityStatus.tested ? "text-red-600 mt-0.5 shrink-0" : "text-gray-400 mt-0.5 shrink-0"} />
                  )}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {securityStatus.tested 
                        ? (securityStatus.secure ? 'Read-Only Hardened' : 'Vulnerable Connection') 
                        : 'Security Audit Required'}
                    </h4>
                    <p className="text-xs font-semibold mt-1 leading-relaxed">
                      {securityStatus.message}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <div className="flex items-center gap-2 font-black mb-1.5">
                    <AlertTriangle size={15} className="text-amber-700" />
                    <span>How it works:</span>
                  </div>
                  <p className="font-semibold leading-relaxed">
                    To prevent malicious data manipulation during extraction, the system enforces a secure database policy. The extraction script connects using a limited role and executes an assertion write command (<code className="bg-amber-100 px-1 rounded">INSERT</code>). If the database throws an Access Denied error, the transaction rolls back, verifying that database integrity is enforced.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-4 mt-6">
              BDOEA CAPSTONE SYSTEM AUDIT MODULE V1.0.0
            </div>
          </div>
        </div>

        {/* Error Message Box */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-3xl flex items-start gap-3">
            <XCircleIcon className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-black">Data Extraction Execution Error</h4>
              <p className="text-xs font-semibold mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Results Displays */}
        {result && result.success && (
          <div className="space-y-6">
            
            {/* Extraction Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Funds Stats Card */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Funds Extracted</span>
                  <p className="text-3xl font-black text-[#04152d] mt-1.5">{result.stats.funds.initial_count}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Database size={20} />
                </div>
              </div>

              {/* Funds Cleaned Card */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cleaned Funds Loaded</span>
                  <p className="text-3xl font-black text-emerald-600 mt-1.5">{result.stats.funds.final_count}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              {/* Tx Extracted Card */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transactions Extracted</span>
                  <p className="text-3xl font-black text-[#04152d] mt-1.5">{result.stats.transactions.initial_count}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
              </div>

              {/* Cleaned Tx Loaded Card */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cleaned Tx Loaded</span>
                  <p className="text-3xl font-black text-emerald-600 mt-1.5">{result.stats.transactions.final_count}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
              </div>

            </div>

            {/* Cleaning Auditing Report Alert */}
            {(result.stats.funds.total_dropped > 0 || result.stats.transactions.total_dropped > 0) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-3xl flex gap-3">
                <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-black">Data Validation Cleaning Alert: Malformed Records Dropped</h4>
                  <p className="text-xs font-semibold mt-1 leading-relaxed">
                    The validator identified and clean-filtered <span className="font-black text-amber-700">{result.stats.funds.total_dropped}</span> invalid fund record(s) and <span className="font-black text-amber-700">{result.stats.transactions.total_dropped}</span> invalid transaction record(s). 
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-amber-200/50">
                    {result.stats.funds.total_dropped > 0 && (
                      <div className="text-xs">
                        <span className="font-bold text-amber-800">Fund drop reasons:</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1 font-semibold">
                          {Object.entries(result.stats.funds.drop_reasons).map(([reason, count]) => 
                            count > 0 ? <li key={reason}>{reason.replace(/_/g, ' ')}: {count} dropped</li> : null
                          )}
                        </ul>
                      </div>
                    )}
                    {result.stats.transactions.total_dropped > 0 && (
                      <div className="text-xs">
                        <span className="font-bold text-amber-800">Transaction drop reasons:</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1 font-semibold">
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

            {/* DataFrame Preview Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              
              {/* Preview Header & Tabs */}
              <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setPreviewTab('funds'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      previewTab === 'funds' 
                        ? 'bg-[#04152d] text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Cleaned Funds DataFrame ({result.data.funds.length})
                  </button>
                  <button 
                    onClick={() => { setPreviewTab('transactions'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      previewTab === 'transactions' 
                        ? 'bg-[#04152d] text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Cleaned Transactions DataFrame ({result.data.transactions.length})
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search preview data..." 
                      value={searchTerm} 
                      onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold outline-none focus:bg-white focus:border-[#04152d] transition-colors" 
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
                    className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                    title="Download Cleaned JSON"
                  >
                    <Download size={14} /> JSON
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                  <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {previewTab === 'funds' ? (
                      <tr>
                        <th className="px-6 py-4">Fund ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Balance</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Fund ID</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Timestamp</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-semibold text-[#04152d]">
                    {paginatedPreviewData.length > 0 ? (
                      paginatedPreviewData.map((row: any, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                          {previewTab === 'funds' ? (
                            <>
                              <td className="px-6 py-3.5 font-mono text-xs">{row.id}</td>
                              <td className="px-6 py-3.5">{row.name}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{row.code}</td>
                              <td className="px-6 py-3.5 text-emerald-600 font-bold">
                                ₱{Number(row.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-3.5 font-mono text-xs max-w-[120px] truncate" title={row.id}>{row.id}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{row.fund_id}</td>
                              <td className="px-6 py-3.5 font-bold">
                                ₱{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border ${
                                  row.type === 'DEPOSIT' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : row.type === 'WITHDRAWAL' 
                                      ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                      : 'bg-purple-50 text-purple-700 border-purple-100'
                                }`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-xs text-gray-500 max-w-[200px] truncate" title={row.description}>
                                {row.description}
                              </td>
                              <td className="px-6 py-3.5 text-xs text-gray-500 font-mono">{row.reference_id}</td>
                              <td className="px-6 py-3.5 text-xs font-mono text-gray-400">
                                {new Date(row.timestamp).toLocaleString()}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={previewTab === 'funds' ? 4 : 7} className="px-6 py-16 text-center text-gray-400">
                          No preview records found matching the search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl text-xs disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl text-xs disabled:opacity-50"
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

// Simple fallback icon wrapper
function XCircleIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

export default function ForecastingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] text-[#04152d]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    }>
      <ForecastingContent />
    </Suspense>
  );
}
