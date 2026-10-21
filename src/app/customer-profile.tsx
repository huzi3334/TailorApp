import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, Image,
  Platform,
  Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../lib/language';
import { supabase } from '../lib/supabase';
import { getScopedProfileKey, getScopedStorageKey } from '../lib/tailor-storage';
type Customer = { id: string; name: string; phone: string; city: string; notes: string; createdAt: string };
type DressType = 'Shalwar' | 'Qameez' | 'Shirt' | 'Kurta';
type Unit = 'in' | 'cm';
type FieldInfo = { key: string; en: string; ur: string; text?: boolean };
type MeasurementRecord = { id: string; dress: DressType; unit: Unit; values: Record<string, string>; notes: string; createdAt: string; updatedAt?: string };
type Payment = { id: string; amount: number; date: string; note: string };
type Order = { id: string; category: string; total: number; paid: number; remaining: number; deliveryDate: string; createdAt: string; paymentHistory: Payment[] };

const CUSTOMERS_KEY = '@tailor_app_customers_v1';
const ORDERS_STORAGE_KEY = '@tailor_app_orders_v1';
const DRESSES: DressType[] = ['Shalwar', 'Qameez', 'Shirt', 'Kurta'];
const FIELDS: Record<DressType, FieldInfo[]> = {
  Qameez: [
    { key: 'length', en: 'Length', ur: 'لمبائی' }, { key: 'shoulder', en: 'Shoulder', ur: 'تیرا' },
    { key: 'chest', en: 'Chest', ur: 'چھاتی' }, { key: 'waist', en: 'Waist', ur: 'کمر' },
    { key: 'seat', en: 'Hip / Seat', ur: 'ہپ / گولائی' }, { key: 'sleeve', en: 'Sleeve length', ur: 'بازو کی لمبائی' },
    { key: 'sherwani', en: 'Sherwani', ur: 'شیروانی' },
    { key: 'cuffLength', en: 'Cuff Length', ur: 'کف کی لمبائی' },
    { key: 'cuffHeight', en: 'Cuff Height', ur: 'کف کی اونچائی' },
    { key: 'morai', en: 'Morai', ur: 'موری' }, { key: 'neck', en: 'Neck / Gala', ur: 'گلا' },
    { key: 'collarHeight', en: 'Collar height', ur: 'کالر کی اونچائی' }, { key: 'daman', en: 'Daman round', ur: 'دامن کی گولائی' },
    { key: 'pattiLength', en: 'Patti length', ur: 'پٹی کی لمبائی' }, { key: 'pattiWidth', en: 'Patti width', ur: 'پٹی کی چوڑائی' },
    { key: 'pocketSize', en: 'Pocket size', ur: 'جیب کا سائز' }, { key: 'pocketPosition', en: 'Pocket position', ur: 'جیب کی جگہ', text: true },
  ],
  Kurta: [
    { key: 'length', en: 'Length', ur: 'لمبائی' }, { key: 'shoulder', en: 'Shoulder', ur: 'تیرا' },
    { key: 'chest', en: 'Chest', ur: 'چھاتی' }, { key: 'waist', en: 'Waist', ur: 'کمر' },
    { key: 'seat', en: 'Hip / Seat', ur: 'ہپ / گولائی' }, { key: 'sleeve', en: 'Sleeve length', ur: 'بازو کی لمبائی' },
    { key: 'morai', en: 'Morai', ur: 'موری' }, { key: 'neck', en: 'Neck / Gala', ur: 'گلا' },
    { key: 'collarHeight', en: 'Collar height', ur: 'کالر کی اونچائی' }, { key: 'daman', en: 'Daman round', ur: 'دامن کی گولائی' },
    { key: 'pattiLength', en: 'Patti length', ur: 'پٹی کی لمبائی' }, { key: 'pattiWidth', en: 'Patti width', ur: 'پٹی کی چوڑائی' },
    { key: 'pocketSize', en: 'Pocket size', ur: 'جیب کا سائز' }, { key: 'pocketPosition', en: 'Pocket position', ur: 'جیب کی جگہ', text: true },
  ],
  Shirt: [
    { key: 'length', en: 'Length', ur: 'لمبائی' }, { key: 'shoulder', en: 'Shoulder', ur: 'تیرا' },
    { key: 'chest', en: 'Chest', ur: 'چھاتی' }, { key: 'waist', en: 'Waist', ur: 'کمر' },
    { key: 'seat', en: 'Hip / Seat', ur: 'ہپ / گولائی' }, { key: 'sleeve', en: 'Sleeve length', ur: 'بازو کی لمبائی' },
    { key: 'collarLength', en: 'Collar length', ur: 'کالر کی لمبائی' }, { key: 'collarHeight', en: 'Collar height', ur: 'کالر کی اونچائی' },
    { key: 'cuff', en: 'Cuff width', ur: 'کف کی چوڑائی' }, { key: 'bottom', en: 'Bottom width', ur: 'نیچے کی چوڑائی' },
    { key: 'pocketSize', en: 'Pocket size', ur: 'جیب کا سائز' }, { key: 'pocketPosition', en: 'Pocket position', ur: 'جیب کی جگہ', text: true },
  ],
  Shalwar: [
    { key: 'length', en: 'Length', ur: 'لمبائی' }, { key: 'waist', en: 'Waist', ur: 'کمر' },
    { key: 'seat', en: 'Hip / Seat', ur: 'ہپ / گولائی' }, { key: 'thigh', en: 'Thigh width', ur: 'ران کی چوڑائی' },
    { key: 'knee', en: 'Knee width', ur: 'گھٹنے کی چوڑائی' }, { key: 'paicha', en: 'Paicha', ur: 'پائنچہ' },
    { key: 'pocketLength', en: 'Pocket length', ur: 'جیب کی لمبائی' }, { key: 'pocketPosition', en: 'Pocket position', ur: 'جیب کی جگہ', text: true },
    { key: 'waistband', en: 'Waistband', ur: 'کمر بند' }, { key: 'style', en: 'Style / pleats', ur: 'سٹائل / پلیٹس', text: true },
  ],
};

