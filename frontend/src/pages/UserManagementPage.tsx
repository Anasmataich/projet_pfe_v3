import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { SearchBar } from '@/components/common/SearchBar';
import { reportService } from '@/services/reportService';
import { ROLE_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import { validateEmail, validatePassword } from '@/utils/validators';
import type { User, UserFilters } from '@/types/user.types';
import type { UserRole, UserStatus } from '@/types/auth.types';
import toast from 'react-hot-toast';

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await reportService.getUsers(filters);
      setUsers(res.data);
      setTotal(res.total);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      render: (u) => (
        <div>
          <p className="text-sm font-medium text-white">
            {u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : u.email.split('@')[0]}
          </p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => <Badge variant="info">{ROLE_LABELS[u.role]}</Badge>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'warning'}>
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      render: (u) => <Badge variant={u.mfaEnabled ? 'success' : 'default'}>{u.mfaEnabled ? 'Activé' : 'Désactivé'}</Badge>,
    },
    {
      key: 'created',
      header: 'Inscription',
      render: (u) => <span className="text-xs text-slate-500">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (u) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditUser(u); }}
            className="rounded-lg p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteUser(u); }}
            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleCreate = async (data: { email: string; password: string; role: string; firstName?: string; lastName?: string }) => {
    try {
      await reportService.createUser(data);
      toast.success('Utilisateur créé');
      setCreateOpen(false);
      load();
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try {
      await reportService.updateUser(id, data);
      toast.success('Utilisateur mis à jour');
      setEditUser(null);
      load();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await reportService.deleteUser(deleteUser.id);
      toast.success('Utilisateur supprimé');
      setDeleteUser(null);
      load();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Users className="h-4.5 w-4.5 text-violet-400" />
            </div>
            Gestion des utilisateurs
          </h1>
          <p className="page-sub mt-1">{total} utilisateur(s)</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary self-start">
          <Plus className="h-4 w-4" /> Nouvel utilisateur
        </button>
      </div>

      <div className="card p-4 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar placeholder="Rechercher…" onSearch={(s) => setFilters({ ...filters, search: s, page: 1 })} />
        </div>
        <select className="select w-44" value={filters.role ?? ''} onChange={(e) => setFilters({ ...filters, role: (e.target.value as UserRole) || undefined, page: 1 })}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Table columns={columns} data={users} isLoading={isLoading} rowKey={(u) => u.id} emptyMessage="Aucun utilisateur" />

      <div className="flex justify-center">
        <Pagination page={filters.page ?? 1} total={total} limit={filters.limit ?? 20} onPageChange={(p) => setFilters({ ...filters, page: p })} />
      </div>

      {/* Create modal */}
      <UserFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} title="Nouvel utilisateur" />

      {/* Edit modal */}
      {editUser && (
        <EditUserModal user={editUser} open onClose={() => setEditUser(null)} onSubmit={(d) => handleUpdate(editUser.id, d)} />
      )}

      {/* Delete modal */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Confirmer la suppression">
        <p className="text-sm text-slate-400 mb-5">Supprimer l'utilisateur <strong className="text-white">{deleteUser?.email}</strong> ? Cette action est irréversible.</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={() => setDeleteUser(null)}>Annuler</button>
          <button className="btn-danger text-xs px-3 py-1.5 rounded-lg" onClick={handleDelete}>Supprimer</button>
        </div>
      </Modal>
    </div>
  );
}

function UserFormModal({ open, onClose, onSubmit, title }: {
  open: boolean; onClose: () => void; title: string;
  onSubmit: (data: { email: string; password: string; role: string; firstName?: string; lastName?: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('DOCUMENT_MANAGER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }

    setLoading(true);
    try {
      await onSubmit({ email, password, role, firstName: firstName || undefined, lastName: lastName || undefined });
      setEmail(''); setPassword(''); setRole('CONSULTANT'); setFirstName(''); setLastName('');
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && <p className="alert-error">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Prénom</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><label className="label">Nom</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div><label className="label">Email *</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Mot de passe *</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div>
          <label className="label">Rôle *</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {(['DOCUMENT_MANAGER', 'STANDARD_USER', 'SECURITY_OFFICER'] as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={onClose}>Annuler</button>
          <button className="btn-primary text-xs px-3 py-1.5 rounded-lg" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, open, onClose, onSubmit }: {
  user: User; open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onSubmit({ role, status, firstName: firstName || null, lastName: lastName || null });
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Modifier ${user.email}`}>
      <div className="space-y-4">
        {error && <p className="alert-error">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Prénom</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><label className="label">Nom</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Rôle</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="PENDING">En attente</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={onClose}>Annuler</button>
          <button className="btn-primary text-xs px-3 py-1.5 rounded-lg" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
