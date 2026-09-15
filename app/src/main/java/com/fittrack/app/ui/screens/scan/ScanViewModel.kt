package com.fittrack.app.ui.screens.scan

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

enum class ScanMode {
    AI_CAMERA,
    ITEM_SEARCH,
    MANUAL
}

data class ScannedFoodResult(
    val title: String,
    val portion: String,
    val calories: Int,
    val carbs: Int,
    val protein: Int,
    val fats: Int,
    val fiber: Int = 0
)

data class ScanUiState(
    val activeMode: ScanMode = ScanMode.AI_CAMERA,
    val isTorchOn: Boolean = false,
    val cameraDetectedResult: ScannedFoodResult? = null,

    // Mode 2: Search Item & Quantity
    val searchItemName: String = "",
    val searchQuantity: String = "",
    val searchUnit: String = "g",
    val searchCalculatedResult: ScannedFoodResult? = null,

    // Mode 3: Manual Entry (Item, Calories, Protein, Carbs, Fat, Fiber)
    val manualItemName: String = "",
    val manualCalories: String = "",
    val manualProtein: String = "",
    val manualCarbs: String = "",
    val manualFats: String = "",
    val manualFiber: String = ""
)

@HiltViewModel
class ScanViewModel @Inject constructor() : ViewModel() {
    private val _uiState = MutableStateFlow(ScanUiState())
    val uiState: StateFlow<ScanUiState> = _uiState.asStateFlow()

    fun setMode(mode: ScanMode) {
        _uiState.update { it.copy(activeMode = mode) }
    }

    fun toggleTorch() {
        _uiState.update { it.copy(isTorchOn = !it.isTorchOn) }
    }

    fun simulateAiCapture() {
        _uiState.update {
            it.copy(
                cameraDetectedResult = ScannedFoodResult(
                    title = "Mediterranean Salad Bowl",
                    portion = "AI Camera (280g)",
                    calories = 340,
                    carbs = 26,
                    protein = 18,
                    fats = 14,
                    fiber = 6
                )
            )
        }
    }

    fun updateSearchItemName(name: String) {
        _uiState.update { it.copy(searchItemName = name) }
        recalculateSearch()
    }

    fun updateSearchQuantity(quantity: String) {
        _uiState.update { it.copy(searchQuantity = quantity) }
        recalculateSearch()
    }

    fun updateSearchUnit(unit: String) {
        _uiState.update { it.copy(searchUnit = unit) }
        recalculateSearch()
    }

    private fun recalculateSearch() {
        val name = _uiState.value.searchItemName.trim()
        val qty = _uiState.value.searchQuantity.toFloatOrNull() ?: 100f
        val unit = _uiState.value.searchUnit
        val factor = if (unit == "g") qty / 100f else qty

        val (baseCal, baseP, baseC, baseF, baseFib) = when {
            name.contains("chicken", ignoreCase = true) -> Tuple5(165, 31, 0, 4, 0)
            name.contains("oat", ignoreCase = true) -> Tuple5(380, 14, 68, 6, 10)
            name.contains("banana", ignoreCase = true) -> Tuple5(89, 1, 23, 0, 3)
            name.contains("egg", ignoreCase = true) -> Tuple5(140, 12, 1, 10, 0)
            name.contains("rice", ignoreCase = true) -> Tuple5(111, 3, 23, 1, 2)
            else -> Tuple5(200, 15, 20, 6, 2)
        }

        _uiState.update {
            it.copy(
                searchCalculatedResult = ScannedFoodResult(
                    title = if (name.isNotBlank()) name else "Custom Food",
                    portion = "$qty $unit portion calculated",
                    calories = (baseCal * factor).toInt(),
                    protein = (baseP * factor).toInt(),
                    carbs = (baseC * factor).toInt(),
                    fats = (baseF * factor).toInt(),
                    fiber = (baseFib * factor).toInt()
                )
            )
        }
    }

    // Manual Entry Updaters
    fun updateManualItemName(name: String) = _uiState.update { it.copy(manualItemName = name) }
    fun updateManualCalories(calories: String) = _uiState.update { it.copy(manualCalories = calories) }
    fun updateManualProtein(protein: String) = _uiState.update { it.copy(manualProtein = protein) }
    fun updateManualCarbs(carbs: String) = _uiState.update { it.copy(manualCarbs = carbs) }
    fun updateManualFats(fats: String) = _uiState.update { it.copy(manualFats = fats) }
    fun updateManualFiber(fiber: String) = _uiState.update { it.copy(manualFiber = fiber) }

    fun buildManualFoodResult(): ScannedFoodResult {
        val s = _uiState.value
        return ScannedFoodResult(
            title = s.manualItemName.ifBlank { "Manual Food Item" },
            portion = "Manual Entry (Fiber: ${s.manualFiber}g)",
            calories = s.manualCalories.toIntOrNull() ?: 0,
            protein = s.manualProtein.toIntOrNull() ?: 0,
            carbs = s.manualCarbs.toIntOrNull() ?: 0,
            fats = s.manualFats.toIntOrNull() ?: 0,
            fiber = s.manualFiber.toIntOrNull() ?: 0
        )
    }
}

private data class Tuple5(val a: Int, val b: Int, val c: Int, val d: Int, val e: Int)
