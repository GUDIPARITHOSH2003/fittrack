const http = require('http');

console.log('=== TESTING ONBOARDING LOGIC & RE-ASK PREVENTION ===\n');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`http://localhost:8080${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  try {
    // 1. Check existing user: gudhiparithosh@gmail.com
    console.log('[Test 1] Checking existing user gudhiparithosh@gmail.com...');
    const check1 = await post('/api/auth/google/check', { email: 'gudhiparithosh@gmail.com' });
    console.log('  Response:', check1.data);
    if (check1.data.exists && check1.data.hasProfile) {
      console.log('  ✓ Existing user correctly recognized as having completed profile! (Profile modal will be skipped)');
    } else {
      console.error('  ✗ Failed to recognize existing user profile');
      process.exit(1);
    }

    // 2. Existing user login without resending metrics
    console.log('\n[Test 2] Logging in existing user without resending age/weight/height...');
    const login1 = await post('/api/auth/google', {
      email: 'gudhiparithosh@gmail.com',
      name: 'gudi parithosh'
    });
    console.log('  Status:', login1.status, '| User:', login1.data.user.name, '| Target:', login1.data.user.nutritionTargets.targetCalories, 'kcal');
    if (login1.status === 200 && login1.data.success && login1.data.user.age === 25) {
      console.log('  ✓ Successfully logged in returning user with saved metrics preserved!');
    } else {
      console.error('  ✗ Login failed for returning user');
      process.exit(1);
    }

    // 3. Check new user: new.person.99@gmail.com
    console.log('\n[Test 3] Checking brand new user new.person.99@gmail.com...');
    const check2 = await post('/api/auth/google/check', { email: 'new.person.99@gmail.com' });
    console.log('  Response:', check2.data);
    if (!check2.data.exists && !check2.data.hasProfile) {
      console.log('  ✓ Brand new user correctly recognized as NOT having profile! (Profile modal WILL be shown)');
    } else {
      console.error('  ✗ New user was falsely reported as existing');
      process.exit(1);
    }

    // 4. New user registration without metrics should be rejected
    console.log('\n[Test 4] Attempting registration of new user without metrics...');
    const rej = await post('/api/auth/google', {
      email: 'new.person.99@gmail.com',
      name: 'New Person'
    });
    console.log('  Status:', rej.status, '| Message:', rej.data.message);
    if (rej.status === 400) {
      console.log('  ✓ Correctly rejected incomplete registration. User must enter age, weight, height!');
    } else {
      console.error('  ✗ Incomplete registration was not rejected');
      process.exit(1);
    }

    // 5. New user registration with user-entered metrics
    console.log('\n[Test 5] Completing registration with user-entered metrics (Age 23, Weight 74kg, Height 182cm)...');
    const reg = await post('/api/auth/google', {
      email: 'new.person.99@gmail.com',
      name: 'New Person',
      age: 23,
      weight: 74,
      height: 182,
      gymFrequency: '4-5 days/wk'
    });
    console.log('  Status:', reg.status, '| Target Calories:', reg.data.user.nutritionTargets.targetCalories);
    if (reg.status === 201 && reg.data.isNewUser) {
      console.log('  ✓ New user successfully registered with customized BMR targets!');
    } else {
      console.error('  ✗ Failed to register new user with metrics');
      process.exit(1);
    }

    // 6. Now check this same user again — should now report exists: true, hasProfile: true!
    console.log('\n[Test 6] Checking new user again after registration...');
    const check3 = await post('/api/auth/google/check', { email: 'new.person.99@gmail.com' });
    if (check3.data.exists && check3.data.hasProfile) {
      console.log('  ✓ Now correctly recognized as existing profile! Future logins will skip profile modal.');
    } else {
      console.error('  ✗ Profile completion was not recorded');
      process.exit(1);
    }

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
