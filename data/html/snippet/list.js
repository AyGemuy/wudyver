const templates = [{
  html: (code, title, lang) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Futuristic Code Card</title>
    
    <!-- Highlight.js CDN -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/styles/atom-one-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/languages/javascript.min.js"></script>
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: radial-gradient(ellipse at center, #0f0f23 0%, #050510 70%);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }

        /* Animated background particles */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.05), transparent),
                radial-gradient(2px 2px at 40px 70px, rgba(0, 212, 170, 0.1), transparent),
                radial-gradient(1px 1px at 90px 40px, rgba(124, 58, 237, 0.15), transparent);
            background-repeat: repeat;
            background-size: 200px 150px;
            animation: sparkle 30s linear infinite;
            pointer-events: none;
            z-index: 0;
        }

        .code-card {
            background: rgba(10, 10, 25, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(100, 100, 120, 0.2);
            border-radius: 16px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            position: relative;
            overflow: hidden;
            box-shadow: 
                0 25px 50px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            animation: slideIn 0.8s ease-out;
            z-index: 1;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 28px;
            background: linear-gradient(135deg, rgba(15, 15, 35, 0.9) 0%, rgba(25, 25, 45, 0.8) 100%);
            border-bottom: 1px solid rgba(100, 100, 120, 0.2);
            position: relative;
        }

        .card-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.5), transparent);
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .file-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            color: white;
            box-shadow: 0 4px 8px rgba(249, 115, 22, 0.3);
        }

        .file-name {
            font-family: 'JetBrains Mono', monospace;
            font-size: 15px;
            color: #e2e8f0;
            font-weight: 500;
            letter-spacing: 0.5px;
        }

        .file-size {
            font-size: 12px;
            color: #64748b;
            margin-left: 8px;
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .language-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(124, 58, 237, 0.15);
            border: 1px solid rgba(124, 58, 237, 0.3);
            border-radius: 12px;
            font-size: 11px;
            color: #c084fc;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            background: #c084fc;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .window-controls {
            display: flex;
            gap: 8px;
        }

        .control-btn {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .control-btn.close { background: #ef4444; }
        .control-btn.minimize { background: #f59e0b; }
        .control-btn.maximize { background: #22c55e; }

        .control-btn:hover {
            transform: scale(1.2);
            box-shadow: 0 0 12px currentColor;
        }

        .code-container {
            display: flex;
            height: calc(90vh - 140px);
            max-height: 600px;
            min-height: 300px;
        }

        .line-numbers {
            background: rgba(5, 5, 15, 0.8);
            border-right: 1px solid rgba(100, 100, 120, 0.15);
            padding: 20px 0;
            user-select: none;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #4a5568;
            text-align: right;
            min-width: 60px;
            overflow: hidden;
            flex-shrink: 0;
        }

        .line-number {
            padding: 0 16px;
            line-height: 1.6;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .line-number:hover {
            background: rgba(100, 100, 120, 0.1);
            color: #64748b;
        }

        .code-content {
            flex: 1;
            overflow: auto;
            padding: 20px 24px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #e2e8f0;
            background: rgba(10, 10, 20, 0.3);
        }

        .code-block {
            margin: 0;
            padding: 0;
            background: transparent !important;
        }

        .code-line {
            display: block;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0;
            margin: 0;
            min-height: 1.6em;
            transition: all 0.2s ease;
        }

        .code-line:hover {
            background: rgba(100, 100, 120, 0.08);
            border-radius: 4px;
            margin: 0 -8px;
            padding: 0 8px;
        }

        /* Enhanced syntax highlighting */
        .hljs {
            background: transparent !important;
            color: #e2e8f0 !important;
            padding: 0 !important;
        }

        .hljs-keyword {
            color: #c084fc !important;
            font-weight: 500 !important;
        }

        .hljs-string {
            color: #34d399 !important;
        }

        .hljs-comment {
            color: #6b7280 !important;
            font-style: italic;
        }

        .hljs-function {
            color: #60a5fa !important;
            font-weight: 500 !important;
        }

        .hljs-number {
            color: #fbbf24 !important;
        }

        .hljs-variable {
            color: #f472b6 !important;
        }

        .hljs-built_in {
            color: #06b6d4 !important;
        }

        .hljs-attr {
            color: #fb7185 !important;
        }

        .hljs-title {
            color: #60a5fa !important;
        }

        /* Scrollbar styling */
        .code-content::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        .code-content::-webkit-scrollbar-track {
            background: rgba(15, 15, 25, 0.5);
            border-radius: 4px;
        }

        .code-content::-webkit-scrollbar-thumb {
            background: rgba(100, 100, 120, 0.4);
            border-radius: 4px;
        }

        .code-content::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 100, 120, 0.6);
        }

        /* Animations */
        @keyframes sparkle {
            0% { transform: translateY(0px) translateX(0px); }
            100% { transform: translateY(-150px) translateX(100px); }
        }

        @keyframes pulse {
            0%, 100% { 
                opacity: 1; 
                transform: scale(1);
            }
            50% { 
                opacity: 0.5; 
                transform: scale(1.2);
            }
        }

        @keyframes slideIn {
            from { 
                opacity: 0; 
                transform: translateY(30px) scale(0.95);
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
        }

        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .code-card {
                max-height: 95vh;
                border-radius: 12px;
            }
            
            .card-header {
                padding: 16px 20px;
            }
            
            .file-name {
                font-size: 13px;
            }
            
            .file-size {
                display: none;
            }
            
            .language-badge {
                padding: 4px 8px;
                font-size: 10px;
            }
            
            .line-numbers {
                min-width: 50px;
            }
            
            .line-number {
                padding: 0 12px;
                font-size: 12px;
            }
            
            .code-content {
                padding: 16px 20px;
                font-size: 13px;
            }
            
            .code-container {
                height: calc(95vh - 120px);
            }
        }

        @media (max-width: 480px) {
            .header-controls {
                gap: 12px;
            }
            
            .file-info {
                gap: 8px;
            }
            
            .file-icon {
                width: 20px;
                height: 20px;
                font-size: 10px;
            }
            
            .line-numbers {
                min-width: 45px;
            }
            
            .line-number {
                padding: 0 8px;
                font-size: 11px;
            }
            
            .code-content {
                padding: 12px 16px;
                font-size: 12px;
            }
        }
    </style>
</head>

<body>
    <div class="code-card">
        <div class="card-header">
            <div class="file-info">
                <div class="file-icon">JS</div>
                <span class="file-name" id="fileName"></span>
                <span class="file-size">2.4 KB</span>
            </div>
            <div class="header-controls">
                <div class="language-badge">
                    <div class="status-dot"></div>
                    <span id="languageName">JavaScript</span>
                </div>
                <div class="window-controls">
                    <div class="control-btn close"></div>
                    <div class="control-btn minimize"></div>
                    <div class="control-btn maximize"></div>
                </div>
            </div>
        </div>
        
        <div class="code-container">
            <div class="line-numbers" id="lineNumbers"></div>
            <div class="code-content" id="codeContent"></div>
        </div>
    </div>

    <script>
        const codeSnippetOptions = {
            code: "${code}",
            title: "${title}",
            language: "${lang}"
        };

        const elements = {
            fileName: document.getElementById('fileName'),
            languageName: document.getElementById('languageName'),
            lineNumbers: document.getElementById('lineNumbers'),
            codeContent: document.getElementById('codeContent')
        };

        function renderCode() {
            const { code, title, language } = codeSnippetOptions;
            const lines = code.split('\n');

            // Set file info
            elements.fileName.textContent = title;
            elements.languageName.textContent = language.toUpperCase();

            // Clear existing content
            elements.lineNumbers.innerHTML = '';
            elements.codeContent.innerHTML = '';

            // Generate line numbers
            lines.forEach((_, index) => {
                const lineNumber = document.createElement('div');
                lineNumber.className = 'line-number';
                lineNumber.textContent = index + 1;
                elements.lineNumbers.appendChild(lineNumber);
            });

            // Create and highlight code
            const pre = document.createElement('pre');
            pre.className = 'code-block';
            const codeElement = document.createElement('code');
            codeElement.className = 'hljs language-' + language;
            codeElement.textContent = code;
            
            pre.appendChild(codeElement);
            elements.codeContent.appendChild(pre);

            // Apply syntax highlighting
            hljs.highlightElement(codeElement);

            // Sync scroll between line numbers and code
            elements.codeContent.addEventListener('scroll', () => {
                elements.lineNumbers.scrollTop = elements.codeContent.scrollTop;
            });
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(renderCode, 0); // Small delay to ensure highlight.js is ready
        });

        // Add interactive functionality to window controls
        document.querySelector('.control-btn.close').addEventListener('click', () => {
            document.querySelector('.code-card').style.transform = 'scale(0.8)';
            document.querySelector('.code-card').style.opacity = '0';
        });

        document.querySelector('.control-btn.minimize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'scale(0.1)';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
            }, 500);
        });

        document.querySelector('.control-btn.maximize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.maxWidth = card.style.maxWidth === '95vw' ? '900px' : '95vw';
            card.style.maxHeight = card.style.maxHeight === '95vh' ? '90vh' : '95vh';
        });
    </script>
