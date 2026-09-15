const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const GOOGLE_CONFIG_FILE = path.join(__dirname, 'data', 'google-config.json');
const PREVIEW_DIR = path.join(__dirname, 'preview');

// Google OAuth Configuration persistence
function getGoogleConfig() {
  try {
    if (!fs.existsSync(GOOGLE_CONFIG_FILE)) {
      const initial = {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        webOrigin: 'http://localhost:8080',
        redirectUri: 'http://localhost:8080/api/auth/google/callback',
        setupStatus: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'pending_client_id',
        updatedAt: Date.now()
      };
      fs.writeFileSync(GOOGLE_CONFIG_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const data = fs.readFileSync(GOOGLE_CONFIG_FILE, 'utf8');
    const config = JSON.parse(data || '{}');
    if (process.env.GOOGLE_CLIENT_ID && !config.clientId) {
      config.clientId = process.env.GOOGLE_CLIENT_ID;
      config.setupStatus = 'configured';
    }
    return config;
  } catch (err) {
    console.error('Error reading google config:', err);
    return { clientId: process.env.GOOGLE_CLIENT_ID || '', setupStatus: 'pending_client_id' };
  }
}

function saveGoogleConfig(config) {
  try {
    config.updatedAt = Date.now();
    fs.writeFileSync(GOOGLE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving google config:', err);
    return false;
  }
}

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// In-memory active tokens mapping: token -> { userId, email, expiresAt }
const activeSessions = new Map();

// Crypto helpers
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken() {
  return 'ft_' + crypto.randomBytes(24).toString('hex');
}

// Google OAuth 2.0 ID Token Verification via Google's tokeninfo API
function verifyGoogleIdToken(idToken) {
  return new Promise((resolve) => {
    if (!idToken || typeof idToken !== 'string') {
      return resolve({ valid: false, error: 'Empty or invalid token format' });
    }

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error_description || parsed.error) {
            return resolve({ valid: false, error: parsed.error_description || parsed.error });
          }

          // Verify token expiration
          const nowSec = Math.floor(Date.now() / 1000);
          if (parsed.exp && parseInt(parsed.exp, 10) < nowSec) {
            return resolve({ valid: false, error: 'Google ID token has expired' });
          }

          resolve({
            valid: true,
            payload: {
              googleId: parsed.sub,
              email: (parsed.email || '').toLowerCase().trim(),
              emailVerified: parsed.email_verified === 'true' || parsed.email_verified === true,
              name: parsed.name || '',
              picture: parsed.picture || '',
              givenName: parsed.given_name || '',
              familyName: parsed.family_name || ''
            }
          });
        } catch (err) {
          resolve({ valid: false, error: 'Failed parsing Google OAuth token verification response' });
        }
      });
    }).on('error', (err) => {
      resolve({ valid: false, error: 'Network error connecting to Google OAuth service: ' + err.message });
    });
  });
}

