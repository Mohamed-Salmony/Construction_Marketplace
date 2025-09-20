export const getStatusColor = (status: string) => {
  switch (status) {
    // Product statuses
    case 'active': return 'bg-green-100 text-green-700';
    case 'draft': return 'bg-yellow-100 text-yellow-700';
    case 'out_of_stock': return 'bg-red-100 text-red-700';
    case 'inactive': return 'bg-gray-100 text-gray-700';
    // Order statuses
    case 'pending': return 'bg-orange-100 text-orange-700';
    case 'processing': return 'bg-blue-100 text-blue-700';
    case 'shipped': return 'bg-indigo-100 text-indigo-700';
    case 'delivered': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const getStatusText = (status: string) => {
  // Note: Prefer using i18n in components for localized status text.
  switch (status) {
    case 'active': return 'نشط';
    case 'draft': return 'مسودة';
    case 'out_of_stock': return 'نفد المخزون';
    case 'inactive': return 'غير نشط';
    // Fallbacks for order statuses (Arabic by default)
    case 'pending': return 'في الانتظار';
    case 'processing': return 'قيد المعالجة';
    case 'shipped': return 'في الطريق';
    case 'delivered': return 'تم التوصيل';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};

export const formatDate = (dateString: string, locale: 'ar' | 'en' = 'ar') => {
  return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US');
};

// Ensure deterministic numeral rendering across SSR/CSR by explicitly setting locale
// Default to Arabic since the app is primarily Arabic, but allow passing 'en' when needed
export const formatCurrency = (amount: number, locale: 'ar' | 'en' = 'ar') => {
  const number = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  const symbol = locale === 'ar' ? 'ر.س' : 'SAR';
  return `${number} ${symbol}`;
};

export const getStockStatus = (stock: number) => {
  if (stock === 0) return { color: 'text-red-500', text: 'نفد المخزون' };
  if (stock < 10) return { color: 'text-orange-500', text: 'مخزون منخفض' };
  return { color: 'text-green-500', text: 'متوفر' };
};