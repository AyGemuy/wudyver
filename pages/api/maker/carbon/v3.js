import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class SnippetStudio {
  constructor(config = {}) {
    this.defaultConfig = {
      code: "",
      theme: "tokyoNight",
      title: "index.js",
      language: "javascript",
      showBackground: true,
      autoSize: "fixed",
      showLineNumbers: true,
      glassmorphism: true,
      borderRadius: 16,
      minWidth: "300px",
      maxWidth: "100%",
      minHeight: "200px",
      maxHeight: "100%",
      padding: "0",
      backgroundType: "transparent",
      customBackground: null,
      backgroundColor: null,
      windowOpacity: .95,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "14px",
      lineHeight: 1.6,
      showWindowControls: true,
      showShadow: true,
      copyButton: true,
      copyButtonPosition: "bottom-right",
      codePadding: "24px",
      fitToContent: true,
      scaleToFit: true,
      useViewportUnits: true,
      responsive: true,
      overflow: "auto"
    };
    this.themes = {
      tokyoNight: {
        name: "Tokyo Night",
        bg: "linear-gradient(140deg, #1a1b26, #7aa2f7)",
        window: "#1a1b26",
        syntax: {
          kw: "#bb9af7",
          str: "#9ece6a",
          fn: "#7aa2f7",
          num: "#ff9e64",
          cm: "#565f89",
          op: "#89ddff",
          txt: "#a9b1d6"
        }
      },
      dracula: {
        name: "Dracula Pro",
        bg: "linear-gradient(140deg, #282a36, #ff79c6)",
        window: "#282a36",
        syntax: {
          kw: "#ff79c6",
          str: "#50fa7b",
          fn: "#8be9fd",
          num: "#bd93f9",
          cm: "#6272a4",
          op: "#ffb86c",
          txt: "#f8f8f2"
        }
      },
      monokai: {
        name: "Classic Monokai",
        bg: "linear-gradient(140deg, #272822, #f92672)",
        window: "#272822",
        syntax: {
          kw: "#f92672",
          str: "#e6db74",
          fn: "#a6e22e",
          num: "#ae81ff",
          cm: "#75715e",
          op: "#f92672",
          txt: "#f8f8f2"
        }
      },
      nightOwl: {
        name: "Night Owl",
        bg: "linear-gradient(140deg, #011627, #82aaff)",
        window: "#011627",
        syntax: {
          kw: "#c792ea",
          str: "#ecc48d",
          fn: "#82aaff",
          num: "#f78c6c",
          cm: "#637777",
          op: "#7fdbca",
          txt: "#d6deeb"
        }
      },
      synthwave: {
        name: "Synthwave '84",
        bg: "linear-gradient(140deg, #2b213a, #ff7edb)",
        window: "#2b213a",
        syntax: {
          kw: "#f92aad",
          str: "#fff5b1",
          fn: "#36f9f6",
          num: "#f97e72",
          cm: "#848bbd",
          op: "#b895e4",
          txt: "#ffffff"
        }
      },
      rosePine: {
        name: "Rosé Pine",
        bg: "linear-gradient(140deg, #191724, #ebbcba)",
        window: "#191724",
        syntax: {
          kw: "#c4a7e7",
          str: "#ebbcba",
          fn: "#9ccfd8",
          num: "#f6c177",
          cm: "#6e6a86",
          op: "#31748f",
          txt: "#e0def4"
        }
      },
      githubDark: {
        name: "GitHub Dark",
        bg: "linear-gradient(140deg, #0d1117, #30363d)",
        window: "#0d1117",
        syntax: {
          kw: "#ff7b72",
          str: "#a5d6ff",
          fn: "#d2a8ff",
          num: "#79c0ff",
          cm: "#8b949e",
          op: "#79c0ff",
          txt: "#c9d1d9"
        }
      },
      shadesOfPurple: {
        name: "Shades of Purple",
        bg: "linear-gradient(140deg, #2d2b55, #fad000)",
        window: "#2d2b55",
        syntax: {
          kw: "#ff9d00",
          str: "#a5ff90",
          fn: "#fad000",
          num: "#ff628c",
          cm: "#b362ff",
          op: "#9effff",
          txt: "#ffffff"
        }
      },
      nord: {
        name: "Nord Arctic",
        bg: "linear-gradient(140deg, #2e3440, #88c0d0)",
        window: "#2e3440",
        syntax: {
          kw: "#81a1c1",
          str: "#a3be8c",
          fn: "#88c0d0",
          num: "#b48ead",
          cm: "#4c566a",
          op: "#8fbcbb",
          txt: "#d8dee9"
        }
      },
      outrun: {
        name: "Outrun Vibe",
        bg: "linear-gradient(140deg, #0d0221, #fb3640)",
        window: "#0d0221",
        syntax: {
          kw: "#ff007f",
          str: "#00f5ff",
          fn: "#ffcc00",
          num: "#ff00ff",
          cm: "#4c2a85",
          op: "#ffffff",
          txt: "#f1f1f1"
        }
      }
    };
    this.config = {
      ...this.defaultConfig,
      ...config
    };
  }
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    return this;
  }
  generate(userConfig = {}) {
    const config = {
      ...this.config,
      ...userConfig
    };
    const theme = this.themes[config.theme] || this.themes.tokyoNight;
    const escapedCode = this.escapeHtml(config.code.trim());
    const lines = config.code.trim().split("\n");
    const dimensions = this.calculateDimensions(lines, config);
    const backgroundStyles = this.getBackgroundStyles(config, theme);
    const windowStyles = this.getWindowStyles(config, theme);
    const lineNumbers = config.showLineNumbers ? lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join("") : "";
    const shadowStyles = config.showShadow ? `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);` : "box-shadow: none;";
    const copyButtonPosition = this.getCopyButtonPosition(config.copyButtonPosition);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Prism.js CDN -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-tsx.min.js"></script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: ${config.fontFamily};
      ${backgroundStyles.body}
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      ${config.useViewportUnits ? "min-height: 100vh;" : "height: 100%;"}
    }

    .snippet-container {
      ${dimensions.container}
      display: flex;
      flex-direction: column;
      position: relative;
      ${config.scaleToFit ? "transform-origin: center center;" : ""}
    }

    .window {
      ${windowStyles.main}
      border-radius: ${config.borderRadius}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      ${shadowStyles}
      transition: all 0.3s ease;
      width: 100%;
      height: 100%;
      ${config.fitToContent ? "min-height: fit-content;" : ""}
    }

    .window:hover {
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
    }

    ${config.showWindowControls ? `
    .header {
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
      min-height: 44px;
    }

    .window-controls {
      display: flex;
      gap: 8px;
    }

    .window-control {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .window-control:hover {
      transform: scale(1.1);
    }

    .window-control.close { background: #ff5f56; }
    .window-control.minimize { background: #ffbd2e; }
    .window-control.maximize { background: #27c93f; }

    .title {
      color: ${theme.syntax.txt};
      font-size: 13px;
      opacity: 0.7;
      font-weight: 500;
      letter-spacing: 0.5px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }
    ` : `
    .header {
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title {
      color: ${theme.syntax.txt};
      font-size: 13px;
      opacity: 0.7;
      font-weight: 500;
    }
    `}

    .code-wrapper {
      flex: 1;
      overflow: ${config.overflow};
      padding: ${config.codePadding};
      position: relative;
      min-height: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .code-container {
      position: relative;
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .line-numbers {
      position: absolute;
      left: 0;
      top: 0;
      padding: 0 15px 0 0;
      text-align: right;
      color: ${theme.syntax.txt};
      opacity: 0.3;
      user-select: none;
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      font-family: ${config.fontFamily};
      height: 100%;
    }

    .line-number {
      display: block;
      height: calc(${config.fontSize} * ${config.lineHeight});
    }

    pre[class*="language-"] {
      margin: 0;
      padding: 0;
      background: transparent !important;
      overflow: visible !important;
      ${config.showLineNumbers ? "padding-left: 50px;" : ""}
      width: 100%;
      min-height: 100%;
    }

    code[class*="language-"] {
      font-family: ${config.fontFamily} !important;
      background: transparent !important;
      color: ${theme.syntax.txt} !important;
      text-shadow: none !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      display: block;
      width: 100%;
      min-height: 100%;
    }

    /* Custom Prism Theme */
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: ${theme.syntax.cm} !important;
      font-style: italic;
    }

    .token.keyword,
    .token.operator,
    .token.boolean,
    .token.atrule {
      color: ${theme.syntax.kw} !important;
    }

    .token.string,
    .token.char,
    .token.attr-value {
      color: ${theme.syntax.str} !important;
    }

    .token.function,
    .token.class-name,
    .token.tag {
      color: ${theme.syntax.fn} !important;
    }

    .token.number,
    .token.constant,
    .token.symbol {
      color: ${theme.syntax.num} !important;
    }

    .token.punctuation {
      color: ${theme.syntax.op} !important;
    }

    .token.selector,
    .token.property {
      color: ${theme.syntax.txt} !important;
    }

    /* Copy button */
    ${config.copyButton ? `
    .copy-button {
      position: absolute;
      ${copyButtonPosition}
      background: rgba(${this.hexToRgb(theme.window)}, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 8px;
      cursor: pointer;
      color: ${theme.syntax.txt};
      opacity: 0.6;
      transition: all 0.2s ease;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    }

    .copy-button:hover {
      opacity: 1;
      background: rgba(${this.hexToRgb(theme.window)}, 0.9);
      transform: scale(1.05);
    }

    .copy-button.copied {
      background: rgba(46, 204, 113, 0.8);
      color: white;
    }
    ` : ""}

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Auto-size animation */
    @keyframes adjustSize {
      from { opacity: 0.8; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .snippet-container.adjusting {
      animation: adjustSize 0.3s ease;
    }

    /* Responsive Design */
    ${config.responsive ? `
    @media (max-width: 768px) {
      .code-wrapper {
        padding: calc(${config.codePadding} * 0.75);
      }
      
      code[class*="language-"] {
        font-size: calc(${config.fontSize} * 0.9);
      }
      
      .header {
        padding: 10px 16px;
      }
    }

    @media (max-width: 480px) {
      .code-wrapper {
        padding: calc(${config.codePadding} * 0.5);
      }
      
      code[class*="language-"] {
        font-size: calc(${config.fontSize} * 0.85);
        line-height: 1.5;
      }
      
      .header {
        padding: 8px 12px;
        min-height: 40px;
      }
      
      ${config.showLineNumbers ? `
      pre[class*="language-"] {
        padding-left: 40px;
      }
      
      .line-numbers {
        font-size: calc(${config.fontSize} * 0.85);
        padding-right: 10px;
      }
      ` : ""}
      
      ${config.copyButton ? `
      .copy-button {
        padding: 6px;
        transform: scale(0.9);
      }
      
      .copy-button:hover {
        transform: scale(0.95);
      }
      ` : ""}
    }
    ` : ""}

    /* Fullscreen mode adjustments */
    ${config.autoSize === "fullscreen" ? `
    body {
      padding: 0 !important;
      display: block;
    }
    
    .snippet-container {
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
    }
    
    .window {
      border-radius: 0 !important;
      height: 100vh !important;
    }
    ` : ""}
    
    /* Compact mode */
    ${config.autoSize === "compact" ? `
    .snippet-container {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
    }
    
    .window {
      width: auto !important;
      height: auto !important;
    }
    ` : ""}
    
    /* Flexible mode */
    ${config.autoSize === "flexible" ? `
    .snippet-container {
      transition: all 0.3s ease;
    }
    ` : ""}
  </style>
</head>
<body>
  <div class="snippet-container">
    <div class="window">
      ${config.title ? `
      <div class="header">
        ${config.showWindowControls ? `
        <div class="window-controls">
          <div class="window-control close"></div>
          <div class="window-control minimize"></div>
          <div class="window-control maximize"></div>
        </div>
        ` : ""}
        <div class="title">${config.title}</div>
        ${config.showWindowControls ? `
        <div class="header-actions">
          <!-- Additional actions can go here -->
        </div>
        ` : ""}
      </div>
      ` : ""}
      
      <div class="code-wrapper">
        ${config.copyButton ? `
        <button class="copy-button" onclick="copyCode()" title="Copy code" aria-label="Copy code to clipboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        ` : ""}
        
        <div class="code-container">
          ${config.showLineNumbers ? `
          <div class="line-numbers" aria-hidden="true">
            ${lineNumbers}
          </div>
          ` : ""}
          
          <pre class="language-${config.language}"><code class="language-${config.language}">${escapedCode}</code></pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Initialize Prism
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
    
    // Copy code function
    ${config.copyButton ? `
    function copyCode() {
      const codeElement = document.querySelector('code[class*="language-"]');
      const text = codeElement.textContent;
      const button = document.querySelector('.copy-button');
      
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        const originalClass = button.className;
        
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17L4 12"></path></svg>';
        button.classList.add('copied');
        button.setAttribute('title', 'Copied!');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.className = originalClass;
          button.setAttribute('title', 'Copy code');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>';
        setTimeout(() => {
          button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 2000);
      });
    }
    ` : ""}
    
    // Auto-adjust size for content
    function adjustToContent() {
      const container = document.querySelector('.snippet-container');
      const windowEl = document.querySelector('.window');
      const codeWrapper = document.querySelector('.code-wrapper');
      const codeElement = document.querySelector('code[class*="language-"]');
      
      if (!container || !windowEl || !codeWrapper || !codeElement) return;
      
      // Add adjusting class for animation
      container.classList.add('adjusting');
      
      // Get content dimensions
      const codeHeight = codeElement.scrollHeight;
      const codeWidth = codeElement.scrollWidth;
      const lineCount = (codeElement.textContent.match(/\\n/g) || []).length + 1;
      
      // Calculate optimal dimensions
      const lineHeight = parseFloat(getComputedStyle(codeElement).lineHeight);
      const fontSize = parseFloat(getComputedStyle(codeElement).fontSize);
      const padding = parseFloat(getComputedStyle(codeWrapper).padding) * 2;
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      
      const minHeight = Math.max(
        lineCount * lineHeight + padding + headerHeight + 20,
        ${parseInt(config.minHeight)}
      );
      
      const maxHeight = ${config.maxHeight === "100%" ? "window.innerHeight" : `parseInt("${config.maxHeight}")`};
      const maxWidth = ${config.maxWidth === "100%" ? "window.innerWidth" : `parseInt("${config.maxWidth}")`};
      
      // Apply calculated dimensions
      const targetHeight = Math.min(minHeight, maxHeight);
      const targetWidth = Math.min(codeWidth + 100, maxWidth);
      
      container.style.height = targetHeight + 'px';
      container.style.width = targetWidth + 'px';
      windowEl.style.height = '100%';
      windowEl.style.width = '100%';
      
      // Remove adjusting class after animation
      setTimeout(() => {
        container.classList.remove('adjusting');
      }, 300);
      
      // Adjust scroll if needed
      if (codeHeight > codeWrapper.clientHeight) {
        codeWrapper.style.overflow = 'auto';
      } else {
        codeWrapper.style.overflow = 'visible';
      }
    }
    
    // Initialize and adjust
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (${config.autoSize === "flexible" || config.autoSize === "compact"}) {
          adjustToContent();
        }
      }, 100);
    });
    
    // Adjust on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (${config.autoSize === "flexible" || config.autoSize === "compact"}) {
          adjustToContent();
        }
      }, 250);
    });
    
    // Adjust when Prism finishes highlighting
    if (typeof Prism !== 'undefined') {
      const originalHighlight = Prism.highlightAll;
      Prism.highlightAll = function() {
        originalHighlight.apply(this, arguments);
        setTimeout(() => {
          if (${config.autoSize === "flexible" || config.autoSize === "compact"}) {
            adjustToContent();
          }
        }, 50);
      };
    }
  </script>