// Mifflin-St Jeor Personalized Calorie & Macro Target Calculator with Goal Adjustment (Loss, Maintain, Gain)
function calculateNutritionTargets(weightKg, heightCm, age, gymFrequency, goal) {
  const weight = Math.max(parseFloat(weightKg) || 68.5, 30);
  const height = Math.max(parseFloat(heightCm) || 175, 100);
  const userAge = Math.max(parseInt(age, 10) || 25, 12);

  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * userAge + 5);

  let multiplier = 1.2;
  const freq = (gymFrequency || '').toLowerCase();
  if (freq.includes('6-7') || freq.includes('athlete')) {
    multiplier = 1.725;
  } else if (freq.includes('4-5') || freq.includes('active')) {
    multiplier = 1.55;
  } else if (freq.includes('2-3') || freq.includes('moderate')) {
    multiplier = 1.375;
  } else {
    multiplier = 1.2; // 0-1 days / sedentary
  }

  const maintenanceCalories = Math.round(bmr * multiplier);

  // Goal-based Calorie Adjustments:
  // - Weight Loss: 500 kcal deficit (or ~20% deficit, safe minimum 1200 kcal)
  // - Weight Gain: 500 kcal surplus (lean bulk)
  // - Maintain: 0 kcal adjustment (maintenance)
  const normGoal = (goal || 'maintain').toLowerCase();
  let targetCalories = maintenanceCalories;
  let proteinRatio = 0.30;
  let carbsRatio = 0.45;
  let fatsRatio = 0.25;
  let goalType = 'maintain';
  let goalLabel = 'Maintain Weight';

  if (normGoal.includes('loss') || normGoal === 'weight_loss' || normGoal === 'cut') {
    goalType = 'weight_loss';
    goalLabel = 'Weight Loss';
    targetCalories = Math.max(Math.round(maintenanceCalories - 500), 1200);
    proteinRatio = 0.35; // Higher protein preserves muscle in a deficit
    carbsRatio = 0.40;
    fatsRatio = 0.25;
  } else if (normGoal.includes('gain') || normGoal === 'weight_gain' || normGoal === 'bulk') {
    goalType = 'weight_gain';
    goalLabel = 'Weight Gain';
    targetCalories = Math.round(maintenanceCalories + 500);
    proteinRatio = 0.25;
    carbsRatio = 0.55; // Higher carbs fuel high-volume training & growth
    fatsRatio = 0.20;
  } else {
    goalType = 'maintain';
    goalLabel = 'Maintain Weight';
    targetCalories = maintenanceCalories;
    proteinRatio = 0.30;
    carbsRatio = 0.45;
    fatsRatio = 0.25;
  }

  const protein = Math.round((targetCalories * proteinRatio) / 4);
  const carbs = Math.round((targetCalories * carbsRatio) / 4);
  const fats = Math.round((targetCalories * fatsRatio) / 9);
  const waterTarget = Math.round((weight * 35) / 50) * 50; // 35 ml/kg rounded to nearest 50 ml

  const breakfastCal = Math.round(targetCalories * 0.28);
  const lunchCal = Math.round(targetCalories * 0.35);
  const dinnerCal = Math.round(targetCalories * 0.27);
  const snackCal = targetCalories - (breakfastCal + lunchCal + dinnerCal);

  return {
    bmr,
    maintenanceCalories,
    targetCalories,
    calorieAdjustment: targetCalories - maintenanceCalories,
    goal: goalType,
    goalLabel: goalLabel,
    targetProtein: protein,
    targetCarbs: carbs,
    targetFats: fats,
    targetWater: waterTarget,
    mealBreakdown: {
      breakfast: breakfastCal,
      lunch: lunchCal,
      dinner: dinnerCal,
      snack: snackCal
    }
  };
}

// User store helpers
function getUsers() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving users file:', err);
    return false;
  }
}

