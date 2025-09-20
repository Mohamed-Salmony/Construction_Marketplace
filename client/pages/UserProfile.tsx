import React, { useState, useRef, useCallback } from 'react';

import { User, Edit, Save, X, MapPin, Mail, CreditCard, Shield, Package, Heart, History, Phone, Calendar, Camera } from 'lucide-react';
import Swal from 'sweetalert2';
import { toastSuccess, toastError, toastInfo } from '../utils/alerts';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { RouteContext, User as RouterUser } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import Image from 'next/image';

// Remove authMock usage; simple local validator
import { getProfile, updateProfile, changePassword as apiChangePassword, deleteAccount as apiDeleteAccount } from '@/services/auth';
import { api } from '@/lib/api';
const validatePasswordMin = (pwd: string, min: number) => typeof pwd === 'string' && pwd.length >= min;
import { getTechnicianOffers, updateOffer as apiUpdateOffer, deleteOffer as apiDeleteOffer } from '@/services/offers';
import { listMyOrders, cancelOrder as apiCancelOrder, confirmDelivered as apiConfirmDelivered, type OrderDto } from '@/services/orders';
import { getAddresses as apiGetAddresses, createAddress as apiCreateAddress, updateAddress as apiUpdateAddress, deleteAddress as apiDeleteAddress, makeDefaultAddress as apiMakeDefaultAddress } from '@/services/addresses';

// Local types for profile data
type OrderStatus = 'delivered' | 'shipped' | 'processing';
interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: number;
  statusText: string;
}
interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  address: string;
  phone: string;
  isDefault: boolean;
}

// Local user view-model used in this page
interface ProfileUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  avatar?: string;
  role?: 'admin' | 'vendor' | 'technician' | 'customer' | string;
  technicianType?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  // Extended fields from backend UserDto
  phoneSecondary?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  buildingNumber?: string;
  streetName?: string;
  companyName?: string;
  taxNumber?: string;
  iban?: string;
  registryStart?: string;
  registryEnd?: string;
  isVerified?: boolean;
  // License image URL from backend profile (display-only preview)
  licenseImageUrl?: string;
}

interface UserProfileProps extends RouteContext {
  // Add any additional props specific to UserProfile
}

// Orders now come from backend
const seedOrders: Order[] = [];

// Addresses now come from backend
const seedAddresses: Address[] = [];

 

