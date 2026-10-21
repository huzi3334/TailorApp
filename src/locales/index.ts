
import ur from './ur';

export const translations = {
  ur,
};

export type Language = keyof typeof translations;

export function t(key: keyof typeof ur): string {
  return translations.ur[key];
}
