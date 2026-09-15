package com.fittrack.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "users",
    indices = [Index(value = ["email"], unique = true)]
)
data class UserEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val email: String,
    val passwordHash: String,
    val salt: String,
    val age: Int = 25,
    val weightKg: Float = 68.5f,
    val heightCm: Float = 175f,
    val gymFrequency: String = "4-5 days",
    val token: String? = null,
    val isCurrentSession: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
