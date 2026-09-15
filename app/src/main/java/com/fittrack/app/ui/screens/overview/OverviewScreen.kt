package com.fittrack.app.ui.screens.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.components.MetricGridCard
import com.fittrack.app.ui.theme.*

@Composable
fun OverviewScreen(
    viewModel: OverviewViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val isToday = uiState.selectedPeriod == OverviewPeriod.TODAY

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(PrimaryBackground)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title Header
        item {
            Column(modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)) {
                Text(
                    text = if (isToday) "Today's Overview" else "Weekly Overview",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                Text(
                    text = if (isToday)
                        "Real-time daily balance, active movement & recovery"
                    else
                        "Aggregated weekly trend & 7-day caloric expenditure",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary
                    )
                )
            }
        }

        // Today / This Week Segmented Tab Bar
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                color = SurfaceSecondary
            ) {
                Row(
                    modifier = Modifier.padding(4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    PeriodTabItem(
                        title = "Today",
                        isSelected = isToday,
                        onClick = { viewModel.setPeriod(OverviewPeriod.TODAY) },
                        modifier = Modifier.weight(1f)
                    )
                    PeriodTabItem(
                        title = "This Week",
                        isSelected = !isToday,
                        onClick = { viewModel.setPeriod(OverviewPeriod.THIS_WEEK) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Energy Balance Card (Burned vs Consumed)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Daily Energy Balance",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        )
                        val net = uiState.todayCaloriesConsumed - uiState.todayActiveCalories
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = SurfaceSecondary
                        ) {
                            Text(
                                text = "${if (net >= 0) "+" else ""}${net} kcal Net",
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Consumed",
                                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                            )
                            Text(
                                text = "${uiState.todayCaloriesConsumed} kcal",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = CarbsAccent
                                )
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Active Burned",
                                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                            )
                            Text(
                                text = "${uiState.todayActiveCalories} kcal",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = ProteinAccent
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Comparative Ratio Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(SurfaceSecondary)
                    ) {
                        val total = uiState.todayCaloriesConsumed + uiState.todayActiveCalories
                        val ratio = if (total > 0) (uiState.todayCaloriesConsumed.toFloat() / total.toFloat()) else 0.5f
                        Row(modifier = Modifier.fillMaxSize()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(ratio)
                                    .background(CarbsAccent)
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(1f - ratio)
                                    .background(ProteinAccent)
                            )
                        }
                    }
                }
            }
        }

        // Section Title: Rounded 2x2 Unified Grid
        item {
            Text(
                text = if (isToday) "Today's Health Pillars" else "Weekly Health Pillars",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                ),
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        // Row 1 of 2x2 Grid: Calories Burned & Step Counter
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Metric 1: Calories Burned
                MetricGridCard(
                    title = "Calories Burned",
                    value = if (isToday) "2,180" else "10,820",
                    subtitle = if (isToday) "540 active • 1,640 resting" else "kcal / this week",
                    icon = Icons.Default.LocalFireDepartment,
                    accentColor = CarbsAccent,
                    modifier = Modifier.weight(1f)
                )

                // Metric 2: Step Counter
                MetricGridCard(
                    title = "Step Counter",
                    value = if (isToday) "8,420" else "82,641",
                    subtitle = if (isToday) "steps (84% of 10k goal)" else "steps / 100k goal",
                    icon = Icons.Default.DirectionsRun,
                    accentColor = StepsAccent,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Row 2 of 2x2 Grid: Active Minutes & Sleep Tracker
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Metric 3: Active Minutes
                MetricGridCard(
                    title = "Active Minutes",
                    value = if (isToday) "48" else "558",
                    subtitle = if (isToday) "min (Goal 45 min reached)" else "min / weekly total",
                    icon = Icons.Default.Timer,
                    accentColor = ProteinAccent,
                    modifier = Modifier.weight(1f)
                )

                // Metric 4: Sleep Duration
                MetricGridCard(
                    title = if (isToday) "Sleep Duration" else "Sleep Tracker",
                    value = if (isToday) "7h 35m" else "51h 36m",
                    subtitle = if (isToday) "Last night • 92% score" else "7h 22m daily avg",
                    icon = Icons.Default.Bedtime,
                    accentColor = SleepAccent,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Weekly Burn Histogram Chart
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Daily Calorie Burn Trend",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(18.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        uiState.weeklyHistory.forEach { dayMetric ->
                            val heightFraction = (dayMetric.calories.toFloat() / 2000f).coerceIn(0.15f, 1f)
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Bottom,
                                modifier = Modifier.fillMaxHeight()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .width(28.dp)
                                        .fillMaxHeight(heightFraction)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (dayMetric.isHighest) StepsAccent else SurfaceSecondary)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = dayMetric.day,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = if (dayMetric.isHighest) TextPrimary else TextSecondary,
                                        fontWeight = if (dayMetric.isHighest) FontWeight.Bold else FontWeight.Normal
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PeriodTabItem(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) CardSurface else Color.Transparent,
        shadowElevation = if (isSelected) 2.dp else 0.dp
    ) {
        Box(
            modifier = Modifier.padding(vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) TextPrimary else TextMuted
                )
            )
        }
    }
}
