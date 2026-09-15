package com.fittrack.app.di

import android.content.Context
import androidx.room.Room
import com.fittrack.app.data.local.AppDatabase
import com.fittrack.app.data.local.dao.DailyMetricDao
import com.fittrack.app.data.local.dao.MealDao
import com.fittrack.app.data.local.dao.UserDao
import com.fittrack.app.data.local.dao.WorkoutDao
import com.fittrack.app.data.repository.AuthRepository
import com.fittrack.app.data.repository.AuthRepositoryImpl
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            AppDatabase.DATABASE_NAME
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideUserDao(db: AppDatabase): UserDao = db.userDao()

    @Provides
    fun provideMealDao(db: AppDatabase): MealDao = db.mealDao()

    @Provides
    fun provideWorkoutDao(db: AppDatabase): WorkoutDao = db.workoutDao()

    @Provides
    fun provideDailyMetricDao(db: AppDatabase): DailyMetricDao = db.dailyMetricDao()

    @Provides
    @Singleton
    fun provideAuthRepository(userDao: UserDao): AuthRepository {
        return AuthRepositoryImpl(userDao)
    }
}
