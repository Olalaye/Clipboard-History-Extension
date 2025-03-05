import App from './App.svelte';
import { db } from '../lib/db.js';

// Initialize database connection
db.getAllItems();

const app = new App({
  target: document.body,
});

export default app;