"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toastInfo, toastSuccess } from "../../utils/alerts";
import Header from "../../components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Eye, Send } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { getOpenProjects } from "@/services/projects";
import { createOffer, getTechnicianOffers } from "@/services/offers";
import type { RouteContext } from "../../components/routerTypes";

interface Props extends Partial<RouteContext> {}

export default function TechnicianProjects({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const currency = isAr ? "ر.س" : "SAR";
  const technicianId = (context as any)?.user?.id || null;

  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [offerDays, setOfferDays] = useState<string>("");
  const [offerMessage, setOfferMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Build a fast lookup for already-submitted project IDs by this technician
  const submittedProjects = useMemo(() => {
    if (!Array.isArray(myOffers)) return new Set<string>();
    return new Set<string>(
      myOffers
        .filter((o:any)=> String(o.targetType).toLowerCase()==='project' && o.projectId != null)
        .map((o:any)=> String(o.projectId))
    );
  }, [myOffers]);

  useEffect(() => {
    (async () => {
      (context as any)?.showLoading?.(isAr ? 'جاري تحميل المشاريع...' : 'Loading projects...');
      try {
        const { ok, data } = await getOpenProjects();
        if (ok && Array.isArray(data)) setUserProjects(data as any[]);
        else setUserProjects([]);
      } catch { setUserProjects([]); }
    })().finally(() => {
      (context as any)?.hideLoading?.();
    });
  }, [context, isAr]); // Include dependencies as indicated by ESLint

  // Load my offers for submitted set
  useEffect(() => {
    (async () => {
      (context as any)?.showLoading?.(isAr ? 'جاري تحميل عروضك...' : 'Loading your offers...');
      try {
        if (!technicianId) { setMyOffers([]); return; }
        const { ok, data } = await getTechnicianOffers(String(technicianId));
        if (ok && Array.isArray(data)) setMyOffers(data as any[]);
        else setMyOffers([]);
      } catch { setMyOffers([]); }
    })().finally(() => {
      (context as any)?.hideLoading?.();
    });
  }, [context, isAr, technicianId]); // Include dependencies as indicated by ESLint

  const labelForProductType = (id: string) => {
    const map: any = {
      door: { ar: "باب", en: "Door" },
      window: { ar: "شباك", en: "Window" },
      railing: { ar: "دربزين", en: "Railing" },
    };
    return map[id]?.[isAr ? "ar" : "en"] || id;
  };
  const labelForMaterial = (id: string) => {
    const map: any = {
      aluminum: { ar: "ألمنيوم", en: "Aluminum" },
      steel: { ar: "صاج", en: "Steel" },
      laser: { ar: "ليزر", en: "Laser-cut" },
      glass: { ar: "سكريت", en: "Glass (Securit)" },
    };
    return map[id]?.[isAr ? "ar" : "en"] || id;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="technician-projects" setCurrentPage={setCurrentPage} {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{isAr ? 'كل المشاريع' : 'All Projects'}</h1>
        </div>

        {userProjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? 'لا توجد مشاريع بعد.' : 'No projects yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProjects.map((p:any) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {labelForProductType(p.ptype || p.type)}{p.material ? ` • ${labelForMaterial(p.material)}` : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="text-muted-foreground">
                    {isAr ? 'الأبعاد' : 'Dimensions'}: {Number(p.width || 0)}×{Number(p.height || 0)}
                  </div>
                  <div className="text-muted-foreground">
                    {isAr ? 'الكمية' : 'Quantity'}: {Number(p.quantity || 0)}
                  </div>
                  <div className="font-semibold">
                    {currency} {Number(p.total || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                  </div>
                  {!!p.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                  )}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          const url = new URL(window.location.href);
                          url.searchParams.set('projectId', String(p.id));
                          url.searchParams.set('page', 'technician-project-details');
                          window.history.replaceState({}, '', url.toString());
                        } catch {}
                        setCurrentPage && setCurrentPage('technician-project-details');
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {isAr ? 'تفاصيل' : 'Details'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={submittedProjects.has(String(p.id))}
                      onClick={() => {
                        if (submittedProjects.has(String(p.id))) {
                          toastInfo(isAr ? 'تم الإرسال مسبقاً لهذا المشروع' : 'Already submitted for this project', isAr);
                          return;
                        }
                        setSelectedProject(p);
                        setOfferPrice("");
                        setOfferDays("");
                        setOfferMessage("");
                        setProposalOpen(true);
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submittedProjects.has(String(p.id)) ? (isAr ? 'تم الإرسال' : 'Submitted') : (isAr ? 'تقديم عرض' : 'Submit Proposal')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Proposal Dialog */}
      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>
              {isAr ? 'تقديم عرض للمشروع' : 'Submit Proposal for Project'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="price">{isAr ? 'السعر المقترح' : 'Proposed Price'}</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                placeholder={isAr ? 'مثال: 2500' : 'e.g. 2500'}
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="days">{isAr ? 'المدة (أيام)' : 'Duration (days)'}</Label>
              <Input
                id="days"
                type="number"
                inputMode="numeric"
                placeholder={isAr ? 'مثال: 7' : 'e.g. 7'}
                value={offerDays}
                onChange={(e) => setOfferDays(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">{isAr ? 'رسالة' : 'Message'}</Label>
              <Textarea
                id="message"
                rows={4}
                placeholder={isAr ? 'عرّف بنفسك وقدّم تفاصيل العرض' : 'Introduce yourself and provide details of your offer'}
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                saving || !selectedProject || !offerPrice || !offerDays ||
                (selectedProject && submittedProjects.has(String(selectedProject.id)))
              }
              onClick={() => {
                if (!selectedProject) return;
                if (submittedProjects.has(String(selectedProject.id))) {
                  toastInfo(isAr ? 'تم الإرسال مسبقاً لهذا المشروع' : 'Already submitted for this project', isAr);
                  return;
                }
                (async () => {
                  try {
                    setSaving(true);
                    const res = await createOffer({ targetType: 'project', projectId: Number(selectedProject.id), price: Number(offerPrice), days: Number(offerDays), message: offerMessage });
                    if (res.ok) {
                      // refresh offers
                      try {
                        if (technicianId) {
                          const { ok, data } = await getTechnicianOffers(String(technicianId));
                          if (ok && Array.isArray(data)) setMyOffers(data as any[]);
                        }
                      } catch {}
                      setProposalOpen(false);
                      toastSuccess(isAr ? 'تم إرسال العرض' : 'Proposal submitted', isAr);
                    }
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'إرسال العرض' : 'Send Proposal')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
