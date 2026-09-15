package com.fittrack.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fittrack.app.data.local.dao.DailyMetricDao
import com.fittrack.app.data.local.dao.MealDao
import com.fittrack.app.data.local.dao.UserDao
import com.fittrack.app.data.local.dao.WorkoutDao
import com.fittrack.app.data.local.entity.DailyMetricEntity
import com.fittrack.app.data.local.entity.MealEntity
import com.fittrack.app.data.local.entity.UserEntity
import com.fittrack.app.data.local.entity.WorkoutEntity

@Database(
    entities = [
        UserEntity::class,
        MealEntity::class,
        WorkoutEntity::class,
        DailyMetricEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun mealDao(): MealDao
    abstract fun workoutDao(): WorkoutDao
    abstract fun dailyMetricDao(): DailyMetricDao

    companion object {
        const val DATABASE_NAME = "fittrack_database"
    }
}
