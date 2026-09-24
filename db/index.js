// FitTrack Unified Database Layer (PostgreSQL Cloud + Embedded Fallback Engine)
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');
const DAILY_LOGS_FILE = path.join(DATA_DIR, 'daily_logs.json');
const WEEKLY_MEALS_FILE = path.join(DATA_DIR, 'weekly_meals.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pgPool = null;
let isPostgres = false;

// Helpers for JSON-based fallback
function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error(`[DB Error] Reading ${file}:`, e);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[DB Error] Writing ${file}:`, e);
    return false;
  }
}

async function init() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    try {
      console.log('[DB] Connecting to PostgreSQL Database via DATABASE_URL...');
      pgPool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      // Test connection
      const client = await pgPool.connect();
      console.log('[DB] PostgreSQL connected successfully! Initializing schema...');
      
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('[DB] PostgreSQL tables verified and up to date.');
      }
      client.release();
      isPostgres = true;
      return true;
    } catch (err) {
      console.error('[DB] PostgreSQL connection error:', err.message);
      console.log('[DB] Falling back to Embedded Local Database Engine...');
      isPostgres = false;
      pgPool = null;
    }
  } else {
    console.log('[DB] No DATABASE_URL provided. Running on Local Persistent Database Engine.');
    isPostgres = false;
  }

  // Ensure local store files exist
  if (!fs.existsSync(DAILY_LOGS_FILE)) writeJson(DAILY_LOGS_FILE, []);
  if (!fs.existsSync(FAVORITES_FILE)) writeJson(FAVORITES_FILE, {});
  if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
  if (!fs.existsSync(WEEKLY_MEALS_FILE)) writeJson(WEEKLY_MEALS_FILE, []);

  return true;
}

// ==================== USERS API ====================

async function getUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return formatUserRow(row);
  } else {
    const users = readJson(USERS_FILE, []);
    const user = users.find(u => u.email.toLowerCase() === normalized);
    return user || null;
  }
}

async function getUserById(id) {
  if (!id) return null;

  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return null;
    return formatUserRow(res.rows[0]);
  } else {
    const users = readJson(USERS_FILE, []);
    return users.find(u => u.id === id) || null;
  }
}

async function getUserByGoogleId(googleId) {
  if (!googleId) return null;

  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE google_id = $1 LIMIT 1', [googleId]);
    if (res.rows.length === 0) return null;
    return formatUserRow(res.rows[0]);
  } else {
    const users = readJson(USERS_FILE, []);
    return users.find(u => u.googleId === googleId) || null;
  }
}

async function createUser(user) {
  const now = Date.now();
  const id = user.id || 'usr_' + now + '_' + Math.random().toString(36).substr(2, 6);
  const normalizedEmail = user.email.trim().toLowerCase();

  if (isPostgres) {
    const query = `
      INSERT INTO users (id, email, password_hash, salt, google_id, name, age, weight, height, gym_frequency, goal, nutrition_targets, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    const values = [
      id,
      normalizedEmail,
      user.passwordHash || null,
      user.salt || null,
      user.googleId || null,
      user.name || '',
      user.age || 25,
      user.weight || 70.0,
      user.height || 175.0,
      user.gymFrequency || '4-5 days/wk',
      user.goal || 'maintain',
      JSON.stringify(user.nutritionTargets || {}),
      now,
      now
    ];
    const res = await pgPool.query(query, values);
    return formatUserRow(res.rows[0]);
  } else {
    const users = readJson(USERS_FILE, []);
    const newUser = {
      id,
      email: normalizedEmail,
      passwordHash: user.passwordHash || null,
      salt: user.salt || null,
      googleId: user.googleId || null,
      name: user.name || '',
      age: user.age || 25,
      weight: user.weight || 70.0,
      height: user.height || 175.0,
      gymFrequency: user.gymFrequency || '4-5 days/wk',
      goal: user.goal || 'maintain',
      nutritionTargets: user.nutritionTargets || {},
      createdAt: now,
      updatedAt: now
    };
    users.push(newUser);
    writeJson(USERS_FILE, users);
    return newUser;
  }
}

