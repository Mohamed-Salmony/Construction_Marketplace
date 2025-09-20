"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { useTranslation } from "../../hooks/useTranslation";
import type { RouteContext } from "../../components/routerTypes";
import Swal from "sweetalert2";
import { getProjectById } from "@/services/projects";
import { createOffer, getTechnicianOffers } from "@/services/offers";

interface Props extends Partial<RouteContext> {}

export default function TechnicianProjectDetails({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const currency = isAr ? 'ر.س' : 'SAR';
  const technicianId = (context as any)?.user?.id || null;

  const [project, setProject] = useState<any | null>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [offerPrice, setOfferPrice] = useState<string>("");
  const [offerDays, setOfferDays] = useState<string>("");
  const [offerMessage, setOfferMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load selected project by id from backend (id is read from URL query param)
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') { setLoading(false); return; }
        let id: string | null = null;
        try {
          const url = new URL(window.location.href);
          id = url.searchParams.get('projectId');
        } catch {}
        if (!id) { setLoading(false); return; }
        const { ok, data } = await getProjectById(String(id));
        if (ok && data) setProject(data as any);
        else setProject(null);
      } finally { setLoading(false); }
    })();
  }, []);

  // Load my offers and check if submitted
  useEffect(() => {
    (async () => {
      try {
        if (!project || !technicianId) { setHasSubmitted(false); setMyOffers([]); return; }
        const { ok, data } = await getTechnicianOffers(String(technicianId));
        const offers = ok && Array.isArray(data) ? (data as any[]) : [];
        setMyOffers(offers);
        const exists = offers.some((o:any)=> String(o.targetType).toLowerCase()==='project' && String(o.projectId)===String(project.id));
        setHasSubmitted(exists);
      } catch { setHasSubmitted(false); setMyOffers([]); }
    })();
  }, [project, technicianId]);

  const labelForProductType = (id?: string) => {
    const map: any = {
      door: { ar: "باب", en: "Door" },
      window: { ar: "شباك", en: "Window" },
      railing: { ar: "دربزين", en: "Railing" },
    };
    return id ? (map[id]?.[isAr ? 'ar' : 'en'] || id) : '';
  };
  const labelForMaterial = (id?: string) => {
    const map: any = {
      aluminum: { ar: "ألمنيوم", en: "Aluminum" },
      steel: { ar: "صاج", en: "Steel" },
      laser: { ar: "ليزر", en: "Laser-cut" },
      glass: { ar: "سكريت", en: "Glass (Securit)" },
    };
    return id ? (map[id]?.[isAr ? 'ar' : 'en'] || id) : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="technician-project-details" setCurrentPage={setCurrentPage} {...context} />
        <div className="container mx-auto px-4 py-8">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="technician-project-details" setCurrentPage={setCurrentPage} {...context} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-muted-foreground">{isAr ? 'تعذّر العثور على المشروع.' : 'Project not found.'}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="technician-project-details" setCurrentPage={setCurrentPage} {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {labelForProductType(project.ptype || project.type)}{project.material ? ` • ${labelForMaterial(project.material)}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">{isAr ? 'الأبعاد' : 'Dimensions'}: {Number(project.width || 0)}×{Number(project.height || 0)}</div>
                <div className="text-muted-foreground">{isAr ? 'الكمية' : 'Quantity'}: {Number(project.quantity || 0)}</div>
                <div className="font-semibold">{currency} {Number(project.total || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                {!!project.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{project.description}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isAr ? 'تفاصيل إضافية' : 'Additional Details'}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {project.color && <div>{(isAr ? 'اللون: ' : 'Color: ') + project.color}</div>}
                {project.location && <div>{(isAr ? 'الموقع: ' : 'Location: ') + project.location}</div>}
                {project.phone && <div>{(isAr ? 'الهاتف: ' : 'Phone: ') + project.phone}</div>}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: submit proposal */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{isAr ? 'ملخص' : 'Summary'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isAr ? 'القيمة التقديرية' : 'Estimated Value'}</span>
                  <span className="font-semibold">{currency} {Number(project.total || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  {isAr ? 'يمكنك تقديم عرض لهذا المشروع من خلال تعبئة الحقول أدناه.' : 'You can submit a proposal by filling the fields below.'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isAr ? 'تقديم عرض' : 'Submit Proposal'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>{isAr ? 'السعر المقترح' : 'Proposed Price'}</Label>
                  <Input inputMode="decimal" value={offerPrice} onChange={(e)=> setOfferPrice(e.target.value)} placeholder={isAr ? 'مثال: 2500' : 'e.g. 2500'} />
                </div>
                <div className="grid gap-2">
                  <Label>{isAr ? 'المدة (أيام)' : 'Duration (days)'}</Label>
                  <Input inputMode="numeric" value={offerDays} onChange={(e)=> setOfferDays(e.target.value)} placeholder={isAr ? 'مثال: 7' : 'e.g. 7'} />
                </div>
                <div className="grid gap-2">
                  <Label>{isAr ? 'رسالة' : 'Message'}</Label>
                  <Input value={offerMessage} onChange={(e)=> setOfferMessage(e.target.value)} placeholder={isAr ? 'أدخل رسالة قصيرة' : 'Enter a short message'} />
                </div>
                <Button
                  className="w-full"
                  disabled={hasSubmitted}
                  onClick={() => {
                    if (hasSubmitted) {
                      Swal.fire({ icon: 'info', title: isAr ? 'تم الإرسال مسبقاً' : 'Already Submitted', text: isAr ? 'لا يمكنك إرسال عرض آخر لهذا المشروع.' : 'You have already submitted a proposal for this project.' });
                      return;
                    }
                    if (!technicianId) {
                      Swal.fire({ icon: 'warning', title: isAr ? 'تسجيل الدخول مطلوب' : 'Login required', text: isAr ? 'الرجاء تسجيل الدخول كفني لتقديم الطلب.' : 'Please log in as a technician to submit requests.' });
                      return;
                    }
                    try {
                      setSaving(true);
                      (async () => {
                        const res = await createOffer({ targetType: 'project', projectId: Number(project.id), price: Number(offerPrice || 0), days: Number(offerDays || 0), message: offerMessage || '' });
                        if (res.ok) {
                          setHasSubmitted(true);
                          try {
                            if (technicianId) {
                              const { ok, data } = await getTechnicianOffers(String(technicianId));
                              if (ok && Array.isArray(data)) setMyOffers(data as any[]);
                            }
                          } catch {}
                          Swal.fire({ icon: 'success', title: isAr ? 'تم إرسال العرض' : 'Proposal submitted', timer: 1800, showConfirmButton: false });
                        }
                      })();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (hasSubmitted ? (isAr ? 'تم الإرسال' : 'Submitted') : (isAr ? 'إرسال العرض' : 'Send Proposal'))}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
