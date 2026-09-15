package com.fittrack.app.data.local.dao

import androidx.room.*
import com.fittrack.app.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1")
    suspend fun getUserByEmail(email: String): UserEntity?

    @Query("SELECT * FROM users WHERE isCurrentSession = 1 LIMIT 1")
    fun getCurrentUser(): Flow<UserEntity?>

    @Query("SELECT * FROM users WHERE id = :userId LIMIT 1")
    suspend fun getUserById(userId: Long): UserEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertUser(user: UserEntity): Long

    @Update
    suspend fun updateUser(user: UserEntity)

    @Query("UPDATE users SET isCurrentSession = 0")
    suspend fun clearActiveSessions()

    @Query("UPDATE users SET isCurrentSession = 1, token = :token WHERE id = :userId")
    suspend fun setActiveSession(userId: Long, token: String)

    @Query("UPDATE users SET isCurrentSession = 0, token = NULL WHERE isCurrentSession = 1")
    suspend fun logoutCurrentSession()
}
