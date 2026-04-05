export function localizeLangAndTitle(prefix?: string) {
  document.documentElement.lang = browser.i18n.getUILanguage()

  if (prefix) {
    document.title = `${prefix} | ${browser.i18n.getMessage('extName')}`
  } else {
    document.title = browser.i18n.getMessage('extName')
  }
}
