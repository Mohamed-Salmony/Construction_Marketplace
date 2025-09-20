export const filterFAQs = (
  faqs: any[],
  searchTerm: string,
  selectedCategory: string
) => {
  return faqs.filter(faq => {
    const matchesSearch = faq.question.includes(searchTerm) || faq.answer.includes(searchTerm);
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
};

export const getPopularFAQs = (faqs: any[]) => {
  return faqs.filter(faq => faq.popular);
};

export const getCategoryById = (categories: any[], categoryId: string) => {
  return categories.find(cat => cat.id === categoryId);
};