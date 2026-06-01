"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Power, Save, X, Hash, ShieldAlert, Loader } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  fund: string;
  status: string;
}

export default function AdminChartOfAccountsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'User';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'Asset', fund: 'Operating Fund', status: 'Active' });

  const isAdmin = role === 'Superadmin' || role === 'Officer/Admin';

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/accounts');
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
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8 min-h-screen">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center max-w-md text-center">
          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Security Clearance Required</h2>
          <p className="text-sm text-gray-500 mt-2">
            This is the systemic Chart of Accounts configuration. Only Administrators possess the privileges to access or modify these records.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!confirm(`Are you sure you want to ${currentStatus === 'Active' ? 'deactivate' : 'activate'} this account?`)) return;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, status: newStatus } : acc));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/finance/accounts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const updated = await res.json();
          setAccounts(prev => prev.map(acc => acc.id === editingId ? updated : acc));
        }
      } else {
        const res = await fetch('/api/finance/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const created = await res.json();
          setAccounts(prev => [...prev, created]);
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to create account');
          return;
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const openForm = (acc?: Account) => {
    if (acc) {
      setEditingId(acc.id);
      setFormData({ code: acc.code, name: acc.name, type: acc.type, fund: acc.fund, status: acc.status });
    } else {
      setEditingId(null);
      setFormData({ code: '', name: '', type: 'Asset', fund: 'Operating Fund', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 min-h-screen flex flex-col bg-gray-50">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Admin Control Panel • System Architecture</p>
        </div>
        <button 
          onClick={() => openForm()}
          className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <Loader size={24} className="animate-spin mr-2" /> Loading accounts...
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Account Code</th>
                  <th className="px-6 py-4 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 whitespace-nowrap">Type</th>
                  <th className="px-6 py-4 whitespace-nowrap">Fund Mapping</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No accounts found. Click "Add Account" to create one.</td></tr>
                )}
                {accounts.map((acc) => (
                  <tr 
                    key={acc.id} 
                    className={`transition-colors ${acc.status === 'Inactive' ? 'bg-gray-50/70 opacity-60 grayscale' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-gray-600 whitespace-nowrap">
                      <span className="bg-gray-100 px-2 py-1 rounded-md text-xs border border-gray-200">
                        <Hash size={12} className="inline mr-1 mb-0.5 text-gray-400"/>{acc.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 min-w-[200px]">{acc.name}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{acc.type}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{acc.fund}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border ${
                        acc.status === 'Inactive' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openForm(acc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                        <Edit2 size={16}/>
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(acc.id, acc.status)}
                        className={`p-1.5 rounded-md transition-colors ${acc.status === 'Active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={acc.status === 'Active' ? "Deactivate" : "Activate"}
                      >
                        <Power size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingId ? 'Edit Account' : 'New Account Code'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Code</label>
                <input 
                  type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono" 
                  required disabled={!!editingId}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fund Mapping</label>
                  <select value={formData.fund} onChange={e => setFormData({...formData, fund: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option>Operating Fund</option><option>Loan Fund</option><option>Petty Cash</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
                  {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16}/>} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}