</body>
</html>`.trim();
  }
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  calculateDimensions(lines, config) {
    let containerStyles = "";
    switch (config.autoSize) {
      case "fullscreen":
        containerStyles = `
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          min-width: 100vw;
          min-height: 100vh;
        `;
        break;
      case "compact":
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const lineCount = lines.length;
        const charWidth = 8;
        const lineHeight = parseInt(config.fontSize) * config.lineHeight;
        const contentWidth = Math.min(Math.max(maxLineLength * charWidth + 100, parseInt(config.minWidth)), config.maxWidth === "100%" ? window.innerWidth : parseInt(config.maxWidth));
        const contentHeight = Math.min(Math.max(lineCount * lineHeight + 100, parseInt(config.minHeight)), config.maxHeight === "100%" ? window.innerHeight : parseInt(config.maxHeight));
        containerStyles = `
          width: ${contentWidth}px;
          height: ${contentHeight}px;
          min-width: ${config.minWidth};
          min-height: ${config.minHeight};
          max-width: ${config.maxWidth};
          max-height: ${config.maxHeight};
        `;
        break;
      case "fixed":
        containerStyles = `
          width: ${config.width};
          height: ${config.height};
          min-width: ${config.minWidth};
          min-height: ${config.minHeight};
          max-width: ${config.maxWidth};
          max-height: ${config.maxHeight};
        `;
        break;
      case "flexible":
      default:
        containerStyles = `
          width: ${config.maxWidth};
          height: ${config.maxHeight};
          min-width: ${config.minWidth};
          min-height: ${config.minHeight};
          max-width: ${config.maxWidth};
          max-height: ${config.maxHeight};
          ${config.fitToContent ? "width: fit-content; height: fit-content;" : ""}
        `;
        break;
    }
    return {
      container: containerStyles.trim()
    };
  }
  getBackgroundStyles(config, theme) {
    let bodyStyles = "";
    if (!config.showBackground || config.backgroundType === "none") {
      bodyStyles = "background: transparent;";
    } else {
      switch (config.backgroundType) {
        case "gradient":
          bodyStyles = `background: ${config.customBackground || theme.bg};`;
          break;
        case "solid":
          bodyStyles = `background: ${config.backgroundColor || theme.window};`;
          break;
        case "transparent":
          bodyStyles = "background: transparent;";
          break;
        case "custom":
          bodyStyles = `background: ${config.customBackground};`;
          break;
        default:
          bodyStyles = `background: ${theme.bg};`;
      }
    }
    return {
      body: bodyStyles.trim()
    };
  }
  getWindowStyles(config, theme) {
    let mainStyles = "";
    const windowBg = config.backgroundColor || theme.window;
    const opacity = config.glassmorphism ? config.windowOpacity : 1;
    if (config.glassmorphism) {
      mainStyles = `
        background: rgba(${this.hexToRgb(windowBg)}, ${opacity});
        backdrop-filter: blur(10px);
      `;
    } else {
      if (opacity < 1) {
        mainStyles = `background: rgba(${this.hexToRgb(windowBg)}, ${opacity});`;
      } else {
        mainStyles = `background: ${windowBg};`;
      }
    }
    return {
      main: mainStyles.trim()
    };
  }
  getCopyButtonPosition(position) {
    switch (position) {
      case "top-right":
        return "top: 15px; right: 15px;";
      case "top-left":
        return "top: 15px; left: 15px;";
      case "bottom-left":
        return "bottom: 15px; left: 15px;";
      case "bottom-right":
      default:
        return "bottom: 15px; right: 15px;";
    }
  }
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
  }
}
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    code = `function hello() {
  console.log("Hello, World!");
  return 42;
}`,
    type = "v5",
    ...rest
  }) {
    const api = new SnippetStudio();
    const html = api.generate({
      code: code,
      ...rest
    });
    const data = {
      html: html
    };
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data?.url;
      }
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}