async function updateUserProfile(userId, { weight, height, age, gymFrequency, goal, nutritionTargets }) {
  const now = Date.now();

  if (isPostgres) {
    const query = `
      UPDATE users
      SET weight = $1, height = $2, age = $3, gym_frequency = $4, goal = $5, nutrition_targets = $6, updated_at = $7
      WHERE id = $8
      RETURNING *;
    `;
    const values = [
      weight,
      height,
      age,
      gymFrequency,
      goal,
      JSON.stringify(nutritionTargets || {}),
      now,
      userId
    ];
    const res = await pgPool.query(query, values);
    if (res.rows.length === 0) return null;
    return formatUserRow(res.rows[0]);
  } else {
    const users = readJson(USERS_FILE, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    users[idx] = {
      ...users[idx],
      weight,
      height,
      age,
      gymFrequency,
      goal,
      nutritionTargets,
      updatedAt: now
    };
    writeJson(USERS_FILE, users);
    return users[idx];
  }
}

async function linkGoogleAccount(userId, googleId) {
  if (isPostgres) {
    const res = await pgPool.query('UPDATE users SET google_id = $1, updated_at = $2 WHERE id = $3 RETURNING *', [googleId, Date.now(), userId]);
    return res.rows.length > 0 ? formatUserRow(res.rows[0]) : null;
  } else {
    const users = readJson(USERS_FILE, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    users[idx].googleId = googleId;
    users[idx].updatedAt = Date.now();
    writeJson(USERS_FILE, users);
    return users[idx];
  }
}

function formatUserRow(row) {
  let targets = {};
  if (typeof row.nutrition_targets === 'string') {
    try { targets = JSON.parse(row.nutrition_targets); } catch (e) {}
  } else if (typeof row.nutrition_targets === 'object' && row.nutrition_targets !== null) {
    targets = row.nutrition_targets;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.salt,
    googleId: row.google_id,
    name: row.name,
    age: row.age,
    weight: row.weight,
    height: row.height,
    gymFrequency: row.gym_frequency,
    goal: row.goal,
    nutritionTargets: targets,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at)
  };
}

// ==================== DAILY LOGS API ====================

async function getDailyLog(userId, dateStr) {
  if (!userId || !dateStr) return null;

  if (isPostgres) {
    const query = 'SELECT * FROM daily_logs WHERE user_id = $1 AND date = $2 LIMIT 1';
    const res = await pgPool.query(query, [userId, dateStr]);
    if (res.rows.length === 0) return null;
    return formatDailyLogRow(res.rows[0]);
  } else {
    const logs = readJson(DAILY_LOGS_FILE, []);
    const log = logs.find(l => l.userId === userId && l.date === dateStr);
    return log || null;
  }
}

async function upsertDailyLog(userId, dateStr, logData) {
  if (!userId || !dateStr) return null;
  const now = Date.now();

  const consumed = parseInt(logData.consumedCalories, 10) || 0;
  const carbs = parseInt(logData.carbs, 10) || 0;
  const protein = parseInt(logData.protein, 10) || 0;
  const fats = parseInt(logData.fats, 10) || 0;
  const fiber = parseInt(logData.fiber, 10) || 0;
  const waterIntake = parseInt(logData.waterIntake, 10) || 0;
  const waterTarget = parseInt(logData.waterTarget, 10) || 2500;
  const activeBurned = parseInt(logData.activeBurned, 10) || 0;
  const mealsStr = typeof logData.meals === 'string' ? logData.meals : JSON.stringify(logData.meals || []);
  const exercisesStr = typeof logData.completedExercises === 'string' ? logData.completedExercises : JSON.stringify(logData.completedExercises || {});

  if (isPostgres) {
    const id = 'log_' + userId + '_' + dateStr;
    const query = `
      INSERT INTO daily_logs (id, user_id, date, consumed_calories, carbs, protein, fats, fiber, water_intake, water_target, active_burned, meals, completed_exercises, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id, date) DO UPDATE SET
        consumed_calories = EXCLUDED.consumed_calories,
        carbs = EXCLUDED.carbs,
        protein = EXCLUDED.protein,
        fats = EXCLUDED.fats,
        fiber = EXCLUDED.fiber,
        water_intake = EXCLUDED.water_intake,
        water_target = EXCLUDED.water_target,
        active_burned = EXCLUDED.active_burned,
        meals = EXCLUDED.meals,
        completed_exercises = EXCLUDED.completed_exercises,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const values = [
      id, userId, dateStr, consumed, carbs, protein, fats, fiber, waterIntake, waterTarget, activeBurned, mealsStr, exercisesStr, now
    ];
    const res = await pgPool.query(query, values);
    return formatDailyLogRow(res.rows[0]);
  } else {
    const logs = readJson(DAILY_LOGS_FILE, []);
    const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
    const newEntry = {
      id: 'log_' + userId + '_' + dateStr,
      userId,
      date: dateStr,
      consumedCalories: consumed,
      carbs,
      protein,
      fats,
      fiber,
      waterIntake,
      waterTarget,
      activeBurned,
      meals: typeof logData.meals === 'object' ? logData.meals : JSON.parse(mealsStr || '[]'),
      completedExercises: typeof logData.completedExercises === 'object' ? logData.completedExercises : JSON.parse(exercisesStr || '{}'),
      updatedAt: now
    };

    if (idx >= 0) {
      logs[idx] = newEntry;
    } else {
      logs.push(newEntry);
    }
    writeJson(DAILY_LOGS_FILE, logs);
    return newEntry;
  }
}

async function getWeeklyHistory(userId, startDate, endDate) {
  if (!userId) return [];

  if (isPostgres) {
    const query = `
      SELECT date, consumed_calories, active_burned
      FROM daily_logs
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC;
    `;
    const res = await pgPool.query(query, [userId, startDate, endDate]);
    return res.rows.map(r => ({
      date: r.date,
      consumed: r.consumed_calories,
      burned: r.active_burned
    }));
  } else {
    const logs = readJson(DAILY_LOGS_FILE, []);
    return logs
      .filter(l => l.userId === userId && l.date >= startDate && l.date <= endDate)
      .map(l => ({
        date: l.date,
        consumed: l.consumedCalories,
        burned: l.activeBurned
      }));
  }
}

function formatDailyLogRow(row) {
  let meals = [];
  let exercises = {};
  try {
    meals = typeof row.meals === 'string' ? JSON.parse(row.meals) : (row.meals || []);
  } catch (e) {}
  try {
    exercises = typeof row.completed_exercises === 'string' ? JSON.parse(row.completed_exercises) : (row.completed_exercises || {});
  } catch (e) {}

  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    consumedCalories: row.consumed_calories,
    carbs: row.carbs,
    protein: row.protein,
    fats: row.fats,
    fiber: row.fiber,
    waterIntake: row.water_intake,
    waterTarget: row.water_target,
    activeBurned: row.active_burned,
    meals,
    completedExercises: exercises,
    updatedAt: Number(row.updated_at)
  };
}

// ==================== FAVORITES API ====================

async function getFavorites(userId) {
  if (!userId) return [];

  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      portion: r.portion,
      mealType: r.meal_type,
      createdAt: Number(r.created_at)
    }));
  } else {
    const map = readJson(FAVORITES_FILE, {});
    return map[userId] || [];
  }
}

async function addFavorite(userId, fav) {
  if (!userId || !fav || !fav.name) return null;
  const now = Date.now();
  const id = fav.id || 'fav_' + now + '_' + Math.random().toString(36).substr(2, 6);

  const newFav = {
    id,
    userId,
    name: fav.name.trim(),
    calories: parseInt(fav.calories, 10) || 0,
    protein: parseFloat(fav.protein) || 0,
    carbs: parseFloat(fav.carbs) || 0,
    fat: parseFloat(fav.fat) || 0,
    portion: fav.portion || '1 serving',
    mealType: fav.mealType || 'snack',
    createdAt: now
  };

  if (isPostgres) {
    const query = `
      INSERT INTO favorites (id, user_id, name, calories, protein, carbs, fat, portion, meal_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      newFav.id, userId, newFav.name, newFav.calories, newFav.protein, newFav.carbs, newFav.fat, newFav.portion, newFav.mealType, now
    ];
    await pgPool.query(query, values);
    return newFav;
  } else {
    const map = readJson(FAVORITES_FILE, {});
    if (!map[userId]) map[userId] = [];
    map[userId].unshift(newFav);
    writeJson(FAVORITES_FILE, map);
    return newFav;
  }
}

async function deleteFavorite(userId, favId) {
  if (!userId || !favId) return false;

  if (isPostgres) {
    const res = await pgPool.query('DELETE FROM favorites WHERE user_id = $1 AND id = $2', [userId, favId]);
    return res.rowCount > 0;
  } else {
    const map = readJson(FAVORITES_FILE, {});
    if (!map[userId]) return false;
    map[userId] = map[userId].filter(f => f.id !== favId);
    writeJson(FAVORITES_FILE, map);
    return true;
  }
}

// ==================== WEEKLY MEALS / FOOD DIARY API ====================

function formatWeeklyMealRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userEmail: row.user_email,
    weekId: row.week_id,
    day: row.day,
    title: row.title,
    mealSlot: row.meal_slot,
    time: row.time,
    calories: parseInt(row.calories, 10) || 0,
    isCheat: Boolean(row.is_cheat),
    notes: row.notes || '',
    img: row.img || '',
    createdAt: Number(row.created_at) || Date.now()
  };
}

