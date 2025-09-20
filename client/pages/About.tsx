import {
  Award,
  Users,
  Target,
  Shield,
  CheckCircle,
  Star,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTranslation } from "../hooks/useTranslation";

interface AboutProps {
  setCurrentPage: (page: string) => void;
}

export default function About({ setCurrentPage }: AboutProps) {
  const { t, locale } = useTranslation();

  // الإنجازات
const achievements = [
    {
      icon: Users,
      number: "50,000+",
      label: { ar: "عميل راضٍ", en: "Satisfied Customers" },
    },
    {
      icon: Award,
      number: "15+",
      label: { ar: "سنة من الخبرة", en: "Years of Experience" },
    },
    {
      icon: Target,
      number: "98%",
      label: { ar: "معدل رضا العملاء", en: "Customer Satisfaction Rate" },
    },
    {
      icon: Shield,
      number: "24/7",
      label: { ar: "دعم فني متواصل", en: "24/7 Technical Support" },
    },
  ];

  // رسالتنا
  const messageCards = [
    {
      icon: CheckCircle,
      title: { ar: "رسالتنا", en: "Our Message" },
      description: {
        ar: "رسالتنا في مؤسسة التقنيات الحديثة هي نشر ثقافة الجودة بمعناها الحقيقي في مجال تصنيع وتنفيذ أعمال الألمنيوم والزجاج، لخلق منافسة حقيقية بين جميع المصانع والمؤسسات التي تقدّم خدمات الألمنيوم والزجاج، سواء كانت مصانع كبيرة أم ناشئة. ونتبنّى هذه الرسالة من أجل تقديم أفضل الخدمات بأفضل تكلفة ممكنة.",
        en: "Our Mission At Modern Technologies Corporation Is To Spread The Culture Of Quality In Its True Sense In The Field Of Manufacturing And Implementing Aluminum And Glass Works In Order To Create Real Competition Between All Factories And Institutions That Provide Aluminum And Glass Services, Whether They Are Large Or Emerging Factories, And This Message That We Adopt Is In Order To Provide The Best Services. At The Most Reasonable Cost",
      },
    },
  ];

  // أهدافنا
  const goalsCards = [
    {
      icon: Target,
      title: { ar: "أهدافنا", en: "Our Goals" },
      description: {
        ar: "نسعى في مؤسسة التقنيات الحديثة إلى بناء شراكات طويلة الأمد مع الكثير من عملائنا في أنحاء المملكة، ونبذل قصارى جهدنا لتحقيق هذا الهدف بما يلبّي طموحات واحتياجات عملائنا الحاليين والمستقبليين. كما نمضي وفق خطة منظّمة نسعى من خلالها إلى توسيع أنشطتنا لتغطي خدماتنا جميع مناطق المملكة العربية السعودية.",
        en: "We At Modern Technologies Corporation Have A Strong Goal Of Building Long-term Partnerships With Many Of Our Clients Throughout The Kingdom. We Do Our Best To Achieve This Goal To Meet The Ambitions And Needs Of Our Current And Future Customers. We Also Proceed According To An Organized Plan Through Which We Seek To Expand Our Activities To Cover Our Services. All Parts Of The Kingdom Of Saudi Arabia.",
      },
    },
  ];

  // القيم
const values = [
  {
    icon: Shield,
      title: { ar: "الجودة والثقة", en: "Quality & Trust" },
      description: {
        ar: "نحن ملتزمون بتقديم قطع غيار أصلية وعالية الجودة من أفضل الشركات المصنعة حول العالم",
        en: "We are committed to providing original, high-quality parts from the best manufacturers worldwide.",
      },
  },
  {
    icon: Target,
      title: { ar: "خدمة العملاء", en: "Customer Service" },
      description: {
        ar: "رضا عملائنا هو أولويتنا القصوى، ونسعى دائماً لتقديم أفضل تجربة تسوق ممكنة",
        en: "Customer satisfaction is our top priority, and we always strive to provide the best shopping experience.",
      },
  },
  {
    icon: CheckCircle,
      title: { ar: "الشفافية", en: "Transparency" },
      description: {
        ar: "نؤمن بأهمية الوضوح في جميع معاملاتنا ونقدم معلومات دقيقة حول منتجاتنا وأسعارنا",
        en: "We believe in clarity in all our dealings and provide accurate information about our products and prices.",
      },
  },
  {
    icon: Users,
      title: { ar: "الابتكار", en: "Innovation" },
      description: {
        ar: "نواكب أحدث التقنيات لتطوير منصتنا وتحسين تجربة التسوق الإلكتروني",
        en: "We keep up with the latest technologies to develop our platform and enhance the e-commerce experience.",
      },
    },
  ];

  // الفريق (تمت الإزالة بناءً على الطلب)

  // الشهادات (certifications) - اجعلها تعتمد على الترجمة أو هيكل {ar, en}
  const certifications = [
    {
      icon: Shield,
      title: { ar: "شهادة ISO 9001", en: "ISO 9001 Certificate" },
      description: {
        ar: "معتمدون في إدارة الجودة وضمان أعلى معايير الخدمة",
        en: "Certified in quality management and ensuring the highest standards of service.",
      },
    },
    {
      icon: Award,
      title: {
        ar: "عضوية الغرفة التجارية",
        en: "Chamber of Commerce Membership",
      },
      description: {
        ar: "عضو معتمد في الغرفة التجارية السعودية",
        en: "Member of the Saudi Chamber of Commerce.",
      },
    },
    {
      icon: Star,
      title: { ar: "جائزة أفضل متجر", en: "Best Store Award" },
      description: {
        ar: "حاصلون على جائزة أفضل متجر إلكتروني لعام 2023",
        en: "Won the Best Online Store Award for 2023.",
      },
    },
  ];

  // فقرات القصة
  const storyParagraphs = [
    {
      ar: "تُعد مؤسسة مودرن تكنيكلز خطوة رائدة في صناعة الألمنيوم عبر تحقيق تطلعات كل عميل على حدة. نحن هنا لنقدّم كل ما يتوقعه أي عميل في مجال أعمال الألمنيوم الواسع: من التصميم والتوريد وتركيب أعمال الكلادينغ والواجهات الزجاجية والستائر الحائطية والأبواب والنوافذ والقِباب بمختلف أنواعها. ونوفر خدمات متكاملة ومتخصصة للأفراد والشركات بطرق سهلة وميسّرة.",
      en: "Modern Technicals Est. Is A Pioneering Step In The Aluminum Industry By Achieving The Special Ambitions Of Each Customer. We Are Here To Provide Everything That Any Client Expects In The Wide Field Of Aluminum Works, From Designing, Supplying And Installing Cladding Works, Glass Facades, Cartain Wall, Doors, Windows And Planetariums Of All Kinds. We Provide Integrated And Specialized Services, Whether For Individuals Or Companies, In Easy And Convenient Ways. We Are Not Just A Manufacturing And Installation Organization, As Our Background In Civil Engineering Helps Us Interact Directly With Architects And Consultants In Designing And Developing Appropriately, Taking Into Account Cost And Quality. We Help Engineers, Architects, Contractors And Clients Develop To Achieve The Desired Goals In A Correct And Effective Manner. Today, Building Facades Comprise 10 To 25% Of The Project Construction Cost, And Therefore Their Performance Works Successfully In Order To Achieve This Goal. We Act As An Integrated Member Of The Entire Project Team To Provide The Best Performance",
    },
    {
      ar: "لسنا مجرد جهة تصنيع وتركيب؛ فخلفيتنا في الهندسة المدنية تمكّننا من التفاعل مباشرةً مع المعماريين والاستشاريين للتصميم والتطوير الملائمين مع مراعاة التكلفة والجودة. نساعد المهندسين والمعماريين والمقاولين والعملاء على تحقيق الأهداف المنشودة بكفاءة وفاعلية. واليوم تمثّل واجهات المباني 10–25% من تكلفة إنشاء المشروع، لذلك نعمل كعضو متكامل ضمن فريق المشروع بالكامل لتقديم أفضل أداء وتحقيق هذه الأهداف.",
      en: "Modern Technicals Est. Is A Pioneering Step In The Aluminum Industry By Achieving The Special Ambitions Of Each Customer. We Are Here To Provide Everything That Any Client Expects In The Wide Field Of Aluminum Works, From Designing, Supplying And Installing Cladding Works, Glass Facades, Cartain Wall, Doors, Windows And Planetariums Of All Kinds. We Provide Integrated And Specialized Services, Whether For Individuals Or Companies, In Easy And Convenient Ways. We Are Not Just A Manufacturing And Installation Organization, As Our Background In Civil Engineering Helps Us Interact Directly With Architects And Consultants In Designing And Developing Appropriately, Taking Into Account Cost And Quality. We Help Engineers, Architects, Contractors And Clients Develop To Achieve The Desired Goals In A Correct And Effective Manner. Today, Building Facades Comprise 10 To 25% Of The Project Construction Cost, And Therefore Their Performance Works Successfully In Order To Achieve This Goal. We Act As An Integrated Member Of The Entire Project Team To Provide The Best Performance",
    },
  ];

  // الرؤية
  const visionParagraph = {
    ar: "نتطلع إلى توسيع أعمالنا المستقبلية المتقدمة بما ينسجم مع رؤية الدولة (رؤية 2030)، التي تسعى إلى تطبيق التقنية والطاقة البديلة الصديقة للبيئة وتبنّي الأفكار الذكية بالشراكة مع الشركات الناجحة، ليقدّم مصنعنا خدمات بأعلى درجات الجودة والاحترافية، مع التحسين المستمر لخدمة العملاء ورضاهم، وتقديم أفضل الأفكار والابتكارات في هذا المجال لخدمة عملائنا",
    en: "We Look Forward To Expanding Future, Advanced Business With The State’s Vision (Vision 2030), Which Seeks To Apply Technology And Environmentally Friendly Alternative Energy And Implement Smart Ideas In The Participation Of Successful Companies In Order For Our Factory To Provide Services Of The Highest Quality And Professionalism As Well As Continuous Improvement Of Customer Service And Satisfaction. Providing The Best Ideas And Innovation In This Field To Serve Our Customers",
  };

  // المهمة
  const missionParagraph = {
    ar: "مهمّتنا أن نقدّم دائمًا حلولًا عالية الجودة واقتصادية لتحقيق معادلة رابح-رابح لجميع أطراف المشروع: العملاء، والمهندسين، والمعماريين، والاستشاريين، والمقاولين",
    en: "Our Mission Is To Always Provide High Quality And Economical Solutions In Order To Achieve A Win-win Situation For All Project Parties. Clients, Engineers, Architects, Consultants And Contractors",
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="about" setCurrentPage={setCurrentPage} />
      
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">{t("about")}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t("storeDescription")}
          </p>
        </div>

        {/* Company Story */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t("ourStory")}</h2>
            <div className="space-y-4 text-muted-foreground">
              {storyParagraphs.map((p, i) => (
                <p key={i}>{p[locale]}</p>
              ))}
            </div>
          </div>
          
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <iframe
              title={locale === 'ar' ? 'خريطة موقعنا' : 'Our Location Map'}
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3623.8310843730234!2d46.67529631500328!3d24.713551184115356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f038c7f4d9b1f%3A0x8f7c9e8a8f8c0f2a!2sRiyadh!5e0!3m2!1sar!2ssa!4v1700000000000!5m2!1sar!2ssa"
              width="100%"
              height="320"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("ourAchievements")}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <Card
                key={index}
                className="text-center p-8 hover:shadow-lg transition-shadow"
              >
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <achievement.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {achievement.number}
                  </div>
                  <div className="text-muted-foreground">
                    {achievement.label[locale]}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          <Card className="p-8">
            <CardContent className="space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">{t("vision")}</h3>
              <p className="text-muted-foreground">{visionParagraph[locale]}</p>
            </CardContent>
          </Card>

          <Card className="p-8">
            <CardContent className="space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">{t("mission")}</h3>
              <p className="text-muted-foreground">
                {missionParagraph[locale]}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("ourValues")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card
                key={index}
                className="p-6 text-center hover:shadow-lg transition-shadow"
              >
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium">{value.title[locale]}</h3>
                  <p className="text-muted-foreground text-sm">
                    {value.description[locale]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Our Message */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            {locale === 'ar' ? 'رسالتنا' : 'Our Message'}
          </h2>
          <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-8">
            {messageCards.map((item, index) => (
              <Card
                key={index}
                className="p-6 text-center hover:shadow-lg transition-shadow"
              >
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium">{item.title[locale]}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description[locale]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Our Goals */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            {locale === 'ar' ? 'أهدافنا' : 'Our Goals'}
          </h2>
          <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-8">
            {goalsCards.map((item, index) => (
              <Card
                key={index}
                className="p-6 text-center hover:shadow-lg transition-shadow"
              >
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium">{item.title[locale]}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description[locale]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("certifications")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {certifications.map((certification, index) => (
              <Card key={index} className="p-6 text-center">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <certification.icon className="w-8 h-8 text-green-600" />
                </div>
                  <h3 className="text-lg font-medium">
                    {certification.title[locale]}
                  </h3>
                <p className="text-sm text-muted-foreground">
                    {certification.description[locale]}
                </p>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mb-20">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-3">{t("faq")}</h2>
              <p className="text-muted-foreground text-center mb-4">
                {t("faqQuickHint")}
              </p>
              <div className="text-center">
                <Button variant="outline" onClick={() => setCurrentPage("faq")}>
                  {t("faq")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <Card className="p-8">
          <CardContent>
            <h2 className="text-2xl font-bold text-center mb-8">
              {t("contactUs")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium">{t("ourAddress")}</h3>
                <p className="text-muted-foreground">
                  شارع الملك فهد، حي العليا
                  <br />
                  الرياض 11564، المملكة العربية السعودية
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium">{t("callUs")}</h3>
                <p className="text-muted-foreground">
                  +966 11 123 4567
                  <br />
                  +966 50 123 4567
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium">{t("emailUs")}</h3>
                <p className="text-muted-foreground">
                  info@alaareef.com
                  <br />
                  support@alaareef.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
