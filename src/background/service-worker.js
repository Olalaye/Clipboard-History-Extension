import { db } from '../lib/db.js';

// Track last saved content to avoid duplicates
let lastContent = '';

// Initialize clipboard monitoring
function monitorClipboard() {
  console.log('开始监控剪贴板...');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && !tab.url.startsWith('chrome://')) {
      console.log(`在标签页 ${tab.id} 上执行剪贴板监控脚本`);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          let lastReadTime = 0;
          const MIN_INTERVAL = 1000; // 最小读取间隔为1秒

          // Request clipboard permission when document is focused
          document.addEventListener('focus', async () => {
            const now = Date.now();
            if (now - lastReadTime < MIN_INTERVAL) return;
            
            console.log('页面获得焦点，尝试读取剪贴板...');
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                lastReadTime = now;
                console.log('成功读取剪贴板内容，发送消息...');
                chrome.runtime.sendMessage({
                  type: 'CLIPBOARD_CHANGE',
                  data: text
                });
              }
            } catch (error) {
              console.error('读取剪贴板失败:', error);
            }
          });

          // Also try to read when the page is already focused
          if (document.hasFocus()) {
            console.log('页面已经获得焦点，立即读取剪贴板...');
            navigator.clipboard.readText().then(text => {
              if (text) {
                console.log('成功读取剪贴板内容，发送消息...');
                chrome.runtime.sendMessage({
                  type: 'CLIPBOARD_CHANGE',
                  data: text
                });
              }
            }).catch(error => {
              console.error('读取剪贴板失败:', error);
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
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'CLIPBOARD_CHANGE') {
    console.log('收到剪贴板变更消息:', message.data);
    await saveClipboardContent('text', message.data);
  } else if (message === 'save_clipboard') {
    monitorClipboard();
  }
});

// 定期检查剪贴板
// 修改定期检查的间隔为5秒
setInterval(monitorClipboard, 5000);

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
  // 检查是否与上次保存的内容相同
  if (content === lastContent) {
    console.log('内容与上次保存的相同，跳过保存');
    return;
  }

  console.log(`保存剪贴板内容: 类型=${type}`);
  try {
    // 检查数据库中是否已存在相同内容
    const existingItems = await db.getAllItems();
    const isDuplicate = existingItems.some(item => item.content === content);
    
    if (isDuplicate) {
      console.log('数据库中已存在相同内容，跳过保存');
      return;
    }

    await db.addItem({
      type,
      content,
      timestamp: Date.now(),
      source: 'clipboard'
    });
    lastContent = content;
    console.log('剪贴板内容保存成功');
  } catch (error) {
    console.error('保存剪贴板内容失败:', error);
  }
}

// 数据导出
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'EXPORT_DATA') {
    console.log('开始导出数据...');
    try {
      const items = await db.getAllItems();
      const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: 'clipboard-history.json'
      });
      console.log('数据导出成功');
    } catch (error) {
      console.error('数据导出失败:', error);
    }
  }
  
  if (request.type === 'IMPORT_DATA') {
    console.log('开始导入数据...');
    try {
      const items = JSON.parse(request.data);
      for (const item of items) {
        await db.addItem(item);
      }
      console.log('数据导入成功');
      sendResponse({ success: true });
    } catch (error) {
      console.error('数据导入失败:', error);
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