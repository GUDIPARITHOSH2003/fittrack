const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING DIRECT 1-CLICK GOOGLE ACCOUNT CHOOSER FLOW ===\n');

// 1. Verify HTML has direct slots and intermediate modal is removed
const htmlPath = path.join(__dirname, '../preview/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const checks = [
  { test: 'gsiLoginBtnContainer (Login direct slot)', pass: html.includes('id="gsiLoginBtnContainer"') },
  { test: 'gsiSignUpBtnContainer (Sign Up direct slot)', pass: html.includes('id="gsiSignUpBtnContainer"') },
  { test: 'Intermediate #googleModalBackdrop removed', pass: !html.includes('id="googleModalBackdrop"') },
  { test: 'Google Identity Services SDK loaded', pass: html.includes('https://accounts.google.com/gsi/client') },
  { test: 'Google Profile popup modal retained', pass: html.includes('id="googleProfileModalBackdrop"') },
  { test: 'Google Cloud config setup modal retained', pass: html.includes('id="googleConfigModalBackdrop"') }
];

checks.forEach(c => {
  if (c.pass) {
    console.log(`  ✓ ${c.test}`);
  } else {
    console.error(`  ✗ FAILED: ${c.test}`);
    process.exit(1);
  }
});

// 2. Verify server returns user's Client ID
http.get('http://localhost:8080/api/auth/google/config', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const config = JSON.parse(body);
    console.log('\n[2] Google Config API:');
    console.log('  Client ID:', config.clientId);
    console.log('  Status:', config.setupStatus);

    if (config.clientId === '596130829554-dgiorsc23e95b0n7a1avotg0i5s4lmkv.apps.googleusercontent.com') {
      console.log('  ✓ User client ID verified correctly.');
    } else {
      console.error('  ✗ Unexpected client ID:', config.clientId);
      process.exit(1);
    }

    console.log('\n=== DIRECT 1-CLICK GOOGLE SIGN-IN TESTS PASSED! ===');
  });
}).on('error', (err) => {
  console.error('Server request failed:', err);
  process.exit(1);
});
