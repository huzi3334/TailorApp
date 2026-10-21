import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
export default function MeasurementsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/customers'); }, []);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' }}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator size="large" color="#243C8F" /></View>;
}
