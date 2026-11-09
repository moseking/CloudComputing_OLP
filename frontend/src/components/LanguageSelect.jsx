import React from 'react';
import { Languages } from 'lucide-react';
import { t, useLanguage } from '../lib/i18n.js';

export default function LanguageSelect() {
  const { locale, setLocale } = useLanguage();
  return (
    <label className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-2 text-xs text-navy">
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('Ngôn ngữ giao diện')}</span>
      <select
        aria-label={t('Ngôn ngữ giao diện')}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="min-h-6 min-w-0 cursor-pointer bg-transparent text-xs font-semibold outline-none"
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
