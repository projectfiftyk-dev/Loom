import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { isOnboardingDone, setOnboardingDone } from './src/state/progress';
import { OnboardingContext } from './src/context/onboarding';
import ContinueTabButton from './src/components/ContinueTabButton';

import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import GoalScreen from './src/screens/GoalScreen';
import LanguagePickScreen from './src/screens/LanguagePickScreen';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import PathDetailScreen from './src/screens/PathDetailScreen';
import ModuleDetailScreen from './src/screens/ModuleDetailScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import CharacterChatScreen from './src/screens/CharacterChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export { OnboardingContext, useOnboarding } from './src/context/onboarding';

// ── Param lists ───────────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  Welcome: undefined;
  Auth: { mode: 'login' | 'register' };
  Goal: { userName?: string } | undefined;
  LanguagePick: { userName?: string } | undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  _Continue: undefined;
  Explore: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  PathDetail: { pathId: string };
  ModuleDetail: { pathId: string; moduleId: string };
  Reader: { bookId: string };
  CharacterChat: { bookId: string; characterId: string };
};

// Kept for backwards-compat with ReaderScreen / LibraryScreen
export type RootStackParamList = MainStackParamList;

// ── Navigators ────────────────────────────────────────────────────────────────
const OnboardingNav = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();
const MainNav = createNativeStackNavigator<MainStackParamList>();

// Placeholder screen — never actually shown (middle tab button intercepts)
function NullScreen() { return null; }

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1C30',
          borderTopColor: 'rgba(139,135,184,0.15)',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#8B87B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          }
          if (route.name === 'Explore') {
            return <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />;
          }
          if (route.name === 'Profile') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="_Continue"
        component={NullScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: () => <ContinueTabButton />,
        }}
      />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <MainNav.Navigator screenOptions={{ headerShown: false }}>
      <MainNav.Screen name="Tabs" component={MainTabs} />
      <MainNav.Screen name="PathDetail" component={PathDetailScreen} />
      <MainNav.Screen name="ModuleDetail" component={ModuleDetailScreen} />
      <MainNav.Screen name="Reader" component={ReaderScreen} options={{ animation: 'fade' }} />
      <MainNav.Screen name="CharacterChat" component={CharacterChatScreen} options={{ animation: 'slide_from_right' }} />
    </MainNav.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setDone] = useState(false);

  useEffect(() => {
    isOnboardingDone().then(done => {
      setDone(done);
      setReady(true);
    });
  }, []);

  const completeOnboarding = async () => {
    await setOnboardingDone();
    setDone(true);
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0C0B1A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <OnboardingContext.Provider value={{ completeOnboarding }}>
        <NavigationContainer>
          {onboardingDone ? (
            <MainStack />
          ) : (
            <OnboardingNav.Navigator screenOptions={{ headerShown: false }}>
              <OnboardingNav.Screen name="Welcome" component={WelcomeScreen} />
              <OnboardingNav.Screen name="Auth" component={AuthScreen} />
              <OnboardingNav.Screen name="Goal" component={GoalScreen} />
              <OnboardingNav.Screen name="LanguagePick" component={LanguagePickScreen} />
            </OnboardingNav.Navigator>
          )}
        </NavigationContainer>
      </OnboardingContext.Provider>
    </SafeAreaProvider>
  );
}
