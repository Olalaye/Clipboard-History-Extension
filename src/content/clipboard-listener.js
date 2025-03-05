const trackClipboardChanges = () => {
  let lastValue = '';
  let lastChangeTime = Date.now();
  const MIN_INTERVAL = 1000; // 增加最小更新间隔为1秒，进一步减少资源消耗
  const MAX_RETRIES = 5;
  const BASE_RETRY_DELAY = 1000;
  
  // 使用防抖函数包装发送消息的逻辑
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const sendClipboardChange = debounce(async (newValue) => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        if (!document.hasFocus()) {
          const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, exponentialDelay));
          retries++;
          continue;
        }
        
        await new Promise((resolve, reject) => {
          const sendMessageTimeout = setTimeout(() => {
            reject(new Error('消息发送超时'));
          }, 5000);
          
          chrome.runtime.sendMessage({
            type: 'CLIPBOARD_CHANGE',
            data: newValue
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
        
        lastValue = newValue;
        lastChangeTime = Date.now();
        break;
      } catch (error) {
        console.error(`发送剪贴板内容失败 (重试 ${retries + 1}/${MAX_RETRIES}):`, error);
        if (retries === MAX_RETRIES - 1) {
          console.error('达到最大重试次数，放弃重试');
        }
        retries++;
        const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, exponentialDelay));
      }
    }
  }, MIN_INTERVAL);
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastChangeTime < MIN_INTERVAL) {
      return;
    }
    
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      const newValue = activeElement.value;
      if (newValue && newValue !== lastValue && newValue.trim()) {
        sendClipboardChange(newValue);
      }
    }
  });
  document.addEventListener('focusin', () => {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      lastValue = activeElement.value;
      observer.observe(activeElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }
  });
  document.addEventListener('focusout', () => {
    observer.disconnect();
  });
};

trackClipboardChanges();