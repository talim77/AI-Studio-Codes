import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffMember, StaffPermissions, DEFAULT_STAFF_PERMISSIONS, DEFAULT_OWNER_PERMISSIONS } from '../types/lab';
import {
  Users,
  Plus,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Lock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sliders,
  Trash2,
  X,
  Check,
} from 'lucide-react';

interface StaffManagementViewProps {
  staffMembers: StaffMember[];
  onAddStaff: (member: Omit<StaffMember, 'id' | 'createdAt'>) => void;
  onUpdateStaff: (id: string, updates: Partial<StaffMember>) => void;
  onDeleteStaff: (id: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffMembers,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
}) => {
  const { currentUser, labProfile, quickSwitchUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  const [showAddModal, setShowAddModal] = useState(false);
  const [revealedPins, setRevealedPins] = useState<{ [id: string]: boolean }>({});

  // Form State for New Staff
  const [staffUserId, setStaffUserId] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('Medical Lab Technician (MLT)');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [newPermissions, setNewPermissions] = useState<StaffPermissions>({
    ...DEFAULT_STAFF_PERMISSIONS,
  });

  // Editing PIN State
  const [editingStaffPin, setEditingStaffPin] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');

  // Editing Permissions State
  const [editingStaffPerms, setEditingStaffPerms] = useState<StaffMember | null>(null);
  const [permsState, setPermsState] = useState<StaffPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUserId.trim() || !name.trim() || pin.length !== 4) {
      alert('Kripya valid Staff User ID, Naam aur 4-digit PIN enter karein.');
      return;
    }

    onAddStaff({
      labId: labProfile.uniqueLabId,
      staffUserId: staffUserId.trim().toUpperCase(),
      name: name.trim(),
      role,
      pin: pin.trim(),
      designation: designation.trim(),
      phone: phone.trim() || '-',
      isActive: true,
      permissions: role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : newPermissions,
    });

    setShowAddModal(false);
    setStaffUserId('');
    setName('');
    setPin('');
    setPhone('');
    setNewPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
  };

  const handleUpdatePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffPin || newPin.length !== 4) {
      alert('Kripya valid 4-digit PIN enter karein.');
      return;
    }
    onUpdateStaff(editingStaffPin.id, { pin: newPin.trim() });
    setEditingStaffPin(null);
    setNewPin('');
  };

  const handleOpenPermsModal = (staff: StaffMember) => {
    setEditingStaffPerms(staff);
    setPermsState(staff.permissions || (staff.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS));
  };

  const handleSavePermsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffPerms) return;
    onUpdateStaff(editingStaffPerms.id, { permissions: permsState });
    setEditingStaffPerms(null);
  };

  // If active user is Staff, show Access Restricted banner
  if (!isOwner) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold font-heading text-slate-900">
          Staff Management Restricted to Lab Owner
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Aap currently <strong>Staff Mode ({currentUser?.name})</strong> mein logged in hain. Staff accounts create karna, PIN change karna, aur permissions grant karna sirf <strong>Lab Owner</strong> ke paas permitted hai.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => quickSwitchUser('owner')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Switch to Owner Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Staff Credentials & Permissions Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500">
            Create unique User IDs and 4-digit PINs for staff members and selectively grant permissions to edit test catalog, delete reports, or view referral revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Staff Member</span>
        </button>
      </div>

      {/* Lab Unique ID Callout */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">
            Your Laboratory Direct Access ID
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-2xl font-bold text-white tracking-widest">
              {labProfile.uniqueLabId}
            </span>
            <span className="text-xs text-slate-400">
              (Apne staff ko yeh Lab ID dein login karne ke liye)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-300 max-w-sm">
          Staff member login page par <strong>Option 2 (Staff ID & PIN)</strong> choose karke yeh Lab ID, apna User ID aur 4-digit PIN daal kar seedha login kar sakte hain.
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold font-heading text-slate-900">
              Active Staff & Operator Accounts ({staffMembers.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Manage credentials, grant selective permissions, and view security PINs.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Staff User ID</th>
                <th className="py-3 px-4">Full Name & Role</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Security PIN</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffMembers.map((staff) => {
                const isPinRevealed = revealedPins[staff.id];
                const perms = staff.permissions || (staff.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {staff.staffUserId}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{staff.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {staff.role === 'owner' ? (
                          <span className="text-emerald-700 font-semibold">Owner (All Rights)</span>
                        ) : (
                          <span className="text-cyan-700 font-semibold">Staff (Custom Rights)</span>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div>{staff.designation}</div>
                      <div className="text-[10px] text-slate-400">{staff.phone}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono tracking-widest text-slate-900 font-semibold bg-slate-100 px-2 py-1 rounded text-xs">
                          {isPinRevealed ? staff.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePinReveal(staff.id)}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                        >
                          {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {staff.role === 'owner' ? (
                        <span className="text-[11px] font-semibold text-emerald-700">All Permissions Granted</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {perms.canEditTestCatalog && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200">
                              Catalog Edit
                            </span>
                          )}
                          {perms.canDeleteReports && (
                            <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-medium border border-rose-200">
                              Delete Reports
                            </span>
                          )}
                          {perms.canManageDoctors && (
                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                              Doctors
                            </span>
                          )}
                          {perms.canViewFinancials && (
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                              Financials
                            </span>
                          )}
                          {!perms.canEditTestCatalog && !perms.canDeleteReports && !perms.canManageDoctors && !perms.canViewFinancials && (
                            <span className="text-slate-400 italic">Standard Entry Only</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {staff.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Disabled</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {staff.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPermsModal(staff)}
                            className="px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 rounded cursor-pointer transition-colors"
                            title="Set staff specific permissions"
                          >
                            Set Permissions
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaffPin(staff);
                            setNewPin(staff.pin);
                          }}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          Change PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStaff(staff.id, { isActive: !staff.isActive })}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          {staff.isActive ? 'Disable' : 'Enable'}
                        </button>
                        {staff.staffUserId !== 'OWNER-01' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete staff account ${staff.name}?`)) {
                                onDeleteStaff(staff.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {editingStaffPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Staff Permissions: {editingStaffPerms.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  User ID: {editingStaffPerms.staffUserId}
                </p>
              </div>
              <button
                onClick={() => setEditingStaffPerms(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePermsSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Owner ke roop mein aap is staff member ko specific permissions grant ya restrict kar sakte hain:
              </p>

              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permsState.canEditTestCatalog}
                    onChange={(e) =>
                      setPermsState((p) => ({ ...p, canEditTestCatalog: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Test Catalog Edit & Add Custom Test
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Blood test name, prices, parameters, normal reference ranges edit karne aur naye custom tests add karne ki permission.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permsState.canDeleteReports}
                    onChange={(e) =>
                      setPermsState((p) => ({ ...p, canDeleteReports: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Delete Patient Reports
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Purani ya galat reports ko database se permanently delete karne ki permission.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permsState.canManageDoctors}
                    onChange={(e) =>
                      setPermsState((p) => ({ ...p, canManageDoctors: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Manage Referring Doctors & Commission Rates
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Referring doctors ko add/edit karna aur referral commission percentage set karna.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permsState.canViewFinancials}
                    onChange={(e) =>
                      setPermsState((p) => ({ ...p, canViewFinancials: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      View Financial Revenue & Doctor Referral Payouts
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total revenue collected aur doctor referral statements dekhne ki permission.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffPerms(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Staff Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                + Create New Staff Member
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff User ID (e.g. AFTB03, TECH-03) *
                </label>
                <input
                  type="text"
                  required
                  value={staffUserId}
                  onChange={(e) => setStaffUserId(e.target.value.toUpperCase())}
                  placeholder="e.g. AFTB03"
                  className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aftab Alam"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Lab Technician"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Access Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
                  >
                    <option value="staff">Staff (Custom Permissions)</option>
                    <option value="owner">Owner (Admin All Rights)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    4-Digit Security PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 text-xs font-mono tracking-widest border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              {role === 'staff' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="font-semibold text-slate-700 block">
                    Grant Specific Permissions to this Staff:
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canEditTestCatalog}
                      onChange={(e) =>
                        setNewPermissions((p) => ({ ...p, canEditTestCatalog: e.target.checked }))
                      }
                      className="rounded text-cyan-700"
                    />
                    <span>Allow Edit Test Catalog, Prices & Add Custom Tests</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canManageDoctors}
                      onChange={(e) =>
                        setNewPermissions((p) => ({ ...p, canManageDoctors: e.target.checked }))
                      }
                      className="rounded text-cyan-700"
                    />
                    <span>Allow Add/Edit Doctors & Referral Rates</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {editingStaffPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold font-heading text-slate-900 mb-1">
              Change PIN for {editingStaffPin.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Staff ID: {editingStaffPin.staffUserId}
            </p>

            <form onSubmit={handleUpdatePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter New 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffPin(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg font-semibold cursor-pointer"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
