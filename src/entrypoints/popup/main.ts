import { mount } from 'svelte'
import { localizeLangAndTitle } from '~/utils/localize'

import App from './App.svelte'
import './app.css'

localizeLangAndTitle()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
