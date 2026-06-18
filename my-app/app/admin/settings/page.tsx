"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  Settings, Save, Building2, Percent, 
  WalletCards, ShieldCheck, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Action Modal State
  const [modal, setModal] = useState<{isOpen: boolean, status: 'idle'|'loading'|'success'|'error', title: string, message: string}>({
    isOpen: false, status: 'idle', title: '', message: ''
  });

  // System Configuration State
  const [config, setConfig] = useState({
    monthlyDuesTarget: 500,
    loanInterestRate: 1.0,
    maxLoanTermMonths: 24,
    allowNewLoans: true,
    requireAdminApprovalForMembers: true,
    systemName: 'BDOEA Finance System'
  });

  useEffect(() => {
    // Simulate fetching current system settings from the backend gateway
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
        const res = await fetch(`${gatewayUrl}/api/admin/settings`).catch(() => null);
        if (res?.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setModal({
      isOpen: true,
      status: 'idle',
      title: 'Confirm System Changes',
      message: 'Are you sure you want to apply these global configuration changes? This will immediately affect financial calculations for all users.'
    });
  };

  const executeSave = async () => {
    setModal(prev => ({ ...prev, status: 'loading' }));
    setIsSaving(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        setModal({ isOpen: true, status: 'success', title: 'Settings Updated', message: 'System configurations have been successfully saved and applied.' });
      } else throw new Error();
    } catch (err) {
      setModal({ isOpen: true, status: 'error', title: 'Update Failed', message: 'Failed to communicate with the backend server. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6]">
      <Header />
      
      <ActionModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        status={modal.status}
        onConfirm={executeSave}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Apply Changes"
      />

      <main className="p-4 md:p-6 max-w-[1200px] w-full mx-auto space-y-6 animate-fade-in flex-1">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-black text-[#04152d] flex items-center gap-3">
              <Settings className="text-gray-400" /> System Configuration
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage global financial parameters and system access rules.</p>
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={isLoading || isSaving}
            className="bg-[#04152d] text-white hover:bg-black rounded-xl px-6 py-2.5 font-bold text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configurations
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#04152d]" />
            <p className="font-bold">Loading System Parameters...</p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSaveSettings}>
            
            {/* Financial Parameters */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><WalletCards size={18} /></div>
                <h2 className="text-lg font-black text-[#04152d]">Global Financial Parameters</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Default Monthly Dues (₱)</label>
                  <input 
                    type="number" 
                    value={config.monthlyDuesTarget} 
                    onChange={e => setConfig({...config, monthlyDuesTarget: Number(e.target.value)})}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold border border-gray-200 outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Standard target for the collections dashboard.</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Standard Loan Interest Rate (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.loanInterestRate} 
                      onChange={e => setConfig({...config, loanInterestRate: Number(e.target.value)})}
                      className="w-full rounded-xl pl-4 pr-10 py-3 text-sm font-bold border border-gray-200 outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors" 
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Applied monthly to new loan principal computations.</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Maximum Loan Term (Months)</label>
                  <input 
                    type="number" 
                    value={config.maxLoanTermMonths} 
                    onChange={e => setConfig({...config, maxLoanTermMonths: Number(e.target.value)})}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold border border-gray-200 outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors" 
                  />
                </div>
              </div>
            </div>

            {/* Access & Security */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ShieldCheck size={18} /></div>
                <h2 className="text-lg font-black text-[#04152d]">Access & Security Rules</h2>
              </div>
              <div className="p-6 space-y-6">
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#04152d]">Require Admin Approval for New Members</h3>
                    <p className="text-xs text-gray-500 mt-1">If enabled, new sign-ups are placed in the "Pending Approvals" queue.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.requireAdminApprovalForMembers} onChange={e => setConfig({...config, requireAdminApprovalForMembers: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#04152d]">Accept New Loan Applications</h3>
                    <p className="text-xs text-gray-500 mt-1">If disabled, members will not be able to submit new external loan requests.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.allowNewLoans} onChange={e => setConfig({...config, allowNewLoans: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

              </div>
            </div>

          </form>
        )}
      </main>
    </div>
  );
}