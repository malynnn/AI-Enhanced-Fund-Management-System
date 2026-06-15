// app/finance/config/accounts/page.tsx
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Power, Save, X, Hash, ShieldAlert, Search, Filter, Layers, CreditCard, Trash2 } from 'lucide-react';
import { PieChart, Pie, Tooltip } from 'recharts';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  fund: string;
  status: string;
}

// --- MOCK DATABASE (Fallback if API fails) ---
const initialAccounts: Account[] = [
  { id: 1, code: '1010', name: 'General Cash Fund', type: 'Asset', fund: 'General Fund', status: 'Active' },
  { id: 2, code: '1100', name: 'Loan Receivables', type: 'Asset', fund: 'Loans', status: 'Active' },
  { id: 3, code: '2010', name: 'Union Accounts Payable', type: 'Liability', fund: 'Union Fund', status: 'Active' },
  { id: 4, code: '5020', name: 'Foreign Assistance Project Expenses', type: 'Expense', fund: 'Foreign Assistance', status: 'Inactive' },
  { id: 5, code: '6010', name: 'Death Benefit Disbursements', type: 'Expense', fund: 'Death Assistance', status: 'Active' },
  { id: 6, code: '3010', name: 'Retained Earnings', type: 'Equity', fund: 'General Fund', status: 'Active' },
  { id: 7, code: '4010', name: 'Membership Dues Revenue', type: 'Income', fund: 'General Fund', status: 'Active' },
];

const CHART_COLORS = ['#04152d', '#10b981', '#facc15', '#8b5cf6', '#ef4444'];