</body>
</html>`
}, {
  html: (code, title, lang) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cyberpunk Code Terminal</title>
    
    <!-- Highlight.js CDN -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/styles/tokyo-night-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/languages/javascript.min.js"></script>
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Roboto+Mono:wght@300;400;500&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: 
                linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 25%, #0a1a0a 50%, #1a1a0a 75%, #0a0a1a 100%);
            font-family: 'Roboto Mono', monospace;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }

        /* Cyberpunk grid overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 0, 255, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: gridPulse 4s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
        }

        /* Neon particles */
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(2px 2px at 20px 30px, #00ffff, transparent),
                radial-gradient(2px 2px at 40px 70px, #ff00ff, transparent),
                radial-gradient(1px 1px at 90px 40px, #ffff00, transparent),
                radial-gradient(1px 1px at 130px 20px, #ff0080, transparent),
                radial-gradient(2px 2px at 160px 60px, #00ff80, transparent);
            background-repeat: repeat;
            background-size: 200px 200px;
            animation: neonFloat 20s linear infinite;
            pointer-events: none;
            z-index: 0;
            opacity: 0.1;
        }

        .code-card {
            background: rgba(5, 5, 5, 0.95);
            backdrop-filter: blur(20px);
            border: 2px solid;
            border-image: linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff) 1;
            border-radius: 0;
            width: 100%;
            max-width: 950px;
            max-height: 90vh;
            position: relative;
            overflow: hidden;
            box-shadow: 
                0 0 30px rgba(0, 255, 255, 0.3),
                0 0 60px rgba(255, 0, 255, 0.2),
                inset 0 0 30px rgba(0, 0, 0, 0.5);
            z-index: 1;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 28px;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 0, 20, 0.8) 100%);
            border-bottom: 2px solid #00ffff;
            position: relative;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .card-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ffff, #ff00ff, #ffff00, transparent);
            animation: scanline 2s linear infinite;
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .file-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #ff00ff, #00ffff);
            border-radius: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            color: #000;
            box-shadow: 
                0 0 20px rgba(255, 0, 255, 0.5),
                inset 0 0 10px rgba(255, 255, 255, 0.2);
            font-family: 'Orbitron', monospace;
            animation: iconGlow 3s ease-in-out infinite;
        }

        .file-name {
            font-family: 'Orbitron', monospace;
            font-size: 18px;
            color: #00ffff;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            text-shadow: 0 0 10px #00ffff;
            animation: textGlow 2s ease-in-out infinite alternate;
        }

        .file-size {
            font-size: 12px;
            color: #ff00ff;
            margin-left: 10px;
            text-shadow: 0 0 5px #ff00ff;
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .language-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 0, 255, 0.1);
            border: 2px solid #ff00ff;
            border-radius: 0;
            font-size: 12px;
            color: #ff00ff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-family: 'Orbitron', monospace;
            box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
            animation: badgePulse 3s ease-in-out infinite;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #ff00ff;
            border-radius: 50%;
            animation: statusBlink 1s infinite;
            box-shadow: 0 0 10px #ff00ff;
        }

        .window-controls {
            display: flex;
            gap: 12px;
        }

        .control-btn {
            width: 16px;
            height: 16px;
            border-radius: 0;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid;
            position: relative;
        }

        .control-btn.close { 
            background: #ff0040; 
            border-color: #ff0040;
            box-shadow: 0 0 10px #ff0040;
        }
        .control-btn.minimize { 
            background: #ffff00; 
            border-color: #ffff00;
            box-shadow: 0 0 10px #ffff00;
        }
        .control-btn.maximize { 
            background: #00ff40; 
            border-color: #00ff40;
            box-shadow: 0 0 10px #00ff40;
        }

        .control-btn:hover {
            transform: scale(1.3);
            box-shadow: 0 0 20px currentColor;
        }

        .code-container {
            display: flex;
            height: calc(90vh - 140px);
            max-height: 600px;
            min-height: 300px;
        }

        .line-numbers {
            background: rgba(0, 0, 0, 0.8);
            border-right: 2px solid #00ffff;
            padding: 20px 0;
            user-select: none;
            font-family: 'Roboto Mono', monospace;
            font-size: 14px;
            color: #00ffff;
            text-align: right;
            min-width: 70px;
            overflow: hidden;
            flex-shrink: 0;
            box-shadow: inset -10px 0 20px rgba(0, 255, 255, 0.1);
        }

        .line-number {
            padding: 0 16px;
            line-height: 1.6;
            transition: all 0.3s ease;
            cursor: pointer;
            text-shadow: 0 0 5px #00ffff;
        }

        .line-number:hover {
            background: rgba(0, 255, 255, 0.1);
            color: #ffffff;
            text-shadow: 0 0 10px #00ffff;
            transform: translateX(-5px);
        }

        .code-content {
            flex: 1;
            overflow: auto;
            padding: 20px 24px;
            font-family: 'Roboto Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #00ff00;
            background: rgba(0, 0, 0, 0.7);
            position: relative;
        }

        .code-content::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 255, 0, 0.03) 2px,
                    rgba(0, 255, 0, 0.03) 4px
                );
            pointer-events: none;
            animation: scanlines 0.1s linear infinite;
        }

        .code-block {
            margin: 0;
            padding: 0;
            background: transparent !important;
            position: relative;
            z-index: 1;
        }

        .code-line {
            display: block;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0;
            margin: 0;
            min-height: 1.6em;
            transition: all 0.3s ease;
        }

        .code-line:hover {
            background: rgba(0, 255, 255, 0.05);
            border-left: 3px solid #00ffff;
            margin: 0 -8px;
            padding: 0 8px;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
        }

        /* Cyberpunk syntax highlighting */
        .hljs {
            background: transparent !important;
            color: #00ff00 !important;
            padding: 0 !important;
        }

        .hljs-keyword {
            color: #ff00ff !important;
            font-weight: 700 !important;
            text-shadow: 0 0 5px #ff00ff;
        }

        .hljs-string {
            color: #ffff00 !important;
            text-shadow: 0 0 5px #ffff00;
        }

        .hljs-comment {
            color: #808080 !important;
            font-style: italic;
        }

        .hljs-function {
            color: #00ffff !important;
            font-weight: 700 !important;
            text-shadow: 0 0 5px #00ffff;
        }

        .hljs-number {
            color: #ff8000 !important;
            text-shadow: 0 0 5px #ff8000;
        }

        .hljs-variable {
            color: #ff0080 !important;
            text-shadow: 0 0 5px #ff0080;
        }

        .hljs-built_in {
            color: #00ff80 !important;
            text-shadow: 0 0 5px #00ff80;
        }

        .hljs-attr {
            color: #8000ff !important;
            text-shadow: 0 0 5px #8000ff;
        }

        .hljs-title {
            color: #00ffff !important;
            text-shadow: 0 0 5px #00ffff;
        }

        /* Scrollbar styling */
        .code-content::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }

        .code-content::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #00ffff;
        }

        .code-content::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #00ffff, #ff00ff);
            border-radius: 0;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .code-content::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
        }

        /* Cyberpunk animations */
        @keyframes gridPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
        }

        @keyframes neonFloat {
            0% { transform: translateY(0px) translateX(0px); }
            100% { transform: translateY(-200px) translateX(200px); }
        }

        

        @keyframes scanline {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        @keyframes iconGlow {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.2);
            }
            50% { 
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.7), inset 0 0 15px rgba(255, 255, 255, 0.4);
            }
        }

        @keyframes textGlow {
            0% { text-shadow: 0 0 10px #00ffff; }
            100% { text-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff; }
        }

        @keyframes badgePulse {
            0%, 100% { 
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
                border-color: #ff00ff;
            }
            50% { 
                box-shadow: 0 0 25px rgba(255, 0, 255, 0.6);
                border-color: #ff80ff;
            }
        }

        @keyframes statusBlink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        @keyframes scanlines {
            0% { transform: translateY(0); }
            100% { transform: translateY(4px); }
        }

        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .code-card {
                max-height: 95vh;
            }
            
            .card-header {
                padding: 16px 20px;
            }
            
            .file-name {
                font-size: 14px;
            }
            
            .file-size {
                display: none;
            }
            
            .language-badge {
                padding: 6px 10px;
                font-size: 10px;
            }
            
            .line-numbers {
                min-width: 60px;
            }
            
            .line-number {
                padding: 0 12px;
                font-size: 12px;
            }
            
            .code-content {
                padding: 16px 20px;
                font-size: 13px;
            }
            
            .code-container {
                height: calc(95vh - 120px);
            }
        }
    </style>
</head>

<body>
    <div class="code-card">
        <div class="card-header">
            <div class="file-info">
                <div class="file-icon">JS</div>
                <span class="file-name" id="fileName"></span>
                <span class="file-size">2.4 KB</span>
            </div>
            <div class="header-controls">
                <div class="language-badge">
                    <div class="status-dot"></div>
                    <span id="languageName">JavaScript</span>
                </div>
                <div class="window-controls">
                    <div class="control-btn close"></div>
                    <div class="control-btn minimize"></div>
                    <div class="control-btn maximize"></div>
                </div>
            </div>
        </div>
        
        <div class="code-container">
            <div class="line-numbers" id="lineNumbers"></div>
            <div class="code-content" id="codeContent"></div>
        </div>
    </div>

    <script>
        const codeSnippetOptions = {
            code: "${code}",
            title: "${title}",
            language: "${lang}"
        };

        const elements = {
            fileName: document.getElementById('fileName'),
            languageName: document.getElementById('languageName'),
            lineNumbers: document.getElementById('lineNumbers'),
            codeContent: document.getElementById('codeContent')
        };

        function renderCode() {
            const { code, title, language } = codeSnippetOptions;
            const lines = code.split('\n');

            // Set file info
            elements.fileName.textContent = title;
            elements.languageName.textContent = language.toUpperCase();

            // Clear existing content
            elements.lineNumbers.innerHTML = '';
            elements.codeContent.innerHTML = '';

            // Generate line numbers
            lines.forEach((_, index) => {
                const lineNumber = document.createElement('div');
                lineNumber.className = 'line-number';
                lineNumber.textContent = String(index + 1).padStart(2, '0');
                elements.lineNumbers.appendChild(lineNumber);
            });

            // Create and highlight code
            const pre = document.createElement('pre');
            pre.className = 'code-block';
            const codeElement = document.createElement('code');
            codeElement.className = 'hljs language-' + language;
            codeElement.textContent = code;
            
            pre.appendChild(codeElement);
            elements.codeContent.appendChild(pre);

            // Apply syntax highlighting
            hljs.highlightElement(codeElement);

            // Sync scroll between line numbers and code
            elements.codeContent.addEventListener('scroll', () => {
                elements.lineNumbers.scrollTop = elements.codeContent.scrollTop;
            });
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(renderCode, 0);
        });

        // Enhanced interactive functionality
        document.querySelector('.control-btn.close').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'scale(0) rotateY(180deg)';
            card.style.opacity = '0';
        });

        document.querySelector('.control-btn.minimize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'scaleY(0.1) rotateX(90deg)';
            setTimeout(() => {
                card.style.transform = 'scaleY(1) rotateX(0deg)';
            }, 600);
        });

        document.querySelector('.control-btn.maximize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            if (card.style.maxWidth === '98vw') {
                card.style.maxWidth = '950px';
                card.style.maxHeight = '90vh';
                card.style.transform = 'scale(1)';
            } else {
                card.style.maxWidth = '98vw';
                card.style.maxHeight = '98vh';
                card.style.transform = 'scale(1.02)';
            }
        });

        // Add typing effect on load
        setTimeout(() => {
            const fileNameElement = document.getElementById('fileName');
            const originalText = fileNameElement.textContent;
            fileNameElement.textContent = '';
            
            let i = 0;
            const typeInterval = setInterval(() => {
                fileNameElement.textContent += originalText[i];
                i++;
                if (i >= originalText.length) {
                    clearInterval(typeInterval);
                }
            }, 100);
        }, 1000);
    </script>
</body>
</html>`
}, {
  html: (code, title, lang) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glassmorphism Code Studio</title>
    
    <!-- Highlight.js CDN -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/styles/github-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/languages/javascript.min.js"></script>
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=SF+Mono:wght@300;400;500;600&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: 
                linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }

        /* Floating glass shapes */
        body::before {
            content: '';
            position: fixed;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
            
            pointer-events: none;
            z-index: 0;
        }

        /* Subtle moving bubbles */
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle 30px at 10% 20%, rgba(255, 255, 255, 0.1), transparent),
                radial-gradient(circle 20px at 80% 80%, rgba(255, 255, 255, 0.08), transparent),
                radial-gradient(circle 25px at 40% 60%, rgba(255, 255, 255, 0.06), transparent),
                radial-gradient(circle 15px at 90% 10%, rgba(255, 255, 255, 0.09), transparent),
                radial-gradient(circle 35px at 70% 30%, rgba(255, 255, 255, 0.07), transparent);
            background-repeat: no-repeat;
            
            pointer-events: none;
            z-index: 0;
        }

        .code-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            width: 100%;
            max-width: 920px;
            max-height: 90vh;
            position: relative;
            overflow: hidden;
            box-shadow: 
                0 25px 45px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset,
                0 1px 3px rgba(255, 255, 255, 0.3) inset;
            
            z-index: 1;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 32px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
        }

        .card-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .file-icon {
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            box-shadow: 
                0 8px 16px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .file-icon:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 
                0 12px 24px rgba(0, 0, 0, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        }

        .file-name {
            font-family: 'SF Mono', monospace;
            font-size: 18px;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 500;
            letter-spacing: 0.5px;
        }

        .file-size {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin-left: 12px;
            font-weight: 400;
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .language-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .language-badge:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: rgba(34, 197, 94, 0.8);
            border-radius: 50%;
            animation: statusPulse 2s ease-in-out infinite;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
        }

        .window-controls {
            display: flex;
            gap: 8px;
        }

        .control-btn {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .control-btn.close { 
            background: rgba(239, 68, 68, 0.8);
        }
        .control-btn.minimize { 
            background: rgba(245, 158, 11, 0.8);
        }
        .control-btn.maximize { 
            background: rgba(34, 197, 94, 0.8);
        }

        .control-btn:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .code-container {
            display: flex;
            height: calc(90vh - 140px);
            max-height: 600px;
            min-height: 300px;
        }

        .line-numbers {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            padding: 24px 0;
            user-select: none;
            font-family: 'SF Mono', monospace;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
            text-align: right;
            min-width: 70px;
            overflow: hidden;
            flex-shrink: 0;
        }

        .line-number {
            padding: 0 20px;
            line-height: 1.6;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .line-number:hover {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.8);
            transform: translateX(-3px);
        }

        .code-content {
            flex: 1;
            overflow: auto;
            padding: 24px 28px;
            font-family: 'SF Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(5px);
        }

        .code-block {
            margin: 0;
            padding: 0;
            background: transparent !important;
        }

        .code-line {
            display: block;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0;
            margin: 0;
            min-height: 1.6em;
            transition: all 0.3s ease;
            border-radius: 6px;
        }

        .code-line:hover {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            margin: 0 -12px;
            padding: 0 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Glass-style syntax highlighting */
        .hljs {
            background: transparent !important;
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0 !important;
        }

        .hljs-keyword {
            color: rgba(168, 85, 247, 0.95) !important;
            font-weight: 600 !important;
        }

        .hljs-string {
            color: rgba(34, 197, 94, 0.9) !important;
        }

        .hljs-comment {
            color: rgba(255, 255, 255, 0.5) !important;
            font-style: italic;
        }

        .hljs-function {
            color: rgba(59, 130, 246, 0.95) !important;
            font-weight: 500 !important;
        }

        .hljs-number {
            color: rgba(251, 191, 36, 0.9) !important;
        }

        .hljs-variable {
            color: rgba(244, 114, 182, 0.9) !important;
        }

        .hljs-built_in {
            color: rgba(6, 182, 212, 0.9) !important;
        }

        .hljs-attr {
            color: rgba(251, 113, 133, 0.9) !important;
        }

        .hljs-title {
            color: rgba(59, 130, 246, 0.95) !important;
        }

        /* Glass scrollbar */
        .code-content::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        .code-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
        }

        .code-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .code-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Glass animations */
        @keyframes float {
            0%, 100% { 
                transform: translateY(0px) rotate(0deg);
            }
            50% { 
                transform: translateY(-20px) rotate(5deg);
            }
        }

        @keyframes bubbleFloat {
            0% { 
                transform: translateY(0px) translateX(0px);
                opacity: 0.1;
            }
            50% {
                opacity: 0.3;
            }
            100% { 
                transform: translateY(-100vh) translateX(50px);
                opacity: 0;
            }
        }

        @keyframes glassAppear {
            0% { 
                opacity: 0; 
                transform: translateY(40px) scale(0.9);
                backdrop-filter: blur(0px);
            }
            50% {
                opacity: 0.5;
                backdrop-filter: blur(12px);
            }
            100% { 
                opacity: 1; 
                transform: translateY(0) scale(1);
                backdrop-filter: blur(25px);
            }
        }

        @keyframes statusPulse {
            0%, 100% { 
                opacity: 0.8;
                transform: scale(1);
                box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
            }
            50% { 
                opacity: 1;
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
            }
        }

        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 15px;
            }
            
            .code-card {
                max-height: 95vh;
                border-radius: 20px;
            }
            
            .card-header {
                padding: 20px 24px;
            }
            
            .file-name {
                font-size: 16px;
            }
            
            .file-size {
                display: none;
            }
            
            .language-badge {
                padding: 6px 12px;
                font-size: 11px;
            }
            
            .line-numbers {
                min-width: 60px;
                padding: 20px 0;
            }
            
            .line-number {
                padding: 0 16px;
                font-size: 12px;
            }
            
            .code-content {
                padding: 20px 24px;
                font-size: 13px;
            }
            
            .code-container {
                height: calc(95vh - 120px);
            }
        }

        @media (max-width: 480px) {
            .card-header {
                padding: 16px 20px;
            }
            
            .header-controls {
                gap: 16px;
            }
            
            .file-info {
                gap: 12px;
            }
            
            .file-icon {
                width: 36px;
                height: 36px;
                font-size: 12px;
            }
            
            .line-numbers {
                min-width: 50px;
            }
            
            .line-number {
                padding: 0 12px;
                font-size: 11px;
            }
            
            .code-content {
                padding: 16px 20px;
                font-size: 12px;
            }
        }

        /* Enhanced glass effects for modern browsers */
        @supports (backdrop-filter: blur(25px)) {
            .code-card {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(30px) saturate(1.2);
            }
            
            .card-header {
                backdrop-filter: blur(15px) saturate(1.1);
            }
            
            .language-badge {
                backdrop-filter: blur(15px) saturate(1.1);
            }
        }
    </style>