export default function CustomerProfileScreen() {
    const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [profileKey, setProfileKey] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [photo, setPhoto] = useState('');
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dress, setDress] = useState<DressType>('Qameez');
  const [unit, setUnit] = useState<Unit>('in');
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [category, setCategory] = useState('Shalwar Qameez');
  const [totalPrice, setTotalPrice] = useState('');
  const [advance, setAdvance] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

    useEffect(() => {
    let active = true;

    async function loadLocalProfile() {
      try {
        if (!customerId) {
          setMessage('Customer ID nahi mili. Customers list se profile kholein.');
          return;
        }

        const customerKey = await getScopedStorageKey(CUSTOMERS_KEY);
        const scopedProfileKey = await getScopedProfileKey(customerId);
        const ordersKey = await getScopedStorageKey(ORDERS_STORAGE_KEY);

        const customerJson = await AsyncStorage.getItem(customerKey);
        const list: Customer[] = customerJson ? JSON.parse(customerJson) : [];
        const found = list.find(c => c.id === customerId);

        if (!found) {
          setMessage('Customer nahi mila. Customers list se dobara kholein.');
          return;
        }

        const saved = await AsyncStorage.getItem(scopedProfileKey);
        let data: any = saved ? JSON.parse(saved) : {};

        // Purane global orders ko migrate karne ka existing behavior
        if (!Array.isArray(data.orders)) {
          const oldJson = await AsyncStorage.getItem(ordersKey);
          const oldOrders = oldJson ? JSON.parse(oldJson) : [];

          const matching = Array.isArray(oldOrders)
            ? oldOrders.filter(
                (o: any) =>
                  String(o.customerName || '').trim().toLowerCase() ===
                  found.name.trim().toLowerCase()
              )
            : [];

          if (matching.length) {
            data.orders = matching.map((o: any) => {
              const total = Number(o.total) || 0;
              const paid = Number(o.paid) || 0;

              return {
                id: String(o.id || `${Date.now()}-${Math.random()}`),
                category: String(o.category || 'Shalwar Qameez'),
                total,
                paid,
                remaining: Math.max(0, total - paid),
                deliveryDate: String(o.deliveryDate || ''),
                createdAt: String(o.createdAt || new Date().toISOString()),
                paymentHistory: Array.isArray(o.paymentHistory)
                  ? o.paymentHistory
                  : paid > 0
                    ? [{
                        id: `legacy-${o.id}`,
                        amount: paid,
                        date: String(o.createdAt || 'Previous payment'),
                        note: 'Existing payment',
                      }]
                    : [],
              };
            });
          }
        }

        // Purane measurement format ko preserve karein
        if (!Array.isArray(data.records)) {
          const oldValues: Record<string, string> = {};

          [
            'chest', 'waist', 'hips', 'shoulder',
            'sleeve', 'shirtLength', 'trouserLength', 'neck',
          ].forEach(key => {
            if (
              data[key] !== undefined &&
              data[key] !== null &&
              String(data[key]).trim() !== ''
            ) {
              oldValues[key] = String(data[key]);
            }
          });

          if (Object.keys(oldValues).length) {
            data.records = [{
              id: `legacy-${Date.now()}`,
              dress: 'Qameez',
              unit: 'in',
              values: oldValues,
              notes: data.notes || 'Previous measurements',
              createdAt: new Date().toISOString(),
            }];
          }
        }

        // Local data pehle save aur display karein
        await AsyncStorage.setItem(scopedProfileKey, JSON.stringify({
          photo: data.photo || '',
          records: Array.isArray(data.records) ? data.records : [],
          orders: Array.isArray(data.orders) ? data.orders : [],
        }));

       if (!active) return;

        setProfileKey(scopedProfileKey);
        setCustomer(found);
        setPhoto(typeof data.photo === 'string' ? data.photo : '');
        setRecords(Array.isArray(data.records) ? data.records : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setLoading(false);

        // Cloud ka kaam background mein chalega
        void syncProfileInBackground(scopedProfileKey, data, () => active);
      } catch (error) {
        console.warn('Local profile load failed:', error);
        if (active) {
          setMessage('Profile load nahi ho saka.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLocalProfile();

    return () => {
      active = false;
    };
  }, [customerId]);

  async function syncProfileInBackground(
  scopedProfileKey: string,
  initialData: any,
  isActive: () => boolean
) {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) return;

      const dataKey = `profile:${customerId}`;

      const { data: cloudRow, error } = await supabase
        .from('tailor_sync_data')
        .select('data')
        .eq('user_id', authData.user.id)
        .eq('data_key', dataKey)
        .maybeSingle();

      if (error) {
        console.warn('Profile cloud load failed:', error.message);
        return;
      }

      // Sync ke waqt local data dobara parhein
      const latestSaved = await AsyncStorage.getItem(scopedProfileKey);
      const local: any = latestSaved ? JSON.parse(latestSaved) : initialData;
      const cloud: any = cloudRow?.data || {};
      
const deletedRecordIds: string[] = [
  ...new Set([
    ...(Array.isArray(local.deletedRecordIds)
      ? local.deletedRecordIds
      : []),
    ...(Array.isArray(cloud.deletedRecordIds)
      ? cloud.deletedRecordIds
      : []),
  ]),
];

const deletedRecordIdSet = new Set(deletedRecordIds);

const deletedOrderIds: string[] = [
  ...new Set([
    ...(Array.isArray(local.deletedOrderIds)
      ? local.deletedOrderIds
      : []),
    ...(Array.isArray(cloud.deletedOrderIds)
      ? cloud.deletedOrderIds
      : []),
  ]),
];

const deletedOrderIdSet = new Set(deletedOrderIds);



      
const localRecords: MeasurementRecord[] =
  (Array.isArray(local.records) ? local.records : [])
    .filter((r: MeasurementRecord) => !deletedRecordIdSet.has(r.id));

const cloudRecords: MeasurementRecord[] =
  (Array.isArray(cloud.records) ? cloud.records : [])
    .filter((r: MeasurementRecord) => !deletedRecordIdSet.has(r.id));


     


const recordMap = new Map<string, MeasurementRecord>();

cloudRecords.forEach(r => {
  recordMap.set(r.id, r);
});

localRecords.forEach(r => {
  const cloudRecord = recordMap.get(r.id);

  if (!cloudRecord) {
    recordMap.set(r.id, r);
    return;
  }

  const cloudTime = new Date(
    cloudRecord.updatedAt || cloudRecord.createdAt || 0
  ).getTime();

  const localTime = new Date(
    r.updatedAt || r.createdAt || 0
  ).getTime();

  if (localTime > cloudTime) {
    recordMap.set(r.id, r);
  }
});


     
const localOrders: Order[] =
  (Array.isArray(local.orders) ? local.orders : [])
    .filter((o: Order) => !deletedOrderIdSet.has(o.id));

const cloudOrders: Order[] =
  (Array.isArray(cloud.orders) ? cloud.orders : [])
    .filter((o: Order) => !deletedOrderIdSet.has(o.id));


    
const orderMap = new Map<string, Order>();

cloudOrders.forEach(o => orderMap.set(o.id, o));

localOrders.forEach(o => {
  const cloudOrder = orderMap.get(o.id);

  if (!cloudOrder) {
    orderMap.set(o.id, o);
    return;
  }

  const cloudPayments = cloudOrder.paymentHistory || [];
  const localPayments = o.paymentHistory || [];
  const paymentMap = new Map<string, Payment>();

  cloudPayments.forEach(p => paymentMap.set(p.id, p));
  localPayments.forEach(p => paymentMap.set(p.id, p));

  const paymentHistory = Array.from(paymentMap.values());
  const paid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  orderMap.set(o.id, {
    ...cloudOrder,
    ...o,
    paid,
    remaining: Math.max(0, o.total - paid),
    paymentHistory,
  });
});


      const merged = {
        ...cloud,
        ...local,
        photo: local.photo || cloud.photo || '',
        records: Array.from(recordMap.values()),
        deletedRecordIds,
        orders: Array.from(orderMap.values()),
        deletedOrderIds,
      };

      await AsyncStorage.setItem(
        scopedProfileKey,
        JSON.stringify(merged)
      );

     if (!isActive()) return;

      setPhoto(merged.photo || '');
      setRecords(merged.records);
      setOrders(merged.orders);

      const { error: uploadError } = await supabase
        .from('tailor_sync_data')
        .upsert(
          {
            user_id: authData.user.id,
            data_key: dataKey,
            data: merged,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,data_key' }
        );

      if (uploadError) {
        console.warn('Profile cloud sync failed:', uploadError.message);
      }
    } catch (error) {
      console.warn('Background profile sync failed:', error);
    }
  }


    

async function saveData(
  nextRecords = records,
  nextOrders = orders,
  nextPhoto = photo,
  nextDeletedRecordIds?: string[]
) {

  if (!profileKey) {
    throw new Error('Profile storage key not ready');
  }

  

const existingProfileRaw = await AsyncStorage.getItem(profileKey);
const existingProfile = existingProfileRaw
  ? JSON.parse(existingProfileRaw)
  : {};


const profileData = {
  photo: nextPhoto,
  records: nextRecords,
  orders: nextOrders,
  deletedRecordIds:
    nextDeletedRecordIds ?? existingProfile.deletedRecordIds ?? [],
  deletedOrderIds:
    existingProfile.deletedOrderIds ?? [],
};


  // Pehle mobile par data save hoga
  await AsyncStorage.setItem(
    profileKey,
    JSON.stringify(profileData)
  );

  // Phir cloud par save hoga
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.warn('Profile session error:', sessionError.message);
      return;
    }

    const user = sessionData.session?.user;

    if (!user) {
      console.warn('Profile cloud save skipped: No active login');
      return;
    }

    const { error } = await supabase
      .from('tailor_sync_data')
      .upsert(
        {
          user_id: user.id,
          data_key: `profile:${customerId}`,
          data: profileData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,data_key' }
      );

    if (error) {
      console.warn('Profile cloud save failed:', error.message);
    } else {
      console.log('Profile and payment uploaded successfully.');
    }
  } catch (error) {
    console.warn('Profile cloud upload error:', error);
  }
}


  function notify(text: string) { setMessage(text); }

  async function choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission required', 'Gallery permission dein.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const next = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
      await saveData(records, orders, next); setPhoto(next); notify('Photo saved.');
    } catch { Alert.alert('Error', 'Photo save nahi hui.'); }
  }

  async function saveMeasurement() {
    if (!Object.values(values).some(v => v.trim())) { Alert.alert('Measurement required', 'Kam az kam ek measurement enter karein.'); return; }
    const now = new Date().toISOString();
   
const next = editingRecordId
  ? records.map(r =>
      r.id === editingRecordId
        ? {
            ...r,
            dress,
            unit,
            values: { ...values },
            notes: notes.trim(),
            updatedAt: now,
          }
        : r
    )
  : [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dress,
        unit,
        values: { ...values },
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
      },
      ...records,
    ];

      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, dress, unit, values: { ...values }, notes: notes.trim(), createdAt: now }, ...records];
    try {
      await saveData(next, orders); setRecords(next); setEditingRecordId(null); setValues({}); setNotes('');
      notify(editingRecordId ? 'Measurement updated.' : 'Measurement saved.');
    } catch { Alert.alert('Error', 'Measurement save nahi hui.'); }
  }

  function editMeasurement(r: MeasurementRecord) {
    setEditingRecordId(r.id);
    setDress(r.dress);
    setUnit(r.unit);
    setValues({ ...r.values });
    setNotes(r.notes);

    setOpenSections(prev => ({
      ...prev,
      measurements: true,
      measurementHistory: false,
    }));

    notify('Purani measurement edit karne ke liye load ho gayi.');
  }

  

