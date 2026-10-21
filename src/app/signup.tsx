import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/tailor-storage';

export default function SignupScreen() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  
  async function signup() {
    const cleanShop = shopName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanShop || !cleanEmail || password.length < 6) {
      Alert.alert(
        'Details incomplete',
        'Shop/tailor name, email aur kam az kam 6 characters ka password enter karein.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Email check karein', 'Valid email address enter karein.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password match nahi', 'Dono passwords same hone chahiye.');
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            shop_name: cleanShop,
          },
        },
      });

      if (error) {
        Alert.alert('Signup nahi hua', error.message);
        return;
      }

      if (!data.user) {
        Alert.alert('Signup nahi hua', 'Dobara try karein.');
        return;
      }

     if (!data.session) {
  Alert.alert(
    'Signup complete nahi hua',
    'Account bana hai, lekin session nahi mila. Supabase mein Confirm email setting check karein.'
  );
  return;
}
      await setSession({
        tailorId: data.user.id,
        shopName: cleanShop,
        email: cleanEmail,
      });

      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Signup error',
        error instanceof Error ? error.message : 'Dobara try karein.'
      );
    } finally {
      setBusy(false);
    }
  }


  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><Text style={styles.brandIcon}>✂</Text><Text style={styles.brandTitle}>TailorDesk</Text><Text style={styles.brandSub}>Aapki dukaan, aapka data</Text></View>
      <View style={styles.card}><Text style={styles.title}>Create tailor account</Text><Text style={styles.subtitle}>Har tailor ka apna alag customer aur order record.</Text>
        <Text style={styles.label}>Tailor / Shop name</Text><TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="e.g. Huzaifa Tailors" autoCapitalize="words" />
        <Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Password (minimum 6 characters)</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create password" secureTextEntry />
        <Text style={styles.label}>Confirm password</Text><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter password again" secureTextEntry />
        <Pressable disabled={busy} style={[styles.primary, busy && { opacity: 0.6 }]} onPress={signup}><Text style={styles.primaryText}>{busy ? 'Creating account...' : 'Sign up'}</Text></Pressable>
        <Pressable style={styles.linkButton} onPress={() => router.replace('/login')}><Text style={styles.link}>Already have an account? Log in</Text></Pressable>
      </View>
      <Text style={styles.foot}>Offline account setup · Cloud sync requires setup</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F4F6FB'},wrap:{flexGrow:1,justifyContent:'center',padding:22,width:'100%',maxWidth:540,alignSelf:'center'},brand:{alignItems:'center',marginBottom:25},brandIcon:{width:56,height:56,textAlign:'center',textAlignVertical:'center',overflow:'hidden',borderRadius:18,backgroundColor:'#243C8F',color:'#fff',fontSize:29},brandTitle:{fontSize:25,fontWeight:'900',color:'#172033',marginTop:10},brandSub:{fontSize:13,color:'#778197',marginTop:4},card:{backgroundColor:'#fff',borderRadius:22,padding:22,borderWidth:1,borderColor:'#E7EAF1'},title:{fontSize:22,fontWeight:'900',color:'#172033'},subtitle:{fontSize:13,color:'#7A8599',lineHeight:19,marginTop:6,marginBottom:13},label:{fontSize:12,fontWeight:'800',color:'#344054',marginTop:13,marginBottom:6},input:{borderWidth:1,borderColor:'#DDE3ED',borderRadius:11,paddingHorizontal:13,paddingVertical:12,color:'#172033',backgroundColor:'#FCFDFE'},primary:{backgroundColor:'#243C8F',borderRadius:12,padding:14,alignItems:'center',marginTop:22},primaryText:{color:'#fff',fontWeight:'900',fontSize:14},linkButton:{alignItems:'center',padding:13},link:{color:'#243C8F',fontWeight:'800',fontSize:12},foot:{textAlign:'center',fontSize:11,color:'#929BAD',marginTop:17}});
