import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import { appFonts } from '@/theme/fonts';
import { palettes } from '@/theme/colors';
import { tamaguiConfig } from '../../tamagui.config';

SplashScreen.preventAutoHideAsync();

// During hydration React reads the server snapshot (false), then re-renders with the client one.
const noSubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [fontsLoaded, fontError] = useFonts(appFonts);
  // On web the server render can't know the color scheme or the saved progress, and
  // Tamagui only injects CSS for client renders, so the app renders after mount.
  const mounted = useSyncExternalStore(noSubscribe, isClient, isServer) || Platform.OS !== 'web';
  const ready = (fontsLoaded || fontError != null) && mounted;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palettes[scheme].board }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palettes[scheme].board }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palettes[scheme].board } }} />
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