async function deleteMeasurement(id: string) {
  const performDelete = async () => {
    const next = records.filter(r => r.id !== id);

    try {
      const saved = await AsyncStorage.getItem(profileKey);
      const savedData = saved ? JSON.parse(saved) : {};

      const deletedRecordIds: string[] = [
        ...new Set([
          ...(Array.isArray(savedData.deletedRecordIds)
            ? savedData.deletedRecordIds
            : []),
          id,
        ]),
      ];

      await saveData(next, orders, photo, deletedRecordIds);
      setRecords(next);

      if (editingRecordId === id) {
        setEditingRecordId(null);
        setValues({});
        setNotes('');
      }

      notify('Measurement deleted.');
    } catch (error) {
      console.error('Delete measurement failed:', error);
      if (Platform.OS === 'web') {
        window.alert('Measurement delete nahi hui. Dobara try karein.');
      } else {
        Alert.alert('Error', 'Measurement delete nahi hui. Dobara try karein.');
      }
    }
  };

  if (Platform.OS === 'web') {
    if (window.confirm('Kya aap is measurement ko delete karna chahte hain?')) {
      await performDelete();
    }
    return;
  }

  Alert.alert(
    'Delete measurement',
    'Kya aap is measurement ko delete karna chahte hain?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: performDelete },
    ]
  );
}

  async function saveOrder() {
    const total = Number(totalPrice);
    const paid = advance.trim() ? Number(advance) : 0;
    if (!totalPrice.trim() || !Number.isFinite(total) || total <= 0) { Alert.alert('Invalid total', 'Total price sahi enter karein.'); return; }
    if (!Number.isFinite(paid) || paid < 0 || paid > total) { Alert.alert('Invalid advance', 'Advance total se zyada nahi ho sakta.'); return; }
    const now = new Date().toISOString();
    const order: Order = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, category, total, paid, remaining: total - paid,
      deliveryDate: deliveryDate.trim(), createdAt: now,
      paymentHistory: paid > 0 ? [{ id: `payment-${Date.now()}`, amount: paid, date: new Date().toLocaleString(), note: 'Advance payment' }] : [],
    };
    const next = [order, ...orders];
    try { await saveData(records, next); setOrders(next); setTotalPrice(''); setAdvance(''); setDeliveryDate(''); notify('Order saved.'); }
    catch { Alert.alert('Error', 'Order save nahi hua.'); }
  }

  async function addPayment(orderId: string) {
    const amount = Number(paymentInputs[orderId]);
    const order = orders.find(o => o.id === orderId);
    if (!order || !Number.isFinite(amount) || amount <= 0) { Alert.alert('Invalid payment', 'Payment ki sahi amount likhein.'); return; }
    if (amount > order.remaining) { Alert.alert('Invalid payment', `Sirf Rs. ${order.remaining} baqi hain.`); return; }
    const payment: Payment = { id: `payment-${Date.now()}`, amount, date: new Date().toLocaleString(), note: 'Additional payment' };
    const next = orders.map(o => o.id === orderId ? { ...o, paid: o.paid + amount, remaining: Math.max(0, o.total - o.paid - amount), paymentHistory: [...(o.paymentHistory || []), payment] } : o);
    try { await saveData(records, next); setOrders(next); setPaymentInputs(p => ({ ...p, [orderId]: '' })); notify('Payment added; balance updated.'); }
    catch { Alert.alert('Error', 'Payment save nahi hui.'); }
  }

  

