import { db } from '../lib/db.js';

// 监听剪贴板变化
async function monitorClipboard() {
  let lastContent = '';
  
  setInterval(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text !== lastContent) {
        lastContent = text;
        await saveClipboardContent('text', text);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, 1000);
}

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