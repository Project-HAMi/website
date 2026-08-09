export function isChinese(locale) {
  return locale.startsWith("zh");
}

export function pick(locale, obj) {
  return isChinese(locale) && obj.zh ? obj.zh : obj.en;
}
