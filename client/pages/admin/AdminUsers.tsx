import React from 'react';

import { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  Ban,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import Header from '../../components/Header';
import { useTranslation } from '../../hooks/useTranslation';
import UserAvatar from '../../components/UserAvatar';
import { useEffect, useState, useCallback } from 'react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

import {
  getAdminUsers as apiGetAdminUsers,
  updateAdminUser as apiUpdateAdminUser,
  deleteAdminUser as apiDeleteAdminUser,
  setAdminUserStatus as apiSetAdminUserStatus,
  getAdminUserById as apiGetAdminUserById,
  type AdminListUser,
} from '@/services/adminUsers';

// Local UI type mapped from server AdminListUser
export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'technician' | 'admin';
  status: 'active' | 'pending' | 'suspended' | 'banned';
  location?: string;
  orders?: number;
  totalSpent?: string;
  joinDate?: string;
  profilePicture?: string;
  // New vendor fields
  registryNumber?: string;
  storeName?: string;
  taxNumber?: string;
  commercialRegistryUrl?: string;
  licenseUrl?: string;
  additionalDocumentUrl?: string;
};

export default function AdminUsers({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isArabic = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(context, isArabic ? 'جاري تحميل المستخدمين' : 'Loading users', isArabic ? 'يرجى الانتظار' : 'Please wait');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<null | string>(null); // userId when editing
  const [form, setForm] = useState<Partial<UserRow>>({
    name: '', email: '', phone: '', role: 'customer', status: 'active', location: '', orders: 0, totalSpent: '0 ر.س',
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const listLoadingRef = React.useRef(false);
  const lastListFetchRef = React.useRef(0);

  // Cache avatar URLs by user id to avoid repeated calls
  const avatarCacheRef = React.useRef<Map<string, string>>(new Map());
  const avatarPromiseCacheRef = React.useRef<Map<string, Promise<string | undefined>>>(new Map());
  const delay = (ms:number)=> new Promise(res=> setTimeout(res, ms));

  // Throttle concurrent avatar fetches across the list
  const maxAvatarConcurrency = 3;
  const avatarInFlightRef = React.useRef(0);
  const avatarWaitersRef = React.useRef<Array<() => void>>([]);
  const acquireAvatarSlot = async (): Promise<() => void> => {
    if (avatarInFlightRef.current < maxAvatarConcurrency) {
      avatarInFlightRef.current++;
      return () => {
        avatarInFlightRef.current--;
        const next = avatarWaitersRef.current.shift();
        if (next) next();
      };
    }
    return await new Promise<() => void>((resolve) => {
      avatarWaitersRef.current.push(() => {
        avatarInFlightRef.current++;
        resolve(() => {
          avatarInFlightRef.current--;
          const nxt = avatarWaitersRef.current.shift();
          if (nxt) nxt();
        });
      });
    });
  };

  // Inline avatar component that fetches details if needed
  const AvatarById: React.FC<{ id: string; name: string; size?: 'sm'|'md'|'lg'|'xl'; className?: string; initialSrc?: string }>= ({ id, name, size='lg', className, initialSrc }) => {
    const [src, setSrc] = React.useState<string | undefined>(()=> initialSrc || avatarCacheRef.current.get(id));
    React.useEffect(()=>{
      let mounted = true;
      const run = async () => {
        if (src) { return; }
        const cached = avatarCacheRef.current.get(id);
        if (cached) { setSrc(cached); return; }
        try {
          // Dedupe concurrent requests for the same id
          const runFetch = async (): Promise<string | undefined> => {
            // simple retry on 429 with backoff
            const attempts = [0, 400, 900];
            for (let i=0;i<attempts.length;i++) {
              if (attempts[i] > 0) await delay(attempts[i]);
              const r = await apiGetAdminUserById(id);
              if (r.ok && r.data && (r.data as any).item) {
                const u = (r.data as any).item as any;
                // Only accept explicit profilePicture
                const pic = u?.profilePicture ? String(u.profilePicture) : undefined;
                return pic;
              }
            }
            return undefined;
          };
          let p = avatarPromiseCacheRef.current.get(id);
          if (!p) { p = runFetch(); avatarPromiseCacheRef.current.set(id, p); }
          const pic = await p;
          if (mounted && pic) {
            avatarCacheRef.current.set(id, pic);
            setSrc(pic);
          }
        } catch {}
      };
      void run();
      return () => { mounted = false; };
    }, [id, src]);
    return (<UserAvatar src={src} name={name} size={size} className={className} />);
  };

  // Lazy wrapper: only activate AvatarById when visible
  const AvatarLazy: React.FC<{ id: string; name: string; initialSrc?: string; size?: 'sm'|'md'|'lg'|'xl'; className?: string }>= ({ id, name, initialSrc, size='lg', className }) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver((entries)=>{
        for (const e of entries) {
          if (e.isIntersecting) { setVisible(true); obs.disconnect(); break; }
        }
      }, { root: null, rootMargin: '150px', threshold: 0.01 });
      obs.observe(el);
      return () => { try { obs.disconnect(); } catch {} };
    }, []);
    return (
      <div ref={ref} className={className}>
        {visible ? (
          <AvatarById id={id} name={name} size={size} initialSrc={initialSrc} />
        ) : (
          <UserAvatar src={initialSrc} name={name} size={size} />
        )}
      </div>
    );
  };

  // Action handlers
  const handleViewUser = (user: UserRow) => {
    setSelectedUser(user);
  };
  const handleEditUser = (user: UserRow) => {
    setEditMode(user.id);
    setForm({ ...user });
    setFormOpen(true);
  };
  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      setActionLoadingId(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      const res = await apiSetAdminUserStatus(user.id, newStatus);
      if (!res.ok) { alert(isArabic ? 'فشل تحديث الحالة' : 'Failed to update status'); await reload(); }
    } finally { setActionLoadingId(null); }
  };
  const handleDeleteUser = async (user: UserRow) => {
    const msg = isArabic ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?';
    if (!confirm(msg)) return;
    try {
      setActionLoadingId(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      const res = await apiDeleteAdminUser(user.id);
      if (!res.ok) { alert(isArabic ? 'فشل حذف المستخدم' : 'Failed to delete user'); await reload(); }
    } finally { setActionLoadingId(null); }
  };

  const reload = useCallback(async () => {
    // Throttle: avoid hammering API (dev StrictMode runs effects twice)
    if (listLoadingRef.current) return;
    const now = Date.now();
    if (now - lastListFetchRef.current < 1500) return;
    listLoadingRef.current = true;
    // Map filters to API query
    const roleParam = selectedRole === 'all' ? undefined : (selectedRole === 'customer' ? 'Customer' : selectedRole === 'vendor' ? 'Merchant' : selectedRole === 'technician' ? 'Technician' : 'Admin');
    const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
    let ok = false; let data: any = null;
    try {
      const res = await apiGetAdminUsers({ role: roleParam, status: statusParam });
      ok = res.ok; data = res.data;
    } catch (e) {
      console.error('Failed to load users', e);
      ok = false;
    }
    if (ok && data && Array.isArray((data as any).items)) {
      const rows = ((data as any).items as AdminListUser[]).map((u) => {
        const primaryRole = (u.roles && u.roles[0]) ? u.roles[0] : 'Customer';
        const role: UserRow['role'] = (/admin/i.test(primaryRole) ? 'admin' : /merchant/i.test(primaryRole) ? 'vendor' : /tech|worker/i.test(primaryRole) ? 'technician' : 'customer');
        const status: UserRow['status'] = !u.isVerified ? 'pending' : (u.isActive ? 'active' : 'suspended');
        // Only trust explicit profilePicture from the API for list initial src
        const profilePic = (u as any)?.profilePicture || '';

        return {
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          phone: u.phoneNumber || '',
          role,
          status,
          location: [u.city, u.country].filter(Boolean).join(', '),
          orders: 0,
          totalSpent: '—',
          joinDate: u.createdAt || '',
          profilePicture: profilePic,
          // Add new vendor fields
          registryNumber: u.registryNumber || '',
          storeName: u.storeName || '',
          taxNumber: u.taxNumber || '',
          commercialRegistryUrl: u.commercialRegistryUrl || '',
          licenseUrl: u.licenseUrl || '',
          additionalDocumentUrl: u.additionalDocumentUrl || '',
        } as UserRow;
      });
      setUsers(rows);
    } else {
      setUsers([]);
    }
    lastListFetchRef.current = Date.now();
    listLoadingRef.current = false;
  }, [selectedRole, selectedStatus]);
  // Single effect: reload whenever filters change (reload is memoized by filters)
  useEffect(() => { (async () => { await reload(); hideFirstOverlay(); })(); }, [reload, hideFirstOverlay]);

  // Apply UI filters (role, status, search)
  const filteredUsers = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });

  // Creation is disabled; only edit is allowed
  const openEdit = (u: UserRow) => {
    setEditMode(u.id);
    setForm({ ...u });
    setFormOpen(true);
  };
  const submitForm = async () => {
    if (!form.name || !form.email || !form.phone) return;
    // Split name into first/last for server
    const parts = String(form.name).trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');
    if (!editMode) { return; }
    try {
      setActionLoadingId(editMode);
      const res = await apiUpdateAdminUser(String(editMode), {
        firstName,
        lastName,
        phoneNumber: String(form.phone),
        city: String((form.location || '').split(',')[0] || ''),
        country: String((form.location || '').split(',').slice(1).join(',').trim()),
        role: (form.role === 'customer' ? 'Customer' : form.role === 'vendor' ? 'Merchant' : form.role === 'technician' ? 'Technician' : 'Admin'),
      });
      if (!res.ok) alert('Failed to update user');
    } catch (e) {
      console.error(e);
      alert('Error updating user');
    } finally { setActionLoadingId(null); }
    setFormOpen(false);
    setEditMode(null);
    await reload();
  };
  const setStatus = async (u: UserRow, status: any) => {
    try {
      setActionLoadingId(u.id);
      // optimistic update
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status } : x));
      const res = await apiSetAdminUserStatus(u.id, status);
      if (!res.ok) alert('Failed to update status');
    } catch (e) { console.error(e); alert('Error updating status'); await reload(); }
    finally { setActionLoadingId(null); }
  };
  const removeUser = async (u: UserRow) => {
    if (!confirm('Delete this user?')) return;
    try {
      setActionLoadingId(u.id);
      // optimistic remove
      setUsers(prev => prev.filter(x => x.id !== u.id));
      const res = await apiDeleteAdminUser(u.id);
      if (!res.ok) alert('Failed to delete user');
    } catch (e) { console.error(e); alert('Error deleting user'); await reload(); }
    finally { setActionLoadingId(null); }
  };

  const getRoleText = (role: string) => {
    switch(role) {
      case 'customer': return t('customerRole');
      case 'vendor': return t('vendorRole');
      case 'technician': return t('technicianRole');
      case 'admin': return t('adminRole');
      default: return role;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return t('activeStatus');
      case 'pending': return t('pendingStatus');
      case 'suspended': return t('suspendedStatus');
      case 'banned': return t('bannedStatus');
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'suspended': return 'destructive';
      case 'banned': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">{t('manageUsersTitle')}</h1>
          <p className="text-muted-foreground">{t('manageUsersSubtitle')}</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              {t('searchAndFilter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchByNameOrEmail')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t('userType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="customer">{t('customerRole')}</SelectItem>
                  <SelectItem value="vendor">{t('vendorRole')}</SelectItem>
                  <SelectItem value="technician">{t('technicianRole')}</SelectItem>
                  <SelectItem value="admin">{t('adminRole')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('statusLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('activeStatus')}</SelectItem>
                  <SelectItem value="pending">{t('pendingStatus')}</SelectItem>
                  <SelectItem value="suspended">{t('suspendedStatus')}</SelectItem>
                  <SelectItem value="banned">{t('bannedStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Centralized User Details Dialog */}
        <Dialog open={selectedUser !== null} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle>{t('userDetails')}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <AvatarById id={selectedUser.id} name={selectedUser.name} size="xl" initialSrc={selectedUser.profilePicture} />
                  <div>
                    <h3 className="font-medium">{selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <Badge variant={getStatusVariant(selectedUser.status)}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">{t('userType')}</Label>
                    <p>{getRoleText(selectedUser.role)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('phoneNumber')}</Label>
                    <p>{selectedUser.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('locationLabel')}</Label>
                    <p>{selectedUser.location}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('joinDate')}</Label>
                    <p>{selectedUser.joinDate}</p>
                  </div>
                </div>
                <div className="flex space-x-2 space-x-reverse pt-4">
                  <Button size="sm" className="flex-1" onClick={() => { if (selectedUser) { setSelectedUser(null); handleEditUser(selectedUser); } }}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('editAction')}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (selectedUser) { handleToggleStatus(selectedUser); } }}>
                    {selectedUser.status === 'active' ? (
                      <>
                        <Ban className="mr-2 h-4 w-4" />{t('suspendAction')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />{t('activateAction')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {t('usersList')} ({filteredUsers.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse w-full min-w-0">
                    <AvatarLazy id={user.id} name={user.name} size="lg" className="shrink-0" initialSrc={user.profilePicture} />
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words max-w-full leading-snug">{user.name}</h3>
                        <Badge variant={getStatusVariant(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center break-words min-w-0">
                          <Mail className="mr-1 h-3 w-3" />
                          <span className="break-words">{user.email}</span>
                        </div>
                        <div className="flex items-center break-words min-w-0">
                          <Phone className="mr-1 h-3 w-3" />
                          <span className="break-words">{user.phone}</span>
                        </div>
                        <div className="flex items-center break-words min-w-0">
                          <MapPin className="mr-1 h-3 w-3" />
                          <span className="break-words">{user.location}</span>
                        </div>
                        <span className="break-words">{t('ordersCountLabel')}: {user.orders}</span>
                        <span className="break-words">{t('totalSpentLabel')}: {user.totalSpent}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      title={t('viewDetails')}
                      aria-label={t('viewDetails')}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewUser(user); }}
                      disabled={actionLoadingId === user.id}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" title={t('editAction')} aria-label={t('editAction')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditUser(user); }} disabled={actionLoadingId === user.id}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.status === 'active' ? (
                      <Button size="sm" variant="outline" title={t('suspendAction')} aria-label={t('suspendAction')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleStatus(user); }} disabled={actionLoadingId === user.id}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" title={t('activateAction')} aria-label={t('activateAction')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleStatus(user); }} disabled={actionLoadingId === user.id}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" title={t('delete')} aria-label={t('delete')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteUser(user); }} disabled={actionLoadingId === user.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">{t('noResults')}</h3>
                <p className="text-muted-foreground">{t('noUsersFoundWithCriteria')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditMode(null); }}>
          <DialogContent className="w-[95vw] sm:w-[640px] md:w-[800px] lg:w-[960px] xl:w-[1024px] max-w-none max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader className="text-center">
              <DialogTitle className="w-full text-center">{t('editUser')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('fullName')}</Label>
                <Input value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>{t('email')}</Label>
                <Input type="email" value={form.email || ''} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>{t('phoneNumber')}</Label>
                <Input value={form.phone || ''} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>{t('locationLabel')}</Label>
                <Input value={form.location || ''} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <Label>{t('userType')}</Label>
                <Select value={(form.role as string) || 'customer'} onValueChange={(v) => setForm(f => ({ ...f, role: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">{t('customerRole')}</SelectItem>
                    <SelectItem value="vendor">{t('vendorRole')}</SelectItem>
                    <SelectItem value="technician">{t('technicianRole')}</SelectItem>
                    <SelectItem value="admin">{t('adminRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('statusLabel')}</Label>
                <Select value={(form.status as string) || 'active'} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('activeStatus')}</SelectItem>
                    <SelectItem value="pending">{t('pendingStatus')}</SelectItem>
                    <SelectItem value="suspended">{t('suspendedStatus')}</SelectItem>
                    <SelectItem value="banned">{t('bannedStatus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ordersCountLabel')}</Label>
                <Input type="number" value={Number(form.orders || 0)} onChange={(e) => setForm(f => ({ ...f, orders: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>{t('totalSpentLabel')}</Label>
                <Input value={form.totalSpent || '0 ر.س'} onChange={(e) => setForm(f => ({ ...f, totalSpent: e.target.value }))} />
              </div>
              {/* Vendor-specific fields */}
              {form.role === 'vendor' && (
                <>
                  <div>
                    <Label>{isArabic ? 'رقم السجل التجاري' : 'Registry Number'}</Label>
                    <Input value={form.registryNumber || ''} onChange={(e) => setForm(f => ({ ...f, registryNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{isArabic ? 'اسم المتجر' : 'Store Name'}</Label>
                    <Input value={form.storeName || ''} onChange={(e) => setForm(f => ({ ...f, storeName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{isArabic ? 'الرقم الضريبي' : 'Tax Number'}</Label>
                    <Input value={form.taxNumber || ''} onChange={(e) => setForm(f => ({ ...f, taxNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{isArabic ? 'السجل التجاري' : 'Commercial Registry'}</Label>
                    <Input value={form.commercialRegistryUrl || ''} readOnly className="bg-muted" placeholder={isArabic ? 'رابط الملف' : 'File URL'} />
                  </div>
                  <div>
                    <Label>{isArabic ? 'الرخصة' : 'License'}</Label>
                    <Input value={form.licenseUrl || ''} readOnly className="bg-muted" placeholder={isArabic ? 'رابط الملف' : 'File URL'} />
                  </div>
                  <div>
                    <Label>{isArabic ? 'مستند إضافي' : 'Additional Document'}</Label>
                    <Input value={form.additionalDocumentUrl || ''} readOnly className="bg-muted" placeholder={isArabic ? 'رابط الملف' : 'File URL'} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setFormOpen(false); setEditMode(null); }}>
                {t('cancel')}
              </Button>
              <Button onClick={submitForm}>
                {t('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}