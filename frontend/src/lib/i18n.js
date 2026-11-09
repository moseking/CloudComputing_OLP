import { useSyncExternalStore } from 'react';
import catalog from './translations.json' with { type: 'json' };

const listeners = new Set();
const valid = (value) => (value === 'en' ? 'en' : 'vi');
let locale = 'vi';
try {
  locale = valid(globalThis.localStorage?.getItem('oelp.locale'));
} catch {
  /* Private browsing may restrict storage. */
}
export const getLocale = () => locale;
export function setLocale(value) {
  locale = valid(value);
  try {
    globalThis.localStorage?.setItem('oelp.locale', locale);
  } catch {
    /* The in-memory setting still works. */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  listeners.forEach((listener) => listener());
}
if (typeof window !== 'undefined') {
  document.documentElement.lang = locale;
  window.addEventListener('storage', (event) => {
    if (event.key === 'oelp.locale') setLocale(event.newValue);
  });
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLocale, () => 'vi');
  return { locale: language, setLocale };
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliases = Object.fromEntries(
  Object.values(catalog).flatMap((entry) => [
    [entry.en, entry],
    [entry.vi, entry],
  ]),
);
const patterns = Object.keys(catalog)
  .filter(
    (key) => /\{\d+\}/.test(key) && /\p{L}/u.test(key.replace(/\{\d+\}/g, '')),
  )
  .map((key) => ({
    key,
    regex: new RegExp(
      '^' +
        key
          .split(/(\{\d+\})/)
          .map((part) => (/^\{\d+\}$/.test(part) ? '(.*?)' : escapeRegex(part)))
          .join('') +
        '$',
    ),
    indices: [...key.matchAll(/\{(\d+)\}/g)].map((match) => match[1]),
  }));
export function t(value, params = {}) {
  if (typeof value !== 'string') return value;
  const key = value.trim().replace(/\s+/g, ' ');
  let entry = catalog[key] || aliases[key];
  if (!entry) {
    for (const pattern of patterns) {
      const matches = key.match(pattern.regex);
      if (!matches) continue;
      entry = catalog[pattern.key];
      params = Object.fromEntries(
        pattern.indices.map((index, position) => [
          index,
          matches[position + 1],
        ]),
      );
      break;
    }
  }
  if (!entry) return value;
  const translated = entry[locale].replace(
    /\{(\d+)\}/g,
    (placeholder, index) =>
      params[index] == null ? placeholder : String(t(params[index])),
  );
  return (
    (/^\s/.test(value) ? ' ' : '') + translated + (/\s$/.test(value) ? ' ' : '')
  );
}

const englishErrors = {
  authentication_required: 'Please sign in.',
  invalid_token:
    'Your session is invalid or has expired. Please sign in again.',
  admin_required: 'Only an Admin can perform this action.',
  email_exists: 'This email is already registered.',
  invalid_credentials: 'The email or password is incorrect.',
  validation_error: 'Please check the information you entered.',
  course_not_found: 'Course not found.',
  lesson_not_found: 'Lesson not found.',
  quiz_not_found: 'Quiz not found.',
  enrollment_required:
    'Enroll in this course before opening its lessons or quizzes.',
  payment_required: 'This course requires a simulated payment.',
  already_enrolled: 'You are already enrolled in this course.',
  invalid_answers:
    'Please answer every question using a valid option or response.',
  database_unavailable:
    'The data service is temporarily unavailable. Please try again.',
  course_service_unavailable:
    'The course service is temporarily unavailable. Please try again.',
  auth_configuration_error: 'Authentication is temporarily unavailable.',
  demo_disabled: 'Payment simulation is not enabled in this environment.',
};
export function apiErrorMessage(error = {}, status) {
  if (locale === 'vi')
    return error.message || `Không thể xử lý yêu cầu (HTTP ${status}).`;
  return (
    englishErrors[error.code] ||
    {
      400: 'The request could not be processed.',
      401: 'Please sign in again.',
      402: 'This course requires a simulated payment.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested item was not found.',
      409: 'This request conflicts with an existing record.',
      422: 'Please check the information you entered.',
      503: 'The service is temporarily unavailable. Please try again.',
    }[status] ||
    `The request could not be processed (HTTP ${status}).`
  );
}
