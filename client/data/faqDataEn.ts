import { HelpCircle, Package, Truck, CreditCard, Shield, RefreshCw } from 'lucide-react';

export const faqCategoriesEn = [
  { id: 'general', name: 'General Questions', icon: HelpCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'orders', name: 'Orders', icon: Package, color: 'bg-green-100 text-green-700' },
  { id: 'shipping', name: 'Shipping & Delivery', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  { id: 'payment', name: 'Payment', icon: CreditCard, color: 'bg-orange-100 text-orange-700' },
  { id: 'returns', name: 'Returns & Exchanges', icon: RefreshCw, color: 'bg-red-100 text-red-700' },
  { id: 'security', name: 'Security & Privacy', icon: Shield, color: 'bg-gray-100 text-gray-700' }
];

export const faqsEn = [
  // General Questions
  {
    id: 1,
    category: 'general',
    question: 'What is Al Aaref platform?',
    answer: 'Al Aaref is an online platform specialized in construction services and products. We connect customers with specialized vendors and contractors to offer the best quality at competitive prices.',
    popular: true
  },
  {
    id: 2,
    category: 'general',
    question: 'How can I find the right service or product?',
    answer: 'You can search by service name, category, or browse the available sections. You can also use filters to show only relevant options for your project.',
    popular: true
  },
  {
    id: 3,
    category: 'general',
    question: 'Are the listed services and materials certified?',
    answer: 'We offer certified services and high-quality materials. Each listing clearly indicates specifications and standards, and we stand behind the quality provided by our partners.',
    popular: false
  },
  {
    id: 4,
    category: 'general',
    question: 'Can I request a service or product that is not listed?',
    answer: 'Yes. Contact our customer service and we will source the requested service or product through our network of suppliers and contractors.',
    popular: false
  },

  // Orders
  {
    id: 5,
    category: 'orders',
    question: 'How can I track my order?',
    answer: 'After the order is confirmed, you will receive a tracking number via email or SMS. Use this number on the "Track Order" page to check your shipment status.',
    popular: true
  },
  {
    id: 6,
    category: 'orders',
    question: 'How long does it take to prepare the order?',
    answer: 'Orders are usually prepared within 1–2 business days. Some special parts may take longer and you will be informed accordingly.',
    popular: true
  },
  {
    id: 7,
    category: 'orders',
    question: 'Can I modify or cancel my order?',
    answer: 'You can modify or cancel your order within 30 minutes of placing it. After that, please contact customer service for assistance.',
    popular: false
  },
  {
    id: 8,
    category: 'orders',
    question: 'What if I receive the wrong part?',
    answer: 'If you receive an incorrect item, please contact us within 48 hours of receipt and we will arrange a free replacement.',
    popular: false
  },

  // Shipping
  {
    id: 9,
    category: 'shipping',
    question: 'What are the shipping costs?',
    answer: 'Shipping is free for orders over 200 SAR. For smaller orders, standard shipping costs 25 SAR and express shipping costs 35 SAR.',
    popular: true
  },
  {
    id: 10,
    category: 'shipping',
    question: 'How long does delivery take?',
    answer: 'Standard shipping takes 3–5 business days, and express shipping takes 1–2 business days. Delivery time may vary by region.',
    popular: true
  },
  {
    id: 11,
    category: 'shipping',
    question: 'Do you ship to all regions of the Kingdom?',
    answer: 'Yes, we ship to all regions of Saudi Arabia. Delivery times may vary by region.',
    popular: false
  },
  {
    id: 12,
    category: 'shipping',
    question: 'Can I schedule a delivery time?',
    answer: 'Yes, you can choose your preferred delivery time (morning or evening) when completing your order.',
    popular: false
  },

  // Payment
  {
    id: 13,
    category: 'payment',
    question: 'What payment methods are available?',
    answer: 'We accept credit cards (Visa, MasterCard), Mada, cash on delivery, and bank transfer.',
    popular: true
  },
  {
    id: 14,
    category: 'payment',
    question: 'Is payment secure?',
    answer: 'Yes, we use advanced encryption technologies to protect your financial data. All transactions are protected by multiple security layers.',
    popular: true
  },
  {
    id: 15,
    category: 'payment',
    question: 'Is there an extra fee for cash on delivery?',
    answer: 'Yes, there is a 15 SAR fee for cash on delivery to cover service costs.',
    popular: false
  },

  // Returns
  {
    id: 16,
    category: 'returns',
    question: 'What is the return policy?',
    answer: 'You can return products within 30 days from the date of receipt, provided they are in their original condition with packaging.',
    popular: true
  },
  {
    id: 17,
    category: 'returns',
    question: 'How can I request a return?',
    answer: 'You can request a return through your account on the website or by contacting customer service. We will arrange a pickup for the product.',
    popular: false
  },
  {
    id: 18,
    category: 'returns',
    question: 'When will I receive my refund?',
    answer: 'Refunds are processed within 3–7 business days after receiving and inspecting the returned product.',
    popular: false
  },

  // Security
  {
    id: 19,
    category: 'security',
    question: 'How do you protect my personal data?',
    answer: 'We are committed to protecting your privacy and use the latest security technologies to safeguard your data. We do not share your information with third parties.',
    popular: true
  },
  {
    id: 20,
    category: 'security',
    question: 'Can I delete my account?',
    answer: 'Yes, you can request to delete your account by contacting customer service. All your data will be deleted within 30 days.',
    popular: false
  }
];
