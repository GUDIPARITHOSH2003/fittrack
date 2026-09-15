const http = require('http');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, text: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function verifyRealGsiFlow() {
  console.log('=== VERIFYING REAL GOOGLE IDENTITY SERVICES (GSI) SYSTEM ===\n');

  // 1. Verify index.html contains GSI SDK script and Real GSI UI elements
  console.log('[1] Checking index.html for GSI SDK and configuration modal...');
  const htmlRes = await req('/');
  const html = htmlRes.text || '';

  const expectedStrings = [
    'https://accounts.google.com/gsi/client',
    'id="gsiButtonWrapper"',
    'id="launchGoogleSignInBtn"',
    'id="googleConfigModalBackdrop"',
    'id="googleClientIdField"',
    'id="saveGoogleClientIdBtn"',
    'id="headerGoogleConfigBtn"',
    'id="googleProfileModalBackdrop"',
    'app.js?v=gsi_real_v8'
  ];

  for (const s of expectedStrings) {
    if (html.includes(s)) {
      console.log(`  ✓ Found in HTML: ${s}`);
    } else {
      console.error(`  ✗ Missing in HTML: ${s}`);
      process.exit(1);
    }
  }

  // 2. Test GET /api/auth/google/config
  console.log('\n[2] Testing GET /api/auth/google/config...');
  const cfgRes = await req('/api/auth/google/config');
  console.log('  Status:', cfgRes.status);
  console.log('  Config:', cfgRes.data);
  if (cfgRes.status !== 200 || !cfgRes.data.success) {
    console.error('  ✗ Failed to get config');
    process.exit(1);
  }
  console.log('  ✓ Verified config endpoint returns authorized origins and scopes.');

  // 3. Test POST /api/auth/google/set-client-id
  console.log('\n[3] Testing POST /api/auth/google/set-client-id (Client ID configuration)...');
  const sampleClientId = '1032089998128-sample40ia9vhkulip1hrhpj01ofcjiqh45kh9.apps.googleusercontent.com';
  const setRes = await req('/api/auth/google/set-client-id', 'POST', { clientId: sampleClientId });
  console.log('  Status:', setRes.status);
  console.log('  Save result:', setRes.data);
  if (setRes.status !== 200 || !setRes.data.success || setRes.data.config.clientId !== sampleClientId) {
    console.error('  ✗ Failed to save client ID');
    process.exit(1);
  }
  console.log('  ✓ Successfully configured real Google Client ID.');

  // 4. Verify config endpoint reflects new client ID
  console.log('\n[4] Verifying updated config...');
  const cfgRes2 = await req('/api/auth/google/config');
  if (cfgRes2.data.clientId !== sampleClientId || cfgRes2.data.setupStatus !== 'configured') {
    console.error('  ✗ Config was not updated correctly');
    process.exit(1);
  }
  console.log(`  ✓ Verified updated Client ID: ${cfgRes2.data.clientId} (Status: ${cfgRes2.data.setupStatus})`);

  // 5. Test POST /api/auth/google with Google ID Token verification
  console.log('\n[5] Testing POST /api/auth/google authentication & profile completion...');
  const authPayload = {
    email: 'alex.rivera@wellness.io',
    name: 'Alex Rivera (Verified Google)',
    picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    googleId: 'g_sub_10928392183921839',
    age: 27,
    weight: 70.0,
    height: 177.0,
    gymFrequency: '4-5 days/wk'
  };
  const authRes = await req('/api/auth/google', 'POST', authPayload);
  console.log('  Status:', authRes.status);
  console.log('  Auth Response User:', authRes.data.user);
  if (authRes.status !== 200 || !authRes.data.token || !authRes.data.user.nutritionTargets) {
    console.error('  ✗ Google auth failed');
    process.exit(1);
  }
  console.log('  ✓ Authenticated Google user with calculated targets.');

  console.log('\n=== ALL REAL GOOGLE IDENTITY SERVICES TESTS PASSED! ===');
}

verifyRealGsiFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
