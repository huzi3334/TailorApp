import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/tailor-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  
async function login() {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    Alert.alert('Details required', 'Email aur password enter karein.');
    return;
  }

  setBusy(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      Alert.alert(
        'Login failed',
        error.message.includes('Email not confirmed')
          ? 'Pehle apni email verify karein.'
          : 'Email ya password check karein.'
      );
      return;
    }

    const user = data.user;

    if (!user) {
      Alert.alert('Login failed', 'User account nahi mila.');
      return;
    }

    const shopName =
      typeof user.user_metadata?.shop_name === 'string'
        ? user.user_metadata.shop_name
        : 'My Tailor Shop';

    await setSession({
      tailorId: user.id,
      shopName,
      email: user.email ?? cleanEmail,
    });

    router.replace('/');
  } catch (error) {
    Alert.alert(
      'Login error',
      error instanceof Error ? error.message : 'Dobara try karein.'
    );
  } finally {
    setBusy(false);
  }
}

  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><Text style={styles.brandIcon}>✂</Text><Text style={styles.brandTitle}>TailorDesk</Text><Text style={styles.brandSub}>Welcome back to your shop</Text></View>
      <View style={styles.card}><Text style={styles.title}>Log in</Text><Text style={styles.subtitle}>Apne tailor account mein login karein.</Text>
        <Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Password</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
        <Pressable disabled={busy} style={[styles.primary, busy && { opacity: 0.6 }]} onPress={login}><Text style={styles.primaryText}>{busy ? 'Logging in...' : 'Log in'}</Text></Pressable>
        <Pressable style={styles.linkButton} onPress={() => router.replace('/signup')}><Text style={styles.link}>New tailor? Create account</Text></Pressable>
      </View>
      <Text style={styles.foot}>Your local data stays on this device</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F4F6FB'},wrap:{flexGrow:1,justifyContent:'center',padding:22,width:'100%',maxWidth:540,alignSelf:'center'},brand:{alignItems:'center',marginBottom:25},brandIcon:{width:56,height:56,textAlign:'center',textAlignVertical:'center',overflow:'hidden',borderRadius:18,backgroundColor:'#243C8F',color:'#fff',fontSize:29},brandTitle:{fontSize:25,fontWeight:'900',color:'#172033',marginTop:10},brandSub:{fontSize:13,color:'#778197',marginTop:4},card:{backgroundColor:'#fff',borderRadius:22,padding:22,borderWidth:1,borderColor:'#E7EAF1'},title:{fontSize:22,fontWeight:'900',color:'#172033'},subtitle:{fontSize:13,color:'#7A8599',lineHeight:19,marginTop:6,marginBottom:13},label:{fontSize:12,fontWeight:'800',color:'#344054',marginTop:13,marginBottom:6},input:{borderWidth:1,borderColor:'#DDE3ED',borderRadius:11,paddingHorizontal:13,paddingVertical:12,color:'#172033',backgroundColor:'#FCFDFE'},primary:{backgroundColor:'#243C8F',borderRadius:12,padding:14,alignItems:'center',marginTop:22},primaryText:{color:'#fff',fontWeight:'900',fontSize:14},linkButton:{alignItems:'center',padding:13},link:{color:'#243C8F',fontWeight:'800',fontSize:12},foot:{textAlign:'center',fontSize:11,color:'#929BAD',marginTop:17}});
