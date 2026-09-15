// Test script to verify hydration reset on a new day
const assert = require('assert');

// Simulate localStorage
const storage = {};
const localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

// Emulate app.js date logic and user state
function getTodayDateString(simulatedDate) {
  if (simulatedDate) return simulatedDate;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const state = {
  waterIntake: 0,
  waterTarget: 2400,
  waterDate: null,
  currentDate: null
};

function checkDayRollover(simulatedDate) {
  const todayStr = getTodayDateString(simulatedDate);
  if (!state.currentDate) state.currentDate = todayStr;

  let dayChanged = false;
  if (state.waterDate && state.waterDate !== todayStr) {
    state.waterIntake = 0;
    state.waterDate = todayStr;
    state.currentDate = todayStr;
    dayChanged = true;
  } else if (state.currentDate !== todayStr) {
    state.currentDate = todayStr;
    state.waterDate = todayStr;
    state.waterIntake = 0;
    dayChanged = true;
  }
  return dayChanged;
}

function logWater(amount, simulatedDate) {
  checkDayRollover(simulatedDate);
  const todayStr = getTodayDateString(simulatedDate);
  state.waterDate = todayStr;
  state.waterIntake += amount;
  
  // Save to localStorage
  const data = {
    waterIntake: state.waterIntake,
    waterDate: state.waterDate,
    date: todayStr
  };
  localStorage.setItem('fittrack_data_test@example.com', JSON.stringify(data));
}

function loadUserData(email, simulatedDate) {
  const todayStr = getTodayDateString(simulatedDate);
  state.currentDate = todayStr;
  const saved = localStorage.getItem('fittrack_data_' + email);
  if (saved) {
    const parsed = JSON.parse(saved);
    const savedWaterDate = parsed.waterDate || parsed.date;
    const isNewDay = savedWaterDate && savedWaterDate !== todayStr;

    if (isNewDay) {
      state.waterIntake = 0;
      state.waterDate = todayStr;
      // Persist reset
      localStorage.setItem('fittrack_data_' + email, JSON.stringify({ ...parsed, waterIntake: 0, waterDate: todayStr }));
    } else {
      state.waterIntake = parsed.waterIntake || 0;
      state.waterDate = savedWaterDate || todayStr;
    }
  }
}

console.log('--- TEST 1: Logging water on Day 1 (2026-09-15) ---');
logWater(250, '2026-09-15');
logWater(250, '2026-09-15');
assert.strictEqual(state.waterIntake, 500, 'Water intake should be 500 ml');
assert.strictEqual(state.waterDate, '2026-09-15', 'Water date should be 2026-09-15');
console.log('✓ Water intake is 500ml on 2026-09-15');

console.log('--- TEST 2: Reloading on same day (2026-09-15) ---');
state.waterIntake = 0; // reset memory state
loadUserData('test@example.com', '2026-09-15');
assert.strictEqual(state.waterIntake, 500, 'Same day reload must retain 500 ml');
console.log('✓ Water intake retained at 500ml on same day');

console.log('--- TEST 3: Midnight rollover during active session ---');
const rolledOver = checkDayRollover('2026-09-16');
assert.strictEqual(rolledOver, true, 'Rollover should be detected');
assert.strictEqual(state.waterIntake, 0, 'Water intake must reset to 0 ml on new day');
assert.strictEqual(state.waterDate, '2026-09-16', 'Water date must update to 2026-09-16');
console.log('✓ In-session midnight rollover successfully reset hydration count to 0ml');

console.log('--- TEST 4: Next-day app reload (2026-09-17) ---');
// User logs 750ml on 2026-09-16
logWater(750, '2026-09-16');
assert.strictEqual(state.waterIntake, 750);

// Next day user launches app
state.waterIntake = -1; // arbitrary memory state before load
loadUserData('test@example.com', '2026-09-17');
assert.strictEqual(state.waterIntake, 0, 'New day load must reset water count to 0 ml');
assert.strictEqual(state.waterDate, '2026-09-17', 'Water date should be 2026-09-17');
console.log('✓ Next day reload successfully reset hydration count to 0ml');

console.log('\nALL HYDRATION RESET TESTS PASSED! 🎉');
