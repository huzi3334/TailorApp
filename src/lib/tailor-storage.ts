import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNTS_KEY = '@tailor_app_accounts_v1';
export const SESSION_KEY = '@tailor_app_session_v1';
export type TailorAccount = { id: string; shopName: string; email: string; passwordHash: string; createdAt: string };
export type TailorSession = { tailorId: string; shopName: string; email: string };

export async function getSession(): Promise<TailorSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as TailorSession : null;
  } catch { return null; }
}

export async function setSession(session: TailorSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getScopedStorageKey(baseKey: string): Promise<string> {
  const session = await getSession();
  return session?.tailorId ? `${baseKey}::${session.tailorId}` : baseKey;
}

export async function getScopedProfileKey(customerId: string): Promise<string> {
  const session = await getSession();
  return session?.tailorId ? `@tailor_app_profile_${customerId}::${session.tailorId}` : `@tailor_app_profile_${customerId}`;
}

// First account gets existing local records migrated into its own private storage namespace.
// The original keys are intentionally retained as a safety backup.
export async function migrateLegacyDataToFirstAccount(tailorId: string) {
  const customersLegacy = '@tailor_app_customers_v1';
  const ordersLegacy = '@tailor_app_orders_v1';
  const customersScoped = `${customersLegacy}::${tailorId}`;
  const ordersScoped = `${ordersLegacy}::${tailorId}`;
  const legacyCustomers = await AsyncStorage.getItem(customersLegacy);
  if (legacyCustomers && !(await AsyncStorage.getItem(customersScoped))) {
    await AsyncStorage.setItem(customersScoped, legacyCustomers);
    try {
      const customers = JSON.parse(legacyCustomers) as Array<{id:string}>;
      for (const customer of customers) {
        const oldKey = `@tailor_app_profile_${customer.id}`;
        const newKey = `${oldKey}::${tailorId}`;
        const oldProfile = await AsyncStorage.getItem(oldKey);
        if (oldProfile && !(await AsyncStorage.getItem(newKey))) await AsyncStorage.setItem(newKey, oldProfile);
      }
    } catch { /* Keep the original data untouched if it cannot be parsed. */ }
  }
  const legacyOrders = await AsyncStorage.getItem(ordersLegacy);
  if (legacyOrders && !(await AsyncStorage.getItem(ordersScoped))) await AsyncStorage.setItem(ordersScoped, legacyOrders);
}