// Helper to parse JSON request bodies
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Helper for JSON API responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Static file server helper
function serveStaticFile(req, res) {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PREVIEW_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
}

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // ==================== REST API ENDPOINTS ====================

  // 1. POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { name, email, password, age, weight, height, gymFrequency, goal } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return sendJson(res, 400, { success: false, message: 'Full name is required' });
      }
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return sendJson(res, 400, { success: false, message: 'A valid email address is required' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters long' });
      }

      const users = getUsers();
      const normalizedEmail = email.trim().toLowerCase();

      // Duplicate Check
      const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (existingUser) {
        return sendJson(res, 409, { success: false, message: 'An account with this email already exists. Please log in.' });
      }

      // Password Salting and Hashing
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);

      const parsedAge = Math.min(Math.max(parseInt(age, 10) || 25, 12), 100);
      const parsedWeight = Math.min(Math.max(parseFloat(weight) || 68.5, 30.0), 300.0);
      const parsedHeight = Math.min(Math.max(parseFloat(height) || 175.0, 100.0), 250.0);
      const selectedFrequency = gymFrequency || '4-5 days/wk';
      const selectedGoal = goal || 'maintain';
      const targets = calculateNutritionTargets(parsedWeight, parsedHeight, parsedAge, selectedFrequency, selectedGoal);

      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: passwordHash,
        salt: salt,
        age: parsedAge,
        weight: parsedWeight,
        height: parsedHeight,
        gymFrequency: selectedFrequency,
        goal: targets.goal,
        nutritionTargets: targets,
        createdAt: Date.now()
      };

      users.push(newUser);
      saveUsers(users);

      // Create session
      const token = generateToken();
      activeSessions.set(token, {
        userId: newUser.id,
        email: newUser.email,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      console.log(`[API] Registered new user: ${newUser.name} (${newUser.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);

      return sendJson(res, 201, {
        success: true,
        message: 'Account created successfully',
        token: token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          age: newUser.age,
          weight: newUser.weight,
          height: newUser.height,
          gymFrequency: newUser.gymFrequency,
          goal: newUser.goal,
          nutritionTargets: newUser.nutritionTargets
        }
      });
    } catch (err) {
      console.error('[API] Register error:', err);
      return sendJson(res, 500, { success: false, message: 'Registration failed due to a server error' });
    }
  }

  // 2. POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Email and password are required' });
      }

      const users = getUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

      if (!user || !user.passwordHash || !user.salt) {
        return sendJson(res, 401, { success: false, message: 'Invalid email or password' });
      }

      const inputHash = hashPassword(password, user.salt);
      if (inputHash !== user.passwordHash) {
        return sendJson(res, 401, { success: false, message: 'Invalid email or password' });
      }

      // Generate Session Token
      const token = generateToken();
      activeSessions.set(token, {
        userId: user.id,
        email: user.email,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const effectiveGoal = user.goal || (user.nutritionTargets ? user.nutritionTargets.goal : 'maintain') || 'maintain';
      const freshTargets = calculateNutritionTargets(user.weight, user.height, user.age, user.gymFrequency, effectiveGoal);
      user.nutritionTargets = freshTargets;
      user.goal = effectiveGoal;
      saveUsers(users);

      return sendJson(res, 200, {
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture || '',
          age: user.age,
          weight: user.weight,
          height: user.height,
          gymFrequency: user.gymFrequency,
          goal: user.goal,
          nutritionTargets: user.nutritionTargets
        }
      });
    } catch (err) {
      console.error('[API] Login error:', err);
      return sendJson(res, 500, { success: false, message: 'Login failed due to a server error' });
    }
  }

  // 3. GET /api/auth/me (Current session)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token || !activeSessions.has(token)) {
      return sendJson(res, 401, { success: false, message: 'Unauthorized session' });
    }

    const session = activeSessions.get(token);
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return sendJson(res, 401, { success: false, message: 'Session expired' });
    }

    const users = getUsers();
    const user = users.find(u => u.id === session.userId);
    if (!user) {
      return sendJson(res, 404, { success: false, message: 'User not found' });
    }

    const effectiveGoal = user.goal || (user.nutritionTargets ? user.nutritionTargets.goal : 'maintain') || 'maintain';
    const freshTargets = calculateNutritionTargets(user.weight, user.height, user.age, user.gymFrequency, effectiveGoal);
    user.nutritionTargets = freshTargets;
    user.goal = effectiveGoal;

    return sendJson(res, 200, {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture || '',
        age: user.age,
        weight: user.weight,
        height: user.height,
        gymFrequency: user.gymFrequency,
        goal: user.goal,
        nutritionTargets: user.nutritionTargets
      }
    });
  }

  // 3b. POST or PUT /api/auth/profile/update (Update user's personal data & recalculate targets)
  if ((pathname === '/api/auth/profile/update' || pathname === '/api/auth/profile') && (req.method === 'POST' || req.method === 'PUT')) {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const body = await parseJsonBody(req);
      const { name, age, weight, height, gymFrequency, goal, email } = body;

      const users = getUsers();
      let user = null;

      if (token && activeSessions.has(token)) {
        const session = activeSessions.get(token);
        if (Date.now() <= session.expiresAt) {
          user = users.find(u => u.id === session.userId);
        }
      }

      if (!user && email && typeof email === 'string') {
        const normalizedEmail = email.trim().toLowerCase();
        user = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
      }

      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required to update profile' });
      }

      // Validate and update fields
      if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
          return sendJson(res, 400, { success: false, message: 'Full name cannot be blank' });
        }
        user.name = name.trim();
      }

      if (age !== undefined) {
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 100) {
          return sendJson(res, 400, { success: false, message: 'Age must be a valid number between 12 and 100' });
        }
        user.age = parsedAge;
      }

      if (weight !== undefined) {
        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
          return sendJson(res, 400, { success: false, message: 'Weight must be a valid number between 30 and 300 kg' });
        }
        user.weight = Math.round(parsedWeight * 10) / 10;
      }

      if (height !== undefined) {
        const parsedHeight = parseFloat(height);
        if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
          return sendJson(res, 400, { success: false, message: 'Height must be a valid number between 100 and 250 cm' });
        }
        user.height = Math.round(parsedHeight * 10) / 10;
      }

      if (gymFrequency !== undefined) {
        if (typeof gymFrequency === 'string' && gymFrequency.trim()) {
          let freq = gymFrequency.trim();
          if (!freq.includes('days')) freq += ' days/wk';
          user.gymFrequency = freq;
        }
      }

      if (goal !== undefined) {
        if (typeof goal === 'string' && goal.trim()) {
          const g = goal.trim().toLowerCase();
          if (g.includes('loss') || g === 'weight_loss' || g === 'cut') {
            user.goal = 'weight_loss';
          } else if (g.includes('gain') || g === 'weight_gain' || g === 'bulk') {
            user.goal = 'weight_gain';
          } else {
            user.goal = 'maintain';
          }
        }
      }

      // Recalculate Mifflin-St Jeor nutrition targets based on physical parameters and goal
      const targets = calculateNutritionTargets(user.weight, user.height, user.age, user.gymFrequency, user.goal);
      user.nutritionTargets = targets;
      user.goal = targets.goal;
      user.updatedAt = Date.now();

      saveUsers(users);
      console.log(`[API] Profile updated for user ${user.name} (${user.email}): Age=${user.age}, Weight=${user.weight}kg, Height=${user.height}cm, Gym=${user.gymFrequency}, Goal=${targets.goalLabel} -> Target: ${targets.targetCalories} kcal`);

      return sendJson(res, 200, {
        success: true,
        message: 'Personal data updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture || '',
          age: user.age,
          weight: user.weight,
          height: user.height,
          gymFrequency: user.gymFrequency,
          goal: user.goal || targets.goal,
          nutritionTargets: user.nutritionTargets,
          authProvider: user.authProvider || 'local'
        }
      });
    } catch (err) {
      console.error('[API] Profile update error:', err);
      return sendJson(res, 500, { success: false, message: 'Server error updating profile' });
    }
  }

  // 4. POST /api/auth/logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      activeSessions.delete(token);
    }
    return sendJson(res, 200, { success: true, message: 'Successfully logged out' });
  }

  // 5. GET /api/auth/google/config (Google OAuth 2.0 Client Configuration)
  if (pathname === '/api/auth/google/config' && req.method === 'GET') {
    const config = getGoogleConfig();
    return sendJson(res, 200, {
      success: true,
      clientId: config.clientId || '',
      setupStatus: config.setupStatus || (config.clientId ? 'configured' : 'pending_client_id'),
      authorizedOrigins: ['http://localhost:8080', 'http://127.0.0.1:8080'],
      redirectUri: config.redirectUri || 'http://localhost:8080/api/auth/google/callback',
      scopes: ['openid', 'email', 'profile'],
      authUri: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUri: 'https://oauth2.googleapis.com/token'
    });
  }

  // 5b. POST /api/auth/google/set-client-id (Save real Google Cloud Client ID)
  if (pathname === '/api/auth/google/set-client-id' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { clientId } = body;
      if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
        return sendJson(res, 400, { success: false, message: 'Google Client ID cannot be empty' });
      }

      const trimmedClientId = clientId.trim();
      const config = getGoogleConfig();
      config.clientId = trimmedClientId;
      config.setupStatus = 'configured';
      saveGoogleConfig(config);

      console.log(`[Google OAuth] Real Google Client ID saved: ${trimmedClientId}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Google Client ID successfully saved',
        config: {
          clientId: config.clientId,
          setupStatus: config.setupStatus
        }
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: 'Failed to update Google Client ID' });
    }
  }

  // 6. POST /api/auth/google/verify-token (Verify raw Google ID Token with Google OAuth API)
  if (pathname === '/api/auth/google/verify-token' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { idToken } = body;
      if (!idToken) {
        return sendJson(res, 400, { success: false, message: 'Google ID token is required' });
      }

      const verification = await verifyGoogleIdToken(idToken);
      if (!verification.valid) {
        return sendJson(res, 401, { success: false, message: 'Google token verification failed: ' + verification.error });
      }

      return sendJson(res, 200, {
        success: true,
        valid: true,
        payload: verification.payload
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: 'Internal error verifying Google token' });
    }
  }

  // 6c. POST /api/auth/google/check (Check if user exists and already completed physical profile)
  if (pathname === '/api/auth/google/check' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { email, idToken } = body;
      let targetEmail = email;

      if (idToken && typeof idToken === 'string') {
        const verification = await verifyGoogleIdToken(idToken);
        if (verification.valid && verification.payload && verification.payload.email) {
          targetEmail = verification.payload.email;
        }
      }

      if (!targetEmail) {
        return sendJson(res, 400, { success: false, message: 'Email or ID token required' });
      }

      const normalizedEmail = targetEmail.trim().toLowerCase();
      const users = getUsers();
      const user = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);

      if (user && user.age && user.weight && user.height) {
        const effectiveGoal = user.goal || (user.nutritionTargets ? user.nutritionTargets.goal : 'maintain') || 'maintain';
        const freshTargets = calculateNutritionTargets(user.weight, user.height, user.age, user.gymFrequency, effectiveGoal);
        user.nutritionTargets = freshTargets;
        user.goal = effectiveGoal;

        return sendJson(res, 200, {
          success: true,
          exists: true,
          hasProfile: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            age: user.age,
            weight: user.weight,
            height: user.height,
            gymFrequency: user.gymFrequency,
            goal: user.goal,
            nutritionTargets: user.nutritionTargets
          }
        });
      }

      return sendJson(res, 200, {
        success: true,
        exists: !!user,
        hasProfile: false
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: 'Error checking user profile status' });
    }
  }

  // 7. POST /api/auth/google (Google One-Tap / OAuth Sign-In & Sign-Up with Physical Metrics & Goal)
  if (pathname === '/api/auth/google' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      let { idToken, email, name, picture, googleId, age, weight, height, gymFrequency, goal } = body;

      // 1. If an idToken was passed (e.g. from real Google Sign-In SDK), verify it with Google's servers
      if (idToken && typeof idToken === 'string') {
        const verification = await verifyGoogleIdToken(idToken);
        if (!verification.valid) {
          console.warn('[API] Google ID token verification rejected:', verification.error);
          return sendJson(res, 401, {
            success: false,
            message: 'Invalid Google authentication token: ' + verification.error
          });
        }
        // Extract authentic verified claims from Google tokeninfo
        email = verification.payload.email;
        name = name || verification.payload.name;
        picture = picture || verification.payload.picture;
        googleId = verification.payload.googleId;
      }

      // 2. Validate email
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return sendJson(res, 400, { success: false, message: 'Valid Google email address is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const users = getUsers();
      let user = users.find(u => u.email.toLowerCase() === normalizedEmail);
      let isNewUser = false;

      // Parse & validate physical metrics and goal
      let targets = user ? user.nutritionTargets : null;
      let parsedAge = user ? user.age : null;
      let parsedWeight = user ? user.weight : null;
      let parsedHeight = user ? user.height : null;
      let selectedFrequency = user ? (user.gymFrequency || '4-5 days/wk') : '4-5 days/wk';
      let selectedGoal = goal || (user ? user.goal : 'maintain') || 'maintain';

      if (age !== undefined && weight !== undefined && height !== undefined) {
        parsedAge = Math.min(Math.max(parseInt(age, 10) || 25, 12), 100);
        parsedWeight = Math.min(Math.max(parseFloat(weight) || 68.5, 30.0), 300.0);
        parsedHeight = Math.min(Math.max(parseFloat(height) || 175.0, 100.0), 250.0);
        selectedFrequency = gymFrequency || (user ? user.gymFrequency : '4-5 days/wk') || '4-5 days/wk';
        selectedGoal = goal || (user ? user.goal : 'maintain') || 'maintain';
        targets = calculateNutritionTargets(parsedWeight, parsedHeight, parsedAge, selectedFrequency, selectedGoal);
      } else if (!user) {
        // Brand new user must have physical metrics provided
        return sendJson(res, 400, {
          success: false,
          message: 'Physical metrics (age, weight, height) are required to complete registration'
        });
      }

      if (!targets && parsedWeight && parsedHeight && parsedAge) {
        targets = calculateNutritionTargets(parsedWeight, parsedHeight, parsedAge, selectedFrequency, selectedGoal);
      } else if (user && parsedWeight && parsedHeight && parsedAge) {
        // Always refresh targets to match latest goal and weight
        targets = calculateNutritionTargets(parsedWeight, parsedHeight, parsedAge, selectedFrequency, selectedGoal);
      }

      if (!user) {
        // Register brand new user provisioned via Google
        isNewUser = true;
        const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : normalizedEmail.split('@')[0];

        user = {
          id: 'usr_g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          googleId: googleId || ('g_' + crypto.randomBytes(8).toString('hex')),
          name: displayName,
          email: normalizedEmail,
          authProvider: 'google',
          emailVerified: true,
          picture: picture || '',
          age: parsedAge,
          weight: parsedWeight,
          height: parsedHeight,
          gymFrequency: selectedFrequency,
          goal: targets.goal,
          nutritionTargets: targets,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        users.push(user);
        saveUsers(users);
        console.log(`[API] Registered new Google user: ${user.name} (${user.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);
      } else {
        // Update profile and metrics for existing user
        if (age !== undefined) user.age = parsedAge;
        if (weight !== undefined) user.weight = parsedWeight;
        if (height !== undefined) user.height = parsedHeight;
        if (gymFrequency) user.gymFrequency = selectedFrequency;
        if (goal) user.goal = targets.goal;
        if (name && typeof name === 'string' && name.trim()) user.name = name.trim();
        if (picture) user.picture = picture;
        if (googleId) user.googleId = googleId;
        user.authProvider = user.authProvider || 'google';
        user.emailVerified = true;
        user.nutritionTargets = targets;
        user.goal = targets.goal;
        user.updatedAt = Date.now();

        saveUsers(users);
        console.log(`[API] User authenticated via Google: ${user.name} (${user.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);
      }

      // Generate Session Token
      const token = generateToken();
      activeSessions.set(token, {
        userId: user.id,
        email: user.email,
        provider: 'google',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return sendJson(res, isNewUser ? 201 : 200, {
        success: true,
        message: isNewUser ? 'Google account created successfully' : 'Google sign-in successful',
        isNewUser: isNewUser,
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture || '',
          age: user.age,
          weight: user.weight,
          height: user.height,
          gymFrequency: user.gymFrequency,
          goal: user.goal || targets.goal,
          nutritionTargets: user.nutritionTargets,
          authProvider: 'google'
        }
      });
    } catch (err) {
      console.error('[API] Google auth error:', err);
      return sendJson(res, 500, { success: false, message: 'Google authentication failed due to a server error' });
    }
  }

  // 8. POST /api/auth/google/check (Check if Google user already exists)
  if (pathname === '/api/auth/google/check' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { email } = body;
      if (!email || typeof email !== 'string') {
        return sendJson(res, 400, { success: false, message: 'Email is required' });
      }
      const users = getUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
      return sendJson(res, 200, {
        success: true,
        exists: !!user,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture || '',
          age: user.age,
          weight: user.weight,
          height: user.height,
          gymFrequency: user.gymFrequency,
          nutritionTargets: user.nutritionTargets || calculateNutritionTargets(user.weight, user.height, user.age, user.gymFrequency),
          authProvider: user.authProvider || 'google'
        } : null
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: 'Check failed' });
    }
  }

  // 9. POST /api/auth/google/disconnect (Revoke Google session)
  if (pathname === '/api/auth/google/disconnect' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token && activeSessions.has(token)) {
      activeSessions.delete(token);
    }
    return sendJson(res, 200, { success: true, message: 'Google session successfully revoked' });
  }

  // ==================== STATIC ASSETS ====================
  return serveStaticFile(req, res);
});

server.listen(PORT, () => {
  console.log(`[FitTrack Server] Running at http://localhost:${PORT}`);
  console.log(`[FitTrack Server] Serving static preview from ${PREVIEW_DIR}`);
  console.log(`[FitTrack Server] Auth API available at /api/auth/*`);
});
