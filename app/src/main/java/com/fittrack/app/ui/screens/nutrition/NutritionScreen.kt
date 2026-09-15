package com.fittrack.app.ui.screens.nutrition

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.components.MacroRingChart
import com.fittrack.app.ui.components.MealLogCard
import com.fittrack.app.ui.components.WaterTrackerCard
import com.fittrack.app.ui.theme.*

@Composable
fun NutritionScreen(
    viewModel: NutritionViewModel,
    onOpenScanner: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(PrimaryBackground)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
        item {
            Column(modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)) {
                Text(
                    text = "Daily Nutrition",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                Text(
                    text = "Track calories, balance macros & nourish your body",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary
                    )
                )
            }
        }

        // Dynamic Macro Ring Chart Card (Calorie Goal 1,320 / 2,300 kcal - 64%)
        item {
            MacroRingChart(
                consumedCalories = uiState.consumedCalories,
                targetCalories = uiState.targetCalories,
                carbsGrams = uiState.carbsGrams,
                proteinGrams = uiState.proteinGrams,
                fatGrams = uiState.fatsGrams
            )
        }

        // AI Natural Language Input Box ("Ask advice / Log meal")
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                color = CardSurface,
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(ScannerCenter.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "AI Meal Parser",
                            tint = ScannerCenter,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    TextField(
                        value = uiState.queryInput,
                        onValueChange = { viewModel.onQueryChange(it) },
                        placeholder = {
                            Text(
                                text = "Ask advice / Log meal (\"2 eggs & toast\")",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = TextMuted
                                )
                            )
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            disabledContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(
                            onDone = { viewModel.submitNaturalLanguageMeal(uiState.queryInput) }
                        ),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )

                    IconButton(
                        onClick = { viewModel.submitNaturalLanguageMeal(uiState.queryInput) },
                        enabled = uiState.queryInput.isNotBlank() && !uiState.isAiParsing,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(if (uiState.queryInput.isNotBlank()) PillButtons else SurfaceSecondary)
                    ) {
                        if (uiState.isAiParsing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = CardSurface,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Submit Meal",
                                tint = if (uiState.queryInput.isNotBlank()) CardSurface else TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        // Hydration Water Logger (+250ml quick action)
        item {
            WaterTrackerCard(
                currentMl = uiState.waterIntakeMl,
                targetMl = uiState.waterTargetMl,
                onAddWater = { viewModel.addWater(it) }
            )
        }

        // Meal Log Section - Breakfast
        item {
            MealLogCard(
                mealType = "Breakfast",
                recommendedCal = 650,
                currentCal = uiState.breakfastItems.sumOf { it.calories },
                items = uiState.breakfastItems,
                onAddClick = onOpenScanner
            )
        }

        // Meal Log Section - Lunch
        item {
            MealLogCard(
                mealType = "Lunch",
                recommendedCal = 750,
                currentCal = uiState.lunchItems.sumOf { it.calories },
                items = uiState.lunchItems,
                onAddClick = onOpenScanner
            )
        }

        // Meal Log Section - Dinner
        item {
            MealLogCard(
                mealType = "Dinner",
                recommendedCal = 650,
                currentCal = uiState.dinnerItems.sumOf { it.calories },
                items = uiState.dinnerItems,
                onAddClick = onOpenScanner
            )
        }

        // Meal Log Section - Snacks
        item {
            MealLogCard(
                mealType = "Snacks",
                recommendedCal = 250,
                currentCal = uiState.snackItems.sumOf { it.calories },
                items = uiState.snackItems,
                onAddClick = onOpenScanner
            )
        }
    }
}
