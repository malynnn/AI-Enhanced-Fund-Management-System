"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, Calendar, CreditCard, CircleDollarSign, Book, LogOut, ChevronDown, Settings } from 'lucide-react';
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Finance & Dues': true, 
  });

  if (pathname === '/login') return null;

  const currentUserRole = (session?.user as any)?.role || 'User';
  const sidebarBgColor = "bg-[#021124]"; // Strict BDOEA Navy Blue

  // Group 1: General Navigation
  const generalNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Notification', href: '/notifications', icon: Bell, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Events', href: '/events', icon: Calendar, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
  ];

  // Group 2: Systems Navigation
  const systemNavItems = [
    { 
      label: 'My Membership', 
      icon: CreditCard, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [{ label: 'Overview', href: '/membership', roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] }]
    },
    { 
      label: 'Loan Center', 
      icon: CircleDollarSign, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [{ label: 'Overview', href: '/loans', roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] }]
    },
    { 
      label: 'Finance & Dues', 
      icon: Book, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [
        { label: 'My Summary', href: '/', roles: ['User'] },
        { label: 'Dashboard', href: '/finance/dashboard', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Dues & Contributions', href: '/finance/dues', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Disbursement', href: '/finance/disbursement', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
        { label: 'Fund Management', href: '/finance/funds', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Reports Center', href: '/finance/reports', roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Bank Reconciliation', href: '/finance/reconciliation', roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
        { label: 'System Config', href: '/finance/config', roles: ['Superadmin', 'Officer/Admin'] },
        { label: 'Audit Logs', href: '/finance/audit', roles: ['Superadmin'] },
      ]
    },
  ];

  const visibleGeneralItems = generalNavItems.filter(item => item.roles.includes(currentUserRole));
  const visibleSystemItems = systemNavItems.filter(item => item.roles.includes(currentUserRole));

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Reusable render function for nav items
  const renderNavItems = (items: any[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const visibleSubItems = hasSubItems ? item.subItems.filter((sub: any) => sub.roles.includes(currentUserRole)) : [];
      
      if (hasSubItems && visibleSubItems.length === 0) return null;

      const isParentActive = hasSubItems && visibleSubItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
      const isDirectActive = !hasSubItems && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href!));
      const isOpen = openMenus[item.label] || isParentActive;

      return (
        <div key={item.label} className="flex flex-col">
          {hasSubItems ? (
            <button 
              onClick={() => toggleMenu(item.label)} 
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isOpen || isParentActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isOpen || isParentActive ? "text-bdoea-yellow" : "text-gray-400"} />
                <span>{item.label}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <Link 
              href={item.href!} 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isDirectActive ? 'bg-bdoea-yellow text-black shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon size={18} className={isDirectActive ? "text-black" : "text-gray-400"} />
              {item.label}
            </Link>
          )}

          {hasSubItems && isOpen && (
            <div className="flex flex-col mt-1 mb-2 relative">
              <div className="absolute left-[22px] top-0 bottom-2 w-px bg-white/10" />
              {visibleSubItems.map((sub: any) => {
                const isSubActive = pathname === sub.href;
                return (
                  <Link 
                    key={sub.label} 
                    href={sub.href} 
                    className={`pl-11 pr-4 py-2 text-xs font-medium rounded-lg transition-all relative ${
                      isSubActive ? 'text-bdoea-yellow bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isSubActive && <div className="absolute left-[19px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-bdoea-yellow" />}
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-[280px] h-full flex-shrink-0 shadow-2xl z-10 flex flex-col">
      {status === "loading" ? (
        <div className={`w-full h-full ${sidebarBgColor}`} />
      ) : (
        <div className={`flex flex-col h-full text-white px-5 py-6 transition-colors duration-300 ${sidebarBgColor}`}>
          
          {/* HEADER: Logo */}
          <div className="mb-6 flex justify-center px-4">
            <img src="/bdoea-logo.png" alt="BDOEA Logo" width={160} height={50} className="object-contain w-auto h-auto" />
          </div>

          {/* CONTAINER 1: Profile Section (Repositioned to top) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between mb-6 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-300 to-gray-100 flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[9px] tracking-widest uppercase m-0 leading-tight font-black text-bdoea-yellow">
                  {currentUserRole}
                </p>
                <p className="text-sm font-bold truncate leading-tight mt-0.5">{session?.user?.email?.split('@')[0] || "VEN"}</p>
              </div>
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white">
              <Settings size={16} />
            </button>
          </div>

          {/* SCROLLABLE NAVIGATION AREA */}
          <nav className="flex-1 overflow-y-auto pr-2 space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:transparent">
            
            {/* CONTAINER 2: General Menu */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">Main Menu</p>
              <div className="flex flex-col space-y-0.5">
                {renderNavItems(visibleGeneralItems)}
              </div>
            </div>

            {/* CONTAINER 3: Systems Menu */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">BDOEA Systems</p>
              <div className="flex flex-col space-y-0.5 bg-white/[0.02] border border-white/5 rounded-xl p-1.5">
                {renderNavItems(visibleSystemItems)}
              </div>
            </div>

          </nav>

          {/* BOTTOM: Logout Container */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="w-full py-3 bg-white/5 hover:bg-red-500/90 text-gray-300 hover:text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-red-500"
            >
              <LogOut size={16} strokeWidth={2.5} /> Log out
            </button>
          </div>

        </div>
      )}
    </aside>
  );
}