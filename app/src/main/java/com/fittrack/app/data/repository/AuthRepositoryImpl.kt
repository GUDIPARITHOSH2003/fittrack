package com.fittrack.app.data.repository

import com.fittrack.app.data.local.dao.UserDao
import com.fittrack.app.data.local.entity.UserEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val userDao: UserDao
) : AuthRepository {

    override fun getCurrentUser(): Flow<UserEntity?> = userDao.getCurrentUser()

    override suspend fun login(email: String, password: String): Result<UserEntity> = withContext(Dispatchers.IO) {
        val trimmedEmail = email.trim().lowercase()
        val user = userDao.getUserByEmail(trimmedEmail)
            ?: return@withContext Result.failure(IllegalArgumentException("Invalid email or password."))

        val computedHash = hashPassword(password, user.salt)
        if (computedHash != user.passwordHash) {
            return@withContext Result.failure(IllegalArgumentException("Invalid email or password."))
        }

        val token = "ft_" + UUID.randomUUID().toString()
        userDao.clearActiveSessions()
        userDao.setActiveSession(user.id, token)

        val updatedUser = user.copy(isCurrentSession = true, token = token)
        Result.success(updatedUser)
    }

    override suspend fun register(
        name: String,
        email: String,
        password: String,
        age: Int,
        weightKg: Float,
        heightCm: Float,
        gymFrequency: String
    ): Result<UserEntity> = withContext(Dispatchers.IO) {
        val trimmedEmail = email.trim().lowercase()
        val trimmedName = name.trim()

        if (trimmedName.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("Full name is required."))
        }
        if (password.length < 6) {
            return@withContext Result.failure(IllegalArgumentException("Password must be at least 6 characters."))
        }

        val existingUser = userDao.getUserByEmail(trimmedEmail)
        if (existingUser != null) {
            return@withContext Result.failure(IllegalArgumentException("An account with this email already exists."))
        }

        val salt = generateSalt()
        val passwordHash = hashPassword(password, salt)
        val token = "ft_" + UUID.randomUUID().toString()

        val newUser = UserEntity(
            name = trimmedName,
            email = trimmedEmail,
            passwordHash = passwordHash,
            salt = salt,
            age = age,
            weightKg = weightKg,
            heightCm = heightCm,
            gymFrequency = gymFrequency,
            token = token,
            isCurrentSession = true
        )

        userDao.clearActiveSessions()
        val newId = userDao.insertUser(newUser)
        val persistedUser = newUser.copy(id = newId)

        Result.success(persistedUser)
    }

    override suspend fun signInWithGoogle(
        email: String,
        name: String,
        age: Int,
        weightKg: Float,
        heightCm: Float,
        gymFrequency: String
    ): Result<UserEntity> = withContext(Dispatchers.IO) {
        val trimmedEmail = email.trim().lowercase()
        val trimmedName = name.trim().ifBlank { trimmedEmail.substringBefore("@") }
        val existingUser = userDao.getUserByEmail(trimmedEmail)

        val token = "ft_g_" + UUID.randomUUID().toString()
        userDao.clearActiveSessions()

        if (existingUser != null) {
            userDao.setActiveSession(existingUser.id, token)
            Result.success(existingUser.copy(isCurrentSession = true, token = token))
        } else {
            val newUser = UserEntity(
                name = trimmedName,
                email = trimmedEmail,
                passwordHash = "GOOGLE_OAUTH",
                salt = "GOOGLE_OAUTH",
                age = age,
                weightKg = weightKg,
                heightCm = heightCm,
                gymFrequency = gymFrequency,
                token = token,
                isCurrentSession = true
            )
            val newId = userDao.insertUser(newUser)
            Result.success(newUser.copy(id = newId))
        }
    }

    override suspend fun logout() = withContext(Dispatchers.IO) {
        userDao.logoutCurrentSession()
    }

    private fun generateSalt(): String {
        val random = SecureRandom()
        val saltBytes = ByteArray(16)
        random.nextBytes(saltBytes)
        return saltBytes.joinToString("") { "%02x".format(it) }
    }

    private fun hashPassword(password: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest((password + salt).toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
