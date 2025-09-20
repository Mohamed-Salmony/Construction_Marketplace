import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useTranslation } from '../hooks/useTranslation';

interface FAQItemProps {
  faq: {
    id: number;
    question: string;
    answer: string;
    popular: boolean;
  };
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  showPopularBadge?: boolean;
}

export default function FAQItem({ faq, isOpen, onToggle, showPopularBadge = true }: FAQItemProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-start gap-3 flex-1">
                {showPopularBadge && faq.popular && (
                  <Badge variant="secondary" className="mt-1">{t('popular')}</Badge>
                )}
                <h3 className="font-medium text-right">{faq.question}</h3>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <p className="text-muted-foreground pr-16">{faq.answer}</p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
