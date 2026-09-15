const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== VERIFYING MANUAL REGISTRATION BLANK INPUTS & VALIDATION ===\n');

const htmlPath = path.join(__dirname, '../preview/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const tests = [
  { name: 'loginEmail has no dummy value', check: html.includes('id="loginEmail" placeholder="Email" value=""') },
  { name: 'signUpName has no dummy value', check: html.includes('id="signUpName" placeholder="Full Name" value=""') },
  { name: 'signUpEmail has no dummy value', check: html.includes('id="signUpEmail" placeholder="Email" value=""') },
  { name: 'signUpAge has no dummy value', check: html.includes('id="signUpAge" placeholder="e.g. 24" value=""') },
  { name: 'signUpWeight has no dummy value', check: html.includes('id="signUpWeight" placeholder="e.g. 70" value=""') },
  { name: 'signUpHeight has no dummy value', check: html.includes('id="signUpHeight" placeholder="e.g. 175" value=""') },
  { name: 'googleProfileInputAge has no dummy value', check: html.includes('id="googleProfileInputAge" placeholder="e.g. 24" value=""') },
  { name: 'googleProfileInputWeight has no dummy value', check: html.includes('id="googleProfileInputWeight" placeholder="e.g. 70" value=""') },
  { name: 'googleProfileInputHeight has no dummy value', check: html.includes('id="googleProfileInputHeight" placeholder="e.g. 175" value=""') },
  { name: 'No manual chip has active class by default', check: !html.includes('class="activity-chip active"') && !html.includes('class="activity-chip google-activity-chip active"') }
];

let failed = false;
tests.forEach(t => {
  if (t.check) {
    console.log(`  ✓ ${t.name}`);
  } else {
    console.error(`  ✗ FAILED: ${t.name}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
}

// Test manual registration API
const testEmail = 'manual.tester.' + Date.now() + '@wellness.io';
const payload = JSON.stringify({
  name: 'Manual Tester',
  email: testEmail,
  password: 'securePassword123',
  age: 26,
  weight: 75,
  height: 180,
  gymFrequency: '4-5 days/wk'
});

const req = http.request('http://localhost:8080/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('\n[API Test] Register manual user status:', res.statusCode);
    console.log('  Target Calories:', json.user.nutritionTargets ? json.user.nutritionTargets.targetCalories : 'none');
    
    if (res.statusCode === 201 && json.success && json.user.nutritionTargets) {
      console.log('  ✓ Manual registration computed personalized BMR & targets!');
      console.log('\n=== ALL MANUAL REGISTRATION CLEAN INPUT TESTS PASSED! ===');
    } else {
      console.error('  ✗ Manual registration failed:', json);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('API request error:', err);
  process.exit(1);
});

req.write(payload);
req.end();
