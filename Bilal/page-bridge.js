// Runs in the page's own JS world so it can read Icons8's Pinia store directly.
// Icons8 keeps multi-selection in a store named "selected" ({ icons: [], ids: Set }),
// which also covers icons that were selected and then scrolled out of the grid.
;(() => {
  const BRIDGE = 'bilal-icons8-bridge'
  const CONTENT = 'bilal-icons8-content'
  let store = null
  let unsubscribe = null
  let lastPayload = ''

  const findStore = () => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    return pinia?._s?.get('selected') ?? null
  }

  const serialize = () =>
    (store?.icons ?? [])
      .filter((icon) => icon && icon.id != null)
      .map((icon) => ({
        id: String(icon.id),
        slug: String(icon.commonName || icon.name || ''),
        name: String(icon.name || icon.commonName || ''),
      }))

  const post = (force = false) => {
    if (!store) return
    const icons = serialize()
    const payload = JSON.stringify(icons)
    if (!force && payload === lastPayload) return
    lastPayload = payload
    window.postMessage({ source: BRIDGE, type: 'selection', icons }, location.origin)
  }

  const attach = () => {
    const next = findStore()
    if (next === store) return
    unsubscribe?.()
    store = next
    unsubscribe = store?.$subscribe ? store.$subscribe(() => post(), { detached: true }) : null
    post(true)
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== CONTENT) return
    if (event.data.type === 'request') {
      attach()
      post(true)
    }
  })

  attach()
  // Nuxt creates the store lazily and can swap it on client navigation, so keep checking.
  setInterval(() => {
    attach()
    post()
  }, 700)
})()
