package com.fittrack.app.data.local.dao

import androidx.room.*
import com.fittrack.app.data.local.entity.DailyMetricEntity
import com.fittrack.app.data.local.entity.MealEntity
import com.fittrack.app.data.local.entity.WorkoutEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MealDao {
    @Query("SELECT * FROM meals ORDER BY timestamp DESC")
    fun getAllMeals(): Flow<List<MealEntity>>

    @Query("SELECT * FROM meals WHERE mealType = :type ORDER BY timestamp DESC")
    fun getMealsByType(type: String): Flow<List<MealEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMeal(meal: MealEntity): Long

    @Delete
    suspend fun deleteMeal(meal: MealEntity)
}

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM workouts ORDER BY timestamp DESC")
    fun getAllWorkouts(): Flow<List<WorkoutEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkout(workout: WorkoutEntity): Long
}

@Dao
interface DailyMetricDao {
    @Query("SELECT * FROM daily_metrics WHERE date = :date LIMIT 1")
    fun getMetricByDate(date: String): Flow<DailyMetricEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMetric(metric: DailyMetricEntity)
}
