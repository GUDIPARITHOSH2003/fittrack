package com.fittrack.app.ui.navigation

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.theme.*

@Composable
fun FitTrackBottomNavigation(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onOpenScanner: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Elevated Bottom Navigation Capsule
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(68.dp)
                .shadow(
                    elevation = 16.dp,
                    shape = RoundedCornerShape(34.dp),
                    spotColor = Color(0x1A000000)
                ),
            shape = RoundedCornerShape(34.dp),
            color = CardSurface,
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tab 1: Nutrition
                BottomNavItem(
                    screen = Screen.Nutrition,
                    isSelected = currentRoute == Screen.Nutrition.route,
                    onClick = { onNavigate(Screen.Nutrition.route) }
                )

                // Tab 2: Workout
                BottomNavItem(
                    screen = Screen.Workout,
                    isSelected = currentRoute == Screen.Workout.route,
                    onClick = { onNavigate(Screen.Workout.route) }
                )

                // Center Spacer for Floating Scanner Button
                Spacer(modifier = Modifier.width(60.dp))

                // Tab 3: Overview
                BottomNavItem(
                    screen = Screen.Overview,
                    isSelected = currentRoute == Screen.Overview.route,
                    onClick = { onNavigate(Screen.Overview.route) }
                )

                // Tab 4: Profile
                BottomNavItem(
                    screen = Screen.Profile,
                    isSelected = currentRoute == Screen.Profile.route,
                    onClick = { onNavigate(Screen.Profile.route) }
                )
            }
        }

        // Floating Center Scanner Action Button (#6200EE)
        Box(
            modifier = Modifier
                .offset(y = (-14).dp)
                .size(62.dp)
                .shadow(
                    elevation = 12.dp,
                    shape = CircleShape,
                    spotColor = ScannerCenter.copy(alpha = 0.5f)
                )
                .clip(CircleShape)
                .background(ScannerCenter)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onOpenScanner
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Screen.Scan.selectedIcon,
                contentDescription = "Quick Scan Barcode & Food AI",
                tint = CardSurface,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
private fun BottomNavItem(
    screen: Screen,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val iconColor by animateColorAsState(
        targetValue = if (isSelected) PillButtons else TextMuted,
        animationSpec = tween(durationMillis = 200),
        label = "nav_icon_color"
    )

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(if (isSelected) SurfaceSecondary else Color.Transparent)
                .padding(6.dp),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (isSelected) screen.selectedIcon else screen.unselectedIcon,
                contentDescription = screen.title,
                tint = iconColor,
                modifier = Modifier.size(22.dp)
            )
        }
        Text(
            text = screen.title,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                color = if (isSelected) PillButtons else TextMuted
            )
        )
    }
}
