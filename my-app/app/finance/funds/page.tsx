"use client";

import { useState, useEffect } from 'react';
import { Wallet, Printer, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  date: string;
}

interface Fund {
  id: string;
  name: string;
  code: string;
  currentBalance: number;
  totalTransactionsCount: number;
  history: Transaction[];
}

export default function FundBalancePanel() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data directly from your new API backend route
  const loadLedgerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/finance/funds');
      
      if (!res.ok) {
        throw new Error(`Failed to read ledger standings (Status: ${res.status})`);
      }
      
      const data: Fund[] = await res.json();
      setFunds(data);
      
      // Keep the current fund selected if refreshing, otherwise default to the first fund
      if (data.length > 0) {
        setSelectedFund((prev) => {
          const stillExists = data.find(f => f.id === prev?.id);
          return stillExists || data[0];
        });
      }
    } catch (err: any) {
      console.error("Ledger synchronization error:", err);
      setError(err.message || "An unexpected error occurred while loading funds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  // Graceful loading layout
  if (loading && funds.length === 0) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
        <p className="text-sm font-medium text-gray-500">Synchronizing database ledgers...</p>
      </div>
    );
  }

  // Graceful error layout
  if (error && funds.length === 0) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 max-w-md text-center text-sm shadow-sm">
          <p className="font-bold mb-1">Database Connection Issue</p>
          <p className="text-red-600/90">{error}</p>
        </div>
        <button 
          onClick={loadLedgerData}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-full pb-12 flex flex-col gap-6 bg-gray-50">
      
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fund Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time liquidity monitoring and fund ledgers.</p>
        </div>
        <button 
          onClick={loadLedgerData}
          disabled={loading}
          className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-all disabled:opacity-50 shadow-sm"
          title="Refresh Data"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 flex-shrink-0">
        {funds.map((fund) => {
          const isSelected = selectedFund?.id === fund.id;
          return (
            <div 
              key={fund.id}
              onClick={() => setSelectedFund(fund)}
              className={`p-5 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-[120px] ${
                isSelected 
                  ? 'bg-white border-bdoea-yellow ring-2 ring-yellow-100' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center relative z-10">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>
                  <Wallet size={18} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate ml-2">
                  {fund.code} Assets
                </span>
              </div>
              
              <div className="relative z-10 mt-auto">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest truncate">{fund.name}</h3>
                <p className="text-2xl font-black text-gray-900 mt-0.5 tracking-tight truncate">
                  ₱{fund.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              {isSelected && (
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-black">
                  <Wallet size={100} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Account Ledgers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedFund ? `${selectedFund.name} Ledger` : "Select a Fund"}
          </h2>
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">
            <Printer size={14} /> Export Register
          </button>
        </div>
        
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Transaction Detail</th>
                <th className="px-6 py-4 whitespace-nowrap">Type</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selectedFund && selectedFund.history.length > 0 ? (
                selectedFund.history.map((tx) => {
                  // In modern ledger models, negative amounts signify structural disbursements (Debits)
                  const isCredit = tx.amount >= 0;
                  const formattedDate = new Date(tx.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{formattedDate}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 min-w-[250px]">{tx.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[10px] uppercase bg-green-50 px-2 py-1 rounded border border-green-100">
                            <ArrowUpRight size={12}/> Credit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded border border-red-100">
                            <ArrowDownRight size={12}/> Debit
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                        {isCredit ? '' : '- '}₱{Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-blue-600 cursor-pointer hover:underline whitespace-nowrap">
                        {tx.referenceId || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No historic transaction ledger lines tied to this fund.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}