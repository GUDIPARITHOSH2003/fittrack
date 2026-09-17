const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('preview/index.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost:8080',
  runScripts: 'dangerously',
  resources: 'usable'
});

const { window } = dom;

setTimeout(() => {
  const { document, localStorage } = window;
  console.log('[TEST] Checking performUserLogout:', typeof window.performUserLogout);

  const email = 'gudhiparithosh@gmail.com';
  const user = {
    email: email,
    name: 'gudi parithosh',
    nutritionTargets: { targetCalories: 3087, targetProtein: 193, targetCarbs: 424, targetFats: 69, targetWater: 2400 }
  };
  localStorage.setItem('fittrack_token', 'test_tok_123');
  localStorage.setItem('fittrack_user', JSON.stringify(user));

  // 1. Find and check Hammer Curls
  const hammerCard = document.querySelector('.exercise-item-card[data-id="hammer_curl"]');
  if (!hammerCard) {
    console.error('FAIL: hammer_curl card not found!');
    process.exit(1);
  }
  const checkBtn = hammerCard.querySelector('.checkbox-circle');
  checkBtn.click();

  const titleBefore = hammerCard.querySelector('.exercise-title');
  console.log('[TEST] Hammer curls title style:', titleBefore.getAttribute('style'));
  console.log('[TEST] Hammer curls title classes:', titleBefore.className);
  console.log('[TEST] Card classes:', hammerCard.className);

  const saved1 = JSON.parse(localStorage.getItem('fittrack_data_' + email) || '{}');
  console.log('[TEST] Active burned saved:', saved1.activeBurned);
  console.log('[TEST] Completed set map saved:', saved1.completedSetMap);

  if (!saved1.completedSetMap['hammer_curl_1']) {
    console.error('FAIL: hammer_curl_1 not saved in completedSetMap!');
    process.exit(1);
  }

  // 2. Perform user logout
  console.log('[TEST] Triggering user logout...');
  window.performUserLogout();

  console.log('[TEST] Token after logout:', localStorage.getItem('fittrack_token'));
  const savedAfterLogout = localStorage.getItem('fittrack_data_' + email);
  console.log('[TEST] Data after logout exists:', !!savedAfterLogout);
  if (!savedAfterLogout) {
    console.error('FAIL: fittrack_data was wiped on logout!');
    process.exit(1);
  }

  console.log('SUCCESS: Workout completion and persistence verified successfully!');
  process.exit(0);
}, 1500);
