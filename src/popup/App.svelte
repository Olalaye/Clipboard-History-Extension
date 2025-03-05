<script>
  let clipboardHistory = [];
</script>

<main>
  <h1 class="text-xl font-bold mb-4">Clipboard History</h1>
  <div class="clipboard-list">
    {#if clipboardHistory.length === 0}
      <p>No items in history</p>
    {:else}
      {#each clipboardHistory as item}
        <div class="clipboard-item">
          <p>{item.content}</p>
          <small>{new Date(item.timestamp).toLocaleString()}</small>
        </div>
      {/each}
    {/if}
  </div>
</main>

<style>
  main {
    min-width: 300px;
    padding: 1rem;
  }
  
  .clipboard-list {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .clipboard-item {
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
</style>