function AdminChartOfAccountsContent() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'Superadmin';
  const accessToken = (session as any)?.accessToken;

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'Asset', fund: 'General Fund', status: 'Active' });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterFund, setFilterFund] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State for Actions
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    payload?: any;
    status: 'idle' | 'loading' | 'success' | 'error';
    resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // STRICT ROLE GATEKEEPER
  const isAdmin = role === 'Superadmin' || role === 'Officer/Admin';

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';
      const res = await fetch(`${gatewayUrl}/api/finance/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-transparent">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
          <div className="bg-white p-10 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col items-center max-w-md text-center">
            <div className="bg-red-50 p-5 rounded-full text-red-50 mb-5 shadow-[inset_0_0_0_2px_rgba(220,38,38,0.2)]">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-2xl font-black text-[#04152d]">Security Clearance Required</h2>
            <p className="text-sm text-gray-500 mt-3 font-medium leading-relaxed">
              This is the systemic Chart of Accounts configuration. Only Administrators possess the privileges to access or modify these records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. DATA AGGREGATION & FILTERING
  // ==========================================
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = acc.code.includes(searchTerm) || acc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || acc.type === filterType;
      const matchFund = filterFund === 'ALL' || acc.fund === filterFund;
      const matchStatus = filterStatus === 'ALL' || acc.status === filterStatus;
      return matchSearch && matchType && matchFund && matchStatus;
    });
  }, [accounts, searchTerm, filterType, filterFund, filterStatus]);

  const uniqueFunds = Array.from(new Set(accounts.map(a => a.fund)));
  const activeCount = accounts.filter(a => a.status === 'Active').length;

  // Chart Data: Account Distribution by Type
  const chartData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    accounts.forEach(a => {
      if (a.status === 'Active') {
        typeMap[a.type] = (typeMap[a.type] || 0) + 1;
      }
    });
    let colorIndex = 0;
    return Object.keys(typeMap).map(key => ({ 
      name: key, 
      value: typeMap[key],
      fill: CHART_COLORS[colorIndex++ % CHART_COLORS.length]
    }));
  }, [accounts]);

  // ==========================================
  // 3. HANDLERS (CRUD & MODALS)
  // ==========================================
  const triggerToggleStatus = (id: number, currentStatus: string) => {
    setModal({
      isOpen: true,
      title: currentStatus === 'Active' ? 'Deactivate Account' : 'Activate Account',
      message: `Are you sure you want to ${currentStatus === 'Active' ? 'deactivate' : 'activate'} this ledger account? This may impact fund mappings if used in active transactions.`,
      payload: { actionType: 'toggle', id, currentStatus },
      status: 'idle'
    });
  };

  const triggerDeleteAccount = (id: number, name: string) => {
    setModal({
      isOpen: true,
      title: 'Delete Account',
      message: `Are you sure you want to permanently delete the account "${name}"? This action cannot be undone and will fail if there are existing transactions tied to it.`,
      payload: { actionType: 'delete', id },
      status: 'idle'
    });
  };

  const executeModalAction = async () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    const { actionType, id, currentStatus } = modal.payload;
    
    if (actionType === 'toggle') {
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        const res = await fetch(`${gatewayUrl}/api/finance/accounts/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' })
        });

        if (res.ok) {
          setAccounts(accounts.map(a => a.id === id ? { ...a, status: currentStatus === 'Active' ? 'Inactive' : 'Active' } : a));
          setModal(prev => ({ ...prev, status: 'success', resultMsg: `Account successfully ${currentStatus === 'Active' ? 'deactivated' : 'activated'}.` }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Failed to update account status.' }));
        }
      } catch (error) {
        setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Network error occurred.' }));
      }
    } 
    
    else if (actionType === 'delete') {
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        const res = await fetch(`${gatewayUrl}/api/finance/accounts/${id}`, {
          method: 'DELETE',
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });

        if (res.ok) {
          setAccounts(accounts.filter(a => a.id !== id));
          setModal(prev => ({ ...prev, status: 'success', resultMsg: 'Account successfully deleted.' }));
        } else {
          setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Failed to delete account. It might be tied to existing transactions.' }));
        }
      } catch (error) {
        setModal(prev => ({ ...prev, status: 'error', resultMsg: 'Network error occurred while trying to delete.' }));
      }
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const url = editingId ? `${gatewayUrl}/api/finance/accounts/${editingId}` : `${gatewayUrl}/api/finance/accounts`;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const saved = await res.json();
        if (editingId) {
          setAccounts(accounts.map(a => a.id === editingId ? saved : a));
        } else {
          setAccounts([...accounts, saved]);
        }
        setIsFormOpen(false);
      } else {
        alert('Failed to save account');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const openForm = (acc?: Account) => {
    if (acc) {
      setEditingId(acc.id);
      setFormData({ code: acc.code, name: acc.name, type: acc.type, fund: acc.fund, status: acc.status });
    } else {
      setEditingId(null);
      setFormData({ code: '', name: '', type: 'Asset', fund: 'General Fund', status: 'Active' });
    }
    setIsFormOpen(true);
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
        confirmText="Confirm Action"
      />

      <Header />

      <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in">
        
        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Hash size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-gray-500 uppercase tracking-[0.12em] mb-0.5">Total Accounts</p>
                <p className="text-3xl font-black text-[#04152d]">
                  {isLoading ? '...' : accounts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Power size={24} />
              </div>
              <div>
                <p className="block text-xs font-black text-emerald-600 uppercase tracking-[0.12em] mb-0.5">Active Accounts</p>
                <p className="text-3xl font-black text-[#04152d]">
                  {isLoading ? '...' : activeCount}
                </p>
              </div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {chartData.length > 0 && !isLoading ? (
              <div className="w-full h-[80px] flex items-center justify-between">
                <div className="h-[80px] w-[80px]">
                  <PieChart width={80} height={80}>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={3} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#04152d' }} />
                  </PieChart>
                </div>
                <div className="flex flex-col gap-1.5 w-1/2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">By Account Type</p>
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
              <p className="text-xs font-bold text-gray-400">{isLoading ? 'Loading...' : 'No Data'}</p>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex flex-wrap gap-4 items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex-1 min-w-[250px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search Code or Name..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]"
            />
          </div>
          
          <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
              <option value="ALL">All Types</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[200px]">
            <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterFund} onChange={(e) => setFilterFund(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
              <option value="ALL">All Funds</option>
              {uniqueFunds.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl pl-11 pr-10 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors appearance-none font-bold text-[#04152d] cursor-pointer">
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.07)] border border-white/80 flex-1 flex flex-col overflow-hidden min-h-[500px] animate-slide-up" style={{ animationDelay: '0.25s' }}>
          
          {/* Table Header w/ Add Button */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#04152d]">Ledger Accounts</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(107,114,128,0.2)] font-mono">
                {isLoading ? '...' : filteredAccounts.length} Records
              </span>
            </div>
            <button 
              onClick={() => openForm()}
              className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Account Code</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Name</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Type</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">Fund Mapping</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wide bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)] text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">Loading ledger accounts...</td></tr>
                ) : filteredAccounts.map((acc) => (
                  <tr 
                    key={acc.id} 
                    className={`transition-colors duration-100 ${acc.status === 'Inactive' ? 'bg-gray-50/70 opacity-60 grayscale hover:bg-gray-100/70' : 'hover:bg-[#e8edf8]/60'}`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center bg-gray-100 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-gray-600 shadow-[inset_0_0_0_1px_rgba(229,231,235,1)]">
                        <Hash size={12} className="mr-1 text-gray-400"/>{acc.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-[#04152d] text-sm">{acc.name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{acc.type}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#04152d]">{acc.fund}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        acc.status === 'Inactive' ? 'bg-gray-200 text-gray-600 shadow-[inset_0_0_0_1.5px_rgba(156,163,175,0.3)]' : 'bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.3)]'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openForm(acc)} 
                          className="inline-flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-medium p-2 rounded-xl transition-all duration-150" 
                          title="Edit Account"
                        >
                          <Edit2 size={16}/>
                        </button>
                        <button 
                          onClick={() => triggerToggleStatus(acc.id, acc.status)}
                          className={`inline-flex items-center justify-center gap-2 font-medium p-2 rounded-xl transition-all duration-150 ${acc.status === 'Active' ? 'text-red-500 hover:bg-red-50 hover:text-red-600' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title={acc.status === 'Active' ? "Deactivate" : "Activate"}
                        >
                          <Power size={16}/>
                        </button>
                        <button 
                          onClick={() => triggerDeleteAccount(acc.id, acc.name)}
                          className="inline-flex items-center justify-center gap-2 text-gray-400 hover:text-red-600 hover:bg-red-50 font-medium p-2 rounded-xl transition-all duration-150" 
                          title="Delete Account"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredAccounts.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">No accounts found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* CREATE / EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.12)] border border-white/80 overflow-hidden animate-pop">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
              <h3 className="font-black text-lg text-[#04152d]">{editingId ? 'Edit Ledger Account' : 'New Account Configuration'}</h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Account Code</label>
                <input 
                  type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-mono font-bold text-[#04152d] disabled:bg-gray-100 disabled:text-gray-500" 
                  required disabled={!!editingId} 
                />
                {!editingId && <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Account codes are permanent once established.</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Account Name</label>
                <input 
                  type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white placeholder-gray-400 border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d]" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Account Type</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} 
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d] cursor-pointer"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.12em] mb-1.5">Fund Mapping</label>
                  <select 
                    value={formData.fund} onChange={e => setFormData({...formData, fund: e.target.value})} 
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white border-[1.5px] border-[#dde3ee] shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] focus:border-[#04152d] focus:ring-[3px] focus:ring-[#04152d]/10 outline-none transition-colors font-bold text-[#04152d] cursor-pointer"
                  >
                    <option value="General Fund">General Fund</option>
                    <option value="Union Fund">Union Fund</option>
                    <option value="Loans">Loans</option>
                    <option value="Foreign Assistance">Foreign Assistance</option>
                    <option value="Death Assistance">Death Assistance</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-bold py-2.5 px-5 rounded-xl text-sm transition-all duration-150"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="inline-flex items-center justify-center gap-2 bg-[#04152d] text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-[0_6px_0_rgba(2,6,15,0.55),0_4px_18px_rgba(4,21,45,0.35)] hover:-translate-y-[1px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(2,6,15,0.55),0_2px_8px_rgba(4,21,45,0.25)] transition-all"
                >
                  <Save size={16}/> {editingId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminChartOfAccountsPage() {
  return (
    <Suspense fallback={<div>Loading accounts...</div>}>
      <AdminChartOfAccountsContent />
    </Suspense>
  );
}