export default function UserProfile({ user, setUser, setCurrentPage, wishlistItems, removeFromWishlist, addToCart }: UserProfileProps) {
  const { t, locale } = useTranslation();
  const isTechnician = ((user as any)?.role === 'technician' || (user as any)?.role === 'worker');
  const technicianId = (user as any)?.id || null;
  const [isEditing, setIsEditing] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const licenseFileRef = useRef<HTMLInputElement | null>(null);
  const [editedUser, setEditedUser] = useState<ProfileUser>(() => {
    if (user) {
      const u: any = user;
      const emailName = typeof u.email === 'string' && u.email.includes('@') ? u.email.split('@')[0] : '';
      const nameSrc = String(u.name || emailName || '').trim();
      const parts = nameSrc.split(/\s+/).filter(Boolean);
      return {
        id: String(u.id ?? '1'),
        name: nameSrc,
        email: typeof u.email === 'string' ? u.email : '',
        phone: typeof u.phone === 'string' ? u.phone : '',
        birthdate: '',
        avatar: typeof u.avatar === 'string' ? u.avatar : '',
        role: (u.role as any) ?? 'customer',
        technicianType: typeof u.technicianType === 'string' ? u.technicianType : '',
        firstName: parts[0] || '',
        middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
        lastName: parts.length >= 2 ? parts[parts.length - 1] : '',
        phoneSecondary: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        buildingNumber: '',
        streetName: '',
        companyName: '',
        taxNumber: '',
        iban: '',
        registryStart: '',
        registryEnd: '',
        isVerified: undefined,
      } as ProfileUser;
    }
    return { id: '1', name: '', email: '', phone: '', birthdate: '', avatar: '', role: 'customer', technicianType: '' } as ProfileUser;
  });

  const handleAvatarFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const up = await api.uploadFile(file, 'avatars');
      if (up.ok && up.data && (up.data as any).url) {
        const url = String((up.data as any).url);
        setEditedUser((prev) => ({ ...prev, avatar: url }));
        // Persist immediately to backend so it remains after reload
        try {
          await updateProfile({ profilePicture: url } as any);
          // Optionally refresh canonical profile
          try {
            const res = await getProfile();
            if (res.ok && res.data) {
              const d: any = res.data;
              setEditedUser((prev)=> ({ ...prev, avatar: d.profilePicture || d.imageUrl || url }));
              // sync Router user as well
              setUser?.({ ...(user as any), id: String(d.id || (user as any)?.id || ''), name: String(d.name || (user as any)?.name || ''), email: String(d.email || (user as any)?.email || ''), role: (user as any)?.role || 'customer', avatar: d.profilePicture || d.imageUrl || url } as any);
            }
          } catch {}
          toastSuccess('تم تحديث الصورة', true);
        } catch {
          // If backend save failed, keep local preview but inform user
          toastError('تم رفع الصورة لكن تعذر الحفظ، حاول مرة أخرى من حفظ الملف', true);
        }
      } else {
        toastError('تعذر رفع الصورة', true);
      }
    } catch {
      toastError('تعذر رفع الصورة', true);
    } finally {
      try { if (avatarFileRef.current) avatarFileRef.current.value = ''; } catch {}
    }
  };

  const handleLicenseFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const up = await api.uploadFile(file, 'licenses');
      if (up.ok && up.data && (up.data as any).url) {
        setEditedUser((prev) => ({ ...prev, licenseImageUrl: String((up.data as any).url) }));
        toastSuccess(locale==='en'?'License image uploaded':'تم رفع صورة الرخصة', locale==='ar');
      } else {
        toastError(locale==='en'?'Failed to upload license image':'تعذر رفع صورة الرخصة', locale==='ar');
      }
    } catch {
      toastError(locale==='en'?'Failed to upload license image':'تعذر رفع صورة الرخصة', locale==='ar');
    } finally {
      try { if (licenseFileRef.current) licenseFileRef.current.value = ''; } catch {}
    }
  };

  // Fetch profile from backend on mount (if token/session available); fallback remains local
  // We do a best-effort fetch; failure just keeps current local state
  React.useEffect(() => {

    let cancelled = false;
    const load = async () => {
      try {
        const { ok, data } = await getProfile();
        if (ok && data && !cancelled) {
          const roleMap: Record<string, string> = { Admin:'admin', Merchant:'vendor', Technician:'technician', Customer:'customer', Worker:'technician' };
          const uiRole = roleMap[String(data.role||'')] || String((user as any)?.role || 'customer');
          const first = (data as any)?.firstName || '';
          const mid = (data as any)?.middleName || '';
          const last = (data as any)?.lastName || '';
          const email = (data as any)?.email || '';
          const emailName = typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '';
          const fullName = (data as any)?.name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim() || emailName;
          // Normalize phone and birthdate for UI
          const phoneVal = ((): string => {
            const p = (data as any)?.phoneNumber ?? (data as any)?.phone;
            return typeof p === 'string' ? p : '';
          })();
          const birthRaw = (data as any)?.dateOfBirth ?? (data as any)?.birthdate;
          const birthStr = ((): string => {
            if (!birthRaw) return '';
            const raw = String(birthRaw);
            // Treat MinValue or invalid as empty
            if (raw.startsWith('0001-01-01')) return '';
            // If already in 'YYYY-MM-DD' or ISO, extract date part safely
            const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
            if (m) return m[1];
            try {
              const d = new Date(raw);
              if (isNaN(d.getTime())) return '';
              const y = d.getUTCFullYear();
              const mm = String(d.getUTCMonth()+1).padStart(2,'0');
              const dd = String(d.getUTCDate()).padStart(2,'0');
              return `${y}-${mm}-${dd}`;
            } catch { return ''; }
          })();
          // Derive worker/technician address fields with sensible fallbacks
          const addrFromParts = (() => {
            const b = (data as any)?.buildingNumber || '';
            const s = (data as any)?.streetName || '';
            const c = (data as any)?.city || '';
            const parts = [b, s].filter(Boolean).join(' ');
            return parts || '';
          })();
          const merged: ProfileUser = {
            id: String(data.id ?? (user as any)?.id ?? '1'),
            name: String(fullName || (user as any)?.name || ''),
            email: typeof data.email === 'string' ? data.email : (user as any)?.email,
            phone: phoneVal,
            birthdate: birthStr,
            // Use saved avatar from backend if available
            avatar: (data as any)?.profilePicture || (data as any)?.imageUrl || '',
            role: uiRole,
            technicianType: (data as any)?.profession || (user as any)?.technicianType || '',
            firstName: first,
            middleName: mid,
            lastName: last,
            phoneSecondary: (data as any)?.phoneSecondary || '',
            address: (data as any)?.address || addrFromParts,
            city: (data as any)?.city || (data as any)?.cityName || '',
            country: (data as any)?.country || '',
            postalCode: (data as any)?.postalCode || '',
            buildingNumber: (data as any)?.buildingNumber || '',
            streetName: (data as any)?.streetName || '',
            companyName: (data as any)?.companyName || '',
            taxNumber: (data as any)?.taxNumber || '',
            iban: (data as any)?.iban || '',
            registryStart: (data as any)?.registryStart || '',
            registryEnd: (data as any)?.registryEnd || '',
            isVerified: Boolean((data as any)?.isVerified),
            licenseImageUrl: (data as any)?.licenseImageUrl || '',
          };
          setEditedUser(merged);
          // sync Router user as well
          setUser?.({ id: merged.id, name: merged.name, email: merged.email || '', role: uiRole } as any);
          // No localStorage persistence needed; Router handles session separately
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, [setUser, user]);

  // LocalStorage helpers for per-user data (orders only; addresses are backend)
  const addrKey = '';
  const orderKey = '';

  // Normalizers to coerce LS/backend data safely to typed structs
  const normalizeOrders = (raw: any): Order[] => {
    if (!Array.isArray(raw)) return seedOrders;
    const ok: OrderStatus[] = ['delivered','shipped','processing'];
    return raw.map((o: any): Order => ({
      id: String(o?.id ?? Date.now()),
      date: String(o?.date ?? ''),
      status: (ok.includes(o?.status) ? (o.status as OrderStatus) : ('processing' as OrderStatus)),
      total: Number(o?.total ?? 0),
      items: Number(o?.items ?? 0),
      statusText: typeof o?.statusText === 'string' ? o.statusText : ''
    }));
  };
  const normalizeAddresses = (raw: any): Address[] => {
    if (!Array.isArray(raw)) return seedAddresses;
    const types = ['home','work','other'] as const;
    return raw.map((a: any): Address => ({
      id: String(a?.id ?? Date.now()),
      type: types.includes(a?.type) ? a.type : 'home',
      name: String(a?.name ?? ''),
      address: String(a?.fullAddress ?? a?.address ?? ''),
      phone: String(a?.phone ?? ''),
      isDefault: Boolean(a?.isDefault)
    }));
  };

  // Orders and addresses state
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses);

  // Load addresses from backend when user changes
  React.useEffect(() => {
    (async () => {
      if (!user) { setAddresses([]); return; }
      try {
        const { ok, data } = await apiGetAddresses();
        if (ok && Array.isArray(data)) setAddresses(normalizeAddresses(data));
        else setAddresses([]);
      } catch { setAddresses([]); }
    })();
  }, [user]);

  // Persist on changes (when user exists)
  const persistOrders = (next: typeof orders) => { setOrders(next); };
  const persistAddresses = (next: typeof addresses) => { setAddresses(next); };

  // Load orders from backend
  React.useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await listMyOrders();
        if (ok && Array.isArray(data)) {
          const mapped: Order[] = (data as OrderDto[]).map((o) => ({
            id: String(o.id),
            date: String(o.createdAt || ''),
            status: (String(o.status||'processing').toLowerCase() as OrderStatus) || 'processing',
            total: Number(o.total||0),
            items: Number(o.itemsCount||0),
            statusText: String(o.status||'')
          }));
          setOrders(mapped);
        } else {
          setOrders([]);
        }
      } catch { setOrders([]); }
    })();
  }, [user]);

  // Save profile handler (missing)
  const handleSave = async () => {
    const combinedName = [editedUser.firstName, editedUser.middleName, editedUser.lastName]
      .filter(Boolean).join(' ').trim() || (editedUser.name || '');
    // Normalize date -> 'YYYY-MM-DDT00:00:00'
    const dobIso = (() => {
      const v = editedUser.birthdate?.trim();
      if (!v) return undefined;
      try {
        const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
        const datePart = m ? m[1] : v;
        return `${datePart}T00:00:00`;
      } catch { return v; }
    })();

    const newUser: RouterUser = {
      id: String(editedUser.id),
      name: combinedName,
      email: editedUser.email || '',
      role: (editedUser.role as any) || 'customer',
      avatar: editedUser.avatar,
      phone: editedUser.phone,
    };

    try {
      await updateProfile({
        firstName: editedUser.firstName || undefined,
        middleName: editedUser.middleName || undefined,
        lastName: editedUser.lastName || undefined,
        phoneNumber: newUser.phone || undefined,
        address: editedUser.address || undefined,
        city: editedUser.city || undefined,
        country: editedUser.country || undefined,
        postalCode: editedUser.postalCode || undefined,
        buildingNumber: editedUser.buildingNumber || undefined,
        streetName: editedUser.streetName || undefined,
        companyName: editedUser.companyName || undefined,
        dateOfBirth: dobIso,
        iban: editedUser.iban || undefined,
        profession: editedUser.technicianType || undefined,
        profilePicture: (editedUser.avatar || '').trim() || undefined,
        taxNumber: editedUser.taxNumber || undefined,
        registryStart: editedUser.registryStart || undefined,
        registryEnd: editedUser.registryEnd || undefined,
        phoneSecondary: editedUser.phoneSecondary || undefined,
        licenseImageUrl: editedUser.licenseImageUrl || undefined,
      } as any);

      // Refresh canonical profile
      try {
        const res = await getProfile();
        if (res.ok && res.data) {
          const d: any = res.data;
          const first = d.firstName || '';
          const mid = d.middleName || '';
          const last = d.lastName || '';
          const email = d.email || '';
          const emailName = typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '';
          const fullName = d.name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim() || emailName;
          const birthRaw = d.dateOfBirth || d.birthdate;
          const birthStr = (()=>{ if(!birthRaw) return ''; const m = String(birthRaw).match(/^(\d{4}-\d{2}-\d{2})/); return m? m[1]:''; })();
          setEditedUser((prev) => ({
            ...prev,
            name: String(fullName || prev.name || ''),
            firstName: first,
            middleName: mid,
            lastName: last,
            email: d.email || prev.email,
            phone: d.phoneNumber || d.phone || prev.phone,
            birthdate: birthStr,
            address: d.address || prev.address || '',
            city: d.city || prev.city || '',
            country: d.country || prev.country || '',
            postalCode: d.postalCode || prev.postalCode || '',
            buildingNumber: d.buildingNumber || prev.buildingNumber || '',
            streetName: d.streetName || prev.streetName || '',
            companyName: d.companyName || prev.companyName || '',
            iban: d.iban || prev.iban || '',
            avatar: d.profilePicture || d.imageUrl || prev.avatar || '',
          }));
      }
      } catch {}
      toastSuccess(locale==='en'? 'Profile saved':'تم حفظ الملف', locale==='ar');
    } catch { /* ignore */ }

    setUser?.(newUser);
    setIsEditing(false);
  };

  // Technician offers (wired to backend)
  type TechOffer = {
    id: number;
    technicianId: string;
    targetType: 'service' | 'project';
    serviceId?: number;
    projectId?: number;
    price: number;
    days: number;
    message?: string;
    status?: string;
    createdAt?: string;
  };
  const [techOffers, setTechOffers] = useState<TechOffer[]>([]);
  const refreshOffers = useCallback(async () => {
    try {
      if (!technicianId) { setTechOffers([]); return; }
      const { ok, data } = await getTechnicianOffers(String(technicianId));
      if (ok && Array.isArray(data)) setTechOffers(data as any);
      else setTechOffers([]);
    } catch { setTechOffers([]); }
  }, [technicianId]);
  React.useEffect(() => { void refreshOffers(); }, [technicianId, refreshOffers]);
  // Service lookup for labels
  const [servicesLookup] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('user_services');
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return {};
      return list.reduce((acc: any, s: any) => { acc[String(s.id)] = s; return acc; }, {} as Record<string, any>);
    } catch { return {}; }
  });

  const editOffer = async (id: number) => {
    const o = techOffers.find(x=>x.id===id); if (!o) return;
    const html = `
      <div class="space-y-2 text-right">
        <input id="offer_price" type="number" class="swal2-input" value="${o.price}" placeholder="${locale==='en'?'Price':'السعر'}" />
        <input id="offer_days" type="number" class="swal2-input" value="${o.days}" placeholder="${locale==='en'?'Days':'الأيام'}" />
        <input id="offer_msg" class="swal2-input" value="${o.message||''}" placeholder="${locale==='en'?'Message':'رسالة'}" />
      </div>`;
    const res = await Swal.fire({
      title: locale==='en'? 'Edit Offer' : 'تعديل العرض',
      html,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: locale==='en'? 'Save' : 'حفظ',
      cancelButtonText: locale==='en'? 'Cancel' : 'إلغاء',
      preConfirm: () => {
        const price = Number((document.getElementById('offer_price') as HTMLInputElement)?.value || '');
        const days = Number((document.getElementById('offer_days') as HTMLInputElement)?.value || '');
        const message = (document.getElementById('offer_msg') as HTMLInputElement)?.value || '';
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(days) || days < 1) {
          Swal.showValidationMessage(locale==='en'? 'Enter valid price and days' : 'أدخل سعراً وأياماً صالحين');
          return null as any;
        }
        return { price, days, message } as any;
      }
    }) as any;
    if (!res.value) return;
    try {
      await apiUpdateOffer(id, { targetType: o.targetType, serviceId: o.serviceId, projectId: o.projectId, price: res.value.price, days: res.value.days, message: res.value.message });
      await refreshOffers();
    } catch {}
    toastSuccess(locale==='en'? 'Offer updated' : 'تم تحديث العرض', locale==='ar');
  };

  const deleteOffer = async (id: number) => {
    const go = await Swal.fire({ title: locale==='en'? 'Delete offer?' : 'حذف العرض؟', icon: 'warning', showCancelButton: true, confirmButtonText: locale==='en'? 'Delete' : 'حذف', cancelButtonText: locale==='en'? 'Cancel' : 'إلغاء' });
    if (!go.isConfirmed) return;
    try { await apiDeleteOffer(id); } catch {}
    await refreshOffers();
    toastSuccess(locale==='en'? 'Deleted' : 'تم الحذف', locale==='ar');
  };

  // ...

  const addAddress = async () => {
    const html = `
      <div class="space-y-2 text-right">
        <input id="addr_name" class="swal2-input" placeholder="${locale==='en'?'Name':'الاسم'}" />
        <input id="addr_address" class="swal2-input" placeholder="${locale==='en'?'Address':'العنوان'}" />
        <input id="addr_phone" class="swal2-input" placeholder="${locale==='en'?'Phone':'الهاتف'}" />
      </div>`;
    const res = await Swal.fire({
      title: locale==='en'?'Add New Address':'إضافة عنوان جديد',
      html,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: locale==='en'?'Save':'حفظ',
      cancelButtonText: locale==='en'?'Cancel':'إلغاء',
      preConfirm: () => {
        const name = (document.getElementById('addr_name') as HTMLInputElement)?.value?.trim();
        const address = (document.getElementById('addr_address') as HTMLInputElement)?.value?.trim();
        const phone = (document.getElementById('addr_phone') as HTMLInputElement)?.value?.trim();
        if (!name || !address || !phone) {
          Swal.showValidationMessage(locale==='en'?'All fields are required':'كل الحقول مطلوبة');
          return null as any;
        }
        return { name, address, phone };
      }
    }) as any;
    if (!res.value) return;
    try {
      const r = await apiCreateAddress({ name: res.value.name, fullAddress: res.value.address, phone: res.value.phone });
      if (!r.ok) throw new Error('create failed');
      const all = await apiGetAddresses();
      if (all.ok && Array.isArray(all.data)) setAddresses(normalizeAddresses(all.data));
      toastSuccess(locale==='en'?'Address added':'تمت إضافة العنوان', locale==='ar');
    } catch {
      toastError(locale==='en'?'Failed to add address':'فشل إضافة العنوان', locale==='ar');
    }
  };

  const editAddress = async (id: string) => {
    const a = addresses.find(x=>x.id===id); if (!a) return;
    const html = `
      <div class="space-y-2 text-right">
        <input id="addr_name" class="swal2-input" value="${a.name}" />
        <input id="addr_address" class="swal2-input" value="${a.address}" />
        <input id="addr_phone" class="swal2-input" value="${a.phone}" />
      </div>`;
    const res = await Swal.fire({
      title: locale==='en'?'Edit Address':'تعديل العنوان',
      html,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: locale==='en'?'Save':'حفظ',
      cancelButtonText: locale==='en'?'Cancel':'إلغاء',
      preConfirm: () => {
        const name = (document.getElementById('addr_name') as HTMLInputElement)?.value?.trim();
        const address = (document.getElementById('addr_address') as HTMLInputElement)?.value?.trim();
        const phone = (document.getElementById('addr_phone') as HTMLInputElement)?.value?.trim();
        if (!name || !address || !phone) { Swal.showValidationMessage(locale==='en'?'All fields are required':'كل الحقول مطلوبة'); return null as any; }
        return { name, address, phone };
      }
    }) as any;
    if (!res.value) return;
    try {
      await apiUpdateAddress(Number(id), { name: res.value.name, fullAddress: res.value.address, phone: res.value.phone });
      const all = await apiGetAddresses();
      if (all.ok && Array.isArray(all.data)) setAddresses(normalizeAddresses(all.data));
      toastSuccess(locale==='en'?'Address updated':'تم تحديث العنوان', locale==='ar');
    } catch {
      toastError(locale==='en'?'Failed to update address':'فشل تحديث العنوان', locale==='ar');
    }
  };

  const deleteAddress = async (id: string) => {
    const go = await Swal.fire({ title: locale==='en'?'Delete address?':'حذف العنوان؟', icon: 'warning', showCancelButton: true, confirmButtonText: locale==='en'?'Delete':'حذف', cancelButtonText: locale==='en'?'Cancel':'إلغاء' });
    if (!go.isConfirmed) return;
    try {
      await apiDeleteAddress(Number(id));
      const all = await apiGetAddresses();
      if (all.ok && Array.isArray(all.data)) setAddresses(normalizeAddresses(all.data));
      toastSuccess(locale==='en'?'Deleted':'تم الحذف', locale==='ar');
    } catch {
      toastError(locale==='en'?'Failed to delete address':'فشل حذف العنوان', locale==='ar');
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      await apiMakeDefaultAddress(Number(id));
      const all = await apiGetAddresses();
      if (all.ok && Array.isArray(all.data)) setAddresses(normalizeAddresses(all.data));
    } catch { toastError(locale==='en'?'Failed to set default address':'فشل ضبط العنوان الافتراضي', locale==='ar'); }
  };

  // ...

  const cancelOrder = async (id: string) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    if (o.status !== 'processing') { toastInfo(locale==='en'?'Only processing orders can be cancelled':'يمكن إلغاء الطلبات قيد المعالجة فقط', locale==='ar'); return; }
    const go = await Swal.fire({ title: locale==='en'?'Cancel order?':'إلغاء الطلب؟', icon: 'warning', showCancelButton: true, confirmButtonText: locale==='en'?'Cancel Order':'إلغاء الطلب', cancelButtonText: locale==='en'?'Back':'رجوع' });
    if (!go.isConfirmed) return;
    try { await apiCancelOrder(id); } catch {}
    try { const r = await listMyOrders(); if (r.ok && Array.isArray(r.data)) { const mapped = (r.data as OrderDto[]).map((o) => ({ id: String(o.id), date: String(o.createdAt||''), status: (String(o.status||'processing').toLowerCase() as OrderStatus), total: Number(o.total||0), items: Number(o.itemsCount||0), statusText: String(o.status||'') })); setOrders(mapped); } }
    catch {}
  };

  const confirmDelivered = async (id: string) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    if (o.status === 'delivered') return;
    try { await apiConfirmDelivered(id); } catch {}
    try { const r = await listMyOrders(); if (r.ok && Array.isArray(r.data)) { const mapped = (r.data as OrderDto[]).map((o) => ({ id: String(o.id), date: String(o.createdAt||''), status: (String(o.status||'processing').toLowerCase() as OrderStatus), total: Number(o.total||0), items: Number(o.itemsCount||0), statusText: String(o.status||'') })); setOrders(mapped); } }
    catch {}
  };

  const handleChangePassword = async () => {
    if (!user) { toastError(locale === 'en' ? 'You must be logged in' : 'يجب تسجيل الدخول', locale==='ar'); return; }
    const html = `
      <div class="space-y-3 text-right">
        <input id="pwd_current" type="password" class="swal2-input" placeholder="${locale==='en'?'Current password':'كلمة المرور الحالية'}" />
        <input id="pwd_new" type="password" class="swal2-input" placeholder="${locale==='en'?'New password (min 6)':'كلمة مرور جديدة (حد أدنى 6)'}" />
        <input id="pwd_confirm" type="password" class="swal2-input" placeholder="${locale==='en'?'Confirm new password':'تأكيد كلمة المرور الجديدة'}" />
      </div>`;
    const res = await Swal.fire({
      title: locale === 'en' ? 'Change Password' : 'تغيير كلمة المرور',
      html,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: locale === 'en' ? 'Save' : 'حفظ',
      cancelButtonText: locale === 'en' ? 'Cancel' : 'إلغاء',
      preConfirm: () => {
        const current = (document.getElementById('pwd_current') as HTMLInputElement)?.value || '';
        const next = (document.getElementById('pwd_new') as HTMLInputElement)?.value || '';
        const confirm = (document.getElementById('pwd_confirm') as HTMLInputElement)?.value || '';
        if (!current || !next || !confirm) {
          Swal.showValidationMessage(locale==='en'?'All fields are required':'كل الحقول مطلوبة');
          return null as any;
        }
        if (!validatePasswordMin(next, 6)) {
          Swal.showValidationMessage(locale==='en'?'Password must be at least 6 characters':'يجب أن تكون كلمة المرور 6 أحرف على الأقل');
          return null as any;
        }
        if (next !== confirm) {
          Swal.showValidationMessage(locale==='en'?'New password and confirmation do not match':'كلمة المرور الجديدة وتأكيدها غير متطابقين');
          return null as any;
        }
        return { current, next } as any;
      }
    }) as any;
    if (!res.value) return;
    const { current, next } = res.value as { current: string; next: string };
    // Try backend change; fallback to local mock if needed
    try {
      const r = await apiChangePassword(current, next);
      if (!r.ok) throw new Error('change-password failed');
      toastSuccess(locale === 'en' ? 'Password updated' : 'تم تحديث كلمة المرور', locale==='ar');
      return;
    } catch {
      toastError(locale==='en'?'Failed to change password':'فشل تغيير كلمة المرور', locale==='ar');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const res = await Swal.fire({
      title: locale === 'en' ? 'Delete Account?' : 'حذف الحساب؟',
      text: locale === 'en' ? 'This action cannot be undone' : 'لا يمكن التراجع عن هذا الإجراء',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: locale === 'en' ? 'Delete' : 'حذف',
      cancelButtonText: locale === 'en' ? 'Cancel' : 'إلغاء'
    });
    if (!res.isConfirmed) return;
    try {
      // Call backend to delete the authenticated account
      const r = await apiDeleteAccount();
      if (!r.ok) throw new Error('delete account failed');
      // Clear tokens/cookies best-effort
      try {
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; max-age=0';
      } catch {}
      setUser?.(null as any);
      setCurrentPage?.('home');
      toastSuccess(locale === 'en' ? 'Account deleted' : 'تم حذف الحساب', locale==='ar');
    } catch {
      toastError(locale === 'en' ? 'Failed to delete account' : 'فشل حذف الحساب', locale==='ar');
    }
  };

  const roleLabel = (r?: string) => {
    if (!r) return '';
    const map: Record<string, { ar: string; en: string }> = {
      admin: { ar: 'مشرف', en: 'Admin' },
      vendor: { ar: 'بائع', en: 'Vendor' },
      technician: { ar: 'فني', en: 'Technician' },
      customer: { ar: 'عميل', en: 'Customer' }
    };
    const entry = map[r] || { ar: r, en: r };
    return locale === 'en' ? entry.en : entry.ar;
  };

  // Localize technician type/profession
  const techTypeLabel = (v?: string) => {
    if (!v) return '';
    const key = String(v).toLowerCase();
    const map: Record<string, { ar: string; en: string }> = {
      plumber: { ar: 'سباك', en: 'Plumber' },
      electrician: { ar: 'كهربائي', en: 'Electrician' },
      carpenter: { ar: 'نجار', en: 'Carpenter' },
      painter: { ar: 'دهان', en: 'Painter' },
      gypsum: { ar: 'فني جبس', en: 'Gypsum Installer' },
      marble: { ar: 'فني رخام', en: 'Marble Installer' },
    };
    const entry = map[key];
    return locale === 'en' ? (entry?.en || v) : (entry?.ar || v);
  };

  const handleCancel = () => {
    setEditedUser(user || editedUser);
    setIsEditing(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    const map: Record<string, { ar: string; en: string }> = {
      delivered: { ar: 'تم التوصيل', en: 'Delivered' },
      shipped: { ar: 'في الطريق', en: 'Shipped' },
      processing: { ar: 'قيد المعالجة', en: 'Processing' }
    };
    const entry = map[status] || { ar: status, en: status };
    return locale === 'en' ? entry.en : entry.ar;
  };

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="profile" setCurrentPage={setCurrentPage} user={user} setUser={setUser} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block">
                  <Avatar className="w-28 h-28 mx-auto mb-4 ring-2 ring-primary/20">
                    <AvatarImage src={editedUser.avatar} />
                    <AvatarFallback className="text-xl">
                      {editedUser.name?.charAt(0) || 'أ'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFilePick}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="absolute bottom-1 right-1 rounded-full bg-white border shadow p-2 hover:bg-gray-50"
                    aria-label={locale==='en' ? 'Edit photo' : 'تعديل الصورة'}
                    title={locale==='en' ? 'Edit photo' : 'تعديل الصورة'}
                  >
                    <Edit className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                
                <h2 className="text-xl font-medium mb-2">{[editedUser.firstName, editedUser.middleName, editedUser.lastName].filter(Boolean).join(' ') || editedUser.name}</h2>
                <p className="text-muted-foreground mb-2">{editedUser.email}</p>
                <p className="text-muted-foreground mb-1 flex items-center justify-center gap-2">
                  <Phone className="h-3 w-3" /> {editedUser.phone || (locale==='en'?'Not set':'غير محدد')}
                </p>
                <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2">
                  <Calendar className="h-3 w-3" /> {editedUser.birthdate || (locale==='en'?'Birth date not set':'تاريخ الميلاد غير محدد')}
                </p>
                
                <div className="space-y-2">
                  <Badge variant="outline" className="w-full justify-center gap-2">
                    <Shield className="h-3 w-3" /> {roleLabel(editedUser.role)}
                  </Badge>
                  <Badge variant="secondary" className="w-full justify-center gap-1">
                    <Package className="h-3 w-3 ml-1" />
                    {orders.length} {locale === 'en' ? 'orders' : 'طلب'}
                  </Badge>
                  {isTechnician && (editedUser.technicianType || '').trim() !== '' && (
                    <Badge variant="outline" className="w-full justify-center gap-2">
                      {locale==='en' ? 'Technician Type' : 'نوع الفني'}: {techTypeLabel(editedUser.technicianType)}
                    </Badge>
                  )}
                </div>
                
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">{locale === 'en' ? 'Profile' : 'الملف الشخصي'}</TabsTrigger>
                {isTechnician ? (
                  <TabsTrigger value="offers">{locale === 'en' ? 'My Offers' : 'عروضي'}</TabsTrigger>
                ) : (
                  <TabsTrigger value="orders">{locale === 'en' ? 'My Orders' : 'طلباتي'}</TabsTrigger>
                )}
                <TabsTrigger value="addresses">{locale === 'en' ? 'Addresses' : 'العناوين'}</TabsTrigger>
                <TabsTrigger value="wishlist">{locale === 'en' ? 'Wishlist' : 'المفضلة'}</TabsTrigger>
                <TabsTrigger value="settings">{locale === 'en' ? 'Settings' : 'الإعدادات'}</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{locale === 'en' ? 'Personal Information' : 'المعلومات الشخصية'}</CardTitle>
                    {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 ml-2" />
                      {locale === 'en' ? 'Edit' : 'تعديل'}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>
                        <Save className="h-4 w-4 ml-2" />
                        {locale === 'en' ? 'Save' : 'حفظ'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4 ml-2" />
                        {locale === 'en' ? 'Cancel' : 'إلغاء'}
                     </Button>
                     </div>
                   )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2">
                        <div>
                          <Label htmlFor="firstName">{locale==='en'?'First Name':'الاسم الأول'}</Label>
                          <Input id="firstName" value={editedUser.firstName || ''} onChange={(e)=> setEditedUser({ ...editedUser, firstName: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                        </div>
                        <div>
                          <Label htmlFor="middleName">{locale==='en'?'Middle Name (optional)':'الاسم الأوسط (اختياري)'}</Label>
                          <Input id="middleName" value={editedUser.middleName || ''} onChange={(e)=> setEditedUser({ ...editedUser, middleName: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                        </div>
                        <div>
                          <Label htmlFor="lastName">{locale==='en'?'Last Name':'اسم العائلة'}</Label>
                          <Input id="lastName" value={editedUser.lastName || ''} onChange={(e)=> setEditedUser({ ...editedUser, lastName: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                        </div>
                      </div>
                      <div />
                      <div>
                        <Label htmlFor="phone">{locale === 'en' ? 'Phone Number' : 'رقم الهاتف'}</Label>
                        <Input id="phone" value={editedUser.phone || ''} onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                      </div>
                      <div>
                        <Label htmlFor="birthdate">{locale === 'en' ? 'Birth Date' : 'تاريخ الميلاد'}</Label>
                        <Input id="birthdate" type="date" value={editedUser.birthdate || ''} onChange={(e) => setEditedUser({ ...editedUser, birthdate: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                      </div>
                      
                      {isTechnician && (
                        <>
                          <div className="md:col-span-2">
                            <Label htmlFor="technicianType">{locale === 'en' ? 'Technician Type / Specialty' : 'نوع الفني / التخصص'}</Label>
                            <Input
                              id="technicianType"
                              value={editedUser.technicianType || ''}
                              onChange={(e) => setEditedUser({ ...editedUser, technicianType: e.target.value })}
                              disabled={!isEditing}
                              placeholder={locale==='en' ? 'e.g., Mechanic, Electrician' : 'مثال: ميكانيكي، كهربائي'}
                              className={!isEditing ? 'bg-muted' : ''}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* License image preview (clickable in edit mode) */}
                    <div className="space-y-2">
                      <Label className="block">{locale==='en' ? 'License Image' : 'صورة الرخصة'}</Label>
                      <div
                        className={`relative w-full md:w-1/2 lg:w-1/3 border rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800 ${isEditing ? 'cursor-pointer group' : ''}`}
                        onClick={() => { if (isEditing) licenseFileRef.current?.click(); }}
                      >
                        {editedUser.licenseImageUrl ? (
                          <Image src={editedUser.licenseImageUrl} alt={locale==='en' ? 'License image' : 'صورة الرخصة'} width={800} height={600} className="w-full h-auto object-contain" />
                        ) : (
                          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                            {locale==='en' ? 'No license image uploaded' : 'لا توجد صورة رخصة'}
                          </div>
                        )}
                        {isEditing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition">
                            {locale==='en' ? 'Click to change' : 'اضغط للتغيير'}
                          </div>
                        )}
                        <input
                          ref={licenseFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLicenseFilePick}
                          className="hidden"
                        />
                      </div>
                    </div>
                    {/* Vendor specific readout */}
                    {editedUser.role === 'vendor' && (
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>{locale==='en'?'Company Name':'اسم الشركة'}</Label>
                            <Input value={editedUser.companyName || ''} onChange={(e)=> setEditedUser({ ...editedUser, companyName: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div>
                            <Label>{locale==='en'?'Tax Number':'الرقم الضريبي'}</Label>
                            <Input value={editedUser.taxNumber || ''} onChange={(e)=> setEditedUser({ ...editedUser, taxNumber: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>{locale==='en'?'IBAN':'رقم الآيبان'}</Label>
                            <Input value={editedUser.iban || ''} onChange={(e)=> setEditedUser({ ...editedUser, iban: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div>
                            <Label>{locale==='en'?'Verification':'حالة الاعتماد'}</Label>
                            <Input value={editedUser.isVerified ? (locale==='en'?'Approved':'معتمد') : (locale==='en'?'Pending approval':'قيد المراجعة')} disabled className="bg-muted" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label>{locale==='en'?'Building No.':'رقم المبنى'}</Label>
                            <Input value={editedUser.buildingNumber || ''} onChange={(e)=> setEditedUser({ ...editedUser, buildingNumber: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div>
                            <Label>{locale==='en'?'Street':'الشارع'}</Label>
                            <Input value={editedUser.streetName || ''} onChange={(e)=> setEditedUser({ ...editedUser, streetName: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div>
                            <Label>{locale==='en'?'City':'المدينة'}</Label>
                            <Input value={editedUser.city || ''} onChange={(e)=> setEditedUser({ ...editedUser, city: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div>
                            <Label>{locale==='en'?'Postal Code':'الرمز البريدي'}</Label>
                            <Input value={editedUser.postalCode || ''} onChange={(e)=> setEditedUser({ ...editedUser, postalCode: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>{locale==='en'?'Phone (Secondary)':'الهاتف (إضافي)'}</Label>
                            <Input value={editedUser.phoneSecondary || ''} onChange={(e)=> setEditedUser({ ...editedUser, phoneSecondary: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>{locale==='en'?'Registry Start':'بداية السجل الموحد'}</Label>
                              <Input value={editedUser.registryStart || ''} onChange={(e)=> setEditedUser({ ...editedUser, registryStart: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                            </div>
                            <div>
                              <Label>{locale==='en'?'Registry End':'نهاية السجل الموحد'}</Label>
                              <Input value={editedUser.registryEnd || ''} onChange={(e)=> setEditedUser({ ...editedUser, registryEnd: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Customer basic address summary (optional) */}
                    {editedUser.role === 'customer' && (
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <Label>{locale==='en'?'Address':'العنوان'}</Label>
                          <Textarea value={(editedUser.address || '')} onChange={(e)=> setEditedUser({ ...editedUser, address: e.target.value })} disabled={!isEditing} className={!isEditing ? 'bg-muted' : ''} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Orders Tab (non-technician) */}
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>{locale === 'en' ? 'My Orders' : 'طلباتي'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orders.map((order: Order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-medium">{locale === 'en' ? 'Order #' : 'طلب رقم '} {order.id}</h3>
                              <p className="text-sm text-muted-foreground">{order.date}</p>
                              <p className="text-sm text-muted-foreground">{order.items} {locale === 'en' ? 'item(s)' : 'منتج'}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusText(order.status)}
                            </Badge>
                            <p className="font-medium mt-2">{order.total} {locale === 'en' ? 'SAR' : 'ر.س'}</p>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" onClick={() => confirmDelivered(order.id)}>{locale==='en'?'Confirm Delivery':'تأكيد الاستلام'}</Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelOrder(order.id)}>{locale==='en'?'Cancel':'إلغاء'}</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setCurrentPage('my-orders')}
                      >
                        {locale === 'en' ? 'View all orders' : 'عرض جميع الطلبات'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Addresses Tab */}
              <TabsContent value="addresses">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{locale === 'en' ? 'Delivery Addresses' : 'عناوين التوصيل'}</CardTitle>
                    <Button onClick={addAddress}>
                      <MapPin className="h-4 w-4 ml-2" />
                      {locale === 'en' ? 'Add New Address' : 'إضافة عنوان جديد'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {addresses.map((address: Address) => (
                        <div key={address.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{address.name}</h3>
                              {address.isDefault && (
                                <Badge variant="secondary">{locale === 'en' ? 'Default' : 'افتراضي'}</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!address.isDefault && (
                                <Button variant="outline" size="sm" onClick={() => setDefaultAddress(address.id)}>{locale==='en'?'Make Default':'تعيين كافتراضي'}</Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => editAddress(address.id)}>{locale === 'en' ? 'Edit' : 'تعديل'}</Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteAddress(address.id)}>{locale === 'en' ? 'Delete' : 'حذف'}</Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{address.address}</p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              

              {/* Wishlist Tab */}
              <TabsContent value="wishlist">
                <Card>
                  <CardHeader>
                    <CardTitle>{locale === 'en' ? 'Wishlist' : 'قائمة المفضلة'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wishlistItems?.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">{locale === 'en' ? 'Your wishlist is empty' : 'قائمة المفضلة فارغة'}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {locale === 'en' ? 'Add items to your wishlist by clicking the heart icon on products' : 'أضف منتجات إلى قائمة المفضلة بالضغط على أيقونة القلب على المنتجات'}
                        </p>
                        <Button onClick={() => setCurrentPage('product-listing')}>
                          {locale === 'en' ? 'Browse Products' : 'تصفح المنتجات'}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wishlistItems?.map(item => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                            <h3 className="font-medium text-sm mb-2 line-clamp-2">{item.name}</h3>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-primary">{item.price} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  disabled={!item.inStock}
                                  onClick={() => {
                                    if (item.inStock) {
                                      addToCart && addToCart({
                                        ...item,
                                        quantity: 1,
                                        maxQuantity: 10
                                      });
                                      toastSuccess(locale === 'en' ? 'Added to cart' : 'تمت الإضافة إلى السلة', locale==='ar');
                                    }
                                  }}
                                >
                                  {item.inStock ? (locale === 'en' ? 'Add to Cart' : 'إضافة للسلة') : (locale === 'en' ? 'Out of Stock' : 'غير متوفر')}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeFromWishlist && removeFromWishlist(item.id);
                                    toastInfo(locale === 'en' ? 'Removed from wishlist' : 'تمت الإزالة من المفضلة', locale==='ar');
                                  }}
                                >
                                  <Heart className="h-4 w-4 fill-current" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{locale === 'en' ? 'Account Security' : 'أمان الحساب'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" className="w-full justify-start" onClick={handleChangePassword}>
                        <Shield className="h-4 w-4 ml-2" />
                        {locale === 'en' ? 'Change Password' : 'تغيير كلمة المرور'}
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleDeleteAccount}>
                        <X className="h-4 w-4 ml-2" />
                        {locale === 'en' ? 'Delete Account' : 'حذف الحساب'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
      
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}