export default function FinancialDashboard() {
  const duesHistory = [
    { date: 'Apr 2026', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
    { date: 'Mar 2026', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
    { date: 'Feb 2026', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
    { date: 'Jan 2026', amount: '₱500', status: 'PAID', method: 'Online Transfer' },
    { date: 'Dec 2025', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
    { date: 'Nov 2025', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
    { date: 'Oct 2025', amount: '₱500', status: 'PAID', method: 'Online Transfer' },
    { date: 'Sep 2025', amount: '₱500', status: 'PAID', method: 'Online Transfer' },
    { date: 'Aug 2025', amount: '₱500', status: 'PAID', method: 'Salary Deduction' },
  ];

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8 text-gray-900">Financial Summary</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Card: My Dues History */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">My Dues History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#eef2f6] text-gray-700 font-semibold rounded-lg">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg">Method</th>
                </tr>
              </thead>
              <tbody>
                {duesHistory.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-4 text-gray-600 font-medium">{row.date}</td>
                    <td className="px-4 py-4 font-bold text-gray-900">{row.amount}</td>
                    <td className="px-4 py-4 font-bold text-green-700">{row.status}</td>
                    <td className="px-4 py-4 text-gray-600">{row.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Top Right Card: Loan Status */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">My Loan Status</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Loan ID</span>
                <span className="text-gray-600">LN-2025-071</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Loan Type</span>
                <span className="text-gray-600">Regular Loan</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Original Amount</span>
                <span className="text-gray-600">₱30,000</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Remaining Balance</span>
                <span className="font-bold text-red-700">₱22,100</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Monthly Payment</span>
                <span className="text-gray-600">₱2,900</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">Next Due Date</span>
                <span className="text-gray-600">May 12, 2026</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold text-gray-900">Status</span>
                <span className="font-bold text-green-700">CURRENT</span>
              </div>
            </div>
          </div>

          {/* Bottom Right Card: Alert Banner */}
          <div className="bg-[#edf3ff] border border-blue-100 rounded-2xl p-5 flex gap-4 text-sm text-blue-900 shadow-sm">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center font-bold text-blue-600 text-xs">i</div>
            </div>
            <p className="leading-relaxed font-medium">
              You have view-only access to your personal financial records. For inquiries or concerns about your account, please contact the Treasurer directly.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}