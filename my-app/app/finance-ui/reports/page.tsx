"use client";

import { useState } from 'react';
import { FileText, Download, Eye, Filter } from 'lucide-react';

// Backend-ready mock data array
const reportTypes = [
  { id: 'balances', title: 'Statement of Balances', desc: 'Current standing of all fund accounts.' },
  { id: 'income_expense', title: 'Income & Expense', desc: 'Net revenue against operational costs.' },
  { id: 'cash_flow', title: 'Cash Flow Statement', desc: 'Inflows and outflows of liquid assets.' },
  { id: 'fund_utilization', title: 'Fund Utilization Report', desc: 'Budget vs. actuals for specific funds.' },
  { id: 'dues_summary', title: 'Dues Summary Report', desc: 'Collection rates and delinquency.' },
  { id: 'general_ledger', title: 'General Ledger', desc: 'Master record of all transactions.' },
];

export default function FinancialReportsPage() {
  // Backend query parameters state
  const [filterType, setFilterType] = useState('All Report Types');
  const [filterMonth, setFilterMonth] = useState('April 2026');
  const [filterFund, setFilterFund] = useState('All Funds');

  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleGenerate = (reportId: string, action: 'view' | 'download') => {
    setIsGenerating(reportId);
    // Mock API delay
    setTimeout(() => {
      setIsGenerating(null);
      alert(`Backend triggered: ${action.toUpperCase()} for report ${reportId}`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Reports & Statements</h2>
          <p className="text-sm text-gray-500 mt-1">Generate, view, and export official BDOEA financial records.</p>
        </div>
        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-md tracking-wide">
          AUDITOR / READ-ONLY SECURE
        </span>
      </div>
      
      {/* Filters Form - Backend Ready */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-center">
        <Filter size={18} className="text-gray-400 ml-2" />
        <select 
          value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="flex-1 py-2 px-3 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-black outline-none"
        >
          <option>All Report Types</option>
          <option>Monthly Statements</option>
          <option>Annual Statements</option>
        </select>
        
        <select 
          value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="w-48 py-2 px-3 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-black outline-none"
        >
          <option>April 2026</option>
          <option>March 2026</option>
          <option>February 2026</option>
        </select>

        <select 
          value={filterFund} onChange={(e) => setFilterFund(e.target.value)}
          className="w-48 py-2 px-3 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-black outline-none"
        >
          <option>All Funds</option>
          <option>General Operating</option>
          <option>Loan Fund</option>
        </select>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportTypes.map((report) => (
          <div key={report.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-yellow-50 rounded-lg text-yellow-700">
                <FileText size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">{report.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{report.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
              <button 
                onClick={() => handleGenerate(report.id, 'view')}
                disabled={isGenerating === report.id}
                className="flex-1 flex justify-center items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-800 py-2 rounded-md text-xs font-bold border border-gray-200 transition-colors"
              >
                <Eye size={14} /> View
              </button>
              <button 
                onClick={() => handleGenerate(report.id, 'download')}
                disabled={isGenerating === report.id}
                className="flex-1 flex justify-center items-center gap-2 bg-bdoea-navy hover:bg-blue-900 text-white py-2 rounded-md text-xs font-bold transition-colors disabled:opacity-70"
              >
                {isGenerating === report.id ? '...' : <Download size={14} />} Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}