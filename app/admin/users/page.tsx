'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  ArrowLeft,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Ban,
  MoreVertical,
  Activity,
  Check,
  Loader2,
} from 'lucide-react';
import {
  getAllManagedUsers,
  updateUserRole,
  updateUserStatus,
  type ManagedUser,
} from '@/features/admin/services/adminUserService';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'moderator' | 'user'>('all');
  const [activeDropdownUid, setActiveDropdownUid] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      const data = await getAllManagedUsers();
      setUsers(data);
      setLoading(false);
    }
    loadUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'moderator' | 'user') => {
    setUpdatingUid(uid);
    const success = await updateUserRole(uid, newRole);
    setUpdatingUid(null);
    setActiveDropdownUid(null);

    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      toast.success(`Role updated to ${newRole.toUpperCase()} for user`);
    } else {
      toast.error('Failed to update user role');
    }
  };

  const handleStatusChange = async (uid: string, newStatus: 'active' | 'suspended' | 'banned') => {
    setUpdatingUid(uid);
    const success = await updateUserStatus(uid, newStatus);
    setUpdatingUid(null);
    setActiveDropdownUid(null);

    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, status: newStatus } : u))
      );
      toast.success(`Account status set to ${newStatus.toUpperCase()}`);
    } else {
      toast.error('Failed to update account status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 z-10 relative">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
                <Users className="w-4 h-4" /> System Governance
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                User Management
              </h1>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Total Users: <span className="text-indigo-400 font-bold">{users.length}</span>
          </div>
        </header>

        {/* CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suppressHydrationWarning
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* ROLE FILTER TABS */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'admin', 'moderator', 'user'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  selectedRoleFilter === role
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 flex items-center justify-center text-slate-400 gap-2 text-sm">
              <Activity className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading user directory...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No users found matching your search filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition">
                      {/* USER INFO */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30 text-xs">
                              {u.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-100">{u.displayName}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ROLE BADGE */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-colors ${
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : u.role === 'moderator'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                          {u.role === 'moderator' && <Shield className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : u.status === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* DATES */}
                      <td className="py-3 px-4 text-slate-400">{u.createdAt}</td>
                      <td className="py-3 px-4 text-slate-400">{u.lastActive}</td>

                      {/* DROPDOWN ACTIONS WITH ACTIVE UI LOADING */}
                      <td className="py-3 px-4 text-right relative">
                        <button
                          onClick={() =>
                            setActiveDropdownUid(activeDropdownUid === u.uid ? null : u.uid)
                          }
                          disabled={updatingUid === u.uid}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {updatingUid === u.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </button>

                        <AnimatePresence>
                          {activeDropdownUid === u.uid && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute right-4 top-10 z-50 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 text-left space-y-1"
                            >
                              <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">Set Role</div>
                              <button
                                disabled={u.role === 'admin' || updatingUid === u.uid}
                                onClick={() => handleRoleChange(u.uid, 'admin')}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-purple-300 flex items-center justify-between disabled:opacity-50"
                              >
                                <span>Make Admin</span>
                                {u.role === 'admin' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                              </button>
                              <button
                                disabled={u.role === 'moderator' || updatingUid === u.uid}
                                onClick={() => handleRoleChange(u.uid, 'moderator')}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-indigo-300 flex items-center justify-between disabled:opacity-50"
                              >
                                <span>Make Moderator</span>
                                {u.role === 'moderator' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                              </button>
                              <button
                                disabled={u.role === 'user' || updatingUid === u.uid}
                                onClick={() => handleRoleChange(u.uid, 'user')}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-300 flex items-center justify-between disabled:opacity-50"
                              >
                                <span>Standard User</span>
                                {u.role === 'user' && <Check className="w-3.5 h-3.5 text-slate-400" />}
                              </button>

                              <div className="border-t border-slate-800 my-1" />

                              <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">Account Status</div>
                              {u.status !== 'active' && (
                                <button
                                  disabled={updatingUid === u.uid}
                                  onClick={() => handleStatusChange(u.uid, 'active')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-emerald-400 flex items-center gap-2"
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> Reactivate
                                </button>
                              )}
                              {u.status !== 'suspended' && (
                                <button
                                  disabled={updatingUid === u.uid}
                                  onClick={() => handleStatusChange(u.uid, 'suspended')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-amber-400 flex items-center gap-2"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Suspend
                                </button>
                              )}
                              {u.status !== 'banned' && (
                                <button
                                  disabled={updatingUid === u.uid}
                                  onClick={() => handleStatusChange(u.uid, 'banned')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-rose-400 flex items-center gap-2"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Ban User
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}