package com.fittrack.app.data.repository

import com.fittrack.app.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    fun getCurrentUser(): Flow<UserEntity?>
    suspend fun login(email: String, password: String): Result<UserEntity>
    suspend fun register(
        name: String,
        email: String,
        password: String,
        age: Int,
        weightKg: Float,
        heightCm: Float,
        gymFrequency: String
    ): Result<UserEntity>
    suspend fun signInWithGoogle(
        email: String,
        name: String,
        age: Int = 25,
        weightKg: Float = 68.5f,
        heightCm: Float = 175f,
        gymFrequency: String = "4-5 days"
    ): Result<UserEntity>
    suspend fun logout()
}