async function deleteOrder(orderId: string) {
  const performDelete = async () => {
    const next = orders.filter(o => o.id !== orderId);

    try {
      const saved = await AsyncStorage.getItem(profileKey);
      const savedData = saved ? JSON.parse(saved) : {};

      const deletedOrderIds: string[] = [
        ...new Set([
          ...(Array.isArray(savedData.deletedOrderIds)
            ? savedData.deletedOrderIds
            : []),
          orderId,
        ]),
      ];

      await saveData(
        records,
        next,
        photo,
        undefined
      );

      const updatedProfile = {
        ...(JSON.parse(
          (await AsyncStorage.getItem(profileKey)) || '{}'
        )),
        deletedOrderIds,
      };

      await AsyncStorage.setItem(
        profileKey,
        JSON.stringify(updatedProfile)
      );

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (user) {
        const { error } = await supabase
          .from('tailor_sync_data')
          .upsert(
            {
              user_id: user.id,
              data_key: `profile:${customerId}`,
              data: updatedProfile,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,data_key' }
          );

        if (error) {
          throw error;
        }
      }

      setOrders(next);
      notify('Order deleted.');
    } catch (error) {
      console.error('Delete order failed:', error);

      if (Platform.OS === 'web') {
        window.alert('Order delete/sync nahi hua. Dobara try karein.');
      } else {
        Alert.alert('Error', 'Order delete/sync nahi hua. Dobara try karein.');
      }
    }
  };

  const message =
    'Kya aap is order ko delete karna chahte hain? Payment history bhi is order ke saath delete hogi.';

  if (Platform.OS === 'web') {
    if (window.confirm(message)) {
      await performDelete();
    }
    return;
  }

  Alert.alert('Delete order', message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: performDelete,
    },
  ]);
}

 
function field(info: FieldInfo) {
  return (
    <View style={styles.field} key={info.key}>
      <Text style={styles.label}>{t(info.en, info.ur)}</Text>
      <TextInput
        style={styles.input}
        value={values[info.key] || ''}
        onChangeText={v =>
          setValues(p => ({ ...p, [info.key]: v }))
        }
        placeholder={
          info.text
            ? t('Enter details', 'تفصیل درج کریں')
            : t(`e.g. 12 ${unit}`, `مثلاً 12 ${unit}`)
        }
        placeholderTextColor="#98A2B3"
        keyboardType={info.text ? 'default' : 'decimal-pad'}
      />
    </View>
  );
}

  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        


