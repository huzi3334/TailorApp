
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../lib/language';
import { supabase } from '../lib/supabase';
import { getScopedProfileKey, getScopedStorageKey } from '../lib/tailor-storage';

type Customer = { id: string; name: string; phone: string; city: string; notes: string; createdAt: string };
const STORAGE_KEY = '@tailor_app_customers_v1';
const emptyForm = { name: '', phone: '', city: '', notes: '' };


// Login ke baad Supabase session restore hone ke liye thora wait karein.
async function getActiveSupabaseUser() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('Supabase session check failed:', error.message);
    }

    if (data.session?.user) {
      return data.session.user;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 400));
  }

  return null;
}

export default function CustomersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useFocusEffect(useCallback(() => { void loadCustomers(); }, []));

 async function loadCustomers() {
  try {
    const scopedKey = await getScopedStorageKey(STORAGE_KEY);
    const saved = await AsyncStorage.getItem(scopedKey);

    let localList: Customer[] = [];

    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        localList = parsed as Customer[];
      }
    }

    // Pehle local data foran screen par dikhayein
    setCustomers(localList);
    setLoading(false);

    // Backup ko sirf pehli baar banayein
    const backupKey = `${scopedKey}::pre_cloud_backup`;
    if (saved && !(await AsyncStorage.getItem(backupKey))) {
      await AsyncStorage.setItem(backupKey, saved);
    }

    // Photos background mein load karein
    void (async () => {
      const photos: Record<string, string> = {};

      await Promise.all(
        localList.map(async customer => {
          try {
            const key = await getScopedProfileKey(customer.id);
            const profile = await AsyncStorage.getItem(key);

            if (profile) {
              const data = JSON.parse(profile);
              if (typeof data.photo === 'string' && data.photo) {
                photos[customer.id] = data.photo;
              }
            }
          } catch {}
        })
      );

      setProfilePhotos(photos);
    })();

    // Cloud sync background mein; screen ko wait nahi karna
    void syncCustomersInBackground(scopedKey);
  } catch (error) {
    console.error('Customer loading failed:', error);
    setLoading(false);

    Alert.alert(
      t('Error', 'خرابی'),
      t(
        'Customers could not be loaded.',
        'گاہکوں کا ریکارڈ لوڈ نہیں ہو سکا۔'
      )
    );
  }
}

