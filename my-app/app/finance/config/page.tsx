"use client";

import { useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SystemConfigPage() {
  // --- STATE FOR FORM FIELDS ---
  // Ready to be populated via a GET request, and sent back via a POST/PUT request
  const [dues, setDues] = useState('500.00');
  const [interestRate, setInterestRate] = useState('6.00');
  
  // --- UI FEEDBACK STATES ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    // MOCK API CALL: Replace this block with your actual fetch/axios call later
    // e.g., await fetch('/api/config', { method: 'POST', body: JSON.stringify({ dues, interestRate }) })
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('success');
      
      // Clear the success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="p-8 h-full bg-gray-50 flex flex-col overflow-y-auto min-h-0">
      <div className="mb-8 flex-shrink-0">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage global variables and systemic rules.</p>
      </div>
      
      <div className="max-w-3xl flex-1">
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Form Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Global Parameters</h2>
            <p className="text-sm text-gray-500">These values affect all user accounts and calculations across the system.</p>
          </div>

          {/* Form Inputs Area */}
          <div className="p-6 space-y-6">
            
            {/* Field 1: Membership Dues */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-6 border-b border-gray-100">
              <div className="flex-1">
                <label htmlFor="dues" className="block font-semibold text-gray-900">Monthly Membership Dues</label>
                <p className="text-sm text-gray-500 mt-1">Set the default monthly deduction amount for all regular members.</p>
              </div>
              <div className="relative rounded-md shadow-sm sm:w-48">
                {/* Visual Peso Sign Prefix */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm font-medium">₱</span>
                </div>
                <input
                  type="number"
                  name="dues"
                  id="dues"
                  step="0.01" // Allows decimals
                  min="0"
                  value={dues}
                  onChange={(e) => setDues(e.target.value)}
                  className="block w-full rounded-md border-0 py-2.5 pl-8 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm font-mono transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Field 2: Interest Rate */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <label htmlFor="interest" className="block font-semibold text-gray-900">Loan Interest Rate</label>
                <p className="text-sm text-gray-500 mt-1">Global interest rate applied to new regular loan applications.</p>
              </div>
              <div className="relative rounded-md shadow-sm sm:w-48">
                <input
                  type="number"
                  name="interest"
                  id="interest"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="block w-full rounded-md border-0 py-2.5 pl-4 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm font-mono transition-all"
                  placeholder="0.00"
                  required
                />
                {/* Visual Percentage Suffix */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 sm:text-sm font-medium">%</span>
                </div>
              </div>
            </div>
            
          </div>

          {/* Form Footer / Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            {/* Dynamic Success/Error Message */}
            <div className="flex items-center">
              {saveStatus === 'success' && (
                <span className="flex items-center text-sm font-medium text-green-600 animate-pulse">
                  <CheckCircle2 size={16} className="mr-1.5" />
                  Settings saved successfully
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center text-sm font-medium text-red-600">
                  <AlertCircle size={16} className="mr-1.5" />
                  Failed to save settings
                </span>
              )}
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${
                isSaving 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-bdoea-yellow text-black hover:bg-yellow-500 hover:-translate-y-0.5'
              }`}
            >
              <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}