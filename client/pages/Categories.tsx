import type { RouteContext } from '../components/Router';
import Header from '../components/Header';
import ProductCategories from '../components/ProductCategories';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';

export default function CategoriesPage(context: RouteContext = {} as RouteContext) {
  const { locale, t } = useTranslation();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <>
      <Header {...context} />
      <main className="py-10" dir={dir}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">{t('categories')}</h1>
          </div>
        </div>
        <ProductCategories {...context} />
      </main>
      <Footer {...context} />
    </>
  );
}
