"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, Calendar, CreditCard, CircleDollarSign, Book, LogOut, ShieldCheck, Settings } from 'lucide-react';
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const currentUserRole = (session?.user as any)?.role || 'User';

  let sidebarBgColor = "bg-bdoea-navy"; 
  if (['Officer/Admin', 'Treasurer', 'Auditor'].includes(currentUserRole)) {
    sidebarBgColor = "bg-[#505050]"; 
  } else if (currentUserRole === 'Superadmin') {
    sidebarBgColor = "bg-black";
  }

// Inside components/Sidebar.tsx
// Inside components/Sidebar.tsx
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Notification', href: '/notifications', icon: Bell, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Events', href: '/events', icon: Calendar, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'My Membership', href: '/membership', icon: CreditCard, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Loan Center', href: '/loans', icon: CircleDollarSign, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    
    // User Route
    { label: 'Finance & Dues', href: '/', icon: Book, roles: ['User'] },
    // Officer Route
    { label: 'Finance & Dues', href: '/finance/dashboard', icon: Book, roles: ['Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    
    // Audit Logs REMOVED from here!
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(currentUserRole));

  if (status === "loading") return <div className={`w-full h-full ${sidebarBgColor}`} />; 

  return (
    <div className={`flex flex-col h-full text-white px-6 py-8 transition-colors duration-300 ${sidebarBgColor}`}>
      <div className="mb-12 flex justify-center">
        <img src="/bdoea-logo.png" alt="BDOEA Logo" width={180} height={60} className="object-contain w-auto h-auto" />
      </div>

      <nav className="flex-1 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' 
            ? pathname === '/' 
            : pathname.startsWith(item.href) || (item.label === 'Finance & Dues' && pathname.startsWith('/finance'));

          return (
            <Link key={item.label} href={item.href} className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors font-medium text-sm ${isActive ? 'bg-white/10 border-l-4 border-bdoea-yellow' : 'hover:bg-white/5 opacity-80 hover:opacity-100'}`}>
              <Icon size={20} className={isActive ? "text-bdoea-yellow" : "text-gray-300"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-[10px] tracking-wider uppercase opacity-60 m-0 leading-tight font-bold text-bdoea-yellow">
              {currentUserRole}
            </p>
            <p className="text-sm font-bold truncate leading-tight">{session?.user?.email?.split('@')[0] || "VEN"}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full py-2.5 bg-bdoea-yellow hover:bg-yellow-500 text-black font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2">
          <LogOut size={16} strokeWidth={2.5} /> Log out
        </button>
      </div>
    </div>
  );
}