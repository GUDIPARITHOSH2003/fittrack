package com.fittrack.app.ui.screens.auth

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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.app.ui.theme.ScannerCenter

@Composable
fun SignUpScreen(
    viewModel: AuthViewModel,
    onNavigateBackToLogin: () -> Unit,
    onSignUpSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF9FAFC))
            .verticalScroll(scrollState)
            .padding(horizontal = 24.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        // Top Navigation Header with Back Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(
                onClick = onNavigateBackToLogin,
                modifier = Modifier
                    .size(36.dp)
                    .shadow(elevation = 2.dp, shape = CircleShape)
                    .clip(CircleShape)
                    .background(Color.White)
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back to Login",
                    tint = AuthRoyalBlue,
                    modifier = Modifier.size(18.dp)
                )
            }

            // Centered Logo
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "fittrack",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-1).sp,
                        color = AuthRoyalBlue
                    )
                )
                Spacer(modifier = Modifier.width(3.dp))
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(ScannerCenter)
                )
            }

            Spacer(modifier = Modifier.size(36.dp)) // balance layout
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Heading: Create your Account
        Text(
            text = "Create your Account",
            style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF141414)
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        // 1. Elevated Full Name Input Card (Above Email)
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .shadow(elevation = 3.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x0D000000)),
            shape = RoundedCornerShape(14.dp),
            color = Color.White
        ) {
            TextField(
                value = uiState.nameInput,
                onValueChange = { viewModel.onNameChange(it) },
                placeholder = { Text("Full Name", color = Color(0xFFA3A7AB), fontSize = 14.sp) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 2. Elevated Email Input Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .shadow(elevation = 3.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x0D000000)),
            shape = RoundedCornerShape(14.dp),
            color = Color.White
        ) {
            TextField(
                value = uiState.emailInput,
                onValueChange = { viewModel.onEmailChange(it) },
                placeholder = { Text("Email", color = Color(0xFFA3A7AB), fontSize = 14.sp) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 3. Elevated Password Input Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .shadow(elevation = 3.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x0D000000)),
            shape = RoundedCornerShape(14.dp),
            color = Color.White
        ) {
            TextField(
                value = uiState.passwordInput,
                onValueChange = { viewModel.onPasswordChange(it) },
                placeholder = { Text("Password", color = Color(0xFFA3A7AB), fontSize = 14.sp) },
                visualTransformation = PasswordVisualTransformation(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 4. Elevated Confirm Password Input Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .shadow(elevation = 3.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x0D000000)),
            shape = RoundedCornerShape(14.dp),
            color = Color.White
        ) {
            TextField(
                value = uiState.confirmPasswordInput,
                onValueChange = { viewModel.onConfirmPasswordChange(it) },
                placeholder = { Text("Confirm Password", color = Color(0xFFA3A7AB), fontSize = 14.sp) },
                visualTransformation = PasswordVisualTransformation(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 5. Section: Physical Metrics (Age, Weight, Height)
        Text(
            text = "PHYSICAL METRICS",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF6B7280),
                fontSize = 11.sp,
                letterSpacing = 0.5.sp
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Age
            MetricInputCard(
                label = "AGE",
                value = uiState.ageInput,
                onValueChange = { viewModel.onAgeChange(it) },
                unit = "yrs",
                modifier = Modifier.weight(1f)
            )
            // Weight
            MetricInputCard(
                label = "WEIGHT",
                value = uiState.weightInput,
                onValueChange = { viewModel.onWeightChange(it) },
                unit = "kg",
                modifier = Modifier.weight(1f)
            )
            // Height
            MetricInputCard(
                label = "HEIGHT",
                value = uiState.heightInput,
                onValueChange = { viewModel.onHeightChange(it) },
                unit = "cm",
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 6. Section: Gym / Workout Frequency
        Text(
            text = "GYM & WORKOUT FREQUENCY",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF6B7280),
                fontSize = 11.sp,
                letterSpacing = 0.5.sp
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(elevation = 2.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x08000000))
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White)
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FrequencyChip(
                    days = "0-1 days",
                    desc = "Light / Rest",
                    isSelected = uiState.gymFrequency == "0-1 days",
                    onSelect = { viewModel.onGymFrequencyChange("0-1 days") },
                    modifier = Modifier.weight(1f)
                )
                FrequencyChip(
                    days = "2-3 days",
                    desc = "Moderate",
                    isSelected = uiState.gymFrequency == "2-3 days",
                    onSelect = { viewModel.onGymFrequencyChange("2-3 days") },
                    modifier = Modifier.weight(1f)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FrequencyChip(
                    days = "4-5 days",
                    desc = "Gym Active",
                    isSelected = uiState.gymFrequency == "4-5 days",
                    onSelect = { viewModel.onGymFrequencyChange("4-5 days") },
                    modifier = Modifier.weight(1f)
                )
                FrequencyChip(
                    days = "6-7 days",
                    desc = "Athlete",
                    isSelected = uiState.gymFrequency == "6-7 days",
                    onSelect = { viewModel.onGymFrequencyChange("6-7 days") },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (uiState.errorMessage != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFFFEE2E2),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5))
            ) {
                Text(
                    text = uiState.errorMessage ?: "",
                    color = Color(0xFFDC2626),
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Sign Up Primary Button
        Button(
            onClick = { viewModel.signUp(onSignUpSuccess) },
            enabled = !uiState.isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
                .shadow(elevation = 8.dp, shape = RoundedCornerShape(14.dp), spotColor = AuthRoyalBlue.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = AuthRoyalBlue,
                contentColor = Color.White
            )
        ) {
            Text(
                text = if (uiState.isLoading) "Creating Account..." else "Sign up",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Divider: - Or sign up with -
        Text(
            text = "- Or sign up with -",
            style = MaterialTheme.typography.bodySmall.copy(
                color = Color(0xFF8E9398),
                fontWeight = FontWeight.Medium,
                fontSize = 12.sp
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Google-Only Sign Up Button
        GoogleAuthButton(
            text = "Continue with Google",
            onClick = { viewModel.signInWithGoogle(onSuccess = onSignUpSuccess) }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Footer: Already have an account? Sign in
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Already have an account? ",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color(0xFF6B7280),
                    fontSize = 13.sp
                )
            )
            Text(
                text = "Sign in",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = AuthRoyalBlue,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                ),
                modifier = Modifier.clickable { onNavigateBackToLogin() }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun MetricInputCard(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    unit: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(60.dp)
            .shadow(elevation = 2.dp, shape = RoundedCornerShape(12.dp), spotColor = Color(0x0A000000)),
        shape = RoundedCornerShape(12.dp),
        color = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF9CA3AF),
                    fontSize = 9.sp
                )
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                TextField(
                    value = value,
                    onValueChange = onValueChange,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = unit,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF9CA3AF),
                        fontSize = 10.sp
                    )
                )
            }
        }
    }
}

@Composable
private fun FrequencyChip(
    days: String,
    desc: String,
    isSelected: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) AuthRoyalBlue else Color(0xFFF9FAFC))
            .border(
                width = 1.dp,
                color = if (isSelected) AuthRoyalBlue else Color(0xFFE5E7EB),
                shape = RoundedCornerShape(10.dp)
            )
            .clickable { onSelect() }
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Column {
            Text(
                text = days,
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = if (isSelected) Color.White else Color(0xFF1F2937)
                )
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = desc,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    color = if (isSelected) Color.White.copy(alpha = 0.85f) else Color(0xFF6B7280)
                )
            )
        }
    }
}
