import { mount } from 'svelte'
import { localizeLangAndTitle } from '~/utils/localize'

import '../common.css'
import App from './App.svelte'

localizeLangAndTitle(browser.i18n.getMessage('settings'))

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
