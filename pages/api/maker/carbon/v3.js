import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class SnippetStudio {
  constructor(config = {}) {
    this.defaultConfig = {
      code: "",
      theme: "tokyoNight",
      title: "index.js",
      language: "javascript",
      showBackground: true,
      autoSize: "compact",
      showLineNumbers: true,
      glassmorphism: true,
      borderRadius: 18,
      minWidth: "300px",
      maxWidth: "100%",
      minHeight: "200px",
      maxHeight: "100%",
      padding: "20",
      backgroundType: "transparent",
      customBackground: null,
      backgroundColor: null,
      windowOpacity: .95,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "14px",
      lineHeight: 1.6,
      showWindowControls: true,
      showShadow: true,
      showHeader: true,
      showOutline: true,
      outlineColor: "rgba(255, 255, 255, 0.1)",
      outlineWidth: "1.6px",
      copyButton: true,
      copyButtonPosition: "bottom-right",
      codePadding: "20px",
      fitToContent: true,
      scaleToFit: true,
      useViewportUnits: true,
      responsive: true,
      overflow: "auto",
      width: "1200px",
      height: "800px",
      randomTheme: true,
      headerPadding: "14px 24px",
      windowControlsSize: "13px",
      windowControlsGap: "10px",
      shadowIntensity: "medium",
      shadowBlur: "60px",
      shadowSpread: "0px",
      shadowColor: "rgba(0, 0, 0, 0.4)",
      borderStyle: "none",
      borderWidth: "1px",
      borderColor: "rgba(255, 255, 255, 0.1)",
      gradientAngle: "140deg",
      animationDuration: "0.3s",
      headerBackground: "rgba(0, 0, 0, 0.25)",
      headerOpacity: 1,
      showMinimap: false,
      minimapWidth: "80px",
      minimapOpacity: .6,
      showStatusbar: false,
      statusbarText: "Ln 1, Col 1",
      statusbarPosition: "bottom",
      fontSmooth: true,
      fontWeight: "500",
      letterSpacing: "0.02em",
      showMacTitle: false,
      compactMode: false,
      accentColor: null,
      hoverEffect: true,
      focusEffect: true
    };
    this.themes = {
      tokyoNight: {
        name: "Tokyo Night",
        bg: "linear-gradient(140deg, #1a1b26, #7aa2f7)",
        window: "#1a1b26",
        accent: "#7aa2f7",
        syntax: {
          kw: "#bb9af7",
          str: "#9ece6a",
          fn: "#7aa2f7",
          num: "#ff9e64",
          cm: "#565f89",
          op: "#89ddff",
          txt: "#a9b1d6",
          var: "#c0caf5",
          type: "#7dcfff"
        }
      },
      dracula: {
        name: "Dracula Pro",
        bg: "linear-gradient(140deg, #282a36, #ff79c6)",
        window: "#282a36",
        accent: "#ff79c6",
        syntax: {
          kw: "#ff79c6",
          str: "#50fa7b",
          fn: "#8be9fd",
          num: "#bd93f9",
          cm: "#6272a4",
          op: "#ffb86c",
          txt: "#f8f8f2",
          var: "#ffb86c",
          type: "#8be9fd"
        }
      },
      monokai: {
        name: "Classic Monokai",
        bg: "linear-gradient(140deg, #272822, #f92672)",
        window: "#272822",
        accent: "#f92672",
        syntax: {
          kw: "#f92672",
          str: "#e6db74",
          fn: "#a6e22e",
          num: "#ae81ff",
          cm: "#75715e",
          op: "#f92672",
          txt: "#f8f8f2",
          var: "#fd971f",
          type: "#66d9ef"
        }
      },
      nightOwl: {
        name: "Night Owl",
        bg: "linear-gradient(140deg, #011627, #82aaff)",
        window: "#011627",
        accent: "#82aaff",
        syntax: {
          kw: "#c792ea",
          str: "#ecc48d",
          fn: "#82aaff",
          num: "#f78c6c",
          cm: "#637777",
          op: "#7fdbca",
          txt: "#d6deeb",
          var: "#d6deeb",
          type: "#ffcb6b"
        }
      },
      synthwave: {
        name: "Synthwave '84",
        bg: "linear-gradient(140deg, #2b213a, #ff7edb)",
        window: "#2b213a",
        accent: "#ff7edb",
        syntax: {
          kw: "#f92aad",
          str: "#fff5b1",
          fn: "#36f9f6",
          num: "#f97e72",
          cm: "#848bbd",
          op: "#b895e4",
          txt: "#ffffff",
          var: "#b895e4",
          type: "#36f9f6"
        }
      },
      rosePine: {
        name: "Rosé Pine",
        bg: "linear-gradient(140deg, #191724, #ebbcba)",
        window: "#191724",
        accent: "#ebbcba",
        syntax: {
          kw: "#c4a7e7",
          str: "#ebbcba",
          fn: "#9ccfd8",
          num: "#f6c177",
          cm: "#6e6a86",
          op: "#31748f",
          txt: "#e0def4",
          var: "#c4a7e7",
          type: "#9ccfd8"
        }
      },
      githubDark: {
        name: "GitHub Dark",
        bg: "linear-gradient(140deg, #0d1117, #30363d)",
        window: "#0d1117",
        accent: "#58a6ff",
        syntax: {
          kw: "#ff7b72",
          str: "#a5d6ff",
          fn: "#d2a8ff",
          num: "#79c0ff",
          cm: "#8b949e",
          op: "#79c0ff",
          txt: "#c9d1d9",
          var: "#ffa657",
          type: "#79c0ff"
        }
      },
      shadesOfPurple: {
        name: "Shades of Purple",
        bg: "linear-gradient(140deg, #2d2b55, #fad000)",
        window: "#2d2b55",
        accent: "#fad000",
        syntax: {
          kw: "#ff9d00",
          str: "#a5ff90",
          fn: "#fad000",
          num: "#ff628c",
          cm: "#b362ff",
          op: "#9effff",
          txt: "#ffffff",
          var: "#d0d0ff",
          type: "#f92aad"
        }
      },
      nord: {
        name: "Nord Arctic",
        bg: "linear-gradient(140deg, #2e3440, #88c0d0)",
        window: "#2e3440",
        accent: "#88c0d0",
        syntax: {
          kw: "#81a1c1",
          str: "#a3be8c",
          fn: "#88c0d0",
          num: "#b48ead",
          cm: "#4c566a",
          op: "#8fbcbb",
          txt: "#d8dee9",
          var: "#d8dee9",
          type: "#8fbcbb"
        }
      },
      outrun: {
        name: "Outrun Vibe",
        bg: "linear-gradient(140deg, #0d0221, #fb3640)",
        window: "#0d0221",
        accent: "#fb3640",
        syntax: {
          kw: "#ff007f",
          str: "#00f5ff",
          fn: "#ffcc00",
          num: "#ff00ff",
          cm: "#4c2a85",
          op: "#ffffff",
          txt: "#f1f1f1",
          var: "#ffffff",
          type: "#00f5ff"
        }
      },
      catppuccin: {
        name: "Catppuccin Mocha",
        bg: "linear-gradient(140deg, #1e1e2e, #cba6f7)",
        window: "#1e1e2e",
        accent: "#cba6f7",
        syntax: {
          kw: "#cba6f7",
          str: "#a6e3a1",
          fn: "#89b4fa",
          num: "#fab387",
          cm: "#6c7086",
          op: "#94e2d5",
          txt: "#cdd6f4",
          var: "#f5c2e7",
          type: "#89b4fa"
        }
      },
      gruvbox: {
        name: "Gruvbox Dark",
        bg: "linear-gradient(140deg, #282828, #d79921)",
        window: "#282828",
        accent: "#d79921",
        syntax: {
          kw: "#fb4934",
          str: "#b8bb26",
          fn: "#fabd2f",
          num: "#d3869b",
          cm: "#928374",
          op: "#fe8019",
          txt: "#ebdbb2",
          var: "#83a598",
          type: "#fabd2f"
        }
      },
      oneDark: {
        name: "One Dark Pro",
        bg: "linear-gradient(140deg, #282c34, #61afef)",
        window: "#282c34",
        accent: "#61afef",
        syntax: {
          kw: "#c678dd",
          str: "#98c379",
          fn: "#61afef",
          num: "#d19a66",
          cm: "#5c6370",
          op: "#56b6c2",
          txt: "#abb2bf",
          var: "#e06c75",
          type: "#e5c07b"
        }
      },
      materialOcean: {
        name: "Material Ocean",
        bg: "linear-gradient(140deg, #0f111a, #82aaff)",
        window: "#0f111a",
        accent: "#82aaff",
        syntax: {
          kw: "#c792ea",
          str: "#c3e88d",
          fn: "#82aaff",
          num: "#f78c6c",
          cm: "#717cb4",
          op: "#89ddff",
          txt: "#8f93a2",
          var: "#ffcb6b",
          type: "#82aaff"
        }
      },
      cobalt2: {
        name: "Cobalt2",
        bg: "linear-gradient(140deg, #193549, #ffc600)",
        window: "#193549",
        accent: "#ffc600",
        syntax: {
          kw: "#ff9d00",
          str: "#3ad900",
          fn: "#ffc600",
          num: "#ff628c",
          cm: "#0088ff",
          op: "#80ffbb",
          txt: "#ffffff",
          var: "#ff9d00",
          type: "#ffc600"
        }
      },
      ayu: {
        name: "Ayu Dark",
        bg: "linear-gradient(140deg, #0f1419, #f07178)",
        window: "#0f1419",
        accent: "#f07178",
        syntax: {
          kw: "#ff7733",
          str: "#b8cc52",
          fn: "#36a3d9",
          num: "#f29668",
          cm: "#5c6773",
          op: "#e6b450",
          txt: "#c7c7c7",
          var: "#e6b450",
          type: "#ffb454"
        }
      },
      palenight: {
        name: "Palenight",
        bg: "linear-gradient(140deg, #292d3e, #c792ea)",
        window: "#292d3e",
        accent: "#c792ea",
        syntax: {
          kw: "#c792ea",
          str: "#c3e88d",
          fn: "#82aaff",
          num: "#f78c6c",
          cm: "#676e95",
          op: "#89ddff",
          txt: "#bfc7d5",
          var: "#f07178",
          type: "#82aaff"
        }
      },
      cyberpunk: {
        name: "Cyberpunk 2077",
        bg: "linear-gradient(140deg, #0d0d0d, #fee75c)",
        window: "#0d0d0d",
        accent: "#fee75c",
        syntax: {
          kw: "#ff00ff",
          str: "#00ffff",
          fn: "#ffee00",
          num: "#ff0000",
          cm: "#666666",
          op: "#ffffff",
          txt: "#eeeeee",
          var: "#ffffff",
          type: "#00ffff"
        }
      },
      oceanic: {
        name: "Oceanic Next",
        bg: "linear-gradient(140deg, #1b2b34, #6699cc)",
        window: "#1b2b34",
        accent: "#6699cc",
        syntax: {
          kw: "#c594c5",
          str: "#99c794",
          fn: "#6699cc",
          num: "#f99157",
          cm: "#65737e",
          op: "#5fb3b3",
          txt: "#cdd3de",
          var: "#ecbe7b",
          type: "#6699cc"
        }
      },
      forest: {
        name: "Forest Night",
        bg: "linear-gradient(140deg, #1d1f21, #98c379)",
        window: "#1d1f21",
        accent: "#98c379",
        syntax: {
          kw: "#c678dd",
          str: "#98c379",
          fn: "#61afef",
          num: "#d19a66",
          cm: "#5c6370",
          op: "#56b6c2",
          txt: "#abb2bf",
          var: "#e5c07b",
          type: "#98c379"
        }
      },
      deepSpace: {
        name: "Deep Space",
        bg: "linear-gradient(140deg, #0c0c0c, #6c5ce7)",
        window: "#0c0c0c",
        accent: "#6c5ce7",
        syntax: {
          kw: "#a29bfe",
          str: "#00b894",
          fn: "#74b9ff",
          num: "#fd79a8",
          cm: "#636e72",
          op: "#00cec9",
          txt: "#dfe6e9",
          var: "#fdcb6e",
          type: "#a29bfe"
        }
      },
      aurora: {
        name: "Aurora Borealis",
        bg: "linear-gradient(140deg, #1a1a2e, #16213e)",
        window: "#1a1a2e",
        accent: "#e94560",
        syntax: {
          kw: "#e94560",
          str: "#0f3460",
          fn: "#533483",
          num: "#16213e",
          cm: "#0f3460",
          op: "#e94560",
          txt: "#f0f0f0",
          var: "#533483",
          type: "#e94560"
        }
      },
      midnight: {
        name: "Midnight City",
        bg: "linear-gradient(140deg, #0f0c29, #302b63)",
        window: "#0f0c29",
        accent: "#24243e",
        syntax: {
          kw: "#ff6b6b",
          str: "#4ecdc4",
          fn: "#45b7d1",
          num: "#f9ca24",
          cm: "#95afc0",
          op: "#a55eea",
          txt: "#dfe6e9",
          var: "#fd79a8",
          type: "#45b7d1"
        }
      },
      neon: {
        name: "Neon Glow",
        bg: "linear-gradient(140deg, #0a0a0a, #00ff88)",
        window: "#0a0a0a",
        accent: "#00ff88",
        syntax: {
          kw: "#ff00ff",
          str: "#00ff00",
          fn: "#00ffff",
          num: "#ffff00",
          cm: "#666666",
          op: "#ffffff",
          txt: "#ffffff",
          var: "#ff00ff",
          type: "#00ff88"
        }
      },
      ember: {
        name: "Ember Light",
        bg: "linear-gradient(140deg, #1a1a2e, #ff6b35)",
        window: "#1a1a2e",
        accent: "#ff6b35",
        syntax: {
          kw: "#f72585",
          str: "#4cc9f0",
          fn: "#4361ee",
          num: "#fca311",
          cm: "#7209b7",
          op: "#f77f00",
          txt: "#ffffff",
          var: "#f72585",
          type: "#4361ee"
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
  getRandomTheme() {
    const themeKeys = Object.keys(this.themes);
    return themeKeys[Math.floor(Math.random() * themeKeys.length)];
  }
  generate(userConfig = {}) {
    const config = {
      ...this.config,
      ...userConfig
    };
    if (config.randomTheme && config.theme === "tokyoNight") {
      config.theme = this.getRandomTheme();
    }
    const theme = this.themes[config.theme] || this.themes.tokyoNight;
    const accentColor = config.accentColor || theme.accent;
    const escapedCode = this.escapeHtml(config.code.trim());
    const lines = config.code.trim().split("\n");
    const dimensions = this.calculateDimensions(lines, config);
    const backgroundStyles = this.getBackgroundStyles(config, theme);
    const windowStyles = this.getWindowStyles(config, theme);
    const lineNumbers = config.showLineNumbers ? lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join("") : "";
    const shadowStyles = this.getShadowStyles(config);
    const borderStyles = this.getBorderStyles(config);
    const copyButtonPosition = this.getCopyButtonPosition(config.copyButtonPosition);
    return this.generateHTML(config, theme, accentColor, escapedCode, lines, dimensions, backgroundStyles, windowStyles, lineNumbers, shadowStyles, borderStyles, copyButtonPosition);
  }
  generateHTML(config, theme, accentColor, escapedCode, lines, dimensions, backgroundStyles, windowStyles, lineNumbers, shadowStyles, borderStyles, copyButtonPosition) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${config.title || "Code Snippet"}</title>
  
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: ${config.fontSmooth ? "antialiased" : "none"};
      -moz-osx-font-smoothing: ${config.fontSmooth ? "grayscale" : "auto"};
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
      ${config.useViewportUnits ? "min-height: 100vh;" : "height: 100%;"}
    }

    .code-window {
      ${dimensions.container}
      ${windowStyles.main}
      border-radius: ${config.borderRadius}px;
      overflow: hidden;
      ${shadowStyles}
      ${borderStyles}
      position: relative;
      display: flex;
      flex-direction: column;
      transition: all ${config.animationDuration} cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, box-shadow;
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    ${config.hoverEffect && config.showShadow ? `
    .code-window:hover {
      box-shadow: 0 calc(${config.shadowBlur} * 1.25) ${config.shadowSpread} ${this.adjustShadowOpacity(config.shadowColor, 1.2)}, 0 0 0 1px ${accentColor}33;
      transform: translateY(-2px) translateZ(0);
    }
    ` : ""}

    ${config.focusEffect ? `
    .code-window:focus-within {
      box-shadow: 0 calc(${config.shadowBlur} * 1.3) ${config.shadowSpread} ${this.adjustShadowOpacity(config.shadowColor, 1.3)}, 0 0 0 1px ${accentColor}55;
      transform: translateY(-3px) translateZ(0);
    }
    ` : ""}

    ${config.showHeader ? `
    .window-header {
      padding: ${config.headerPadding};
      background: ${config.headerBackground};
      opacity: ${config.headerOpacity};
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      ${config.compactMode ? "min-height: 40px;" : "min-height: 50px;"}
      position: relative;
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
    }

    ${config.showWindowControls ? `
    .window-controls {
      display: flex;
      gap: ${config.windowControlsGap};
      z-index: 2;
    }

    .window-control {
      width: ${config.windowControlsSize};
      height: ${config.windowControlsSize};
      border-radius: 50%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
    }

    .window-control::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .window-control:hover::before {
      opacity: 0.3;
      background: currentColor;
    }

    .window-control:hover {
      transform: scale(1.15);
    }

    .window-control:active {
      transform: scale(0.95);
    }

    .window-control.close { background: #ff5f56; color: #ff5f56; }
    .window-control.minimize { background: #ffbd2e; color: #ffbd2e; }
    .window-control.maximize { background: #27c93f; color: #27c93f; }

    .window-control.close:hover { background: #ff3b30; }
    .window-control.minimize:hover { background: #ff9500; }
    .window-control.maximize:hover { background: #34c759; }
    ` : ""}

    ${config.title ? `
    .window-title {
      color: ${theme.syntax.txt};
      font-size: ${config.compactMode ? "13px" : "14px"};
      opacity: 0.8;
      font-weight: 600;
      letter-spacing: 0.3px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .window-title::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      background: ${accentColor};
      border-radius: 50%;
      margin-right: 8px;
      vertical-align: middle;
    }
    ` : ""}

    .header-spacer { width: 75px; }
    ` : ""}

    .code-content {
      flex: 1;
      overflow: ${config.overflow};
      padding: ${config.codePadding};
      position: relative;
      min-height: 0;
    }

    .code-container {
      position: relative;
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      width: 100%;
      height: 100%;
    }

    .line-numbers {
      position: absolute;
      left: 0;
      top: 0;
      padding: 0 20px 0 0;
      text-align: right;
      color: ${theme.syntax.txt};
      opacity: 0.35;
      user-select: none;
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      font-family: ${config.fontFamily};
      font-weight: 500;
    }

    .line-number {
      display: block;
      height: calc(${config.fontSize} * ${config.lineHeight});
    }

    pre[class*="language-"] {
      margin: 0;
      padding: 0;
      background: transparent !important;
      ${config.showLineNumbers ? "padding-left: 60px;" : ""}
      width: 100%;
      height: 100%;
      font-variant-ligatures: common-ligatures;
    }

    code[class*="language-"] {
      font-family: ${config.fontFamily} !important;
      background: transparent !important;
      color: ${theme.syntax.txt} !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      display: block;
      font-weight: ${config.fontWeight};
      letter-spacing: ${config.letterSpacing};
    }

    .token.comment, .token.prolog, .token.doctype, .token.cdata {
      color: ${theme.syntax.cm} !important;
      font-style: italic;
      opacity: 0.9;
    }

    .token.keyword, .token.operator, .token.boolean, .token.atrule {
      color: ${theme.syntax.kw} !important;
      font-weight: 600;
    }

    .token.string, .token.char, .token.attr-value {
      color: ${theme.syntax.str} !important;
      font-weight: 500;
    }

    .token.function, .token.class-name, .token.tag {
      color: ${theme.syntax.fn} !important;
      font-weight: 600;
    }

    .token.number, .token.constant, .token.symbol {
      color: ${theme.syntax.num} !important;
      font-weight: 600;
    }

    .token.punctuation { color: ${theme.syntax.op} !important; }
    .token.selector, .token.property { color: ${theme.syntax.txt} !important; font-weight: 500; }
    .token.variable, .token.constant { color: ${theme.syntax.var || theme.syntax.txt} !important; }
    .token.class-name, .token.type { color: ${theme.syntax.type || theme.syntax.fn} !important; }

    ${config.copyButton ? `
    .copy-button {
      position: absolute;
      ${copyButtonPosition}
      background: rgba(${this.hexToRgb(theme.window)}, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      color: ${theme.syntax.txt};
      opacity: 0.7;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .copy-button:hover {
      opacity: 1;
      background: rgba(${this.hexToRgb(theme.window)}, 0.95);
      transform: scale(1.08) translateZ(0);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    .copy-button:active { transform: scale(0.98) translateZ(0); }

    .copy-button.copied {
      background: rgba(46, 204, 113, 0.9);
      color: white;
      border-color: rgba(46, 204, 113, 0.5);
    }
    ` : ""}

    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      transition: background 0.2s;
    }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

    ${config.responsive ? `
    @media (max-width: 768px) {
      .code-content { padding: calc(${config.codePadding} * 0.75); }
      code[class*="language-"] { font-size: calc(${config.fontSize} * 0.9); }
      ${config.showHeader ? `
      .window-header { padding: 12px 18px; min-height: 46px; }
      .window-title { font-size: 13px; }
      .window-control { width: 11px; height: 11px; }
      ` : ""}
    }

    @media (max-width: 480px) {
      .code-content { padding: calc(${config.codePadding} * 0.5); }
      code[class*="language-"] { font-size: calc(${config.fontSize} * 0.85); line-height: 1.5; }
      ${config.showHeader ? `
      .window-header { padding: 10px 14px; min-height: 42px; }
      .window-title { font-size: 12px; }
      .window-control { width: 10px; height: 10px; gap: 8px; }
      ` : ""}
      ${config.copyButton ? `.copy-button { padding: 8px 10px; }` : ""}
    }
    ` : ""}
  </style>
</head>
<body>
  <div class="code-window">
    ${config.showHeader ? `
    <div class="window-header">
      ${config.showWindowControls ? `
      <div class="window-controls">
        <div class="window-control close"></div>
        <div class="window-control minimize"></div>
        <div class="window-control maximize"></div>
      </div>
      ` : "<div class='header-spacer'></div>"}
      
      ${config.title ? `<div class="window-title">${config.title}</div>` : ""}
      
      <div class="header-spacer"></div>
    </div>
    ` : ""}
    
    <div class="code-content">
      ${config.copyButton ? `
      <button class="copy-button" onclick="copyCode()" title="Copy code">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      ` : ""}
      
      <div class="code-container">
        ${config.showLineNumbers ? `<div class="line-numbers">${lineNumbers}</div>` : ""}
        <pre class="language-${config.language}"><code class="language-${config.language}">${escapedCode}</code></pre>
      </div>
    </div>
  </div>

  <script>
    if (typeof Prism !== 'undefined') { Prism.highlightAll(); }
    
    ${config.copyButton ? `
    function copyCode() {
      const codeElement = document.querySelector('code[class*="language-"]');
      const text = codeElement.textContent;
      const button = document.querySelector('.copy-button');
      
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17L4 12"></path></svg>';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => { console.error('Failed to copy: ', err); });
    }
    ` : ""}
  </script>
</body>
</html>`.trim();
  }
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "<",
      ">": ">",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  calculateDimensions(lines, config) {
    let containerStyles = "";
    switch (config.autoSize) {
      case "fullscreen":
        containerStyles = `width: 100vw; height: 100vh;`;
        break;
      case "compact":
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const lineCount = lines.length;
        const charWidth = 9;
        const lineHeight = parseInt(config.fontSize) * config.lineHeight;
        const parseSize = size => {
          if (typeof size === "number") return size;
          if (size === "100%") return 2400;
          return parseInt(size) || 300;
        };
        const minWidth = parseSize(config.minWidth);
        const maxWidth = parseSize(config.maxWidth);
        const minHeight = parseSize(config.minHeight);
        const maxHeight = parseSize(config.maxHeight);
        const contentWidth = Math.min(Math.max(maxLineLength * charWidth + 120, minWidth), maxWidth);
        const contentHeight = Math.min(Math.max(lineCount * lineHeight + 120, minHeight), maxHeight);
        containerStyles = `width: ${contentWidth}px; height: ${contentHeight}px;`;
        break;
      case "fixed":
        containerStyles = `width: ${config.width}; height: ${config.height};`;
        break;
      case "flexible":
      default:
        containerStyles = `width: ${config.maxWidth}; height: ${config.maxHeight}; min-width: ${config.minWidth}; min-height: ${config.minHeight};`;
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
      mainStyles = `background: rgba(${this.hexToRgb(windowBg)}, ${opacity}); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%);`;
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
  getShadowStyles(config) {
    if (!config.showShadow) {
      return "box-shadow: none;";
    }
    let blur = config.shadowBlur;
    let spread = config.shadowSpread;
    let color = config.shadowColor;
    switch (config.shadowIntensity) {
      case "light":
        color = this.adjustShadowOpacity(color, .6);
        blur = `calc(${blur} * 0.7)`;
        break;
      case "heavy":
        color = this.adjustShadowOpacity(color, 1.3);
        blur = `calc(${blur} * 1.3)`;
        spread = `calc(${spread} * 1.5)`;
        break;
      default:
        break;
    }
    return `box-shadow: 0 ${blur} ${spread} ${color}, 0 0 0 1px rgba(255, 255, 255, 0.1);`;
  }
  getBorderStyles(config) {
    if (config.borderStyle === "none" || !config.showOutline) {
      return "border: none;";
    }
    return `border: ${config.borderWidth} ${config.borderStyle} ${config.borderColor};`;
  }
  getCopyButtonPosition(position) {
    switch (position) {
      case "top-right":
        return "top: 20px; right: 20px;";
      case "top-left":
        return "top: 20px; left: 20px;";
      case "bottom-left":
        return "bottom: 20px; left: 20px;";
      case "bottom-right":
      default:
        return "bottom: 20px; right: 20px;";
    }
  }
  adjustShadowOpacity(color, factor) {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = rgbaMatch[1];
      const g = rgbaMatch[2];
      const b = rgbaMatch[3];
      let a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
      a = Math.min(1, a * factor);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color;
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
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      return res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}