async function syncCustomersInBackground(scopedKey: string) {
  try {
    const user = await getActiveSupabaseUser();

    if (!user) {
      console.warn(
        'Customer cloud sync skipped: No active Supabase session after waiting. Please log in again.'
      );
      return;
    }

    console.log('Customer upload session: SESSION FOUND', user.id);

    const { data: cloudRow, error } = await supabase
      .from('tailor_sync_data')
      .select('data')
      .eq('user_id', user.id)
      .eq('data_key', STORAGE_KEY)
      .maybeSingle();

    if (error) {
      console.warn('Customer cloud read failed:', error.message);
      return;
    }

    // Sync ke waqt latest local data dobara parhein
    const latestSaved = await AsyncStorage.getItem(scopedKey);
    let latestLocal: Customer[] = [];

    if (latestSaved) {
      const parsed: unknown = JSON.parse(latestSaved);
      if (Array.isArray(parsed)) latestLocal = parsed as Customer[];
    }

    const cloudList: Customer[] =
      cloudRow && Array.isArray(cloudRow.data)
        ? (cloudRow.data as Customer[])
        : [];
        
const deletedKey = `${scopedKey}_deleted_ids`;

const localDeletedRaw = await AsyncStorage.getItem(deletedKey);
const localDeletedIds: string[] = localDeletedRaw
  ? JSON.parse(localDeletedRaw)
  : [];

const { data: deletedRow, error: deletedError } = await supabase
  .from('tailor_sync_data')
  .select('data')
  .eq('user_id', user.id)
  .eq('data_key', `${STORAGE_KEY}_deleted_ids`)
  .maybeSingle();

if (deletedError) {
  console.warn('Deleted customer IDs read failed:', deletedError.message);
}

const cloudDeletedIds: string[] = Array.isArray(deletedRow?.data)
  ? deletedRow.data
  : [];

const deletedIds = [...new Set([...localDeletedIds, ...cloudDeletedIds])];

await AsyncStorage.setItem(deletedKey, JSON.stringify(deletedIds));

const deletedSet = new Set(deletedIds);


    const merged = new Map<string, Customer>();

    for (const c of cloudList) {
      if (c && typeof c.id === 'string') merged.set(c.id, c);
    }

    // Local records ko priority dein, taake local edits na khoein
    for (const c of latestLocal) {
      if (c && typeof c.id === 'string') merged.set(c.id, c);
    }

    const finalList = Array.from(merged.values()).filter(
  c => !deletedSet.has(c.id)
);

    await AsyncStorage.setItem(scopedKey, JSON.stringify(finalList));
    setCustomers(finalList);

    const { error: uploadError } = await supabase
      .from('tailor_sync_data')
      .upsert(
        {
          user_id: user.id,
          data_key: STORAGE_KEY,
          data: finalList,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,data_key' }
      );

    if (uploadError) {
      console.warn('Customer cloud sync failed:', uploadError.message);
    }
  } catch (error) {
    console.warn('Background customer sync failed:', error);
  }
}

  async function saveCustomers(updated: Customer[]) {
  try {
    const scopedKey = await getScopedStorageKey(STORAGE_KEY);

    // Pehle device par save karein
    await AsyncStorage.setItem(scopedKey, JSON.stringify(updated));
    setCustomers(updated);

    // Cloud upload background mein karein
    void (async () => {
      try {
        const user = await getActiveSupabaseUser();

        if (!user) {
          console.warn(
            'Customer cloud save skipped: No active Supabase session after waiting. Customer is saved on this device; please log in again to sync it.'
          );
          return;
        }

        const { error } = await supabase
          .from('tailor_sync_data')
          .upsert(
            {
              user_id: user.id,
              data_key: STORAGE_KEY,
              data: updated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,data_key' }
          );

        if (error) {
  console.warn('Customer cloud save failed:', error.message);
} else {
  console.log('Customer uploaded to Supabase successfully.');
}
      } catch (error) {
        console.warn('Customer background upload failed:', error);
      }
    })();

    return true;
  } catch (error) {
    console.error('Customer save failed:', error);

    Alert.alert(
      t('Storage error', 'محفوظ کرنے میں خرابی'),
      t('Customer could not be saved.', 'گاہک کا ریکارڈ محفوظ نہیں ہوسکا۔')
    );

    return false;
  }
}
  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEditForm(c: Customer) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      city: c.city || '',
      notes: c.notes || '',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      Alert.alert(
        t('Name required', 'نام ضروری ہے'),
        t('Please enter the customer name.', 'براہِ کرم گاہک کا نام لکھیں۔')
      );
      return;
    }

    if (!phone) {
      Alert.alert(
        t('Phone required', 'فون نمبر ضروری ہے'),
        t('Please enter the customer phone number.', 'براہِ کرم گاہک کا فون نمبر لکھیں۔')
      );
      return;
    }

    const updated = editingId
      ? customers.map(c =>
          c.id === editingId
            ? { ...c, ...form, name, phone, city: form.city.trim(), notes: form.notes.trim() }
            : c
        )
      : [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            phone,
            city: form.city.trim(),
            notes: form.notes.trim(),
            createdAt: new Date().toISOString(),
          },
          ...customers,
        ];

    if (await saveCustomers(updated)) {
      setModalVisible(false);
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  
async function deleteCustomer(id: string) {
  try {
    const scopedKey = await getScopedStorageKey(STORAGE_KEY);
    const deletedKey = `${scopedKey}_deleted_ids`;

    const saved = await AsyncStorage.getItem(deletedKey);
    const previousIds: string[] = saved ? JSON.parse(saved) : [];
    const deletedIds = [...new Set([...previousIds, id])];

    await AsyncStorage.setItem(deletedKey, JSON.stringify(deletedIds));

    const updated = customers.filter(c => c.id !== id);
    await AsyncStorage.setItem(scopedKey, JSON.stringify(updated));
    setCustomers(updated);

    const user = await getActiveSupabaseUser();

    if (!user) {
      Alert.alert(
        'Cloud sync unavailable',
        'Customer device se delete ho gaya, lekin cloud par sync nahi hua. Dobara login karke phir try karein.'
      );
      return;
    }

    const { error } = await supabase.from('tailor_sync_data').upsert(
      {
        user_id: user.id,
        data_key: `${STORAGE_KEY}_deleted_ids`,
        data: deletedIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,data_key' }
    );

    if (error) {
      console.warn('Deleted customer sync failed:', error.message);
      Alert.alert('Sync warning', 'Customer delete ho gaya, lekin cloud sync nahi hua. Internet check karein.');
    }
  } catch (error) {
    console.error('Customer delete failed:', error);
    Alert.alert('Error', 'Customer delete nahi ho saka. Dobara try karein.');
  }
}


  function confirmDelete(c: Customer) {
    const message = t(
      `Delete ${c.name} from the customer list? Profile data will be kept.`,
      `کیا ${c.name} کو گاہکوں کی فہرست سے حذف کرنا ہے؟ پروفائل کا ڈیٹا محفوظ رہے گا۔`
    );

    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) void deleteCustomer(c.id);
      return;
    }

    Alert.alert(
      t('Delete customer', 'گاہک حذف کریں'),
      message,
      [
        { text: t('Cancel', 'منسوخ کریں'), style: 'cancel' },
        {
          text: t('Delete', 'حذف کریں'),
          style: 'destructive',
          onPress: () => void deleteCustomer(c.id),
        },
      ]
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = customers.filter(
    c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.city || '').toLowerCase().includes(query)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
  style={styles.backButton}
  onPress={() => router.replace('/')}
>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>{t('Customers', 'گاہک')}</Text>
          <Text style={styles.subtitle}>
            {t("Manage your shop's customers", 'اپنی دکان کے گاہکوں کا انتظام کریں')}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{customers.length}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search name, phone or city...', 'نام، فون یا شہر تلاش کریں...')}
            placeholderTextColor="#8993A5"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('Customer list', 'گاہکوں کی فہرست')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t(`${filtered.length} customer(s) found`, `${filtered.length} گاہک ملے`)}
            </Text>
          </View>

          <Pressable style={styles.addButton} onPress={openAddForm}>
            <Text style={styles.addButtonText}>{t('+ Add', '+ شامل کریں')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <Text style={styles.message}>
            {t('Loading customers...', 'گاہکوں کا ریکارڈ لوڈ ہو رہا ہے...')}
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={filtered.length ? styles.customerList : styles.emptyList}
            renderItem={({ item }) => (
              <View style={styles.customerCard}>
                {profilePhotos[item.id] ? (
                  <Image source={{ uri: profilePhotos[item.id] }} style={styles.avatarPhoto} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.customerInfo}>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/customer-profile', params: { id: item.id } })
                    }
                  >
                    <Text style={styles.customerName}>{item.name}</Text>
                  </Pressable>

                  <Text style={styles.customerPhone}>{item.phone}</Text>
                  {!!item.city && <Text style={styles.customerCity}>⌖ {item.city}</Text>}
                  {!!item.notes && <Text style={styles.customerNotes}>{item.notes}</Text>}

                  <Pressable
                    style={styles.openProfile}
                    onPress={() =>
                      router.push({ pathname: '/customer-profile', params: { id: item.id } })
                    }
                  >
                    <Text style={styles.openProfileText}>
                      {t('Open customer profile', 'گاہک کا پروفائل کھولیں')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.actions}>
                  <Pressable style={styles.editButton} onPress={() => openEditForm(item)}>
                    <Text style={styles.editText}>{t('Edit', 'ترمیم')}</Text>
                  </Pressable>

                  <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                    <Text style={styles.deleteText}>{t('Delete', 'حذف کریں')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👔</Text>
                <Text style={styles.emptyTitle}>
                  {search
                    ? t('No matching customers', 'کوئی گاہک نہیں ملا')
                    : t('No customers yet', 'ابھی کوئی گاہک موجود نہیں')}
                </Text>
                <Text style={styles.emptyText}>
                  {search
                    ? t(
                        'Try another name, phone number or city.',
                        'کسی دوسرے نام، فون نمبر یا شہر سے تلاش کریں۔'
                      )
                    : t(
                        'Add your first customer to start managing measurements and orders.',
                        'ناپ اور آرڈرز کا ریکارڈ رکھنے کے لیے اپنا پہلا گاہک شامل کریں۔'
                      )}
                </Text>

                {!search && (
                  <Pressable style={styles.addButton} onPress={openAddForm}>
                    <Text style={styles.addButtonText}>
                      {t('+ Add first customer', '+ پہلا گاہک شامل کریں')}
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? t('Edit customer', 'گاہک میں ترمیم کریں') : t('Add customer', 'گاہک شامل کریں')}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {t(
                    "Enter the customer's details below.",
                    'گاہک کی تفصیلات نیچے درج کریں۔'
                  )}
                </Text>
              </View>

              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('Full name *', 'پورا نام *')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('e.g. Muhammad Ali', 'مثلاً محمد علی')}
                value={form.name}
                onChangeText={name => setForm(p => ({ ...p, name }))}
                maxLength={100}
              />

              <Text style={styles.label}>{t('Phone number *', 'فون نمبر *')}</Text>
              <TextInput
                style={styles.input}
                placeholder="03XXXXXXXXX"
                value={form.phone}
                onChangeText={phone => setForm(p => ({ ...p, phone }))}
                keyboardType="phone-pad"
                maxLength={25}
              />

              <Text style={styles.label}>{t('City', 'شہر')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('e.g. Swabi', 'مثلاً صوابی')}
                value={form.city}
                onChangeText={city => setForm(p => ({ ...p, city }))}
                maxLength={80}
              />

              <Text style={styles.label}>{t('Notes (optional)', 'اضافی نوٹس (اختیاری)')}</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder={t('Any special instructions...', 'کوئی خاص ہدایت لکھیں...')}
                value={form.notes}
                onChangeText={notes => setForm(p => ({ ...p, notes }))}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingId
                    ? t('Save changes', 'تبدیلیاں محفوظ کریں')
                    : t('Save customer', 'گاہک محفوظ کریں')}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>{t('Cancel', 'منسوخ کریں')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, gap: 11 },
  backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E7ECFA', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, lineHeight: 34, color: '#243C8F' },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#172033' },
  subtitle: { fontSize: 12, color: '#7A8599', marginTop: 4 },
  countBadge: { minWidth: 40, height: 40, borderRadius: 13, backgroundColor: '#243C8F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
  countText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E9F1', borderRadius: 13, paddingHorizontal: 12, marginBottom: 17, minHeight: 47 },
  searchIcon: { fontSize: 22, color: '#7A8599', marginRight: 7 },
  searchInput: { flex: 1, paddingVertical: 11, color: '#172033', fontSize: 13 },
  clearText: { color: '#7A8599', padding: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#172033' },
  sectionSubtitle: { fontSize: 12, color: '#7A8599', marginTop: 4 },
  addButton: { backgroundColor: '#243C8F', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  customerList: { paddingBottom: 26, gap: 10 },
  customerCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: '#EAECEF', flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#E0EAFE', alignItems: 'center', justifyContent: 'center' },
  avatarPhoto: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#E0EAFE' },
  avatarText: { color: '#243C8F', fontWeight: '900', fontSize: 17 },
  customerInfo: { flex: 1, gap: 4 },
  customerName: { color: '#172033', fontSize: 14, fontWeight: '800' },
  customerPhone: { color: '#4D5B73', fontSize: 12 },
  customerCity: { color: '#7A8599', fontSize: 11 },
  customerNotes: { color: '#7A8599', fontSize: 11, lineHeight: 15 },
  openProfile: { alignSelf: 'flex-start', backgroundColor: '#DDF7E8', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, marginTop: 4 },
  openProfileText: { color: '#167647', fontSize: 10, fontWeight: '800' },
  actions: { gap: 6, alignItems: 'flex-end' },
  editButton: { backgroundColor: '#E7ECFA', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  editText: { color: '#243C8F', fontSize: 11, fontWeight: '800' },
  deleteButton: { backgroundColor: '#FDE8E7', paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8 },
  deleteText: { color: '#B42318', fontSize: 11, fontWeight: '800' },
  emptyList: { flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#172033' },
  emptyText: { textAlign: 'center', color: '#7A8599', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 17 },
  message: { color: '#7A8599', textAlign: 'center', marginTop: 35 },
  modalOverlay: { flex: 1, backgroundColor: '#10182880', justifyContent: 'center', padding: 14 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 19, width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 17 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#172033' },
  modalSubtitle: { fontSize: 12, color: '#7A8599', marginTop: 4 },
  closeButton: { fontSize: 19, color: '#7A8599', padding: 5 },
  label: { color: '#344054', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 11 },
  input: { borderWidth: 1, borderColor: '#DDE3ED', backgroundColor: '#FBFCFE', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: '#172033' },
  notesInput: { minHeight: 78 },
  saveButton: { backgroundColor: '#243C8F', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  cancelButton: { padding: 12, alignItems: 'center', marginTop: 3, marginBottom: 6 },
  cancelText: { color: '#667085', fontWeight: '700', fontSize: 13 },
});
