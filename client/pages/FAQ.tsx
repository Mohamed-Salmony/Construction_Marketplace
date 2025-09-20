import { useEffect, useState } from 'react';
import { Search, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FAQItem from '../components/FAQItem';
import { faqCategories as faqCategoriesAr, faqs as faqsAr } from '../data/faqData';
import { faqCategoriesEn, faqsEn } from '../data/faqDataEn';
import { filterFAQs, getPopularFAQs, getCategoryById } from '../utils/faqHelpers';
import { useTranslation } from '../hooks/useTranslation';

interface FAQProps {
  setCurrentPage: (page: string) => void;
}

export default function FAQ({ setCurrentPage }: FAQProps) {
  const { t, locale } = useTranslation();
  const faqCategories = locale === 'en' ? faqCategoriesEn : faqCategoriesAr;
  const faqs = locale === 'en' ? faqsEn : faqsAr;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  // Single-open per section to avoid cross-opening
  const [openPopularId, setOpenPopularId] = useState<number | null>(null);
  const [openListId, setOpenListId] = useState<number | null>(null);

  const filteredFAQs = filterFAQs(faqs, searchTerm, selectedCategory);
  const popularFAQs = getPopularFAQs(faqs);
  const showingPopular = !searchTerm && !selectedCategory;
  const popularIds = new Set(popularFAQs.slice(0, 6).map(f => f.id));
  const listFAQs = showingPopular
    ? filteredFAQs.filter(f => !popularIds.has(f.id))
    : filteredFAQs;

  // Reset open states when filters/search change
  useEffect(() => {
    if (!showingPopular) setOpenPopularId(null);
    setOpenListId(null);
  }, [searchTerm, selectedCategory, showingPopular]);

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="faq" setCurrentPage={setCurrentPage} />
      
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('faq')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('faqSubtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder={`${t('search')} ${t('in')} ${t('faq')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12 py-3 text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">{t('categories')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <HelpCircle className="h-6 w-6" />
              <span className="text-sm">{t('all')}</span>
            </Button>
            {faqCategories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <category.icon className="h-6 w-6" />
                <span className="text-sm">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Popular FAQs */}
        {!searchTerm && !selectedCategory && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{t('mostPopularQuestions')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {popularFAQs.slice(0, 6).map(faq => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openPopularId === faq.id}
                  onToggle={(open) => setOpenPopularId(open ? faq.id : null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All FAQs */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory ? 
              getCategoryById(faqCategories, selectedCategory)?.name :
              t('allQuestions')
            }
            <span className="text-muted-foreground text-lg mr-2">({filteredFAQs.length})</span>
          </h2>
          
          {listFAQs.length === 0 ? (
            <Card className="p-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">{t('noQuestionsFound')}</h3>
              <p className="text-muted-foreground mb-4">{t('tryDifferentSearchOrCategory')}</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}>
                {t('viewAllQuestions')}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {listFAQs.map(faq => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openListId === faq.id}
                  onToggle={(open) => setOpenListId(open ? faq.id : null)}
                  showPopularBadge={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact Support */}
        <Card className="mt-16 p-8 text-center">
          <CardContent>
            <h3 className="text-xl font-bold mb-4">{t('noAnswerFoundQuestion')}</h3>
            <p className="text-muted-foreground mb-6">{t('supportTeamReady')}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setCurrentPage('support')}>
                {t('customerSupport') || (locale==='ar' ? 'الدعم الفني' : 'Customer Support')}
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage('support')}>
                {t('customerSupport') || (locale==='ar' ? 'الدعم الفني' : 'Customer Support')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}