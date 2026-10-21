
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LanguageProvider } from '../lib/language';
import { getSession } from '../lib/tailor-storage';

function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const session = await getSession();

        if (!active) return;

        const isAuthScreen =
          pathname === '/login' || pathname === '/signup';

        if (!session && !isAuthScreen) {
          router.replace('/login');
        } else if (session && isAuthScreen) {
          router.replace('/');
        }
      } catch (error) {
        console.warn('Session check failed:', error);
      } finally {
        if (active) {
          setChecking(false);
          setSessionChecked(true);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking || !sessionChecked) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F4F6FB',
        }}
      >
        <ActivityIndicator size="large" color="#243C8F" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppLayout />
    </LanguageProvider>
  );
}
