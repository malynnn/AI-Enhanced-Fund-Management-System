"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Power, Save, X, Hash, ShieldAlert } from 'lucide-react';

// --- MOCK DATABASE ---
const initialAccounts = [
  { id: 1, code: '1010', name: 'Cash on Hand', type: 'Asset', fund: 'Operating Fund', status: 'Active' },
  { id: 2, code: '1100', name: 'Loan Receivables', type: 'Asset', fund: 'Loan Fund', status: 'Active' },
  { id: 3, code: '2010', name: 'Accounts Payable', type: 'Liability', fund: 'Operating Fund', status: 'Active' },
  { id: 4, code: '5020', name: 'Event Expenses', type: 'Expense', fund: 'Operating Fund', status: 'Inactive' },
];

export default function AdminChartOfAccountsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'User';

  const [accounts, setAccounts] = useState(initialAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'Asset', fund: 'Operating Fund', status: 'Active' });

  // ==========================================
  // 1. STRICT ROLE GATEKEEPER
  // ==========================================
  const isAdmin = role === 'Superadmin' || role === 'Officer/Admin';

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

  // ==========================================
  // 2. HANDLERS (CRUD)
  // ==========================================
  const handleToggleStatus = (id: number, currentStatus: string) => {
    if(confirm(`Are you sure you want to ${currentStatus === 'Active' ? 'deactivate' : 'activate'} this account?`)) {
      setAccounts(accounts.map(acc => 
        acc.id === id ? { ...acc, status: currentStatus === 'Active' ? 'Inactive' : 'Active' } : acc
      ));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setAccounts(accounts.map(acc => acc.id === editingId ? { ...acc, ...formData } : acc));
    } else {
      setAccounts([...accounts, { id: Date.now(), ...formData }]);
    }
    setIsModalOpen(false);
  };

  const openForm = (acc?: any) => {
    if (acc) {
      setEditingId(acc.id);
      setFormData({ ...acc });
    } else {
      setEditingId(null);
      setFormData({ code: '', name: '', type: 'Asset', fund: 'Operating Fund', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  // ==========================================
  // 3. UI RENDER
  // ==========================================
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
              {accounts.map((acc) => (
                <tr 
                  key={acc.id} 
                  // TASK REQUIREMENT: Deactivated accounts are greyed out
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
                    {/* TASK REQUIREMENT: "Inactive" Badge */}
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
                  required disabled={!!editingId} // Usually can't edit codes once created
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
                <button type="submit" className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-lg text-sm font-bold"><Save size={16}/> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}