//import './global.css';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { routes, RootStackParamList } from './src/navigation/routes';

async function initNotifications() {
  try {
    const { initNotifications: init } = await import('./src/utils/notifications');
    await init();
  } catch (error) {
    console.warn('Notifications initialization skipped:', error);
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
  },
};

const linking = {
  prefixes: ['funeralms://'],
  config: {
    screens: {
      PaymentComplete: 'payment-complete',
    },
  },
};

function Navigator() {
  const { token, booting, user } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  const allowedRoutes = routes.filter((route) => {
    if (!route.protected) return true;
    if (!token) return false;
    if (user?.status !== 'ACTIVE') {
      return route.name === 'PaymentGate' || route.name === 'PaymentComplete';
    }
    return true;
  });

  return (
    <NavigationContainer theme={theme} linking={linking}>
      <StatusBar style="dark" />

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {allowedRoutes.map((route) => (
          <Stack.Screen
            key={route.name}
            name={route.name as keyof RootStackParamList}
            component={route.component as any}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <Navigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}