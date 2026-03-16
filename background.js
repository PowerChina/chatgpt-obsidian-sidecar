chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-selection-to-sidecar',
    title: '发送选中文本到 Obsidian Sidecar',
    contexts: ['selection'],
    documentUrlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
  });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'send-selection-to-sidecar') return;
  if (!tab?.id) return;
  const text = info.selectionText || '';

  await chrome.storage.local.set({
    latestSelection: text,
    latestSelectionAt: Date.now(),
    latestTabUrl: tab.url || ''
  });

  await chrome.sidePanel.open({ tabId: tab.id });
  chrome.runtime.sendMessage({ type: 'SELECTION_CAPTURED' });
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === 'GET_SELECTION') {
    const data = await chrome.storage.local.get(['latestSelection', 'latestSelectionAt', 'latestTabUrl']);
    sendResponse({ ok: true, data });
    return true;
  }
});
