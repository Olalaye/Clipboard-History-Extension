import { db } from '../lib/db.js';

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
          const MIN_INTERVAL = 2000; // 增加最小读取间隔为2秒，进一步减少资源消耗
          const MAX_RETRIES = 5;
          const BASE_RETRY_DELAY = 1000;
          let lastReadTime = Date.now();
          let lastReadContent = '';

          // Request clipboard permission when document is focused
          const readClipboard = async () => {
            const now = Date.now();
            if (now - lastReadTime < MIN_INTERVAL) {
              return;
            }

            let retries = 0;
            while (retries < MAX_RETRIES) {
              try {
                if (!document.hasFocus()) {
                  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, retries);
                  await new Promise(resolve => setTimeout(resolve, exponentialDelay));
                  retries++;
                  continue;
                }

                const text = await navigator.clipboard.readText();
                if (text && text !== lastReadContent && text.trim()) {
                  console.log('检测到新的剪贴板内容，发送消息...');
                  lastReadContent = text;
                  await new Promise((resolve, reject) => {
                    const sendMessageTimeout = setTimeout(() => {
                      reject(new Error('消息发送超时'));
                    }, 5000);

                    chrome.runtime.sendMessage({
                      type: 'CLIPBOARD_CHANGE',
                      data: text
                    }, (response) => {
                      clearTimeout(sendMessageTimeout);
                      if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                      } else if (!response || !response.success) {
                        reject(new Error(response?.error || '保存失败'));
                      } else {
                        resolve(response);
                      }
                    });
                  });
                }
                lastReadTime = now;
                break;
              } catch (error) {
                console.error(`读取剪贴板失败 (重试 ${retries + 1}/${MAX_RETRIES}):`, error);
                if (retries === MAX_RETRIES - 1) {
                  console.error('达到最大重试次数，放弃重试');
                }
                retries++;
                const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, retries);
                await new Promise(resolve => setTimeout(resolve, exponentialDelay));
              }
            }
          };

          // 监听页面焦点变化
          document.addEventListener('focus', readClipboard);

          // 定期检查剪贴板内容
          const checkInterval = setInterval(readClipboard, MIN_INTERVAL * 2);

          // 初始读取
          if (document.hasFocus()) {
            readClipboard();
          }

          // 清理定时器
          window.addEventListener('unload', () => {
            clearInterval(checkInterval);
          });
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
  if (message.type === 'CLIPBOARD_CHANGE') {
    console.log('收到剪贴板变更消息:', message.data);
    // 检查自动保存设置
    chrome.storage.local.get(['autoSave']).then(({ autoSave }) => {
      if (autoSave !== false) {
        return saveClipboardContent('text', message.data);
      } else {
        console.log('自动保存已关闭，跳过保存');
        return Promise.resolve();
      }
    }).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('处理剪贴板内容失败:', error);
      sendResponse({ success: false, error: error.message });
    });
  } else if (message.type === 'TOGGLE_AUTO_SAVE') {
    console.log('切换自动保存设置:', message.data);
    // 更新自动保存状态
    chrome.storage.local.set({ autoSave: message.data })
      .then(() => {
        console.log('自动保存设置已更新');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('更新自动保存设置失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  } else if (message === 'save_clipboard') {
    monitorClipboard();
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开放
});

// 定期检查剪贴板，使用更长的间隔
setInterval(monitorClipboard, 5000);

// 定期清理过期数据（保留最近30天的数据）
setInterval(async () => {
  try {
    const items = await db.getAllItems();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const expiredItems = items.filter(item => item.timestamp < thirtyDaysAgo);
    for (const item of expiredItems) {
      await db.deleteItem(item.id);
    }
    console.log(`已清理 ${expiredItems.length} 条过期数据`);
  } catch (error) {
    console.error('清理过期数据失败:', error);
  }
}, 24 * 60 * 60 * 1000); // 每24小时执行一次

// 保存剪贴板内容
async function saveClipboardContent(type, content) {
  if (!content || content.trim() === '') {
    console.log('剪贴板内容为空，跳过保存');
    return;
  }

  console.log(`保存剪贴板内容: 类型=${type}`);
  try {
    // 使用更高效的方式检查重复内容
    const latestItems = await db.getAllItems();
    const recentItems = latestItems
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // 只检查最近的10条记录
    
    const isDuplicate = recentItems.some(item => item.content === content);
    if (isDuplicate) {
      console.log('最近保存过相同内容，跳过保存');
      return;
    }

    await db.addItem({
      type,
      content,
      timestamp: Date.now(),
      source: 'clipboard'
    });
    console.log('剪贴板内容保存成功');
  } catch (error) {
    console.error('保存剪贴板内容失败:', error);
  }
}

// 数据导出
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXPORT_DATA') {
    console.log('开始导出数据...');
    db.getAllItems().then(items => {
      const jsonString = JSON.stringify(items, null, 2);
      return chrome.downloads.download({
        url: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString),
        filename: `clipboard-history-${new Date().toISOString().slice(0,10)}.json`
      });
    }).then(() => {
      console.log('数据导出成功');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('数据导出失败:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
  
  if (request.type === 'IMPORT_DATA') {
    console.log('开始导入数据...');
    (async () => {
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
    })();
    return true; // 保持消息通道开放
  }
});

// 初始化
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    indexedDB.deleteDatabase('clipboardDB');
  }
  monitorClipboard();
});