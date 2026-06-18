"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Users, UserPlus, ShieldAlert, Search, 
  CheckCircle2, XCircle, Clock, ShieldCheck, UserCog, Activity,
  Ban, Loader2, Edit, Check
} from 'lucide-react';
import Header from '@/components/Header';
import ActionModal from '@/components/ActionModal';

// --- INTERFACES FOR BACKEND DATA ---
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
}

interface PendingRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  type: 'SECURITY' | 'ALERT' | 'USER_MGMT';
  createdAt: string;
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';
  const { data: session } = useSession();

  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'Member', password: '' });

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string; onConfirm?: () => void; confirmText?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      
      // Fetch all required admin data in parallel
      const [usersRes, reqRes, actRes] = await Promise.all([
        fetch(`${gatewayUrl}/api/admin/users`).catch(() => null),
        fetch(`${gatewayUrl}/api/admin/requests`).catch(() => null),
        fetch(`${gatewayUrl}/api/admin/activity`).catch(() => null)
      ]);

      if (usersRes?.ok) setUsers(await usersRes.json());
      if (reqRes?.ok) setPendingRequests(await reqRes.json());
      if (actRes?.ok) setActivityLogs(await actRes.json());
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- FILTERING ---
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Don't show the logged-in user themselves
      if (session?.user?.email && u.email === session.user.email) return false;

      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter, session]);

  const activeMembersCount = users.filter(u => u.role === 'Member' && u.status === 'ACTIVE').length;
  const adminOfficersCount = users.filter(u => u.role !== 'Member' && u.status === 'ACTIVE').length;

  const roleColors: Record<string, string> = {
    'Admin': 'bg-purple-100 text-purple-700 border-purple-200',
    'Treasurer': 'bg-blue-100 text-blue-700 border-blue-200',
    'Auditor': 'bg-amber-100 text-amber-700 border-amber-200',
    'Member': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  // --- HANDLERS ---
  const handleTabChange = (tab: string) => {
    router.push(`/admin/dashboard?tab=${tab}`);
  };

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      
      if (res.ok) {
        setIsAddUserModalOpen(false);
        setNewUserForm({ name: '', email: '', role: 'Member', password: '' });
        await fetchData(); // Refresh data
        setActionModal({ isOpen: true, title: 'User Created', message: '', status: 'success', resultMsg: `${newUserForm.name} has been added successfully.`, confirmText: 'Close' });
      } else throw new Error("Failed to create user");
    } catch (err) {
      setActionModal({ isOpen: true, title: 'Error', message: '', status: 'error', resultMsg: 'Failed to create new user. Please try again.', confirmText: 'Close' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = (user: User) => {
    const isSuspending = user.status === 'ACTIVE';
    setActionModal({
      isOpen: true, status: 'idle', 
      title: isSuspending ? 'Suspend User' : 'Activate User',
      message: `Are you sure you want to ${isSuspending ? 'suspend' : 'activate'} ${user.name}?`,
      confirmText: isSuspending ? 'Suspend' : 'Activate',
      onConfirm: async () => {
        setActionModal(prev => ({ ...prev, status: 'loading' }));
        try {
          const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
          const res = await fetch(`${gatewayUrl}/api/admin/users/${user.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isSuspending ? 'SUSPENDED' : 'ACTIVE' })
          });
          if (res.ok) {
            await fetchData();
            setActionModal({ isOpen: true, title: 'Status Updated', message: '', status: 'success', resultMsg: `User status changed to ${isSuspending ? 'Suspended' : 'Active'}.`, confirmText: 'Close' });
          } else throw new Error();
        } catch (err) {
          setActionModal({ isOpen: true, title: 'Update Failed', message: '', status: 'error', resultMsg: 'Failed to update user status.', confirmText: 'Close' });
        }
      }
    });
  };

  const handleRequestAction = (req: PendingRequest, action: 'APPROVE' | 'REJECT') => {
    setActionModal({
      isOpen: true, status: 'idle', 
      title: action === 'APPROVE' ? 'Approve Registration' : 'Reject Registration',
      message: `Are you sure you want to ${action.toLowerCase()} the request for ${req.name}?`,
      confirmText: action === 'APPROVE' ? 'Approve' : 'Reject',
      onConfirm: async () => {
        setActionModal(prev => ({ ...prev, status: 'loading' }));
        try {
          const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
          const res = await fetch(`${gatewayUrl}/api/admin/requests/${req.id}/${action.toLowerCase()}`, { method: 'POST' });
          if (res.ok) {
            await fetchData();
            setActionModal({ isOpen: true, title: `Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`, message: '', status: 'success', resultMsg: `Registration has been processed.`, confirmText: 'Close' });
          } else throw new Error();
        } catch (err) {
          setActionModal({ isOpen: true, title: 'Action Failed', message: '', status: 'error', resultMsg: 'Failed to process the request.', confirmText: 'Close' });
        }
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6] relative">
      
      {/* GLOBAL ACTION MODAL */}
      <ActionModal 
        isOpen={actionModal.isOpen} title={actionModal.title} message={actionModal.message} status={actionModal.status} resultMsg={actionModal.resultMsg} confirmText={actionModal.confirmText}
        onConfirm={() => {
          if (actionModal.onConfirm) actionModal.onConfirm();
          else setActionModal({ ...actionModal, isOpen: false });
        }} 
        onClose={() => setActionModal({ ...actionModal, isOpen: false })} 
      />

      {/* ADD USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04152d]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-pop">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-black text-[#04152d] flex items-center gap-2"><UserPlus size={20}/> Create New User</h2>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 hover:text-red-500"><XCircle size={20}/></button>
            </div>
            <form onSubmit={submitNewUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 text-left">Full Name</label>
                <input required type="text" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-500" placeholder="e.g. John Doe"/>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 text-left">Email / ID</label>
                <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-500" placeholder="e.g. jdoe@bdoea.com"/>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 text-left">System Role</label>
                <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-500 appearance-none bg-white">
                  <option value="Member">Member</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Superadmin">Superadmin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 text-left">Initial Password</label>
                <input required type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-500"/>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-[#04152d] hover:bg-black text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} Confirm
                </button>
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-3 rounded-xl transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Header />

      <main className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 animate-fade-in flex-1">
        
        {/* Tab Navigation */}
        <div className="flex gap-4 border-b-2 border-gray-200/60 w-full px-2">
          <button onClick={() => handleTabChange('users')} className={`pb-3 flex items-center gap-2 text-sm font-black translate-y-[2px] transition-colors ${currentTab === 'users' ? 'text-[#04152d] border-b-4 border-[#04152d]' : 'text-gray-400 hover:text-gray-600'}`}>
            <UserCog size={18} /> User Directory
          </button>
          <button onClick={() => handleTabChange('pending-approvals')} className={`pb-3 flex items-center gap-2 text-sm font-black translate-y-[2px] transition-colors ${currentTab === 'pending-approvals' ? 'text-[#04152d] border-b-4 border-[#04152d]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Clock size={18} /> Pending Approvals
            {pendingRequests.length > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}
          </button>
          <button onClick={() => handleTabChange('activity')} className={`pb-3 flex items-center gap-2 text-sm font-black translate-y-[2px] transition-colors ${currentTab === 'activity' ? 'text-[#04152d] border-b-4 border-[#04152d]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Activity size={18} /> Security & Audit Logs
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 p-16">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#04152d]" />
              <p className="font-bold">Syncing Administrative Data...</p>
            </div>
          ) : (
            <>
              {/* USER MANAGEMENT TAB */}
              {currentTab === 'users' && (
                <>
                  <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none focus:bg-white focus:border-[#04152d] transition-colors" />
                      </div>
                      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="py-2 pl-4 pr-8 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none cursor-pointer appearance-none">
                        <option value="ALL">All Roles</option>
                        <option value="Superadmin">Superadmin</option>
                        <option value="Treasurer">Treasurer</option>
                        <option value="Auditor">Auditor</option>
                        <option value="Member">Member</option>
                      </select>
                    </div>
                    <button onClick={() => setIsAddUserModalOpen(true)} className="bg-[#04152d] text-white hover:bg-black rounded-xl px-4 py-2.5 font-bold text-sm flex items-center gap-2 shadow-sm transition-all w-full sm:w-auto justify-center">
                      <UserPlus size={16} /> Add User
                    </button>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                      <thead className="bg-[#f8faff] shadow-[0_1px_0_rgba(229,231,235,1)]">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">User Details</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">System Role</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Date Joined</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold uppercase">{user.name.charAt(0)}</div>
                                <div>
                                  <p className="text-sm font-bold text-[#04152d]">{user.name}</p>
                                  <p className="text-xs text-gray-500 font-medium font-mono">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-left">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${roleColors[user.role] || roleColors['Member']}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-left">
                              {user.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-200"><CheckCircle2 size={12}/> Active</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-200"><Ban size={12}/> Suspended</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-500 text-left">
                              {new Date(user.joinedAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => toggleUserStatus(user)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${user.status === 'ACTIVE' ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                {user.status === 'ACTIVE' ? <><Ban size={14}/> Suspend</> : <><CheckCircle2 size={14}/> Activate</>}
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">No users found matching your filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* PENDING APPROVALS TAB */}
              {currentTab === 'pending-approvals' && (
                <div className="p-6 space-y-4">
                  {pendingRequests.length > 0 ? pendingRequests.map(req => (
                    <div key={req.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex flex-wrap flex-1 gap-x-12 gap-y-4">
                        <div>
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Applicant</span>
                          <p className="text-base font-bold text-[#04152d] text-left">{req.name}</p>
                          <p className="text-xs text-gray-500 font-mono text-left">{req.email}</p>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-left">Requested Role</span>
                          <span className="text-[10px] font-black text-[#04152d] uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-md">
                            {req.requestedRole}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Request Date</span>
                          <p className="text-sm font-bold text-[#04152d] text-left">{new Date(req.createdAt || new Date()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => handleRequestAction(req, 'APPROVE')} className="flex-1 md:flex-none bg-emerald-600 text-white hover:bg-emerald-700 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_0_rgba(5,70,40,0.45)]">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button onClick={() => handleRequestAction(req, 'REJECT')} className="flex-1 md:flex-none bg-white text-red-600 hover:bg-red-50 border border-red-200 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <ShieldCheck size={56} className="mb-4 text-emerald-500/50" />
                      <p className="font-black text-lg text-[#04152d]">System is Secure</p>
                      <p className="text-sm mt-1">No pending registrations require your approval.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY LOGS TAB */}
              {currentTab === 'activity' && (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <Activity className="text-blue-500" size={20} />
                    <h2 className="text-lg font-black text-[#04152d] text-left">Master Security Log</h2>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto max-h-[600px]">
                    {activityLogs.length > 0 ? activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className={`p-2.5 rounded-xl shrink-0 ${log.type === 'ALERT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {log.type === 'ALERT' ? <ShieldAlert size={20} /> : <Activity size={20} />}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-bold text-[#04152d] text-left">{log.action}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{log.user}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-xs font-medium text-gray-400">{new Date(log.createdAt || new Date()).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-gray-400 py-10 font-bold">No activity logs recorded.</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] text-[#04152d]"><Loader2 className="animate-spin w-8 h-8" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}