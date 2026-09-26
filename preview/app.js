// FitTrack Preview State & Interactions
document.addEventListener('DOMContentLoaded', () => {
  // App State (Starts at 0 for fresh/authenticated users)
  const state = {
    targetCalories: 2300,
    targetCarbs: 180,
    targetProtein: 140,
    targetFats: 65,
    targetFiber: 30,
    consumedCalories: 0,
    carbs: 0,
    protein: 0,
    fats: 0,
    fiber: 0,
    waterIntake: 0,
    waterTarget: 2500,
    waterDate: null,
    currentDate: null,
    activeBurned: 0,
    snackCalories: 0,
    breakfastCalories: 0,
    lunchCalories: 0,
    dinnerCalories: 0,
    workoutActive: false,
    workoutSeconds: 0,
    workoutInterval: null,
    checklistCompleted: 0,
    scannedItem: null
  };

  // Elements
  const consumedEl = document.getElementById('consumedCaloriesText');
  const remainingEl = document.getElementById('remainingCaloriesText');
  const percentBadgeEl = document.getElementById('macroPercentBadge');
  const carbsTextEl = document.getElementById('carbsGramText');
  const proteinTextEl = document.getElementById('proteinGramText');
  const fatsTextEl = document.getElementById('fatsGramText');
  const fiberTextEl = document.getElementById('fiberGramText');

  const proteinRingArc = document.getElementById('proteinRingArc');
  const carbsRingArc = document.getElementById('carbsRingArc');
  const fatsRingArc = document.getElementById('fatsRingArc');
  const fiberRingArc = document.getElementById('fiberRingArc');

  const waterStatusEl = document.getElementById('waterStatusText');
  const waterProgressFill = document.getElementById('waterProgressFill');
  const addWaterBtn = document.getElementById('addWaterBtn');
  const resetWaterBtn = document.getElementById('resetWaterBtn');

  const aiInput = document.getElementById('aiMealInput');
  const aiSubmitBtn = document.getElementById('aiSubmitBtn');
  const suggestionChips = document.querySelectorAll('.suggestion-chip[data-meal]');
  const snackItemList = document.getElementById('snackItemList');
  const snackSummary = document.getElementById('snackSummary');

  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const screenTabs = document.querySelectorAll('.screen-tab');
  const centerScanBtn = document.getElementById('centerScanBtn');
  const scanModalBackdrop = document.getElementById('scanModalBackdrop');
  const closeScanModal = document.getElementById('closeScanModal');
  const openScannerTriggers = document.querySelectorAll('.open-scanner-trigger');
  const headerProfileJump = document.getElementById('headerProfileJump');

  // Workout
  const startWorkoutBtn = document.getElementById('startWorkoutBtn');
  const activeTimerBadge = document.getElementById('activeTimerBadge');
  const activeTimerVal = document.getElementById('activeTimerVal');
  const checklistCountEl = document.getElementById('checklistCount');

  // Scanner Camera & AI Vision Elements
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraSnapshotPreview = document.getElementById('cameraSnapshotPreview');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraFileInput = document.getElementById('cameraFileInput');
  const cameraAiLoading = document.getElementById('cameraAiLoading');
  const cameraLaserLine = document.getElementById('cameraLaserLine');
  const cameraIconHint = document.getElementById('cameraIconHint');
  const snapPhotoBtn = document.getElementById('snapPhotoBtn');
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const retakePhotoBtn = document.getElementById('retakePhotoBtn');
  const detectedFoodCard = document.getElementById('detectedFoodCard');
  const detectedTitle = document.getElementById('detectedTitle');
  const detectedBrand = document.getElementById('detectedBrand');
  const detectedCalories = document.getElementById('detectedCalories');
  const detectedMacros = document.getElementById('detectedMacros');
  const confirmLogScannedBtn = document.getElementById('confirmLogScannedBtn');

  // Profile Slider
  const targetSlider = document.getElementById('targetSlider');
  const sliderValDisplay = document.getElementById('sliderValDisplay');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const phoneFrame = document.getElementById('phoneFrame');

  // Developer Mode Query Parameter (?dev=true or ?debug=1)
  try {
    const devUrlParams = new URLSearchParams(window.location.search);
    if (devUrlParams.get('dev') === 'true' || devUrlParams.get('debug') === '1') {
      const devHeader = document.querySelector('.dev-header');
      if (devHeader) devHeader.classList.add('force-show');
    }
  } catch(e) {}

  // Day Rollover & Date Utilities
  function getTodayDateString() {
    const simulated = localStorage.getItem('fittrack_simulated_date');
    if (simulated) return simulated;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr) {
    let d;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateStr);
      }
    } else {
      d = new Date();
    }
    const options = { month: 'long', day: 'numeric' };
    return `TODAY, ${d.toLocaleDateString('en-US', options).toUpperCase()}`;
  }

  function updateDateDisplay() {
    const todayStr = getTodayDateString();
    const displayStr = formatDisplayDate(todayStr);
    const dateChips = document.querySelectorAll('.tab-header .date-chip, .date-chip');
    dateChips.forEach(chip => {
      if (chip.getAttribute('data-dynamic-date') === 'true' || chip.textContent.includes('SEPTEMBER') || chip.textContent.startsWith('TODAY,') || chip.id === 'nutritionDateChip' || chip.id === 'overviewDateChip') {
        chip.setAttribute('data-dynamic-date', 'true');
        chip.textContent = displayStr;
      }
    });

    const resetBtn = document.getElementById('resetSimulatedDayBtn');
    if (resetBtn) {
      resetBtn.style.display = localStorage.getItem('fittrack_simulated_date') ? 'inline-block' : 'none';
    }
  }

  function checkDayRollover() {
    const todayStr = getTodayDateString();
    if (!state.currentDate) {
      state.currentDate = todayStr;
    }

    let dayChanged = false;
    const lastDate = state.waterDate || state.currentDate;
    if (lastDate && lastDate !== todayStr) {
      console.log(`[FitTrack] Day rollover detected! Previous: ${lastDate}, Today: ${todayStr}. Resetting calories & hydration count to 0.`);
      state.waterIntake = 0;
      state.waterDate = todayStr;
      state.currentDate = todayStr;
      state.consumedCalories = 0;
      state.carbs = 0;
      state.protein = 0;
      state.fats = 0;
      state.fiber = 0;
      state.activeBurned = 0;
      state.snackCalories = 0;
      state.breakfastCalories = 0;
      state.lunchCalories = 0;
      state.dinnerCalories = 0;

      const breakfastItemList = document.getElementById('breakfastItemList');
      if (breakfastItemList) {
        breakfastItemList.innerHTML = '<li class="meal-empty-note">No breakfast logged yet today. Tap + to add food.</li>';
      }
      const lunchItemList = document.getElementById('lunchItemList');
      if (lunchItemList) {
        lunchItemList.innerHTML = '<li class="meal-empty-note">No lunch logged yet today. Tap + to add food.</li>';
      }
      if (snackItemList) {
        snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
      }

      updateMacroRings();
      updateWater();
      updateMealSummaries();
      completedSetMap = {};
      if (typeof renderExerciseChecklist === 'function') renderExerciseChecklist();
      updateOverviewMetrics();
      dayChanged = true;
    }

    updateDateDisplay();

    if (dayChanged) {
      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      } catch (e) {}
      if (curUser && curUser.email) {
        saveUserData(curUser.email);
      }
    }
    return dayChanged;
  }

  // Clock
  function updateClock() {
    const clockEl = document.getElementById('statusClock');
    if (!clockEl) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${minutes}`;
    checkDayRollover();
  }
  updateClock();
  updateDateDisplay();
  setInterval(updateClock, 15000);

  // Check rollover when returning to the tab / window
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkDayRollover();
      updateClock();
    }
  });
  window.addEventListener('focus', () => {
    checkDayRollover();
    updateClock();
  });

  // SVG Ring Progress Calculation (Circumference ≈ 515.22 for r=82)
  const CIRCUMFERENCE = 2 * Math.PI * 82;

  function updateMacroRings() {
    const targetCal = Math.max(state.targetCalories || 2300, 1);
    const consumedCal = Math.max(state.consumedCalories || 0, 0);
    const ratio = Math.min(consumedCal / targetCal, 1.0);
    const percent = Math.round(ratio * 100);

    if (consumedEl) consumedEl.textContent = state.consumedCalories.toLocaleString();
    const remaining = Math.max(state.targetCalories - state.consumedCalories, 0);
    if (remainingEl) remainingEl.textContent = `${remaining.toLocaleString()} kcal left`;
    if (percentBadgeEl) percentBadgeEl.textContent = `${percent}% Done`;

    const ringCaloriesSub = document.querySelector('.ring-calories-sub');
    if (ringCaloriesSub) ringCaloriesSub.textContent = `of ${state.targetCalories.toLocaleString()} kcal`;

    const targetC = Math.max(state.targetCarbs || 180, 1);
    const targetP = Math.max(state.targetProtein || 140, 1);
    const targetF = Math.max(state.targetFats || 65, 1);
    const targetFib = Math.max(state.targetFiber || 30, 1);

    if (carbsTextEl) carbsTextEl.textContent = `${state.carbs || 0}g / ${targetC}g`;
    if (proteinTextEl) proteinTextEl.textContent = `${state.protein || 0}g / ${targetP}g`;
    if (fatsTextEl) fatsTextEl.textContent = `${state.fats || 0}g / ${targetF}g`;
    if (fiberTextEl) fiberTextEl.textContent = `${state.fiber || 0}g / ${targetFib}g`;

    const overviewConsumed = document.getElementById('overviewConsumed');
    const overviewBurned = document.getElementById('overviewBurned');
    const energyBalanceNet = document.getElementById('energyBalanceNet');
    const balanceRatioConsumed = document.getElementById('balanceRatioConsumed');
    const balanceRatioBurned = document.getElementById('balanceRatioBurned');

    if (overviewConsumed) {
      overviewConsumed.textContent = `${state.consumedCalories.toLocaleString()} kcal`;
    }
    if (overviewBurned) {
      overviewBurned.textContent = `${(state.activeBurned || 0).toLocaleString()} kcal`;
    }
    if (energyBalanceNet) {
      const net = state.consumedCalories - (state.activeBurned || 0);
      energyBalanceNet.textContent = `${net > 0 ? '+' : ''}${net.toLocaleString()} kcal Net`;
    }
    if (balanceRatioConsumed && balanceRatioBurned) {
      const total = state.consumedCalories + (state.activeBurned || 0);
      const consumedRatio = total > 0 ? Math.round((state.consumedCalories / total) * 100) : 0;
      balanceRatioConsumed.style.width = `${consumedRatio}%`;
      balanceRatioBurned.style.width = `${total > 0 ? 100 - consumedRatio : 0}%`;
    }

    // Dynamic Arc Segments Chaining for All 4 Nutrients (Carbs, Protein, Fats, Fiber)
    // Target shares ensure proportional balance when all targets are fulfilled
    const wC = targetC * 4;
    const wP = targetP * 4;
    const wF = targetF * 9;
    const wFib = targetFib * 8; // ensure fiber has a clear, prominent visual slice
    const wTotal = wC + wP + wF + wFib;

    const shareC = wC / wTotal;
    const shareP = wP / wTotal;
    const shareF = wF / wTotal;
    const shareFib = wFib / wTotal;

    const cVal = Math.max(state.carbs || 0, 0);
    const pVal = Math.max(state.protein || 0, 0);
    const fVal = Math.max(state.fats || 0, 0);
    const fibVal = Math.max(state.fiber || 0, 0);

    // Total ring progress is governed by consumed calories (up to 100% full circle)
    const totalRingSweep = Math.min(ratio, 1.0) * CIRCUMFERENCE;

    let carbsSweep = 0;
    let proteinSweep = 0;
    let fatsSweep = 0;
    let fiberSweep = 0;

    if (totalRingSweep > 0) {
      const vC = (cVal / targetC) * shareC;
      const vP = (pVal / targetP) * shareP;
      const vF = (fVal / targetF) * shareF;
      const vFib = (fibVal / targetFib) * shareFib;
      const vSum = vC + vP + vF + vFib;

      if (vSum > 0) {
        carbsSweep = (vC / vSum) * totalRingSweep;
        proteinSweep = (vP / vSum) * totalRingSweep;
        fatsSweep = (vF / vSum) * totalRingSweep;
        fiberSweep = (vFib / vSum) * totalRingSweep;
      } else {
        // Fallback when calories logged without specific macro entries
        carbsSweep = shareC * totalRingSweep;
        proteinSweep = shareP * totalRingSweep;
        fatsSweep = shareF * totalRingSweep;
        fiberSweep = shareFib * totalRingSweep;
      }
    }

    // Connect segments end-to-end clockwise around the circle
    const segments = [
      { el: carbsRingArc, sweep: carbsSweep },
      { el: proteinRingArc, sweep: proteinSweep },
      { el: fatsRingArc, sweep: fatsSweep },
      { el: fiberRingArc, sweep: fiberSweep }
    ];

    let currentAngle = 0;
    segments.forEach(seg => {
      if (!seg.el) return;
      if (seg.sweep > 0.5) {
        seg.el.style.opacity = '1';
        seg.el.style.strokeDasharray = `${seg.sweep} ${CIRCUMFERENCE}`;
        seg.el.style.strokeDashoffset = '0';
        seg.el.style.transform = `rotate(${currentAngle}deg)`;
        seg.el.setAttribute('transform', `rotate(${currentAngle} 100 100)`);
        currentAngle += (seg.sweep / CIRCUMFERENCE) * 360;
      } else {
        seg.el.style.opacity = '0';
        seg.el.style.strokeDasharray = `0 ${CIRCUMFERENCE}`;
        seg.el.style.strokeDashoffset = '0';
      }
    });
  }

  // Calculate dynamic meal calorie allocations from total daily calories
  function getMealTargets(totalCalories) {
    const total = totalCalories || 2300;
    // Distribution: Breakfast 28%, Lunch 35%, Dinner 27%, Snacks 10%
    const b = Math.round(total * 0.28);
    const l = Math.round(total * 0.35);
    const d = Math.round(total * 0.27);
    const s = total - (b + l + d); // Remainder guarantees the exact sum
    return {
      breakfast: b,
      lunch: l,
      dinner: d,
      snack: s,
      total: total
    };
  }

  function updateMealSummaries() {
    const mealTargets = getMealTargets(state.targetCalories || 2300);

    const breakfastSummary = document.getElementById('breakfastSummary');
    const lunchSummary = document.getElementById('lunchSummary');
    const dinnerSummary = document.getElementById('dinnerSummary');
    const snackSummary = document.getElementById('snackSummary');

    if (breakfastSummary) {
      const bCal = state.breakfastCalories || 0;
      breakfastSummary.textContent = `${bCal.toLocaleString()} of ${mealTargets.breakfast.toLocaleString()} kcal`;
    }

    if (lunchSummary) {
      const lCal = state.lunchCalories || 0;
      lunchSummary.textContent = `${lCal.toLocaleString()} of ${mealTargets.lunch.toLocaleString()} kcal`;
    }

    if (dinnerSummary) {
      const dCal = state.dinnerCalories || 0;
      if (dCal > 0) {
        dinnerSummary.textContent = `${dCal.toLocaleString()} of ${mealTargets.dinner.toLocaleString()} kcal`;
      } else {
        dinnerSummary.textContent = `Planned ${mealTargets.dinner.toLocaleString()} kcal`;
      }
    }

    if (snackSummary) {
      const sCal = state.snackCalories || 0;
      snackSummary.textContent = `${sCal.toLocaleString()} of ${mealTargets.snack.toLocaleString()} kcal`;
    }
  }

  function updateWater() {
    if (waterStatusEl) {
      waterStatusEl.textContent = `${state.waterIntake.toLocaleString()} / ${state.waterTarget.toLocaleString()} ml`;
    }
    if (waterProgressFill) {
      const waterRatio = Math.min((state.waterIntake / state.waterTarget) * 100, 100);
      waterProgressFill.style.width = `${waterRatio}%`;
    }
  }

  // Initial Ring, Water, and Meal Update
  updateMacroRings();
  updateWater();
  updateMealSummaries();

  // Water Hydration Logger (+250ml)
  if (addWaterBtn) {
    addWaterBtn.addEventListener('click', () => {
      checkDayRollover();
      state.waterDate = getTodayDateString();
      state.waterIntake = Math.min(state.waterIntake + 250, 4000);
      updateWater();

      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      if (curUser && curUser.email) saveUserData(curUser.email);

      // Visual button bounce
      addWaterBtn.style.transform = 'scale(1.1)';
      setTimeout(() => addWaterBtn.style.transform = '', 150);
    });
  }

  // Water Hydration Quick Reset (Reset to 0)
  if (resetWaterBtn) {
    resetWaterBtn.addEventListener('click', () => {
      state.waterIntake = 0;
      state.waterDate = getTodayDateString();
      updateWater();

      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      if (curUser && curUser.email) saveUserData(curUser.email);

      showToast('Hydration tracker reset to 0 ml');
    });
  }

  // Automatic meal determination based on time of day:
  // Breakfast: 5:00 AM - 11:30 AM
  // Lunch: 11:30 AM - 3:00 PM (15:00)
  // Snack: 3:00 PM (15:00) - 6:00 PM (18:00) (as requested: between 3 to 6)
  // Dinner: 6:00 PM (18:00) - 11:00 PM (23:00)
  // Late night (11:00 PM - 5:00 AM): Snack
  function getAutoMealTypeByTime() {
    const now = new Date();
    const timeVal = now.getHours() + (now.getMinutes() / 60);
    if (timeVal >= 5.0 && timeVal < 11.5) {
      return 'breakfast';
    } else if (timeVal >= 11.5 && timeVal < 15.0) {
      return 'lunch';
    } else if (timeVal >= 15.0 && timeVal < 18.0) {
      return 'snack';
    } else if (timeVal >= 18.0 && timeVal < 23.0) {
      return 'dinner';
    } else {
      return 'snack';
    }
  }

  let currentTargetMeal = getAutoMealTypeByTime();

  function createMealItemHtml(name, portion, calories, protein, carbs, fats, fiber = 0, mealType = 'snack') {
    const calNum = Math.max(0, parseInt(calories, 10) || 0);
    const pNum = Math.max(0, Math.round(parseFloat(protein) || 0));
    const cNum = Math.max(0, Math.round(parseFloat(carbs) || 0));
    const fNum = Math.max(0, Math.round(parseFloat(fats !== undefined && fats !== null ? fats : 0) || 0));
    const fibNum = Math.max(0, Math.round(parseFloat(fiber) || 0));
    const fibStr = fibNum > 0 ? ` • Fib: ${fibNum}g` : '';
    const safeName = (name || '').replace(/"/g, '&quot;');
    return `
      <li class="meal-item" data-cal="${calNum}" data-p="${pNum}" data-c="${cNum}" data-f="${fNum}" data-fib="${fibNum}" data-meal-type="${mealType}" data-name="${safeName}">
        <div style="flex: 1; min-width: 0; padding-right: 8px;">
          <div class="item-title" style="word-break: break-word; font-weight: 600;">${name}</div>
          <div class="item-macros" style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${portion} • P: ${pNum}g • C: ${cNum}g • F: ${fNum}g${fibStr}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <span class="item-cal" style="font-weight: 700; font-size: 13px;">${calNum} kcal</span>
          <button type="button" class="delete-meal-btn" title="Delete ${safeName}" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; border-radius: 6px; padding: 4px 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background 0.2s ease;" onmouseover="this.style.background='rgba(239,68,68,0.22)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </li>
    `;
  }

  // Recalculates and guarantees macros are never 0 when meals exist in the DOM
  function recalculateMacrosFromDom() {
    let domCal = 0;
    let domP = 0;
    let domC = 0;
    let domF = 0;
    let domFib = 0;
    let itemCount = 0;

    const listSelectors = ['#breakfastItemList', '#lunchItemList', '#dinnerItemList', '#snackItemList'];
    listSelectors.forEach(sel => {
      const container = document.querySelector(sel);
      if (!container) return;
      container.querySelectorAll('.meal-item').forEach(li => {
        itemCount++;
        let cal = parseInt(li.dataset.cal, 10);
        let p = parseFloat(li.dataset.p);
        let c = parseFloat(li.dataset.c);
        let f = parseFloat(li.dataset.f);
        let fib = parseFloat(li.dataset.fib);

        if (isNaN(f) || isNaN(p) || isNaN(c)) {
          const macroEl = li.querySelector('.item-macros');
          if (macroEl) {
            const text = macroEl.textContent || '';
            const mF = text.match(/(?:F|Fat|Fats):\s*([\d\.]+)g/i);
            const mP = text.match(/P(?:rotein)?:\s*([\d\.]+)g/i);
            const mC = text.match(/C(?:arbs)?:\s*([\d\.]+)g/i);
            if (mF && isNaN(f)) { f = parseFloat(mF[1]); li.dataset.f = f; }
            if (mP && isNaN(p)) { p = parseFloat(mP[1]); li.dataset.p = p; }
            if (mC && isNaN(c)) { c = parseFloat(mC[1]); li.dataset.c = c; }
          }
        }
        if (isNaN(cal)) {
          const calEl = li.querySelector('.item-cal');
          if (calEl) {
            cal = parseInt((calEl.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
            li.dataset.cal = cal;
          }
        }

        if (!isNaN(cal)) domCal += cal;
        if (!isNaN(p)) domP += p;
        if (!isNaN(c)) domC += c;
        if (!isNaN(f)) domF += f;
        if (!isNaN(fib)) domFib += fib;
      });
    });

    if (itemCount > 0) {
      if (domF > 0 && (state.fats === 0 || state.fats < domF)) {
        state.fats = Math.round(domF);
      }
      if (domCal > 0 && (state.consumedCalories === 0 || state.consumedCalories < domCal)) {
        state.consumedCalories = Math.round(domCal);
      }
      if (domP > 0 && (state.protein === 0 || state.protein < domP)) {
        state.protein = Math.round(domP);
      }
      if (domC > 0 && (state.carbs === 0 || state.carbs < domC)) {
        state.carbs = Math.round(domC);
      }
      if (domFib > 0 && (!state.fiber || state.fiber < domFib)) {
        state.fiber = Math.round(domFib);
      }
      updateMacroRings();
    }
  }

  function ensureDeleteButtonsInMealLists() {
    document.querySelectorAll('.meal-item').forEach(li => {
      const titleEl = li.querySelector('.item-title');
      const nameStr = titleEl ? titleEl.textContent.trim() : '';
      if (!nameStr || nameStr.toLowerCase() === 'undefined') {
        li.remove();
        return;
      }
      const rawCalEl = li.querySelector('.item-cal');
      if (rawCalEl && (rawCalEl.textContent.includes('NaN') || rawCalEl.textContent.includes('null'))) {
        li.remove();
        return;
      }

      let cal = parseInt(li.dataset.cal, 10);
      if (isNaN(cal)) {
        const calEl = li.querySelector('.item-cal');
        if (calEl) {
          cal = parseInt((calEl.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
          li.dataset.cal = cal;
        }
      }
      let p = parseFloat(li.dataset.p);
      let c = parseFloat(li.dataset.c);
      let f = parseFloat(li.dataset.f);
      if (isNaN(p) || isNaN(c) || isNaN(f)) {
        const macroEl = li.querySelector('.item-macros');
        if (macroEl) {
          const matchP = (macroEl.textContent || '').match(/P(?:rotein)?:\s*([\d\.]+)g/i);
          const matchC = (macroEl.textContent || '').match(/C(?:arbs)?:\s*([\d\.]+)g/i);
          const matchF = (macroEl.textContent || '').match(/(?:F|Fat|Fats):\s*([\d\.]+)g/i);
          if (matchP) li.dataset.p = matchP[1];
          if (matchC) li.dataset.c = matchC[1];
          if (matchF) li.dataset.f = matchF[1];
        }
      }

      if (!li.querySelector('.delete-meal-btn')) {
        const titleEl = li.querySelector('.item-title');
        const name = titleEl ? titleEl.textContent.trim() : 'Food item';
        li.dataset.name = name;

        let mealType = 'snack';
        if (li.closest('#breakfastItemList')) mealType = 'breakfast';
        else if (li.closest('#dinnerItemList')) mealType = 'dinner';
        else if (li.closest('#lunchItemList')) mealType = 'lunch';
        li.dataset.mealType = mealType;

        const calEl = li.querySelector('.item-cal');
        if (calEl) {
          const containerDiv = document.createElement('div');
          containerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';
          calEl.parentNode.insertBefore(containerDiv, calEl);
          containerDiv.appendChild(calEl);

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'delete-meal-btn';
          deleteBtn.title = `Delete ${name}`;
          deleteBtn.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; border-radius: 6px; padding: 4px 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;';
          deleteBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          containerDiv.appendChild(deleteBtn);
        }
      }
    });

    recalculateMacrosFromDom();
  }

  // Handle Meal Item Deletion
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-meal-btn');
    if (!deleteBtn) return;

    const li = deleteBtn.closest('.meal-item');
    if (!li) return;

    const cal = parseInt(li.dataset.cal || '0', 10);
    const p = parseFloat(li.dataset.p || '0');
    const c = parseFloat(li.dataset.c || '0');
    const f = parseFloat(li.dataset.f || '0');
    const fib = parseFloat(li.dataset.fib || '0');
    const mealType = li.dataset.mealType || 'snack';
    const name = li.dataset.name || 'Food item';

    // Subtract from total consumed state
    state.consumedCalories = Math.max(0, state.consumedCalories - cal);
    state.protein = Math.max(0, state.protein - Math.round(p));
    state.carbs = Math.max(0, state.carbs - Math.round(c));
    state.fats = Math.max(0, state.fats - Math.round(f));
    state.fiber = Math.max(0, (state.fiber || 0) - Math.round(fib));

    if (mealType === 'breakfast') {
      state.breakfastCalories = Math.max(0, (state.breakfastCalories || 0) - cal);
    } else if (mealType === 'lunch') {
      state.lunchCalories = Math.max(0, (state.lunchCalories || 0) - cal);
    } else if (mealType === 'dinner') {
      state.dinnerCalories = Math.max(0, (state.dinnerCalories || 0) - cal);
    } else {
      state.snackCalories = Math.max(0, (state.snackCalories || 0) - cal);
    }

    const parentList = li.parentElement;
    li.remove();

    if (parentList && parentList.querySelectorAll('.meal-item').length === 0) {
      parentList.innerHTML = `<li class="meal-empty-note">No ${mealType} logged yet today. Tap + to add food.</li>`;
    }

    updateMacroRings();
    updateMealSummaries();
    updateOverviewMetrics();

    const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    if (curUser && curUser.email) saveUserData(curUser.email);

    showToast(`🗑️ Removed "${name}" (-${cal} kcal)`);
  });

  // Food Logging Function (shared by NLP input, chips, scanner, search, and manual)
  function logFoodItem(name, portion, calories, protein, carbs, fats, fiber = 0) {
    if (!name || name === 'undefined' || isNaN(calories) || calories === null) {
      console.warn('[FitTrack] Invalid food item log ignored:', name, calories);
      return;
    }
    const calNum = Math.max(0, parseInt(calories, 10) || 0);
    const pNum = Math.max(0, Math.round(parseFloat(protein) || 0));
    const cNum = Math.max(0, Math.round(parseFloat(carbs) || 0));
    const fNum = Math.max(0, Math.round(parseFloat(fats !== undefined && fats !== null ? fats : 0) || 0));
    const fibNum = Math.max(0, Math.round(parseFloat(fiber) || 0));

    state.consumedCalories += calNum;
    state.protein += pNum;
    state.carbs += cNum;
    state.fats += fNum;
    state.fiber = (state.fiber || 0) + fibNum;

    let targetList = snackItemList;
    const mealType = currentTargetMeal || getAutoMealTypeByTime();
    if (mealType === 'breakfast') {
      targetList = document.getElementById('breakfastItemList');
      state.breakfastCalories = (state.breakfastCalories || 0) + calories;
    } else if (mealType === 'lunch') {
      targetList = document.getElementById('lunchItemList');
      state.lunchCalories = (state.lunchCalories || 0) + calories;
    } else if (mealType === 'dinner') {
      targetList = document.getElementById('dinnerItemList');
      state.dinnerCalories = (state.dinnerCalories || 0) + calories;
    } else {
      targetList = snackItemList;
      state.snackCalories = (state.snackCalories || 0) + calories;
    }

    if (targetList) {
      const emptyNote = targetList.querySelector('.meal-empty-note');
      if (emptyNote) emptyNote.remove();

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = createMealItemHtml(name, portion, calories, protein, carbs, fats, fiber, mealType);
      const li = tempDiv.firstElementChild;
      li.style.animation = 'fadeIn 0.3s ease';
      targetList.prepend(li);
    }

    updateMacroRings();
    updateMealSummaries();

    const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    if (curUser && curUser.email) saveUserData(curUser.email);
  }

  // AI NLP Meal Input & Validation Elements
  const aiMealInputCard = document.getElementById('aiMealInputCard');
  const aiNlpErrorPopup = document.getElementById('aiNlpErrorPopup');
  const aiNlpErrorText = document.getElementById('aiNlpErrorText');
  const closeAiNlpErrorBtn = document.getElementById('closeAiNlpErrorBtn');
  let aiErrorTimeout = null;

  function showAiNlpError(msg) {
    const errorMsg = msg || 'Please enter a valid food or meal (e.g. "100g chicken breast" or "2 boiled eggs").';
    if (aiNlpErrorPopup) {
      if (aiNlpErrorText) aiNlpErrorText.textContent = errorMsg;
      aiNlpErrorPopup.style.display = 'flex';
      if (aiErrorTimeout) clearTimeout(aiErrorTimeout);
      aiErrorTimeout = setTimeout(() => {
        aiNlpErrorPopup.style.display = 'none';
      }, 6000);
    }
    if (aiMealInputCard) {
      aiMealInputCard.style.transition = 'all 0.25s ease';
      aiMealInputCard.style.border = '2px solid #EF4444';
      aiMealInputCard.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
      setTimeout(() => {
        aiMealInputCard.style.border = '';
        aiMealInputCard.style.boxShadow = '';
      }, 2500);
    }
    if (typeof showToast === 'function') {
      showToast(`⚠️ ${errorMsg}`);
    }
    if (aiInput) aiInput.focus();
  }

  function hideAiNlpError() {
    if (aiNlpErrorPopup) aiNlpErrorPopup.style.display = 'none';
    if (aiMealInputCard) {
      aiMealInputCard.style.border = '';
      aiMealInputCard.style.boxShadow = '';
    }
  }

  if (closeAiNlpErrorBtn) {
    closeAiNlpErrorBtn.addEventListener('click', hideAiNlpError);
  }

  if (aiInput) {
    aiInput.addEventListener('input', () => {
      if (aiNlpErrorPopup && aiNlpErrorPopup.style.display !== 'none') {
        hideAiNlpError();
      }
    });
  }

  async function handleAiSubmit() {
    const text = (aiInput.value || '').trim();
    if (!text) {
      showAiNlpError('Please enter a food item or meal first (e.g. "100g chicken breast" or "banana").');
      return;
    }

    hideAiNlpError();
    aiSubmitBtn.innerHTML = `<span style="font-size:12px;">⏳</span>`;
    aiSubmitBtn.disabled = true;

    try {
      const res = await fetch('/api/ai/nlp-meal-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const json = await res.json();

      if (!json.isFood || !json.data) {
        showAiNlpError(json.error || 'Please enter a valid food or meal (e.g. "100g chicken breast" or "2 boiled eggs").');
        return;
      }

      const item = json.data;

      // Automatically determine meal slot according to the time of day
      const autoMeal = getAutoMealTypeByTime();
      const prevTargetMeal = currentTargetMeal;
      currentTargetMeal = autoMeal;

      logFoodItem(
        item.name,
        item.portion || '1 serving',
        item.calories,
        item.protein,
        item.carbs,
        item.fats !== undefined && item.fats !== null ? item.fats : (item.fat || 0),
        item.fiber || 0
      );

      currentTargetMeal = prevTargetMeal;

      aiInput.value = '';
      if (typeof showToast === 'function') {
        showToast(`✨ Logged ${item.portion} ${item.name} to ${autoMeal.toUpperCase()} (+${item.calories} kcal, ${item.protein}g P)!`);
      }
    } catch (err) {
      console.warn('[FitTrack AI] NLP submit error:', err);
      showAiNlpError('Connection error while analyzing meal. Please try again.');
    } finally {
      aiSubmitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
      aiSubmitBtn.disabled = false;
    }
  }

  aiSubmitBtn.addEventListener('click', handleAiSubmit);
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAiSubmit();
  });

  // Quick Chips
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const meal = chip.dataset.meal;
      const cal = parseInt(chip.dataset.cal, 10);
      const p = parseInt(chip.dataset.p, 10);
      const c = parseInt(chip.dataset.c, 10);
      const f = parseInt(chip.dataset.f, 10);
      const prevMeal = currentTargetMeal;
      currentTargetMeal = getAutoMealTypeByTime();
      logFoodItem(meal, 'Standard serving', cal, p, c, f);
      currentTargetMeal = prevMeal;
    });
  });

  // Tab Navigation Switching
  function switchTab(targetTabId) {
    screenTabs.forEach(tab => {
      if (tab.id === targetTabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    navItems.forEach(item => {
      if (item.dataset.tab === targetTabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Scroll viewport to top
    const viewport = document.querySelector('.screen-viewport');
    if (viewport) viewport.scrollTop = 0;

    // Immediately refresh target screen metrics in real time on tab switch
    if (targetTabId === 'tabOverview') {
      if (typeof updateOverviewMetrics === 'function') updateOverviewMetrics();
    } else if (targetTabId === 'tabNutrition') {
      if (typeof updateMacroRings === 'function') updateMacroRings();
    } else if (targetTabId === 'tabWorkout') {
      if (typeof updateWorkoutHeroUI === 'function') updateWorkoutHeroUI();
    } else if (targetTabId === 'tabWeeklyMeals') {
      if (typeof renderWeeklyMealsUI === 'function') renderWeeklyMealsUI();
      if (typeof fetchWeeklyDiaryFromBackend === 'function') fetchWeeklyDiaryFromBackend();
    }
  }

  const jumpToWeeklyMealsCard = document.getElementById('jumpToWeeklyMealsCard');
  if (jumpToWeeklyMealsCard) {
    jumpToWeeklyMealsCard.addEventListener('click', () => switchTab('tabWeeklyMeals'));
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  if (headerProfileJump) {
    headerProfileJump.addEventListener('click', () => switchTab('tabProfile'));
  }

  function clearScannerInputs() {
    const mName = document.getElementById('manualItemName');
    const mCal = document.getElementById('manualCalories');
    const mProt = document.getElementById('manualProtein');
    const mCarb = document.getElementById('manualCarbs');
    const mFat = document.getElementById('manualFat');
    const mFib = document.getElementById('manualFiber');
    if (mName) mName.value = '';
    if (mCal) mCal.value = '';
    if (mProt) mProt.value = '';
    if (mCarb) mCarb.value = '';
    if (mFat) mFat.value = '';
    if (mFib) mFib.value = '';

    const sName = document.getElementById('searchItemName');
    const sQty = document.getElementById('searchQuantity');
    if (sName) sName.value = '';
    if (sQty) sQty.value = '';
    document.querySelectorAll('.food-tag-chip').forEach(c => c.classList.remove('active'));
    if (typeof calculateSearchNutrients === 'function') {
      calculateSearchNutrients();
    }
  }

  // Scan Modal Controls
  let cameraStream = null;

  async function startCameraStream() {
    if (cameraSnapshotPreview && cameraSnapshotPreview.style.display === 'block') {
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraIconHint) {
        cameraIconHint.innerHTML = `
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Tap "Upload" or "Snap Photo" to take/select photo</span>
        `;
        cameraIconHint.style.display = 'flex';
      }
      return;
    }

    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (cameraVideo) {
        cameraVideo.srcObject = cameraStream;
        cameraVideo.style.display = 'block';
        try {
          await cameraVideo.play();
        } catch (playErr) {
          console.warn('[FitTrack Camera] Auto-play warning:', playErr);
        }
      }
      if (cameraSnapshotPreview) cameraSnapshotPreview.style.display = 'none';
      if (cameraIconHint) cameraIconHint.style.display = 'none';
      if (cameraLaserLine) cameraLaserLine.style.display = 'block';
    } catch (err) {
      console.warn('[FitTrack Camera] Stream access error:', err);
      if (cameraVideo) cameraVideo.style.display = 'none';
      if (cameraIconHint) {
        cameraIconHint.innerHTML = `
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Tap "Upload" or "Snap Photo" to select a meal photo</span>
        `;
        cameraIconHint.style.display = 'flex';
      }
      if (cameraLaserLine) cameraLaserLine.style.display = 'none';
    }
  }

  function stopCameraStream() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
      cameraVideo.style.display = 'none';
    }
    if (cameraLaserLine) cameraLaserLine.style.display = 'none';
  }

  function openScanner() {
    clearScannerInputs();
    scanModalBackdrop.classList.add('show');
    const activeTab = document.querySelector('.mode-tab.active');
    if (!activeTab || activeTab.dataset.mode === 'camera') {
      startCameraStream();
    }
  }

  function closeScanner() {
    stopCameraStream();
    if (cameraSnapshotPreview) {
      cameraSnapshotPreview.src = '';
      cameraSnapshotPreview.style.display = 'none';
    }
    if (retakePhotoBtn) retakePhotoBtn.style.display = 'none';
    if (detectedFoodCard) detectedFoodCard.style.display = 'none';
    if (cameraFileInput) cameraFileInput.value = '';
    state.scannedItem = null;
    scanModalBackdrop.classList.remove('show');
  }

  centerScanBtn.addEventListener('click', () => {
    currentTargetMeal = getAutoMealTypeByTime();
    openScanner();
  });
  closeScanModal.addEventListener('click', closeScanner);
  openScannerTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.meal-card');
      if (card) {
        const nameEl = card.querySelector('.meal-name');
        const txt = nameEl ? nameEl.textContent.trim().toLowerCase() : '';
        if (txt.includes('breakfast')) currentTargetMeal = 'breakfast';
        else if (txt.includes('lunch')) currentTargetMeal = 'lunch';
        else if (txt.includes('dinner')) currentTargetMeal = 'dinner';
        else if (txt.includes('snack')) currentTargetMeal = 'snack';
        else currentTargetMeal = getAutoMealTypeByTime();
      } else {
        currentTargetMeal = getAutoMealTypeByTime();
      }
      openScanner();
    });
  });

  scanModalBackdrop.addEventListener('click', (e) => {
    if (e.target === scanModalBackdrop) closeScanner();
  });

  // Modal Mode Switcher (AI Camera, Item & Qty, Manual, Favourites)
  const modeTabs = document.querySelectorAll('.mode-tab');
  const panelCamera = document.getElementById('panelCamera');
  const panelSearch = document.getElementById('panelSearch');
  const panelManual = document.getElementById('panelManual');
  const panelFavourites = document.getElementById('panelFavourites');

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      if (mode === 'camera') {
        panelCamera.style.display = 'block';
        panelSearch.style.display = 'none';
        panelManual.style.display = 'none';
        if (panelFavourites) panelFavourites.style.display = 'none';
        startCameraStream();
      } else {
        stopCameraStream();
        if (mode === 'search') {
          panelCamera.style.display = 'none';
          panelSearch.style.display = 'block';
          panelManual.style.display = 'none';
          if (panelFavourites) panelFavourites.style.display = 'none';
          calculateSearchNutrients();
        } else if (mode === 'manual') {
          panelCamera.style.display = 'none';
          panelSearch.style.display = 'none';
          panelManual.style.display = 'block';
          if (panelFavourites) panelFavourites.style.display = 'none';
        } else if (mode === 'favourites') {
          panelCamera.style.display = 'none';
          panelSearch.style.display = 'none';
          panelManual.style.display = 'none';
          if (panelFavourites) {
            panelFavourites.style.display = 'block';
            fetchFavourites();
          }
        }
      }
    });
  });

  // ================= MODE 1: AI CAMERA & VISION =================
  async function analyzeFoodImage(dataUrl) {
    if (!dataUrl) return;

    if (cameraAiLoading) cameraAiLoading.style.display = 'flex';
    if (cameraLaserLine) cameraLaserLine.style.display = 'none';
    if (detectedFoodCard) detectedFoodCard.style.display = 'none';

    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const imageBase64 = parts[1];

      const res = await fetch('/api/ai/camera-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned HTTP ${res.status}`);
      }

      const result = await res.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Could not analyze food image');
      }

      const food = result.data;
      if (food.isFood === false) {
        showToast('⚠️ No food recognized in image. Please take a clearer photo.');
        return;
      }

      if (detectedTitle) detectedTitle.textContent = food.name || 'Identified Dish';
      if (detectedBrand) detectedBrand.textContent = `${food.portion || 'Estimated portion'} • ${food.summary || 'AI Vision Recognized'}`;
      if (detectedCalories) detectedCalories.textContent = `${food.calories} kcal`;
      if (detectedMacros) {
        detectedMacros.innerHTML = `<span>Protein: ${food.protein}g</span> • <span>Carbs: ${food.carbs}g</span> • <span>Fat: ${food.fats}g</span> • <span>Fiber: ${food.fiber || 0}g</span>`;
      }

      const targetMeal = currentTargetMeal || getAutoMealTypeByTime();
      const capitalizedMeal = targetMeal.charAt(0).toUpperCase() + targetMeal.slice(1);
      if (confirmLogScannedBtn) {
        confirmLogScannedBtn.textContent = `Add to ${capitalizedMeal} Log`;
      }

      state.scannedItem = {
        name: food.name || 'Identified Dish',
        portion: food.portion || 'AI Camera Portion',
        cal: food.calories || 0,
        p: food.protein || 0,
        c: food.carbs || 0,
        f: food.fats !== undefined && food.fats !== null ? food.fats : (food.fat || 0),
        fib: food.fiber || 0,
        mealType: targetMeal
      };

      if (detectedFoodCard) {
        detectedFoodCard.style.display = 'block';
        detectedFoodCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(`✨ Identified "${food.name}" (${food.calories} kcal)`);
    } catch (err) {
      console.error('[FitTrack Camera] AI Vision error:', err);
      showToast(`❌ ${err.message || 'Error analyzing photo'}`);
    } finally {
      if (cameraAiLoading) cameraAiLoading.style.display = 'none';
    }
  }

  // Snap Photo Button
  if (snapPhotoBtn) {
    snapPhotoBtn.addEventListener('click', () => {
      if (cameraStream && cameraVideo && cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0) {
        const vw = cameraVideo.videoWidth;
        const vh = cameraVideo.videoHeight;
        const maxDim = 1280;
        let dw = vw;
        let dh = vh;
        if (dw > maxDim || dh > maxDim) {
          if (dw > dh) {
            dh = Math.round((dh * maxDim) / dw);
            dw = maxDim;
          } else {
            dw = Math.round((dw * maxDim) / dh);
            dh = maxDim;
          }
        }
        cameraCanvas.width = dw;
        cameraCanvas.height = dh;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0, dw, dh);
        const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.82);

        if (cameraSnapshotPreview) {
          cameraSnapshotPreview.src = dataUrl;
          cameraSnapshotPreview.style.display = 'block';
        }
        if (cameraVideo) cameraVideo.style.display = 'none';
        if (retakePhotoBtn) retakePhotoBtn.style.display = 'inline-flex';

        stopCameraStream();
        analyzeFoodImage(dataUrl);
      } else {
        if (cameraFileInput) cameraFileInput.click();
      }
    });
  }

  // Upload Photo Button
  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', () => {
      if (cameraFileInput) cameraFileInput.click();
    });
  }

  // Native File/Camera Picker Change
  if (cameraFileInput) {
    cameraFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (cameraSnapshotPreview) {
          cameraSnapshotPreview.src = dataUrl;
          cameraSnapshotPreview.style.display = 'block';
        }
        if (cameraVideo) cameraVideo.style.display = 'none';
        if (retakePhotoBtn) retakePhotoBtn.style.display = 'inline-flex';
        stopCameraStream();
        analyzeFoodImage(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  // Retake Photo Button
  if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', () => {
      if (detectedFoodCard) detectedFoodCard.style.display = 'none';
      if (cameraSnapshotPreview) {
        cameraSnapshotPreview.src = '';
        cameraSnapshotPreview.style.display = 'none';
      }
      retakePhotoBtn.style.display = 'none';
      state.scannedItem = null;
      if (cameraFileInput) cameraFileInput.value = '';
      startCameraStream();
    });
  }

  // Confirm Log Scanned Item to Today's Meal
  if (confirmLogScannedBtn) {
    confirmLogScannedBtn.addEventListener('click', () => {
      if (state.scannedItem) {
        const item = state.scannedItem;
        if (item.mealType) currentTargetMeal = item.mealType;
        logFoodItem(
          item.name,
          item.portion,
          item.cal,
          item.p,
          item.c,
          item.f,
          item.fib
        );
        showToast(`✅ Logged ${item.name} (${item.cal} kcal) to ${currentTargetMeal}!`);
        state.scannedItem = null;
        if (detectedFoodCard) detectedFoodCard.style.display = 'none';
        closeScanner();
      }
    });
  }

  // ================= MODE 2: SEARCH ITEM & QUANTITY =================
  const searchItemInput = document.getElementById('searchItemName');
  const searchQtyInput = document.getElementById('searchQuantity');
  const searchUnitSelect = document.getElementById('searchUnit');
  const foodTagChips = document.querySelectorAll('.food-tag-chip');

  const previewFoodTitle = document.getElementById('previewFoodTitle');
  const previewFoodQty = document.getElementById('previewFoodQty');
  const previewFoodCal = document.getElementById('previewFoodCal');
  const prevP = document.getElementById('prevP');
  const prevC = document.getElementById('prevC');
  const prevF = document.getElementById('prevF');
  const prevFib = document.getElementById('prevFib');
  const confirmLogSearchBtn = document.getElementById('confirmLogSearchBtn');

  // OpenRouter AI UI Elements
  const triggerAiFetchBtn = document.getElementById('triggerAiFetchBtn');
  const aiBtnIcon = document.getElementById('aiBtnIcon');
  const aiBtnText = document.getElementById('aiBtnText');
  const aiBadgeTag = document.getElementById('aiBadgeTag');
  const aiLoadingIndicator = document.getElementById('aiLoadingIndicator');

  // Baseline nutritional database per 100g (or per piece)
  const foodDb = {
    "chicken breast": { base: "g", cal100: 165, p100: 31, c100: 0, f100: 3.6, fib100: 0 },
    "chicken": { base: "g", cal100: 165, p100: 31, c100: 0, f100: 3.6, fib100: 0 },
    "rolled oats": { base: "g", cal100: 380, p100: 14, c100: 68, f100: 6, fib100: 10 },
    "oats": { base: "g", cal100: 380, p100: 14, c100: 68, f100: 6, fib100: 10 },
    "banana": { base: "pcs", calPiece: 105, pPiece: 1.3, cPiece: 27, fPiece: 0.3, fibPiece: 3.1 },
    "boiled eggs": { base: "pcs", calPiece: 70, pPiece: 6, cPiece: 0.5, fPiece: 5, fibPiece: 0 },
    "egg": { base: "pcs", calPiece: 70, pPiece: 6, cPiece: 0.5, fPiece: 5, fibPiece: 0 },
    "eggs": { base: "pcs", calPiece: 70, pPiece: 6, cPiece: 0.5, fPiece: 5, fibPiece: 0 },
    "brown rice": { base: "g", cal100: 111, p100: 2.6, c100: 23, f100: 0.9, fib100: 1.8 },
    "rice": { base: "g", cal100: 130, p100: 2.7, c100: 28, f100: 0.3, fib100: 0.4 },
    "salmon": { base: "g", cal100: 206, p100: 22, c100: 0, f100: 12, fib100: 0 },
    "apple": { base: "pcs", calPiece: 95, pPiece: 0.5, cPiece: 25, fPiece: 0.3, fibPiece: 4.4 },
    "greek yogurt": { base: "g", cal100: 95, p100: 10, c100: 4, f100: 4.5, fib100: 0 },
    "avocado": { base: "g", cal100: 160, p100: 2, c100: 9, f100: 15, fib100: 7 }
  };

  let currentSearchCalc = { name: "Food Item", qtyText: "100g", cal: 0, p: 0, c: 0, f: 0, fib: 0 };
  let aiLookupDebounceTimer = null;
  let activeAiRequestController = null;

  // OpenRouter Free LLM AI Nutrition Fetcher
  async function fetchAiNutrition(foodQuery, qty, unit) {
    if (!foodQuery || !foodQuery.trim() || qty <= 0) return;

    if (activeAiRequestController) {
      activeAiRequestController.abort();
    }
    activeAiRequestController = new AbortController();

    if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'block';
    if (aiBtnText) aiBtnText.textContent = 'Analyzing...';
    if (aiBtnIcon) aiBtnIcon.textContent = '⏳';

    try {
      const res = await fetch('/api/ai/nutrition-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodQuery: foodQuery.trim(),
          quantity: qty,
          unit: unit
        }),
        signal: activeAiRequestController.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && json.data) {
        const item = json.data;
        if (previewFoodTitle) previewFoodTitle.textContent = item.name;
        if (previewFoodQty) previewFoodQty.textContent = item.portion || `${qty} ${unit} portion`;
        if (previewFoodCal) previewFoodCal.textContent = `${item.calories} kcal`;
        if (prevP) prevP.textContent = `${item.protein}g`;
        if (prevC) prevC.textContent = `${item.carbs}g`;
        if (prevF) prevF.textContent = `${item.fats}g`;
        if (prevFib) prevFib.textContent = `${item.fiber}g`;

        currentSearchCalc = {
          name: item.name,
          qtyText: item.portion || `${qty} ${unit} portion`,
          cal: item.calories,
          p: item.protein,
          c: item.carbs,
          f: item.fats,
          fib: item.fiber
        };

        if (aiBadgeTag) {
          aiBadgeTag.style.display = 'inline-block';
          if (json.source === 'gemini' || json.source === 'openrouter') {
            aiBadgeTag.style.background = 'rgba(37,99,235,0.12)';
            aiBadgeTag.style.color = '#2563EB';
            aiBadgeTag.textContent = '✨ AI Nutrition';
          } else {
            aiBadgeTag.style.background = 'rgba(16,185,129,0.12)';
            aiBadgeTag.style.color = '#059669';
            aiBadgeTag.textContent = '⚡ Verified Nutrition';
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[FitTrack AI] Nutrition fetch error:', err);
      }
    } finally {
      if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none';
      if (aiBtnText) aiBtnText.textContent = 'AI Fetch';
      if (aiBtnIcon) aiBtnIcon.textContent = '✨';
    }
  }

  function queueAiNutritionFetch() {
    if (aiLookupDebounceTimer) clearTimeout(aiLookupDebounceTimer);
    aiLookupDebounceTimer = setTimeout(() => {
      const name = (searchItemInput.value || '').trim();
      const qty = parseFloat(searchQtyInput.value) || 0;
      const unit = searchUnitSelect.value;
      if (name.length >= 2 && qty > 0) {
        fetchAiNutrition(name, qty, unit);
      }
    }, 650);
  }

  function calculateSearchNutrients() {
    const rawName = (searchItemInput.value || '').trim().toLowerCase();
    const qty = parseFloat(searchQtyInput.value) || 0;
    const unit = searchUnitSelect.value;

    if (!rawName || qty <= 0) {
      const titleText = searchItemInput.value.trim() ? (searchItemInput.value.charAt(0).toUpperCase() + searchItemInput.value.slice(1)) : "Select or Type Food";
      const portionText = qty > 0 ? `${qty} ${unit} portion` : "Portion & nutrient preview";
      previewFoodTitle.textContent = titleText;
      previewFoodQty.textContent = portionText;
      previewFoodCal.textContent = "0 kcal";
      prevP.textContent = "0g";
      prevC.textContent = "0g";
      prevF.textContent = "0g";
      prevFib.textContent = "0g";
      if (aiBadgeTag) aiBadgeTag.style.display = 'none';
      currentSearchCalc = { name: searchItemInput.value.trim() || "Food Item", qtyText: `${qty} ${unit}`, cal: 0, p: 0, c: 0, f: 0, fib: 0 };
      return;
    }

    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    let matchedFood = null;

    for (const key in foodDb) {
      if (rawName.includes(key) || key.includes(rawName)) {
        matchedFood = foodDb[key];
        break;
      }
    }

    if (matchedFood) {
      if (matchedFood.base === "pcs") {
        const count = (unit === "pcs") ? qty : (qty / 100);
        cal = Math.round(matchedFood.calPiece * count);
        p = Math.round(matchedFood.pPiece * count * 10) / 10;
        c = Math.round(matchedFood.cPiece * count * 10) / 10;
        f = Math.round(matchedFood.fPiece * count * 10) / 10;
        fib = Math.round(matchedFood.fibPiece * count * 10) / 10;
      } else {
        const factor = (unit === "g") ? (qty / 100) : (unit === "oz" ? (qty * 28.35 / 100) : (qty * 1.5));
        cal = Math.round(matchedFood.cal100 * factor);
        p = Math.round(matchedFood.p100 * factor * 10) / 10;
        c = Math.round(matchedFood.c100 * factor * 10) / 10;
        f = Math.round(matchedFood.f100 * factor * 10) / 10;
        fib = Math.round(matchedFood.fib100 * factor * 10) / 10;
      }
    } else {
      // General baseline estimation
      const factor = (unit === "g") ? (qty / 100) : qty;
      cal = Math.round(180 * factor);
      p = Math.round(12 * factor);
      c = Math.round(20 * factor);
      f = Math.round(5 * factor);
      fib = Math.round(2 * factor);
    }

    const titleText = searchItemInput.value.trim() ? (searchItemInput.value.charAt(0).toUpperCase() + searchItemInput.value.slice(1)) : "Custom Food";
    const portionText = `${qty} ${unit} portion`;

    previewFoodTitle.textContent = titleText;
    previewFoodQty.textContent = portionText;
    previewFoodCal.textContent = `${cal} kcal`;
    prevP.textContent = `${p}g`;
    prevC.textContent = `${c}g`;
    prevF.textContent = `${f}g`;
    prevFib.textContent = `${fib}g`;

    currentSearchCalc = { name: titleText, qtyText: portionText, cal, p, c, f, fib };

    // Trigger AI Fetch debounced in background for live precision
    queueAiNutritionFetch();
  }

  // OpenRouter AI Event Listeners
  if (triggerAiFetchBtn) {
    triggerAiFetchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (aiLookupDebounceTimer) clearTimeout(aiLookupDebounceTimer);
      const name = (searchItemInput.value || '').trim();
      const qty = parseFloat(searchQtyInput.value) || 100;
      const unit = searchUnitSelect.value;
      if (!name) {
        searchItemInput.focus();
        return;
      }
      fetchAiNutrition(name, qty, unit);
    });
  }

  searchItemInput.addEventListener('input', calculateSearchNutrients);
  searchQtyInput.addEventListener('input', calculateSearchNutrients);
  searchUnitSelect.addEventListener('change', calculateSearchNutrients);

  foodTagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      foodTagChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      searchItemInput.value = chip.dataset.name;
      searchQtyInput.value = chip.dataset.qty;
      searchUnitSelect.value = chip.dataset.unit;
      calculateSearchNutrients();
    });
  });

  confirmLogSearchBtn.addEventListener('click', () => {
    logFoodItem(
      currentSearchCalc.name,
      currentSearchCalc.qtyText,
      currentSearchCalc.cal,
      currentSearchCalc.p,
      currentSearchCalc.c,
      currentSearchCalc.f,
      currentSearchCalc.fib
    );
    clearScannerInputs();
    closeScanner();
  });

  // ================= MODE 3: MANUAL ENTRY =================
  const manualItemNameInput = document.getElementById('manualItemName');
  const manualCaloriesInput = document.getElementById('manualCalories');
  const manualProteinInput = document.getElementById('manualProtein');
  const manualCarbsInput = document.getElementById('manualCarbs');
  const manualFatInput = document.getElementById('manualFat');
  const manualFiberInput = document.getElementById('manualFiber');
  const confirmLogManualBtn = document.getElementById('confirmLogManualBtn');

  confirmLogManualBtn.addEventListener('click', () => {
    const name = manualItemNameInput.value.trim() || "Manual Food Entry";
    const cal = parseInt(manualCaloriesInput.value, 10) || 0;
    const p = parseFloat(manualProteinInput.value) || 0;
    const c = parseFloat(manualCarbsInput.value) || 0;
    const f = parseFloat(manualFatInput.value) || 0;
    const fib = parseFloat(manualFiberInput.value) || 0;

    logFoodItem(
      name,
      `Manual Entry (Fiber: ${fib}g)`,
      cal,
      Math.round(p),
      Math.round(c),
      Math.round(f),
      Math.round(fib)
    );

    clearScannerInputs();
    closeScanner();
  });

  // ==================== FAVOURITES CONTROLLER ====================
  let userFavourites = [];
  const favouritesListContainer = document.getElementById('favouritesListContainer');
  const favCounterBadge = document.getElementById('favCounterBadge');
  const addToFavouritesBtn = document.getElementById('addToFavouritesBtn');
  const tabBtnManual = document.getElementById('tabBtnManual');
  const tabBtnFavourites = document.getElementById('tabBtnFavourites');

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function fetchFavourites() {
    // Purge any legacy dummy seed items that might have been cached in browser localStorage
    if (localStorage.getItem('fittrack_favs_dummy_cleaned_v3') !== 'true') {
      localStorage.removeItem('fittrack_favs_cache');
      localStorage.setItem('fittrack_favs_dummy_cleaned_v3', 'true');
    }

    try {
      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      const token = localStorage.getItem('fittrack_token');
      const email = curUser ? curUser.email : 'default';

      const res = await fetch(`/api/favorites?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': token ? 'Bearer ' + token : '',
          'X-User-Email': email
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.favorites)) {
          userFavourites = data.favorites.filter(f => !f.id || !f.id.startsWith('fav_seed_'));
          localStorage.setItem('fittrack_favs_cache', JSON.stringify(userFavourites));
          renderFavouritesList(userFavourites);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed fetching favorites from backend:', err);
    }
    // Fallback: localStorage cache
    const cached = localStorage.getItem('fittrack_favs_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          userFavourites = parsed.filter(f => !f.id || !f.id.startsWith('fav_seed_'));
        } else {
          userFavourites = [];
        }
      } catch (e) {
        userFavourites = [];
      }
    } else {
      userFavourites = [];
    }
    renderFavouritesList(userFavourites);
  }

  function renderFavouritesList(items) {
    if (!favouritesListContainer) return;
    if (favCounterBadge) {
      favCounterBadge.textContent = `${items.length} saved`;
    }

    if (!items || items.length === 0) {
      favouritesListContainer.innerHTML = `
        <div class="fav-empty-box">
          <span class="fav-empty-icon">⭐</span>
          <div class="fav-empty-title">No Favourites Saved Yet</div>
          <p class="fav-empty-sub">Type a meal in the <strong>Manual</strong> tab and tap <strong>Add to Favourites</strong> to save it here for fast 1-tap logging.</p>
        </div>
      `;
      return;
    }

    favouritesListContainer.innerHTML = items.map(fav => `
      <div class="fav-food-card" data-id="${fav.id}">
        <div class="fav-card-head">
          <div>
            <div class="fav-name">${escapeHtml(fav.name)}</div>
            <div class="fav-portion">${escapeHtml(fav.portion || '1 serving')}</div>
          </div>
          <span class="fav-calories">${(fav.calories || 0).toLocaleString()} kcal</span>
        </div>
        <div class="fav-macros-strip">
          <span class="fav-macro-pill"><span class="dot bg-protein"></span>P: ${fav.protein || 0}g</span>
          <span class="fav-macro-pill"><span class="dot bg-carbs"></span>C: ${fav.carbs || 0}g</span>
          <span class="fav-macro-pill"><span class="dot bg-fats"></span>F: ${fav.fats || 0}g</span>
          ${fav.fiber ? `<span class="fav-macro-pill">Fib: ${fav.fiber}g</span>` : ''}
        </div>
        <div class="fav-card-foot">
          <div class="fav-action-btn-group">
            <button type="button" class="fav-btn-log" data-id="${fav.id}" title="Log this favourite into your current meal log">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Log to Meal
            </button>
            <button type="button" class="fav-btn-edit" data-id="${fav.id}" title="Load this into Manual tab form to customize">
              Fill in Form
            </button>
          </div>
          <button type="button" class="fav-btn-delete" data-id="${fav.id}" title="Remove from Favourites">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Attach Log to Meal actions
    favouritesListContainer.querySelectorAll('.fav-btn-log').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const fav = userFavourites.find(f => f.id === id);
        if (fav) {
          logFoodItem(
            fav.name,
            fav.portion || 'Favourite Serving',
            fav.calories,
            fav.protein,
            fav.carbs,
            fav.fats !== undefined && fav.fats !== null ? fav.fats : (fav.fat || 0),
            fav.fiber || 0
          );
          const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
          if (curUser && curUser.email) saveUserData(curUser.email);
          closeScanner();
          showToast(`✓ Logged "${fav.name}" to ${currentTargetMeal}!`);
        }
      });
    });

    // Attach Fill in Form actions
    favouritesListContainer.querySelectorAll('.fav-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const fav = userFavourites.find(f => f.id === id);
        if (fav) {
          if (manualItemNameInput) manualItemNameInput.value = fav.name;
          if (manualCaloriesInput) manualCaloriesInput.value = fav.calories;
          if (manualProteinInput) manualProteinInput.value = fav.protein;
          if (manualCarbsInput) manualCarbsInput.value = fav.carbs;
          if (manualFatInput) manualFatInput.value = fav.fats;
          if (manualFiberInput) manualFiberInput.value = fav.fiber || 0;

          if (tabBtnManual) tabBtnManual.click();
          showToast(`Loaded "${fav.name}" into Manual form!`);
        }
      });
    });

    // Attach Delete actions
    favouritesListContainer.querySelectorAll('.fav-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const fav = userFavourites.find(f => f.id === id);
        const name = fav ? fav.name : 'Item';

        userFavourites = userFavourites.filter(f => f.id !== id);
        renderFavouritesList(userFavourites);
        localStorage.setItem('fittrack_favs_cache', JSON.stringify(userFavourites));

        try {
          const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
          const token = localStorage.getItem('fittrack_token');
          const email = curUser ? curUser.email : 'default';

          await fetch(`/api/favorites/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? 'Bearer ' + token : '',
              'X-User-Email': email
            }
          });
        } catch (err) {
          console.warn('Backend delete error:', err);
        }
        showToast(`Removed "${name}" from Favourites`);
      });
    });
  }

  // Handle Add to Favourites click from Manual Entry
  if (addToFavouritesBtn) {
    addToFavouritesBtn.addEventListener('click', async () => {
      const rawName = (manualItemNameInput ? manualItemNameInput.value.trim() : '');
      if (!rawName) {
        showToast('Please enter a Food Item Name first!');
        if (manualItemNameInput) manualItemNameInput.focus();
        return;
      }
      const name = rawName;
      const cal = parseInt(manualCaloriesInput ? manualCaloriesInput.value : 0, 10) || 0;
      const p = parseFloat(manualProteinInput ? manualProteinInput.value : 0) || 0;
      const c = parseFloat(manualCarbsInput ? manualCarbsInput.value : 0) || 0;
      const f = parseFloat(manualFatInput ? manualFatInput.value : 0) || 0;
      const fib = parseFloat(manualFiberInput ? manualFiberInput.value : 0) || 0;

      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      const token = localStorage.getItem('fittrack_token');
      const email = curUser ? curUser.email : 'default';

      // Visual feedback on button
      addToFavouritesBtn.classList.add('saved');
      addToFavouritesBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>★ Added!</span>
      `;
      setTimeout(() => {
        addToFavouritesBtn.classList.remove('saved');
        addToFavouritesBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>Add to Favourites</span>
        `;
      }, 1500);

      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ' + token : '',
            'X-User-Email': email
          },
          body: JSON.stringify({
            email,
            name,
            portion: `1 serving (Fib: ${fib}g)`,
            calories: cal,
            protein: Math.round(p),
            carbs: Math.round(c),
            fats: Math.round(f),
            fiber: Math.round(fib)
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.favorite) {
            userFavourites.unshift(data.favorite);
            localStorage.setItem('fittrack_favs_cache', JSON.stringify(userFavourites));
            renderFavouritesList(userFavourites);
            showToast(`★ Added "${name}" to Favourites!`);
            return;
          }
        }
      } catch (err) {
        console.warn('API error adding favorite:', err);
      }

      // Offline / fallback storage
      const fallbackFav = {
        id: 'fav_loc_' + Date.now(),
        name,
        portion: `1 serving (Fib: ${fib}g)`,
        calories: cal,
        protein: Math.round(p),
        carbs: Math.round(c),
        fats: Math.round(f),
        fiber: Math.round(fib),
        createdAt: Date.now()
      };
      userFavourites.unshift(fallbackFav);
      localStorage.setItem('fittrack_favs_cache', JSON.stringify(userFavourites));
      renderFavouritesList(userFavourites);
      showToast(`★ Added "${name}" to Favourites!`);
    });
  }

  // Initial fetch of favourites on app startup
  fetchFavourites();

  // ==================== DYNAMIC WORKOUT TRACKER MODULE ====================
  const exerciseLibrary = [
    // BICEPS
    { id: 'hammer_curl', name: 'Hammer Curls', muscle: 'biceps', muscleTag: 'Biceps & Brachialis', meta: '3 sets × 10 reps • 14 kg dumbbells', calBurn: 65 },
    { id: 'incline_db_curl', name: 'Incline Dumbbell Curls', muscle: 'biceps', muscleTag: 'Biceps Long Head', meta: '3 sets × 10 reps • 12 kg dumbbells', calBurn: 60 },
    { id: 'barbell_bicep_curl', name: 'Barbell Bicep Curls', muscle: 'biceps', muscleTag: 'Biceps Overall', meta: '3 sets × 10 reps • 30 kg EZ Bar', calBurn: 75 },
    { id: 'preacher_curl', name: 'Preacher Curls', muscle: 'biceps', muscleTag: 'Biceps Short Head', meta: '3 sets × 10 reps • 25 kg EZ Bar', calBurn: 70 },

    // TRICEPS
    { id: 'tricep_db_ext', name: 'Dumbbell Tricep Extension', muscle: 'triceps', muscleTag: 'Triceps Long Head', meta: '3 sets × 10 reps • 20 kg dumbbell', calBurn: 55 },
    { id: 'tricep_pushdown', name: 'Cable Tricep Pushdowns', muscle: 'triceps', muscleTag: 'Triceps Lateral Head', meta: '3 sets × 10 reps • 35 kg cable', calBurn: 65 },
    { id: 'skullcrushers', name: 'Barbell Skullcrushers', muscle: 'triceps', muscleTag: 'Triceps Overall', meta: '3 sets × 10 reps • 25 kg EZ Bar', calBurn: 70 },
    { id: 'tricep_dips', name: 'Parallel Bar Dips', muscle: 'triceps', muscleTag: 'Triceps & Chest', meta: '3 sets × 10 reps • Bodyweight', calBurn: 80 },

    // BACK
    { id: 'deadlift', name: 'Barbell Deadlifts', muscle: 'back', muscleTag: 'Lower Back & Glutes', meta: '3 sets × 10 reps • 90 kg', calBurn: 180 },
    { id: 'lat_pulldown', name: 'Wide-Grip Lat Pulldown', muscle: 'back', muscleTag: 'Lats & Upper Back', meta: '3 sets × 10 reps • 55 kg cable', calBurn: 90 },
    { id: 'bent_over_row', name: 'Bent-Over Barbell Rows', muscle: 'back', muscleTag: 'Mid Back & Rhomboids', meta: '3 sets × 10 reps • 55 kg', calBurn: 110 },
    { id: 'seated_cable_row', name: 'Seated Cable Rows', muscle: 'back', muscleTag: 'Lats & Rhomboids', meta: '3 sets × 10 reps • 50 kg cable', calBurn: 85 },

    // CHEST
    { id: 'bench_press', name: 'Barbell Bench Press', muscle: 'chest', muscleTag: 'Chest & Front Delts', meta: '3 sets × 10 reps • 70 kg', calBurn: 130 },
    { id: 'incline_db_press', name: 'Incline Dumbbell Press', muscle: 'chest', muscleTag: 'Upper Chest', meta: '3 sets × 10 reps • 24 kg dumbbells', calBurn: 115 },
    { id: 'cable_flyes', name: 'Cable Chest Flyes', muscle: 'chest', muscleTag: 'Chest Inner Pecs', meta: '3 sets × 10 reps • 20 kg per side', calBurn: 80 },

    // LEGS
    { id: 'squats', name: 'Barbell Back Squats', muscle: 'legs', muscleTag: 'Quads & Glutes', meta: '3 sets × 10 reps • 75 kg', calBurn: 160 },
    { id: 'leg_press', name: 'Incline Leg Press', muscle: 'legs', muscleTag: 'Quads & Hamstrings', meta: '3 sets × 10 reps • 140 kg', calBurn: 135 },
    { id: 'lunges', name: 'Walking Dumbbell Lunges', muscle: 'legs', muscleTag: 'Legs & Balance', meta: '3 sets × 10 reps • 14 kg dumbbells', calBurn: 120 },
    { id: 'rdl', name: 'Romanian Deadlifts', muscle: 'legs', muscleTag: 'Hamstrings & Glutes', meta: '3 sets × 10 reps • 70 kg', calBurn: 140 },
    { id: 'calves', name: 'Standing Calf Raises', muscle: 'legs', muscleTag: 'Calves & Ankles', meta: '3 sets × 15 reps • 40 kg machine', calBurn: 50 },

    // SHOULDERS
    { id: 'oh_press', name: 'Overhead Dumbbell Press', muscle: 'shoulders', muscleTag: 'Front & Side Delts', meta: '3 sets × 10 reps • 18 kg dumbbells', calBurn: 95 },
    { id: 'lateral_raises', name: 'Dumbbell Lateral Raises', muscle: 'shoulders', muscleTag: 'Side Delts', meta: '3 sets × 12 reps • 10 kg dumbbells', calBurn: 55 },
    { id: 'face_pulls', name: 'Cable Face Pulls', muscle: 'shoulders', muscleTag: 'Rear Delts & Rotator Cuff', meta: '3 sets × 12 reps • 25 kg cable', calBurn: 60 },

    // ABS
    { id: 'crunches', name: 'Abdominal Crunches', muscle: 'abs', muscleTag: 'Upper Abs', meta: '3 sets × 15 reps • Bodyweight', calBurn: 45 },
    { id: 'leg_raises', name: 'Hanging Leg Raises', muscle: 'abs', muscleTag: 'Lower Abs', meta: '3 sets × 12 reps • Bodyweight', calBurn: 55 },
    { id: 'cable_woodchopper', name: 'Cable Woodchoppers', muscle: 'abs', muscleTag: 'Obliques & Core', meta: '3 sets × 12 reps • 20 kg cable', calBurn: 65 }
  ];

  let currentMuscleFilter = 'all';
  let completedSetMap = {}; // "exId_setNum" -> true

  const exerciseChecklistEl = document.getElementById('exerciseChecklist');
  const heroActiveBurn = document.getElementById('heroActiveBurn');
  const heroSelectedCount = document.getElementById('heroSelectedCount');
  const heroWorkoutMins = document.getElementById('heroWorkoutMins');
  const finishWorkoutBtn = document.getElementById('finishWorkoutBtn');

  function calculateActiveWorkoutBurn() {
    let totalBurn = 0;
    let completedExCount = 0;
    let totalSetsDone = 0;

    exerciseLibrary.forEach(ex => {
      let setsDone = 0;
      for (let s = 1; s <= 3; s++) {
        if (completedSetMap[`${ex.id}_${s}`]) {
          setsDone++;
          totalSetsDone++;
        }
      }
      if (setsDone > 0) {
        totalBurn += Math.round((setsDone / 3) * ex.calBurn);
      }
      if (setsDone === 3) {
        completedExCount++;
      }
    });

    return { totalBurn, completedExCount, totalSetsDone };
  }

  function updateWorkoutHeroUI() {
    const { totalBurn, completedExCount } = calculateActiveWorkoutBurn();
    state.activeBurned = totalBurn;

    if (heroActiveBurn) heroActiveBurn.textContent = `${totalBurn} kcal burned today`;
    if (heroSelectedCount) heroSelectedCount.textContent = `${completedExCount} ${completedExCount === 1 ? 'exercise' : 'exercises'}`;

    if (checklistCountEl) {
      const visibleCards = document.querySelectorAll('.exercise-item-card');
      const visibleCompleted = document.querySelectorAll('.exercise-item-card.completed').length;
      checklistCountEl.textContent = `${visibleCompleted} of ${visibleCards.length} Completed`;
    }

    updateOverviewMetrics();
    if (typeof updateMacroRings === 'function') updateMacroRings();
  }

  function renderExerciseChecklist() {
    if (!exerciseChecklistEl) return;
    const filtered = exerciseLibrary.filter(ex => {
      if (currentMuscleFilter === 'all') return true;
      return ex.muscle.toLowerCase() === currentMuscleFilter.toLowerCase();
    });

    exerciseChecklistEl.innerHTML = filtered.map(ex => {
      const s1 = !!completedSetMap[`${ex.id}_1`];
      const s2 = !!completedSetMap[`${ex.id}_2`];
      const s3 = !!completedSetMap[`${ex.id}_3`];
      const isExCompleted = s1 && s2 && s3;

      return `
        <div class="card exercise-item-card ${isExCompleted ? 'completed' : ''}" data-id="${ex.id}" data-muscle="${ex.muscle}">
          <div class="exercise-card-header" style="cursor: pointer;">
            <button type="button" class="checkbox-circle ${isExCompleted ? 'checked' : ''}" data-id="${ex.id}" aria-label="Toggle ${ex.name}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <div class="exercise-info" style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                <h3 class="exercise-title ${isExCompleted ? 'completed strikethrough' : ''}" style="margin:0; ${isExCompleted ? 'text-decoration: line-through !important; opacity: 0.6; color: var(--text-muted) !important;' : ''}">${ex.name}</h3>
                <span class="tag-pill-lime" style="font-size:10px; padding:2px 6px;">${ex.calBurn} kcal</span>
              </div>
              <p class="exercise-meta" style="margin-top:2px;">${ex.meta} • <span style="color:var(--scanner-purple); font-weight:600;">${ex.muscleTag}</span></p>
            </div>
          </div>
          <div class="sets-bubble-row">
            <span class="set-bubble ${s1 ? 'done active' : ''}" data-id="${ex.id}" data-set="1">Set 1: 10 reps</span>
            <span class="set-bubble ${s2 ? 'done active' : ''}" data-id="${ex.id}" data-set="2">Set 2: 10 reps</span>
            <span class="set-bubble ${s3 ? 'done active' : ''}" data-id="${ex.id}" data-set="3">Set 3: 10 reps</span>
          </div>
        </div>
      `;
    }).join('');

    function toggleExerciseComplete(exId, shouldComplete) {
      completedSetMap[`${exId}_1`] = shouldComplete;
      completedSetMap[`${exId}_2`] = shouldComplete;
      completedSetMap[`${exId}_3`] = shouldComplete;

      renderExerciseChecklist();
      updateWorkoutHeroUI();

      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      } catch (e) {}
      if (curUser && curUser.email) saveUserData(curUser.email);
    }

    // Attach Checkbox Circle handlers
    exerciseChecklistEl.querySelectorAll('.checkbox-circle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const exId = btn.dataset.id;
        const card = btn.closest('.exercise-item-card');
        const isDone = !card.classList.contains('completed');
        toggleExerciseComplete(exId, isDone);
      });
    });

    // Attach Exercise Header / Info handlers so clicking anywhere on the exercise card header toggles it
    exerciseChecklistEl.querySelectorAll('.exercise-info').forEach(info => {
      info.addEventListener('click', (e) => {
        const card = info.closest('.exercise-item-card');
        const exId = card.dataset.id;
        const isDone = !card.classList.contains('completed');
        toggleExerciseComplete(exId, isDone);
      });
    });

    // Attach Set Bubble handlers
    exerciseChecklistEl.querySelectorAll('.set-bubble').forEach(bubble => {
      bubble.addEventListener('click', (e) => {
        e.stopPropagation();
        const exId = bubble.dataset.id;
        const setNum = bubble.dataset.set;
        const key = `${exId}_${setNum}`;

        completedSetMap[key] = !completedSetMap[key];

        renderExerciseChecklist();
        updateWorkoutHeroUI();

        let curUser = null;
        try {
          curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
        } catch (e) {}
        if (curUser && curUser.email) saveUserData(curUser.email);
      });
    });

    updateWorkoutHeroUI();
  }

  // Muscle Filter Chips Click Handlers
  const activeFilterBadge = document.getElementById('activeFilterBadge');
  const muscleChips = document.querySelectorAll('.muscle-chip');
  muscleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      muscleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMuscleFilter = chip.dataset.muscle || 'all';
      if (activeFilterBadge) {
        activeFilterBadge.textContent = chip.textContent.trim();
      }
      renderExerciseChecklist();
      chip.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    });
  });

  // Finish Workout Action Button
  if (finishWorkoutBtn) {
    finishWorkoutBtn.addEventListener('click', () => {
      const { totalBurn } = calculateActiveWorkoutBurn();
      state.activeBurned = totalBurn;

      updateMacroRings();
      updateOverviewMetrics();

      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      } catch (e) {}
      if (curUser && curUser.email) saveUserData(curUser.email);

      showToast(`🎉 Workout Finished! Logged ${totalBurn} active kcal burned to Overview!`);
      switchTab('tabOverview');
    });
  }

  // Overview Period Switcher (Today vs This Week)
  const overviewPeriodTabs = document.querySelectorAll('.period-tab');
  const metricsGridHeading = document.getElementById('metricsGridHeading');
  const metricCaloriesVal = document.getElementById('metricCaloriesVal');
  const metricCaloriesTitle = document.getElementById('metricCaloriesTitle');
  const metricCaloriesSub = document.getElementById('metricCaloriesSub');
  const metricStepsVal = document.getElementById('metricStepsVal');
  const metricStepsSub = document.getElementById('metricStepsSub');
  const metricActiveMinsVal = document.getElementById('metricActiveMinsVal');
  const metricActiveMinsSub = document.getElementById('metricActiveMinsSub');
  const metricSleepVal = document.getElementById('metricSleepVal');
  const metricSleepTitle = document.getElementById('metricSleepTitle');
  const metricSleepSub = document.getElementById('metricSleepSub');

  const weeklyBreakdownCard = document.getElementById('weeklyBreakdownCard');
  const weeklyDaysList = document.getElementById('weeklyDaysList');
  const weeklyBreakdownBadge = document.getElementById('weeklyBreakdownBadge');
  const energyBalanceTitle = document.getElementById('energyBalanceTitle');
  const overviewConsumedLbl = document.getElementById('overviewConsumedLbl');
  const overviewBurnedLbl = document.getElementById('overviewBurnedLbl');
  const weeklyAveragesRow = document.getElementById('weeklyAveragesRow');
  const overviewAvgConsumed = document.getElementById('overviewAvgConsumed');
  const overviewAvgBurned = document.getElementById('overviewAvgBurned');

  let currentOverviewPeriod = 'today';
  let overviewWeekOffset = 0; // 0 = This Week, 1 = Next Week, -1 = Prev Week

  function getWeeklyTotals() {
    const baseDate = getBaseDate();
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (e) {}
    const email = curUser ? curUser.email : null;
    const isDemo = email === 'alex.rivera@wellness.io';

    let historyMap = {};
    if (email) {
      try {
        historyMap = JSON.parse(localStorage.getItem('fittrack_history_' + email) || '{}');
      } catch (e) {}
    }

    const todayStr = getTodayDateString();
    let totalConsumed = 0;
    let totalBurned = 0;

    const demoDefaults = [
      { consumed: 2150, burned: 420 },
      { consumed: 1980, burned: 380 },
      { consumed: 2240, burned: 450 },
      { consumed: 2010, burned: 350 },
      { consumed: 2320, burned: 490 },
      { consumed: 1850, burned: 310 },
      { consumed: 1720, burned: 260 }
    ];

    const todayDayIndex = (baseDate.getDay() === 0 ? 6 : baseDate.getDay() - 1);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      let dayConsumed = 0;
      let dayBurned = 0;

      if (dateKey === todayStr) {
        dayConsumed = state.consumedCalories || 0;
        dayBurned = state.activeBurned || 0;
      } else if (historyMap[dateKey]) {
        dayConsumed = historyMap[dateKey].consumed || 0;
        dayBurned = historyMap[dateKey].burned || 0;
      } else if (isDemo && dayDate < baseDate) {
        dayConsumed = demoDefaults[i].consumed;
        dayBurned = demoDefaults[i].burned;
      }

      totalConsumed += dayConsumed;
      totalBurned += dayBurned;
    }

    const elapsedDays = Math.max(1, todayDayIndex + 1);
    const avgConsumed = Math.round(totalConsumed / elapsedDays);
    const avgBurned = Math.round(totalBurned / elapsedDays);

    return {
      totalConsumed,
      totalBurned,
      avgConsumed,
      avgBurned,
      elapsedDays
    };
  }

  function getBaseDate() {
    const todayStr = getTodayDateString();
    if (todayStr) {
      const parts = todayStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    return new Date();
  }

  function getWeekDateRangeString(offset = 0) {
    const today = getBaseDate();
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day) + (offset * 7);

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monStr = `${monthNames[monday.getMonth()]} ${monday.getDate()}`;
    const sunStr = `${monthNames[sunday.getMonth()]} ${sunday.getDate()}`;

    let labelPrefix = 'THIS WEEK';
    if (offset === 1) labelPrefix = 'NEXT WEEK';
    else if (offset > 1) labelPrefix = `NEXT WEEK +${offset}`;
    else if (offset === -1) labelPrefix = 'PREV WEEK';
    else if (offset < -1) labelPrefix = `PAST WEEK ${offset}`;

    return `${labelPrefix} (${monStr} - ${sunStr})`;
  }

  function renderWeeklyDaysBreakdown(offset = 0) {
    if (!weeklyDaysList) return;

    const baseDate = getBaseDate();
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + (offset * 7);

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (weeklyBreakdownBadge) {
      weeklyBreakdownBadge.textContent = `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${monthNames[sunday.getMonth()]} ${sunday.getDate()}`;
    }

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (e) {}
    const email = curUser ? curUser.email : null;
    const isDemo = email === 'alex.rivera@wellness.io';

    let historyMap = {};
    if (email) {
      try {
        historyMap = JSON.parse(localStorage.getItem('fittrack_history_' + email) || '{}');
      } catch (e) {}
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayStr = getTodayDateString();

    let html = '';
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const dayName = dayNames[i];
      const dateDisplay = `${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}`;
      const isToday = (dateKey === todayStr);

      let consumed = 0;
      let burned = 0;

      if (isToday) {
        consumed = state.consumedCalories || 0;
        burned = state.activeBurned || 0;
      } else if (historyMap[dateKey]) {
        consumed = historyMap[dateKey].consumed || 0;
        burned = historyMap[dateKey].burned || 0;
      } else if (isDemo && offset === 0) {
        const demoDefaults = [
          { consumed: 2150, burned: 420 },
          { consumed: 1980, burned: 380 },
          { consumed: 2240, burned: 450 },
          { consumed: 2010, burned: 350 },
          { consumed: 2320, burned: 490 },
          { consumed: 1850, burned: 310 },
          { consumed: 1720, burned: 260 }
        ];
        if (dayDate < baseDate) {
          consumed = demoDefaults[i].consumed;
          burned = demoDefaults[i].burned;
        }
      }

      html += `
        <div class="weekly-day-card ${isToday ? 'current-day' : ''}">
          <div class="weekly-day-top">
            <div class="weekly-day-title-group">
              <span class="weekly-day-name">${dayName}</span>
              <span class="weekly-day-date">${dateDisplay}</span>
            </div>
            ${isToday ? '<span class="today-indicator-pill">Today • Active</span>' : ''}
          </div>
          <div class="weekly-day-metrics-row">
            <div class="weekly-metric-item">
              <div class="weekly-metric-icon bg-carbs-light">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#EE924F">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
              <div class="weekly-metric-text">
                <span class="weekly-metric-lbl">Calories Consumed</span>
                <span class="weekly-metric-val" style="color: var(--accent-carbs);">${consumed.toLocaleString()} <small>kcal</small></span>
              </div>
            </div>
            <div class="weekly-metric-divider"></div>
            <div class="weekly-metric-item">
              <div class="weekly-metric-icon bg-protein-light">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#1D3F37">
                  <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                </svg>
              </div>
              <div class="weekly-metric-text">
                <span class="weekly-metric-lbl">Active Burned</span>
                <span class="weekly-metric-val" style="color: var(--pill-dark);">${burned.toLocaleString()} <small>kcal</small></span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    weeklyDaysList.innerHTML = html;
  }

  function updateOverviewMetrics() {
    const activeBurn = state.activeBurned || 0;
    const isZeroUser = state.consumedCalories === 0 && activeBurn === 0;

    const overviewConsumed = document.getElementById('overviewConsumed');
    const overviewBurned = document.getElementById('overviewBurned');
    const energyBalanceNet = document.getElementById('energyBalanceNet');
    const balanceRatioConsumed = document.getElementById('balanceRatioConsumed');
    const balanceRatioBurned = document.getElementById('balanceRatioBurned');

    if (currentOverviewPeriod === 'today') {
      if (energyBalanceTitle) energyBalanceTitle.textContent = "Daily Energy Balance";
      if (overviewConsumedLbl) overviewConsumedLbl.textContent = "Consumed";
      if (overviewBurnedLbl) overviewBurnedLbl.textContent = "Active Burned";

      if (overviewConsumed) {
        overviewConsumed.textContent = `${state.consumedCalories.toLocaleString()} kcal`;
      }
      if (overviewBurned) {
        overviewBurned.textContent = `${activeBurn.toLocaleString()} kcal`;
      }
      if (energyBalanceNet) {
        const net = state.consumedCalories - activeBurn;
        energyBalanceNet.textContent = `${net > 0 ? '+' : ''}${net.toLocaleString()} kcal Net`;
      }
      if (weeklyAveragesRow) weeklyAveragesRow.style.display = 'none';

      if (balanceRatioConsumed && balanceRatioBurned) {
        const total = state.consumedCalories + activeBurn;
        const consumedRatio = total > 0 ? Math.round((state.consumedCalories / total) * 100) : 0;
        balanceRatioConsumed.style.width = `${consumedRatio}%`;
        balanceRatioBurned.style.width = `${total > 0 ? 100 - consumedRatio : 0}%`;
      }

      if (weeklyBreakdownCard) weeklyBreakdownCard.style.display = 'none';
      if (metricsGridHeading) metricsGridHeading.textContent = "Today's Health Metrics";
      if (metricCaloriesVal) metricCaloriesVal.textContent = activeBurn.toLocaleString();
      if (metricCaloriesTitle) metricCaloriesTitle.textContent = "Calories Burned";
      if (metricCaloriesSub) metricCaloriesSub.textContent = `${activeBurn.toLocaleString()} active kcal burned`;

      // Today's Health Metrics (Dummy data reset to 0; Calories Burned dynamically tracks user activity)
      if (metricStepsVal) metricStepsVal.textContent = "0";
      if (metricStepsSub) metricStepsSub.textContent = "steps (0% of 10k goal)";

      if (metricActiveMinsVal) metricActiveMinsVal.textContent = "0";
      if (metricActiveMinsSub) metricActiveMinsSub.textContent = "min (0% of 45 min goal)";

      if (metricSleepVal) metricSleepVal.textContent = "0h 0m";
      if (metricSleepTitle) metricSleepTitle.textContent = "Sleep Duration";
      if (metricSleepSub) metricSleepSub.textContent = "No sleep recorded yet";
    } else {
      const weekData = getWeeklyTotals();

      if (energyBalanceTitle) energyBalanceTitle.textContent = "Weekly Energy Balance";
      if (overviewConsumedLbl) overviewConsumedLbl.textContent = "Total Consumed";
      if (overviewBurnedLbl) overviewBurnedLbl.textContent = "Total Burned";

      if (overviewConsumed) {
        overviewConsumed.textContent = `${weekData.totalConsumed.toLocaleString()} kcal`;
      }
      if (overviewBurned) {
        overviewBurned.textContent = `${weekData.totalBurned.toLocaleString()} kcal`;
      }
      if (energyBalanceNet) {
        const net = weekData.totalConsumed - weekData.totalBurned;
        energyBalanceNet.textContent = `${net > 0 ? '+' : ''}${net.toLocaleString()} kcal Net`;
      }
      if (weeklyAveragesRow) {
        weeklyAveragesRow.style.display = 'flex';
        if (overviewAvgConsumed) overviewAvgConsumed.textContent = `${weekData.avgConsumed.toLocaleString()} kcal/day`;
        if (overviewAvgBurned) overviewAvgBurned.textContent = `${weekData.avgBurned.toLocaleString()} kcal/day`;
      }

      if (balanceRatioConsumed && balanceRatioBurned) {
        const total = weekData.totalConsumed + weekData.totalBurned;
        const consumedRatio = total > 0 ? Math.round((weekData.totalConsumed / total) * 100) : 0;
        balanceRatioConsumed.style.width = `${consumedRatio}%`;
        balanceRatioBurned.style.width = `${total > 0 ? 100 - consumedRatio : 0}%`;
      }

      if (weeklyBreakdownCard) {
        weeklyBreakdownCard.style.display = 'block';
        renderWeeklyDaysBreakdown(0);
      }

      if (metricsGridHeading) metricsGridHeading.textContent = "This Week's Aggregate Metrics";
      if (metricCaloriesVal) metricCaloriesVal.textContent = weekData.totalBurned.toLocaleString();
      if (metricCaloriesTitle) metricCaloriesTitle.textContent = "Calories Burned";
      if (metricCaloriesSub) metricCaloriesSub.textContent = `${weekData.totalBurned.toLocaleString()} active kcal this week`;

      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      } catch (e) {}
      const isDemo = curUser && curUser.email === 'alex.rivera@wellness.io';

      if (metricStepsVal) metricStepsVal.textContent = isDemo ? "82,641" : "0";
      if (metricStepsSub) metricStepsSub.textContent = isDemo ? "steps (82% of weekly goal)" : "steps (0% of weekly goal)";

      if (metricActiveMinsVal) metricActiveMinsVal.textContent = isDemo ? "558" : "0";
      if (metricActiveMinsSub) metricActiveMinsSub.textContent = isDemo ? "min / weekly total" : "min / weekly total";

      if (metricSleepVal) metricSleepVal.textContent = isDemo ? "51h 36m" : "0h 0m";
      if (metricSleepTitle) metricSleepTitle.textContent = "Weekly Sleep";
      if (metricSleepSub) metricSleepSub.textContent = isDemo ? "7h 22m daily avg" : "No weekly sleep recorded";
    }
  }

  overviewPeriodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      overviewPeriodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentOverviewPeriod = tab.dataset.period;
      if (currentOverviewPeriod === 'week') overviewWeekOffset = 0;
      updateOverviewMetrics();
    });
  });

  // Initial render of exercise checklist (now safely after Overview variables are declared)
  renderExerciseChecklist();

  // Profile Slider
  if (targetSlider) {
    targetSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      sliderValDisplay.textContent = `${val.toLocaleString()} kcal`;
      state.targetCalories = val;
      updateMacroRings();
      updateMealSummaries();
      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      if (curUser && curUser.email) saveUserData(curUser.email);
    });
  }

  // Toggle Full View Frame
  if (toggleFrameBtn && phoneFrame) {
    toggleFrameBtn.addEventListener('click', () => {
      phoneFrame.classList.toggle('full-view');
      const isFull = phoneFrame.classList.contains('full-view');
      toggleFrameBtn.textContent = isFull ? 'Restore Phone Frame' : 'Toggle Device Frame';
    });
  }

  // ==================== AUTH FLOW LOGIC (INTRO / LOGIN / SIGNUP) ====================
  const authContainer = document.getElementById('authContainer');
  const viewIntro = document.getElementById('viewIntro');
  const viewLogin = document.getElementById('viewLogin');
  const viewSignUp = document.getElementById('viewSignUp');
  const bottomNavBar = document.querySelector('.bottom-nav-bar');

  const showIntroBtn = document.getElementById('showIntroBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showSignUpBtn = document.getElementById('showSignUpBtn');
  const showAppBtn = document.getElementById('showAppBtn');

  const introEnterBtn = document.getElementById('introEnterBtn');
  const linkToSignUp = document.getElementById('linkToSignUp');
  const linkToLogin = document.getElementById('linkToLogin');
  const signUpBackBtn = document.getElementById('signUpBackBtn');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const signUpSubmitBtn = document.getElementById('signUpSubmitBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const socialBtns = document.querySelectorAll('.social-btn');

  const screenViewport = document.querySelector('.screen-viewport');

  function showAuthView(viewName) {
    if (screenViewport) {
      screenViewport.style.setProperty('display', 'none', 'important');
    }
    if (authContainer) {
      authContainer.style.setProperty('display', 'flex', 'important');
      authContainer.style.setProperty('z-index', '9999', 'important');
    }
    if (bottomNavBar) {
      bottomNavBar.style.setProperty('display', 'none', 'important');
    }

    if (viewIntro) viewIntro.classList.remove('active');
    if (viewLogin) viewLogin.classList.remove('active');
    if (viewSignUp) viewSignUp.classList.remove('active');

    if (viewName === 'intro' && viewIntro) {
      viewIntro.classList.add('active');
    } else if (viewName === 'login' && viewLogin) {
      viewLogin.classList.add('active');
    } else if (viewName === 'signup' && viewSignUp) {
      viewSignUp.classList.add('active');
    }
  }

  function enterAppFromAuth() {
    if (authContainer) {
      authContainer.style.setProperty('display', 'none', 'important');
    }
    if (screenViewport) {
      screenViewport.style.setProperty('display', 'block', 'important');
    }
    if (bottomNavBar) {
      bottomNavBar.style.setProperty('display', 'flex', 'important');
    }
    switchTab('tabNutrition');
  }

  if (showIntroBtn) showIntroBtn.addEventListener('click', () => showAuthView('intro'));
  if (showLoginBtn) showLoginBtn.addEventListener('click', () => showAuthView('login'));
  if (showSignUpBtn) showSignUpBtn.addEventListener('click', () => showAuthView('signup'));
  if (showAppBtn) showAppBtn.addEventListener('click', enterAppFromAuth);

  if (introEnterBtn) introEnterBtn.addEventListener('click', () => showAuthView('login'));
  if (linkToSignUp) linkToSignUp.addEventListener('click', () => showAuthView('signup'));
  if (linkToLogin) linkToLogin.addEventListener('click', () => showAuthView('login'));
  if (signUpBackBtn) signUpBackBtn.addEventListener('click', () => showAuthView('login'));

  const loginErrorAlert = document.getElementById('loginErrorAlert');
  const signUpErrorAlert = document.getElementById('signUpErrorAlert');

  function showAuthError(alertEl, msg) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.style.display = 'block';
  }

  function clearAuthError(alertEl) {
    if (!alertEl) return;
    alertEl.textContent = '';
    alertEl.style.display = 'none';
  }

  function applyUserProfileToDom(user) {
    if (!user) return;
    const pName = document.getElementById('profileUserName');
    const pEmail = document.getElementById('profileUserEmail');
    const pAvatar = document.getElementById('profileUserAvatar');
    const headerAvatar = document.querySelector('#headerProfileJump .avatar-initials');
    const pAge = document.getElementById('profileAgeVal');
    const pWeight = document.getElementById('profileWeightVal');
    const pHeight = document.getElementById('profileHeightVal');
    const pBmiVal = document.getElementById('profileBmiVal');
    const pBmiBadge = document.getElementById('profileBmiBadge');
    const pActivity = document.getElementById('profileActivityBadge');

    if (pName && user.name) pName.textContent = user.name;
    if (pEmail && user.email) pEmail.textContent = user.email;
    if (user.name) {
      const initials = user.name.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'FT';
      if (pAvatar) pAvatar.textContent = initials;
      if (headerAvatar) headerAvatar.textContent = initials;
    }
    if (pAge && user.age) pAge.innerHTML = `${user.age} <small>yrs</small>`;
    if (pWeight && user.weight) pWeight.innerHTML = `${user.weight} <small>kg</small>`;
    if (pHeight && user.height) pHeight.innerHTML = `${user.height} <small>cm</small>`;

    if (pBmiVal && pBmiBadge && user.weight && user.height) {
      const heightM = user.height / 100;
      const bmi = (user.weight / (heightM * heightM)).toFixed(1);
      pBmiVal.textContent = bmi;
      if (bmi < 18.5) {
        pBmiBadge.textContent = 'Underweight';
        pBmiBadge.className = 'bmi-badge';
      } else if (bmi < 25) {
        pBmiBadge.textContent = 'Normal';
        pBmiBadge.className = 'bmi-badge';
      } else if (bmi < 30) {
        pBmiBadge.textContent = 'Overweight';
        pBmiBadge.className = 'bmi-badge';
      } else {
        pBmiBadge.textContent = 'Obese';
        pBmiBadge.className = 'bmi-badge';
      }
    }
    if (pActivity && user.gymFrequency) {
      pActivity.textContent = `Gym: ${user.gymFrequency}`;
    }

    const pGoal = document.getElementById('profileGoalBadge');
    const pCalSub = document.getElementById('profileCalorieSubtitle');
    const rawGoal = user.goal || (user.nutritionTargets ? user.nutritionTargets.goal : 'maintain') || 'maintain';
    const normGoal = rawGoal.toLowerCase();

    if (pGoal) {
      pGoal.style.display = 'inline-block';
      if (normGoal.includes('loss') || normGoal === 'weight_loss') {
        pGoal.textContent = 'Goal: Weight Loss 📉';
        pGoal.className = 'status-pill goal-pill goal-loss';
        if (pCalSub) pCalSub.textContent = 'Calorie deficit recommended for steady fat loss';
      } else if (normGoal.includes('gain') || normGoal === 'weight_gain') {
        pGoal.textContent = 'Goal: Weight Gain 📈';
        pGoal.className = 'status-pill goal-pill goal-gain';
        if (pCalSub) pCalSub.textContent = 'Calorie surplus recommended for lean muscle gain';
      } else {
        pGoal.textContent = 'Goal: Maintain ⚖️';
        pGoal.className = 'status-pill goal-pill goal-maintain';
        if (pCalSub) pCalSub.textContent = 'Recommended for lean muscle maintenance';
      }
    }

    // Apply calculated personalized calorie & macro targets
    if (user.nutritionTargets) {
      if (user.nutritionTargets.targetCalories) {
        state.targetCalories = user.nutritionTargets.targetCalories;
      }
      if (user.nutritionTargets.targetCarbs) {
        state.targetCarbs = user.nutritionTargets.targetCarbs;
      }
      if (user.nutritionTargets.targetProtein) {
        state.targetProtein = user.nutritionTargets.targetProtein;
      }
      if (user.nutritionTargets.targetFats) {
        state.targetFats = user.nutritionTargets.targetFats;
      }
      if (user.nutritionTargets.targetFiber) {
        state.targetFiber = user.nutritionTargets.targetFiber;
      }
      if (user.nutritionTargets.targetWater) {
        state.waterTarget = user.nutritionTargets.targetWater;
      }
      if (targetSlider) {
        targetSlider.value = state.targetCalories;
        if (sliderValDisplay) sliderValDisplay.textContent = state.targetCalories.toLocaleString() + ' kcal';
      }
      updateMacroRings();
      updateWater();
      updateMealSummaries();
    }
  }

  // ==================== DATA MANAGEMENT & USER STATE ====================

  // Reset all tracked daily metrics to 0 (for newly registered & fresh users)
  function resetUserDataToZero(shouldPersist = false) {
    const todayStr = getTodayDateString();
    state.currentDate = todayStr;
    state.waterDate = todayStr;
    state.consumedCalories = 0;
    state.carbs = 0;
    state.protein = 0;
    state.fats = 0;
    state.fiber = 0;
    state.waterIntake = 0;
    state.activeBurned = 0;
    state.snackCalories = 0;
    state.breakfastCalories = 0;
    state.lunchCalories = 0;
    state.dinnerCalories = 0;
    state.checklistCompleted = 0;

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch(e) {}
    if (curUser && curUser.nutritionTargets && curUser.nutritionTargets.targetCalories) {
      state.targetCalories = curUser.nutritionTargets.targetCalories;
      state.targetProtein = curUser.nutritionTargets.targetProtein || 140;
      state.targetCarbs = curUser.nutritionTargets.targetCarbs || 180;
      state.targetFats = curUser.nutritionTargets.targetFats || 65;
      state.targetFiber = curUser.nutritionTargets.targetFiber || 30;
      state.waterTarget = curUser.nutritionTargets.targetWater || 2500;
      if (targetSlider) {
        targetSlider.value = state.targetCalories;
        if (sliderValDisplay) sliderValDisplay.textContent = state.targetCalories.toLocaleString() + ' kcal';
      }
    }

    // 1. Daily Nutrition Macro Rings & Badges
    updateMacroRings();

    // 2. Hydration Tracker
    updateWater();

    // 3. Today's Meal Logs
    updateMealSummaries();

    const breakfastItemList = document.getElementById('breakfastItemList');
    if (breakfastItemList) {
      breakfastItemList.innerHTML = '<li class="meal-empty-note">No breakfast logged yet today. Tap + to add food.</li>';
    }

    const lunchItemList = document.getElementById('lunchItemList');
    if (lunchItemList) {
      lunchItemList.innerHTML = '<li class="meal-empty-note">No lunch logged yet today. Tap + to add food.</li>';
    }

    const dinnerItemList = document.getElementById('dinnerItemList');
    if (dinnerItemList) {
      dinnerItemList.innerHTML = '<li class="meal-empty-note">No dinner logged yet today. Tap + to add food.</li>';
    }

    if (snackItemList) {
      snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
    }

    // 4. Workout Checklists & Set Bubbles
    completedSetMap = {};
    renderExerciseChecklist();
    updateWorkoutHeroUI();

    // 5. Overview Tab Data
    updateOverviewMetrics();
    const histBars = document.querySelectorAll('.histogram-bars .bar-fill');
    histBars.forEach(b => b.style.height = '4px');

    if (shouldPersist && curUser && curUser.email) {
      saveUserData(curUser.email);
    }
  }

  // Restore pre-seeded demo state (only for alex.rivera@wellness.io)
  function loadDemoData() {
    const todayStr = getTodayDateString();
    state.currentDate = todayStr;
    state.waterDate = todayStr;
    state.consumedCalories = 1320;
    state.targetCalories = 2300;
    state.carbs = 142;
    state.protein = 98;
    state.fats = 42;
    state.fiber = 28;
    state.targetFiber = 30;
    state.waterIntake = 1750;
    state.waterTarget = 2500;
    state.activeBurned = 540;
    state.snackCalories = 70;
    state.checklistCompleted = 1;

    updateMacroRings();
    updateWater();
    updateDateDisplay();

    const breakfastSummary = document.getElementById('breakfastSummary');
    const breakfastItemList = document.getElementById('breakfastItemList');
    if (breakfastSummary) breakfastSummary.textContent = '620 of 650 kcal';
    if (breakfastItemList) {
      breakfastItemList.innerHTML = `
        <li class="meal-item">
          <div>
            <div class="item-title">Avocado Toast & Poached Egg</div>
            <div class="item-macros">2 slices • P: 18g • C: 44g • F: 18g</div>
          </div>
          <span class="item-cal">410 kcal</span>
        </li>
        <li class="meal-item">
          <div>
            <div class="item-title">Greek Yogurt with Berries</div>
            <div class="item-macros">1 cup (200g) • P: 20g • C: 24g • F: 4g</div>
          </div>
          <span class="item-cal">210 kcal</span>
        </li>
      `;
    }

    const lunchSummary = document.getElementById('lunchSummary');
    const lunchItemList = document.getElementById('lunchItemList');
    if (lunchSummary) lunchSummary.textContent = '630 of 750 kcal';
    if (lunchItemList) {
      lunchItemList.innerHTML = `
        <li class="meal-item">
          <div>
            <div class="item-title">Grilled Chicken Bowl</div>
            <div class="item-macros">350g • P: 48g • C: 52g • F: 12g</div>
          </div>
          <span class="item-cal">520 kcal</span>
        </li>
        <li class="meal-item">
          <div>
            <div class="item-title">Olive Oil Dressing</div>
            <div class="item-macros">1 tbsp • P: 0g • C: 1g • F: 12g</div>
          </div>
          <span class="item-cal">110 kcal</span>
        </li>
      `;
    }

    const dinnerSummary = document.getElementById('dinnerSummary');
    if (dinnerSummary) dinnerSummary.textContent = 'Planned 650 kcal';

    if (snackSummary) snackSummary.textContent = '70 of 250 kcal';
    if (snackItemList) {
      snackItemList.innerHTML = `
        <li class="meal-item">
          <div>
            <div class="item-title">Raw Almonds</div>
            <div class="item-macros">15g • P: 3g • C: 3g • F: 7g</div>
          </div>
          <span class="item-cal">70 kcal</span>
        </li>
      `;
    }

    completedSetMap = {
      'squats_1': true,
      'squats_2': true,
      'squats_3': true
    };
    renderExerciseChecklist();
    updateWorkoutHeroUI();

    ensureDeleteButtonsInMealLists();
    updateOverviewMetrics();
    const heights = ['65%', '80%', '60%', '95%', '75%', '85%', '50%'];
    const barFills = document.querySelectorAll('.histogram-bars .bar-fill');
    barFills.forEach((b, i) => {
      if (heights[i]) b.style.height = heights[i];
    });
  }

  let syncDebounceTimer = null;

  // Cloud Database Sync: Push tracking data to /api/logs/daily
  async function syncDailyLogToDatabase() {
    const token = localStorage.getItem('fittrack_token');
    if (!token) return;

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (e) {}
    if (!curUser || !curUser.email) return;

    const breakfastItemList = document.getElementById('breakfastItemList');
    const lunchItemList = document.getElementById('lunchItemList');
    const dinnerItemList = document.getElementById('dinnerItemList');
    const todayStr = getTodayDateString();

    const payload = {
      date: todayStr,
      updatedAt: Date.now(),
      waterIntake: state.waterIntake || 0,
      waterTarget: state.waterTarget || 2500,
      consumedCalories: state.consumedCalories || 0,
      carbs: state.carbs || 0,
      protein: state.protein || 0,
      fats: state.fats || 0,
      fat: state.fats || 0,
      fiber: state.fiber || 0,
      activeBurned: state.activeBurned || 0,
      completedExercises: completedSetMap || {},
      meals: {
        snackCalories: state.snackCalories || 0,
        breakfastCalories: state.breakfastCalories || 0,
        lunchCalories: state.lunchCalories || 0,
        dinnerCalories: state.dinnerCalories || 0,
        snackHtml: snackItemList ? snackItemList.innerHTML : '',
        breakfastHtml: breakfastItemList ? breakfastItemList.innerHTML : '',
        lunchHtml: lunchItemList ? lunchItemList.innerHTML : '',
        dinnerHtml: dinnerItemList ? dinnerItemList.innerHTML : ''
      }
    };

    try {
      const res = await fetch('/api/logs/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('[FitTrack DB] Synced daily log to database for date:', todayStr);
      }
    } catch (err) {
      console.warn('[FitTrack DB] Background sync error:', err);
    }
  }

  function queueSyncToDatabase() {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncDailyLogToDatabase();
    }, 600);
  }

  // Cloud Database Sync: Pull today's log from /api/logs/daily
  async function fetchDailyLogFromDatabase(email) {
    const token = localStorage.getItem('fittrack_token');
    if (!token || !email) return;

    const todayStr = getTodayDateString();
    try {
      const res = await fetch(`/api/logs/daily?date=${todayStr}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.log) return;

      const log = data.log;
      console.log('[FitTrack DB] Loaded daily log from database:', log);

      const dbFats = log.fats !== undefined && log.fats !== null ? log.fats : (log.fat !== undefined ? log.fat : 0);

      // Conflict resolution: Check if local cache has newer tracking (e.g. user logged items before logout)
      const curEmail = email || '';
      const localSaved = curEmail ? localStorage.getItem('fittrack_data_' + curEmail) : null;
      let localParsed = null;
      try { localParsed = JSON.parse(localSaved || 'null'); } catch (e) {}

      const localUpdatedAt = localParsed?.updatedAt || 0;
      const dbUpdatedAt = Number(log.updatedAt) || 0;
      const localFats = localParsed?.fats !== undefined ? localParsed.fats : (localParsed?.fat || 0);
      const localCal = localParsed?.consumedCalories || 0;

      // If local tracking has more progress or is newer than DB log, keep local and sync forward to cloud
      if (localParsed && (localUpdatedAt > dbUpdatedAt || localFats > dbFats || localCal > (log.consumedCalories || 0))) {
        console.log('[FitTrack DB] Local tracking has newer data than DB log. Retaining local and syncing forward...');
        syncDailyLogToDatabase();
        return;
      }

      state.waterIntake = log.waterIntake || 0;
      state.waterDate = log.date || todayStr;
      state.consumedCalories = log.consumedCalories || 0;
      state.carbs = log.carbs || 0;
      state.protein = log.protein || 0;
      state.fats = dbFats;
      state.fiber = log.fiber || 0;
      if (log.waterTarget) state.waterTarget = log.waterTarget;
      state.activeBurned = log.activeBurned || 0;
      completedSetMap = log.completedExercises || {};

      const meals = log.meals || {};
      state.snackCalories = meals.snackCalories || 0;
      state.breakfastCalories = meals.breakfastCalories || 0;
      state.lunchCalories = meals.lunchCalories || 0;
      state.dinnerCalories = meals.dinnerCalories || 0;

      const breakfastItemList = document.getElementById('breakfastItemList');
      const lunchItemList = document.getElementById('lunchItemList');
      const dinnerItemList = document.getElementById('dinnerItemList');

      if (breakfastItemList && meals.breakfastHtml) {
        breakfastItemList.innerHTML = meals.breakfastHtml;
      }
      if (lunchItemList && meals.lunchHtml) {
        lunchItemList.innerHTML = meals.lunchHtml;
      }
      if (dinnerItemList && meals.dinnerHtml) {
        dinnerItemList.innerHTML = meals.dinnerHtml;
      }
      if (snackItemList && meals.snackHtml) {
        snackItemList.innerHTML = meals.snackHtml;
      }

      renderExerciseChecklist();
      updateWorkoutHeroUI();
      ensureDeleteButtonsInMealLists();
      recalculateMacrosFromDom();
      updateMacroRings();
      updateWater();
      updateMealSummaries();
      updateOverviewMetrics();
      updateDateDisplay();

      // Mirror to local cache for instant offline responsiveness
      const userData = {
        date: todayStr,
        updatedAt: Math.max(Date.now(), Number(log.updatedAt) || 0),
        waterDate: state.waterDate || todayStr,
        waterIntake: state.waterIntake,
        waterTarget: state.waterTarget,
        consumedCalories: state.consumedCalories,
        targetCalories: state.targetCalories,
        carbs: state.carbs,
        protein: state.protein,
        fats: state.fats,
        fat: state.fats,
        fiber: state.fiber,
        activeBurned: state.activeBurned,
        completedSetMap: completedSetMap || {},
        snackCalories: state.snackCalories || 0,
        breakfastCalories: state.breakfastCalories || 0,
        lunchCalories: state.lunchCalories || 0,
        dinnerCalories: state.dinnerCalories || 0,
        snackHtml: snackItemList ? snackItemList.innerHTML : '',
        breakfastHtml: breakfastItemList ? breakfastItemList.innerHTML : '',
        lunchHtml: lunchItemList ? lunchItemList.innerHTML : '',
        dinnerHtml: dinnerItemList ? dinnerItemList.innerHTML : ''
      };
      localStorage.setItem('fittrack_data_' + email, JSON.stringify(userData));
    } catch (err) {
      console.warn('[FitTrack DB] Could not fetch daily log from database:', err);
    }
  }

  // Cloud Database Sync: Pull weekly/historical logs from /api/logs/history
  async function fetchHistoryFromDatabase(email) {
    const token = localStorage.getItem('fittrack_token');
    if (!token || !email) return;

    try {
      const res = await fetch('/api/logs/history', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.history)) return;

      const histKey = 'fittrack_history_' + email;
      let historyMap = {};
      try {
        historyMap = JSON.parse(localStorage.getItem(histKey) || '{}');
      } catch (e) {}

      data.history.forEach(item => {
        if (item.date) {
          historyMap[item.date] = {
            consumed: item.consumed || 0,
            burned: item.burned || 0
          };
        }
      });
      localStorage.setItem(histKey, JSON.stringify(historyMap));
      updateOverviewMetrics();
    } catch (err) {
      console.warn('[FitTrack DB] Could not fetch history from database:', err);
    }
  }

  // Save current user state to localStorage and trigger database sync
  function saveUserData(email) {
    if (!email) return;
    const breakfastItemList = document.getElementById('breakfastItemList');
    const lunchItemList = document.getElementById('lunchItemList');
    const dinnerItemList = document.getElementById('dinnerItemList');
    const todayStr = getTodayDateString();

    const userData = {
      date: todayStr,
      updatedAt: Date.now(),
      waterDate: state.waterDate || todayStr,
      waterIntake: state.waterIntake,
      waterTarget: state.waterTarget,
      consumedCalories: state.consumedCalories,
      targetCalories: state.targetCalories,
      carbs: state.carbs,
      protein: state.protein,
      fats: state.fats,
      fat: state.fats,
      fiber: state.fiber,
      activeBurned: state.activeBurned,
      completedSetMap: completedSetMap || {},
      snackCalories: state.snackCalories || 0,
      breakfastCalories: state.breakfastCalories || 0,
      lunchCalories: state.lunchCalories || 0,
      dinnerCalories: state.dinnerCalories || 0,
      snackHtml: snackItemList ? snackItemList.innerHTML : '',
      breakfastHtml: breakfastItemList ? breakfastItemList.innerHTML : '',
      lunchHtml: lunchItemList ? lunchItemList.innerHTML : '',
      dinnerHtml: dinnerItemList ? dinnerItemList.innerHTML : ''
    };
    localStorage.setItem('fittrack_data_' + email, JSON.stringify(userData));

    try {
      const histKey = 'fittrack_history_' + email;
      const history = JSON.parse(localStorage.getItem(histKey) || '{}');
      history[todayStr] = {
        consumed: state.consumedCalories || 0,
        burned: state.activeBurned || 0
      };
      localStorage.setItem(histKey, JSON.stringify(history));
    } catch (e) {}

    // Synchronize seamlessly to backend database
    queueSyncToDatabase();
  }

  // Load user-specific tracking state
  function loadUserData(email) {
    if (!email) {
      resetUserDataToZero();
      return;
    }
    const todayStr = getTodayDateString();
    state.currentDate = todayStr;

    if (email === 'alex.rivera@wellness.io') {
      const saved = localStorage.getItem('fittrack_data_' + email);
      if (!saved) {
        loadDemoData();
        updateDateDisplay();
        return;
      }
    }

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (e) {}

    // Priority 1: ALWAYS keep the user profile's official target from the backend!
    if (curUser && curUser.nutritionTargets && curUser.nutritionTargets.targetCalories) {
      state.targetCalories = curUser.nutritionTargets.targetCalories;
      state.targetProtein = curUser.nutritionTargets.targetProtein || state.targetProtein;
      state.targetCarbs = curUser.nutritionTargets.targetCarbs || state.targetCarbs;
      state.targetFats = curUser.nutritionTargets.targetFats || state.targetFats;
      state.targetFiber = curUser.nutritionTargets.targetFiber || state.targetFiber || 30;
      state.waterTarget = curUser.nutritionTargets.targetWater || state.waterTarget;
      if (targetSlider) {
        targetSlider.value = state.targetCalories;
        if (sliderValDisplay) sliderValDisplay.textContent = state.targetCalories.toLocaleString() + ' kcal';
      }
    }

    const saved = localStorage.getItem('fittrack_data_' + email);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Check if saved data was from a previous calendar day
        const savedWaterDate = parsed.waterDate || parsed.date;
        const isNewDay = savedWaterDate && savedWaterDate !== todayStr;

        if (isNewDay) {
          console.log(`[FitTrack] New day detected (${todayStr}, last record was ${savedWaterDate}). Resetting calories, macros, and hydration count to 0.`);
          state.waterIntake = 0;
          state.waterDate = todayStr;
          state.consumedCalories = 0;
          state.carbs = 0;
          state.protein = 0;
          state.fats = 0;
          state.fiber = 0;
          state.activeBurned = 0;
          state.snackCalories = 0;
          state.breakfastCalories = 0;
          state.lunchCalories = 0;
          state.dinnerCalories = 0;

          if (!curUser?.nutritionTargets?.targetCalories && parsed.targetCalories) {
            state.targetCalories = parsed.targetCalories;
          }
          if (!curUser?.nutritionTargets?.targetWater && parsed.waterTarget) {
            state.waterTarget = parsed.waterTarget;
          }

          updateMacroRings();
          updateWater();
          updateMealSummaries();

          const breakfastItemList = document.getElementById('breakfastItemList');
          const lunchItemList = document.getElementById('lunchItemList');
          const dinnerItemList = document.getElementById('dinnerItemList');

          if (breakfastItemList) {
            breakfastItemList.innerHTML = '<li class="meal-empty-note">No breakfast logged yet today. Tap + to add food.</li>';
          }
          if (lunchItemList) {
            lunchItemList.innerHTML = '<li class="meal-empty-note">No lunch logged yet today. Tap + to add food.</li>';
          }
          if (dinnerItemList) {
            dinnerItemList.innerHTML = '<li class="meal-empty-note">No dinner logged yet today. Tap + to add food.</li>';
          }
          if (snackItemList) {
            snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
          }

          updateOverviewMetrics();
          updateDateDisplay();
          saveUserData(email);
          return;
        }

        // Same day: restore today's logged state
        state.waterIntake = parsed.waterIntake || 0;
        state.waterDate = savedWaterDate || todayStr;
        state.consumedCalories = parsed.consumedCalories || 0;

        if (!curUser?.nutritionTargets?.targetCalories && parsed.targetCalories) {
          state.targetCalories = parsed.targetCalories;
        }
        state.carbs = parsed.carbs || 0;
        state.protein = parsed.protein || 0;
        state.fats = parsed.fats !== undefined && parsed.fats !== null ? parsed.fats : (parsed.fat || 0);
        state.fiber = parsed.fiber || 0;
        if (!curUser?.nutritionTargets?.targetWater && parsed.waterTarget) {
          state.waterTarget = parsed.waterTarget;
        }
        state.activeBurned = parsed.activeBurned || 0;
        completedSetMap = parsed.completedSetMap || {};

        // Auto-recover completed exercise if activeBurned was recorded previously without completed sets in map
        const hasCompletedSets = Object.values(completedSetMap).some(v => !!v);
        if (state.activeBurned > 0 && !hasCompletedSets) {
          const matched = exerciseLibrary.find(e => e.calBurn === state.activeBurned);
          if (matched) {
            completedSetMap[`${matched.id}_1`] = true;
            completedSetMap[`${matched.id}_2`] = true;
            completedSetMap[`${matched.id}_3`] = true;
          }
        }

        renderExerciseChecklist();
        updateWorkoutHeroUI();

        state.snackCalories = parsed.snackCalories || 0;
        state.breakfastCalories = parsed.breakfastCalories || 0;
        state.lunchCalories = parsed.lunchCalories || 0;
        state.dinnerCalories = parsed.dinnerCalories || 0;

        updateMacroRings();
        updateWater();
        updateMealSummaries();

        const breakfastItemList = document.getElementById('breakfastItemList');
        const lunchItemList = document.getElementById('lunchItemList');
        const dinnerItemList = document.getElementById('dinnerItemList');

        if (breakfastItemList && parsed.breakfastHtml) {
          breakfastItemList.innerHTML = parsed.breakfastHtml;
        } else if (breakfastItemList) {
          breakfastItemList.innerHTML = '<li class="meal-empty-note">No breakfast logged yet today. Tap + to add food.</li>';
        }

        if (lunchItemList && parsed.lunchHtml) {
          lunchItemList.innerHTML = parsed.lunchHtml;
        } else if (lunchItemList) {
          lunchItemList.innerHTML = '<li class="meal-empty-note">No lunch logged yet today. Tap + to add food.</li>';
        }

        if (dinnerItemList && parsed.dinnerHtml) {
          dinnerItemList.innerHTML = parsed.dinnerHtml;
        } else if (dinnerItemList) {
          dinnerItemList.innerHTML = '<li class="meal-empty-note">No dinner logged yet today. Tap + to add food.</li>';
        }

        if (snackItemList && parsed.snackHtml) {
          snackItemList.innerHTML = parsed.snackHtml;
        } else if (snackItemList) {
          snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
        }

        ensureDeleteButtonsInMealLists();
        updateOverviewMetrics();
        updateDateDisplay();

        // Check backend database for newer synced data or updates from another device
        fetchDailyLogFromDatabase(email);
        fetchHistoryFromDatabase(email);
        return;
      } catch (e) {
        console.warn('Failed parsing saved user data', e);
      }
    }

    // Default for fresh user: strictly 0
    resetUserDataToZero();
    state.waterDate = todayStr;
    updateDateDisplay();

    // Check backend database if data exists for this account
    fetchDailyLogFromDatabase(email);
    fetchHistoryFromDatabase(email);
  }

  // Check stored active session on startup
  async function checkActiveSession() {
    const token = localStorage.getItem('fittrack_token');
    if (!token) {
      resetUserDataToZero();
      showAuthView('intro');
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          applyUserProfileToDom(data.user);
          loadUserData(data.user.email);
          enterAppFromAuth();
        }
      } else {
        localStorage.removeItem('fittrack_token');
        localStorage.removeItem('fittrack_user');
        resetUserDataToZero();
        showAuthView('login');
      }
    } catch (err) {
      console.warn('Session verification error:', err);
      resetUserDataToZero();
    }
  }
  checkActiveSession();

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearAuthError(loginErrorAlert);

      const email = document.getElementById('loginEmail')?.value?.trim();
      const password = document.getElementById('loginPassword')?.value;

      if (!email || !password) {
        showAuthError(loginErrorAlert, 'Please enter both your email and password');
        return;
      }

      loginSubmitBtn.textContent = 'Signing in...';
      loginSubmitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('fittrack_token', data.token);
          localStorage.setItem('fittrack_user', JSON.stringify(data.user));
          applyUserProfileToDom(data.user);
          loadUserData(data.user.email);
          loginSubmitBtn.textContent = 'Sign in';
          loginSubmitBtn.disabled = false;
          enterAppFromAuth();
        } else {
          loginSubmitBtn.textContent = 'Sign in';
          loginSubmitBtn.disabled = false;
          showAuthError(loginErrorAlert, data.message || 'Invalid email or password');
        }
      } catch (err) {
        loginSubmitBtn.textContent = 'Sign in';
        loginSubmitBtn.disabled = false;
        showAuthError(loginErrorAlert, 'Unable to connect to the server. Please check your connection.');
      }
    });
  }

  // Activity level / Gym frequency chips for manual sign up
  const manualActivityChips = document.querySelectorAll('#signUpForm .activity-chip');
  let selectedActivityDays = '';
  let selectedActivityLevel = '';

  manualActivityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      manualActivityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedActivityDays = chip.getAttribute('data-days') || '';
      selectedActivityLevel = chip.getAttribute('data-level') || '';
      clearAuthError(signUpErrorAlert);
    });
  });

  // Fitness Goal chips for manual sign up
  const signupGoalChips = document.querySelectorAll('#signUpForm .signup-goal-chip');
  let selectedSignupGoal = 'maintain';

  signupGoalChips.forEach(chip => {
    chip.addEventListener('click', () => {
      signupGoalChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedSignupGoal = chip.getAttribute('data-goal') || 'maintain';
      clearAuthError(signUpErrorAlert);
    });
  });

  if (signUpSubmitBtn) {
    signUpSubmitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearAuthError(signUpErrorAlert);

      const name = document.getElementById('signUpName')?.value?.trim();
      const email = document.getElementById('signUpEmail')?.value?.trim();
      const password = document.getElementById('signUpPassword')?.value;
      const confirmPassword = document.getElementById('signUpConfirmPassword')?.value;
      const ageVal = document.getElementById('signUpAge')?.value?.trim();
      const weightVal = document.getElementById('signUpWeight')?.value?.trim();
      const heightVal = document.getElementById('signUpHeight')?.value?.trim();

      if (!name) {
        showAuthError(signUpErrorAlert, 'Please enter your full name');
        document.getElementById('signUpName')?.focus();
        return;
      }
      if (!email) {
        showAuthError(signUpErrorAlert, 'Please enter a valid email address');
        document.getElementById('signUpEmail')?.focus();
        return;
      }
      if (!password || password.length < 6) {
        showAuthError(signUpErrorAlert, 'Password must be at least 6 characters long');
        document.getElementById('signUpPassword')?.focus();
        return;
      }
      if (password !== confirmPassword) {
        showAuthError(signUpErrorAlert, 'Passwords do not match');
        document.getElementById('signUpConfirmPassword')?.focus();
        return;
      }

      if (!ageVal) {
        showAuthError(signUpErrorAlert, 'Please enter your age');
        document.getElementById('signUpAge')?.focus();
        return;
      }
      const age = parseInt(ageVal, 10);
      if (isNaN(age) || age < 12 || age > 100) {
        showAuthError(signUpErrorAlert, 'Please enter a valid age between 12 and 100');
        document.getElementById('signUpAge')?.focus();
        return;
      }

      if (!weightVal) {
        showAuthError(signUpErrorAlert, 'Please enter your weight in kg');
        document.getElementById('signUpWeight')?.focus();
        return;
      }
      const weight = parseFloat(weightVal);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        showAuthError(signUpErrorAlert, 'Please enter a valid weight between 30 and 300 kg');
        document.getElementById('signUpWeight')?.focus();
        return;
      }

      if (!heightVal) {
        showAuthError(signUpErrorAlert, 'Please enter your height in cm');
        document.getElementById('signUpHeight')?.focus();
        return;
      }
      const height = parseFloat(heightVal);
      if (isNaN(height) || height < 100 || height > 250) {
        showAuthError(signUpErrorAlert, 'Please enter a valid height between 100 and 250 cm');
        document.getElementById('signUpHeight')?.focus();
        return;
      }

      if (!selectedActivityDays) {
        showAuthError(signUpErrorAlert, 'Please select how many days you workout / go to the gym');
        return;
      }

      signUpSubmitBtn.textContent = 'Creating Account...';
      signUpSubmitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            age,
            weight,
            height,
            gymFrequency: selectedActivityDays + ' days/wk',
            goal: selectedSignupGoal
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('fittrack_token', data.token);
          localStorage.setItem('fittrack_user', JSON.stringify(data.user));
          applyUserProfileToDom(data.user);
          // New account ALWAYS starts completely clean at 0
          localStorage.removeItem('fittrack_data_' + data.user.email);
          resetUserDataToZero();
          signUpSubmitBtn.textContent = 'Sign up';
          signUpSubmitBtn.disabled = false;
          enterAppFromAuth();
        } else {
          signUpSubmitBtn.textContent = 'Sign up';
          signUpSubmitBtn.disabled = false;
          showAuthError(signUpErrorAlert, data.message || 'Registration failed');
        }
      } catch (err) {
        signUpSubmitBtn.textContent = 'Sign up';
        signUpSubmitBtn.disabled = false;
        showAuthError(signUpErrorAlert, 'Unable to connect to the server. Please check your connection.');
      }
    });
  }

  // ==================== REAL GOOGLE IDENTITY SERVICES (GSI) & OAUTH 2.0 ====================
  const gsiLoginBtnContainer = document.getElementById('gsiLoginBtnContainer');
  const gsiSignUpBtnContainer = document.getElementById('gsiSignUpBtnContainer');
  const gsiStatusPill = document.getElementById('gsiStatusPill');
  const gsiClientIdPreview = document.getElementById('gsiClientIdPreview');
  const openGoogleConfigModalBtn = document.getElementById('openGoogleConfigModalBtn');
  const headerGoogleConfigBtn = document.getElementById('headerGoogleConfigBtn');
  let googleTokenClient = null;

  // Google Cloud Setup Modal Elements
  const googleConfigModalBackdrop = document.getElementById('googleConfigModalBackdrop');
  const closeGoogleConfigModalBtn = document.getElementById('closeGoogleConfigModalBtn');
  const googleClientIdField = document.getElementById('googleClientIdField');
  const saveGoogleClientIdBtn = document.getElementById('saveGoogleClientIdBtn');
  const googleConfigAlert = document.getElementById('googleConfigAlert');

  // Profile Setup Modal Elements
  const googleProfileModalBackdrop = document.getElementById('googleProfileModalBackdrop');
  const closeGoogleProfileModalBtn = document.getElementById('closeGoogleProfileModalBtn');
  const googleProfileAvatarBadge = document.getElementById('googleProfileAvatarBadge');
  const googleProfileAccountName = document.getElementById('googleProfileAccountName');
  const googleProfileAccountEmail = document.getElementById('googleProfileAccountEmail');
  const googleProfileInputName = document.getElementById('googleProfileInputName');
  const googleProfileInputAge = document.getElementById('googleProfileInputAge');
  const googleProfileInputWeight = document.getElementById('googleProfileInputWeight');
  const googleProfileInputHeight = document.getElementById('googleProfileInputHeight');
  const googleProfileSubmitBtn = document.getElementById('googleProfileSubmitBtn');
  const googleActivityChips = document.querySelectorAll('.google-activity-chip');
  const googleGoalChips = document.querySelectorAll('.google-goal-chip');
  let googleSelectedGoal = 'maintain';

  const authToastNotice = document.getElementById('authToastNotice');
  const authToastText = document.getElementById('authToastText');

  let currentGoogleAuthSource = 'login'; // 'login' or 'signup'
  let currentGoogleClientId = '';
  let googleSetupStatus = 'pending_client_id';
  let stagedGoogleAuth = null;
  let googleSelectedGymDays = '4-5';
  let toastTimeout = null;

  function showToast(message) {
    if (!authToastNotice || !authToastText) return;
    authToastText.textContent = message;
    authToastNotice.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      authToastNotice.classList.remove('show');
    }, 3500);
  }

  // Parse Google JWT ID Token payload (client-side base64 decode)
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn('Could not decode JWT payload:', e);
      return null;
    }
  }

  // Fetch Google OAuth 2.0 config from backend
  async function fetchGoogleOAuthConfig() {
    try {
      const res = await fetch('/api/auth/google/config');
      if (res.ok) {
        const data = await res.json();
        currentGoogleClientId = data.clientId || '';
        googleSetupStatus = data.setupStatus || (data.clientId ? 'configured' : 'pending_client_id');
        updateGoogleConfigUI();
        initGoogleIdentityServices();
      }
    } catch (err) {
      console.warn('Could not fetch Google OAuth config:', err);
    }
  }

  function updateGoogleConfigUI() {
    if (gsiClientIdPreview) {
      if (currentGoogleClientId) {
        const masked = currentGoogleClientId.length > 25
          ? currentGoogleClientId.substring(0, 15) + '...' + currentGoogleClientId.slice(-12)
          : currentGoogleClientId;
        gsiClientIdPreview.textContent = 'Client ID: ' + masked;
      } else {
        gsiClientIdPreview.textContent = 'Client ID: Not yet configured';
      }
    }
    if (gsiStatusPill) {
      if (currentGoogleClientId) {
        gsiStatusPill.textContent = 'Ready (Google Cloud)';
        gsiStatusPill.className = 'google-status-pill';
      } else {
        gsiStatusPill.textContent = 'Setup Required';
        gsiStatusPill.className = 'google-status-pill pending';
      }
    }
    if (googleClientIdField && currentGoogleClientId) {
      googleClientIdField.value = currentGoogleClientId;
    }
  }

  // Initialize official Google Identity Services (GSI)
  function initGoogleIdentityServices() {
    if (!window.google || !window.google.accounts || !currentGoogleClientId) return;

    try {
      // 1. Initialize Sign In With Google (ID Token / One-Tap / Button render)
      if (window.google.accounts.id) {
        google.accounts.id.initialize({
          client_id: currentGoogleClientId,
          callback: onRealGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnOptions = {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
          logo_alignment: 'left'
        };

        // Render official 1-click Google Sign-In button on Login Screen
        const loginContainer = document.getElementById('gsiLoginBtnContainer');
        if (loginContainer) {
          loginContainer.innerHTML = '';
          google.accounts.id.renderButton(loginContainer, btnOptions);
        }

        // Render official 1-click Google Sign-In button on Sign Up Screen
        const signUpContainer = document.getElementById('gsiSignUpBtnContainer');
        if (signUpContainer) {
          signUpContainer.innerHTML = '';
          google.accounts.id.renderButton(signUpContainer, btnOptions);
        }
      }

      // 2. Initialize OAuth2 Token Client for programmatic button clicks
      if (window.google.accounts.oauth2) {
        try {
          googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: currentGoogleClientId,
            scope: 'openid email profile',
            callback: onOAuth2TokenResponse
          });
        } catch (err) {
          console.warn('OAuth2 Token Client init:', err);
        }
      }

      console.log('[FitTrack] Google Identity Services initialized directly on login and signup cards.');
    } catch (err) {
      console.warn('GSI initialize error:', err);
    }
  }

  // Also re-attempt initialization when window finishes loading
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(initGoogleIdentityServices, 350);
    });
  }

  // Callback when user signs in through official Google Identity Services (ID Token)
  async function onRealGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showToast('Google Sign-In was cancelled.');
      return;
    }

    const idToken = response.credential;
    const claims = parseJwt(idToken);

    if (!claims || !claims.email) {
      showToast('Unable to parse Google authentication credentials.');
      return;
    }

    stagedGoogleAuth = {
      idToken: idToken,
      email: claims.email,
      name: claims.name || claims.email.split('@')[0],
      picture: claims.picture || '',
      googleId: claims.sub || ''
    };

    closeGoogleModal();

    // Check if user already exists in backend and already completed their profile
    try {
      const checkRes = await fetch('/api/auth/google/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: stagedGoogleAuth.email, idToken: stagedGoogleAuth.idToken })
      });
      const checkData = await checkRes.json();

      if (checkData && checkData.success && checkData.exists && checkData.hasProfile) {
        // Returning user already completed profile: log in immediately without asking again!
        console.log('[FitTrack] Returning Google user found with profile. Logging in directly.');
        await performFinalGoogleAuth({
          idToken: stagedGoogleAuth.idToken,
          email: stagedGoogleAuth.email,
          name: stagedGoogleAuth.name,
          picture: stagedGoogleAuth.picture,
          googleId: stagedGoogleAuth.googleId
        });
        return;
      }
    } catch (err) {
      console.warn('Google check error:', err);
    }

    // Brand new user: open profile setup modal to fill Age, Weight, Height, Gym days
    openGoogleProfileModal(stagedGoogleAuth.email, stagedGoogleAuth.name, stagedGoogleAuth.picture);
  }

  // Callback when user signs in through OAuth2 Token Client (Access Token)
  async function onOAuth2TokenResponse(tokenResponse) {
    if (!tokenResponse || !tokenResponse.access_token) {
      showToast('Google Sign-In was cancelled.');
      return;
    }

    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const userInfo = await userInfoRes.json();

      if (!userInfo || !userInfo.email) {
        showToast('Unable to retrieve Google profile information.');
        return;
      }

      stagedGoogleAuth = {
        accessToken: tokenResponse.access_token,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || '',
        googleId: userInfo.sub || ''
      };

      closeGoogleModal();

      try {
        const checkRes = await fetch('/api/auth/google/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: stagedGoogleAuth.email })
        });
        const checkData = await checkRes.json();

        if (checkData && checkData.success && checkData.exists && checkData.hasProfile) {
          // Returning user already completed profile: log in immediately without asking again
          console.log('[FitTrack] Returning Google user found with profile. Logging in directly.');
          await performFinalGoogleAuth({
            accessToken: stagedGoogleAuth.accessToken,
            email: stagedGoogleAuth.email,
            name: stagedGoogleAuth.name,
            picture: stagedGoogleAuth.picture,
            googleId: stagedGoogleAuth.googleId
          });
          return;
        }
      } catch (err) {
        console.warn('Google check error:', err);
      }

      // Brand new user: open profile modal to enter physical metrics
      openGoogleProfileModal(stagedGoogleAuth.email, stagedGoogleAuth.name, stagedGoogleAuth.picture);
    } catch (err) {
      console.error('OAuth2 UserInfo error:', err);
      showToast('Google authentication error. Please try again.');
    }
  }

  // Direct 1-click trigger for Google Account Chooser
  function triggerDirectGoogleSignIn(source) {
    currentGoogleAuthSource = source || 'login';

    if (!currentGoogleClientId) {
      openGoogleConfigModal();
      return;
    }

    // 1. Direct popup via OAuth2 Token Client if available
    if (googleTokenClient) {
      try {
        googleTokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Token client request error:', err);
      }
    }

    // 2. Direct One-Tap prompt invocation
    if (window.google && window.google.accounts && window.google.accounts.id) {
      google.accounts.id.prompt();
    }
  }

  function closeGoogleModal() {
    // No-op: intermediate modal has been removed
  }

  // Google Cloud Setup Modal Controls
  function openGoogleConfigModal() {
    if (googleClientIdField && currentGoogleClientId) {
      googleClientIdField.value = currentGoogleClientId;
    }
    if (googleConfigAlert) {
      googleConfigAlert.style.display = 'none';
    }
    if (googleConfigModalBackdrop) {
      googleConfigModalBackdrop.classList.add('show');
    }
  }

  function closeGoogleConfigModal() {
    if (googleConfigModalBackdrop) {
      googleConfigModalBackdrop.classList.remove('show');
    }
  }

  if (openGoogleConfigModalBtn) {
    openGoogleConfigModalBtn.addEventListener('click', () => {
      closeGoogleModal();
      openGoogleConfigModal();
    });
  }

  if (headerGoogleConfigBtn) {
    headerGoogleConfigBtn.addEventListener('click', openGoogleConfigModal);
  }

  if (closeGoogleConfigModalBtn) {
    closeGoogleConfigModalBtn.addEventListener('click', closeGoogleConfigModal);
  }

  if (googleConfigModalBackdrop) {
    googleConfigModalBackdrop.addEventListener('click', (e) => {
      if (e.target === googleConfigModalBackdrop) closeGoogleConfigModal();
    });
  }

  // Save Google Cloud Client ID
  if (saveGoogleClientIdBtn) {
    saveGoogleClientIdBtn.addEventListener('click', async () => {
      const clientId = googleClientIdField?.value?.trim();
      if (!clientId) {
        if (googleConfigAlert) {
          googleConfigAlert.textContent = 'Please enter a valid Google OAuth Client ID.';
          googleConfigAlert.style.display = 'block';
        }
        return;
      }

      saveGoogleClientIdBtn.textContent = 'Saving Client ID...';
      saveGoogleClientIdBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/google/set-client-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId })
        });
        const data = await res.json();

        saveGoogleClientIdBtn.textContent = 'Save & Connect Google OAuth';
        saveGoogleClientIdBtn.disabled = false;

        if (res.ok && data.success) {
          currentGoogleClientId = clientId;
          googleSetupStatus = 'configured';
          updateGoogleConfigUI();
          initGoogleIdentityServices();
          closeGoogleConfigModal();
          showToast('Google OAuth 2.0 Client ID saved successfully!');
        } else {
          if (googleConfigAlert) {
            googleConfigAlert.textContent = data.message || 'Failed to save Google Client ID.';
            googleConfigAlert.style.display = 'block';
          }
        }
      } catch (err) {
        saveGoogleClientIdBtn.textContent = 'Save & Connect Google OAuth';
        saveGoogleClientIdBtn.disabled = false;
        if (googleConfigAlert) {
          googleConfigAlert.textContent = 'Connection error saving Client ID.';
          googleConfigAlert.style.display = 'block';
        }
      }
    });
  }

  // Direct 1-click Google Sign-In triggers (launches Google Account Chooser immediately)
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignUpBtn = document.getElementById('googleSignUpBtn');

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerDirectGoogleSignIn('login');
    });
  }

  if (googleSignUpBtn) {
    googleSignUpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerDirectGoogleSignIn('signup');
    });
  }

  // Gym frequency chip selection in Profile setup popup
  googleActivityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      googleActivityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      googleSelectedGymDays = chip.getAttribute('data-days') || '';
      if (googleProfileErrorAlert) googleProfileErrorAlert.style.display = 'none';
    });
  });

  // Open "Complete Your Profile" modal for FIRST-TIME Google users ONLY
  function openGoogleProfileModal(email, name, picture = '') {
    if (googleProfileAvatarBadge) {
      if (picture) {
        googleProfileAvatarBadge.innerHTML = `<img src="${picture}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      } else {
        const initial = (name || email || 'G').trim().charAt(0).toUpperCase();
        googleProfileAvatarBadge.textContent = initial;
      }
    }
    if (googleProfileAccountName) {
      googleProfileAccountName.textContent = name || 'Google User';
    }
    if (googleProfileAccountEmail) {
      googleProfileAccountEmail.textContent = email;
    }
    if (googleProfileInputName) {
      googleProfileInputName.value = name || '';
    }

    // CRITICAL: NEVER prefill default values for new user - must be blank so user enters their real data
    if (googleProfileInputAge) {
      googleProfileInputAge.value = '';
    }
    if (googleProfileInputWeight) {
      googleProfileInputWeight.value = '';
    }
    if (googleProfileInputHeight) {
      googleProfileInputHeight.value = '';
    }

    // Clear any pre-selected gym frequency chips
    googleSelectedGymDays = '';
    googleActivityChips.forEach(c => c.classList.remove('active'));

    // Reset goal selection
    googleSelectedGoal = 'maintain';
    googleGoalChips.forEach(c => {
      if (c.getAttribute('data-goal') === 'maintain') c.classList.add('active');
      else c.classList.remove('active');
    });

    if (googleProfileErrorAlert) {
      googleProfileErrorAlert.style.display = 'none';
      googleProfileErrorAlert.textContent = '';
    }

    if (googleProfileModalBackdrop) {
      googleProfileModalBackdrop.classList.add('show');
    }
  }

  function closeGoogleProfileModal() {
    if (googleProfileModalBackdrop) {
      googleProfileModalBackdrop.classList.remove('show');
    }
  }

  googleGoalChips.forEach(chip => {
    chip.addEventListener('click', () => {
      googleGoalChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      googleSelectedGoal = chip.getAttribute('data-goal') || 'maintain';
      if (googleProfileErrorAlert) googleProfileErrorAlert.style.display = 'none';
    });
  });

  if (closeGoogleProfileModalBtn) {
    closeGoogleProfileModalBtn.addEventListener('click', () => {
      closeGoogleProfileModal();
    });
  }

  if (googleProfileModalBackdrop) {
    googleProfileModalBackdrop.addEventListener('click', (e) => {
      if (e.target === googleProfileModalBackdrop) closeGoogleProfileModal();
    });
  }

  // Handle submitting the profile popup
  if (googleProfileSubmitBtn) {
    googleProfileSubmitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = stagedGoogleAuth?.email || googleProfileAccountEmail?.textContent?.trim();
      if (!email) {
        showToast('Please authenticate with Google first.');
        return;
      }

      const name = googleProfileInputName?.value?.trim() || stagedGoogleAuth?.name || 'Google User';
      const ageVal = googleProfileInputAge?.value?.trim();
      const weightVal = googleProfileInputWeight?.value?.trim();
      const heightVal = googleProfileInputHeight?.value?.trim();

      if (!name) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter your full name.';
          googleProfileErrorAlert.style.display = 'block';
        }
        return;
      }

      if (!ageVal) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter your age.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputAge?.focus();
        return;
      }
      const age = parseInt(ageVal, 10);
      if (isNaN(age) || age < 12 || age > 100) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter a valid age between 12 and 100.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputAge?.focus();
        return;
      }

      if (!weightVal) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter your weight in kg.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputWeight?.focus();
        return;
      }
      const weight = parseFloat(weightVal);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter a valid weight between 30 kg and 300 kg.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputWeight?.focus();
        return;
      }

      if (!heightVal) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter your height in cm.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputHeight?.focus();
        return;
      }
      const height = parseFloat(heightVal);
      if (isNaN(height) || height < 100 || height > 250) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please enter a valid height between 100 cm and 250 cm.';
          googleProfileErrorAlert.style.display = 'block';
        }
        googleProfileInputHeight?.focus();
        return;
      }

      if (!googleSelectedGymDays) {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = 'Please select how many days you go to the gym / work out.';
          googleProfileErrorAlert.style.display = 'block';
        }
        return;
      }

      const gymFrequency = googleSelectedGymDays + ' days/wk';

      googleProfileSubmitBtn.textContent = 'Saving Profile...';
      googleProfileSubmitBtn.disabled = true;

      await performFinalGoogleAuth({
        idToken: stagedGoogleAuth?.idToken,
        accessToken: stagedGoogleAuth?.accessToken,
        email: email,
        name: name,
        picture: stagedGoogleAuth?.picture || '',
        googleId: stagedGoogleAuth?.googleId || '',
        age: age,
        weight: weight,
        height: height,
        gymFrequency: gymFrequency,
        goal: googleSelectedGoal || 'maintain'
      });

      googleProfileSubmitBtn.textContent = 'Save Profile & Enter FitTrack';
      googleProfileSubmitBtn.disabled = false;
    });
  }

  async function performFinalGoogleAuth(authData) {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        localStorage.setItem('fittrack_token', data.token);
        localStorage.setItem('fittrack_user', JSON.stringify(data.user));
        applyUserProfileToDom(data.user);

        if (data.isNewUser || !localStorage.getItem('fittrack_data_' + data.user.email)) {
          // Newly registered or fresh Google user starts completely at 0
          localStorage.removeItem('fittrack_data_' + data.user.email);
          resetUserDataToZero();
          showToast(`Welcome to FitTrack, ${data.user.name}!`);
        } else {
          loadUserData(data.user.email);
          showToast(`Welcome back, ${data.user.name}!`);
        }

        closeGoogleModal();
        closeGoogleProfileModal();
        enterAppFromAuth();
      } else {
        if (googleProfileErrorAlert) {
          googleProfileErrorAlert.textContent = data.message || 'Google authentication failed';
          googleProfileErrorAlert.style.display = 'block';
        } else {
          showToast(data.message || 'Google authentication failed');
        }
      }
    } catch (err) {
      console.error('Google authentication error:', err);
      if (googleProfileErrorAlert) {
        googleProfileErrorAlert.textContent = 'Connection error. Please try again.';
        googleProfileErrorAlert.style.display = 'block';
      } else {
        showToast('Connection error. Please try again.');
      }
    }
  }

  // ==================== EDIT PERSONAL DATA LOGIC ====================
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editParamsBtn = document.getElementById('editParamsBtn');
  const editPersonalDataModalBackdrop = document.getElementById('editPersonalDataModalBackdrop');
  const closeEditProfileModalBtn = document.getElementById('closeEditProfileModalBtn');
  const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
  const saveEditProfileBtn = document.getElementById('saveEditProfileBtn');

  const editProfileInputName = document.getElementById('editProfileInputName');
  const editProfileInputAge = document.getElementById('editProfileInputAge');
  const editProfileInputWeight = document.getElementById('editProfileInputWeight');
  const editProfileInputHeight = document.getElementById('editProfileInputHeight');
  const editActivityChips = document.querySelectorAll('.edit-activity-chip');
  const editGoalChips = document.querySelectorAll('.edit-goal-chip');
  const editProfileErrorAlert = document.getElementById('editProfileErrorAlert');

  const editLiveBmi = document.getElementById('editLiveBmi');
  const editLiveBmiBadge = document.getElementById('editLiveBmiBadge');
  const editLiveCalories = document.getElementById('editLiveCalories');
  const editLiveGoalTag = document.getElementById('editLiveGoalTag');

  let editSelectedGymDays = '4-5';
  let editSelectedGoal = 'maintain';

  function updateEditLivePreview() {
    const w = parseFloat(editProfileInputWeight?.value) || 0;
    const h = parseFloat(editProfileInputHeight?.value) || 0;
    const a = parseInt(editProfileInputAge?.value, 10) || 0;

    if (w > 0 && h > 0) {
      const heightM = h / 100;
      const bmi = (w / (heightM * heightM)).toFixed(1);
      if (editLiveBmi) editLiveBmi.textContent = bmi;
      if (editLiveBmiBadge) {
        let category = 'Normal';
        if (bmi < 18.5) category = 'Underweight';
        else if (bmi < 25) category = 'Normal';
        else if (bmi < 30) category = 'Overweight';
        else category = 'Obese';
        editLiveBmiBadge.textContent = category;
      }
    } else {
      if (editLiveBmi) editLiveBmi.textContent = '--';
      if (editLiveBmiBadge) editLiveBmiBadge.textContent = '--';
    }

    if (w > 0 && h > 0 && a > 0) {
      // Mifflin-St Jeor: BMR = 10 * weight + 6.25 * height - 5 * age + 5
      const bmr = Math.round(10 * w + 6.25 * h - 5 * a + 5);
      let multiplier = 1.55;
      if (editSelectedGymDays === '0-1') multiplier = 1.2;
      else if (editSelectedGymDays === '2-3') multiplier = 1.375;
      else if (editSelectedGymDays === '4-5') multiplier = 1.55;
      else if (editSelectedGymDays === '6-7') multiplier = 1.725;
      const tdee = Math.round(bmr * multiplier);
      let targetCal = tdee;
      if (editSelectedGoal === 'weight_loss') {
        targetCal = Math.max(1200, tdee - 500);
      } else if (editSelectedGoal === 'weight_gain') {
        targetCal = tdee + 500;
      }
      if (editLiveCalories) editLiveCalories.textContent = targetCal.toLocaleString();
      if (editLiveGoalTag) {
        if (editSelectedGoal === 'weight_loss') {
          editLiveGoalTag.textContent = '-500 kcal deficit';
          editLiveGoalTag.style.color = '#ef4444';
        } else if (editSelectedGoal === 'weight_gain') {
          editLiveGoalTag.textContent = '+500 kcal surplus';
          editLiveGoalTag.style.color = '#10b981';
        } else {
          editLiveGoalTag.textContent = 'Maintenance';
          editLiveGoalTag.style.color = '#38bdf8';
        }
      }
    } else {
      if (editLiveCalories) editLiveCalories.textContent = '--';
      if (editLiveGoalTag) editLiveGoalTag.textContent = 'Maintenance';
    }
  }

  function openEditProfileModal() {
    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (e) {}

    const curName = curUser?.name || document.getElementById('profileUserName')?.textContent || '';
    const curAge = curUser?.age || parseInt(document.getElementById('profileAgeVal')?.textContent, 10) || 25;
    const curWeight = curUser?.weight || parseFloat(document.getElementById('profileWeightVal')?.textContent) || 68.5;
    const curHeight = curUser?.height || parseFloat(document.getElementById('profileHeightVal')?.textContent) || 175;
    const curGym = curUser?.gymFrequency || document.getElementById('profileActivityBadge')?.textContent || '4-5';
    const curGoal = curUser?.goal || 'maintain';

    if (editProfileInputName) editProfileInputName.value = curName;
    if (editProfileInputAge) editProfileInputAge.value = curAge;
    if (editProfileInputWeight) editProfileInputWeight.value = curWeight;
    if (editProfileInputHeight) editProfileInputHeight.value = curHeight;

    // Detect gym days
    editSelectedGymDays = '4-5';
    if (curGym.includes('0-1')) editSelectedGymDays = '0-1';
    else if (curGym.includes('2-3')) editSelectedGymDays = '2-3';
    else if (curGym.includes('4-5')) editSelectedGymDays = '4-5';
    else if (curGym.includes('6-7')) editSelectedGymDays = '6-7';

    editActivityChips.forEach(chip => {
      if (chip.getAttribute('data-days') === editSelectedGymDays) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Detect goal
    editSelectedGoal = curGoal;
    editGoalChips.forEach(chip => {
      if (chip.getAttribute('data-goal') === editSelectedGoal) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    if (editProfileErrorAlert) {
      editProfileErrorAlert.textContent = '';
      editProfileErrorAlert.style.display = 'none';
    }

    updateEditLivePreview();

    if (editPersonalDataModalBackdrop) {
      editPersonalDataModalBackdrop.classList.add('show');
    }
  }

  function closeEditProfileModal() {
    if (editPersonalDataModalBackdrop) {
      editPersonalDataModalBackdrop.classList.remove('show');
    }
    if (editProfileErrorAlert) {
      editProfileErrorAlert.textContent = '';
      editProfileErrorAlert.style.display = 'none';
    }
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openEditProfileModal);
  }
  if (editParamsBtn) {
    editParamsBtn.addEventListener('click', openEditProfileModal);
  }
  if (closeEditProfileModalBtn) {
    closeEditProfileModalBtn.addEventListener('click', closeEditProfileModal);
  }
  if (cancelEditProfileBtn) {
    cancelEditProfileBtn.addEventListener('click', closeEditProfileModal);
  }

  // Close when clicking on backdrop outside the sheet
  if (editPersonalDataModalBackdrop) {
    editPersonalDataModalBackdrop.addEventListener('click', (e) => {
      if (e.target === editPersonalDataModalBackdrop) {
        closeEditProfileModal();
      }
    });
  }

  // Interactive frequency chips
  editActivityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      editActivityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editSelectedGymDays = chip.getAttribute('data-days') || '4-5';
      if (editProfileErrorAlert) {
        editProfileErrorAlert.style.display = 'none';
      }
      updateEditLivePreview();
    });
  });

  // Interactive goal chips
  editGoalChips.forEach(chip => {
    chip.addEventListener('click', () => {
      editGoalChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editSelectedGoal = chip.getAttribute('data-goal') || 'maintain';
      if (editProfileErrorAlert) {
        editProfileErrorAlert.style.display = 'none';
      }
      updateEditLivePreview();
    });
  });

  // Dynamic preview input listeners
  [editProfileInputAge, editProfileInputWeight, editProfileInputHeight].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', updateEditLivePreview);
      inp.addEventListener('change', updateEditLivePreview);
    }
  });

  // Save changes handler
  if (saveEditProfileBtn) {
    saveEditProfileBtn.addEventListener('click', async () => {
      const name = editProfileInputName?.value?.trim();
      const ageVal = editProfileInputAge?.value?.trim();
      const weightVal = editProfileInputWeight?.value?.trim();
      const heightVal = editProfileInputHeight?.value?.trim();

      if (!name) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter your full name.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputName?.focus();
        return;
      }

      if (!ageVal) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter your age.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputAge?.focus();
        return;
      }
      const age = parseInt(ageVal, 10);
      if (isNaN(age) || age < 12 || age > 100) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter a valid age between 12 and 100.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputAge?.focus();
        return;
      }

      if (!weightVal) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter your weight in kg.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputWeight?.focus();
        return;
      }
      const weight = parseFloat(weightVal);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter a valid weight between 30 and 300 kg.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputWeight?.focus();
        return;
      }

      if (!heightVal) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter your height in cm.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputHeight?.focus();
        return;
      }
      const height = parseFloat(heightVal);
      if (isNaN(height) || height < 100 || height > 250) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please enter a valid height between 100 and 250 cm.';
          editProfileErrorAlert.style.display = 'block';
        }
        editProfileInputHeight?.focus();
        return;
      }

      if (!editSelectedGymDays) {
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Please select your workout frequency.';
          editProfileErrorAlert.style.display = 'block';
        }
        return;
      }

      const gymFrequency = editSelectedGymDays + ' days/wk';

      saveEditProfileBtn.textContent = 'Saving Changes...';
      saveEditProfileBtn.disabled = true;

      try {
        let curUser = null;
        try {
          curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
        } catch (e) {}

        const token = localStorage.getItem('fittrack_token') || '';

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
        }

        const res = await fetch('/api/auth/profile/update', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            name,
            age,
            weight,
            height,
            gymFrequency,
            goal: editSelectedGoal,
            email: curUser?.email || ''
          })
        });

        const data = await res.json();

        if (res.ok && data.success && data.user) {
          localStorage.setItem('fittrack_user', JSON.stringify(data.user));
          applyUserProfileToDom(data.user);
          saveUserData(data.user.email);
          showToast('Personal data updated successfully');
          closeEditProfileModal();
        } else {
          if (editProfileErrorAlert) {
            editProfileErrorAlert.textContent = data.message || 'Failed to update personal data';
            editProfileErrorAlert.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('Profile update error:', err);
        if (editProfileErrorAlert) {
          editProfileErrorAlert.textContent = 'Connection error. Please try again.';
          editProfileErrorAlert.style.display = 'block';
        }
      } finally {
        saveEditProfileBtn.textContent = 'Save Changes';
        saveEditProfileBtn.disabled = false;
      }
    });
  }

  // Load Google OAuth 2.0 configuration on startup
  fetchGoogleOAuthConfig();

  const headerLogoutBtn = document.getElementById('headerLogoutBtn');

  async function performUserLogout(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    console.log('[FitTrack] Instant user logout initiated...');

    // 1. Immediately flush any pending tracking sync BEFORE clearing session credentials!
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    const token = localStorage.getItem('fittrack_token');
    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch (err) {}

    if (token && curUser && curUser.email) {
      saveUserData(curUser.email);
      await syncDailyLogToDatabase().catch(() => {});
    }

    // 2. Background non-blocking API call
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }).catch(err => console.warn('Logout API error:', err));
    }

    // 3. Instant client-side session cleanup (preserve fittrack_data_<email>)
    try {
      localStorage.removeItem('fittrack_token');
      localStorage.removeItem('fittrack_user');
      localStorage.removeItem('fittrack_simulated_date');
    } catch (err) {}

    resetUserDataToZero(false);

    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    if (loginEmailInput) loginEmailInput.value = '';
    if (loginPasswordInput) loginPasswordInput.value = '';

    // 4. Instant UI transition to Login / Intro
    showToast('🔒 Logged out successfully!');
    showAuthView('login');
  }

  // Expose globally for inline onclick attributes
  window.performUserLogout = performUserLogout;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', performUserLogout);
  }
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', performUserLogout);
  }

  // Delegated click listener fallback to guarantee logout button click capture
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#logoutBtn, .logout-btn, #headerLogoutBtn, .header-logout-btn');
    if (target) {
      performUserLogout(e);
    }
  });

  // Simulation of Day Rollover for Testing & Verification
  const simulateNextDayBtn = document.getElementById('simulateNextDayBtn');
  const resetSimulatedDayBtn = document.getElementById('resetSimulatedDayBtn');
  const resetDailyCaloriesBtn = document.getElementById('resetDailyCaloriesBtn');
  const cardResetCaloriesBtn = document.getElementById('cardResetCaloriesBtn');

  function resetTodayCaloriesToZero() {
    resetUserDataToZero();
    showToast('🔄 Reset today\'s calories, macros & meal logs to 0!');
  }

  if (resetDailyCaloriesBtn) {
    resetDailyCaloriesBtn.addEventListener('click', resetTodayCaloriesToZero);
  }
  if (cardResetCaloriesBtn) {
    cardResetCaloriesBtn.addEventListener('click', resetTodayCaloriesToZero);
  }

  function simulateNextDay() {
    const currentSim = getTodayDateString();
    const parts = currentSim.split('-');
    const curDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    curDate.setDate(curDate.getDate() + 1);

    const year = curDate.getFullYear();
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const day = String(curDate.getDate()).padStart(2, '0');
    const nextDateStr = `${year}-${month}-${day}`;

    localStorage.setItem('fittrack_simulated_date', nextDateStr);

    // Force rollover and reset calories & hydration
    resetUserDataToZero();
    state.currentDate = nextDateStr;
    state.waterDate = nextDateStr;
    updateDateDisplay();

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    } catch(e) {}
    if (curUser && curUser.email) {
      saveUserData(curUser.email);
    }

    const displayStr = formatDisplayDate(nextDateStr);
    showToast(`☀️ Day advanced to ${displayStr}! Calories & hydration reset to 0.`);
  }

  function resetSimulatedDate() {
    localStorage.removeItem('fittrack_simulated_date');
    resetUserDataToZero();
    const displayStr = formatDisplayDate(getTodayDateString());
    showToast(`🔄 Restored actual date: ${displayStr}`);
  }

  if (simulateNextDayBtn) {
    simulateNextDayBtn.addEventListener('click', simulateNextDay);
  }
  if (resetSimulatedDayBtn) {
    resetSimulatedDayBtn.addEventListener('click', resetSimulatedDate);
  }

  // ==================== PWA / MOBILE INSTALL LOGIC ====================
  let deferredInstallPrompt = null;
  const installAppBtn = document.getElementById('installAppBtn');
  const installModalBackdrop = document.getElementById('installModalBackdrop');
  const closeInstallModal = document.getElementById('closeInstallModal');
  const triggerNativeInstallBtn = document.getElementById('triggerNativeInstallBtn');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[FitTrack PWA] Service worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('[FitTrack PWA] SW registration failed:', err);
      });
    });
  }

  // Listen for beforeinstallprompt (Android / Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[FitTrack PWA] Captured beforeinstallprompt!');
    if (installAppBtn) {
      installAppBtn.style.animation = 'pulse 2s infinite';
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[FitTrack PWA] FitTrack was successfully installed!');
    deferredInstallPrompt = null;
    if (installModalBackdrop) installModalBackdrop.style.display = 'none';
    showToast('🎉 FitTrack installed to your Home Screen!');
  });

  function openInstallModal() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[FitTrack PWA] User accepted installation prompt');
        } else {
          console.log('[FitTrack PWA] User dismissed installation prompt');
        }
        deferredInstallPrompt = null;
      });
    } else {
      if (installModalBackdrop) installModalBackdrop.style.display = 'flex';
    }
  }

  if (installAppBtn) {
    installAppBtn.addEventListener('click', openInstallModal);
  }
  if (closeInstallModal && installModalBackdrop) {
    closeInstallModal.addEventListener('click', () => {
      installModalBackdrop.style.display = 'none';
    });
    installModalBackdrop.addEventListener('click', (e) => {
      if (e.target === installModalBackdrop) installModalBackdrop.style.display = 'none';
    });
  }
  if (triggerNativeInstallBtn) {
    triggerNativeInstallBtn.addEventListener('click', () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
      } else {
        showToast('💡 Follow the steps above in Chrome or Safari to add to your Home Screen!');
      }
    });
  }

  // ===================================================================
  // WEEKLY VISUAL FOOD DIARY & CHEAT ACCOUNTABILITY CONTROLLER
  // ===================================================================

  // High quality fallback SVG food illustration if offline or failed load
  function getFoodPlaceholderSvg(dishName) {
    const safeTitle = (dishName || 'Meal').replace(/</g, '').replace(/>/g, '');
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="%232D3748"/><circle cx="300" cy="180" r="110" fill="%234A5568"/><circle cx="300" cy="180" r="85" fill="%23E2E8F0"/><text x="300" y="175" fill="%232D3748" font-size="48" text-anchor="middle" font-family="sans-serif">🍱</text><text x="300" y="215" fill="%231A202C" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">${encodeURIComponent(safeTitle)}</text></svg>`;
  }

  // Clean default data with zero dummy entries
  const defaultWeeklyDiaryData = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: []
  };

  let weeklyDiaryData = JSON.parse(JSON.stringify(defaultWeeklyDiaryData));

  // Purge any legacy dummy placeholder seed data from localStorage
  try {
    const savedDiary = localStorage.getItem('fittrack_weekly_diary_v1');
    if (savedDiary) {
      if (savedDiary.includes('Rolled Oatmeal') || savedDiary.includes('m_mon_1') || savedDiary.includes('m_sun_3')) {
        console.log('[WeeklyDiary] Purging dummy placeholder seed data from localStorage...');
        localStorage.removeItem('fittrack_weekly_diary_v1');
      } else {
        const parsed = JSON.parse(savedDiary);
        if (parsed && typeof parsed === 'object' && parsed.mon) {
          weeklyDiaryData = parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[WeeklyDiary] Failed to parse localStorage diary data:', e);
  }

  function saveWeeklyDiaryData() {
    try {
      localStorage.setItem('fittrack_weekly_diary_v1', JSON.stringify(weeklyDiaryData));
    } catch (e) {
      console.warn('[WeeklyDiary] localStorage save error:', e);
    }
  }

  function getCurrentWeekDayIndex() {
    const day = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    return (day + 6) % 7; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  }

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const dayNamesMap = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  };

  // Start on today's day
  let currentDiaryDay = dayKeys[getCurrentWeekDayIndex()] || 'mon';
  let weekOffset = 0;

  // Backend API Sync Helpers
  function getDiaryAuth() {
    let email = 'guest@fittrack.local';
    let token = '';
    try {
      const user = JSON.parse(localStorage.getItem('fittrack_user') || '{}');
      if (user && user.email) email = user.email.toLowerCase().trim();
      token = localStorage.getItem('fittrack_token') || '';
    } catch (e) {}
    return { email, token };
  }

  async function fetchWeeklyDiaryFromBackend() {
    try {
      const { email, token } = getDiaryAuth();
      const headers = { 'X-User-Email': email };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/weekly-diary?offset=${weekOffset}&email=${encodeURIComponent(email)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.meals) {
          weeklyDiaryData = json.meals;
          saveWeeklyDiaryData();
          renderWeeklyMealsUI();
          return;
        }
      }
    } catch (err) {
      console.warn('[WeeklyDiary] Backend fetch error, using local cache:', err);
    }
    renderWeeklyMealsUI();
  }

  async function addWeeklyMealToBackend(newMeal, targetDay) {
    try {
      const { email, token } = getDiaryAuth();
      const headers = { 'Content-Type': 'application/json', 'X-User-Email': email };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/weekly-diary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newMeal,
          email,
          day: targetDay
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.meal) {
          const list = weeklyDiaryData[targetDay] || [];
          const localMeal = list.find(m => m.id === newMeal.id);
          if (localMeal) localMeal.id = json.meal.id;
          saveWeeklyDiaryData();
        }
      }
    } catch (err) {
      console.warn('[WeeklyDiary] Failed to sync added meal to backend:', err);
    }
  }

  async function deleteWeeklyMealFromBackend(mealId) {
    try {
      const { email, token } = getDiaryAuth();
      const headers = { 'Content-Type': 'application/json', 'X-User-Email': email };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/weekly-diary?id=${encodeURIComponent(mealId)}&email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers
      });
    } catch (err) {
      console.warn('[WeeklyDiary] Failed to delete meal from backend:', err);
    }
  }

  async function toggleWeeklyCheatInBackend(mealId, isCheat) {
    try {
      const { email, token } = getDiaryAuth();
      const headers = { 'Content-Type': 'application/json', 'X-User-Email': email };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/weekly-diary/cheat-toggle', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: mealId, isCheat, email })
      });
    } catch (err) {
      console.warn('[WeeklyDiary] Failed to sync cheat toggle to backend:', err);
    }
  }

  function renderWeeklyMealsUI() {
    // 1. Calculate overall weekly statistics
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let totalMeals = 0;
    let cleanMeals = 0;
    let cheatMeals = 0;

    days.forEach(d => {
      const items = weeklyDiaryData[d] || [];
      totalMeals += items.length;
      items.forEach(item => {
        if (item.isCheat) {
          cheatMeals++;
        } else {
          cleanMeals++;
        }
      });
    });

    const dietScore = totalMeals > 0 ? Math.round((cleanMeals / totalMeals) * 100) : 100;
    const trackedDaysCount = days.filter(d => (weeklyDiaryData[d] || []).length > 0).length;

    // Update KPI Scorecard Elements in header banner
    const statTotalEl = document.getElementById('statWeeklyTotal');
    const statCleanEl = document.getElementById('statWeeklyClean');
    const statCheatEl = document.getElementById('statWeeklyCheat');
    const statDaysEl = document.getElementById('statWeeklyDays');
    const scoreBadgeEl = document.getElementById('weeklyDietScoreBadge');
    const progCleanEl = document.getElementById('weeklyProgressClean');
    const progCheatEl = document.getElementById('weeklyProgressCheat');
    const nutritionWeeklyCheatTag = document.getElementById('nutritionWeeklyCheatTag');
    const weeklyDiaryDateChip = document.getElementById('weeklyDiaryDateChip');

    if (statTotalEl) statTotalEl.textContent = totalMeals;
    if (statCleanEl) statCleanEl.textContent = cleanMeals;
    if (statCheatEl) statCheatEl.textContent = cheatMeals;
    if (statDaysEl) statDaysEl.textContent = `${trackedDaysCount}/7`;

    if (scoreBadgeEl) {
      scoreBadgeEl.textContent = `${dietScore}% Clean`;
      if (dietScore >= 80) {
        scoreBadgeEl.style.background = 'rgba(16, 185, 129, 0.12)';
        scoreBadgeEl.style.color = '#059669';
      } else {
        scoreBadgeEl.style.background = 'rgba(239, 68, 68, 0.12)';
        scoreBadgeEl.style.color = '#DC2626';
      }
    }

    if (progCleanEl) progCleanEl.style.width = `${dietScore}%`;
    if (progCheatEl) progCheatEl.style.width = `${100 - dietScore}%`;

    // Header Date Chip at very top
    if (weeklyDiaryDateChip) {
      weeklyDiaryDateChip.textContent = `THIS WEEK • ${totalMeals} PHOTO${totalMeals === 1 ? '' : 'S'} LOGGED`;
    }

    // Nutrition Tab Header Card Tag
    if (nutritionWeeklyCheatTag) {
      if (totalMeals === 0) {
        nutritionWeeklyCheatTag.textContent = '0 Photos Logged';
      } else if (cheatMeals > 0) {
        nutritionWeeklyCheatTag.textContent = `${totalMeals} Photo${totalMeals === 1 ? '' : 's'} Logged (${cheatMeals} Cheat)`;
      } else {
        nutritionWeeklyCheatTag.textContent = `${totalMeals} Photo${totalMeals === 1 ? '' : 's'} Logged (100% Clean)`;
      }
    }

    // 2. Future day logic: disable unreached days in 7-day selector
    const todayIdx = getCurrentWeekDayIndex();
    const todayKey = dayKeys[todayIdx];

    // If current selected day is in the future, fallback to today
    if (currentDiaryDay !== 'all') {
      const activeIdx = dayKeys.indexOf(currentDiaryDay);
      if (weekOffset === 0 && activeIdx > todayIdx) {
        currentDiaryDay = todayKey;
      }
    }

    days.forEach((d, idx) => {
      const capKey = d.charAt(0).toUpperCase() + d.slice(1);
      const chip = document.getElementById(`dayChip${capKey}`);
      const badge = document.getElementById(`countBadge${capKey}`);
      const count = (weeklyDiaryData[d] || []).length;
      const isFuture = (weekOffset === 0 && idx > todayIdx) || (weekOffset > 0);

      if (chip) {
        if (isFuture) {
          chip.classList.add('disabled-future');
          chip.disabled = true;
          chip.setAttribute('aria-disabled', 'true');
          chip.title = `${dayNamesMap[d]} has not happened yet`;
          if (badge) badge.textContent = '-';
        } else {
          chip.classList.remove('disabled-future');
          chip.disabled = false;
          chip.removeAttribute('aria-disabled');
          chip.title = `View ${dayNamesMap[d]}'s meals`;
          if (badge) badge.textContent = count;
        }

        if (currentDiaryDay === d && !isFuture) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      }
    });

    const allChip = document.getElementById('dayChipAll');
    if (allChip) {
      if (currentDiaryDay === 'all') allChip.classList.add('active');
      else allChip.classList.remove('active');
    }
    const countBadgeAll = document.getElementById('countBadgeAll');
    if (countBadgeAll) countBadgeAll.textContent = totalMeals;

    // Next week button state
    if (nextWeekBtn) {
      if (weekOffset >= 0) {
        nextWeekBtn.disabled = true;
        nextWeekBtn.style.opacity = '0.35';
        nextWeekBtn.style.cursor = 'not-allowed';
        nextWeekBtn.title = 'Cannot navigate to future weeks';
      } else {
        nextWeekBtn.disabled = false;
        nextWeekBtn.style.opacity = '1';
        nextWeekBtn.style.cursor = 'pointer';
        nextWeekBtn.title = 'Next Week';
      }
    }

    // Toggle "+ Add Meal Photo" button in day action bar:
    // Only visible when viewing Today! Past days (e.g. Monday) are view-only.
    const dayAddBtn = document.getElementById('dayAddMealPhotoBtn');
    if (dayAddBtn) {
      dayAddBtn.style.display = (currentDiaryDay === todayKey && weekOffset === 0) ? 'inline-flex' : 'none';
    }

    // 3. Render Meals Grid
    const mealsGrid = document.getElementById('weeklyMealsGrid');
    const headingEl = document.getElementById('activeDayHeading');
    const subEl = document.getElementById('activeDaySub');

    if (!mealsGrid) return;
    mealsGrid.innerHTML = '';

    if (currentDiaryDay === 'all') {
      if (headingEl) headingEl.textContent = "Full Week Visual Mosaic";
      if (subEl) subEl.textContent = `All ${totalMeals} photo${totalMeals === 1 ? '' : 's'} logged Monday – Sunday`;

      // Render day-by-day sections (only through today for current week)
      days.forEach((d, idx) => {
        const isFuture = (weekOffset === 0 && idx > todayIdx) || (weekOffset > 0);
        if (isFuture) return; // Don't show unreached days in mosaic

        const dayMeals = weeklyDiaryData[d] || [];
        const groupDiv = document.createElement('div');
        groupDiv.className = 'recap-day-group';

        const dayName = dayNamesMap[d];
        const dayCheat = dayMeals.filter(m => m.isCheat).length;
        const cheatText = dayCheat > 0 ? ` • ${dayCheat} Cheat` : ' • Clean';

        groupDiv.innerHTML = `
          <div class="recap-day-header">
            <span class="recap-day-title">${dayName.toUpperCase()}</span>
            <span class="recap-day-summary">${dayMeals.length} photo${dayMeals.length === 1 ? '' : 's'}${cheatText}</span>
          </div>
          <div class="day-group-meals" style="display: flex; flex-direction: column; gap: 10px;"></div>
        `;

        const groupMealsContainer = groupDiv.querySelector('.day-group-meals');
        if (dayMeals.length === 0) {
          groupMealsContainer.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 8px 4px;">No meal photos logged for ${dayName}.</div>`;
        } else {
          dayMeals.forEach(meal => {
            groupMealsContainer.appendChild(createMealPhotoCard(meal, d));
          });
        }
        mealsGrid.appendChild(groupDiv);
      });

      if (totalMeals === 0) {
        mealsGrid.innerHTML = `
          <div class="card" style="text-align: center; padding: 32px 16px; border-radius: 20px;">
            <div style="font-size: 38px; margin-bottom: 8px;">📷</div>
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">No Meal Photos Logged This Week</h4>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">Snap a photo of your breakfast, lunch, or dinner to start your visual accountability log!</p>
            <button class="pill-btn primary" onclick="openAddMealPhotoModalForDay('${todayKey}')" style="padding: 9px 18px; font-size: 12px; font-weight: 700; border-radius: 20px;">
              📸 + Add Today's First Meal
            </button>
          </div>
        `;
      }
    } else {
      const activeMeals = weeklyDiaryData[currentDiaryDay] || [];
      const dayName = dayNamesMap[currentDiaryDay];
      const cheatCount = activeMeals.filter(m => m.isCheat).length;
      const cleanCount = activeMeals.length - cheatCount;

      if (headingEl) {
        headingEl.textContent = (currentDiaryDay === todayKey && weekOffset === 0)
          ? `Today's Meals (${dayName})`
          : `${dayName}'s Meals`;
      }

      if (subEl) {
        if (activeMeals.length === 0) {
          subEl.textContent = (currentDiaryDay === todayKey && weekOffset === 0)
            ? 'No photos logged yet today • Tap + to add'
            : `No photos logged for ${dayName} (Past Day)`;
        } else if (cheatCount > 0) {
          subEl.textContent = `${activeMeals.length} photo${activeMeals.length === 1 ? '' : 's'} logged • ${cheatCount} Cheat Meal${cheatCount === 1 ? '' : 's'}`;
        } else {
          subEl.textContent = `${activeMeals.length} photo${activeMeals.length === 1 ? '' : 's'} logged • 100% clean diet`;
        }
      }

      if (activeMeals.length === 0) {
        if (currentDiaryDay === todayKey && weekOffset === 0) {
          mealsGrid.innerHTML = `
            <div class="card" style="text-align: center; padding: 32px 16px; border-radius: 20px;">
              <div style="font-size: 38px; margin-bottom: 8px;">📷</div>
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">No Meals Logged for Today (${dayName})</h4>
              <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">Take a quick photo of your breakfast, lunch, or dinner to stay accountable!</p>
              <button class="pill-btn primary" onclick="openAddMealPhotoModalForDay('${todayKey}')" style="padding: 9px 18px; font-size: 12px; font-weight: 700; border-radius: 20px;">
                📸 + Add Today's Meal Photo
              </button>
            </div>
          `;
        } else {
          // Past days: view-only notification with jump button to Today
          mealsGrid.innerHTML = `
            <div class="card" style="text-align: center; padding: 32px 16px; border-radius: 20px;">
              <div style="font-size: 38px; margin-bottom: 8px;">📅</div>
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">No Meals Logged for ${dayName}</h4>
              <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">${dayName} has passed. New meal photos can only be added for Today (${dayNamesMap[todayKey]}).</p>
              <button class="pill-btn primary" onclick="switchToTodayAndAdd()" style="padding: 9px 18px; font-size: 12px; font-weight: 700; border-radius: 20px;">
                📸 + Add Meal Photo for Today (${dayNamesMap[todayKey]})
              </button>
            </div>
          `;
        }
      } else {
        activeMeals.forEach(meal => {
          mealsGrid.appendChild(createMealPhotoCard(meal, currentDiaryDay));
        });
      }
    }
  }

  window.switchToTodayAndAdd = function() {
    const todayKey = dayKeys[getCurrentWeekDayIndex()];
    currentDiaryDay = todayKey;
    weekOffset = 0;
    updateWeekLabel();
    renderWeeklyMealsUI();
    window.openAddMealPhotoModalForDay(todayKey);
  };

  function createMealPhotoCard(meal, dayKey) {
    const card = document.createElement('div');
    card.className = `meal-photo-card ${meal.isCheat ? 'cheat-meal' : ''}`;
    card.dataset.mealId = meal.id;
    card.dataset.day = dayKey;

    const statusBadgeHtml = meal.isCheat
      ? `<span class="meal-status-pill cheat">🍕 Cheat Meal</span>`
      : `<span class="meal-status-pill clean">🥗 Clean Meal</span>`;

    const cheatNoteHtml = meal.notes
      ? `<div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; font-style: italic;">"${escapeHtml(meal.notes)}"</div>`
      : '';

    const safeTitle = escapeHtml(meal.title || 'Meal');
    const caloriesText = meal.calories ? `${meal.calories} kcal` : 'Calorie unestimated';

    card.innerHTML = `
      <div class="meal-photo-img-wrap" title="Tap to expand photo">
        <img class="meal-photo-img" src="${meal.img}" alt="${safeTitle}" onerror="this.src='${getFoodPlaceholderSvg(meal.title)}'" loading="lazy">
        ${statusBadgeHtml}
        <span class="meal-slot-pill">${meal.mealSlot || 'Meal'}</span>
      </div>
      <div class="meal-photo-body">
        <div class="meal-photo-header">
          <h4 class="meal-photo-title">${safeTitle}</h4>
          <span class="meal-photo-time">${meal.time || ''}</span>
        </div>
        <div class="meal-photo-macros">${caloriesText} • ${dayNamesMap[dayKey]}</div>
        ${cheatNoteHtml}
        <div class="meal-photo-footer">
          <button type="button" class="meal-photo-action-btn toggle-cheat-btn" title="Toggle Cheat Status">
            ${meal.isCheat ? 'Mark Clean 🥗' : 'Mark Cheat 🍕'}
          </button>
          <button type="button" class="meal-photo-action-btn delete-btn" title="Delete Photo">
            Delete
          </button>
        </div>
      </div>
    `;

    // Click photo to open Lightbox
    const imgWrap = card.querySelector('.meal-photo-img-wrap');
    if (imgWrap) {
      imgWrap.addEventListener('click', () => {
        openDiaryLightbox(meal, dayKey);
      });
    }

    // Toggle cheat status button
    const toggleBtn = card.querySelector('.toggle-cheat-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        meal.isCheat = !meal.isCheat;
        saveWeeklyDiaryData();
        renderWeeklyMealsUI();
        toggleWeeklyCheatInBackend(meal.id, meal.isCheat);
        showToast(meal.isCheat ? '🍕 Marked as Cheat Meal' : '🥗 Marked as Clean Meal');
      });
    }

    // Delete photo button: robust search across all days ensures clean deletion & instant header update
    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removedTitle = meal.title || 'Meal';
        let deleted = false;
        const allDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        for (const d of allDayKeys) {
          if (Array.isArray(weeklyDiaryData[d])) {
            const idx = weeklyDiaryData[d].findIndex(m => m.id === meal.id);
            if (idx !== -1) {
              weeklyDiaryData[d].splice(idx, 1);
              deleted = true;
              break;
            }
          }
        }
        if (deleted) {
          saveWeeklyDiaryData();
          renderWeeklyMealsUI();
          deleteWeeklyMealFromBackend(meal.id);
          showToast(`🗑️ Removed "${removedTitle}"`);
        }
      });
    }

    return card;
  }

  // Lightbox Modal Controls
  const lightboxBackdrop = document.getElementById('diaryPhotoLightboxBackdrop');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTag = document.getElementById('lightboxTag');
  const lightboxTime = document.getElementById('lightboxTime');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCalories = document.getElementById('lightboxCalories');
  const lightboxNotes = document.getElementById('lightboxNotes');

  function openDiaryLightbox(meal, dayKey) {
    if (!lightboxBackdrop) return;
    if (lightboxImg) {
      lightboxImg.src = meal.img;
      lightboxImg.onerror = () => { lightboxImg.src = getFoodPlaceholderSvg(meal.title); };
    }
    if (lightboxTag) {
      if (meal.isCheat) {
        lightboxTag.textContent = '🍕 Cheat Meal';
        lightboxTag.style.background = 'rgba(239, 68, 68, 0.15)';
        lightboxTag.style.color = '#EF4444';
      } else {
        lightboxTag.textContent = '🥗 Clean Meal';
        lightboxTag.style.background = 'rgba(16, 185, 129, 0.15)';
        lightboxTag.style.color = '#10B981';
      }
    }
    if (lightboxTime) {
      lightboxTime.textContent = `${meal.time || ''} • ${dayNamesMap[dayKey] || ''}`;
    }
    if (lightboxTitle) lightboxTitle.textContent = meal.title || 'Meal';
    if (lightboxCalories) lightboxCalories.textContent = `${meal.calories || 0} kcal • ${meal.mealSlot || 'Meal'}`;
    if (lightboxNotes) {
      lightboxNotes.textContent = meal.notes ? `"${meal.notes}"` : '';
      lightboxNotes.style.display = meal.notes ? 'block' : 'none';
    }
    lightboxBackdrop.classList.add('show');
  }

  if (closeLightboxBtn && lightboxBackdrop) {
    closeLightboxBtn.addEventListener('click', () => lightboxBackdrop.classList.remove('show'));
    lightboxBackdrop.addEventListener('click', (e) => {
      if (e.target === lightboxBackdrop) lightboxBackdrop.classList.remove('show');
    });
  }

  // 7-Day Filter Chips Row Event Listener: allows viewing past days and today; strictly ignores future days
  const dayChips = document.querySelectorAll('.day-chip');
  dayChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('disabled-future') || chip.disabled) {
        return;
      }
      const targetDay = chip.dataset.day || 'mon';
      if (targetDay !== 'all') {
        const targetIdx = dayKeys.indexOf(targetDay);
        const todayIdx = getCurrentWeekDayIndex();
        if (weekOffset === 0 && targetIdx > todayIdx) {
          return;
        }
      }
      dayChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentDiaryDay = targetDay;
      renderWeeklyMealsUI();
    });
  });

  // Week Switcher Buttons
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const weekRangeLabel = document.getElementById('weekRangeLabel');

  function updateWeekLabel() {
    if (!weekRangeLabel) return;
    if (weekOffset === 0) {
      weekRangeLabel.textContent = "Current Week (Mon – Sun)";
    } else if (weekOffset === -1) {
      weekRangeLabel.textContent = "Previous Week";
    } else if (weekOffset === 1) {
      weekRangeLabel.textContent = "Next Week";
    } else {
      weekRangeLabel.textContent = `${Math.abs(weekOffset)} Weeks ${weekOffset < 0 ? 'Ago' : 'Ahead'}`;
    }
  }

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      weekOffset--;
      updateWeekLabel();
      fetchWeeklyDiaryFromBackend();
    });
  }
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      if (weekOffset >= 0) return; // Prevent navigating into future weeks
      weekOffset++;
      updateWeekLabel();
      fetchWeeklyDiaryFromBackend();
    });
  }

  // Add Meal Photo Modal Controls (Strictly locked to Today only!)
  const addMealModal = document.getElementById('addMealPhotoModalBackdrop');
  const closeAddMealModalBtn = document.getElementById('closeAddMealPhotoModal');
  const headerAddBtn = document.getElementById('headerAddMealPhotoBtn');
  const dayAddBtn = document.getElementById('dayAddMealPhotoBtn');
  const diaryForm = document.getElementById('addMealPhotoForm');
  const diaryDaySelect = document.getElementById('diaryDaySelect');
  const diaryMealSlotSelect = document.getElementById('diaryMealSlotSelect');
  const diaryFileInput = document.getElementById('diaryPhotoFileInput');
  const diaryPreviewBox = document.getElementById('diaryPhotoPreviewBox');
  const diaryPreviewImg = document.getElementById('diaryPreviewImg');
  const diaryPlaceholder = document.getElementById('diaryPhotoPlaceholder');
  const diaryNameInput = document.getElementById('diaryMealNameInput');
  const diaryCalInput = document.getElementById('diaryMealCaloriesInput');
  const diaryTimeInput = document.getElementById('diaryMealTimeInput');
  const diaryCheatInput = document.getElementById('diaryIsCheatInput');
  const diaryNotesInput = document.getElementById('diaryMealNotesInput');

  let currentCapturedPhotoData = null;

  window.openAddMealPhotoModalForDay = function(dayKey) {
    const todayIdx = getCurrentWeekDayIndex();
    const todayKey = dayKeys[todayIdx];

    // Lock Day selector strictly to Today
    if (diaryDaySelect) {
      Array.from(diaryDaySelect.options).forEach((opt, idx) => {
        const isToday = (idx === todayIdx);
        opt.disabled = !isToday;
        opt.textContent = isToday ? `${dayNamesMap[opt.value]} (Today)` : dayNamesMap[opt.value];
      });
      diaryDaySelect.value = todayKey;
      diaryDaySelect.disabled = true;
    }

    if (diaryTimeInput) {
      const now = new Date();
      let hours = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      diaryTimeInput.value = `${hours}:${mins} ${ampm}`;
    }
    if (diaryNameInput) diaryNameInput.value = '';
    if (diaryCalInput) diaryCalInput.value = '';
    if (diaryCheatInput) diaryCheatInput.checked = false;
    if (diaryNotesInput) diaryNotesInput.value = '';
    currentCapturedPhotoData = null;

    if (diaryPreviewImg) {
      diaryPreviewImg.src = '';
      diaryPreviewImg.style.display = 'none';
    }
    if (diaryPlaceholder) diaryPlaceholder.style.display = 'block';

    if (addMealModal) addMealModal.classList.add('show');
  };

  // "+ Add Photo" in top header always targets Today
  if (headerAddBtn) {
    headerAddBtn.addEventListener('click', () => {
      const todayKey = dayKeys[getCurrentWeekDayIndex()];
      currentDiaryDay = todayKey;
      renderWeeklyMealsUI();
      window.openAddMealPhotoModalForDay(todayKey);
    });
  }

  // "+ Add Meal Photo" button in day action bar (only active on Today)
  if (dayAddBtn) {
    dayAddBtn.addEventListener('click', () => {
      const todayKey = dayKeys[getCurrentWeekDayIndex()];
      currentDiaryDay = todayKey;
      renderWeeklyMealsUI();
      window.openAddMealPhotoModalForDay(todayKey);
    });
  }

  if (closeAddMealModalBtn && addMealModal) {
    closeAddMealModalBtn.addEventListener('click', () => addMealModal.classList.remove('show'));
    addMealModal.addEventListener('click', (e) => {
      if (e.target === addMealModal) addMealModal.classList.remove('show');
    });
  }

  // Trigger file picker or camera when tapping photo box
  if (diaryPreviewBox && diaryFileInput) {
    diaryPreviewBox.addEventListener('click', () => {
      diaryFileInput.click();
    });
  }

  if (diaryFileInput) {
    diaryFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        currentCapturedPhotoData = event.target.result;
        if (diaryPreviewImg) {
          diaryPreviewImg.src = currentCapturedPhotoData;
          diaryPreviewImg.style.display = 'block';
        }
        if (diaryPlaceholder) diaryPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Form Submission: ALWAYS saved to Today only!
  if (diaryForm) {
    diaryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const targetDay = dayKeys[getCurrentWeekDayIndex()]; // Strictly locked to Today
      const title = (diaryNameInput ? diaryNameInput.value.trim() : '') || 'Meal Photo';
      const mealSlot = (diaryMealSlotSelect ? diaryMealSlotSelect.value : 'Lunch') || 'Lunch';
      const calories = parseInt(diaryCalInput ? diaryCalInput.value : '0', 10) || 0;
      const time = (diaryTimeInput ? diaryTimeInput.value.trim() : '') || '12:00 PM';
      const isCheat = diaryCheatInput ? diaryCheatInput.checked : false;
      const notes = (diaryNotesInput ? diaryNotesInput.value.trim() : '');

      const photoSrc = currentCapturedPhotoData || getFoodPlaceholderSvg(title);

      const newMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title,
        mealSlot,
        time,
        calories,
        isCheat,
        img: photoSrc,
        notes,
        createdAt: Date.now()
      };

      if (!weeklyDiaryData[targetDay]) weeklyDiaryData[targetDay] = [];
      weeklyDiaryData[targetDay].push(newMeal);

      saveWeeklyDiaryData();
      renderWeeklyMealsUI();
      addWeeklyMealToBackend(newMeal, targetDay);

      if (addMealModal) addMealModal.classList.remove('show');

      const cheatMsg = isCheat ? ' (Logged as Cheat Meal 🍕)' : '';
      showToast(`📸 Added "${title}" to Today (${dayNamesMap[targetDay]})${cheatMsg}!`);
    });
  }

  // Initial render & sync from backend
  updateWeekLabel();
  renderWeeklyMealsUI();
  fetchWeeklyDiaryFromBackend();

  // Expose FitTrackApp API globally for testing and automation
  window.FitTrackApp = {
    simulateNextDay,
    resetSimulatedDate,
    resetTodayCaloriesToZero,
    checkDayRollover,
    getWaterIntake: () => state.waterIntake,
    getWaterDate: () => state.waterDate,
    getTodayDateString
  };
});
