import { Card, CardContent } from './ui/card';
import { Truck, Shield, CreditCard, Headphones, Clock, Award } from 'lucide-react';
import { RouteContext } from './Router';
import { useTranslation } from '../hooks/useTranslation';



export default function PlatformFeatures(context: RouteContext) {
  const { t, locale } = useTranslation();
  
  const features = [
    {
      icon: Truck,
      title: t('freeShipping'),
      description: t('freeShippingDesc'),
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Shield,
      title: t('originalParts'),
      description: t('originalPartsDesc'),
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: CreditCard,
      title: t('securePayment'),
      description: t('securePaymentDesc'),
      color: 'text-purple-600 bg-purple-100'
    },
    {
      icon: Headphones,
      title: t('support247'),
      description: t('supportDesc'),
      color: 'text-orange-600 bg-orange-100'
    },
    {
      icon: Clock,
      title: t('fastService'),
      description: t('fastServiceDesc'),
      color: 'text-red-600 bg-red-100'
    },
    {
      icon: Award,
      title: t('experience15'),
      description: t('experienceDesc'),
      color: 'text-yellow-600 bg-yellow-100'
    }
  ];
  
  return (
    <section className="py-16 bg-gray-50" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('whyChooseUs')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('whyChooseUsDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-white">
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Statistics */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">15K+</div>
              <div className="text-muted-foreground">{t('satisfiedCustomer')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">6K+</div>
              <div className="text-muted-foreground">{t('availableProduct')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">{t('brandNameStats')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">99%</div>
              <div className="text-muted-foreground">{t('satisfactionRateStats')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
