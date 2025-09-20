import { Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getStatusColor, getStatusText, formatCurrency, getStockStatus } from '../../utils/vendorHelpers';
import { useTranslation } from '../../hooks/useTranslation';

interface ProductItemProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (productId: string) => void;
  onView: (product: any) => void;
}

export default function ProductItem({ product, onEdit, onDelete, onView }: ProductItemProps) {
  const stockStatus = getStockStatus(product.stock);
  const { locale } = useTranslation();
  const getText = (val: any): string => {
    if (val && typeof val === 'object') {
      return val[locale] ?? val.ar ?? val.en ?? '';
    }
    return String(val ?? '');
  };
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 flex-1">
        <ImageWithFallback
          src={product.image}
          alt={getText(product.name)}
          className="w-16 h-16 object-cover rounded-lg"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{getText(product.name)}</h3>
          <p className="text-sm text-muted-foreground">{getText(product.brand)} | {getText(product.category)}</p>
          <p className="text-xs text-muted-foreground">{locale === 'en' ? 'Part Number' : 'رقم القطعة'}: {product.partNumber}</p>
          {product.partLocation ? (
            <p className="text-xs text-muted-foreground mt-1">
              {locale === 'en' ? 'Part Location' : 'مكان القطعة'}: {String(product.partLocation)}
            </p>
          ) : null}
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary">{formatCurrency(product.price, locale === 'en' ? 'en' : 'ar')}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice, locale === 'en' ? 'en' : 'ar')}
                </span>
              )}
            </div>
            
            <div className="text-sm">
              <span className={stockStatus.color}>
                {locale === 'en' ? 'Stock' : 'المخزون'}: {product.stock}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {locale === 'en' ? 'Sales' : 'المبيعات'}: {product.sales}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Badge className={getStatusColor(product.status)}>
          {getStatusText(product.status)}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
          <Edit className="h-4 w-4 ml-1" />
          {locale === 'en' ? 'Edit' : 'تعديل'}
        </Button>
        <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => onDelete(product.id)}>
          <Trash2 className="h-4 w-4 ml-1" />
          {locale === 'en' ? 'Delete' : 'حذف'}
        </Button>
      </div>
    </div>
  );
}
