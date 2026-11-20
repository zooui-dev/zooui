// errorMessage() reads the product's app.config `zooui.errorMessage` ({ extract, fallback }) whenever a call gives no
// options, wherever it is called from: a catch block in an event handler has no Nuxt context to look it up in.
import { configureErrorMessage, type ErrorMessageOptions } from '../utils/error-message'

export default defineNuxtPlugin({
  name: 'zooui:error-message',
  setup() {
    const config = useAppConfig() as { zooui?: { errorMessage?: ErrorMessageOptions } }
    configureErrorMessage(() => config.zooui?.errorMessage)
  },
})
