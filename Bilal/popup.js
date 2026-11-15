const statusEl = document.getElementById('status')
const linksEl = document.getElementById('links')
const copyEl = document.getElementById('copy')
const openEl = document.getElementById('open')
const settingsEl = document.getElementById('settings')
const converterEl = document.getElementById('converter')

let links = []
let converterUrl = ''

const plural = (count) => `${count} ${count === 1 ? 'link' : 'links'}`

function renderLinks() {
  linksEl.value = links.join('\n')
  copyEl.disabled = links.length === 0
  openEl.disabled = links.length === 0 || !converterUrl
  copyEl.textContent = links.length ? `Copy ${plural(links.length)}` : 'Copy links'
}

async function loadSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const onIcons8 = tab?.url && /^https:\/\/(www\.)?icons8\.com\//.test(tab.url)
  if (!onIcons8) {
    statusEl.textContent = 'Open icons8.com and select some icons.'
    return renderLinks()
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'bilal:get-selection' })
    links = response?.links ?? []
    statusEl.textContent = links.length
      ? `${links.length} ${links.length === 1 ? 'icon' : 'icons'} selected on this page.`
      : 'No icons selected yet. Select icons on the grid.'
  } catch {
    statusEl.textContent = 'Reload the Icons8 tab to activate the extension.'
  }
  renderLinks()
}

copyEl.addEventListener('click', async () => {
  await navigator.clipboard.writeText(links.join('\n'))
  copyEl.textContent = `Copied ${plural(links.length)}`
  setTimeout(renderLinks, 1600)
})

openEl.addEventListener('click', async () => {
  await navigator.clipboard.writeText(links.join('\n')).catch(() => {})
  const target = new URL(converterUrl)
  target.searchParams.set('links', links.join('\n'))
  chrome.tabs.create({ url: target.toString() })
})

settingsEl.addEventListener('submit', async (event) => {
  event.preventDefault()
  const value = converterEl.value.trim()
  if (value) {
    try {
      const url = new URL(value)
      if (!/^https?:$/.test(url.protocol)) throw new Error()
    } catch {
      statusEl.textContent = 'Enter a full URL, like https://my-app.vercel.app'
      return
    }
  }
  converterUrl = value
  await chrome.storage.sync.set({ converterUrl })
  statusEl.textContent = value ? 'Converter URL saved.' : 'Converter URL cleared.'
  renderLinks()
})

chrome.storage.sync.get({ converterUrl: '' }, (settings) => {
  converterUrl = settings.converterUrl || ''
  converterEl.value = converterUrl
  loadSelection()
})
