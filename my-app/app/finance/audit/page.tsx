"use client";

import { useState, useMemo } from 'react';
import { Search, Download, Calendar, Filter, ChevronLeft, ChevronRight, FileX2 } from 'lucide-react';

// --- MOCK DATA ---
const mockAuditLogs = [
  { id: 1, timestamp: '2026-05-11T09:14:00', user: 'admin@pup.edu.ph', actionType: 'UPDATE', target: 'System Config', details: 'Changed loan interest rate to 6.00%' },
  { id: 2, timestamp: '2026-05-10T14:30:22', user: 'treasurer@pup.edu.ph', actionType: 'APPROVE', target: 'Loan LN-2026-042', details: 'Approved loan application for P30,000' },
  { id: 3, timestamp: '2026-05-09T08:15:00', user: 'super@pup.edu.ph', actionType: 'DELETE', target: 'User Record', details: 'Removed inactive user profile' },
  { id: 4, timestamp: '2026-05-09T08:10:00', user: 'user@pup.edu.ph', actionType: 'CREATE', target: 'Loan Application', details: 'Submitted regular loan request' },
  { id: 5, timestamp: '2026-05-08T16:45:11', user: 'treasurer@pup.edu.ph', actionType: 'UPDATE', target: 'Dues Collection', details: 'Marked April 2026 dues as PAID for 15 users' },
];

export default function AuditLogPage() {
  // --- STATE FOR FILTERS (Ready for Backend Query Params) ---
  const [searchUser, setSearchUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  
  // Mock Pagination State (Backend will control this later)
  const [currentPage, setCurrentPage] = useState(1);

  // --- FILTERING LOGIC ---
  const filteredLogs = useMemo(() => {
    return mockAuditLogs.filter(log => {
      const matchesSearch = log.user.toLowerCase().includes(searchUser.toLowerCase()) || 
                            log.details.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = filterDate ? log.timestamp.startsWith(filterDate) : true;
      const matchesAction = filterAction === 'ALL' ? true : log.actionType === filterAction;
      return matchesSearch && matchesDate && matchesAction;
    });
  }, [searchUser, filterDate, filterAction]);

  // --- HELPER: Format Date for UI ---
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short', day: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  };

  // --- CSV EXPORT LOGIC ---
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return; // Prevent empty exports
    const headers = ['Date/Time', 'User', 'Action Type', 'Target', 'Details'];
    const rows = filteredLogs.map(log => [
      log.timestamp.replace('T', ' '), 
      log.user, log.actionType, log.target, `"${log.details}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BDOEA_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 h-full flex flex-col min-h-0 bg-gray-50">
      
      {/* Header Area */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track and monitor all systemic financial actions securely.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          <Download size={16} /> Export to CSV
        </button>
      </div>

      {/* Control Bar (Filters) */}
      <div className="bg-white p-5 rounded-t-xl shadow-sm border border-gray-200 border-b-0 flex flex-col md:flex-row gap-4 items-end flex-shrink-0">
        
        {/* User Search */}
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Records</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by user email or details..." 
              value={searchUser}
              onChange={(e) => { setSearchUser(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div className="w-full md:w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Date</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-700 transition-shadow"
            />
          </div>
        </div>

        {/* Action Type Filter */}
        <div className="w-full md:w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Action Type</label>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select 
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white cursor-pointer transition-shadow"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table Wrapper */}
      <div className="bg-white shadow-sm border border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden rounded-b-xl">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium text-xs">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-black">{log.user}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wider border ${
                        log.actionType === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                        log.actionType === 'CREATE' ? 'bg-green-50 text-green-700 border-green-200' :
                        log.actionType === 'APPROVE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{log.target}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileX2 size={48} className="mb-3 text-gray-300" strokeWidth={1.5} />
                      <p className="text-base font-semibold text-gray-600">No logs found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION FOOTER (Backend Ready) --- */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">1</span> to <span className="font-bold text-gray-900">{filteredLogs.length}</span> of <span className="font-bold text-gray-900">{filteredLogs.length}</span> results
          </p>
          <div className="flex gap-2">
            <button 
              disabled 
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-400 cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled 
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-400 cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}