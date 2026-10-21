
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../lib/language';
import { supabase } from '../lib/supabase';
import {
  clearSession,
  getSession,
  TailorSession,
} from '../lib/tailor-storage';

export default function HomeScreen() {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [session, setSession] = useState<TailorSession | null>(null);

  useEffect(() => {
    void getSession().then(setSession);
  }, []);

  
async function logout() {
  const confirmed =
    Platform.OS === 'web'
      ? window.confirm(
          t(
            'Do you want to log out of your account?',
            'کیا آپ اپنے اکاؤنٹ سے لاگ آؤٹ کرنا چاہتے ہیں؟'
          )
        )
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('Log out', 'لاگ آؤٹ'),
            t(
              'Do you want to log out of your account?',
              'کیا آپ اپنے اکاؤنٹ سے لاگ آؤٹ کرنا چاہتے ہیں؟'
            ),
            [
              {
                text: t('Cancel', 'منسوخ کریں'),
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: t('Log out', 'لاگ آؤٹ'),
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
          );
        });

  if (!confirmed) return;
await supabase.auth.signOut();
  await clearSession();
  router.replace('/login');
}

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F6FB"
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.eyebrow}>
              TAILORDESK · WORKSPACE
            </Text>

            <Text style={styles.heading}>
              {t('Assalam-o-Alaikum 👋', 'السلام علیکم 👋')}
            </Text>

            <Text style={styles.subheading}>
              {session?.shopName ||
                t('Your tailoring shop', 'آپ کی درزی کی دکان')}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Change language', 'زبان تبدیل کریں')}
              onPress={() =>
                setLanguage(language === 'en' ? 'ur' : 'en')
              }
              style={styles.languageSwitch}
            >
              <Text
                style={[
                  styles.languageOption,
                  language === 'en' && styles.languageActive,
                ]}
              >
                EN
              </Text>

              <View style={styles.languageDivider} />

              <Text
                style={[
                  styles.languageOption,
                  language === 'ur' && styles.languageActive,
                ]}
              >
                اردو
              </Text>
            </Pressable>

            <Pressable
              style={styles.logout}
              onPress={logout}
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>
                {t('Log out', 'لاگ آؤٹ')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>
            {t(
              'YOUR SHOP, ORGANIZED',
              'آپ کی دکان، منظم انداز میں'
            )}
          </Text>

          <Text style={styles.bannerTitle}>
            {t(
              'Every stitch.\nEvery customer.',
              'ہر سلائی۔\nہر گاہک۔'
            )}
          </Text>

          <Text style={styles.bannerText}>
            {t(
              'Customers, measurements, orders and payments — all in one place.',
              'گاہکوں، ناپ، آرڈرز اور ادائیگیوں کا مکمل ریکارڈ ایک ہی جگہ۔'
            )}
          </Text>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {t(
                'Offline data enabled on this device',
                'ڈیٹا اس ڈیوائس پر محفوظ ہے'
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('Your workspace', 'آپ کا ورک اسپیس')}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.customerButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.replace('/customers' as any)}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>👥</Text>
          </View>

          <View style={styles.customerText}>
            <Text style={styles.buttonTitle}>
              {t('Customers', 'گاہک')}
            </Text>

            <Text style={styles.buttonSub}>
              {t(
                'Profiles, photos, measurements, orders and payments',
                'پروفائل، تصاویر، ناپ، آرڈرز اور ادائیگیاں'
              )}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            {t(
              'Everything stays in one place',
              'ہر چیز ایک ہی جگہ'
            )}
          </Text>

          <Text style={styles.noteText}>
            {t(
              'Open a customer profile to add measurements, view previous records, create orders, update payments and check remaining dues.',
              'گاہک کا پروفائل کھول کر نیا ناپ درج کریں، پچھلا ریکارڈ دیکھیں، آرڈر بنائیں، ادائیگی اپ ڈیٹ کریں اور باقی رقم چیک کریں۔'
            )}
          </Text>
        </View>

        <Text style={styles.footer}>
          TAILORDESK · {t('SIMPLE AND PRIVATE', 'آسان اور محفوظ')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  container: {
    padding: 20,
    paddingBottom: 35,
    width: '100%',
    maxWidth: 850,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 23,
  },
  headerInfo: {
    flex: 1,
    minWidth: 180,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.7,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 8,
  },
  heading: {
    fontSize: 23,
    fontWeight: '900',
    color: '#172033',
  },
  subheading: {
    fontSize: 13,
    color: '#748096',
    marginTop: 5,
  },
  languageSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7EF',
    borderRadius: 20,
    padding: 3,
  },
  languageOption: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: 'hidden',
    borderRadius: 16,
  },
  languageActive: {
    backgroundColor: '#243C8F',
    color: '#FFFFFF',
  },
  languageDivider: {
    width: 1,
    height: 15,
    backgroundColor: '#E3E7EF',
  },
  logout: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E7EF',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexShrink: 0,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  banner: {
    backgroundColor: '#243C8F',
    padding: 23,
    borderRadius: 23,
    marginBottom: 27,
  },
  bannerLabel: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 13,
  },
  bannerText: {
    color: '#E0E7FF',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF20',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 30,
    marginTop: 18,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#86EFAC',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#172033',
    marginBottom: 12,
  },
  customerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E6EAF2',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E0EAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 23,
  },
  customerText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#172033',
  },
  buttonSub: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A8599',
    marginTop: 4,
  },
  arrow: {
    fontSize: 30,
    color: '#243C8F',
  },
  note: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E6EAF2',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#243C8F',
  },
  noteText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#667085',
    marginTop: 7,
  },
  footer: {
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#A0A8B7',
    marginTop: 27,
  },
});
