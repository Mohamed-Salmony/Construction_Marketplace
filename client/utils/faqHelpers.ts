export const filterFAQs = (
  faqs: any[],
  searchTerm: string,
  selectedCategory: string
) => {
  if (!faqs || !Array.isArray(faqs)) {
    return [];
  }
  
  return faqs.filter(faq => {
    // Safe check for undefined properties
    const question = faq?.question || '';
    const answer = faq?.answer || '';
    const category = faq?.category || '';
    
    const matchesSearch = !searchTerm || 
      question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
};

export const getPopularFAQs = (faqs: any[]) => {
  if (!faqs || !Array.isArray(faqs)) {
    return [];
  }
  return faqs.filter(faq => faq?.popular === true);
};

export const getCategoryById = (categories: any[], categoryId: string) => {
  if (!categories || !Array.isArray(categories) || !categoryId) {
    return null;
  }
  return categories.find(cat => cat?.id === categoryId);
};