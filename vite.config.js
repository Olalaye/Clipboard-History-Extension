import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import path from 'path';

const copyFiles = () => {
  return {
    name: 'copy-files',
    closeBundle: () => {
      // Create directories if they don't exist
      const dirs = [
        'dist', 
        'dist/icons',
        'dist/assets'
      ];
      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Copy manifest.json
      fs.copyFileSync('manifest.json', 'dist/manifest.json');
      
      // Copy popup HTML
      fs.copyFileSync('src/popup/popup.html', 'dist/popup.html');
      
      // Copy icon files if they exist
      if (fs.existsSync('icons')) {
        const iconFiles = fs.readdirSync('icons');
        iconFiles.forEach(file => {
          fs.copyFileSync(`icons/${file}`, `dist/icons/${file}`);
        });
      }
    }
  };
};

export default defineConfig({
  plugins: [
    svelte(),
    copyFiles()
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.js',
        'service-worker': 'src/background/service-worker.js'
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `[name].[ext]`
      }
    },
    emptyOutDir: true
  }
});