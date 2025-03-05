const trackClipboardChanges = () => {
  let lastValue = '';
  
  const observer = new MutationObserver(() => {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA') {
      const newValue = activeElement.value;
      if (newValue.length > lastValue.length) {
        const addedText = newValue.slice(lastValue.length);
        chrome.runtime.sendMessage({
          type: 'CLIPBOARD_CHANGE',
          data: addedText
        });
      }
      lastValue = newValue;
    }
  });

  document.addEventListener('focusin', () => {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA') {
      lastValue = activeElement.value;
      observer.observe(activeElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  });
};

trackClipboardChanges();