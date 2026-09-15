package com.fittrack.app.ui.screens.scan

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.components.DarkPillButton
import com.fittrack.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanBottomSheet(
    viewModel: ScanViewModel,
    onDismiss: () -> Unit,
    onAddFoodToLog: (ScannedFoodResult) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = CardSurface,
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 12.dp, bottom = 8.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(BorderSubtle)
            )
        }
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding()
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Quick Food Logging",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Text(
                        text = "AI Vision, Smart Search or Direct Nutrient Entry",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                    )
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(SurfaceSecondary)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = TextPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3-Way Mode Segmented Pill: [AI Camera] [Item & Qty] [Manual]
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                color = SurfaceSecondary
            ) {
                Row(
                    modifier = Modifier.padding(4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ScanModeItem(
                        title = "AI Camera",
                        icon = Icons.Default.CameraAlt,
                        isSelected = uiState.activeMode == ScanMode.AI_CAMERA,
                        onClick = { viewModel.setMode(ScanMode.AI_CAMERA) },
                        modifier = Modifier.weight(1f)
                    )
                    ScanModeItem(
                        title = "Item & Qty",
                        icon = Icons.Default.Search,
                        isSelected = uiState.activeMode == ScanMode.ITEM_SEARCH,
                        onClick = { viewModel.setMode(ScanMode.ITEM_SEARCH) },
                        modifier = Modifier.weight(1f)
                    )
                    ScanModeItem(
                        title = "Manual",
                        icon = Icons.Default.EditNote,
                        isSelected = uiState.activeMode == ScanMode.MANUAL,
                        onClick = { viewModel.setMode(ScanMode.MANUAL) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // ================= MODE 1: AI CAMERA =================
            AnimatedVisibility(visible = uiState.activeMode == ScanMode.AI_CAMERA) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(240.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .background(Color(0xFF141414)),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(170.dp)
                                .border(2.dp, ScannerCenter, RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.CenterFocusStrong,
                                    contentDescription = "AI Camera target",
                                    tint = CardSurface.copy(alpha = 0.6f),
                                    modifier = Modifier.size(44.dp)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "AI Vision Food Scanner",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = CardSurface.copy(alpha = 0.8f),
                                        fontSize = 10.sp
                                    )
                                )
                            }
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.BottomCenter)
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = { viewModel.toggleTorch() },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(CardSurface.copy(alpha = 0.2f))
                            ) {
                                Icon(
                                    imageVector = if (uiState.isTorchOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                                    contentDescription = "Flash",
                                    tint = CardSurface
                                )
                            }

                            Surface(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { viewModel.simulateAiCapture() },
                                shape = RoundedCornerShape(16.dp),
                                color = ScannerCenter
                            ) {
                                Text(
                                    text = "Simulate Capture",
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = CardSurface
                                    )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    val detected = uiState.cameraDetectedResult
                    if (detected != null) {
                        NutrientResultCard(
                            result = detected,
                            onAdd = {
                                onAddFoodToLog(detected)
                                onDismiss()
                            }
                        )
                    }
                }
            }

            // ================= MODE 2: SEARCH ITEM & QUANTITY =================
            AnimatedVisibility(visible = uiState.activeMode == ScanMode.ITEM_SEARCH) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = uiState.searchItemName,
                        onValueChange = { viewModel.updateSearchItemName(it) },
                        label = { Text("Item Name") },
                        placeholder = { Text("e.g. Chicken Breast, Oats, Banana...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = uiState.searchQuantity,
                            onValueChange = { viewModel.updateSearchQuantity(it) },
                            label = { Text("Quantity") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        )

                        OutlinedTextField(
                            value = uiState.searchUnit,
                            onValueChange = { viewModel.updateSearchUnit(it) },
                            label = { Text("Unit") },
                            placeholder = { Text("g / pcs / cup") },
                            singleLine = true,
                            modifier = Modifier.width(110.dp),
                            shape = RoundedCornerShape(14.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    val calcResult = uiState.searchCalculatedResult
                    if (calcResult != null) {
                        NutrientResultCard(
                            result = calcResult,
                            onAdd = {
                                onAddFoodToLog(calcResult)
                                onDismiss()
                            }
                        )
                    }
                }
            }

            // ================= MODE 3: MANUAL ENTRY =================
            AnimatedVisibility(visible = uiState.activeMode == ScanMode.MANUAL) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = uiState.manualItemName,
                        onValueChange = { viewModel.updateManualItemName(it) },
                        label = { Text("Item Name *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = uiState.manualCalories,
                            onValueChange = { viewModel.updateManualCalories(it) },
                            label = { Text("Calories (kcal) *") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        )
                        OutlinedTextField(
                            value = uiState.manualProtein,
                            onValueChange = { viewModel.updateManualProtein(it) },
                            label = { Text("Protein (g) *") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = uiState.manualCarbs,
                            onValueChange = { viewModel.updateManualCarbs(it) },
                            label = { Text("Carbs (g) *") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        )
                        OutlinedTextField(
                            value = uiState.manualFats,
                            onValueChange = { viewModel.updateManualFats(it) },
                            label = { Text("Fat (g) *") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = uiState.manualFiber,
                        onValueChange = { viewModel.updateManualFiber(it) },
                        label = { Text("Fiber (g) *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    DarkPillButton(
                        text = "Add to Meal Log",
                        onClick = {
                            val manualResult = viewModel.buildManualFoodResult()
                            onAddFoodToLog(manualResult)
                            onDismiss()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun NutrientResultCard(
    result: ScannedFoodResult,
    onAdd: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceSecondary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = result.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Text(
                        text = result.portion,
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                    )
                }
                Text(
                    text = "${result.calories} kcal",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Nutrient Breakdown Pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                NutrientPill(label = "Protein", value = "${result.protein}g", modifier = Modifier.weight(1f))
                NutrientPill(label = "Carbs", value = "${result.carbs}g", modifier = Modifier.weight(1f))
                NutrientPill(label = "Fat", value = "${result.fats}g", modifier = Modifier.weight(1f))
                NutrientPill(label = "Fiber", value = "${result.fiber}g", modifier = Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(14.dp))

            DarkPillButton(
                text = "Add to Meal Log",
                onClick = onAdd
            )
        }
    }
}

@Composable
private fun NutrientPill(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = CardSurface
    ) {
        Column(
            modifier = Modifier.padding(vertical = 6.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                )
            )
        }
    }
}

@Composable
private fun ScanModeItem(
    title: String,
    icon: ImageVector,
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
        Row(
            modifier = Modifier.padding(vertical = 8.dp, horizontal = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (isSelected) TextPrimary else TextMuted,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) TextPrimary else TextMuted,
                    fontSize = 11.sp
                )
            )
        }
    }
}
