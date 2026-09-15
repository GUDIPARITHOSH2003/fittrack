package com.fittrack.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

data class ProfileUiState(
    val userName: String = "Alex Rivera",
    val email: String = "alex.rivera@wellness.io",
    val weightKg: Float = 68.5f,
    val heightCm: Float = 175f,
    val dailyTargetCalories: Int = 2300,
    val isHealthConnectSynced: Boolean = true,
    val isStravaSynced: Boolean = true,
    val subscriptionTier: String = "FitTrack Pro (Annual)",
    val subscriptionExpiry: String = "Renews Nov 2026",
    val isPaymentActive: Boolean = true
) {
    val bmi: Float
        get() {
            val heightM = heightCm / 100f
            return weightKg / (heightM * heightM)
        }

    val bmiCategory: String
        get() = when {
            bmi < 18.5f -> "Underweight"
            bmi < 25f -> "Normal Weight"
            bmi < 30f -> "Overweight"
            else -> "Obese"
        }
}

@HiltViewModel
class ProfileViewModel @Inject constructor() : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun updateTargetCalories(newTarget: Int) {
        _uiState.update { it.copy(dailyTargetCalories = newTarget) }
    }

    fun toggleHealthConnect() {
        _uiState.update { it.copy(isHealthConnectSynced = !it.isHealthConnectSynced) }
    }

    fun updatePersonalData(name: String, age: Int, weightKg: Float, heightCm: Float, gymFrequency: String) {
        val bmr = (10 * weightKg + 6.25f * heightCm - 5 * age + 5).toInt()
        val mult = when {
            gymFrequency.contains("0-1") -> 1.2f
            gymFrequency.contains("2-3") -> 1.375f
            gymFrequency.contains("4-5") -> 1.55f
            gymFrequency.contains("6-7") -> 1.725f
            else -> 1.55f
        }
        val targetCalories = (bmr * mult).toInt()
        _uiState.update {
            it.copy(
                userName = name,
                weightKg = weightKg,
                heightCm = heightCm,
                dailyTargetCalories = targetCalories
            )
        }
    }
}
