"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Calendar, CreditCard, CircleDollarSign, Book, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen, LayoutDashboard, WalletCards, Send,
  Briefcase, ClipboardList, PieChart, FileText, Users,
  Settings, Activity
} from 'lucide-react';
import { signOut, useSession } from "next-auth/react";
import ActionModal from '@/components/ActionModal';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Finance': true,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [logoutModal, setLogoutModal] = useState<{
    isOpen: boolean;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({ isOpen: false, status: 'idle' });

  if (pathname === '/login') return null;

  const currentUserRole = (session?.user as any)?.role || 'User';

  const generalNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
    { label: 'Events', href: '/events', icon: Calendar, roles: ['User', 'Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'] },
  ];

  const systemNavItems = [
    {
      label: 'Finance',
      icon: Book,
      roles: ['User', 'Officer/Admin', 'Treasurer', 'Auditor'],
      subItems: [
        { label: 'My Summary', href: '/member/dashboard', icon: PieChart, roles: ['User'] },
        { label: 'Benefits & Assistance', href: '/member/requests', icon: Activity, roles: ['User'] },
        
        { label: 'User Management', href: '/admin/dashboard', icon: Users, roles: ['Officer/Admin'] },
        { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['Officer/Admin'] },

        { label: 'Dashboard', href: '/treasurer/dashboard', icon: LayoutDashboard, roles: ['Treasurer'] },,
        { label: 'Funds', href: '/treasurer/funds', icon: Briefcase, roles: ['Treasurer'] },
        { label: 'AI Forecasting', href: '/treasurer/forecasting', icon: Activity, roles: ['Treasurer'] },
        
        { label: 'Audit Dashboard', href: '/auditor/dashboard', icon: ClipboardList, roles: ['Auditor'] },
        { label: 'Loan Ledger', href: '/auditor/loans', icon: CircleDollarSign, roles: ['Auditor'] },
        { label: 'Funds', href: '/auditor/funds', icon: Briefcase, roles: ['Auditor'] },
        { label: 'Disbursement', href: '/auditor/disbursement', icon: Send, roles: ['Auditor'] },
      ]
    },
  ];

  const visibleGeneralItems = generalNavItems.filter(item => item.roles.includes(currentUserRole));
  const visibleSystemItems = systemNavItems.filter(item => item.roles.includes(currentUserRole));

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const triggerLogout = () => {
    setLogoutModal({ isOpen: true, status: 'idle' });
  };

  const executeLogout = async () => {
    setLogoutModal(prev => ({ ...prev, status: 'loading' }));
    await signOut({ callbackUrl: '/login' });
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

      // Grouped item base
      const baseClasses = `flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] font-bold text-[13px] w-full relative active:scale-[0.98] group z-10 outline-none ${
        isCollapsed ? 'justify-center w-11 h-11 rounded-[16px] mx-auto' : 'px-3.5 py-3 rounded-[16px] justify-between'
      }`;

      // Inside a group container, active states shouldn't be fully opaque
      const activeClasses = isOpen || isParentActive || isDirectActive
        ? 'bg-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] text-white border border-white/[0.1] scale-[1.01]'
        : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent';

      return (
        <div key={item.label} className="flex flex-col w-full relative" title={isCollapsed ? item.label : undefined}>
          {hasSubItems ? (
            <button onClick={() => toggleMenu(item.label)} className={`${baseClasses} ${activeClasses}`}>
              <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Icon size={18} className={isOpen || isParentActive || isDirectActive ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-white/50 group-hover:text-amber-400 transition-colors"} />
                {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.label}</span>}
              </div>
              {!isCollapsed && <ChevronDown size={16} className={`relative z-10 transition-transform duration-300 opacity-50 ${isOpen ? "rotate-180" : ""}`} />}
            </button>
          ) : (
            <Link href={item.href!} className={`${baseClasses} ${activeClasses}`}>
              <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center w-full' : 'gap-3 w-full'}`}>
                <Icon size={18} className={isDirectActive ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-white/50 group-hover:text-amber-400 transition-colors"} />
                {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.label}</span>}
              </div>
            </Link>
          )}

          {hasSubItems && isOpen && (
            <div className={`flex flex-col relative w-full z-10 ${isCollapsed ? 'mt-2 gap-1 items-center' : 'mt-1 mb-2 space-y-1'}`}>
              {visibleSubItems.map((sub: any) => {
                const isSubActive = pathname === sub.href;
                const SubIcon = sub.icon;

                return (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    title={isCollapsed ? sub.label : undefined}
                    className={isCollapsed
                      ? `flex items-center justify-center w-11 h-11 mx-auto rounded-[16px] transition-all duration-300 ease-out active:scale-95 group ${isSubActive ? 'bg-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/[0.1] text-white' : 'bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white border border-transparent'}`
                      : `flex items-center gap-3 pl-11 pr-4 py-2 text-[12px] font-bold rounded-[14px] transition-all duration-300 ease-out active:scale-95 whitespace-nowrap group tracking-wide ${isSubActive ? 'bg-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/[0.1] text-white' : 'bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white border border-transparent'}`
                    }
                  >
                    {SubIcon && <SubIcon size={15} className={`transition-colors ${isSubActive ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-white/40 group-hover:text-amber-400"}`} />}
                    {!isCollapsed && <span className="relative z-10">{sub.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  const glassGroupContainer = "bg-white/[0.02] backdrop-blur-2xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[24px] p-2 flex flex-col space-y-1 relative z-10";

  return (
    <>
      <style jsx global>{`
        @keyframes deep-liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -25px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>

      <ActionModal
        isOpen={logoutModal.isOpen}
        title="Confirm Sign Out"
        message="Are you sure you want to securely sign out of your BDOEA account?"
        status={logoutModal.status}
        onConfirm={executeLogout}
        onClose={() => setLogoutModal({ isOpen: false, status: 'idle' })}
        confirmText="Sign Out"
      />

      <aside className={`relative h-full flex-shrink-0 z-50 flex flex-col bg-[#0a1224]/80 backdrop-blur-[50px] backdrop-saturate-[150%] border-r border-white/5 shadow-[4px_0_32px_rgba(0,0,0,0.3)] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden ${isCollapsed ? 'w-[100px]' : 'w-[290px]'}`}>
        
        {/* Dynamic Dark Blue & Yellow Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen opacity-50">
          <div className="absolute w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[90px] -top-20 -left-20 animate-[deep-liquid-drift_15s_ease-in-out_infinite]" />
          <div className="absolute w-[350px] h-[350px] bg-amber-500/20 rounded-full blur-[90px] top-1/4 -right-20 animate-[deep-liquid-drift_12s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
          <div className="absolute w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[80px] bottom-10 -left-10 animate-[deep-liquid-drift_18s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
        </div>

        {status === "loading" ? (
          <div className="w-full h-full relative z-10" />
        ) : (
          <div className="flex flex-col h-full overflow-hidden py-8 relative z-10">

            {/* Logo & Toggle Header */}
            <div className={`mb-10 flex items-center shrink-0 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-6'}`}>
              {!isCollapsed && (
                <img src="/bdoea-logo.png" alt="BDOEA Logo" className="w-[120px] h-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]" />
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`flex items-center justify-center bg-white/[0.04] backdrop-blur-md border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)] text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 outline-none ${isCollapsed ? 'w-12 h-12 rounded-[16px]' : 'h-10 w-10 rounded-full'}`}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>

            {/* Navigation Lists - Padding applied to the scrolling container to prevent shadow clipping */}
            <nav className={`flex-1 overflow-y-auto space-y-8 [&::-webkit-scrollbar]:hidden pb-4 pt-2 ${isCollapsed ? 'px-3' : 'px-6'}`}>
              
              <div className="flex flex-col space-y-2">
                {!isCollapsed && <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] mb-1 px-2 drop-shadow-sm">Main Menu</p>}
                <div className={glassGroupContainer}>
                  {renderNavItems(visibleGeneralItems)}
                </div>
              </div>

              <div className="flex flex-col space-y-2 mt-4">
                {!isCollapsed ? (
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] mb-1 px-2 drop-shadow-sm">Financial System</p>
                ) : (
                  <div className="h-px bg-white/10 w-8 mx-auto my-4" />
                )}
                
                {/* Wrap all system items inside the grouped container */}
                <div className={glassGroupContainer}>
                  {visibleSystemItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col w-full">
                      {renderNavItems([item])}
                    </div>
                  ))}
                </div>
              </div>
            </nav>

            {/* Footer Profile */}
            <div className={`mt-2 pt-6 border-t border-white/10 flex flex-col gap-3 shrink-0 ${isCollapsed ? 'px-3' : 'px-6'}`}>
              <div className={`bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center transition-all duration-400 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:bg-white/[0.1] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer ${isCollapsed ? 'p-2 rounded-[20px] justify-center w-[52px] h-[52px] mx-auto' : 'p-3 rounded-[24px] justify-between'}`}>
                <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full h-full' : ''}`}>
                  <div className={`rounded-full bg-gradient-to-tr from-[#04152d] to-blue-600 shadow-[inset_0_2px_6px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.5)] border border-white/20 flex-shrink-0 ${isCollapsed ? 'w-full h-full' : 'w-10 h-10'}`} title={session?.user?.email?.split('@')[0] || "VEN"} />

                  {!isCollapsed && (
                    <div className="overflow-hidden">
                      <p className="text-[9px] tracking-[0.2em] uppercase m-0 leading-tight font-black text-amber-400/90 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">
                        {currentUserRole}
                      </p>
                      <p className="text-[14px] font-black text-white truncate leading-tight mt-0.5 whitespace-nowrap">{session?.user?.email?.split('@')[0] || "VEN"}</p>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <button 
                    onClick={triggerLogout}
                    className="p-2.5 bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-400/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-xl transition-all duration-300 text-white/50 hover:text-red-400 hover:scale-110 active:scale-90 flex-shrink-0 outline-none"
                    title="Sign Out"
                  >
                    <LogOut size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {isCollapsed && (
                <div className="flex justify-center mt-2">
                  <button
                    onClick={triggerLogout}
                    className="transition-all duration-300 flex items-center justify-center bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-400/50 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.1)] text-white/50 hover:text-red-400 hover:-translate-y-0.5 active:scale-95 w-[52px] h-[52px] rounded-[20px] mx-auto"
                    title="Sign Out"
                  >
                    <LogOut size={18} strokeWidth={2.5} className="flex-shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}