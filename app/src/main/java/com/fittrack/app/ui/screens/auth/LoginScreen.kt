package com.fittrack.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
fun LoginScreen(
    viewModel: AuthViewModel,
    onNavigateToSignUp: () -> Unit,
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF9FAFC))
            .padding(horizontal = 28.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(20.dp))

        // Top Brand Logo (fittrack •)
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = "fittrack",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize = 34.sp,
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

        Spacer(modifier = Modifier.height(36.dp))

        // Heading: Login to your Account
        Text(
            text = "Login to your Account",
            style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF141414)
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Elevated Email Input Card
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

        Spacer(modifier = Modifier.height(14.dp))

        // Elevated Password Input Card
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

        // Sign In Primary Button
        Button(
            onClick = { viewModel.login(onLoginSuccess) },
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
                text = if (uiState.isLoading) "Signing in..." else "Sign in",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            )
        }

        Spacer(modifier = Modifier.height(30.dp))

        // Divider: - Or sign in with -
        Text(
            text = "- Or sign in with -",
            style = MaterialTheme.typography.bodySmall.copy(
                color = Color(0xFF8E9398),
                fontWeight = FontWeight.Medium,
                fontSize = 12.sp
            )
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Google-Only Continue Button
        GoogleAuthButton(
            text = "Continue with Google",
            onClick = { viewModel.signInWithGoogle(onSuccess = onLoginSuccess) }
        )

        Spacer(modifier = Modifier.weight(1f))

        // Footer: Don't have an account? Sign up
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Don't have an account? ",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color(0xFF6B7280),
                    fontSize = 13.sp
                )
            )
            Text(
                text = "Sign up",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = AuthRoyalBlue,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                ),
                modifier = Modifier.clickable { onNavigateToSignUp() }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))
    }
}

@Composable
fun GoogleAuthButton(
    text: String = "Continue with Google",
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(50.dp)
            .shadow(elevation = 2.dp, shape = RoundedCornerShape(14.dp), spotColor = Color(0x0A000000)),
        shape = RoundedCornerShape(14.dp),
        color = Color.White
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "G",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFFEA4335),
                    fontSize = 20.sp
                )
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                    fontSize = 14.sp
                )
            )
        }
    }
}
