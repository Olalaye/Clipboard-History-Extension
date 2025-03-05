<script>
  import { onMount } from 'svelte';
  import { db } from '../lib/db.js';

  let clipboardHistory = [];
  let autoSave = true;
  let showDetail = false;
  let selectedItem = null;

  onMount(async () => {
    try {
      clipboardHistory = await db.getAllItems();
      clipboardHistory.sort((a, b) => b.timestamp - a.timestamp);
      // 从storage中获取自动保存设置
      const result = await chrome.storage.local.get(['autoSave']);
      autoSave = result.autoSave !== false;
    } catch (error) {
      console.error('获取剪贴板历史记录失败:', error);
    }
  });

  async function toggleAutoSave() {
    autoSave = !autoSave;
    await chrome.storage.local.set({ autoSave });
    chrome.runtime.sendMessage({ type: 'TOGGLE_AUTO_SAVE', data: autoSave });
  }

  async function deleteItem(item) {
    try {
      await db.deleteItem(item.id);
      clipboardHistory = clipboardHistory.filter(i => i.id !== item.id);
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  function showItemDetail(item) {
    selectedItem = item;
    showDetail = true;
  }

  function exportData() {
    chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
  }
</script>

<main class="p-4 w-[400px] h-[500px] overflow-hidden flex flex-col bg-white shadow-lg">
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-4 flex-shrink-0">
      <h1 class="text-xl font-bold text-gray-800">剪贴板历史</h1>
      <div class="flex items-center gap-3">
        <label class="flex items-center cursor-pointer text-sm text-gray-600 hover:text-gray-800 transition-colors group relative">
          <input 
            type="checkbox" 
            bind:checked={autoSave} 
            on:change={toggleAutoSave} 
            class="peer sr-only"
          >
          <div class="w-10 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span class="ml-3 select-none group-hover:text-gray-800 transition-colors">自动保存</span>
        </label>
        <button 
          on:click={exportData} 
          class="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full shadow-sm hover:bg-blue-600 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          导出
        </button>
      </div>
    </div>

    <div class="clipboard-list flex-1 overflow-y-auto">
      {#if clipboardHistory.length === 0}
        <p class="text-gray-500 text-center py-8">暂无历史记录</p>
      {:else}
        {#each clipboardHistory as item}
          <div class="clipboard-item group flex justify-between items-start hover:bg-gray-50 rounded-lg p-3 transition-colors">
            <button 
              class="flex-1 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2 -m-2" 
              on:click={() => showItemDetail(item)}
              on:keydown={(e) => e.key === 'Enter' && showItemDetail(item)}
              tabindex="0"
            >
              <p class="text-sm mb-1 line-clamp-2 text-gray-700">{item.content}</p>
              <small class="text-gray-500">{new Date(item.timestamp).toLocaleString()}</small>
            </button>
            <button 
              class="ml-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" 
              on:click={() => deleteItem(item)}
              title="删除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        {/each}
      {/if}
    </div>

    {#if showDetail}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-lg font-bold text-gray-800">详细内容</h2>
            <button 
              class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300" 
              on:click={() => showDetail = false}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg text-gray-700">{selectedItem?.content}</div>
          <div class="mt-4 text-sm text-gray-500">
            保存时间：{new Date(selectedItem?.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .clipboard-item {
    border-bottom: 1px solid #eee;
    transition: all 0.2s ease;
  }

  .clipboard-item:hover {
    border-color: transparent;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  :global(.clipboard-list) {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }

  :global(.clipboard-list::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.clipboard-list::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.clipboard-list::-webkit-scrollbar-thumb) {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
</style>