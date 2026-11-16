// Tiny translation layer. No DOM. English is the default and the fallback for any missing key,
// so the pure library code (and its tests) keep producing English until a language is chosen.
import en from '../locales/en.js';
import es from '../locales/es.js';
import de from '../locales/de.js';
import fr from '../locales/fr.js';
import ru from '../locales/ru.js';
import zh from '../locales/zh.js';
import { readPref } from './prefs.js';

export const LOCALES = [en, es, de, fr, ru, zh];
export const LANGS = LOCALES.map(({ code, name }) => ({ code, name }));

const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));
let current = en;
let rules = new Intl.PluralRules('en');

export const isLang = (code) => BY_CODE.has(code);
export const getLang = () => current.code;

/** Switch language. Unknown codes fall back to English. */
export function setLang(code) {
  current = BY_CODE.get(code) || en;
  rules = new Intl.PluralRules(current.code);
  if (typeof document !== 'undefined') document.documentElement.lang = current.code === 'zh' ? 'zh-Hans' : current.code;
}

/** BCP 47 tag for Intl formatters. English follows the browser when it is already English (en-GB, en-US...). */
export function locale() {
  if (current.code === 'en' && typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language || '')) return navigator.language;
  return current.code === 'zh' ? 'zh-Hans' : current.code;
}

/** The saved choice, else the first browser language we have a translation for, else English. */
export function detectLang() {
  const saved = readPref('lang', null);
  if (isLang(saved)) return saved;
  const prefs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  for (const p of prefs) {
    const base = String(p || '').toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** Translate a key. {name} placeholders are filled from `vars`. */
export function t(key, vars) {
  return fill(current.strings[key] ?? en.strings[key] ?? key, vars);
}

/** Translate a counted noun phrase: tn('chat', 3) -> "3 chats", with the plural form of the language. */
export function tn(key, n) {
  const forms = current.plurals[key] || en.plurals[key];
  return fill(forms[rules.select(n)] ?? forms.other, { n });
}

/** Translate a log line the importer wrote in English; unknown text is returned as it is. */
export const tNote = (text) => current.notes[text] ?? text;
