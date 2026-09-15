package com.fittrack.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "meals")
data class MealEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val mealType: String, // Breakfast, Lunch, Dinner, Snack
    val foodName: String,
    val portion: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fats: Int,
    val fiber: Int = 0,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "workouts")
data class WorkoutEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val routineName: String,
    val durationMinutes: Int,
    val caloriesBurned: Int,
    val exerciseCount: Int,
    val isCompleted: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "daily_metrics")
data class DailyMetricEntity(
    @PrimaryKey
    val date: String, // YYYY-MM-DD
    val caloriesConsumed: Int = 0,
    val caloriesBurned: Int = 0,
    val stepsCount: Int = 0,
    val waterIntakeMl: Int = 0,
    val activeMinutes: Int = 0,
    val sleepMinutes: Int = 0
)
