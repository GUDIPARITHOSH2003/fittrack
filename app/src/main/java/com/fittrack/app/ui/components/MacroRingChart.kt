package com.fittrack.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.theme.*

@Composable
fun MacroRingChart(
    consumedCalories: Int,
    targetCalories: Int,
    carbsGrams: Int,
    proteinGrams: Int,
    fatGrams: Int,
    modifier: Modifier = Modifier
) {
    val progress = (consumedCalories.toFloat() / targetCalories.toFloat()).coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "macro_progress"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(28.dp))
            .background(CardSurface)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Daily Calorie Target",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceSecondary)
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "${(progress * 100).toInt()}% Done",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = PillButtons
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Dynamic Circular Ring Canvas
        Box(
            modifier = Modifier.size(190.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val strokeWidth = 16.dp.toPx()
                // Background Track
                drawArc(
                    color = SurfaceSecondary,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )

                // Protein Segment (Deep Forest Green #1D3F37)
                val proteinSweep = animatedProgress * 120f
                drawArc(
                    color = ProteinAccent,
                    startAngle = -90f,
                    sweepAngle = proteinSweep,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )

                // Carbs Segment (Warm Orange #EE924F)
                val carbsSweep = animatedProgress * 150f
                drawArc(
                    color = CarbsAccent,
                    startAngle = -90f + proteinSweep,
                    sweepAngle = carbsSweep,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )

                // Fats Segment
                val fatsSweep = (animatedProgress * 360f - proteinSweep - carbsSweep).coerceAtLeast(0f)
                if (fatsSweep > 0) {
                    drawArc(
                        color = FatsAccent,
                        startAngle = -90f + proteinSweep + carbsSweep,
                        sweepAngle = fatsSweep,
                        useCenter = false,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$consumedCalories",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 32.sp,
                        color = TextPrimary
                    )
                )
                Text(
                    text = "of $targetCalories kcal",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary,
                        fontSize = 13.sp
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                val remaining = (targetCalories - consumedCalories).coerceAtLeast(0)
                Text(
                    text = "$remaining kcal left",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = TextMuted,
                        fontWeight = FontWeight.SemiBold
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Macro Badges Breakdown Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            MacroChip(name = "Carbs", grams = carbsGrams, target = 180, color = CarbsAccent)
            MacroChip(name = "Protein", grams = proteinGrams, target = 140, color = ProteinAccent)
            MacroChip(name = "Fats", grams = fatGrams, target = 65, color = FatsAccent)
        }
    }
}

@Composable
private fun MacroChip(
    name: String,
    grams: Int,
    target: Int,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(color)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = name,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
            )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "${grams}g / ${target}g",
            style = MaterialTheme.typography.titleSmall.copy(
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                fontSize = 13.sp
            )
        )
    }
}
