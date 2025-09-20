import { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  User,
  MessageSquare,
  Type,
  ListTree,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { RouteContext } from "../components/Router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTranslation } from "../hooks/useTranslation";
import { success } from "../utils/alerts";

interface ContactProps extends RouteContext {}

export default function Contact({ setCurrentPage, user, setUser, cartItems }: ContactProps) {
  const { t, locale } = useTranslation();

  // contactInfo يجب أن يكون هنا
  const contactInfo = [
    {
      icon: MapPin,
      title: t("ourAddress"),
      details: [t("addressLine1"), t("addressLine2")],
      color: "text-blue-500",
    },
    {
      icon: Phone,
      title: t("callUs"),
      details: [t("phone1"), t("phone2")],
      color: "text-green-500",
    },
    {
      icon: Mail,
      title: t("emailUs"),
      details: [t("email1"), t("email2")],
      color: "text-purple-500",
    },
    {
      icon: Clock,
      title: t("workingHours"),
      details: [t("workingHoursWeekdays"), t("workingHoursWeekend")],
      color: "text-orange-500",
    },
  ];

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    category: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await success(t("contactSuccessMessage"), locale === 'ar');
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      category: "",
      message: "",
    });
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const padInput = locale === 'ar' ? 'pr-12 md:pr-14' : 'pl-12 md:pl-14'
  const iconSide = locale === 'ar' ? 'right-3' : 'left-3'
  const textDir = locale === 'ar' ? 'rtl' : 'ltr'
  const sendingText = locale === 'ar' ? 'جاري الإرسال...' : 'Sending...'

  return (
    <div className="min-h-screen bg-background" dir={textDir} lang={locale}>
      <Header currentPage="contact" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={cartItems} />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t("contactUs")}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("supportTeamReady")}
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactInfo.map((info, index) => (
            <Card
              key={index}
              className="text-center p-6 hover:shadow-lg transition-shadow"
            >
              <CardContent className="space-y-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto ${info.color}`}
                >
                  <info.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium">{info.title}</h3>
                <div className="space-y-1">
                  {info.details.map((detail, idx) => (
                    <p key={idx} className="text-muted-foreground text-sm">
                      {detail}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="shadow-md border border-muted/40 rounded-xl">
            <CardHeader>
              <CardTitle>{t("sendMessage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="mb-1 block text-sm font-medium flex items-center gap-1">
                      {t("fullName")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        required
                        className={`h-12 ${padInput} text-foreground placeholder:text-muted-foreground text-base md:text-lg leading-normal bg-background focus-visible:ring-2 focus-visible:ring-primary`}
                      />
                      <User className={`pointer-events-none absolute ${iconSide} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="mb-1 block text-sm font-medium flex items-center gap-1">
                      {t("emailAddress")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        required
                        className={`h-12 ${padInput} text-foreground placeholder:text-muted-foreground text-base md:text-lg leading-normal bg-background focus-visible:ring-2 focus-visible:ring-primary`}
                      />
                      <Mail className={`pointer-events-none absolute ${iconSide} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="mb-1 block text-sm font-medium">{t("phoneNumber")}</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className={`h-12 ${padInput} text-foreground placeholder:text-muted-foreground text-base md:text-lg leading-normal bg-background focus-visible:ring-2 focus-visible:ring-primary`}
                      />
                      <Phone className={`pointer-events-none absolute ${iconSide} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category" className="mb-1 block text-sm font-medium">{t("inquiryCategory")}</Label>
                    <div className="relative">
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          handleInputChange("category", value)
                        }
                      >
                        <SelectTrigger className={`h-12 ${padInput} text-foreground text-base md:text-lg leading-normal`}>
                          <SelectValue placeholder={t("choosCategory")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">{t("general")}</SelectItem>
                          <SelectItem value="order">{t("order")}</SelectItem>
                          <SelectItem value="product">{t("product")}</SelectItem>
                          <SelectItem value="technical">
                            {t("technical")}
                          </SelectItem>
                          <SelectItem value="complaint">
                            {t("complaint")}
                          </SelectItem>
                          <SelectItem value="suggestion">
                            {t("suggestion")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <ListTree className={`pointer-events-none absolute ${iconSide} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject" className="mb-1 block text-sm font-medium flex items-center gap-1">
                    {t("messageSubject")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) =>
                        handleInputChange("subject", e.target.value)
                      }
                      required
                      className={`h-12 ${padInput} text-foreground placeholder:text-muted-foreground text-base md:text-lg leading-normal bg-background focus-visible:ring-2 focus-visible:ring-primary`}
                    />
                    <Type className={`pointer-events-none absolute ${iconSide} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="mb-1 block text-sm font-medium flex items-center gap-1">
                    {t("messageText")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                      <Textarea
                        id="message"
                        rows={6}
                        value={formData.message}
                        onChange={(e) =>
                          handleInputChange("message", e.target.value)
                        }
                        required
                        className={`${padInput} text-foreground placeholder:text-muted-foreground text-base md:text-lg leading-relaxed bg-background focus-visible:ring-2 focus-visible:ring-primary min-h-[140px] pt-3`}
                      />
                    <MessageSquare className={`pointer-events-none absolute ${iconSide} top-4 h-5 w-5 text-muted-foreground`} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {sendingText}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      {t("sendMessage")}
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Map and Additional Info */}
          <div className="space-y-6">
            {/* Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>{t("ourLocationContact")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{t("mapLocationContact")}</p>
                    <p className="text-sm text-gray-400">{t("addressMapContact")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Hours */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-3">
                  {t("customerSupport")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("supportTeamHint")}
                </p>
                <Button onClick={() => setCurrentPage("support")}>
                  {t("customerSupport")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
