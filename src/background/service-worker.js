import { db } from '../lib/db.js';

// Initialize clipboard monitoring
function monitorClipboard() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && !tab.url.startsWith('chrome://')) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Request clipboard permission when document is focused
          document.addEventListener('focus', async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                chrome.runtime.sendMessage({
                  type: 'CLIPBOARD_CHANGE',
                  data: text
                });
              }
            } catch (error) {
              console.error('Failed to read clipboard:', error);
            }
          });

          // Also try to read when the page is already focused
          if (document.hasFocus()) {
            navigator.clipboard.readText().then(text => {
              if (text) {
                chrome.runtime.sendMessage({
                  type: 'CLIPBOARD_CHANGE',
                  data: text
                });
              }
            }).catch(error => {
              console.error('Failed to read clipboard:', error);
            });
          }
        }
      });
    }
  });
}

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  monitorClipboard();
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(() => {
  monitorClipboard();
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'save_clipboard') {
    monitorClipboard();
  }
});

// 定期检查剪贴板
setInterval(monitorClipboard, 1000);

// Listen for commands
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'save_clipboard') {
      monitorClipboard();
    }
  });
}

// Initialize extension
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Extension installed');
  }
});

// 保存剪贴板内容
async function saveClipboardContent(type, content) {
  await db.addItem({
    type,
    content,
    timestamp: Date.now(),
    source: 'clipboard'
  });
}

// 数据导出
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'EXPORT_DATA') {
    const items = await db.getAllItems();
    const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: 'clipboard-history.json'
    });
  }
  
  if (request.type === 'IMPORT_DATA') {
    try {
      const items = JSON.parse(request.data);
      for (const item of items) {
        await db.addItem(item);
      }
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});

// 快捷键支持
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save_clipboard') {
    monitorClipboard();
  }
});

// 初始化
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    indexedDB.deleteDatabase('clipboardDB');
  }
  monitorClipboard();
});