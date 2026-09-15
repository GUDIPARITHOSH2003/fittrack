const http = require('http');
const fs = require('fs');
const path = require('path');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch(e) {
          resolve({ status: res.statusCode, text: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING GOOGLE AUTH & POPUP FLOW TESTS ===');

  // Test 1: Fetch preview/index.html to ensure modals exist
  console.log('\n[Test 1] Verify HTML Modal Elements in Live Server...');
  const htmlRes = await makeRequest('/');
  const html = htmlRes.text || '';
  const requiredElements = [
    'id="googleModalBackdrop"',
    'id="googleProfileModalBackdrop"',
    'id="googleProfileInputName"',
    'id="googleProfileInputAge"',
    'id="googleProfileInputWeight"',
    'id="googleProfileInputHeight"',
    'google-activity-chip',
    'id="googleProfileSubmitBtn"',
    'app.js?v=google_popup_v6'
  ];

  for (const elem of requiredElements) {
    if (html.includes(elem)) {
      console.log(`  ✓ Found: ${elem}`);
    } else {
      console.error(`  ✗ MISSING: ${elem}`);
      process.exit(1);
    }
  }

  // Test 2: Check Google User Check API (/api/auth/google/check)
  console.log('\n[Test 2] Check /api/auth/google/check with existing email...');
  const checkRes = await makeRequest('/api/auth/google/check', 'POST', { email: 'parithosh@gmail.com' });
  console.log('  Status:', checkRes.status);
  console.log('  Result:', checkRes.data);
  if (!checkRes.data.success || !checkRes.data.exists) {
    console.error('  ✗ Expected existing user check to return exists: true');
    process.exit(1);
  }
  console.log('  ✓ Successfully verified existing Google user check returns stored profile info');

  // Test 3: Check Google User Check API with fresh email
  console.log('\n[Test 3] Check /api/auth/google/check with fresh email...');
  const uniqueEmail = `test.google.${Date.now()}@gmail.com`;
  const freshCheckRes = await makeRequest('/api/auth/google/check', 'POST', { email: uniqueEmail });
  console.log('  Status:', freshCheckRes.status);
  console.log('  Result:', freshCheckRes.data);
  if (!freshCheckRes.data.success || freshCheckRes.data.exists !== false) {
    console.error('  ✗ Expected fresh user check to return exists: false');
    process.exit(1);
  }
  console.log('  ✓ Fresh Google email check returns exists: false (triggers profile popup with fresh defaults)');

  // Test 4: Perform Complete Google Registration with Physical Metrics
  console.log('\n[Test 4] Submit Profile Setup Popup for Fresh Google User (/api/auth/google)...');
  const googleRegPayload = {
    email: uniqueEmail,
    name: 'Rohan Sharma',
    age: 26,
    weight: 71.5,
    height: 178,
    gymFrequency: '4-5 days/wk'
  };

  const regRes = await makeRequest('/api/auth/google', 'POST', googleRegPayload);
  console.log('  Status:', regRes.status);
  console.log('  Response:', regRes.data);

  if (!regRes.data.success || !regRes.data.token || !regRes.data.user) {
    console.error('  ✗ Google registration with profile details failed');
    process.exit(1);
  }

  if (regRes.data.user.age !== 26 || regRes.data.user.weight !== 71.5 || regRes.data.user.height !== 178) {
    console.error('  ✗ Physical metrics were not recorded correctly on user object');
    process.exit(1);
  }
  console.log('  ✓ Successfully registered Google user with age, weight, height, and gymFrequency');

  // Test 5: Verify Session with Bearer Token (/api/auth/me)
  console.log('\n[Test 5] Verify Authenticated Session with Bearer token...');
  const meRes = await makeRequest('/api/auth/me', 'GET', null, {
    'Authorization': `Bearer ${regRes.data.token}`
  });
  console.log('  Status:', meRes.status);
  console.log('  User session:', meRes.data);
  if (!meRes.data.success || meRes.data.user.email !== uniqueEmail) {
    console.error('  ✗ Session verification failed');
    process.exit(1);
  }
  console.log('  ✓ Verified active authenticated session');

  console.log('\n=== ALL GOOGLE AUTH POPUP FLOW TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
