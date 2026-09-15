package com.fittrack.app.ui.screens.overview

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

enum class OverviewPeriod {
    TODAY,
    THIS_WEEK
}

data class DayBurnMetric(val day: String, val calories: Int, val isHighest: Boolean = false)

data class OverviewUiState(
    val selectedPeriod: OverviewPeriod = OverviewPeriod.TODAY,

    // Today's Realistic Daily Data
    val todayCaloriesBurned: Int = 2180,
    val todayActiveCalories: Int = 540,
    val todayCaloriesConsumed: Int = 1320,
    val todayStepsCount: Int = 8420,
    val todayStepsGoal: Int = 10000,
    val todayActiveMinutes: Int = 48,
    val todayActiveGoal: Int = 45,
    val todaySleepDuration: String = "7h 35m",
    val todaySleepScore: String = "Last night • 92% score",

    // Weekly Aggregate Context
    val weeklyCaloriesBurned: Int = 10820,
    val weeklyStepsCount: Int = 82641,
    val activeMinutesWeekly: Int = 558,
    val sleepTotalHoursMinutes: String = "51h 36m total",
    val sleepAvgHoursMinutes: String = "7h 22m daily avg",

    val weeklyHistory: List<DayBurnMetric> = listOf(
        DayBurnMetric("M", 1450),
        DayBurnMetric("T", 1620),
        DayBurnMetric("W", 1380),
        DayBurnMetric("T", 1750, isHighest = true),
        DayBurnMetric("F", 1540),
        DayBurnMetric("S", 1820),
        DayBurnMetric("S", 1260)
    )
)

@HiltViewModel
class OverviewViewModel @Inject constructor() : ViewModel() {
    private val _uiState = MutableStateFlow(OverviewUiState())
    val uiState: StateFlow<OverviewUiState> = _uiState.asStateFlow()

    fun setPeriod(period: OverviewPeriod) {
        _uiState.update { it.copy(selectedPeriod = period) }
    }
}
