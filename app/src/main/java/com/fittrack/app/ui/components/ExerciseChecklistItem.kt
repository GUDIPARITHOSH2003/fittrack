package com.fittrack.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.theme.*

@Composable
fun ExerciseChecklistItem(
    name: String,
    targetSets: Int,
    targetReps: Int,
    completedSets: Int,
    isCompleted: Boolean,
    onToggleCompleted: () -> Unit,
    onSetClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val checkboxBg by animateColorAsState(
        targetValue = if (isCompleted) PillButtons else CardSurface,
        label = "checkbox_bg"
    )

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = CardSurface,
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Circular Checkbox
                Box(
                    modifier = Modifier
                        .size(26.dp)
                        .clip(CircleShape)
                        .background(checkboxBg)
                        .border(
                            width = 2.dp,
                            color = if (isCompleted) PillButtons else BorderSubtle,
                            shape = CircleShape
                        )
                        .clickable { onToggleCompleted() },
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Completed",
                            tint = CardSurface,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isCompleted) TextMuted else TextPrimary,
                            textDecoration = if (isCompleted) TextDecoration.LineThrough else TextDecoration.None
                        )
                    )
                    Text(
                        text = "$targetSets sets × $targetReps reps",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Interactive Set Counters
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (setIndex in 1..targetSets) {
                    val isDone = setIndex <= completedSets
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { onSetClick(setIndex) },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isDone) StepsAccent.copy(alpha = 0.4f) else SurfaceSecondary
                    ) {
                        Text(
                            text = "Set $setIndex",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = if (isDone) TextPrimary else TextSecondary,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }
    }
}
