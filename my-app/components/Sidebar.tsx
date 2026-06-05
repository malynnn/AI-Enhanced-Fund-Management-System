"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Bell, Calendar, CreditCard, CircleDollarSign, Book, LogOut, ChevronDown, 
  Settings, PanelLeftClose, PanelLeftOpen, LayoutDashboard, WalletCards, Send, 
  Briefcase, ListTree, BarChart3, RefreshCw, ClipboardList, PieChart, FileText, User
} from 'lucide-react';
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Finance & Dues': true, 
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (pathname === '/login') return null;

  const currentUserRole = (session?.user as any)?.role || 'User';
  const sidebarBgColor = "bg-[#021124]"; // Strict BDOEA Navy Blue

  // Group 1: General Navigation
  const generalNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Notification', href: '/notifications', icon: Bell, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Events', href: '/events', icon: Calendar, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
  ];

  // Group 2: Systems Navigation (with individual sub-icons)
  const systemNavItems = [
    { 
      label: 'My Membership', 
      icon: CreditCard, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [
        { label: 'Overview', href: '/membership', icon: User, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] }
      ]
    },
    { 
      label: 'Loan Center', 
      icon: CircleDollarSign, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [
        { label: 'Overview (External LAS)', href: '#', icon: FileText, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] }
      ]
    },
    { 
      label: 'Finance & Dues', 
      icon: Book, 
      roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'],
      subItems: [
        { label: 'My Summary', href: '/', icon: PieChart, roles: ['User'] },
        { label: 'Dashboard', href: '/finance/dashboard', icon: LayoutDashboard, roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Dues & Contributions', href: '/finance/dues', icon: WalletCards, roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Disbursement', href: '/finance/disbursement', icon: Send, roles: ['Superadmin', 'Officer/Admin', 'Treasurer'] },
        { label: 'Loan Ledger', href: '/finance/loans', icon: CircleDollarSign, roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Fund Management', href: '/finance/funds', icon: Briefcase, roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        { label: 'Chart of Accounts', href: '/finance/config/accounts', icon: ListTree, roles: ['Superadmin', 'Officer/Admin'] },
        { label: 'Reports Center', href: '/finance/reports', icon: BarChart3, roles: ['Superadmin', 'Officer/Admin', 'Treasurer', 'Auditor'] },
        
        // FIXED: Removed 'Officer/Admin' from these restricted pages
        { label: 'Bank Reconciliation', href: '/finance/reconciliation', icon: RefreshCw, roles: ['Superadmin', 'Treasurer'] },
        { label: 'System Config', href: '/finance/config', icon: Settings, roles: ['Superadmin'] },
        
        { label: 'Audit Logs', href: '/finance/audit', icon: ClipboardList, roles: ['Superadmin'] },
      ]
    },
  ];

  const visibleGeneralItems = generalNavItems.filter(item => item.roles.includes(currentUserRole));
  const visibleSystemItems = systemNavItems.filter(item => item.roles.includes(currentUserRole));

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItems = (items: any[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const visibleSubItems = hasSubItems ? item.subItems.filter((sub: any) => sub.roles.includes(currentUserRole)) : [];
      
      if (hasSubItems && visibleSubItems.length === 0) return null;

      const isParentActive = hasSubItems && visibleSubItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
      const isDirectActive = !hasSubItems && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href!));
      const isOpen = openMenus[item.label] || isParentActive;

      const baseClasses = `flex items-center transition-all font-medium text-sm w-full ${
        isCollapsed ? 'justify-center aspect-square rounded-xl' : 'px-3.5 py-2.5 rounded-xl justify-between'
      }`;

      const activeClasses = isOpen || isParentActive || isDirectActive 
        ? 'bg-bdoea-yellow text-black shadow-md' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white';

      return (
        <div key={item.label} className="flex flex-col w-full" title={isCollapsed ? item.label : undefined}>
          {hasSubItems ? (
            <button onClick={() => toggleMenu(item.label)} className={`${baseClasses} ${activeClasses}`}>
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Icon size={isCollapsed ? 20 : 18} className={isOpen || isParentActive || isDirectActive ? "text-black" : "text-gray-400"} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
              {!isCollapsed && <ChevronDown size={16} className={`transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`} />}
            </button>
          ) : (
            <Link href={item.href!} className={`flex items-center ${isCollapsed ? 'w-full aspect-square justify-center rounded-xl gap-0' : 'px-3.5 py-2.5 w-full rounded-xl gap-3'} transition-all font-medium text-sm ${activeClasses}`}>
              <Icon size={isCollapsed ? 20 : 18} className={isDirectActive ? "text-black" : "text-gray-400"} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          )}

          {hasSubItems && isOpen && (
            <div className={`flex flex-col relative w-full ${isCollapsed ? 'mt-1 gap-1 items-center' : 'mt-1 mb-2 space-y-0.5'}`}>
              
              {visibleSubItems.map((sub: any) => {
                const isSubActive = pathname === sub.href;
                const SubIcon = sub.icon;
                
                return (
                  <Link 
                    key={sub.label} 
                    href={sub.href}
                    title={isCollapsed ? sub.label : undefined}
                    className={isCollapsed 
                      ? `flex items-center justify-center w-full aspect-square rounded-xl transition-all relative ${isSubActive ? 'bg-white/10 text-bdoea-yellow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                      : `flex items-center gap-3 pl-6 pr-3.5 py-2.5 text-xs font-medium rounded-xl transition-all relative whitespace-nowrap ${isSubActive ? 'text-bdoea-yellow bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                    }
                  >
                    {SubIcon && <SubIcon size={isCollapsed ? 20 : 16} />}
                    {!isCollapsed && <span>{sub.label}</span>}
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
    <aside className={`relative h-full flex-shrink-0 shadow-2xl z-20 flex flex-col transition-all duration-300 ease-in-out print:hidden ${isCollapsed ? 'w-[88px]' : 'w-[280px]'}`}>
      
      {status === "loading" ? (
        <div className={`w-full h-full ${sidebarBgColor}`} />
      ) : (
        <div className={`flex flex-col h-full overflow-hidden text-white py-6 transition-colors duration-300 ${sidebarBgColor} ${isCollapsed ? 'px-[18px]' : 'px-5'}`}>
          
          {/* HEADER: Logo & Native Toggle Button */}
          <div className={`mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <img src="/bdoea-logo.png" alt="BDOEA Logo" className="w-[155px] h-auto object-contain pl-1" />
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className={`flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors shadow-sm ${
                isCollapsed ? 'w-full aspect-square rounded-2xl bg-transparent' : 'h-10 w-10 rounded-xl bg-white/5'
              }`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>

          {/* PROFILE SECTION */}
          <div className={`border border-white/10 flex items-center mb-8 shadow-sm transition-all ${isCollapsed ? 'p-1.5 rounded-full justify-center w-full aspect-square bg-transparent' : 'p-3 rounded-2xl justify-between bg-white/5'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full h-full' : ''}`}>
              <div className={`rounded-full bg-gray-200 border border-white/10 flex-shrink-0 ${isCollapsed ? 'w-full h-full' : 'w-10 h-10'}`} title={session?.user?.email?.split('@')[0] || "VEN"} />
              
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-[9px] tracking-widest uppercase m-0 leading-tight font-black text-bdoea-yellow">
                    {currentUserRole}
                  </p>
                  <p className="text-sm font-bold truncate leading-tight mt-0.5 whitespace-nowrap">{session?.user?.email?.split('@')[0] || "VEN"}</p>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white flex-shrink-0">
                <Settings size={16} />
              </button>
            )}
          </div>

          {/* SCROLLABLE NAVIGATION AREA */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:transparent pr-2 -mr-2">
            
            <div className="flex flex-col">
              {!isCollapsed && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-3 whitespace-nowrap">Main Menu</p>}
              <div className={`flex flex-col space-y-1 bg-white/[0.02] border border-white/5 rounded-2xl ${isCollapsed ? 'p-1.5' : 'p-2'}`}>
                {renderNavItems(visibleGeneralItems)}
              </div>
            </div>

            <div className="flex flex-col space-y-3 mt-2">
              {!isCollapsed ? (
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 px-3 whitespace-nowrap">BDOEA Systems</p>
              ) : (
                <div className="h-px bg-white/10 w-6 mx-auto mt-2 mb-1" />
              )}
              
              {visibleSystemItems.map((item, idx) => (
                <div key={idx} className={`flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl ${isCollapsed ? 'p-1.5' : 'p-2'}`}>
                  {renderNavItems([item])}
                </div>
              ))}
            </div>

          </nav>

          {/* BOTTOM: Logout Container */}
          <div className={`mt-4 pt-4 border-t border-white/10 flex ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className={`transition-all flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 ${
                isCollapsed ? 'w-full aspect-square rounded-2xl' : 'h-11 w-11 rounded-xl'
              }`}
              title="Log out"
            >
              <LogOut size={20} strokeWidth={2} className="flex-shrink-0" /> 
            </button>
          </div>

        </div>
      )}
    </aside>
  );
}