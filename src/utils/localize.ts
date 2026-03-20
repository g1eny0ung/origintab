;(function localize() {
  document.documentElement.lang = browser.i18n.getUILanguage()
  document.title = browser.i18n.getMessage('extName')
})()
