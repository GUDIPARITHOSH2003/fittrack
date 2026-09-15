package com.fittrack.app.ui.screens.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExerciseItemState(
    val id: String,
    val name: String,
    val targetSets: Int,
    val targetReps: Int,
    val completedSets: Int = 0,
    val isCompleted: Boolean = false
)

data class WorkoutUiState(
    val routineTitle: String = "Lower Body Strength",
    val durationMinutes: Int = 20,
    val targetCaloriesBurned: Int = 234,
    val isWorkoutActive: Boolean = false,
    val elapsedSeconds: Int = 0,
    val exercises: List<ExerciseItemState> = listOf(
        ExerciseItemState("1", "Barbell Back Squats", 3, 12, completedSets = 2, isCompleted = false),
        ExerciseItemState("2", "Walking Dumbbell Lunges", 4, 20, completedSets = 0, isCompleted = false),
        ExerciseItemState("3", "Romanian Deadlifts", 3, 10, completedSets = 0, isCompleted = false),
        ExerciseItemState("4", "Calf Raises & Glute Bridges", 3, 15, completedSets = 0, isCompleted = false)
    )
)

@HiltViewModel
class WorkoutViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    fun toggleWorkoutSession() {
        val currentlyActive = _uiState.value.isWorkoutActive
        if (currentlyActive) {
            timerJob?.cancel()
            _uiState.update { it.copy(isWorkoutActive = false) }
        } else {
            _uiState.update { it.copy(isWorkoutActive = true) }
            timerJob = viewModelScope.launch {
                while (true) {
                    delay(1000)
                    _uiState.update { it.copy(elapsedSeconds = it.elapsedSeconds + 1) }
                }
            }
        }
    }

    fun toggleExerciseCompleted(exerciseId: String) {
        _uiState.update { state ->
            val updated = state.exercises.map { item ->
                if (item.id == exerciseId) {
                    val nextCompleted = !item.isCompleted
                    item.copy(
                        isCompleted = nextCompleted,
                        completedSets = if (nextCompleted) item.targetSets else 0
                    )
                } else item
            }
            state.copy(exercises = updated)
        }
    }

    fun logSet(exerciseId: String, setIndex: Int) {
        _uiState.update { state ->
            val updated = state.exercises.map { item ->
                if (item.id == exerciseId) {
                    val nextSets = if (item.completedSets >= setIndex) setIndex - 1 else setIndex
                    item.copy(
                        completedSets = nextSets,
                        isCompleted = nextSets >= item.targetSets
                    )
                } else item
            }
            state.copy(exercises = updated)
        }
    }
}
