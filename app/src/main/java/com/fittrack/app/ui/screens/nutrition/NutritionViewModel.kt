package com.fittrack.app.ui.screens.nutrition

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrack.app.ui.components.MealItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NutritionUiState(
    val currentDate: String = java.time.LocalDate.now().toString(),
    val waterDate: String = java.time.LocalDate.now().toString(),
    val consumedCalories: Int = 0,
    val targetCalories: Int = 2300,
    val carbsGrams: Int = 0,
    val proteinGrams: Int = 0,
    val fatsGrams: Int = 0,
    val waterIntakeMl: Int = 0,
    val waterTargetMl: Int = 2500,
    val queryInput: String = "",
    val isAiParsing: Boolean = false,
    val favoriteItems: List<MealItem> = emptyList(),
    val breakfastItems: List<MealItem> = emptyList(),
    val lunchItems: List<MealItem> = emptyList(),
    val dinnerItems: List<MealItem> = emptyList(),
    val snackItems: List<MealItem> = emptyList()
)

@HiltViewModel
class NutritionViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(NutritionUiState())
    val uiState: StateFlow<NutritionUiState> = _uiState.asStateFlow()

    fun resetToZero() {
        val today = java.time.LocalDate.now().toString()
        _uiState.update {
            NutritionUiState(
                currentDate = today,
                waterDate = today,
                targetCalories = it.targetCalories,
                waterTargetMl = it.waterTargetMl
            )
        }
    }

    fun checkDayRollover() {
        val today = java.time.LocalDate.now().toString()
        if (_uiState.value.waterDate != today) {
            _uiState.update {
                it.copy(
                    currentDate = today,
                    waterDate = today,
                    waterIntakeMl = 0
                )
            }
        }
    }

    fun loadDemoData() {
        val today = java.time.LocalDate.now().toString()
        _uiState.update {
            it.copy(
                currentDate = today,
                waterDate = today,
                consumedCalories = 1320,
                targetCalories = 2300,
                carbsGrams = 142,
                proteinGrams = 98,
                fatsGrams = 42,
                waterIntakeMl = 1750,
                breakfastItems = listOf(
                    MealItem("Avocado Toast & Poached Egg", "2 slices + 1 egg", 410, 18, 44, 18),
                    MealItem("Greek Yogurt with Berries", "1 cup (200g)", 210, 20, 24, 4)
                ),
                lunchItems = listOf(
                    MealItem("Grilled Chicken Bowl", "1 bowl (350g)", 520, 48, 52, 12),
                    MealItem("Olive Oil Vinaigrette", "1 tbsp", 110, 0, 1, 12)
                ),
                dinnerItems = listOf(
                    MealItem("Baked Salmon & Quinoa", "1 fillet + 1/2 cup", 480, 42, 34, 19)
                ),
                snackItems = listOf(
                    MealItem("Handful of Raw Almonds", "28g", 160, 6, 6, 14)
                )
            )
        }
    }

    fun onQueryChange(newQuery: String) {
        _uiState.update { it.copy(queryInput = newQuery) }
    }

    fun addWater(amountMl: Int) {
        checkDayRollover()
        val today = java.time.LocalDate.now().toString()
        _uiState.update {
            it.copy(
                waterDate = today,
                waterIntakeMl = (it.waterIntakeMl + amountMl).coerceAtLeast(0)
            )
        }
    }

    fun addFavoriteMeal(item: MealItem) {
        _uiState.update {
            if (it.favoriteItems.any { fav -> fav.name.equals(item.name, ignoreCase = true) }) {
                it
            } else {
                it.copy(favoriteItems = listOf(item) + it.favoriteItems)
            }
        }
    }

    fun removeFavoriteMeal(mealName: String) {
        _uiState.update {
            it.copy(favoriteItems = it.favoriteItems.filterNot { fav -> fav.name.equals(mealName, ignoreCase = true) })
        }
    }

    fun submitNaturalLanguageMeal(query: String) {
        if (query.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isAiParsing = true) }
            // Simulating AI NLP Macro Parsing (OpenAI GPT-4o-mini / Gemini Flash)
            kotlinx.coroutines.delay(600)

            val parsedCal = if (query.contains("egg", ignoreCase = true)) 240 else 320
            val parsedP = if (query.contains("egg", ignoreCase = true)) 16 else 22
            val parsedC = 28
            val parsedF = 10

            val newItem = MealItem(
                name = query.trim().replaceFirstChar { it.uppercase() },
                portion = "1 estimated serving",
                calories = parsedCal,
                protein = parsedP,
                carbs = parsedC,
                fats = parsedF
            )

            _uiState.update {
                it.copy(
                    consumedCalories = it.consumedCalories + parsedCal,
                    proteinGrams = it.proteinGrams + parsedP,
                    carbsGrams = it.carbsGrams + parsedC,
                    fatsGrams = it.fatsGrams + parsedF,
                    queryInput = "",
                    isAiParsing = false,
                    snackItems = it.snackItems + newItem
                )
            }
        }
    }
}