async function getWeeklyMeals(userEmail, weekId) {
  if (!userEmail) return [];
  const normalizedEmail = userEmail.toLowerCase().trim();

  if (isPostgres) {
    const query = `
      SELECT * FROM weekly_meals 
      WHERE LOWER(user_email) = $1 AND week_id = $2 
      ORDER BY created_at ASC;
    `;
    const res = await pgPool.query(query, [normalizedEmail, weekId]);
    return res.rows.map(formatWeeklyMealRow);
  } else {
    const allMeals = readJson(WEEKLY_MEALS_FILE, []);
    return allMeals.filter(m => (m.userEmail || '').toLowerCase().trim() === normalizedEmail && m.weekId === weekId);
  }
}

async function addWeeklyMeal(mealData) {
  if (!mealData || !mealData.userEmail) throw new Error('userEmail is required to add weekly meal');

  const newMeal = {
    id: mealData.id || ('meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
    userEmail: (mealData.userEmail || '').toLowerCase().trim(),
    weekId: mealData.weekId || 'current',
    day: (mealData.day || 'mon').toLowerCase().trim(),
    title: mealData.title || 'Meal Photo',
    mealSlot: mealData.mealSlot || 'Lunch',
    time: mealData.time || '',
    calories: parseInt(mealData.calories, 10) || 0,
    isCheat: Boolean(mealData.isCheat),
    notes: mealData.notes || '',
    img: mealData.img || '',
    createdAt: Number(mealData.createdAt) || Date.now()
  };

  if (isPostgres) {
    const query = `
      INSERT INTO weekly_meals (id, user_email, week_id, day, title, meal_slot, time, calories, is_cheat, notes, img, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      newMeal.id,
      newMeal.userEmail,
      newMeal.weekId,
      newMeal.day,
      newMeal.title,
      newMeal.mealSlot,
      newMeal.time,
      newMeal.calories,
      newMeal.isCheat,
      newMeal.notes,
      newMeal.img,
      newMeal.createdAt
    ];
    const res = await pgPool.query(query, values);
    return formatWeeklyMealRow(res.rows[0]);
  } else {
    const allMeals = readJson(WEEKLY_MEALS_FILE, []);
    allMeals.push(newMeal);
    writeJson(WEEKLY_MEALS_FILE, allMeals);
    return newMeal;
  }
}

async function deleteWeeklyMeal(id, userEmail) {
  if (!id) return false;
  const normalizedEmail = (userEmail || '').toLowerCase().trim();

  if (isPostgres) {
    let res;
    if (normalizedEmail) {
      res = await pgPool.query(
        'DELETE FROM weekly_meals WHERE id = $1 AND (LOWER(user_email) = $2 OR user_email = $3)',
        [id, normalizedEmail, 'guest@fittrack.local']
      );
    } else {
      res = await pgPool.query('DELETE FROM weekly_meals WHERE id = $1', [id]);
    }
    return res.rowCount > 0;
  } else {
    const allMeals = readJson(WEEKLY_MEALS_FILE, []);
    const initialLen = allMeals.length;
    const filtered = allMeals.filter(m => {
      if (m.id !== id) return true;
      if (!normalizedEmail) return false;
      const mEmail = (m.userEmail || '').toLowerCase().trim();
      return !(mEmail === normalizedEmail || mEmail === 'guest@fittrack.local');
    });
    if (filtered.length !== initialLen) {
      writeJson(WEEKLY_MEALS_FILE, filtered);
      return true;
    }
    return false;
  }
}

async function toggleWeeklyMealCheat(id, userEmail, isCheat) {
  if (!id || !userEmail) return null;
  const normalizedEmail = userEmail.toLowerCase().trim();
  const cheatBool = Boolean(isCheat);

  if (isPostgres) {
    const query = `
      UPDATE weekly_meals 
      SET is_cheat = $1 
      WHERE id = $2 AND LOWER(user_email) = $3 
      RETURNING *;
    `;
    const res = await pgPool.query(query, [cheatBool, id, normalizedEmail]);
    return res.rows.length > 0 ? formatWeeklyMealRow(res.rows[0]) : null;
  } else {
    const allMeals = readJson(WEEKLY_MEALS_FILE, []);
    const meal = allMeals.find(m => m.id === id && (m.userEmail || '').toLowerCase().trim() === normalizedEmail);
    if (meal) {
      meal.isCheat = cheatBool;
      writeJson(WEEKLY_MEALS_FILE, allMeals);
      return meal;
    }
    return null;
  }
}

module.exports = {
  init,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  createUser,
  updateUserProfile,
  linkGoogleAccount,
  getDailyLog,
  upsertDailyLog,
  getWeeklyHistory,
  getFavorites,
  addFavorite,
  deleteFavorite,
  getWeeklyMeals,
  addWeeklyMeal,
  deleteWeeklyMeal,
  toggleWeeklyMealCheat,
  isPostgres: () => isPostgres
};
