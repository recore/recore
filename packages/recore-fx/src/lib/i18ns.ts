import { defineObxProperty } from '../obx/observable/obx-property';
import { ObxFlag } from '../obx/observable/obx';

const languageMap: { [key: string]: string } = {
  en: 'en_US',
  zh: 'zh_CN',
  zt: 'zh_TW',
  es: 'es_ES',
  pt: 'pt_PT',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  ru: 'ru_RU',
  ja: 'ja_JP',
  ko: 'ko_KR',
  ar: 'ar_SA',
  tr: 'tr_TR',
  th: 'th_TH',
  vi: 'vi_VN',
  nl: 'nl_NL',
  he: 'iw_IL',
  id: 'in_ID',
  pl: 'pl_PL',
  hi: 'hi_IN',
  uk: 'uk_UA',
  ms: 'ms_MY',
  tl: 'tl_PH',
};

const i18nsData: { [key: string]: any } = {};

let globalLocale: string = '';

export function setGlobalLocale(locale: string) {
  globalLocale = locale;
}

export function getGlobalLocale(): string {
  if (globalLocale) {
    return globalLocale;
  }

  const { g_config, navigator } = global as any;
  if (g_config) {
    if (g_config.locale) {
      globalLocale = languageMap[g_config.locale] || (g_config.locale as string);
      return globalLocale;
    }
  }

  if (navigator.language) {
    globalLocale = (navigator.language as string).replace('-', '_');
  }

  // IE10及更低版本使用browserLanguage
  if (navigator.browserLanguage) {
    const it = navigator.browserLanguage.split('-');
    globalLocale = it[0];
    if (it[1]) {
      globalLocale += '_' + it[1].toUpperCase();
    }
  }

  if (!globalLocale) {
    globalLocale = 'zh_CN';
  }

  return globalLocale;
}

interface CorpusQueryer {
  (k: string): string;
  locale: string;
  setLocale(locale: string): void;
}

export function createI18n(instKey: string, locale?: string): CorpusQueryer {
  if (locale) {
    setGlobalLocale(locale);
  } else {
    locale = getGlobalLocale();
  }

  defineObxProperty(i18nsData, instKey, {}, undefined, ObxFlag.REF);

  const injectVars = (template: string, ...rest: any[]) => {
    if (typeof template !== 'string') {
      return '';
    }
    return template.replace(/({\d+})/g, (match, $1) => {
      const index = (/\d+/.exec($1) || [])[0] as any;
      if (index && rest[index] !== undefined) {
        return rest[index];
      }
      return $1;
    });
  };

  const i18n: any = (...args: any[]): string => {
    const k = args[0];
    const str = i18nsData[instKey][k];
    if (args.length <= 1) {
      return str;
    }
    return injectVars(str, ...args.slice(1));
  };

  defineObxProperty(
    i18n,
    'locale',
    locale,
    {
      get() {
        return locale;
      },
      set(val: string) {
        locale = val;
        useLocale(locale);
      },
    },
    ObxFlag.REF,
  );

  function useLocale(locale: string) {
    if ((global as any)[instKey]) {
      i18nsData[instKey] = (global as any)[instKey][locale] || {};
    } else {
      const key = `${instKey}_${locale.replace('_', '-').toLocaleLowerCase()}`;
      i18nsData[instKey] = (global as any)[key] || {};
    }
  }

  useLocale(locale);

  i18n.setLocale = (locale: string) => {
    i18n.locale = locale;
  };

  return i18n;
}
