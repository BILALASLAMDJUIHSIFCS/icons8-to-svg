;(() => {
  const BRIDGE = 'bilal-icons8-bridge'
  const CONTENT = 'bilal-icons8-content'
  const ORIGIN = 'https://icons8.com'
  const SELECTED_TILE = 'a.app-grid-icon--is-selected[href*="/icon/"]'
  const SELECTED_BAR = '.selected-bar'

  let storeIcons = null
  let converterUrl = ''
  let root = null
  let copyButton = null
  let openButton = null
  let lastRenderKey = ''
  let flashTimer = null
  let renderQueued = false
  let lastReportedCount = -1

  const ICON_LINK =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
  const ICON_OPEN =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const domSelection = () =>
    [...document.querySelectorAll(SELECTED_TILE)].map((tile) => {
      const url = new URL(tile.getAttribute('href'), ORIGIN)
      return { id: tile.dataset.icon || url.pathname, link: `${ORIGIN}${url.pathname}` }
    })

  function getSelectedLinks() {
    const links = new Map()
    for (const icon of storeIcons ?? []) {
      links.set(icon.id, `${ORIGIN}/icon/${encodeURIComponent(icon.id)}/${slugify(icon.slug) || 'icon'}`)
    }
    for (const icon of domSelection()) {
      if (!links.has(icon.id)) links.set(icon.id, icon.link)
    }
    return [...links.values()]
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Keyboard-shortcut copies arrive without page focus; fall back to a selection copy.
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    document.documentElement.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    if (!ok) throw new Error('Clipboard is blocked on this page.')
  }

  function toast(text) {
    let el = document.getElementById('bilal-toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'bilal-toast'
      el.className = 'bilal-toast'
      el.setAttribute('role', 'status')
      el.setAttribute('aria-live', 'polite')
      document.documentElement.appendChild(el)
    }
    el.textContent = text
    el.classList.add('bilal-toast--visible')
    clearTimeout(el._hideTimer)
    el._hideTimer = setTimeout(() => el.classList.remove('bilal-toast--visible'), 2600)
  }

  const plural = (count) => `${count} ${count === 1 ? 'link' : 'links'}`

  async function copyLinks() {
    const links = getSelectedLinks()
    if (!links.length) {
      toast('Select some icons first.')
      return 0
    }
    await writeClipboard(links.join('\n'))
    toast(`Copied ${plural(links.length)} — paste them into the converter.`)
    if (copyButton) {
      copyButton.classList.add('bilal-copy__btn--done')
      copyButton.innerHTML = `${ICON_CHECK}<span>Copied ${plural(links.length)}</span>`
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        copyButton?.classList.remove('bilal-copy__btn--done')
        lastRenderKey = ''
        render()
      }, 1800)
    }
    return links.length
  }

  async function openInConverter() {
    const links = getSelectedLinks()
    if (!links.length) return toast('Select some icons first.')
    if (!converterUrl) return toast('Set your converter URL in the Bilal extension popup.')
    await writeClipboard(links.join('\n')).catch(() => {})
    const target = new URL(converterUrl)
    target.searchParams.set('links', links.join('\n'))
    window.open(target.toString(), '_blank', 'noopener')
  }

  function buildRoot() {
    root = document.createElement('div')
    root.className = 'bilal-copy'
    root.dataset.bilal = 'true'
    for (const type of ['pointerdown', 'mousedown', 'click', 'keydown']) {
      // Keep Icons8 from treating clicks on our buttons as "click outside → clear selection".
      root.addEventListener(type, (event) => event.stopPropagation())
    }

    copyButton = document.createElement('button')
    copyButton.type = 'button'
    copyButton.className = 'bilal-copy__btn'
    copyButton.addEventListener('click', () => copyLinks().catch((error) => toast(error.message)))

    openButton = document.createElement('button')
    openButton.type = 'button'
    openButton.className = 'bilal-copy__btn bilal-copy__btn--ghost'
    openButton.title = 'Copy the links and open them in your converter'
    openButton.innerHTML = `${ICON_OPEN}<span>Convert</span>`
    openButton.addEventListener('click', () => openInConverter().catch((error) => toast(error.message)))

    root.append(copyButton, openButton)
  }

  function render() {
    renderQueued = false
    const count = getSelectedLinks().length

    if (count !== lastReportedCount) {
      lastReportedCount = count
      try {
        chrome.runtime.sendMessage({ type: 'bilal:count', count }).catch(() => {})
      } catch {
        // The extension was reloaded; this old content script can no longer reach it.
      }
    }

    if (!count) {
      root?.remove()
      lastRenderKey = ''
      return
    }

    if (!root) buildRoot()
    const bar = document.querySelector(SELECTED_BAR)
    const host = bar ?? document.body
    if (root.parentElement !== host) host.appendChild(root)
    root.classList.toggle('bilal-copy--floating', !bar)
    openButton.hidden = !converterUrl

    const key = `${count}|${!!bar}|${!!converterUrl}`
    if (key === lastRenderKey || copyButton.classList.contains('bilal-copy__btn--done')) return
    lastRenderKey = key
    copyButton.innerHTML = `${ICON_LINK}<span>Copy ${plural(count)}</span>`
    copyButton.setAttribute('aria-label', `Copy ${plural(count)} of the selected icons`)
  }

  const scheduleRender = () => {
    if (renderQueued) return
    renderQueued = true
    requestAnimationFrame(render)
  }

  new MutationObserver((mutations) => {
    if (mutations.every((m) => root && root.contains(m.target))) return
    scheduleRender()
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== BRIDGE) return
    if (event.data.type === 'selection' && Array.isArray(event.data.icons)) {
      storeIcons = event.data.icons
      scheduleRender()
    }
  })

  chrome.storage.sync.get({ converterUrl: '' }, (settings) => {
    converterUrl = settings.converterUrl || ''
    lastRenderKey = ''
    scheduleRender()
  })
  chrome.storage.onChanged.addListener((changes) => {
    if (!changes.converterUrl) return
    converterUrl = changes.converterUrl.newValue || ''
    lastRenderKey = ''
    scheduleRender()
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'bilal:get-selection') {
      sendResponse({ links: getSelectedLinks() })
      return
    }
    if (message?.type === 'bilal:copy') {
      copyLinks()
        .then((count) => sendResponse({ count }))
        .catch((error) => sendResponse({ error: error.message }))
      return true
    }
  })

  window.postMessage({ source: CONTENT, type: 'request' }, location.origin)
  scheduleRender()
})()
