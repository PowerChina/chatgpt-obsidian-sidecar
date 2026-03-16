document.addEventListener('mouseup', async () => {
  const selection = window.getSelection()?.toString().trim();
  if (!selection) return;
  await chrome.storage.local.set({
    latestSelection: selection,
    latestSelectionAt: Date.now(),
    latestTabUrl: location.href
  });
});
