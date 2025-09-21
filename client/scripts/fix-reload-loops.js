const fs = require('fs');
const path = require('path');

// Script to automatically fix reload loops in Next.js pages
// This will find and fix common patterns that cause reload loops

const problematicPatterns = [
  // Pattern 1: useEffect with context/locale dependencies
  {
    find: /}, \[.*(?:context|locale|rest|hideFirstOverlay|showLoading|hideLoading).*\];/g,
    replace: '], []); // Remove dependencies to prevent reload loops'
  },
  // Pattern 2: useCallback with locale/context dependencies
  {
    find: /}, \[.*(?:locale|context|rest|isAr|hideFirstOverlay).*\]\);$/gm,
    replace: '], []); // Remove dependencies to prevent reload loops'
  }
];

const filesToFix = [
  'pages/technician/TechnicianServices.tsx',
  'pages/technician/TechnicianProjects.tsx', 
  'pages/Support.tsx',
  'pages/ServiceDetails.tsx',
  'pages/Rentals.tsx',
  'pages/RentalContract.tsx',
  'pages/Projects.tsx',
  'pages/ProjectDetails.tsx',
  'pages/ProjectChat.tsx',
  'pages/ProductListing.tsx',
  'pages/MyOrders.tsx',
  'pages/ChatInbox.tsx',
  'pages/admin/AdminReports.tsx',
  'pages/admin/AdminProductOptions.tsx',
  'pages/vendor/VendorProjectDetails.tsx',
  'pages/vendor/VendorAnalytics.tsx'
];

const clientDir = 'd:/Al-Faare/Construction_Marketplace/client';

console.log('Starting to fix reload loops...');

filesToFix.forEach(file => {
  const fullPath = path.join(clientDir, file);
  
  if (fs.existsSync(fullPath)) {
    console.log(`Fixing ${file}...`);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    problematicPatterns.forEach(pattern => {
      content = content.replace(pattern.find, pattern.replace);
    });
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed ${file}`);
  } else {
    console.log(`⚠ File not found: ${file}`);
  }
});

console.log('Reload loops fixed!');
