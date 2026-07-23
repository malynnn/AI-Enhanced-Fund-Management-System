"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Calendar, CircleDollarSign, Book, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen, LayoutDashboard, WalletCards, Send,
  Briefcase, ClipboardList, PieChart, Users,
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
  
  // iOS 26/27-style liquid glass sidebar shell
  const sidebarBgColor = "bg-gradient-to-b from-white/50 via-white/35 to-white/25 backdrop-blur-[54px] backdrop-saturate-[190%] border-r border-white/60 shadow-[8px_0_40px_rgba(20,30,70,0.08),inset_-1px_0_0_rgba(255,255,255,0.5)]";

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

        { label: 'Dashboard', href: '/treasurer/dashboard', icon: LayoutDashboard, roles: ['Treasurer'] },
        { label: 'Collections', href: '/treasurer/collections', icon: WalletCards, roles: ['Treasurer'] },
        { label: 'Disbursement', href: '/treasurer/disbursement', icon: Send, roles: ['Treasurer'] },
        { label: 'Loan Ledger', href: '/treasurer/loans', icon: CircleDollarSign, roles: ['Treasurer'] },
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

      // Base classes for the tactile, springy feel
      const baseClasses = `glass-sheen flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] font-bold text-[13px] w-full relative group active:scale-[0.96] ${
        isCollapsed ? 'justify-center aspect-square rounded-xl' : 'px-3.5 py-2.5 rounded-xl justify-between'
      }`;

      // iOS-style liquid glass active/inactive states
      const activeClasses = isOpen || isParentActive || isDirectActive
        ? 'bg-gradient-to-br from-white/90 via-white/80 to-blue-50/60 backdrop-blur-xl backdrop-saturate-[190%] text-[#04152d] shadow-[0_6px_16px_rgba(20,30,70,0.14),inset_0_1px_2px_rgba(255,255,255,1)] border border-white/90 scale-[1.02]'
        : 'text-gray-500 bg-white/5 hover:bg-white/70 hover:backdrop-blur-xl hover:shadow-[0_4px_12px_rgba(20,30,70,0.07)] hover:text-[#04152d] border border-white/30 hover:border-white/70 hover:scale-[1.015]';

      return (
        <div key={item.label} className="flex flex-col w-full" title={isCollapsed ? item.label : undefined}>
          {hasSubItems ? (
            <button onClick={() => toggleMenu(item.label)} className={`${baseClasses} ${activeClasses}`}>
              <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <Icon size={isCollapsed ? 18 : 16} className={isOpen || isParentActive || isDirectActive ? "text-[#04152d]" : "text-gray-400 group-hover:text-[#04152d] transition-colors"} />
                {!isCollapsed && <span className="whitespace-nowrap tracking-tight">{item.label}</span>}
              </div>
              {!isCollapsed && <ChevronDown size={14} className={`relative z-10 transition-transform duration-300 opacity-60 ${isOpen ? "rotate-180" : ""}`} />}
            </button>
          ) : (
            <Link href={item.href!} className={`${baseClasses} ${activeClasses}`}>
              <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center w-full' : 'gap-2.5 w-full'}`}>
                <Icon size={isCollapsed ? 18 : 16} className={isDirectActive ? "text-[#04152d]" : "text-gray-400 group-hover:text-[#04152d] transition-colors"} />
                {!isCollapsed && <span className="whitespace-nowrap tracking-tight">{item.label}</span>}
              </div>
            </Link>
          )}

          {hasSubItems && (
            <div
              className="grid w-full transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
            >
              <div className={`flex flex-col relative w-full overflow-hidden ${isCollapsed ? 'mt-1.5 gap-1.5 items-center' : 'mt-1.5 mb-2 space-y-1'}`}>
                {visibleSubItems.map((sub: any, subIdx: number) => {
                  const isSubActive = pathname === sub.href;
                  const SubIcon = sub.icon;

                  return (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      title={isCollapsed ? sub.label : undefined}
                      style={{ transitionDelay: isOpen ? `${subIdx * 30}ms` : '0ms' }}
                      className={`glass-sheen transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isCollapsed
                        ? `flex items-center justify-center w-full aspect-square rounded-xl active:scale-90 group ${isSubActive ? 'bg-gradient-to-br from-white/90 via-white/80 to-blue-50/60 backdrop-blur-xl shadow-[0_6px_14px_rgba(20,30,70,0.12),inset_0_1px_2px_rgba(255,255,255,1)] border border-white/90 text-[#04152d] scale-[1.02]' : 'text-gray-500 bg-white/5 hover:bg-white/70 hover:scale-[1.015] hover:shadow-[0_4px_12px_rgba(20,30,70,0.06)] border border-white/30 hover:border-white/70'}`
                        : `flex items-center gap-2.5 pl-9 pr-3.5 py-2 text-[12px] font-bold rounded-xl active:scale-95 whitespace-nowrap group tracking-tight ${isSubActive ? 'bg-gradient-to-br from-white/90 via-white/80 to-blue-50/60 backdrop-blur-xl shadow-[0_6px_14px_rgba(20,30,70,0.12),inset_0_1px_2px_rgba(255,255,255,1)] border border-white/90 text-[#04152d] scale-[1.02]' : 'text-gray-500 bg-white/5 hover:text-[#04152d] hover:bg-white/70 hover:shadow-[0_4px_12px_rgba(20,30,70,0.06)] border border-white/30 hover:border-white/70 hover:scale-[1.015]'}`
                      }`}
                    >
                      {SubIcon && <SubIcon size={isCollapsed ? 18 : 14} className={`transition-colors ${isSubActive ? "text-amber-500" : "group-hover:text-amber-500"}`} />}
                      {!isCollapsed && <span>{sub.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <style jsx global>{`
        @keyframes liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -18px) scale(1.06); }
        }
        /* iOS 26/27-style liquid glass: standing specular highlight + refraction rim + hover bloom */
        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%),
            radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.8;
          transition: opacity 0.35s ease;
          pointer-events: none;
          z-index: 1;
        }
        .glass-sheen:hover::before {
          opacity: 1;
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.85),
            inset 0 -8px 16px -12px rgba(80,110,220,0.2),
            inset 1px 0 0 rgba(255,255,255,0.3),
            inset -1px 0 0 rgba(255,255,255,0.1);
          transition: box-shadow 0.35s ease;
          pointer-events: none;
          z-index: 1;
          border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 -8px 18px -10px rgba(80,110,220,0.28),
            inset 1px 0 0 rgba(255,255,255,0.45),
            inset -1px 0 0 rgba(255,255,255,0.16),
            inset 0 0 0 1px rgba(255,255,255,0.5);
        }
        .glass-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(75px);
          pointer-events: none;
          animation: liquid-drift 14s ease-in-out infinite;
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

      <aside className={`relative h-full flex-shrink-0 z-20 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden ${isCollapsed ? 'w-[84px]' : 'w-[264px]'}`}>
        {status === "loading" ? (
          <div className={`w-full h-full ${sidebarBgColor}`} />
        ) : (
          <div className={`relative flex flex-col h-full overflow-hidden py-6 transition-colors duration-500 ${sidebarBgColor} ${isCollapsed ? 'px-[14px]' : 'px-5'}`}>

            <div className="glass-blob w-40 h-40 bg-blue-400/40 -top-8 -left-10" />
            <div className="glass-blob w-36 h-36 bg-amber-300/35 bottom-24 -right-14" style={{ animationDelay: '3s' }} />
            <div className="glass-blob w-28 h-28 bg-emerald-300/30 top-1/2 -left-12" style={{ animationDelay: '6s' }} />

            <div className={`relative z-10 mb-7 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isCollapsed && (
                <img src="/bdoea-logo-blue.png" alt="BDOEA Logo" className="w-[108px] h-auto object-contain pl-1 drop-shadow-sm" />
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`glass-sheen flex items-center justify-center bg-white/65 backdrop-blur-md backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_12px_rgba(20,30,70,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)] text-[#04152d] hover:bg-white/90 hover:scale-105 active:scale-90 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isCollapsed ? 'w-full aspect-square rounded-xl' : 'h-9 w-9 rounded-xl'}`}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>

            <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:transparent pr-2 -mr-2 pb-4">
              
              <div className="flex flex-col">
                {!isCollapsed && <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-3 px-3.5 whitespace-nowrap">Main Menu</p>}
                <div className={`glass-sheen flex flex-col space-y-1.5 bg-gradient-to-br from-white/45 via-white/30 to-white/20 backdrop-blur-2xl backdrop-saturate-[190%] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_4px_14px_rgba(20,30,70,0.04)] rounded-[20px] ${isCollapsed ? 'p-2' : 'p-2.5'}`}>
                  {renderNavItems(visibleGeneralItems)}
                </div>
              </div>

              <div className="flex flex-col space-y-3 mt-3">
                {!isCollapsed ? (
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1.5 px-3.5 whitespace-nowrap">Financial System</p>
                ) : (
                  <div className="h-px bg-gray-300 w-8 mx-auto mt-3 mb-1.5" />
                )}

                {visibleSystemItems.map((item, idx) => (
                  <div key={idx} className={`glass-sheen flex flex-col bg-gradient-to-br from-white/45 via-white/30 to-blue-50/20 backdrop-blur-2xl backdrop-saturate-[190%] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_4px_14px_rgba(20,30,70,0.04)] rounded-[20px] ${isCollapsed ? 'p-2' : 'p-2.5'}`}>
                    {renderNavItems([item])}
                  </div>
                ))}
              </div>
            </nav>

            <div className="relative z-10 mt-5 pt-5 border-t border-gray-300/50 flex flex-col gap-2.5">
              <div className={`glass-sheen bg-gradient-to-br from-white/85 via-white/75 to-blue-50/40 backdrop-blur-2xl backdrop-saturate-[190%] border border-white/85 shadow-[0_6px_16px_rgba(20,30,70,0.1),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_10px_22px_rgba(20,30,70,0.14),inset_0_1px_2px_rgba(255,255,255,1)] hover:scale-[1.015] cursor-pointer ${isCollapsed ? 'p-2 rounded-xl justify-center w-full aspect-square' : 'p-2.5 rounded-[18px] justify-between'}`}>
                <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center w-full h-full' : ''}`}>
                  <div className={`rounded-full bg-gradient-to-tr from-[#04152d] to-blue-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] flex-shrink-0 ${isCollapsed ? 'w-full h-full' : 'w-9 h-9'}`} title={session?.user?.email?.split('@')[0] || "VEN"} />

                  {!isCollapsed && (
                    <div className="overflow-hidden pl-0.5">
                      <p className="text-[8.5px] tracking-[0.18em] uppercase m-0 leading-tight font-black text-gray-500">
                        {currentUserRole}
                      </p>
                      <p className="text-[13px] font-black text-[#04152d] truncate leading-tight mt-0.5 whitespace-nowrap tracking-tight">{session?.user?.email?.split('@')[0] || "VEN"}</p>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <button 
                    onClick={triggerLogout}
                    className="glass-sheen p-2 bg-white/60 hover:bg-white/90 border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] text-gray-500 hover:text-red-500 hover:scale-110 active:scale-90 flex-shrink-0"
                    title="Sign Out"
                  >
                    <LogOut size={15} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {isCollapsed && (
                <div className="flex justify-center">
                  <button
                    onClick={triggerLogout}
                    className="glass-sheen transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center bg-white/65 hover:bg-white/90 border border-white/80 shadow-[0_4px_12px_rgba(20,30,70,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)] text-gray-500 hover:text-red-500 hover:scale-105 active:scale-90 w-full aspect-square rounded-xl"
                    title="Sign Out"
                  >
                    <LogOut size={17} strokeWidth={2.5} className="flex-shrink-0" />
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