// Simple script to check which environment variables are loaded
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
console.log('');

// Check which env files exist
const fs = require('fs');
const envFiles = [
  '.env.development.local',
  '.env.local', 
  '.env.development',
  '.env'
];

console.log('📁 Environment Files:');
envFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
});

console.log('');
console.log('🎯 Expected for Development:');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with: pk_test_');
console.log('Actual starts with:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 7));