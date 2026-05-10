"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRef, useEffect } from 'react';

export default function FinanceTopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const role = (session?.user as any)?.role || 'User';

  // Upgraded Scroll Logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // If the user is scrolling vertically (standard mouse wheel)
      // we hijack it and force it to scroll horizontally instead.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    // Attach listener with passive: false so we are allowed to preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [role]); // Added dependency array so it re-attaches if the user's role loads late

  if (role === 'User') return null;

  let navBgColor = "bg-bdoea-navy"; 
  if (['Officer/Admin', 'Treasurer', 'Auditor'].includes(role)) {
    navBgColor = "bg-[#505050]"; 
  } else if (role === 'Superadmin') {
    navBgColor = "bg-black";
  }

  const topNavItems = [
    { label: 'Dashboard', href: '/finance/dashboard', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
    { label: 'Funds and CoA', href: '/finance/funds', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'Dues Collection', href: '/finance/dues', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'Loan Repayment', href: '/finance/loans', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'Expense & Voucher', href: '/finance/expenses', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'Budget & Variance', href: '/finance/budget', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'Reports Center', href: '/finance/reports', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
    { label: 'Bank Reconciliation', href: '/finance/reconciliation', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
    { label: 'System Config', href: '/finance/config', roles: ['Superadmin', 'Officer/Admin'] },
    { label: 'Audit Logs', href: '/finance/audit', roles: ['Superadmin'] },
  ];

  const visibleTabs = topNavItems.filter(item => item.roles.includes(role));

  return (
    <div 
      ref={scrollContainerRef}
      className={`flex overflow-x-auto gap-3 px-8 py-4 items-center shadow-md transition-colors duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${navBgColor}`}
    >
      {visibleTabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link 
            key={tab.label} 
            href={tab.href}
            className={`flex-shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm ${
              isActive 
                ? 'bg-white text-gray-900' 
                : 'bg-bdoea-yellow text-gray-900 hover:bg-yellow-500 hover:-translate-y-0.5' 
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}