<Pressable
  style={styles.backButton}
  
onPress={() => router.replace('/customers')}

>
  <Text>{t('‹ Back to Customers', '‹ گاہکوں پر واپس جائیں')}</Text>
</Pressable>


        {loading ? (
          <Text style={styles.message}>{t('Loading profile...', 'پروفائل لوڈ ہو رہی ہے...')}</Text>
        ) : !customer ? (
          <Text style={styles.message}>
            {message || t('Customer not found.', 'گاہک نہیں ملا۔')}
          </Text>
        ) : (
          <>
            <View style={styles.card}>
              <Pressable style={styles.photoArea} onPress={choosePhoto}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoIcon}>+</Text>
                    <Text style={styles.photoLabel}>{t('Add photo', 'تصویر شامل کریں')}</Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerDetail}>
                {customer.phone}{customer.city ? ` • ${customer.city}` : ''}
              </Text>
              {!!customer.notes && (
                <Text style={styles.customerDetail}>{customer.notes}</Text>
              )}
              <Text style={styles.smallHint}>
                {t('Tap the photo to select a customer photo.', 'گاہک کی تصویر منتخب کرنے کے لیے تصویر پر ٹیپ کریں۔')}
              </Text>
            </View>

            <View style={styles.sectionButtons}>
              {[
                {
                  key: 'measurements',
                  title: t('Measurements', 'ناپ'),
                  subtitle: t('Add new measurements', 'نیا ناپ شامل کریں'),
                },
                {
                  key: 'measurementHistory',
                  title: `${t('Measurement History', 'ناپ کی سابقہ تفصیل')} (${records.length})`,
                  subtitle: t('View previous measurements', 'پرانے ناپ دیکھیں'),
                },
                {
                  key: 'orders',
                  title: `${t('Orders & Payments', 'آرڈر اور ادائیگیاں')} (${orders.length})`,
                  subtitle: t('Orders, delivery and remaining payments', 'آرڈر، ڈیلیوری اور باقی رقم'),
                },
              ].map(section => (
                <Pressable
                  key={section.key}
                  style={[
                    styles.sectionButton,
                    openSections[section.key] && styles.sectionButtonActive,
                  ]}
                  onPress={() =>
                    setOpenSections(prev => ({
                      ...prev,
                      [section.key]: !prev[section.key],
                    }))
                  }
                >
                  <View style={styles.sectionButtonTextWrap}>
                    <Text
                      style={[
                        styles.sectionButtonTitle,
                        openSections[section.key] && styles.sectionButtonTitleActive,
                      ]}
                    >
                      {section.title}
                    </Text>
                    <Text style={styles.sectionButtonSubtitle}>{section.subtitle}</Text>
                  </View>
                  <Text
                    style={[
                      styles.sectionChevron,
                      openSections[section.key] && styles.sectionButtonTitleActive,
                    ]}
                  >
                    {openSections[section.key] ? '−' : '+'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {openSections.measurements && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('Measurements', 'ناپ')}</Text>
                <Text style={styles.label}>{t('Dress type', 'لباس کی قسم')}</Text>
                <View style={styles.optionRow}>
                  {DRESSES.map(d => (
                    <Pressable
                      key={d}
                      style={[styles.option, dress === d && styles.optionActive]}
                      onPress={() => {
                        setDress(d);
                        setValues({});
                      }}
                    >
                      <Text style={[styles.optionText, dress === d && styles.optionTextActive]}>
                        {t(d, d === 'Shalwar' ? 'شلوار' : d === 'Qameez' ? 'قمیض' : d === 'Shirt' ? 'شرٹ' : 'کرتا')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>{t('Unit', 'پیمائش کی اکائی')}</Text>
                <View style={styles.optionRow}>
                  {(['in', 'cm'] as Unit[]).map(u => (
                    <Pressable
                      key={u}
                      style={[styles.option, unit === u && styles.optionActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.optionText, unit === u && styles.optionTextActive]}>
                        {u === 'in' ? t('Inches', 'انچ') : t('Centimeters', 'سینٹی میٹر')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.fieldsGrid}>{FIELDS[dress].map(field)}</View>

                <Text style={styles.label}>{t('Extra instructions', 'اضافی ہدایات')}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('Style, fabric or other instructions...', 'سٹائل، کپڑے یا دیگر ہدایات...')}
                  multiline
                />

                <Pressable style={styles.primaryButton} onPress={saveMeasurement}>
                  <Text style={styles.buttonText}>
                    {editingRecordId
                      ? t('Update measurement', 'ناپ اپ ڈیٹ کریں')
                      : t('Save measurement', 'ناپ محفوظ کریں')}
                  </Text>
                </Pressable>

                {editingRecordId && (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      setEditingRecordId(null);
                      setValues({});
                      setNotes('');
                    }}
                  >
                    <Text style={styles.secondaryText}>{t('Cancel edit', 'ترمیم منسوخ کریں')}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {openSections.measurementHistory && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t('Measurement history', 'ناپ کی سابقہ تفصیل')} ({records.length})
                </Text>
                {records.length === 0 ? (
                  <Text style={styles.smallHint}>
                    {t('No measurements saved yet.', 'ابھی تک کوئی ناپ محفوظ نہیں ہوا۔')}
                  </Text>
                ) : (
                  records.map(r => (
                    <View style={styles.historyItem} key={r.id}>
                      <Text style={styles.historyTitle}>
                        {t(r.dress, r.dress === 'Shalwar' ? 'شلوار' : r.dress === 'Qameez' ? 'قمیض' : r.dress === 'Shirt' ? 'شرٹ' : 'کرتا')}
                        {' · '}
                        {r.unit === 'in' ? t('Inches', 'انچ') : t('Centimeters', 'سینٹی میٹر')}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(r.createdAt).toLocaleString()}
                      </Text>
                      <View style={styles.savedValues}>
                        {Object.entries(r.values).map(([k, v]) => {
                          const info = FIELDS[r.dress]?.find(f => f.key === k);
                          return (
                            <Text key={k} style={styles.savedValue}>
                              {info ? t(info.en, info.ur) : k}: {v}
                            </Text>
                          );
                        })}
                      </View>
                      {!!r.notes && (
                        <Text style={styles.smallHint}>
                          {t('Notes', 'نوٹس')}: {r.notes}
                        </Text>
                      )}
                      <View style={styles.actionRow}>
                        <Pressable style={styles.smallButton} onPress={() => editMeasurement(r)}>
                          <Text style={styles.secondaryText}>{t('Edit / reuse', 'ترمیم / دوبارہ استعمال')}</Text>
                        </Pressable>
                        <Pressable style={styles.dangerButton} onPress={() => deleteMeasurement(r.id)}>
                          <Text style={styles.dangerText}>{t('Delete', 'حذف کریں')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {openSections.orders && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('Orders & payments', 'آرڈر اور ادائیگیاں')}</Text>
                <Text style={styles.smallHint}>
                  {t(
                    'Orders, delivery and payments are saved in this customer profile.',
                    'آرڈر، ڈیلیوری اور ادائیگیاں اسی گاہک کی پروفائل میں محفوظ ہوں گی۔'
                  )}
                </Text>

                <Text style={styles.label}>{t('Clothes category', 'لباس کی قسم')}</Text>
                <View style={styles.optionRow}>
                  {['Shalwar Qameez', 'Shirt', 'Kurta'].map(c => (
                    <Pressable
                      key={c}
                      style={[styles.option, category === c && styles.optionActive]}
                      onPress={() => setCategory(c)}
                    >
                      <Text style={[styles.optionText, category === c && styles.optionTextActive]}>
                        {t(c, c === 'Shalwar Qameez' ? 'شلوار قمیض' : c === 'Shirt' ? 'شرٹ' : 'کرتا')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>{t('Total price (Rs.)', 'کل قیمت (روپے)')}</Text>
                <TextInput
                  style={styles.input}
                  value={totalPrice}
                  onChangeText={setTotalPrice}
                  keyboardType="decimal-pad"
                  placeholder={t('e.g. 2500', 'مثلاً 2500')}
                />

                <Text style={styles.label}>{t('Advance payment (Rs.)', 'ایڈوانس رقم (روپے)')}</Text>
                <TextInput
                  style={styles.input}
                  value={advance}
                  onChangeText={setAdvance}
                  keyboardType="decimal-pad"
                  placeholder={t('e.g. 1000 (optional)', 'مثلاً 1000 (اختیاری)')}
                />

                <Text style={styles.label}>{t('Delivery date', 'ڈیلیوری کی تاریخ')}</Text>
                <TextInput
                  style={styles.input}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.smallHint}>
                  {t('Remaining balance', 'باقی رقم')}: Rs. {Math.max(0, (Number(totalPrice) || 0) - (Number(advance) || 0))}
                </Text>

                <Pressable style={styles.primaryButton} onPress={saveOrder}>
                  <Text style={styles.buttonText}>{t('Save order', 'آرڈر محفوظ کریں')}</Text>
                </Pressable>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  {t('Order history', 'آرڈرز کی سابقہ تفصیل')} ({orders.length})
                </Text>

                {orders.length === 0 ? (
                  <Text style={styles.smallHint}>
                    {t('No orders saved yet.', 'ابھی تک کوئی آرڈر محفوظ نہیں ہوا۔')}
                  </Text>
                ) : (
                  orders.map(o => (
                    <View style={styles.historyItem} key={o.id}>
                      <Text style={styles.historyTitle}>
                        {t(o.category, o.category === 'Shalwar Qameez' ? 'شلوار قمیض' : o.category === 'Shirt' ? 'شرٹ' : o.category === 'Kurta' ? 'کرتا' : o.category)}
                      </Text>
                      <Text style={styles.historyDate}>
                        {t('Created', 'تاریخ')} : {new Date(o.createdAt).toLocaleDateString()}
                      </Text>

                      <View style={styles.orderGrid}>
                        <Text style={styles.orderText}>{t('Total', 'کل')}: Rs. {o.total}</Text>
                        <Text style={styles.orderText}>{t('Paid', 'ادا شدہ')}: Rs. {o.paid}</Text>
                        <Text style={[styles.orderText, o.remaining > 0 ? styles.dueText : styles.paidText]}>
                          {t('Due', 'باقی')}: Rs. {o.remaining}
                        </Text>
                        <Text style={styles.orderText}>
                          {t('Delivery', 'ڈیلیوری')}: {o.deliveryDate || t('Not set', 'متعین نہیں')}
                        </Text>
                      </View>

                      {o.remaining > 0 && (
                        <>
                          <Text style={styles.label}>{t('Receive payment (Rs.)', 'وصول شدہ رقم (روپے)')}</Text>
                          <TextInput
                            style={styles.input}
                            value={paymentInputs[o.id] || ''}
                            onChangeText={v => setPaymentInputs(p => ({ ...p, [o.id]: v }))}
                            keyboardType="decimal-pad"
                            placeholder={t('Enter amount received', 'وصول شدہ رقم درج کریں')}
                          />
                          <Pressable style={styles.primaryButton} onPress={() => addPayment(o.id)}>
                            <Text style={styles.buttonText}>{t('Add payment', 'ادائیگی شامل کریں')}</Text>
                          </Pressable>
                        </>
                      )}

                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setShowHistory(p => ({ ...p, [o.id]: !p[o.id] }))}
                      >
                        <Text style={styles.secondaryText}>
                          {showHistory[o.id]
                            ? t('Hide payment history', 'ادائیگیوں کی تفصیل چھپائیں')
                            : t('View payment history', 'ادائیگیوں کی تفصیل دیکھیں')}
                          {' '}({(o.paymentHistory || []).length})
                        </Text>
                      </Pressable>

                      {showHistory[o.id] && (
                        <View style={styles.historyBox}>
                          {(o.paymentHistory || []).length === 0 ? (
                            <Text style={styles.smallHint}>
                              {t('No payments recorded.', 'ابھی کوئی ادائیگی درج نہیں۔')}
                            </Text>
                          ) : (
                            o.paymentHistory.map(p => (
                              <View key={p.id} style={styles.paymentRow}>
                                <Text style={styles.orderText}>
                                  {t(p.note, p.note === 'Advance payment' ? 'ایڈوانس ادائیگی' : p.note === 'Additional payment' ? 'اضافی ادائیگی' : p.note)}
                                  {' · '}{p.date}
                                </Text>
                                <Text style={styles.paidText}>Rs. {p.amount}</Text>
                              </View>
                            ))
                          )}
                        </View>
                      )}

                      <Pressable style={styles.dangerButton} onPress={() => deleteOrder(o.id)}>
                        <Text style={styles.dangerText}>{t('Delete order', 'آرڈر حذف کریں')}</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}

            {!!message && <Text style={styles.message}>{message}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  content: { padding: 14, paddingBottom: 40, width: '100%', maxWidth: 850, alignSelf: 'center' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#E7ECFA', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, marginBottom: 14 },
  backText: { color: '#243C8F', fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E8EBF2', marginBottom: 13 },
  sectionButtons: { gap: 9, marginBottom: 13 },
  sectionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: '#E1E6EF' },
  sectionButtonActive: { borderColor: '#243C8F', backgroundColor: '#F1F4FF' },
  sectionButtonTextWrap: { flex: 1 },
  sectionButtonTitle: { color: '#172033', fontSize: 14, fontWeight: '900' },
  sectionButtonTitleActive: { color: '#243C8F' },
  sectionButtonSubtitle: { color: '#7A8599', fontSize: 11, marginTop: 3 },
  sectionChevron: { fontSize: 24, fontWeight: '700', color: '#243C8F', paddingHorizontal: 5 },
  photoArea: { alignSelf: 'center', marginBottom: 10 },
  photo: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#E7ECFA' },
  photoPlaceholder: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#E7ECFA', alignItems: 'center', justifyContent: 'center' },
  photoIcon: { fontSize: 27, color: '#243C8F', fontWeight: '700' }, photoLabel: { fontSize: 11, color: '#243C8F', fontWeight: '700' },
  customerName: { textAlign: 'center', fontSize: 21, fontWeight: '900', color: '#172033' },
  customerDetail: { textAlign: 'center', color: '#667085', marginTop: 4, fontSize: 12 },
  sectionTitle: { color: '#172033', fontSize: 18, fontWeight: '900' },
  label: { color: '#344054', fontSize: 12, fontWeight: '800', marginBottom: 5, marginTop: 11 },
  smallHint: { color: '#7A8599', fontSize: 12, marginTop: 7, marginBottom: 5, lineHeight: 17 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3 },
  option: { borderWidth: 1, borderColor: '#DDE3ED', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  optionActive: { backgroundColor: '#243C8F', borderColor: '#243C8F' },
  optionText: { color: '#344054', fontSize: 12, fontWeight: '700' }, optionTextActive: { color: '#FFFFFF' },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 7 },
  field: { flexGrow: 1, flexBasis: 145, maxWidth: '49%', marginTop: 3 },
  input: { borderWidth: 1, borderColor: '#DDE3ED', backgroundColor: '#FBFCFE', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#172033', minHeight: 40 },
  notesInput: { minHeight: 65, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#243C8F', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  secondaryButton: { backgroundColor: '#E7ECFA', padding: 10, borderRadius: 9, alignItems: 'center', marginTop: 9 },
  secondaryText: { color: '#243C8F', fontWeight: '800', fontSize: 12 },
  historyItem: { borderWidth: 1, borderColor: '#E1E6EF', borderRadius: 11, padding: 11, marginTop: 10, backgroundColor: '#FBFCFE' },
  historyTitle: { color: '#172033', fontSize: 14, fontWeight: '900' }, historyDate: { color: '#7A8599', fontSize: 11, marginTop: 3, marginBottom: 6 },
  savedValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, savedValue: { color: '#344054', fontSize: 11, backgroundColor: '#F0F3F9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 }, smallButton: { backgroundColor: '#E7ECFA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  dangerButton: { backgroundColor: '#FDE8E7', borderRadius: 8, padding: 9, alignItems: 'center', marginTop: 8 }, dangerText: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  orderGrid: { gap: 4, marginTop: 5 }, orderText: { color: '#475569', fontSize: 12, marginTop: 2 },
  dueText: { color: '#B91C1C', fontWeight: '800' }, paidText: { color: '#15803D', fontWeight: '800' },
  historyBox: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 9, marginTop: 8 }, paymentRow: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 7, gap: 3 },
  message: { color: '#167647', fontSize: 12, marginTop: 10, marginBottom: 8 },
});
