const http = require('http');

function apiCall(path, method = 'GET', data = null, headers = {}) {
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
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, text: body });
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

async function runComprehensiveBackendTests() {
  console.log('========================================================');
  console.log('   FITTRACK GOOGLE AUTHENTICATION BACKEND TEST SUITE    ');
  console.log('========================================================\n');

  // Test 1: GET /api/auth/google/config
  console.log('[Test 1] Testing GET /api/auth/google/config...');
  const configRes = await apiCall('/api/auth/google/config', 'GET');
  console.log('  Status:', configRes.status);
  console.log('  Config:', configRes.data);
  if (configRes.status !== 200 || !configRes.data.clientId || !configRes.data.scopes) {
    throw new Error('GET /api/auth/google/config failed');
  }
  console.log('  ✓ Verified Google OAuth client configuration endpoint.\n');

  // Test 2: POST /api/auth/google/check for fresh user
  const testEmail = `google.athlete.${Date.now()}@gmail.com`;
  console.log(`[Test 2] Testing POST /api/auth/google/check for new email (${testEmail})...`);
  const checkFresh = await apiCall('/api/auth/google/check', 'POST', { email: testEmail });
  console.log('  Status:', checkFresh.status);
  console.log('  Check result:', checkFresh.data);
  if (!checkFresh.data.success || checkFresh.data.exists !== false) {
    throw new Error('New email check failed');
  }
  console.log('  ✓ Verified account non-existence check for fresh Google user.\n');

  // Test 3: POST /api/auth/google - Provision new Google user with physical metrics
  console.log('[Test 3] Testing POST /api/auth/google with physical metrics & target calculation...');
  const regPayload = {
    email: testEmail,
    name: 'Devin Thorne',
    age: 28,
    weight: 75.0,
    height: 182.0,
    gymFrequency: '4-5 days/wk'
  };
  const regRes = await apiCall('/api/auth/google', 'POST', regPayload);
  console.log('  Status:', regRes.status);
  console.log('  User Response:', regRes.data);
  if (regRes.status !== 201 || !regRes.data.success || !regRes.data.token) {
    throw new Error('Google user registration failed');
  }
  const user = regRes.data.user;
  const token = regRes.data.token;
  if (!user.nutritionTargets || !user.nutritionTargets.targetCalories) {
    throw new Error('Personalized nutritionTargets missing on user');
  }
  console.log(`  ✓ Registered new user with calculated BMR: ${user.nutritionTargets.bmr} kcal, Daily Target: ${user.nutritionTargets.targetCalories} kcal`);
  console.log(`  ✓ Macros: Protein: ${user.nutritionTargets.targetProtein}g, Carbs: ${user.nutritionTargets.targetCarbs}g, Fats: ${user.nutritionTargets.targetFats}g, Water: ${user.nutritionTargets.targetWater}ml\n`);

  // Test 4: Verify Session via GET /api/auth/me
  console.log('[Test 4] Testing GET /api/auth/me with Bearer token...');
  const meRes = await apiCall('/api/auth/me', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log('  Status:', meRes.status);
  console.log('  Current User:', meRes.data);
  if (meRes.status !== 200 || meRes.data.user.email !== testEmail) {
    throw new Error('Session verification failed');
  }
  console.log('  ✓ Verified authenticated Google session with persistent user state.\n');

  // Test 5: POST /api/auth/google - Update profile details for existing Google user
  console.log('[Test 5] Testing POST /api/auth/google updating physical metrics for existing user...');
  const updatePayload = {
    email: testEmail,
    name: 'Devin Thorne (Pro)',
    age: 28,
    weight: 72.0,
    height: 182.0,
    gymFrequency: '6-7 days/wk'
  };
  const updateRes = await apiCall('/api/auth/google', 'POST', updatePayload);
  console.log('  Status:', updateRes.status);
  console.log('  Updated User:', updateRes.data.user);
  if (updateRes.status !== 200 || updateRes.data.isNewUser !== false) {
    throw new Error('User update failed');
  }
  const updatedUser = updateRes.data.user;
  console.log(`  ✓ Re-calculated Daily Target for 6-7 days frequency: ${updatedUser.nutritionTargets.targetCalories} kcal (Updated from ${user.nutritionTargets.targetCalories} kcal)\n`);

  // Test 6: POST /api/auth/google/check for now existing user
  console.log('[Test 6] Testing POST /api/auth/google/check for existing user...');
  const checkExisting = await apiCall('/api/auth/google/check', 'POST', { email: testEmail });
  console.log('  Status:', checkExisting.status);
  console.log('  Check result:', checkExisting.data);
  if (!checkExisting.data.success || !checkExisting.data.exists || !checkExisting.data.user.nutritionTargets) {
    throw new Error('Existing user check failed');
  }
  console.log('  ✓ Successfully verified existing user check returns complete profile & nutrition targets.\n');

  // Test 7: POST /api/auth/google/verify-token with invalid token
  console.log('[Test 7] Testing POST /api/auth/google/verify-token error handling...');
  const verifyTokenRes = await apiCall('/api/auth/google/verify-token', 'POST', {
    idToken: 'invalid_dummy_google_jwt_token'
  });
  console.log('  Status:', verifyTokenRes.status);
  console.log('  Response:', verifyTokenRes.data);
  if (verifyTokenRes.status !== 401) {
    throw new Error('Invalid token should return 401');
  }
  console.log('  ✓ Token verification rejected fake token with 401 as expected.\n');

  // Test 8: POST /api/auth/google/disconnect (Revoke session)
  console.log('[Test 8] Testing POST /api/auth/google/disconnect...');
  const disconnectRes = await apiCall('/api/auth/google/disconnect', 'POST', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log('  Status:', disconnectRes.status);
  console.log('  Result:', disconnectRes.data);
  if (disconnectRes.status !== 200) {
    throw new Error('Disconnect failed');
  }

  // Confirm session is no longer valid
  const postDisconnectMe = await apiCall('/api/auth/me', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });
  if (postDisconnectMe.status !== 401) {
    throw new Error('Session should be unauthorized after disconnect');
  }
  console.log('  ✓ Verified token revocation and disconnect.\n');

  console.log('========================================================');
  console.log('   ALL 8 GOOGLE AUTH BACKEND TESTS PASSED CLEANLY!     ');
  console.log('========================================================');
}

runComprehensiveBackendTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
