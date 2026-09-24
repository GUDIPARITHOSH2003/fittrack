-- FitTrack Production Database Schema (PostgreSQL & SQL Compatible)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  salt TEXT,
  google_id VARCHAR(255) UNIQUE,
  name TEXT NOT NULL,
  age INTEGER DEFAULT 25,
  weight REAL DEFAULT 70.0,
  height REAL DEFAULT 175.0,
  gym_frequency TEXT DEFAULT '4-5 days/wk',
  goal TEXT DEFAULT 'maintain',
  nutrition_targets TEXT, -- JSON string of BMR, calories, macros, meal breakdown
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Daily Tracking Logs (Meals, Macros, Hydration, Active Burn & Workout Sets)
CREATE TABLE IF NOT EXISTS daily_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date VARCHAR(16) NOT NULL, -- Format: YYYY-MM-DD
  consumed_calories INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  protein INTEGER DEFAULT 0,
  fats INTEGER DEFAULT 0,
  fiber INTEGER DEFAULT 0,
  water_intake INTEGER DEFAULT 0,
  water_target INTEGER DEFAULT 2500,
  active_burned INTEGER DEFAULT 0,
  meals TEXT, -- JSON string of logged food items array
  completed_exercises TEXT, -- JSON string of checked workout sets map
  updated_at BIGINT NOT NULL,
  CONSTRAINT uq_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);

-- 3. Saved Meal Favourites
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  portion TEXT,
  meal_type TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- 4. Weekly Food Photo Diary & Accountability Tracker
CREATE TABLE IF NOT EXISTS weekly_meals (
  id VARCHAR(64) PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  week_id VARCHAR(32) NOT NULL, -- Format: YYYY-Www (e.g. 2026-W39)
  day VARCHAR(10) NOT NULL, -- mon, tue, wed, thu, fri, sat, sun
  title TEXT NOT NULL,
  meal_slot VARCHAR(50),
  time VARCHAR(50),
  calories INTEGER DEFAULT 0,
  is_cheat BOOLEAN DEFAULT FALSE,
  notes TEXT,
  img TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weekly_meals_user_week ON weekly_meals(user_email, week_id);
CREATE INDEX IF NOT EXISTS idx_weekly_meals_day ON weekly_meals(day);
