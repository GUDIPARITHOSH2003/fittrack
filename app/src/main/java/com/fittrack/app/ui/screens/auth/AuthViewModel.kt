package com.fittrack.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrack.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val nameInput: String = "Alex Rivera",
    val emailInput: String = "alex.rivera@wellness.io",
    val passwordInput: String = "password123",
    val confirmPasswordInput: String = "password123",
    val ageInput: String = "25",
    val weightInput: String = "68.5",
    val heightInput: String = "175",
    val gymFrequency: String = "4-5 days",
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.getCurrentUser().collect { currentUser ->
                if (currentUser != null) {
                    _uiState.update {
                        it.copy(
                            isAuthenticated = true,
                            nameInput = currentUser.name,
                            emailInput = currentUser.email,
                            ageInput = currentUser.age.toString(),
                            weightInput = currentUser.weightKg.toString(),
                            heightInput = currentUser.heightCm.toString(),
                            gymFrequency = currentUser.gymFrequency
                        )
                    }
                } else {
                    _uiState.update { it.copy(isAuthenticated = false) }
                }
            }
        }
    }

    fun onNameChange(name: String) = _uiState.update { it.copy(nameInput = name, errorMessage = null) }
    fun onEmailChange(email: String) = _uiState.update { it.copy(emailInput = email, errorMessage = null) }
    fun onPasswordChange(pass: String) = _uiState.update { it.copy(passwordInput = pass, errorMessage = null) }
    fun onConfirmPasswordChange(pass: String) = _uiState.update { it.copy(confirmPasswordInput = pass, errorMessage = null) }
    fun onAgeChange(age: String) = _uiState.update { it.copy(ageInput = age, errorMessage = null) }
    fun onWeightChange(weight: String) = _uiState.update { it.copy(weightInput = weight, errorMessage = null) }
    fun onHeightChange(height: String) = _uiState.update { it.copy(heightInput = height, errorMessage = null) }
    fun onGymFrequencyChange(frequency: String) = _uiState.update { it.copy(gymFrequency = frequency, errorMessage = null) }
    fun clearError() = _uiState.update { it.copy(errorMessage = null) }

    fun login(onSuccess: () -> Unit) {
        val email = _uiState.value.emailInput.trim()
        val password = _uiState.value.passwordInput

        if (email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter both email and password.") }
            return
        }

        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            val result = authRepository.login(email, password)
            if (result.isSuccess) {
                _uiState.update { it.copy(isLoading = false, isAuthenticated = true, errorMessage = null) }
                onSuccess()
            } else {
                val error = result.exceptionOrNull()?.message ?: "Login failed. Please try again."
                _uiState.update { it.copy(isLoading = false, errorMessage = error) }
            }
        }
    }

    fun signUp(onSuccess: () -> Unit) {
        val state = _uiState.value
        val name = state.nameInput.trim()
        val email = state.emailInput.trim()
        val password = state.passwordInput
        val confirmPassword = state.confirmPasswordInput
        val age = state.ageInput.toIntOrNull() ?: 25
        val weight = state.weightInput.toFloatOrNull() ?: 68.5f
        val height = state.heightInput.toFloatOrNull() ?: 175f

        if (name.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your full name.") }
            return
        }
        if (email.isBlank() || !email.contains("@")) {
            _uiState.update { it.copy(errorMessage = "Please enter a valid email address.") }
            return
        }
        if (password.length < 6) {
            _uiState.update { it.copy(errorMessage = "Password must be at least 6 characters.") }
            return
        }
        if (password != confirmPassword) {
            _uiState.update { it.copy(errorMessage = "Passwords do not match.") }
            return
        }

        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            val result = authRepository.register(
                name = name,
                email = email,
                password = password,
                age = age,
                weightKg = weight,
                heightCm = height,
                gymFrequency = state.gymFrequency
            )
            if (result.isSuccess) {
                _uiState.update { it.copy(isLoading = false, isAuthenticated = true, errorMessage = null) }
                onSuccess()
            } else {
                val error = result.exceptionOrNull()?.message ?: "Registration failed. Please try again."
                _uiState.update { it.copy(isLoading = false, errorMessage = error) }
            }
        }
    }

    fun signInWithGoogle(
        googleEmail: String = "google.user@gmail.com",
        googleName: String = "Google User",
        onSuccess: () -> Unit
    ) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        viewModelScope.launch {
            val state = _uiState.value
            val age = state.ageInput.toIntOrNull() ?: 25
            val weight = state.weightInput.toFloatOrNull() ?: 68.5f
            val height = state.heightInput.toFloatOrNull() ?: 175f

            val result = authRepository.signInWithGoogle(
                email = googleEmail,
                name = googleName,
                age = age,
                weightKg = weight,
                heightCm = height,
                gymFrequency = state.gymFrequency
            )
            if (result.isSuccess) {
                _uiState.update { it.copy(isLoading = false, isAuthenticated = true, errorMessage = null) }
                onSuccess()
            } else {
                val error = result.exceptionOrNull()?.message ?: "Google Sign-In failed."
                _uiState.update { it.copy(isLoading = false, errorMessage = error) }
            }
        }
    }

    fun logOut(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update { it.copy(isAuthenticated = false, errorMessage = null) }
            onLoggedOut()
        }
    }
}
