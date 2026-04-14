const TAB_VOLUMES_KEY = 'tabVolumes';

async function removeTabVolume(tabId) {
  try {
    const data = await chrome.storage.session.get(TAB_VOLUMES_KEY);
    const tabVolumes = data[TAB_VOLUMES_KEY] || {};
    const tabKey = String(tabId);

    if (!(tabKey in tabVolumes)) {
      return;
    }

    delete tabVolumes[tabKey];
    await chrome.storage.session.set({ [TAB_VOLUMES_KEY]: tabVolumes });
  } catch (error) {
    console.warn('Volume Amplifier worker: no se pudo limpiar tabVolumes', error);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabVolume(tabId);
});
