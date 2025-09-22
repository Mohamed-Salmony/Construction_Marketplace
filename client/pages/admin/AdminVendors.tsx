import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Store, Search, Filter, Plus, Edit, Trash2, MapPin, Mail, Phone, ArrowRight, CheckCircle, Ban, Eye } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import UserAvatar from '../../components/UserAvatar';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { getPendingMerchants, getUsers as adminGetUsers, approveMerchant, suspendMerchant } from '@/services/admin';
import { successAlert, warningAlert } from '../../utils/alerts';
import { getAdminUserById, type AdminUserDetails } from '@/services/adminUsers';

import { api } from '@/lib/api';

// Normalize media URLs: if relative (e.g., /uploads/xyz.jpg), prefix with API base
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const BASE_NO_API = /\/api\/?$/.test(API_BASE) ? API_BASE.replace(/\/api\/?$/, '') : API_BASE;
const normalizeUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  // Replace Windows backslashes and trim quotes/spaces
  const s = String(u).replace(/\\/g, '/').replace(/^\s*["']|["']\s*$/g, '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  try {
    // ensure leading slash
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${BASE_NO_API}${path}`;
  } catch { return s; }
};

// Image component that falls back to authenticated fetch when direct <img> fails (e.g., protected URLs)
function ImageWithAuth({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const url = useMemo(() => normalizeUrl(src || ''), [src]);
  useEffect(() => { setErr(false); setBlobUrl(null); }, [url]);
  if (!url) return <span className="text-xs text-muted-foreground">—</span>;
  if (blobUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={blobUrl} alt={alt} className={className} />;
  }
  if (!err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} onError={async ()=>{
      try {
        const r = await api.get<Blob>(url, { auth: true, headers: { Accept: 'application/octet-stream' } as any });
        if (r.ok && r.data) {
          // api.get returns JSON by default; perform native fetch to get blob if needed
          const native = await fetch(url, { credentials: 'include' });
          if (native.ok) {
            const b = await native.blob();
            const obj = URL.createObjectURL(b);
            setBlobUrl(obj);
            return;
          }
        }
      } catch {}
      setErr(true);
    }} />;
  }
  return <a className="text-primary underline" href={url} target="_blank" rel="noreferrer">فتح الصورة</a>;
}

function LinkWithAuth({ href, children }:{ href?: string; children: React.ReactNode }){
  const url = normalizeUrl(href || '');
  if (!url) return <span className="text-xs text-muted-foreground">—</span>;
  return <a className="text-primary underline" href={url} target="_blank" rel="noreferrer">{children}</a>;
}

type VendorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'suspended';
  joinDate?: string;
  profilePicture?: string;
};

export default function AdminVendors({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(context, locale==='ar' ? 'جاري تحميل البائعين' : 'Loading vendors', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | VendorRow['status']>('all');
  const [pendingVendors, setPendingVendors] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<AdminUserDetails | null>(null);
  const [profileImgError, setProfileImgError] = useState(false);
  const [docImgError, setDocImgError] = useState(false);

  const loadVendors = useCallback(async () => {
    try {
      const res = await adminGetUsers({ role: 'Merchant' });
      if (res.ok && res.data && Array.isArray((res.data as any).items)) {
        const list = (res.data as any).items.map((u:any) => ({
          id: String(u.id),
          name: u.name || '',
          email: u.email || '',
          phone: u.phoneNumber || '',
          status: u.isActive ? 'active' : (u.isVerified ? 'active' : 'pending'),
          profilePicture: u.profilePicture || ''
        } as VendorRow));
        setRows(list);
      } else setRows([]);
    } catch { setRows([]); }
  }, []);

  const openView = async (userId: string) => {
    setViewOpen(true); setViewLoading(true); setViewError(null); setViewUser(null);
    try {
      const res = await getAdminUserById(userId);
      if (res.ok && res.data && (res.data as any).item) {
        const item = (res.data as any).item as AdminUserDetails;
        setViewUser(item);
      } else {
        setViewError('Failed to load user');
      }
    } catch (e) {
      setViewError('Failed to load user');
    }
    finally { setViewLoading(false); }
  };
  const loadPending = useCallback(async () => {
    try {
      const r = await getPendingMerchants();
      if (r.ok && r.data && Array.isArray((r.data as any).items)) setPendingVendors((r.data as any).items);
      else setPendingVendors([]);
    } catch { setPendingVendors([]); }
  }, []);

  useEffect(() => { (async () => { await Promise.all([loadVendors(), loadPending()]); hideFirstOverlay(); })(); }, [loadVendors, loadPending, hideFirstOverlay]);

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    const matches = !s || r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s);
    const statusOk = status === 'all' || r.status === status;
    return matches && statusOk;
  });

  const approveVendor = async (u: { id: string; name?: string }) => {
    try { const r = await approveMerchant(u.id); if (r.ok) { await successAlert(t('activatedSuccessfully') || 'تم التفعيل بنجاح', true); await loadPending(); await loadVendors(); } }
    catch { /* ignore */ }
  };
  const rejectVendor = async (u: { id: string; name?: string }) => {
    try { const r = await suspendMerchant(u.id); if (r.ok) { await warningAlert(t('suspendedSuccessfully') || 'تم التعليق', true); await loadPending(); await loadVendors(); } }
    catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')} className="mr-4">
              <ArrowRight className="ml-2 h-4 w-4" />
              {t('backToDashboard')}
            </Button>
          </div>
          <h1 className="mb-2">{t('manageVendorsTitle')}</h1>
          <p className="text-muted-foreground">{t('manageVendorsSubtitle')}</p>
        </div>

        {/* Pending vendor approvals from backend */}
        {pendingVendors.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center"><Store className="mr-2 h-5 w-5" />{t('pendingVendors') || 'طلبات بائعين قيد المراجعة'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingVendors.map((u:any) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                    <div className="space-y-0.5 w-full min-w-0">
                      <div className="font-medium break-words max-w-full leading-snug">{u.name}</div>
                      <div className="text-sm text-muted-foreground break-words">{u.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={()=>approveVendor(u)}><CheckCircle className="h-4 w-4 mr-1" />{t('approve') || 'موافقة'}</Button>
                      <Button size="sm" variant="outline" onClick={()=>rejectVendor(u)}><Ban className="h-4 w-4 mr-1" />{t('reject') || 'رفض'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />{t('searchAndFilter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('searchByNameOrEmail')} value={search} onChange={e=>setSearch(e.target.value)} className="pr-10" />
              </div>
              <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
                <SelectTrigger><SelectValue placeholder={t('statusLabel')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('activeStatus')}</SelectItem>
                  <SelectItem value="pending">{t('pendingStatus')}</SelectItem>
                  <SelectItem value="suspended">{t('suspendedStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Store className="mr-2 h-5 w-5" />{t('vendors')} ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse w-full min-w-0">
                    <UserAvatar 
                      src={r.profilePicture} 
                      name={r.name} 
                      size="lg"
                      className="shrink-0"
                    />
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words max-w-full leading-snug">{r.name}</h3>
                        <Badge variant={r.status==='active'?'default': r.status==='pending'? 'secondary':'destructive'}>
                          {r.status==='active'? t('activeStatus') : r.status==='pending' ? t('pendingStatus') : t('suspendedStatus')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center break-words"><Phone className="mr-1 h-3 w-3" />{r.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=>openView(r.id)}><Eye className="h-4 w-4" /></Button>
                    {r.status==='active' ? (
                      <Button size="sm" variant="outline" onClick={()=>suspendMerchant(r.id)}><Ban className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={()=>approveMerchant(r.id)}><CheckCircle className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length===0 && (
              <div className="text-center py-8 text-muted-foreground">{t('noResults')}</div>
            )}
          </CardContent>
        </Card>

        {/* Removed local add/edit vendor dialog – vendors are managed via backend only */}

        {/* View user dialog */}
        <Dialog open={viewOpen} onOpenChange={(o)=>{ setViewOpen(o); if (!o) { setProfileImgError(false); setDocImgError(false); } }}>
          <DialogContent className="w-[95vw] sm:w-[640px] md:w-[800px] lg:w-[960px] xl:w-[1024px] max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-center">
              <DialogTitle className="w-full text-center">{t('vendorDetails') || 'تفاصيل البائع'}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {viewLoading && (
                <div className="text-sm text-muted-foreground">{t('loading') || 'جارٍ التحميل...'}</div>
              )}
              {viewError && (
                <div className="text-sm text-red-600">{viewError}</div>
              )}
              {viewUser && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                {/* Left: big preview images */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Document as primary */}
                  <div>
                    <Label className="text-muted-foreground">المستند</Label>
                    <div className="mt-2 w-full h-56 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {(() => {
                        const doc = ((viewUser as any)?.documentUrl || viewUser.documentPath) as string | undefined;
                        if (!doc) return <span className="text-xs text-muted-foreground">—</span>;
                        const isImg = /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(String(doc).toLowerCase());
                        return isImg ? (
                          <ImageWithAuth src={doc} alt="document" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <LinkWithAuth href={doc}>عرض/تنزيل المستند</LinkWithAuth>
                        );
                      })()}
                    </div>
                  </div>
                  {/* License image (or any doc that is an image) */}
                  <div>
                    <Label className="text-muted-foreground">صورة الرخصة</Label>
                    <div className="mt-2 w-full h-56 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {(() => {
                        // Support multiple possible fields and arrays
                        const docsArr = (Array.isArray((viewUser as any).documents) ? (viewUser as any).documents : []) as Array<{ url?: string; path?: string }>;
                        const firstDoc = docsArr.find(d => d?.url || d?.path);
                        // Prefer explicit license image, then any image field, then doc fields
                        const raw = ( (viewUser as any)?.licenseImageUrl
                                      || viewUser.licenseImagePath
                                      || (viewUser as any)?.imageUrl
                                      || '' ) as string;
                        const url = String(raw || '').toLowerCase();
                        const isImg = /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(url);
                        if (raw && isImg) {
                          return <ImageWithAuth src={String(raw)} alt="doc" className="max-h-full max-w-full object-contain" />;
                        }
                        // If no explicit image, try first document if it's an image
                        const raw2 = ( (viewUser as any)?.documentUrl || viewUser.documentPath || firstDoc?.url || firstDoc?.path || '' ) as string;
                        const isImg2 = /("|')?\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(String(raw2));
                        if (raw2 && isImg2) {
                          return <ImageWithAuth src={String(raw2)} alt="license" className="max-h-full max-w-full object-contain" />;
                        }
                        if (raw || raw2) { return <LinkWithAuth href={String(raw || raw2)}>عرض/تنزيل</LinkWithAuth>; }
                        return <span className="text-xs text-muted-foreground">—</span>;
                      })()}
                    </div>
                    {/* If multiple documents exist, show small previews/links */}
                    {Array.isArray((viewUser as any)?.documents) && (viewUser as any).documents.length > 1 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {((viewUser as any).documents as Array<{ url?: string; path?: string }>).map((d, i) => {
                          const src = normalizeUrl(d.url || d.path || '');
                          const lower = String(d.url || d.path || '').toLowerCase();
                          const isImg = /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(lower);
                          return (
                            <div key={`doc-${i}`} className="border rounded p-1 flex items-center justify-center h-20 bg-white">
                              {src ? (
                                isImg ? (
                                  <ImageWithAuth src={src} alt={`doc-${i}`} className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <LinkWithAuth href={src}>تحميل</LinkWithAuth>
                                )
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Additional image if provided (prefer profile picture, then imageUrl) */}
                  <div>
                    <Label className="text-muted-foreground">صورة أخرى</Label>
                    <div className="mt-2 w-full h-40 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {(() => {
                        const other = (viewUser as any)?.profilePicture || (viewUser as any)?.profileImageUrl || (viewUser as any)?.imageUrl as string | undefined;
                        if (other && /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(String(other).toLowerCase())) {
                          return <ImageWithAuth src={other} alt="image" className="max-h-full max-w-full object-contain" />;
                        }
                        return other ? <LinkWithAuth href={other}>عرض/تنزيل</LinkWithAuth> : <span className="text-xs text-muted-foreground">—</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {/* Right: textual fields */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">الاسم</Label>
                    <div className="font-medium">{viewUser.name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                    <div>{viewUser.email}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الهاتف</Label>
                    <div>{viewUser.phoneNumber}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الدور</Label>
                    <div>{(() => {
                      const map: Record<string, string> = { 'Admin': 'مدير', 'Merchant': 'تاجر', 'Technician': 'فني', 'Customer': 'عميل', 'Worker': 'عامل' };
                      const roles = Array.isArray(viewUser.roles) ? viewUser.roles : [];
                      const primary = roles[0] || '';
                      return map[primary] || primary || '—';
                    })()}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">حالة الحساب</Label>
                    <div>{viewUser.isActive ? 'نشط' : 'غير نشط'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">حالة التحقق</Label>
                    <div>{viewUser.isVerified ? 'موثق' : 'غير موثق'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الشركة</Label>
                    <div>{viewUser.companyName || (viewUser as any).businessName || (viewUser as any).company || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المدينة / الدولة</Label>
                    <div>{[viewUser.city, viewUser.country].filter(Boolean).join(' / ') || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الإنضمام</Label>
                    <div>{(() => { try { return viewUser.createdAt ? new Date(viewUser.createdAt as any).toLocaleDateString('ar-SA') : '—'; } catch { return '—'; } })()}</div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">العنوان</Label>
                    <div>{
                      viewUser.address
                      || [viewUser.buildingNumber, viewUser.streetName, viewUser.city, viewUser.country].filter(Boolean).join(', ')
                      || (viewUser as any).fullAddress
                      || '—'
                    }</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">رقم ضريبي</Label>
                    <div>{viewUser.taxNumber || (viewUser as any).vatNumber || (viewUser as any).taxId || (viewUser as any).tax_no || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IBAN</Label>
                    <div dir="ltr">{viewUser.iban || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">بداية السجل</Label>
                    <div>{viewUser.registryStart || (viewUser as any).registryStartDate || (viewUser as any).commercialRegisterStart || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نهاية السجل</Label>
                    <div>{viewUser.registryEnd || (viewUser as any).registryEndDate || (viewUser as any).commercialRegisterEnd || '—'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
