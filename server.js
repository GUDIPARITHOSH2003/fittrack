const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env configuration if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {
  console.warn('Could not read .env file:', e.message);
}

const db = require('./db/index.js');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const GOOGLE_CONFIG_FILE = path.join(__dirname, 'data', 'google-config.json');
const FAVORITES_FILE = path.join(__dirname, 'data', 'favorites.json');
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

// ==================== OPENROUTER AI CONFIGURATION ====================
const AI_CONFIG_FILE = path.join(__dirname, 'data', 'ai-config.json');

function getAiConfig() {
  try {
    if (!fs.existsSync(AI_CONFIG_FILE)) {
      const initial = {
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        updatedAt: Date.now()
      };
      fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const data = fs.readFileSync(AI_CONFIG_FILE, 'utf8');
    const config = JSON.parse(data || '{}');
    if (process.env.OPENROUTER_API_KEY && !config.apiKey) {
      config.apiKey = process.env.OPENROUTER_API_KEY;
    }
    return config;
  } catch (err) {
    return { apiKey: process.env.OPENROUTER_API_KEY || '', model: 'meta-llama/llama-3.2-3b-instruct:free' };
  }
}

function saveAiConfig(config) {
  try {
    config.updatedAt = Date.now();
    fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving AI config:', err);
    return false;
  }
}

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

async function callGeminiAi(apiKey, foodQuery, quantity, unit) {
  const systemPrompt = `You are a certified clinical sports dietitian and precise nutrition database AI.
The user provides a food name and portion (quantity & unit).
Calculate the realistic nutritional breakdown based on USDA FoodData Central and standard food composition data.
Respond strictly with valid JSON only matching this format:
{
  "name": "Standardized Food Name (e.g. Cooked Chicken Breast)",
  "portion": "${quantity} ${unit}",
  "calories": 248,
  "protein": 46.5,
  "carbs": 0.0,
  "fats": 5.4,
  "fiber": 0.0,
  "confidence": "high",
  "summary": "Short 1-line nutritional summary"
}`;

  const userPrompt = `Food: "${foodQuery}", Quantity: ${quantity || 100}, Unit: "${unit || 'g'}"`;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Google Gemini AI] Querying model ${model} for "${foodQuery}"...`);
      const bodyPayload = JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      });

      const responseText = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`Gemini HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Gemini timeout with model ${model}`));
        });
        req.write(bodyPayload);
        req.end();
      });

      const parsedRes = JSON.parse(responseText);
      const text = parsedRes?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response text from Gemini');

      let cleanJson = text.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) cleanJson = match[0];

      const nutritionData = JSON.parse(cleanJson);
      return {
        success: true,
        source: 'gemini',
        model: model,
        data: {
          name: nutritionData.name || foodQuery,
          portion: nutritionData.portion || `${quantity} ${unit}`,
          calories: Math.round(Number(nutritionData.calories) || 0),
          protein: Math.round((Number(nutritionData.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(nutritionData.carbs) || 0) * 10) / 10,
          fats: Math.round((Number(nutritionData.fats) || 0) * 10) / 10,
          fiber: Math.round((Number(nutritionData.fiber) || 0) * 10) / 10,
          confidence: nutritionData.confidence || 'high',
          summary: nutritionData.summary || `Calculated nutrition for ${quantity} ${unit} of ${foodQuery}`
        }
      };
    } catch (err) {
      console.warn(`[Google Gemini AI] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

async function callGeminiVision(apiKey, imageBase64, mimeType = 'image/jpeg') {
  // Strip data URL prefix if present
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }
  cleanBase64 = cleanBase64.trim();

  const systemPrompt = `You are an expert clinical sports dietitian and food recognition AI.
Examine this photo carefully.
1. Determine if this image contains any edible food, meal, grocery ingredient, dish, or beverage.
2. If it is NOT food (e.g. empty plate, table, person, pet, screen, household object, or completely unrecognizable/blurry), output strictly JSON:
{
  "isFood": false,
  "error": "No recognizable food detected in this photo. Please take a clear picture of your meal."
}
3. If it IS food:
- Identify the specific dish or food item(s) (e.g. 'Grilled Salmon with Brown Rice and Broccoli', 'Chicken Caesar Salad', 'Banana Oatmeal Bowl').
- Estimate the realistic portion size based on visual plate proportions (e.g. '1 bowl (300g)', '1 plate (350g)', '2 slices (120g)').
- Calculate total realistic nutritional breakdown based on USDA FoodData Central.
- Return strictly valid JSON:
{
  "isFood": true,
  "name": "Standardized Dish or Food Name",
  "portion": "Estimated Portion (e.g. 300g serving)",
  "calories": 420,
  "protein": 34.0,
  "carbs": 45.0,
  "fats": 12.0,
  "fiber": 5.0,
  "confidence": "high",
  "summary": "Short 1-line nutritional summary of the meal and ingredients"
}`;

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Google Gemini Vision] Analyzing food photo with ${model}...`);
      const bodyPayload = JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64
                }
              },
              { text: systemPrompt }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      });

      const responseText = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`Gemini Vision HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Gemini Vision timeout with model ${model}`));
        });
        req.write(bodyPayload);
        req.end();
      });

      const parsedRes = JSON.parse(responseText);
      const textPart = parsedRes?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPart) throw new Error('Empty response from Gemini Vision');

      let cleanJson = textPart.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) cleanJson = match[0];

      const json = JSON.parse(cleanJson);
      if (json.isFood === false) {
        return { isFood: false, error: json.error || "No recognizable food detected in this photo." };
      }

      return {
        isFood: true,
        source: 'gemini_vision',
        model: model,
        data: {
          name: json.name || 'Recognized Meal',
          portion: json.portion || '1 serving',
          calories: Math.max(0, Math.round(Number(json.calories) || 0)),
          protein: Math.max(0, Math.round((Number(json.protein) || 0) * 10) / 10),
          carbs: Math.max(0, Math.round((Number(json.carbs) || 0) * 10) / 10),
          fats: Math.max(0, Math.round((Number(json.fats) || 0) * 10) / 10),
          fiber: Math.max(0, Math.round((Number(json.fiber) || 0) * 10) / 10),
          confidence: json.confidence || 'high',
          summary: json.summary || `AI estimated nutrition from camera photo`
        }
      };
    } catch (err) {
      console.warn(`[Google Gemini Vision] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini Vision models failed');
}

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
];

