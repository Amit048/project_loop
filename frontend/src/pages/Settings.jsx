import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiUserPlus, FiTrash2, FiLock } from 'react-icons/fi';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../utils/authStore';
import { PageHeader, LoadingSpinner, ErrorState, Badge } from '../components/UiKit';

const ROLES = ['admin', 'analyst', 'viewer'];

const Settings = () => {
  const { user, changePassword } = useAuthStore();
  const { workspace, members, isLoading, error, fetchAll, inviteMember, updateMemberRole, removeMember } = useWorkspaceStore();
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'analyst' });
  const [lastInvite, setLastInvite] = useState(null); // { email, tempPassword }
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPw, setIsChangingPw] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchAll(); }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setIsChangingPw(true);
    const result = await changePassword(pwForm.oldPassword, pwForm.newPassword);
    setIsChangingPw(false);
    if (result.success) {
      toast.success(result.message || '✅ Password changed');
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error(result.message);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const result = await inviteMember(inviteForm);
    if (result.success) {
      toast.success(result.message || '✅ Member added');
      if (result.tempPassword) {
        setLastInvite({ email: inviteForm.email, tempPassword: result.tempPassword });
      } else {
        setLastInvite(null);
      }
      setInviteForm({ name: '', email: '', role: 'analyst' });
    } else {
      toast.error(result.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    const result = await updateMemberRole(id, role);
    if (result.success) toast.success('Role updated');
    else toast.error(result.message);
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this member from the workspace?')) return;
    const result = await removeMember(id);
    if (result.success) toast.success('Member removed');
    else toast.error(result.message);
  };

  return (
    <div>
      <PageHeader title="Workspace Settings" subtitle={workspace ? workspace.name : 'Manage your team and roles.'} />

      {/* Always available regardless of workspace load state — changing your
          own password doesn't depend on workspace/member data loading. */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4 max-w-md">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><FiLock /> Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            required
            placeholder="Current password"
            autoComplete="current-password"
            value={pwForm.oldPassword}
            onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 characters)"
            autoComplete="new-password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
          />
          <button
            type="submit"
            disabled={isChangingPw}
            className="w-full py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark disabled:opacity-50 text-white text-sm"
          >
            {isChangingPw ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {isLoading && <LoadingSpinner label="Loading workspace…" />}
      {!isLoading && error && <ErrorState message={error} />}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Members</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m._id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-slate-200 text-sm">{m.name}</p>
                    <p className="text-slate-500 text-xs">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m._id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs px-2 py-1"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <Badge color="purple">{m.role}</Badge>
                    )}
                    {isAdmin && m._id !== user._id && (
                      <button onClick={() => handleRemove(m._id)} className="text-slate-500 hover:text-red-400">
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><FiUserPlus /> Invite a teammate</h2>

              {lastInvite && (
                <div className="mb-4 p-3 rounded-lg bg-loop-purple/10 border border-loop-purple/40 text-sm">
                  <p className="text-white font-medium mb-1">Share these credentials with {lastInvite.email}:</p>
                  <p className="text-slate-300">Password: <code className="text-loop-purple font-mono">{lastInvite.tempPassword}</code></p>
                  <p className="text-slate-500 text-xs mt-1">This is shown once — it is not saved anywhere and cannot be retrieved later.</p>
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-3">
                <input
                  placeholder="Name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                />
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="submit" className="w-full py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm">
                  Add member
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
