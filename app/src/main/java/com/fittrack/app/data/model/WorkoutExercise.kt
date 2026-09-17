package com.fittrack.app.data.model

enum class MuscleGroup {
    ALL,
    BICEPS,
    TRICEPS,
    CHEST,
    BACK,
    LEGS,
    SHOULDERS,
    ABS
}

data class WorkoutExercise(
    val id: String,
    val name: String,
    val muscleGroup: MuscleGroup,
    val muscleTag: String,
    val totalSets: Int = 3,
    val repsPerSet: Int = 10,
    val caloriesBurned: Int,
    val completedSets: Int = 0,
    val isCompleted: Boolean = false
)