</head>

<body>
    <div class="code-card">
        <div class="card-header">
            <div class="file-info">
                <div class="file-icon">JS</div>
                <span class="file-name" id="fileName"></span>
                <span class="file-size">2.4 KB</span>
            </div>
            <div class="header-controls">
                <div class="language-badge">
                    <div class="status-dot"></div>
                    <span id="languageName">JavaScript</span>
                </div>
                <div class="window-controls">
                    <div class="control-btn close"></div>
                    <div class="control-btn minimize"></div>
                    <div class="control-btn maximize"></div>
                </div>
            </div>
        </div>
        
        <div class="code-container">
            <div class="line-numbers" id="lineNumbers"></div>
            <div class="code-content" id="codeContent"></div>
        </div>
    </div>

    <script>
        const codeSnippetOptions = {
            code: "${code}",
            title: "${title}",
            language: "${lang}"
        };

        const elements = {
            fileName: document.getElementById('fileName'),
            languageName: document.getElementById('languageName'),
            lineNumbers: document.getElementById('lineNumbers'),
            codeContent: document.getElementById('codeContent')
        };

        function renderCode() {
            const { code, title, language } = codeSnippetOptions;
            const lines = code.split('\n');

            // Set file info
            elements.fileName.textContent = title;
            elements.languageName.textContent = language.toUpperCase();

            // Clear existing content
            elements.lineNumbers.innerHTML = '';
            elements.codeContent.innerHTML = '';

            // Generate line numbers
            lines.forEach((_, index) => {
                const lineNumber = document.createElement('div');
                lineNumber.className = 'line-number';
                lineNumber.textContent = index + 1;
                elements.lineNumbers.appendChild(lineNumber);
            });

            // Create and highlight code
            const pre = document.createElement('pre');
            pre.className = 'code-block';
            const codeElement = document.createElement('code');
            codeElement.className = 'hljs language-' + language;
            codeElement.textContent = code;
            
            pre.appendChild(codeElement);
            elements.codeContent.appendChild(pre);

            // Apply syntax highlighting
            hljs.highlightElement(codeElement);

            // Sync scroll between line numbers and code
            elements.codeContent.addEventListener('scroll', () => {
                elements.lineNumbers.scrollTop = elements.codeContent.scrollTop;
            });
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(renderCode, 0);
        });

        // Enhanced glass interactions
        document.querySelector('.control-btn.close').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'scale(0.8) rotateY(15deg)';
            card.style.opacity = '0';
            card.style.filter = 'blur(10px)';
        });

        document.querySelector('.control-btn.minimize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'scaleY(0.05) rotateX(2deg)';
            card.style.transformOrigin = 'center bottom';
            setTimeout(() => {
                card.style.transform = 'scaleY(1) rotateX(0deg)';
                card.style.transformOrigin = 'center center';
            }, 400);
        });

        document.querySelector('.control-btn.maximize').addEventListener('click', () => {
            const card = document.querySelector('.code-card');
            const isMaximized = card.style.maxWidth === '95vw';
            
            if (isMaximized) {
                card.style.maxWidth = '920px';
                card.style.maxHeight = '90vh';
                card.style.transform = 'scale(1)';
                card.style.borderRadius = '24px';
            } else {
                card.style.maxWidth = '95vw';
                card.style.maxHeight = '95vh';
                card.style.transform = 'scale(1.01)';
                card.style.borderRadius = '16px';
            }
        });

        // Add subtle parallax effect on mouse move
        document.addEventListener('mousemove', (e) => {
    const card = document.querySelector('.code-card');
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * 2;
    const rotateY = (centerX - x) / centerX * 2;
    
    card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.01)';
});

        document.addEventListener('mouseleave', () => {
            const card = document.querySelector('.code-card');
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        });
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  code,
  title,
  lang
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(code, title, lang) || "Template tidak ditemukan";
};
export default getTemplate;