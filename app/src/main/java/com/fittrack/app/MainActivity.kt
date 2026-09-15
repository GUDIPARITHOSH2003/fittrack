package com.fittrack.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fittrack.app.ui.navigation.FitTrackBottomNavigation
import com.fittrack.app.ui.navigation.Screen
import com.fittrack.app.ui.screens.auth.AuthViewModel
import com.fittrack.app.ui.screens.auth.IntroScreen
import com.fittrack.app.ui.screens.auth.LoginScreen
import com.fittrack.app.ui.screens.auth.SignUpScreen
import com.fittrack.app.ui.screens.nutrition.NutritionScreen
import com.fittrack.app.ui.screens.nutrition.NutritionViewModel
import com.fittrack.app.ui.screens.overview.OverviewScreen
import com.fittrack.app.ui.screens.overview.OverviewViewModel
import com.fittrack.app.ui.screens.profile.ProfileScreen
import com.fittrack.app.ui.screens.profile.ProfileViewModel
import com.fittrack.app.ui.screens.scan.ScanBottomSheet
import com.fittrack.app.ui.screens.scan.ScanViewModel
import com.fittrack.app.ui.screens.workout.WorkoutScreen
import com.fittrack.app.ui.screens.workout.WorkoutViewModel
import com.fittrack.app.ui.theme.FitTrackTheme
import com.fittrack.app.ui.theme.PrimaryBackground
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FitTrackTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Intro.route

                val isAuthRoute = currentRoute in listOf(
                    Screen.Intro.route,
                    Screen.Login.route,
                    Screen.SignUp.route
                )

                var showScanSheet by remember { mutableStateOf(false) }

                val authViewModel: AuthViewModel = hiltViewModel()
                val nutritionViewModel: NutritionViewModel = hiltViewModel()
                val workoutViewModel: WorkoutViewModel = hiltViewModel()
                val overviewViewModel: OverviewViewModel = hiltViewModel()
                val profileViewModel: ProfileViewModel = hiltViewModel()
                val scanViewModel: ScanViewModel = hiltViewModel()

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = PrimaryBackground,
                    bottomBar = {
                        if (!isAuthRoute) {
                            FitTrackBottomNavigation(
                                currentRoute = currentRoute,
                                onNavigate = { route ->
                                    if (currentRoute != route) {
                                        navController.navigate(route) {
                                            popUpTo(Screen.Nutrition.route) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                },
                                onOpenScanner = {
                                    showScanSheet = true
                                }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = if (!isAuthRoute) innerPadding.calculateBottomPadding() else 0.dp)
                    ) {
                        NavHost(
                            navController = navController,
                            startDestination = Screen.Intro.route
                        ) {
                            // Auth Flow
                            composable(Screen.Intro.route) {
                                IntroScreen(
                                    onGetStarted = {
                                        navController.navigate(Screen.Login.route)
                                    }
                                )
                            }
                            composable(Screen.Login.route) {
                                LoginScreen(
                                    viewModel = authViewModel,
                                    onNavigateToSignUp = {
                                        navController.navigate(Screen.SignUp.route)
                                    },
                                    onLoginSuccess = {
                                        navController.navigate(Screen.Nutrition.route) {
                                            popUpTo(Screen.Intro.route) {
                                                inclusive = true
                                            }
                                        }
                                    }
                                )
                            }
                            composable(Screen.SignUp.route) {
                                SignUpScreen(
                                    viewModel = authViewModel,
                                    onNavigateBackToLogin = {
                                        navController.popBackStack()
                                    },
                                    onSignUpSuccess = {
                                        navController.navigate(Screen.Nutrition.route) {
                                            popUpTo(Screen.Intro.route) {
                                                inclusive = true
                                            }
                                        }
                                    }
                                )
                            }

                            // Main App Flow
                            composable(Screen.Nutrition.route) {
                                NutritionScreen(
                                    viewModel = nutritionViewModel,
                                    onOpenScanner = { showScanSheet = true }
                                )
                            }
                            composable(Screen.Workout.route) {
                                WorkoutScreen(
                                    viewModel = workoutViewModel
                                )
                            }
                            composable(Screen.Overview.route) {
                                OverviewScreen(
                                    viewModel = overviewViewModel
                                )
                            }
                            composable(Screen.Profile.route) {
                                ProfileScreen(
                                    viewModel = profileViewModel,
                                    onLogout = {
                                        authViewModel.logOut()
                                        navController.navigate(Screen.Login.route) {
                                            popUpTo(Screen.Nutrition.route) {
                                                inclusive = true
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    }

                    if (showScanSheet) {
                        ScanBottomSheet(
                            viewModel = scanViewModel,
                            onDismiss = { showScanSheet = false },
                            onAddFoodToLog = { food ->
                                // Add scanned item directly to snack list in UI state
                                nutritionViewModel.submitNaturalLanguageMeal("${food.title} (${food.calories} kcal)")
                            }
                        )
                    }
                }
            }
        }
    }
}
