// components/AuditLogClient.tsx
"use client";

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, Search, Download, Eye, Activity, 
  Database, Filter, Calendar, Clock, ChevronLeft, ChevronRight, FileX2 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

// 1. Define the TypeScript shape for incoming database logs
interface AuditLogProp {
  id: string;
  timestamp: string;
  user: string;
  actionType: string;
  target: string;
  details: string;
}

export default function AuditLogClient({ initialLogs }: { initialLogs: AuditLogProp[] }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'Superadmin';

  // --- STATE FOR FILTERS ---
  const [searchUser, setSearchUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // --- MODAL STATE MANAGEMENT ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'view' | 'export' | null;
    payload?: any;
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', actionType: null, status: 'idle' });

  // ==========================================
  // 1. STRICT ROLE GATEKEEPER
  // ==========================================
  if (role !== 'Superadmin') {
    return (
      <div className="flex flex-col min-h-screen bg-transparent">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
          <div className="bg-white p-10 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col items-center max-w-md text-center">
            <div className="bg-red-50 p-5 rounded-full text-red-500 mb-5 shadow-[inset_0_0_0_2px_rgba(220,38,38,0.2)]">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-2xl font-black text-[#04152d]">Security Clearance Required</h2>
            <p className="text-sm text-gray-500 mt-3 font-medium leading-relaxed">
              System audit trails contain highly sensitive administrative data. Only Superadmins possess the security clearance to access this ledger.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. DATA AGGREGATION & FILTERING
  // ==========================================
  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesSearch = log.user.toLowerCase().includes(searchUser.toLowerCase()) || 
                            log.details.toLowerCase().includes(searchUser.toLowerCase()) || 
                            log.id.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = filterDate ? log.timestamp.startsWith(filterDate) : true;
      const matchesAction = filterAction === 'ALL' ? true : log.actionType === filterAction;
      return matchesSearch && matchesDate && matchesAction;
    });
  }, [initialLogs, searchUser, filterDate, filterAction]);

  const uniqueActions = Array.from(new Set(initialLogs.map(l => l.actionType)));
  const criticalCount = initialLogs.filter(l => l.actionType === 'DELETE' || l.actionType === 'ERROR').length;

  // Chart Data: Event Distribution
  const chartData = useMemo(() => {
    const actionMap: Record<string, number> = {};
    initialLogs.forEach(l => { actionMap[l.actionType] = (actionMap[l.actionType] || 0) + 1; });
    return Object.keys(actionMap).map(key => ({ name: key, value: actionMap[key] }));
  }, [initialLogs]);

  const CHART_COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#facc15', '#3b82f6', '#04152d'];

  // --- HELPER: Format Date for UI ---
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short', day: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  };

  // ==========================================
  // 3. HANDLERS & MODALS
  // ==========================================
  const triggerViewLog = (log: AuditLogProp) => {
    setModal({
      isOpen: true,
      title: `Event Detail: ${log.id}`,
      message: `Actor: ${log.user}\nTarget: ${log.target}\n\nPayload:\n${log.details}`,
      actionType: 'view',
      status: 'idle'
    });
  };

  const triggerExport = () => {
    setModal({
      isOpen: true,
      title: 'Export Audit Ledger',
      message: `You are about to export a decrypted CSV file containing ${filteredLogs.length} system audit records. Proceed?`,
      actionType: 'export',
      status: 'idle'
    });
  };

  const executeModalAction = () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    
    setTimeout(() => {
      if (modal.actionType === 'export') {
        const headers = ['Date/Time', 'User', 'Action Type', 'Target', 'Details'];
        const rows = filteredLogs.map(log => [
          log.timestamp.replace('T', ' '), 
          log.user, 
          log.actionType, 
          log.target, 
          `"${log.details.replace(/"/g, '""')}"` // Escape quotes for CSV
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `BDOEA_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setModal(prev => ({ 
        ...prev, 
        status: 'success', 
        resultMsg: prev.actionType === 'export' ? 'Audit ledger successfully exported to device.' : 'Log decoded successfully.' 
      }));
    }, 800);
  };

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      
      <ActionModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        status={modal.status}
        resultMsg={modal.resultMsg}
        onConfirm={executeModalAction}
        onClose={() => setModal({ ...modal, isOpen: false })}
        confirmText={modal.actionType === 'export' ? "Generate CSV" : "Acknowledge"}
      />

      <div className="print:hidden">
        <Header />
      </div>

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-black text-[#04152d] tracking-tight">System Audit Logs</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Immutable cryptographic trail of all system activities and user sessions.</p>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Database size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Logged Events</p>
                <p className="text-3xl font-black text-[#04152d]">{initialLogs.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <ShieldAlert size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-red-600 uppercase tracking-[0.12em] mb-0.5">Critical Actions</p>
                <p className="text-3xl font-black text-[#04152d]">{criticalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {chartData.length > 0 ? (
              <div className="w-full h-[80px] flex items-center justify-between">
                <div className="h-[80px] w-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={3}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#04152d' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 w-1/2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">By Event Type</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {chartData.map((d, idx) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 truncate">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-400">No Data</p>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex-1 min-w-[250px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search by User, Target, or Details..." 
              value={searchUser} onChange={(e) => { setSearchUser(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
            />
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              type="date" 
              value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
            />
          </div>
          
          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
              <option value="ALL">All Event Types</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex-1 flex flex-col overflow-hidden min-h-[500px] animate-slide-up" style={{ animationDelay: '0.25s' }}>
          
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#04152d]">Security & Event Ledger</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">{filteredLogs.length} Records</span>
            </div>
            <button 
              onClick={triggerExport}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Actor / User</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Event Type</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Target</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Payload Summary</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#e8edf8]/60 transition-colors duration-100">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm font-bold text-[#04152d]">{new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 block mt-0.5 ml-6">{new Date(log.timestamp).toLocaleTimeString('en-US')}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-[#04152d] text-sm">{log.user}</span>
                      <span className="text-[10px] font-mono text-gray-400 block mt-0.5">{log.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        log.actionType === 'DELETE' ? 'bg-red-100 text-red-700 shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.3)]' : 
                        log.actionType === 'UPDATE' || log.actionType === 'CREATE' ? 'bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]' : 
                        log.actionType.includes('WEBHOOK') || log.actionType.includes('SYSTEM') ? 'bg-purple-100 text-purple-700 shadow-[inset_0_0_0_1.5px_rgba(139,92,246,0.3)]' :
                        'bg-blue-100 text-blue-700 shadow-[inset_0_0_0_1.5px_rgba(59,130,246,0.3)]'
                      }`}>
                        {log.actionType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-gray-600">{log.target}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-gray-500 truncate max-w-[250px]" title={log.details}>{log.details}</p>
                    </td>
                    <td className="px-6 py-5 text-right pr-6">
                      <button 
                        onClick={() => triggerViewLog(log)} 
                        className="inline-flex items-center justify-center gap-2 text-gray-500 hover:text-[#04152d] hover:bg-gray-200/80 font-medium p-2 rounded-xl transition-all duration-150" 
                        title="View Details"
                      >
                        <Eye size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FileX2 size={48} className="mb-3 text-gray-300" strokeWidth={1.5} />
                        <p className="text-base font-semibold text-[#04152d]">No logs found</p>
                        <p className="text-sm mt-1 font-medium">Try adjusting your filters or wait for a database sync.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-[#04152d]">1</span> to <span className="font-bold text-[#04152d]">{filteredLogs.length}</span> of <span className="font-bold text-[#04152d]">{filteredLogs.length}</span> results
            </p>
            <div className="flex gap-2">
              <button disabled className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button disabled className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}