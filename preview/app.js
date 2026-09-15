// FitTrack Preview State & Interactions
document.addEventListener('DOMContentLoaded', () => {
  // App State (Starts at 0 for fresh/authenticated users)
  const state = {
    targetCalories: 2300,
    targetCarbs: 180,
    targetProtein: 140,
    targetFats: 65,
    consumedCalories: 0,
    carbs: 0,
    protein: 0,
    fats: 0,
    fiber: 0,
    waterIntake: 0,
    waterTarget: 2500,
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

  const proteinRingArc = document.getElementById('proteinRingArc');
  const carbsRingArc = document.getElementById('carbsRingArc');
  const fatsRingArc = document.getElementById('fatsRingArc');

  const waterStatusEl = document.getElementById('waterStatusText');
  const waterProgressFill = document.getElementById('waterProgressFill');
  const addWaterBtn = document.getElementById('addWaterBtn');

  const aiInput = document.getElementById('aiMealInput');
  const aiSubmitBtn = document.getElementById('aiSubmitBtn');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
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

  // Scanner Simulator
  const simulateScanBtn = document.getElementById('simulateScanBtn');
  const detectedFoodCard = document.getElementById('detectedFoodCard');
  const confirmLogScannedBtn = document.getElementById('confirmLogScannedBtn');
  const torchToggle = document.getElementById('torchToggle');

  // Profile Slider
  const targetSlider = document.getElementById('targetSlider');
  const sliderValDisplay = document.getElementById('sliderValDisplay');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const phoneFrame = document.getElementById('phoneFrame');

  // Clock
  function updateClock() {
    const clockEl = document.getElementById('statusClock');
    if (!clockEl) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${minutes}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  // SVG Ring Progress Calculation (Circumference ≈ 515.22 for r=82)
  const CIRCUMFERENCE = 2 * Math.PI * 82;

  function updateMacroRings() {
    const ratio = Math.min(state.consumedCalories / state.targetCalories, 1);
    const percent = Math.round(ratio * 100);

    if (consumedEl) consumedEl.textContent = state.consumedCalories.toLocaleString();
    const remaining = Math.max(state.targetCalories - state.consumedCalories, 0);
    if (remainingEl) remainingEl.textContent = `${remaining.toLocaleString()} kcal left`;
    if (percentBadgeEl) percentBadgeEl.textContent = `${percent}% Done`;

    const ringCaloriesSub = document.querySelector('.ring-calories-sub');
    if (ringCaloriesSub) ringCaloriesSub.textContent = `of ${state.targetCalories.toLocaleString()} kcal`;

    if (carbsTextEl) carbsTextEl.textContent = `${state.carbs}g / ${state.targetCarbs || 180}g`;
    if (proteinTextEl) proteinTextEl.textContent = `${state.protein}g / ${state.targetProtein || 140}g`;
    if (fatsTextEl) fatsTextEl.textContent = `${state.fats}g / ${state.targetFats || 65}g`;

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

    // Dynamic Arc Segments (0 when consumedCalories is 0)
    let proteinSweep = 0;
    let carbsSweep = 0;
    let fatsSweep = 0;

    if (state.consumedCalories > 0) {
      proteinSweep = ratio * (state.protein * 4 / state.consumedCalories) * CIRCUMFERENCE;
      carbsSweep = ratio * (state.carbs * 4 / state.consumedCalories) * CIRCUMFERENCE;
      fatsSweep = ratio * (state.fats * 9 / state.consumedCalories) * CIRCUMFERENCE;
    }

    if (proteinRingArc) {
      proteinRingArc.style.strokeDasharray = `${CIRCUMFERENCE}`;
      proteinRingArc.style.strokeDashoffset = `${CIRCUMFERENCE - Math.min(proteinSweep, CIRCUMFERENCE)}`;
    }
    if (carbsRingArc) {
      carbsRingArc.style.strokeDasharray = `${CIRCUMFERENCE}`;
      carbsRingArc.style.strokeDashoffset = `${CIRCUMFERENCE - Math.min(carbsSweep, CIRCUMFERENCE)}`;
    }
    if (fatsRingArc) {
      fatsRingArc.style.strokeDasharray = `${CIRCUMFERENCE}`;
      fatsRingArc.style.strokeDashoffset = `${CIRCUMFERENCE - Math.min(fatsSweep, CIRCUMFERENCE)}`;
    }
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
      state.waterIntake = Math.min(state.waterIntake + 250, 4000);
      updateWater();

      const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
      if (curUser && curUser.email) saveUserData(curUser.email);

      // Visual button bounce
      addWaterBtn.style.transform = 'scale(1.1)';
      setTimeout(() => addWaterBtn.style.transform = '', 150);
    });
  }

  let currentTargetMeal = 'snack';

  // Food Logging Function (shared by NLP input, chips, scanner, search, and manual)
  function logFoodItem(name, portion, calories, protein, carbs, fats, fiber = 0) {
    state.consumedCalories += calories;
    state.protein += protein;
    state.carbs += carbs;
    state.fats += fats;
    state.fiber = (state.fiber || 0) + fiber;

    let targetList = snackItemList;
    if (currentTargetMeal === 'breakfast') {
      targetList = document.getElementById('breakfastItemList');
      state.breakfastCalories = (state.breakfastCalories || 0) + calories;
    } else if (currentTargetMeal === 'lunch') {
      targetList = document.getElementById('lunchItemList');
      state.lunchCalories = (state.lunchCalories || 0) + calories;
    } else if (currentTargetMeal === 'dinner') {
      state.dinnerCalories = (state.dinnerCalories || 0) + calories;
    } else {
      targetList = snackItemList;
      state.snackCalories = (state.snackCalories || 0) + calories;
    }

    if (targetList) {
      const emptyNote = targetList.querySelector('.meal-empty-note');
      if (emptyNote) emptyNote.remove();

      const li = document.createElement('li');
      li.className = 'meal-item';
      li.style.animation = 'fadeIn 0.3s ease';
      const fibStr = fiber > 0 ? ` • Fib: ${fiber}g` : '';
      li.innerHTML = `
        <div>
          <div class="item-title">${name}</div>
          <div class="item-macros">${portion} • P: ${protein}g • C: ${carbs}g • F: ${fats}g${fibStr}</div>
        </div>
        <span class="item-cal">${calories} kcal</span>
      `;
      targetList.prepend(li);
    }

    updateMacroRings();
    updateMealSummaries();

    const curUser = JSON.parse(localStorage.getItem('fittrack_user') || 'null');
    if (curUser && curUser.email) saveUserData(curUser.email);
  }

  // AI NLP Meal Input
  function handleAiSubmit() {
    const text = aiInput.value.trim();
    if (!text) return;

    aiSubmitBtn.innerHTML = `<span style="font-size:10px;">...</span>`;
    aiSubmitBtn.disabled = true;

    setTimeout(() => {
      // Simulating NLP parser
      const lower = text.toLowerCase();
      let cal = 240, p = 14, c = 26, f = 8;
      if (lower.includes('egg')) { cal = 260; p = 16; c = 24; f = 10; }
      else if (lower.includes('shake') || lower.includes('protein')) { cal = 210; p = 30; c = 12; f = 3; }
      else if (lower.includes('salad')) { cal = 180; p = 8; c = 16; f = 9; }
      else if (lower.includes('pizza') || lower.includes('burger')) { cal = 550; p = 24; c = 60; f = 22; }

      const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
      logFoodItem(capitalized, '1 serving (AI estimated)', cal, p, c, f);

      aiInput.value = '';
      aiSubmitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
      aiSubmitBtn.disabled = false;
    }, 450);
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
      logFoodItem(meal, 'Standard serving', cal, p, c, f);
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

  // Scan Modal Controls
  function openScanner() {
    scanModalBackdrop.classList.add('show');
  }

  function closeScanner() {
    scanModalBackdrop.classList.remove('show');
  }

  centerScanBtn.addEventListener('click', openScanner);
  closeScanModal.addEventListener('click', closeScanner);
  openScannerTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.meal-card');
      if (card) {
        const nameEl = card.querySelector('.meal-name');
        const txt = nameEl ? nameEl.textContent.trim().toLowerCase() : 'snack';
        if (txt.includes('breakfast')) currentTargetMeal = 'breakfast';
        else if (txt.includes('lunch')) currentTargetMeal = 'lunch';
        else if (txt.includes('dinner')) currentTargetMeal = 'dinner';
        else currentTargetMeal = 'snack';
      } else {
        currentTargetMeal = 'snack';
      }
      openScanner();
    });
  });

  scanModalBackdrop.addEventListener('click', (e) => {
    if (e.target === scanModalBackdrop) closeScanner();
  });

  // Modal Mode Switcher (AI Camera, Item & Qty, Manual)
  const modeTabs = document.querySelectorAll('.mode-tab');
  const panelCamera = document.getElementById('panelCamera');
  const panelSearch = document.getElementById('panelSearch');
  const panelManual = document.getElementById('panelManual');

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      if (mode === 'camera') {
        panelCamera.style.display = 'block';
        panelSearch.style.display = 'none';
        panelManual.style.display = 'none';
      } else if (mode === 'search') {
        panelCamera.style.display = 'none';
        panelSearch.style.display = 'block';
        panelManual.style.display = 'none';
        calculateSearchNutrients();
      } else if (mode === 'manual') {
        panelCamera.style.display = 'none';
        panelSearch.style.display = 'none';
        panelManual.style.display = 'block';
      }
    });
  });

  // ================= MODE 1: AI CAMERA =================
  simulateScanBtn.addEventListener('click', () => {
    detectedFoodCard.style.display = 'block';
    state.scannedItem = {
      name: "Mediterranean Salad Bowl",
      portion: "AI Camera (280g)",
      cal: 340,
      p: 18,
      c: 26,
      f: 14,
      fib: 6
    };
  });

  confirmLogScannedBtn.addEventListener('click', () => {
    if (state.scannedItem) {
      logFoodItem(
        state.scannedItem.name,
        state.scannedItem.portion,
        state.scannedItem.cal,
        state.scannedItem.p,
        state.scannedItem.c,
        state.scannedItem.f,
        state.scannedItem.fib
      );
      state.scannedItem = null;
      detectedFoodCard.style.display = 'none';
      closeScanner();
    }
  });

  let torchOn = false;
  torchToggle.addEventListener('click', () => {
    torchOn = !torchOn;
    torchToggle.textContent = `Flash: ${torchOn ? 'On' : 'Off'}`;
    torchToggle.style.background = torchOn ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
    torchToggle.style.color = torchOn ? '#1A1A1A' : '#FFFFFF';
  });

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

  // Baseline nutritional database per 100g (or per piece)
  const foodDb = {
    "chicken breast": { base: "g", cal100: 165, p100: 31, c100: 0, f100: 3.6, fib100: 0 },
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

  let currentSearchCalc = { name: "Chicken Breast", qtyText: "150g", cal: 247, p: 46, c: 0, f: 5, fib: 0 };

  function calculateSearchNutrients() {
    const rawName = searchItemInput.value.trim().toLowerCase();
    const qty = parseFloat(searchQtyInput.value) || 100;
    const unit = searchUnitSelect.value;

    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    let matchedFood = null;

    for (const key in foodDb) {
      if (rawName.includes(key)) {
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
      // General estimation for non-database custom search
      const factor = (unit === "g") ? (qty / 100) : qty;
      cal = Math.round(200 * factor);
      p = Math.round(15 * factor);
      c = Math.round(20 * factor);
      f = Math.round(6 * factor);
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

    closeScanner();
  });

  // Workout Timer & Controls
  startWorkoutBtn.addEventListener('click', () => {
    state.workoutActive = !state.workoutActive;
    if (state.workoutActive) {
      startWorkoutBtn.textContent = 'Pause Active Workout';
      startWorkoutBtn.style.background = '#374151';
      activeTimerBadge.style.display = 'inline-flex';

      state.workoutInterval = setInterval(() => {
        state.workoutSeconds++;
        const mins = Math.floor(state.workoutSeconds / 60).toString().padStart(2, '0');
        const secs = (state.workoutSeconds % 60).toString().padStart(2, '0');
        activeTimerVal.textContent = `${mins}:${secs}`;
      }, 1000);
    } else {
      startWorkoutBtn.textContent = 'Resume Workout';
      startWorkoutBtn.style.background = 'var(--pill-dark)';
      clearInterval(state.workoutInterval);
    }
  });

  // Exercise Checklists & Set Bubbles
  const exerciseCards = document.querySelectorAll('.exercise-item-card');
  function updateChecklistCount() {
    const doneCards = document.querySelectorAll('.exercise-item-card.completed').length;
    checklistCountEl.textContent = `${doneCards} of ${exerciseCards.length} Completed`;
  }

  exerciseCards.forEach(card => {
    const checkBtn = card.querySelector('.checkbox-circle');
    const setBubbles = card.querySelectorAll('.set-bubble');

    // Checkbox toggle
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isDone = card.classList.toggle('completed');
      checkBtn.classList.toggle('checked', isDone);

      setBubbles.forEach(b => {
        if (isDone) {
          b.classList.add('done');
          b.classList.remove('active');
        } else {
          b.classList.remove('done', 'active');
        }
      });
      updateChecklistCount();
    });

    // Individual set bubbles
    setBubbles.forEach((bubble) => {
      bubble.addEventListener('click', (e) => {
        e.stopPropagation();
        bubble.classList.toggle('done');
        const allDone = Array.from(setBubbles).every(b => b.classList.contains('done'));
        card.classList.toggle('completed', allDone);
        checkBtn.classList.toggle('checked', allDone);
        updateChecklistCount();
      });
    });
  });

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

  let currentOverviewPeriod = 'today';

  function updateOverviewMetrics() {
    const isZeroUser = state.consumedCalories === 0 && (state.activeBurned || 0) === 0;

    if (currentOverviewPeriod === 'today') {
      if (metricsGridHeading) metricsGridHeading.textContent = "Today's Health Metrics";
      if (metricCaloriesVal) metricCaloriesVal.textContent = isZeroUser ? "0" : "2,180";
      if (metricCaloriesTitle) metricCaloriesTitle.textContent = "Calories Burned";
      if (metricCaloriesSub) metricCaloriesSub.textContent = isZeroUser ? "0 active • 0 resting" : "540 active • 1,640 resting";

      if (metricStepsVal) metricStepsVal.textContent = isZeroUser ? "0" : "8,420";
      if (metricStepsSub) metricStepsSub.textContent = isZeroUser ? "steps (0% of 10k goal)" : "steps (84% of 10k goal)";

      if (metricActiveMinsVal) metricActiveMinsVal.textContent = isZeroUser ? "0" : "48";
      if (metricActiveMinsSub) metricActiveMinsSub.textContent = isZeroUser ? "min (0% of 45 min goal)" : "min (Goal 45 min reached)";

      if (metricSleepVal) metricSleepVal.textContent = isZeroUser ? "0h 0m" : "7h 35m";
      if (metricSleepTitle) metricSleepTitle.textContent = "Sleep Duration";
      if (metricSleepSub) metricSleepSub.textContent = isZeroUser ? "No sleep recorded yet" : "Last night • 92% score";
    } else {
      if (metricsGridHeading) metricsGridHeading.textContent = "Weekly Aggregate Metrics";
      if (metricCaloriesVal) metricCaloriesVal.textContent = isZeroUser ? "0" : "10,820";
      if (metricCaloriesTitle) metricCaloriesTitle.textContent = "Calories Burned";
      if (metricCaloriesSub) metricCaloriesSub.textContent = isZeroUser ? "0 kcal / week total" : "kcal / week total";

      if (metricStepsVal) metricStepsVal.textContent = isZeroUser ? "0" : "82,641";
      if (metricStepsSub) metricStepsSub.textContent = isZeroUser ? "steps (0% of weekly goal)" : "steps (82% of weekly goal)";

      if (metricActiveMinsVal) metricActiveMinsVal.textContent = isZeroUser ? "0" : "558";
      if (metricActiveMinsSub) metricActiveMinsSub.textContent = isZeroUser ? "min / weekly total" : "min / weekly total";

      if (metricSleepVal) metricSleepVal.textContent = isZeroUser ? "0h 0m" : "51h 36m";
      if (metricSleepTitle) metricSleepTitle.textContent = "Weekly Sleep";
      if (metricSleepSub) metricSleepSub.textContent = isZeroUser ? "No weekly sleep recorded" : "7h 22m daily avg";
    }
  }

  overviewPeriodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      overviewPeriodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentOverviewPeriod = tab.dataset.period;
      updateOverviewMetrics();
    });
  });

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

  function showAuthView(viewName) {
    if (authContainer) authContainer.style.display = 'flex';
    if (bottomNavBar) bottomNavBar.style.display = 'none';

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
    if (authContainer) authContainer.style.display = 'none';
    if (bottomNavBar) bottomNavBar.style.display = 'flex';
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
  function resetUserDataToZero() {
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

    if (snackItemList) {
      snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
    }

    // 4. Workout Checklists & Set Bubbles
    if (checklistCountEl) checklistCountEl.textContent = '0 of 4 Completed';
    const exerciseCards = document.querySelectorAll('.exercise-item-card');
    exerciseCards.forEach(card => {
      card.classList.remove('completed');
      const checkBtn = card.querySelector('.checkbox-circle');
      if (checkBtn) checkBtn.classList.remove('checked');
      const setBubbles = card.querySelectorAll('.set-bubble');
      setBubbles.forEach(b => b.classList.remove('done', 'active'));
    });

    // 5. Overview Tab Data
    updateOverviewMetrics();
    const histBars = document.querySelectorAll('.histogram-bars .bar-fill');
    histBars.forEach(b => b.style.height = '4px');
  }

  // Restore pre-seeded demo state (only for alex.rivera@wellness.io)
  function loadDemoData() {
    state.consumedCalories = 1320;
    state.targetCalories = 2300;
    state.carbs = 142;
    state.protein = 98;
    state.fats = 42;
    state.waterIntake = 1750;
    state.waterTarget = 2500;
    state.activeBurned = 540;
    state.snackCalories = 70;
    state.checklistCompleted = 1;

    updateMacroRings();
    updateWater();

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

    if (checklistCountEl) checklistCountEl.textContent = '1 of 4 Completed';
    const squatsCard = document.querySelector('.exercise-item-card[data-id="squats"]');
    if (squatsCard) {
      squatsCard.classList.add('completed');
      const checkBtn = squatsCard.querySelector('.checkbox-circle');
      if (checkBtn) checkBtn.classList.add('checked');
      const bubbles = squatsCard.querySelectorAll('.set-bubble');
      bubbles.forEach(b => b.classList.add('done'));
    }

    updateOverviewMetrics();
    const heights = ['65%', '80%', '60%', '95%', '75%', '85%', '50%'];
    const barFills = document.querySelectorAll('.histogram-bars .bar-fill');
    barFills.forEach((b, i) => {
      if (heights[i]) b.style.height = heights[i];
    });
  }

  // Save current user state to localStorage
  function saveUserData(email) {
    if (!email || email === 'alex.rivera@wellness.io') return;
    const breakfastItemList = document.getElementById('breakfastItemList');
    const lunchItemList = document.getElementById('lunchItemList');

    const userData = {
      consumedCalories: state.consumedCalories,
      targetCalories: state.targetCalories,
      carbs: state.carbs,
      protein: state.protein,
      fats: state.fats,
      fiber: state.fiber,
      waterIntake: state.waterIntake,
      waterTarget: state.waterTarget,
      activeBurned: state.activeBurned,
      snackCalories: state.snackCalories || 0,
      breakfastCalories: state.breakfastCalories || 0,
      lunchCalories: state.lunchCalories || 0,
      dinnerCalories: state.dinnerCalories || 0,
      snackHtml: snackItemList ? snackItemList.innerHTML : '',
      breakfastHtml: breakfastItemList ? breakfastItemList.innerHTML : '',
      lunchHtml: lunchItemList ? lunchItemList.innerHTML : ''
    };
    localStorage.setItem('fittrack_data_' + email, JSON.stringify(userData));
  }

  // Load user-specific tracking state
  function loadUserData(email) {
    if (!email) {
      resetUserDataToZero();
      return;
    }
    if (email === 'alex.rivera@wellness.io') {
      loadDemoData();
      return;
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
        state.consumedCalories = parsed.consumedCalories || 0;
        // Only fallback to cached target if user profile targets are absent
        if (!curUser?.nutritionTargets?.targetCalories && parsed.targetCalories) {
          state.targetCalories = parsed.targetCalories;
        }
        state.carbs = parsed.carbs || 0;
        state.protein = parsed.protein || 0;
        state.fats = parsed.fats || 0;
        state.fiber = parsed.fiber || 0;
        state.waterIntake = parsed.waterIntake || 0;
        if (!curUser?.nutritionTargets?.targetWater && parsed.waterTarget) {
          state.waterTarget = parsed.waterTarget;
        }
        state.activeBurned = parsed.activeBurned || 0;
        state.snackCalories = parsed.snackCalories || 0;
        state.breakfastCalories = parsed.breakfastCalories || 0;
        state.lunchCalories = parsed.lunchCalories || 0;
        state.dinnerCalories = parsed.dinnerCalories || 0;

        updateMacroRings();
        updateWater();
        updateMealSummaries();

        const breakfastItemList = document.getElementById('breakfastItemList');
        const lunchItemList = document.getElementById('lunchItemList');

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

        if (snackItemList && parsed.snackHtml) {
          snackItemList.innerHTML = parsed.snackHtml;
        } else if (snackItemList) {
          snackItemList.innerHTML = '<li class="meal-empty-note">No snacks logged yet today. Tap + to add food.</li>';
        }

        updateOverviewMetrics();
        return;
      } catch (e) {
        console.warn('Failed parsing saved user data', e);
      }
    }

    // Default for fresh user: strictly 0
    resetUserDataToZero();
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const token = localStorage.getItem('fittrack_token');
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        } catch (err) {
          console.warn('Logout API error:', err);
        }
      }
      localStorage.removeItem('fittrack_token');
      localStorage.removeItem('fittrack_user');
      resetUserDataToZero();
      showAuthView('login');
    });
  }
});
