chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'bilal:count' || !sender.tab?.id) return
  const tabId = sender.tab.id
  const text = message.count > 0 ? String(message.count) : ''
  chrome.action.setBadgeText({ tabId, text })
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#3b4fe0' })
})

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'copy-selected-links') return
  const target = tab?.id ? tab : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
  if (!target?.id) return
  try {
    await chrome.tabs.sendMessage(target.id, { type: 'bilal:copy' })
  } catch {
    // Not an Icons8 tab — nothing to copy.
  }
})
