# Clipboard History Pro

一个强大的 Chrome 剪贴板历史管理扩展。

## 功能特点

- 自动保存剪贴板历史
- 快捷键支持（Ctrl+Shift+V 打开历史，Ctrl+Shift+S 保存当前剪贴板）
- 支持导入/导出历史记录
- 简洁美观的界面设计

## 安装步骤

### 开发环境配置

1. 克隆仓库
```bash
git clone https://github.com/yourusername/Clipboard-History-Extension.git
cd Clipboard-History-Extension
```

2. 安装依赖
```bash
npm install
```

3. 开发模式
```bash
npm run dev
```

4. 构建扩展
```bash
npm run build
```

### 在 Chrome 中安装
1. 打开 Chrome 浏览器
2. 访问扩展程序管理页面（chrome://extensions/）
3. 开启右上角的“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择刚刚构建的扩展程序`dist`文件夹

## 使用说明
- 点击工具栏的扩展图标查看剪贴板历史
- 使用快捷键：
  - Ctrl+Shift+V ：打开剪贴板历史
  - Ctrl+Shift+S ：保存当前剪贴板内容

## 技术栈
- Svelte
- Vite
- Chrome Extension API
- IndexedDB

## 开发
欢迎贡献代码！请在 `src` 目录下进行开发