async function callOpenRouterAi(apiKey, foodQuery, quantity, unit, requestedModel) {
  const modelsToTry = [
    requestedModel || 'meta-llama/llama-3.2-3b-instruct:free',
    ...OPENROUTER_FREE_MODELS.filter(m => m !== requestedModel)
  ];

  const systemPrompt = `You are a certified clinical sports dietitian and precise nutrition database AI.
The user will provide a food name and portion (quantity & unit).
Calculate the realistic nutritional breakdown based on USDA FoodData Central and standard food composition data.
You MUST output ONLY a valid JSON object with NO markdown tags (no \`\`\` or \`\`\`json), NO code blocks, and NO explanatory text.
JSON format:
{
  "name": "Standardized Food Name (e.g. Cooked Chicken Breast)",
  "portion": "e.g. 150g",
  "calories": 248,
  "protein": 46.5,
  "carbs": 0.0,
  "fats": 5.4,
  "fiber": 0.0,
  "confidence": "high",
  "summary": "Short 1-line nutritional summary"
}`;

  const userPrompt = `Food: "${foodQuery}", Quantity: ${quantity || 100}, Unit: "${unit || 'g'}"`;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[OpenRouter AI] Calling model ${model} for food: "${foodQuery}"...`);
      const bodyPayload = JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      const responseText = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'openrouter.ai',
          path: '/api/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey.trim(),
            'HTTP-Referer': 'https://fittrack-m87l.onrender.com',
            'X-Title': 'FitTrack AI Nutrition'
          },
          timeout: 12000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`OpenRouter HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`OpenRouter timeout with model ${model}`));
        });
        req.write(bodyPayload);
        req.end();
      });

      const parsedRes = JSON.parse(responseText);
      const content = parsedRes?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response content from OpenRouter');
      }

      let cleanJson = content.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) cleanJson = match[0];

      const nutritionData = JSON.parse(cleanJson);

      const result = {
        name: nutritionData.name || foodQuery,
        portion: nutritionData.portion || `${quantity} ${unit}`,
        calories: Math.max(0, Math.round(Number(nutritionData.calories) || 0)),
        protein: Math.max(0, Math.round((Number(nutritionData.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(nutritionData.carbs) || 0) * 10) / 10),
        fats: Math.max(0, Math.round((Number(nutritionData.fats) || Number(nutritionData.fat) || 0) * 10) / 10),
        fiber: Math.max(0, Math.round((Number(nutritionData.fiber) || 0) * 10) / 10),
        confidence: nutritionData.confidence || 'high',
        summary: nutritionData.summary || 'Estimated by OpenRouter AI'
      };

      console.log(`[OpenRouter AI] Success with ${model}: ${result.name} - ${result.calories} kcal`);
      return { success: true, source: 'openrouter', model: model, data: result };
    } catch (err) {
      console.warn(`[OpenRouter AI] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
}

function calculateLocalSmartNutrition(rawName, qty, unit) {
  const q = (rawName || '').trim().toLowerCase();
  const quantity = parseFloat(qty) || 100;
  const u = (unit || 'g').toLowerCase();

  const db = [
    { keys: ['chicken breast', 'chicken', 'grilled chicken'], cal100: 165, p: 31, c: 0, f: 3.6, fib: 0, name: 'Chicken Breast (Cooked)' },
    { keys: ['egg white', 'egg whites'], calPcs: 17, p: 3.6, c: 0.2, f: 0.1, fib: 0, name: 'Egg Whites' },
    { keys: ['egg', 'eggs', 'boiled egg'], calPcs: 72, p: 6.3, c: 0.4, f: 4.8, fib: 0, name: 'Whole Egg' },
    { keys: ['oat', 'oats', 'oatmeal', 'rolled oats'], cal100: 389, p: 16.9, c: 66.3, f: 6.9, fib: 10.6, name: 'Rolled Oats' },
    { keys: ['rice', 'white rice'], cal100: 130, p: 2.7, c: 28.2, f: 0.3, fib: 0.4, name: 'Cooked White Rice' },
    { keys: ['brown rice'], cal100: 111, p: 2.6, c: 23.0, f: 0.9, fib: 1.8, name: 'Cooked Brown Rice' },
    { keys: ['salmon', 'salmon fillet'], cal100: 206, p: 22.1, c: 0, f: 12.3, fib: 0, name: 'Atlantic Salmon' },
    { keys: ['banana'], calPcs: 105, p: 1.3, c: 27.0, f: 0.3, fib: 3.1, name: 'Fresh Banana' },
    { keys: ['apple'], calPcs: 95, p: 0.5, c: 25.0, f: 0.3, fib: 4.4, name: 'Fresh Apple' },
    { keys: ['whey', 'protein powder'], cal100: 380, p: 75, c: 8, f: 4, fib: 1, name: 'Whey Protein Powder' },
    { keys: ['greek yogurt', 'yogurt'], cal100: 97, p: 10.0, c: 3.9, f: 5.0, fib: 0, name: 'Greek Yogurt' },
    { keys: ['peanut butter'], cal100: 588, p: 25.1, c: 20.0, f: 50.4, fib: 6.0, name: 'Peanut Butter' },
    { keys: ['potato', 'potatoes', 'boiled potato'], cal100: 87, p: 1.9, c: 20.1, f: 0.1, fib: 1.8, name: 'Boiled Potato' },
    { keys: ['sweet potato'], cal100: 86, p: 1.6, c: 20.1, f: 0.1, fib: 3.0, name: 'Cooked Sweet Potato' },
    { keys: ['avocado'], cal100: 160, p: 2.0, c: 8.5, f: 14.7, fib: 6.7, name: 'Fresh Avocado' },
    { keys: ['beef', 'steak', 'ground beef'], cal100: 250, p: 26.0, c: 0, f: 15.0, fib: 0, name: 'Lean Beef (Cooked)' },
    { keys: ['tuna', 'canned tuna'], cal100: 132, p: 28.0, c: 0, f: 1.0, fib: 0, name: 'Canned Tuna in Water' },
    { keys: ['bread', 'whole wheat bread'], calPcs: 80, cal100: 265, p: 9.0, c: 49.0, f: 3.2, fib: 6.0, name: 'Whole Wheat Bread' },
    { keys: ['milk'], cal100: 50, p: 3.4, c: 5.0, f: 2.0, fib: 0, name: 'Cow Milk' },
    { keys: ['almond', 'almonds'], cal100: 579, p: 21.2, c: 21.6, f: 49.9, fib: 12.5, name: 'Raw Almonds' }
  ];

  let match = db.find(item => item.keys.some(k => q === k || q.includes(k) || k.includes(q)));
  if (!match) {
    match = { cal100: 180, p: 12, c: 20, f: 5, fib: 2, name: rawName.charAt(0).toUpperCase() + rawName.slice(1) };
  }

  let factor = 1.0;
  if (match.calPcs && (u === 'pcs' || u === 'pieces' || u === 'item' || u === 'items')) {
    factor = quantity;
    return {
      name: match.name,
      portion: `${quantity} ${u}`,
      calories: Math.round(match.calPcs * factor),
      protein: Math.round((typeof match.p === 'number' ? match.p : 12) * factor * 10) / 10,
      carbs: Math.round((typeof match.c === 'number' ? match.c : 20) * factor * 10) / 10,
      fats: Math.round((typeof match.f === 'number' ? match.f : 5) * factor * 10) / 10,
      fiber: Math.round((typeof match.fib === 'number' ? match.fib : 2) * factor * 10) / 10,
      confidence: 'medium',
      summary: 'Calculated from clinical nutrition database'
    };
  }

  if (u === 'g') factor = quantity / 100;
  else if (u === 'oz') factor = (quantity * 28.35) / 100;
  else if (u === 'cup') factor = (quantity * 160) / 100;
  else if (u === 'tbsp') factor = (quantity * 15) / 100;
  else factor = quantity / 100;

  const baseCal = match.cal100 || (match.calPcs ? match.calPcs * 1.4 : 180);
  return {
    name: match.name,
    portion: `${quantity} ${u}`,
    calories: Math.round(baseCal * factor),
    protein: Math.round((typeof match.p === 'number' ? match.p : 12) * factor * 10) / 10,
    carbs: Math.round((typeof match.c === 'number' ? match.c : 20) * factor * 10) / 10,
    fats: Math.round((typeof match.f === 'number' ? match.f : 5) * factor * 10) / 10,
    fiber: Math.round((typeof match.fib === 'number' ? match.fib : 2) * factor * 10) / 10,
    confidence: 'medium',
    summary: 'Calculated from clinical nutrition database'
  };
}

async function callGeminiNlpMeal(apiKey, text) {
  const systemPrompt = `You are a certified clinical sports dietitian and precise meal logging parser.
The user enters natural language to log food or a meal (e.g. "chicken breast with quantity of 100gm", "2 boiled eggs and toast", "banana", "chicken breast", "asdfghjk").

Rules:
1. If the input is nonsense, gibberish (e.g. "asdfgh", "zxcv", "qweqwe"), greeting, non-food object, or unrecognizable as food, respond ONLY with:
{
  "isFood": false,
  "error": "Please enter a valid food or meal name (e.g. '100g chicken breast' or '2 boiled eggs')."
}
2. If it IS an edible food, drink, or meal:
- Extract or standardize the food name.
- If the user specified a quantity and unit, calculate based on that portion.
- IF THE USER ONLY ENTERED THE FOOD NAME WITHOUT A QUANTITY (e.g. "chicken breast" or "white rice"), DEFAULT TO 100g (or 1 item/piece for whole foods like banana, egg, apple).
- Calculate realistic calories, protein, carbs, fats, fiber based on USDA data.
- Return strictly valid JSON:
{
  "isFood": true,
  "name": "Standardized Food Name (e.g. Cooked Chicken Breast)",
  "portion": "100g",
  "calories": 165,
  "protein": 31.0,
  "carbs": 0.0,
  "fats": 3.6,
  "fiber": 0.0,
  "confidence": "high",
  "summary": "Short 1-line nutritional summary"
}`;

  const userPrompt = `Input: "${text}"`;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Google Gemini NLP] Querying model ${model} for "${text}"...`);
      const bodyPayload = JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      });

      const responseText = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`Gemini HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Gemini timeout with model ${model}`));
        });
        req.write(bodyPayload);
        req.end();
      });

      const parsedRes = JSON.parse(responseText);
      const textPart = parsedRes?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPart) throw new Error('Empty response from Gemini');

      let cleanJson = textPart.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) cleanJson = match[0];

      const json = JSON.parse(cleanJson);
      if (json.isFood === false) {
        return { isFood: false, error: json.error || "Please enter a valid food or meal name (e.g. '100g chicken breast')." };
      }

      return {
        isFood: true,
        source: 'gemini',
        model: model,
        data: {
          name: json.name || text,
          portion: json.portion || '100g',
          calories: Math.round(Number(json.calories) || 0),
          protein: Math.round((Number(json.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(json.carbs) || 0) * 10) / 10,
          fats: Math.round((Number(json.fats) || 0) * 10) / 10,
          fiber: Math.round((Number(json.fiber) || 0) * 10) / 10,
          confidence: json.confidence || 'high',
          summary: json.summary || `AI estimated nutrition for ${json.name || text}`
        }
      };
    } catch (err) {
      console.warn(`[Google Gemini NLP] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini NLP models failed');
}

function parseMealTextLocal(text) {
  if (!text || typeof text !== 'string') {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }
  const clean = text.trim();
  if (clean.length < 2) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }

  // Check for non-food / greeting / random words
  const words = clean.toLowerCase().split(/\s+/);
  const nonFoodKeywords = ['hi', 'hello', 'hey', 'test', 'asdf', 'qwer', 'zxcv', 'laptop', 'phone', 'car', 'bike', 'tv', 'watch', 'book', 'game', 'play', 'movie'];
  if (words.some(w => nonFoodKeywords.includes(w))) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }

  const alphaOnly = clean.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length < 2) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }
  if (alphaOnly.length >= 3 && !/[aeiouy]/i.test(alphaOnly)) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(alphaOnly)) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }

  // Extract quantity and unit
  let qty = null;
  let unit = null;
  let foodName = clean;

  const qtyUnitRegex = /(?:quantity\s*(?:of\s*)?)?(\d+(?:\.\d+)?)\s*(gm|g|grams?|kg|oz|cups?|tbsp|pcs?|pieces?|items?|slices?|servings?)?/i;
  const match = clean.match(qtyUnitRegex);
  if (match && match[1]) {
    qty = parseFloat(match[1]);
    const rawUnit = (match[2] || '').toLowerCase();
    if (rawUnit.startsWith('g')) unit = 'g';
    else if (rawUnit === 'kg') { qty = qty * 1000; unit = 'g'; }
    else if (rawUnit.startsWith('oz')) unit = 'oz';
    else if (rawUnit.startsWith('cup')) unit = 'cup';
    else if (rawUnit.startsWith('tbsp')) unit = 'tbsp';
    else if (rawUnit.startsWith('pc') || rawUnit.startsWith('item') || rawUnit.startsWith('slice') || rawUnit.startsWith('serving')) unit = 'pcs';

    foodName = clean.replace(match[0], '').replace(/\b(with|quantity|of|in|and|portion)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  if (!foodName) foodName = clean;
  const foodLetters = foodName.replace(/[^a-zA-Z]/g, '');
  if (foodLetters.length < 2) {
    return { isFood: false, error: 'Please enter a valid food or meal name (e.g. "100g chicken breast" or "2 boiled eggs").' };
  }

  // If user only entered item name (no quantity), default to 100g (or 1 piece for whole fruits/eggs)
  if (!qty || isNaN(qty)) {
    const isPcsFood = /(banana|apple|egg|orange|toast|bread|cookie|burger|pizza|roti|chapati)/i.test(foodName);
    qty = isPcsFood ? 1 : 100;
    if (!unit) unit = isPcsFood ? 'pcs' : 'g';
  } else if (!unit) {
    const isPcsFood = /(banana|apple|egg|orange|toast|bread|cookie|burger|pizza|roti|chapati)/i.test(foodName);
    unit = isPcsFood ? 'pcs' : 'g';
  }

  const nutrients = calculateLocalSmartNutrition(foodName, qty, unit);
  return {
    isFood: true,
    source: 'smart_database',
    data: nutrients
  };
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
  const freq = String(gymFrequency || '').toLowerCase();
  if (freq.includes('6') || freq.includes('7') || freq.includes('athlete')) {
    multiplier = 1.725;
  } else if (freq.includes('4') || freq.includes('5') || freq.includes('active')) {
    multiplier = 1.55;
  } else if (freq.includes('2') || freq.includes('3') || freq.includes('moderate')) {
    multiplier = 1.375;
  } else {
    multiplier = 1.2; // 0-1 days / sedentary
  }

  const maintenanceCalories = Math.round(bmr * multiplier);

  // Goal-based Calorie Adjustments:
  // - Weight Loss: 500 kcal deficit (or ~20% deficit, safe minimum 1200 kcal)
  // - Weight Gain: 500 kcal surplus (lean bulk)
  // - Maintain: 0 kcal adjustment (maintenance)
  const normGoal = String(goal || 'maintain').toLowerCase();
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
    targetFiber: Math.max(28, Math.round((targetCalories / 1000) * 14)),
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

// Favorites persistence helpers
function getFavoritesMap() {
  try {
    if (!fs.existsSync(FAVORITES_FILE)) {
      fs.writeFileSync(FAVORITES_FILE, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const data = fs.readFileSync(FAVORITES_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('Error reading favorites file:', err);
    return {};
  }
}

function saveFavoritesMap(map) {
  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(map, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving favorites file:', err);
    return false;
  }
}

function getUserFavorites(userKey) {
  const map = getFavoritesMap();
  const normalizedKey = (userKey || 'default').toLowerCase().trim();
  return map[normalizedKey] || [];
}

// Helper to parse JSON request bodies
function parseJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

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

      const normalizedEmail = email.trim().toLowerCase();

      // Duplicate Check via DB
      const existingUser = await db.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return sendJson(res, 409, { success: false, message: 'An account with this email already exists. Please log in.' });
      }

      // Password Salting and Hashing
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);

      const parsedAge = Math.min(Math.max(parseInt(age, 10) || 25, 12), 100);
      const parsedWeight = Math.min(Math.max(parseFloat(weight) || 68.5, 30.0), 300.0);
      const parsedHeight = Math.min(Math.max(parseFloat(height) || 175.0, 100.0), 250.0);
      const selectedFrequency = String(gymFrequency || '4-5 days/wk');
      const selectedGoal = String(goal || 'maintain');
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

      const savedUser = await db.createUser(newUser);

      // Create session
      const token = generateToken();
      activeSessions.set(token, {
        userId: savedUser.id,
        email: savedUser.email,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      console.log(`[API] Registered new user in DB: ${savedUser.name} (${savedUser.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);

      return sendJson(res, 201, {
        success: true,
        message: 'Account created successfully',
        token: token,
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          age: savedUser.age,
          weight: savedUser.weight,
          height: savedUser.height,
          gymFrequency: savedUser.gymFrequency,
          goal: savedUser.goal,
          nutritionTargets: savedUser.nutritionTargets
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

      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.getUserByEmail(normalizedEmail);

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
      await db.updateUserProfile(user.id, {
        weight: user.weight,
        height: user.height,
        age: user.age,
        gymFrequency: user.gymFrequency,
        goal: effectiveGoal,
        nutritionTargets: freshTargets
      });

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

  async function getAuthenticatedUser(req, queryParams = {}) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token);
      if (Date.now() <= session.expiresAt) {
        const user = await db.getUserById(session.userId);
        if (user) return user;
      }
    }
    const emailParam = queryParams.email || req.headers['x-user-email'];
    if (emailParam && typeof emailParam === 'string' && emailParam.trim()) {
      const user = await db.getUserByEmail(emailParam.trim());
      if (user) return user;
    }
    return null;
  }

  // 3. GET /api/auth/me (Current session)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = await getAuthenticatedUser(req, query);
    if (!user) {
      return sendJson(res, 401, { success: false, message: 'Unauthorized session' });
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
      const body = await parseJsonBody(req);
      const { name, age, weight, height, gymFrequency, goal, email } = body;

      const user = await getAuthenticatedUser(req, { email });
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required to update profile' });
      }

      // Validate and update fields
      let newName = user.name;
      let newAge = user.age;
      let newWeight = user.weight;
      let newHeight = user.height;
      let newFrequency = user.gymFrequency;
      let newGoal = user.goal;

      if (name !== undefined && typeof name === 'string' && name.trim()) {
        newName = name.trim();
      }
      if (age !== undefined) {
        const parsedAge = parseInt(age, 10);
        if (!isNaN(parsedAge) && parsedAge >= 12 && parsedAge <= 100) newAge = parsedAge;
      }
      if (weight !== undefined) {
        const parsedWeight = parseFloat(weight);
        if (!isNaN(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 300) newWeight = Math.round(parsedWeight * 10) / 10;
      }
      if (height !== undefined) {
        const parsedHeight = parseFloat(height);
        if (!isNaN(parsedHeight) && parsedHeight >= 100 && parsedHeight <= 250) newHeight = Math.round(parsedHeight * 10) / 10;
      }
      if (gymFrequency !== undefined && typeof gymFrequency === 'string' && gymFrequency.trim()) {
        let freq = gymFrequency.trim();
        if (!freq.includes('days')) freq += ' days/wk';
        newFrequency = freq;
      }
      if (goal !== undefined && typeof goal === 'string' && goal.trim()) {
        const g = goal.trim().toLowerCase();
        if (g.includes('loss') || g === 'weight_loss' || g === 'cut') newGoal = 'weight_loss';
        else if (g.includes('gain') || g === 'weight_gain' || g === 'bulk') newGoal = 'weight_gain';
        else newGoal = 'maintain';
      }

      const targets = calculateNutritionTargets(newWeight, newHeight, newAge, newFrequency, newGoal);
      await db.updateUserProfile(user.id, {
        weight: newWeight,
        height: newHeight,
        age: newAge,
        gymFrequency: newFrequency,
        goal: targets.goal,
        nutritionTargets: targets
      });

      console.log(`[API] Profile updated in DB for user ${user.name} (${user.email}): Age=${newAge}, Weight=${newWeight}kg, Target=${targets.targetCalories} kcal`);

      return sendJson(res, 200, {
        success: true,
        message: 'Personal data updated successfully',
        user: {
          id: user.id,
          name: newName,
          email: user.email,
          picture: user.picture || '',
          age: newAge,
          weight: newWeight,
          height: newHeight,
          gymFrequency: newFrequency,
          goal: targets.goal,
          nutritionTargets: targets
        }
      });
    } catch (err) {
      console.error('[API] Error updating profile:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to update personal data' });
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
      let user = await db.getUserByEmail(normalizedEmail);
      if (!user) {
        const users = getUsers();
        user = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
      }

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
      let user = await db.getUserByEmail(normalizedEmail);
      if (!user && googleId) {
        user = await db.getUserByGoogleId(googleId);
      }
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
        selectedFrequency = String(gymFrequency || (user ? user.gymFrequency : '4-5 days/wk') || '4-5 days/wk');
        selectedGoal = String(goal || (user ? user.goal : 'maintain') || 'maintain');
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
        // Register brand new user provisioned via Google in DB
        isNewUser = true;
        const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : normalizedEmail.split('@')[0];

        user = await db.createUser({
          id: 'usr_g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          googleId: googleId || ('g_' + crypto.randomBytes(8).toString('hex')),
          name: displayName,
          email: normalizedEmail,
          picture: picture || '',
          age: parsedAge,
          weight: parsedWeight,
          height: parsedHeight,
          gymFrequency: selectedFrequency,
          goal: targets.goal,
          nutritionTargets: targets
        });
        console.log(`[API] Registered new Google user in DB: ${user.name} (${user.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);
      } else {
        // Update profile and metrics for existing user in DB
        if (googleId && !user.googleId) {
          await db.linkGoogleAccount(user.id, googleId);
        }
        user = await db.updateUserProfile(user.id, {
          weight: parsedWeight || user.weight,
          height: parsedHeight || user.height,
          age: parsedAge || user.age,
          gymFrequency: selectedFrequency,
          goal: targets.goal,
          nutritionTargets: targets
        }) || user;
        console.log(`[API] User authenticated via Google in DB: ${user.name} (${user.email}) | Goal: ${targets.goalLabel} | Target: ${targets.targetCalories} kcal`);
      }

      // Keep local users.json in sync with DB
      try {
        const localUsers = getUsers();
        const existingIdx = localUsers.findIndex(u => u.email && u.email.toLowerCase() === normalizedEmail);
        if (existingIdx !== -1) {
          localUsers[existingIdx] = { ...localUsers[existingIdx], ...user };
        } else {
          localUsers.push(user);
        }
        saveUsers(localUsers);
      } catch (syncErr) {
        console.warn('Could not sync user to users.json:', syncErr);
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

  // 9. POST /api/auth/google/disconnect (Revoke Google session)
  if (pathname === '/api/auth/google/disconnect' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token && activeSessions.has(token)) {
      activeSessions.delete(token);
    }
    return sendJson(res, 200, { success: true, message: 'Google session successfully revoked' });
  }

  // ==================== 10. FAVORITES / FAVOURITES API ====================
  const isFavoritesRoute = pathname === '/api/favorites' || pathname === '/api/favourites';
  const isFavoritesIdRoute = pathname.startsWith('/api/favorites/') || pathname.startsWith('/api/favourites/');

  // 10a. GET /api/favorites (Fetch all favourites for user)
  if (isFavoritesRoute && req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, query);
      const userKey = user ? user.id : (query.email ? query.email.toLowerCase().trim() : 'default');
      const favorites = await db.getFavorites(userKey);
      return sendJson(res, 200, {
        success: true,
        user: userKey,
        count: favorites.length,
        favorites
      });
    } catch (err) {
      console.error('Error in GET /api/favorites:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to fetch favourites' });
    }
  }

  // 10b. POST /api/favorites (Add food item to favourites)
  if (isFavoritesRoute && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { name, calories, protein, carbs, fats, portion, mealType, email } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return sendJson(res, 400, { success: false, message: 'Food item name is required' });
      }

      const user = await getAuthenticatedUser(req, { email });
      const userKey = user ? user.id : (email ? email.toLowerCase().trim() : 'default');

      const newFavorite = await db.addFavorite(userKey, {
        name: name.trim(),
        portion: (portion || '1 serving').trim(),
        calories: Math.max(parseInt(calories, 10) || 0, 0),
        protein: Math.max(parseFloat(protein) || 0, 0),
        carbs: Math.max(parseFloat(carbs) || 0, 0),
        fat: Math.max(parseFloat(fats) || 0, 0),
        mealType: mealType || 'snack'
      });

      console.log(`[API] Added favourite in DB: "${newFavorite.name}" (${newFavorite.calories} kcal) for user ${userKey}`);
      const updatedList = await db.getFavorites(userKey);
      return sendJson(res, 201, {
        success: true,
        message: `"${newFavorite.name}" added to favourites`,
        favorite: newFavorite,
        favorites: updatedList
      });
    } catch (err) {
      console.error('Error in POST /api/favorites:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to add favourite' });
    }
  }

  // 10c. DELETE /api/favorites/:id or POST /api/favorites/delete (Remove from favourites)
  if ((isFavoritesIdRoute && req.method === 'DELETE') || 
      ((pathname === '/api/favorites/delete' || pathname === '/api/favourites/delete') && req.method === 'POST') ||
      (isFavoritesRoute && req.method === 'DELETE')) {
    try {
      let favId = '';
      let emailParam = '';
      if (isFavoritesIdRoute) {
        const parts = pathname.split('/');
        favId = parts[parts.length - 1];
      }
      if (!favId && query.id) {
        favId = query.id;
      }
      if (req.method === 'POST' || !favId) {
        const body = await parseJsonBody(req);
        if (body.id) favId = body.id;
        if (body.email) emailParam = body.email;
      }

      if (!favId) {
        return sendJson(res, 400, { success: false, message: 'Favourite ID is required' });
      }

      const user = await getAuthenticatedUser(req, { email: emailParam });
      const userKey = user ? user.id : (emailParam ? emailParam.toLowerCase().trim() : 'default');

      await db.deleteFavorite(userKey, favId);
      console.log(`[API] Removed favourite ${favId} in DB for user ${userKey}`);
      const updatedList = await db.getFavorites(userKey);

      return sendJson(res, 200, {
        success: true,
        message: 'Favourite removed',
        id: favId,
        favorites: updatedList
      });
    } catch (err) {
      console.error('Error deleting favourite:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to delete favourite' });
    }
  }

  // ==================== 11. DAILY LOGS & CLOUD SYNC API ====================
  // 11a. GET /api/logs/daily (Fetch meals, hydration, burned calories, workout sets for date)
  if (pathname === '/api/logs/daily' && req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, query);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required' });
      }
      const dateStr = query.date || new Date().toISOString().slice(0, 10);
      const log = await db.getDailyLog(user.id, dateStr);
      return sendJson(res, 200, { success: true, date: dateStr, log: log || null });
    } catch (err) {
      console.error('[API] Error fetching daily log:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to fetch daily log' });
    }
  }

  // 11b. POST /api/logs/daily (Upsert meals, hydration, burned calories, workout sets for date)
  if (pathname === '/api/logs/daily' && req.method === 'POST') {
    try {
      const user = await getAuthenticatedUser(req, query);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required' });
      }
      const body = await parseJsonBody(req);
      const dateStr = body.date || query.date || new Date().toISOString().slice(0, 10);
      const savedLog = await db.upsertDailyLog(user.id, dateStr, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Daily tracking synced to database',
        log: savedLog
      });
    } catch (err) {
      console.error('[API] Error syncing daily log:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to sync daily tracking' });
    }
  }

  // 11c. GET /api/logs/history (Weekly or date-range history)
  if (pathname === '/api/logs/history' && req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, query);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required' });
      }
      const { start, end } = query;
      const history = await db.getWeeklyHistory(user.id, start || '2000-01-01', end || '2099-12-31');
      return sendJson(res, 200, { success: true, history: history || [] });
    } catch (err) {
      console.error('[API] Error fetching history:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to fetch history' });
    }
  }

  // ==================== 11d. WEEKLY FOOD PHOTO DIARY API ====================
  function getIsoWeekId(date = new Date(), offsetWeeks = 0) {
    const d = new Date(date);
    if (offsetWeeks) {
      d.setDate(d.getDate() + (offsetWeeks * 7));
    }
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  // 11d-1. GET /api/weekly-diary (Fetch all meals grouped by day for specified or current week)
  if (pathname === '/api/weekly-diary' && req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, query);
      const userEmail = user ? user.email : (query.email ? query.email.toLowerCase().trim() : 'guest@fittrack.local');
      const offset = parseInt(query.offset || '0', 10) || 0;
      const weekId = (query.weekId && query.weekId.trim()) || getIsoWeekId(new Date(), offset);

      const mealsList = await db.getWeeklyMeals(userEmail, weekId);
      const grouped = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

      mealsList.forEach(m => {
        const d = (m.day || 'mon').toLowerCase().trim();
        if (grouped[d]) {
          grouped[d].push(m);
        } else {
          grouped[d] = [m];
        }
      });

      return sendJson(res, 200, {
        success: true,
        weekId,
        userEmail,
        totalMeals: mealsList.length,
        meals: grouped
      });
    } catch (err) {
      console.error('[API] Error in GET /api/weekly-diary:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to fetch weekly diary' });
    }
  }

  // 11d-2. POST /api/weekly-diary (Add food meal photo to weekly diary)
  if (pathname === '/api/weekly-diary' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req, 10 * 1024 * 1024);
      const user = await getAuthenticatedUser(req, body);
      const userEmail = user ? user.email : (body.email ? body.email.toLowerCase().trim() : 'guest@fittrack.local');
      const weekId = (body.weekId && body.weekId.trim()) || getIsoWeekId();

      const mealData = {
        id: body.id,
        userEmail,
        weekId,
        day: body.day || 'mon',
        title: body.title || 'Meal Photo',
        mealSlot: body.mealSlot || 'Lunch',
        time: body.time || '',
        calories: parseInt(body.calories, 10) || 0,
        isCheat: Boolean(body.isCheat),
        notes: body.notes || '',
        img: body.img || '',
        createdAt: body.createdAt || Date.now()
      };

      const savedMeal = await db.addWeeklyMeal(mealData);
      console.log(`[API] Saved weekly meal "${savedMeal.title}" (${savedMeal.day}) for ${userEmail}`);

      return sendJson(res, 201, {
        success: true,
        message: 'Meal photo logged to diary successfully',
        meal: savedMeal
      });
    } catch (err) {
      console.error('[API] Error in POST /api/weekly-diary:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to add meal photo to diary' });
    }
  }

  // 11d-3. DELETE /api/weekly-diary (Delete meal photo)
  if ((pathname === '/api/weekly-diary' || pathname.startsWith('/api/weekly-diary/')) && req.method === 'DELETE') {
    try {
      let mealId = query.id;
      if (!mealId && pathname.startsWith('/api/weekly-diary/')) {
        const parts = pathname.split('/');
        mealId = parts[3];
      }
      let emailParam = query.email;
      if (!mealId) {
        const body = await parseJsonBody(req).catch(() => ({}));
        mealId = body.id;
        if (body.email) emailParam = body.email;
      }

      if (!mealId) {
        return sendJson(res, 400, { success: false, message: 'Meal ID is required' });
      }

      const user = await getAuthenticatedUser(req, { email: emailParam });
      const userEmail = user ? user.email : (emailParam ? emailParam.toLowerCase().trim() : 'guest@fittrack.local');

      const deleted = await db.deleteWeeklyMeal(mealId, userEmail);
      return sendJson(res, 200, {
        success: true,
        deleted,
        id: mealId,
        message: deleted ? 'Meal photo removed' : 'Meal not found'
      });
    } catch (err) {
      console.error('[API] Error in DELETE /api/weekly-diary:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to delete meal photo' });
    }
  }

  // 11d-4. PATCH /api/weekly-diary/cheat-toggle (Toggle cheat meal status)
  if (pathname === '/api/weekly-diary/cheat-toggle' && (req.method === 'PATCH' || req.method === 'POST')) {
    try {
      const body = await parseJsonBody(req);
      const { id, isCheat, email } = body;

      if (!id) {
        return sendJson(res, 400, { success: false, message: 'Meal ID is required' });
      }

      const user = await getAuthenticatedUser(req, { email });
      const userEmail = user ? user.email : (email ? email.toLowerCase().trim() : 'guest@fittrack.local');

      const updated = await db.toggleWeeklyMealCheat(id, userEmail, isCheat);
      if (!updated) {
        return sendJson(res, 404, { success: false, message: 'Meal not found or not owned by user' });
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Cheat status updated',
        meal: updated
      });
    } catch (err) {
      console.error('[API] Error in PATCH /api/weekly-diary/cheat-toggle:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to update cheat status' });
    }
  }

  // ==================== 12. OPENROUTER AI NUTRITION LOOKUP API ====================
  // 12a. GET /api/ai/config (Check AI status)
  if (pathname === '/api/ai/config' && req.method === 'GET') {
    const config = getAiConfig();
    const hasKey = !!(config.apiKey && config.apiKey.trim());
    return sendJson(res, 200, {
      success: true,
      configured: hasKey,
      model: config.model || 'meta-llama/llama-3.2-3b-instruct:free',
      availableFreeModels: OPENROUTER_FREE_MODELS,
      maskedKey: hasKey ? (config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4)) : null
    });
  }

  // 12b. POST /api/ai/config (Update OpenRouter API Key and model)
  if (pathname === '/api/ai/config' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const config = getAiConfig();
      if (body.apiKey !== undefined) {
        config.apiKey = (body.apiKey || '').trim();
        process.env.OPENROUTER_API_KEY = config.apiKey;
      }
      if (body.model) {
        config.model = body.model.trim();
      }
      config.updatedAt = Date.now();
      saveAiConfig(config);
      console.log('[OpenRouter AI] Updated AI configuration. Has API key:', !!config.apiKey);
      return sendJson(res, 200, {
        success: true,
        message: 'OpenRouter AI configuration updated successfully',
        configured: !!config.apiKey,
        model: config.model
      });
    } catch (err) {
      console.error('[API] Error updating AI config:', err);
      return sendJson(res, 500, { success: false, message: 'Failed to update AI configuration' });
    }
  }

  // 12c. POST /api/ai/nutrition-lookup (Analyze food with OpenRouter Free LLM or smart database)
  if (pathname === '/api/ai/nutrition-lookup' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const foodQuery = (body.foodQuery || body.name || '').trim();
      const quantity = parseFloat(body.quantity || body.qty) || 100;
      const unit = (body.unit || 'g').trim();
      const preferredModel = body.model || null;

      if (!foodQuery) {
        return sendJson(res, 400, { success: false, message: 'Food item query is required' });
      }

      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      const config = getAiConfig();
      const openRouterKey = (process.env.OPENROUTER_API_KEY || (config && config.apiKey) || '').trim();
      const defaultModel = process.env.OPENROUTER_MODEL || (config && config.model) || 'meta-llama/llama-3.2-3b-instruct:free';

      // 1. Prioritize Google Gemini Free API if configured
      if (geminiKey) {
        try {
          const aiResult = await callGeminiAi(geminiKey, foodQuery, quantity, unit);
          return sendJson(res, 200, aiResult);
        } catch (geminiErr) {
          console.warn('[Google Gemini AI] Request failed, trying backup providers:', geminiErr.message);
        }
      }

      // 2. Try OpenRouter Free AI if configured
      if (openRouterKey) {
        try {
          const aiResult = await callOpenRouterAi(openRouterKey, foodQuery, quantity, unit, preferredModel || defaultModel);
          return sendJson(res, 200, aiResult);
        } catch (aiErr) {
          console.warn('[OpenRouter AI] Live API error, falling back to smart database:', aiErr.message);
        }
      }

      // 3. Fallback: Instant verified clinical nutrition database
      const fallback = calculateLocalSmartNutrition(foodQuery, quantity, unit);
      return sendJson(res, 200, {
        success: true,
        source: 'smart_database',
        model: 'Clinical Nutrition Database',
        data: fallback
      });
    } catch (err) {
      console.error('[API] Error in nutrition lookup:', err);
      return sendJson(res, 500, { success: false, message: 'Nutrition lookup failed' });
    }
  }

  // 12d. POST /api/ai/nlp-meal-parse (Parse natural language meal e.g. "chicken breast with quantity of 100gm")
  if (pathname === '/api/ai/nlp-meal-parse' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const text = (body.text || body.query || body.meal || '').trim();
      if (!text) {
        return sendJson(res, 200, { success: false, isFood: false, error: 'Please enter a food item or meal name.' });
      }

      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (geminiKey) {
        try {
          const aiRes = await callGeminiNlpMeal(geminiKey, text);
          if (aiRes.isFood === false) {
            return sendJson(res, 200, { success: false, isFood: false, error: aiRes.error });
          }
          return sendJson(res, 200, { success: true, isFood: true, source: 'gemini', data: aiRes.data });
        } catch (geminiErr) {
          console.warn('[Gemini NLP] Live API failed, using smart parser:', geminiErr.message);
        }
      }

      // Local smart parser fallback
      const localRes = parseMealTextLocal(text);
      if (localRes.isFood === false) {
        return sendJson(res, 200, { success: false, isFood: false, error: localRes.error });
      }

      return sendJson(res, 200, {
        success: true,
        isFood: true,
        source: 'smart_database',
        data: localRes.data
      });
    } catch (err) {
      console.error('[API] Error in NLP meal parse:', err);
      return sendJson(res, 500, { success: false, isFood: false, error: 'Failed to process meal input' });
    }
  }

  // 12e. POST /api/ai/camera-nutrition (Analyze meal photo in-memory with Google Gemini Vision)
  if (pathname === '/api/ai/camera-nutrition' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req, 10 * 1024 * 1024);
      const imageBase64 = (body.imageBase64 || body.image || '').trim();
      const mimeType = (body.mimeType || 'image/jpeg').trim();

      if (!imageBase64) {
        return sendJson(res, 400, { success: false, isFood: false, error: 'No image data provided. Please snap a photo.' });
      }

      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!geminiKey) {
        return sendJson(res, 200, {
          success: false,
          isFood: false,
          error: 'Gemini Vision AI is not configured. Please ensure GEMINI_API_KEY is active.'
        });
      }

      try {
        const visionResult = await callGeminiVision(geminiKey, imageBase64, mimeType);
        if (visionResult.isFood === false) {
          return sendJson(res, 200, { success: false, isFood: false, error: visionResult.error });
        }
        return sendJson(res, 200, {
          success: true,
          isFood: true,
          source: 'gemini_vision',
          data: visionResult.data
        });
      } catch (visionErr) {
        console.warn('[Gemini Vision] Image analysis error:', visionErr.message);
        return sendJson(res, 200, {
          success: false,
          isFood: false,
          error: 'AI Vision could not recognize food in this image. Please take a clearer photo under good lighting.'
        });
      }
    } catch (err) {
      console.error('[API] Error in camera nutrition analysis:', err);
      return sendJson(res, 500, { success: false, isFood: false, error: 'Failed to process image' });
    }
  }

  // ==================== STATIC ASSETS ====================
  return serveStaticFile(req, res);
});

(async () => {
  try {
    await db.init();
    server.listen(PORT, () => {
      console.log(`[FitTrack Server] Running at http://localhost:${PORT}`);
      console.log(`[FitTrack Server] Serving static preview from ${PREVIEW_DIR}`);
      console.log(`[FitTrack Server] Database Engine: ${db.isPostgres() ? 'Cloud PostgreSQL' : 'Local Persistent Storage'}`);
      console.log(`[FitTrack Server] Auth, Favourites & Cloud Sync APIs active`);
    });
  } catch (err) {
    console.error('[FitTrack Server] Fatal startup error:', err);
  }
})();
