const templates = [{
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </script><!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Rajdhani:wght@400;600&family=Share+Tech+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Rajdhani', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, #070b17 0%, #111827 100%);
            border-radius: 2px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 30px rgba(0, 195, 255, 0.3);
            border: 1px solid rgba(0, 195, 255, 0.7);
        }
        
        /* Enhanced cyber grid */
        .grid-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(0, 195, 255, 0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 195, 255, 0.07) 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 1;
        }
        
        /* Digital circuit pattern */
        .circuit-overlay {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%2300C3FF' stroke-width='1' opacity='0.15'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.2;
            z-index: 1;
        }
        
        /* Digital corner accents */
        .corner-accent {
            position: absolute;
            width: 50px;
            height: 50px;
            z-index: 2;
        }
        
        .top-left {
            top: 0;
            left: 0;
            border-top: 2px solid #00c3ff;
            border-left: 2px solid #00c3ff;
        }
        
        .top-right {
            top: 0;
            right: 0;
            border-top: 2px solid #00c3ff;
            border-right: 2px solid #00c3ff;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            border-bottom: 2px solid #00c3ff;
            border-left: 2px solid #00c3ff;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            border-bottom: 2px solid #00c3ff;
            border-right: 2px solid #00c3ff;
        }
        
        .glow-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 20px rgba(0, 195, 255, 0.4);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header with tech elements */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background-color: rgba(7, 11, 23, 0.9);
            border-bottom: 1px solid rgba(0, 195, 255, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(0, 195, 255, 0.7), transparent);
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(0, 195, 255, 0.7));
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 3px;
            border: 1px solid #00c3ff;
            overflow: hidden;
            margin-right: 15px;
            background-color: #1e2535;
            position: relative;
        }
        
        .group-avatar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 10px rgba(0, 195, 255, 0.5);
        }
        
        .group-name {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 500;
            text-shadow: 0 0 10px rgba(0, 195, 255, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #00c3ff;
            font-size: 14px;
            font-family: 'Share Tech Mono', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #00c3ff;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px #00c3ff;
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Fixed left panel with proper avatar and frame integration */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(0, 195, 255, 0.5);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background-color: rgba(7, 11, 23, 0.6);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 195, 255, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 195, 255, 0.5), transparent);
        }
        
        /* Fixed avatar container structure */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        /* Properly positioned digital frame */
        .digital-frame {
            position: absolute;
            width: 150px;
            height: 150px;
            top: 0;
            left: 0;
            border: 1px solid rgba(0, 195, 255, 0.5);
            border-radius: 50%;
            z-index: 1;
        }
        
        .digital-frame::before {
            content: '';
            position: absolute;
            top: -3px;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: #00c3ff;
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #00c3ff;
        }
        
        .digital-frame::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: #00c3ff;
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #00c3ff;
        }
        
        /* Fixed perfectly circular user avatar */
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid #00c3ff;
            overflow: hidden;
            background-color: #1e2535;
            box-shadow: 0 0 20px rgba(0, 195, 255, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        .user-status {
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 3px 8px;
            border: 1px solid rgba(0, 195, 255, 0.5);
            background-color: rgba(0, 195, 255, 0.1);
            margin-top: 8px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            color: #00c3ff;
        }
        
        /* Enhanced right panel with cyber elements */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden; /* Prevent content from spilling outside */
        }
        
        .right-panel::before {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 50px;
            height: 1px;
            background-color: rgba(0, 195, 255, 0.5);
        }
        
        .right-panel::after {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 1px;
            height: 50px;
            background-color: rgba(0, 195, 255, 0.5);
        }
        
        .welcome-title {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 12px rgba(0, 195, 255, 0.6);
            text-align: center;
            position: relative;
        }
        
        /* Adjust welcome title spacing when username wraps to multiple lines */
        .welcome-title.has-long-name {
            margin-bottom: 0;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            height: 2px;
            width: 40px;
            background-color: #00c3ff;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -50px;
        }
        
        .welcome-title::after {
            right: -50px;
        }
        
        .user-name {
            font-family: 'Orbitron', sans-serif;
            color: #00c3ff;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(0, 195, 255, 0.7);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: manual;
            line-height: 1.1;
        }
        
        /* Responsive font size for long usernames */
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(0, 195, 255, 0.7), transparent);
        }
        
        .welcome-message {
            font-family: 'Rajdhani', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0; /* Adjusted margin to accommodate long usernames */
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(0, 195, 255, 0.3);
            background-color: rgba(0, 195, 255, 0.05);
            position: relative;
        }
        
        .welcome-message::before,
        .welcome-message::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border-style: solid;
            border-color: #00c3ff;
            border-width: 0;
        }
        
        .welcome-message::before {
            top: -1px;
            left: -1px;
            border-top-width: 1px;
            border-left-width: 1px;
        }
        
        .welcome-message::after {
            bottom: -1px;
            right: -1px;
            border-bottom-width: 1px;
            border-right-width: 1px;
        }
        
        .cyber-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .cyber-circle {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(0, 195, 255, 0.5);
            border-radius: 50%;
        }
        
        .cyber-circle-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            height: 70%;
            border: 1px solid rgba(0, 195, 255, 0.5);
            border-radius: 50%;
        }
        
        .cyber-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #00c3ff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0, 195, 255, 0.8);
        }
        
        .cyber-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .cyber-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer with tech elements */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: rgba(7, 11, 23, 0.9);
            border-top: 1px solid rgba(0, 195, 255, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(0, 195, 255, 0.7);
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: 0;
            right: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(0, 195, 255, 0.7);
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #00c3ff;
        }
        
        /* Holographic elements */
        .holo-element {
            position: absolute;
            background-color: rgba(0, 195, 255, 0.05);
            border: 1px solid rgba(0, 195, 255, 0.3);
            z-index: 1;
        }
        
        .holo-1 {
            top: 100px;
            right: 50px;
            width: 100px;
            height: 30px;
        }
        
        .holo-2 {
            bottom: 80px;
            left: 280px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
        }
        
        /* Data box removed as requested */
        
        /* Hexagon pattern */
        .hexagon-bg {
            position: absolute;
            bottom: -50px;
            right: -50px;
            width: 300px;
            height: 300px;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M29.13 5a2 2 0 0 1 1.74 1l13.856 24a2 2 0 0 1 0 2l-13.856 24a2 2 0 0 1-1.74 1H12.87a2 2 0 0 1-1.74-1L-2.725 32a2 2 0 0 1 0-2L11.13 6a2 2 0 0 1 1.74-1H29.13z' stroke='%2300C3FF' stroke-width='.5' fill='none' opacity='.2'/%3E%3C/svg%3E");
            opacity: 0.6;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="grid-overlay"></div>
        <div class="circuit-overlay"></div>
        <div class="hexagon-bg"></div>
        <div class="glow-border"></div>
        
        <!-- Corner accents -->
        <div class="corner-accent top-left"></div>
        <div class="corner-accent top-right"></div>
        <div class="corner-accent bottom-left"></div>
        <div class="corner-accent bottom-right"></div>
        
        <!-- Holographic elements -->
        <div class="holo-element holo-1"></div>
        <div class="holo-element holo-2"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <!-- Fixed avatar and frame positioning -->
                <div class="avatar-container">
                    <div class="digital-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <!-- User information properly positioned below avatar -->
                <div class="user-status">STATUS: ${status}</div>
                <div class="user-status">ID: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="cyber-decoration">
                    <div class="cyber-circle">
                        <div class="cyber-dot cyber-dot-1"></div>
                        <div class="cyber-dot cyber-dot-2"></div>
                        <div class="cyber-dot cyber-dot-3"></div>
                        <div class="cyber-dot cyber-dot-4"></div>
                    </div>
                    <div class="cyber-circle-inner"></div>
                </div>
            </div>
        </div>
        
        <!-- Data box removed as requested -->
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fantasy Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@400;600&family=MedievalSharp&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Cormorant Garamond', serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, #26201a 0%, #312518 100%);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 30px rgba(205, 173, 93, 0.3);
            border: 1px solid rgba(205, 173, 93, 0.7);
        }
        
        /* Parchment texture overlay */
        .parchment-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E");
            opacity: 0.2;
            z-index: 1;
        }
        
        /* Ornamental pattern */
        .ornament-overlay {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M20 0C20 20 40 20 40 20C20 20 20 40 20 40C20 20 0 20 0 20C20 20 20 0 20 0Z' fill='none' stroke='%23CDAD5D' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E");
            opacity: 0.15;
            z-index: 1;
        }
        
        /* Corner ornaments */
        .corner-ornament {
            position: absolute;
            width: 60px;
            height: 60px;
            z-index: 2;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M60 0H0V10C0 30 10 30 30 30C30 10 30 0 60 0Z' fill='none' stroke='%23CDAD5D' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0H60V10C60 30 50 30 30 30C30 10 30 0 0 0Z' fill='none' stroke='%23CDAD5D' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M60 60H0V50C0 30 10 30 30 30C30 50 30 60 60 60Z' fill='none' stroke='%23CDAD5D' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 60H60V50C60 30 50 30 30 30C30 50 30 60 0 60Z' fill='none' stroke='%23CDAD5D' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        .glow-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 20px rgba(205, 173, 93, 0.4);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header with medieval elements */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background-color: rgba(38, 32, 26, 0.95);
            border-bottom: 1px solid rgba(205, 173, 93, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(205, 173, 93, 0.7), transparent);
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(205, 173, 93, 0.7));
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid #CDAD5D;
            overflow: hidden;
            margin-right: 15px;
            background-color: #312518;
            position: relative;
        }
        
        .group-avatar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 10px rgba(205, 173, 93, 0.5);
        }
        
        .group-name {
            font-family: 'Cinzel', serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 400;
            text-shadow: 0 0 10px rgba(205, 173, 93, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #CDAD5D;
            font-size: 14px;
            font-family: 'MedievalSharp', cursive;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #CDAD5D;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px #CDAD5D;
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with avatar and frame */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(205, 173, 93, 0.5);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background-color: rgba(38, 32, 26, 0.6);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(205, 173, 93, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(205, 173, 93, 0.5), transparent);
        }
        
        /* Avatar container structure */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        /* Ornate frame for avatar */
        .ornate-frame {
            position: absolute;
            width: 166px;
            height: 166px;
            top: -8px;
            left: -8px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='166' height='166' viewBox='0 0 166 166'%3E%3Ccircle cx='83' cy='83' r='75' fill='none' stroke='%23CDAD5D' stroke-width='2'/%3E%3Cpath d='M83 8 L83 0 M83 166 L83 158 M8 83 L0 83 M166 83 L158 83 M120 25 L125 20 M46 141 L41 146 M25 46 L20 41 M141 120 L146 125' stroke='%23CDAD5D' stroke-width='2'/%3E%3C/svg%3E");
            z-index: 4;
        }
        
        /* User avatar */
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid #CDAD5D;
            overflow: hidden;
            background-color: #312518;
            box-shadow: 0 0 20px rgba(205, 173, 93, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        .user-status {
            font-family: 'MedievalSharp', cursive;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 5px 15px;
            border: 1px solid rgba(205, 173, 93, 0.5);
            background-color: rgba(205, 173, 93, 0.1);
            margin-top: 8px;
            font-family: 'MedievalSharp', cursive;
            font-size: 12px;
            color: #CDAD5D;
            border-radius: 3px;
        }
        
        /* Right panel with decorative elements */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .right-panel::before {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 50px;
            height: 1px;
            background-color: rgba(205, 173, 93, 0.5);
        }
        
        .right-panel::after {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 1px;
            height: 50px;
            background-color: rgba(205, 173, 93, 0.5);
        }
        
        .welcome-title {
            font-family: 'Cinzel', serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 12px rgba(205, 173, 93, 0.6);
            text-align: center;
            position: relative;
        }
        
        /* Adjust welcome title spacing when username wraps to multiple lines */
        .welcome-title.has-long-name {
            margin-bottom: 0;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '✦';
            position: absolute;
            color: #CDAD5D;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Cinzel', serif;
            color: #CDAD5D;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(205, 173, 93, 0.7);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: manual;
            line-height: 1.1;
        }
        
        /* Responsive font size for long usernames */
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(205, 173, 93, 0.7), transparent);
        }
        
        .welcome-message {
            font-family: 'Cormorant Garamond', serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(205, 173, 93, 0.3);
            background-color: rgba(205, 173, 93, 0.05);
            position: relative;
            border-radius: 5px;
        }
        
        .welcome-message::before,
        .welcome-message::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border-style: solid;
            border-color: #CDAD5D;
            border-width: 0;
        }
        
        .welcome-message::before {
            top: -1px;
            left: -1px;
            border-top-width: 1px;
            border-left-width: 1px;
        }
        
        .welcome-message::after {
            bottom: -1px;
            right: -1px;
            border-bottom-width: 1px;
            border-right-width: 1px;
        }
        
        /* Decorative elements */
        .magical-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .magic-circle {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(205, 173, 93, 0.5);
            border-radius: 50%;
            animation: rotate 60s linear infinite;
        }
        
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .magic-circle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M50 0 L54 40 L94 50 L54 60 L50 100 L46 60 L6 50 L46 40 Z' fill='none' stroke='%23CDAD5D' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='25' fill='none' stroke='%23CDAD5D' stroke-width='0.5'/%3E%3C/svg%3E");
            opacity: 0.8;
        }
        
        .magic-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            height: 70%;
            border: 1px solid rgba(205, 173, 93, 0.5);
            border-radius: 50%;
            animation: rotate-reverse 40s linear infinite;
        }
        
        @keyframes rotate-reverse {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        
        .magic-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #CDAD5D;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(205, 173, 93, 0.8);
        }
        
        .magic-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .magic-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .magic-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .magic-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: rgba(38, 32, 26, 0.95);
            border-top: 1px solid rgba(205, 173, 93, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'MedievalSharp', cursive;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '❧';
            position: absolute;
            top: -15px;
            left: 20px;
            color: rgba(205, 173, 93, 0.7);
            font-size: 14px;
        }
        
        .footer::after {
            content: '❧';
            position: absolute;
            top: -15px;
            right: 20px;
            color: rgba(205, 173, 93, 0.7);
            font-size: 14px;
            transform: scaleX(-1);
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #CDAD5D;
        }
        
        /* Decorative elements */
        .magical-element {
            position: absolute;
            background-color: rgba(205, 173, 93, 0.08);
            border: 1px solid rgba(205, 173, 93, 0.3);
            z-index: 1;
            border-radius: 3px;
        }
        
        .magical-1 {
            top: 100px;
            right: 50px;
            width: 100px;
            height: 30px;
        }
        
        .magical-2 {
            bottom: 80px;
            left: 280px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
        }
        
        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="parchment-overlay"></div>
        <div class="ornament-overlay"></div>
        <div class="glow-border"></div>
        
        <!-- Corner ornaments -->
        <div class="corner-ornament top-left"></div>
        <div class="corner-ornament top-right"></div>
        <div class="corner-ornament bottom-left"></div>
        <div class="corner-ornament bottom-right"></div>
        
        <!-- Decorative elements -->
        <div class="magical-element magical-1"></div>
        <div class="magical-element magical-2"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="ornate-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">TITLE: ${status}</div>
                <div class="user-status">SCROLL: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="magical-decoration">
                    <div class="magic-circle">
                        <div class="magic-dot magic-dot-1"></div>
                        <div class="magic-dot magic-dot-2"></div>
                        <div class="magic-dot magic-dot-3"></div>
                        <div class="magic-dot magic-dot-4"></div>
                    </div>
                    <div class="magic-inner"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bio-Tech Forest Welcome Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;600&family=Montserrat:wght@400;500;700&family=Source+Code+Pro&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Quicksand', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, #0a211a 0%, #153829 100%);
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 30px rgba(49, 217, 94, 0.3);
            border: 1px solid rgba(79, 230, 118, 0.7);
        }
        
        /* Bio-luminescent vein pattern */
        .veins-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%2331D95E' stroke-width='1' opacity='0.15'%3E%3Cpath d='M539 269L350 382 295 764M370 520L269 731M827 330L731 417 350 382M200 599L40 760M520 660L578 842 731 737 840 599 603 493 520 660 295 764M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.3;
            z-index: 1;
        }
        
        /* Digital leaf pattern */
        .leaf-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='none' stroke='%2331D95E' stroke-width='0.5' d='M30,50 C30,20 50,10 90,10 C50,50 80,70 50,90 C20,70 30,50 30,50 Z' opacity='0.2'/%3E%3C/svg%3E");
            background-size: 150px 150px;
            opacity: 0.12;
            z-index: 1;
        }
        
        /* Nature-tech border effects */
        .corner-accent {
            position: absolute;
            width: 50px;
            height: 50px;
            z-index: 2;
        }
        
        .top-left {
            top: 0;
            left: 0;
            border-top: 2px solid #31d95e;
            border-left: 2px solid #31d95e;
            border-radius: 0 0 12px 0;
        }
        
        .top-right {
            top: 0;
            right: 0;
            border-top: 2px solid #31d95e;
            border-right: 2px solid #31d95e;
            border-radius: 0 0 0 12px;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            border-bottom: 2px solid #31d95e;
            border-left: 2px solid #31d95e;
            border-radius: 0 12px 0 0;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            border-bottom: 2px solid #31d95e;
            border-right: 2px solid #31d95e;
            border-radius: 12px 0 0 0;
        }
        
        .glow-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 20px rgba(49, 217, 94, 0.4);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Header with organic tech design */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background-color: rgba(10, 33, 26, 0.9);
            border-bottom: 1px solid rgba(79, 230, 118, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(49, 217, 94, 0.7), transparent);
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(49, 217, 94, 0.7));
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid #31d95e;
            overflow: hidden;
            margin-right: 15px;
            background-color: #173f30;
            position: relative;
        }
        
        .group-avatar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 10px rgba(49, 217, 94, 0.5);
        }
        
        .group-name {
            font-family: 'Montserrat', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 500;
            text-shadow: 0 0 10px rgba(49, 217, 94, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #31d95e;
            font-size: 14px;
            font-family: 'Source Code Pro', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #31d95e;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px #31d95e;
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with organic frame design */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(79, 230, 118, 0.5);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background-color: rgba(10, 33, 26, 0.6);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(49, 217, 94, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(49, 217, 94, 0.5), transparent);
        }
        
        /* Avatar container with leafy design */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        /* Leaf-inspired organic frame */
        .organic-frame {
            position: absolute;
            width: 150px;
            height: 150px;
            top: 0;
            left: 0;
            border: 1px solid rgba(49, 217, 94, 0.5);
            border-radius: 50%;
            z-index: 1;
        }
        
        .organic-frame::before,
        .organic-frame::after {
            content: '';
            position: absolute;
            background-color: #31d95e;
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #31d95e;
        }
        
        .organic-frame::before {
            top: -4px;
            left: 50%;
            width: 8px;
            height: 8px;
        }
        
        .organic-frame::after {
            bottom: -4px;
            left: 50%;
            width: 8px;
            height: 8px;
        }
        
        /* Leaf accents for the frame */
        .leaf-accent {
            position: absolute;
            width: 20px;
            height: 20px;
            z-index: 1;
        }
        
        .leaf-accent-1 {
            top: 0;
            left: 50%;
            transform: translateX(-50%) rotate(45deg);
            border-top: 2px solid #31d95e;
            border-left: 2px solid #31d95e;
        }
        
        .leaf-accent-2 {
            bottom: 0;
            left: 50%;
            transform: translateX(-50%) rotate(-135deg);
            border-top: 2px solid #31d95e;
            border-left: 2px solid #31d95e;
        }
        
        /* User avatar with bioluminescent glow */
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid #31d95e;
            overflow: hidden;
            background-color: #173f30;
            box-shadow: 0 0 20px rgba(49, 217, 94, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        /* User status with eco-tech appearance */
        .user-status {
            font-family: 'Source Code Pro', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 5px 10px;
            border: 1px solid rgba(49, 217, 94, 0.5);
            background-color: rgba(49, 217, 94, 0.1);
            border-radius: 15px;
            margin-top: 8px;
            font-family: 'Source Code Pro', monospace;
            font-size: 12px;
            color: #31d95e;
        }
        
        /* Naturalistic right panel */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        /* Vine-like decorations */
        .right-panel::before {
            content: '';
            position: absolute;
            top: 30px;
            left: 30px;
            width: 60px;
            height: 1px;
            background-color: rgba(49, 217, 94, 0.5);
        }
        
        .right-panel::after {
            content: '';
            position: absolute;
            top: 30px;
            left: 30px;
            width: 1px;
            height: 60px;
            background-color: rgba(49, 217, 94, 0.5);
        }
        
        /* Welcome title with organic styling */
        .welcome-title {
            font-family: 'Montserrat', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 12px rgba(49, 217, 94, 0.6);
            text-align: center;
            position: relative;
        }
        
        /* Adjust welcome title spacing when username wraps to multiple lines */
        .welcome-title.has-long-name {
            margin-bottom: 0;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            height: 2px;
            width: 40px;
            background-color: #31d95e;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -50px;
        }
        
        .welcome-title::after {
            right: -50px;
        }
        
        /* Username with glowing green styling */
        .user-name {
            font-family: 'Montserrat', sans-serif;
            color: #31d95e;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(49, 217, 94, 0.7);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: manual;
            line-height: 1.1;
        }
        
        /* Responsive font size for long usernames */
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        /* Organic leaf-vein divider */
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(49, 217, 94, 0.7), transparent);
        }
        
        /* Welcome message with nature-inspired design */
        .welcome-message {
            font-family: 'Quicksand', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(49, 217, 94, 0.3);
            background-color: rgba(49, 217, 94, 0.05);
            border-radius: 12px;
            position: relative;
        }
        
        /* Leaf corner accents */
        .welcome-message::before,
        .welcome-message::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: rgba(49, 217, 94, 0.2);
            border-radius: 50%;
        }
        
        .welcome-message::before {
            top: -6px;
            left: -6px;
        }
        
        .welcome-message::after {
            bottom: -6px;
            right: -6px;
        }
        
        /* Nature-tech decoration */
        .eco-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .eco-circle {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(49, 217, 94, 0.5);
            border-radius: 50%;
        }
        
        .eco-leaf {
            position: absolute;
            width: 70%;
            height: 70%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='none' stroke='%2331D95E' stroke-width='1' d='M25,50 C25,25 50,15 85,15 C50,50 75,75 50,85 C25,75 25,50 25,50 Z' opacity='0.6'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }
        
        .eco-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #31d95e;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(49, 217, 94, 0.8);
        }
        
        .eco-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .eco-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .eco-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .eco-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Footer with bio-tech elements */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: rgba(10, 33, 26, 0.9);
            border-top: 1px solid rgba(79, 230, 118, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Source Code Pro', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(49, 217, 94, 0.7);
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: 0;
            right: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(49, 217, 94, 0.7);
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #31d95e;
        }
        
        /* Bio-luminescent elements */
        .bio-element {
            position: absolute;
            background-color: rgba(49, 217, 94, 0.05);
            border: 1px solid rgba(49, 217, 94, 0.3);
            border-radius: 6px;
            z-index: 1;
        }
        
        .bio-1 {
            top: 100px;
            right: 50px;
            width: 100px;
            height: 20px;
            transform: rotate(-15deg);
        }
        
        .bio-2 {
            bottom: 80px;
            left: 280px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
        
        /* Floating particle effect */
        .particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
        }
        
        .particle {
            position: absolute;
            width: 3px;
            height: 3px;
            background-color: rgba(49, 217, 94, 0.5);
            border-radius: 50%;
            animation: float 20s infinite linear;
        }
        
        .particle:nth-child(1) {
            top: 20%;
            left: 20%;
            animation-duration: 30s;
            animation-delay: 0s;
        }
        
        .particle:nth-child(2) {
            top: 40%;
            left: 70%;
            animation-duration: 25s;
            animation-delay: 2s;
        }
        
        .particle:nth-child(3) {
            top: 70%;
            left: 30%;
            animation-duration: 20s;
            animation-delay: 4s;
        }
        
        @keyframes float {
            0% {
                transform: translateY(0) translateX(0);
                opacity: 0;
            }
            20% {
                opacity: 0.8;
            }
            80% {
                opacity: 0.8;
            }
            100% {
                transform: translateY(-100px) translateX(30px);
                opacity: 0;
            }
        }
    </style>
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </script>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="veins-overlay"></div>
        <div class="leaf-overlay"></div>
        <div class="glow-border"></div>
        
        <!-- Corner accents -->
        <div class="corner-accent top-left"></div>
        <div class="corner-accent top-right"></div>
        <div class="corner-accent bottom-left"></div>
        <div class="corner-accent bottom-right"></div>
        
        <!-- Bio-luminescent elements -->
        <div class="bio-element bio-1"></div>
        <div class="bio-element bio-2"></div>
        
        <!-- Floating particles -->
        <div class="particles">
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
        </div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <!-- Avatar and frame with leaf design -->
                <div class="avatar-container">
                    <div class="organic-frame">
                        <div class="leaf-accent leaf-accent-1"></div>
                        <div class="leaf-accent leaf-accent-2"></div>
                    </div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <!-- User information with eco-tech styling -->
                <div class="user-status">STATUS: ${status}</div>
                <div class="user-status">ID: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="eco-decoration">
                    <div class="eco-circle">
                        <div class="eco-dot eco-dot-1"></div>
                        <div class="eco-dot eco-dot-2"></div>
                        <div class="eco-dot eco-dot-3"></div>
                        <div class="eco-dot eco-dot-4"></div>
                    </div>
                    <div class="eco-leaf"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Red Darkness Modern Welcome Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600&family=Bebas+Neue&family=Fira+Code:wght@400;500&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Raleway', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a0808 100%);
            border-radius: 0;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 30px rgba(200, 0, 0, 0.4);
            border: 1px solid rgba(200, 0, 0, 0.6);
        }
        
        /* Modern noise texture */
        .noise-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
            opacity: 0.2;
            z-index: 1;
        }
        
        /* Red slashed pattern */
        .slash-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='60' x2='60' y2='0' stroke='%23c80000' stroke-width='1' opacity='0.15'/%3E%3C/svg%3E");
            opacity: 0.05;
            z-index: 1;
        }
        
        /* Modern minimal border elements */
        .corner-accent {
            position: absolute;
            width: 30px;
            height: 30px;
            z-index: 2;
        }
        
        .top-left {
            top: 0;
            left: 0;
            border-top: 1px solid #c80000;
            border-left: 1px solid #c80000;
        }
        
        .top-right {
            top: 0;
            right: 0;
            border-top: 1px solid #c80000;
            border-right: 1px solid #c80000;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            border-bottom: 1px solid #c80000;
            border-left: 1px solid #c80000;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            border-bottom: 1px solid #c80000;
            border-right: 1px solid #c80000;
        }
        
        .glow-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 20px rgba(200, 0, 0, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Header with modern minimal design */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background-color: rgba(10, 10, 10, 0.9);
            border-bottom: 1px solid rgba(200, 0, 0, 0.6);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 20px;
            width: 100px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(200, 0, 0, 0.6));
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 0;
            border: 1px solid #c80000;
            overflow: hidden;
            margin-right: 15px;
            background-color: #1a0808;
            position: relative;
        }
        
        .group-avatar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 10px rgba(200, 0, 0, 0.5);
        }
        
        .group-name {
            font-family: 'Bebas Neue', sans-serif;
            color: #ffffff;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px rgba(200, 0, 0, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #c80000;
            font-size: 14px;
            font-family: 'Fira Code', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #c80000;
            border-radius: 0;
            margin-right: 8px;
            box-shadow: 0 0 8px #c80000;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with modern brutalist design */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(200, 0, 0, 0.4);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background-color: rgba(10, 10, 10, 0.6);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(200, 0, 0, 0.4), transparent);
        }
        
        /* Avatar container with minimalist design */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        /* Modern frame with sharp edges */
        .modern-frame {
            position: absolute;
            width: 150px;
            height: 150px;
            top: 0;
            left: 0;
            border: 1px solid rgba(200, 0, 0, 0.5);
            z-index: 1;
        }
        
        .modern-frame::before,
        .modern-frame::after {
            content: '';
            position: absolute;
            background-color: #c80000;
        }
        
        .modern-frame::before {
            top: -3px;
            left: 20px;
            width: 20px;
            height: 3px;
            box-shadow: 0 0 10px #c80000;
        }
        
        .modern-frame::after {
            bottom: -3px;
            right: 20px;
            width: 20px;
            height: 3px;
            box-shadow: 0 0 10px #c80000;
        }
        
        /* Red accents */
        .red-accent {
            position: absolute;
            z-index: 1;
            background-color: #c80000;
        }
        
        .red-accent-1 {
            top: -3px;
            right: 10px;
            width: 6px;
            height: 6px;
        }
        
        .red-accent-2 {
            bottom: -3px;
            left: 10px;
            width: 6px;
            height: 6px;
        }
        
        /* User avatar with crisp edges */
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border: 2px solid #c80000;
            overflow: hidden;
            background-color: #1a0808;
            box-shadow: 0 0 20px rgba(200, 0, 0, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* User status with modern monospace style */
        .user-status {
            font-family: 'Fira Code', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 5px 10px;
            border: 1px solid rgba(200, 0, 0, 0.5);
            background-color: rgba(200, 0, 0, 0.1);
            margin-top: 8px;
            font-family: 'Fira Code', monospace;
            font-size: 12px;
            color: #c80000;
        }
        
        /* Minimalist right panel */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        /* Red accent line */
        .right-panel::before {
            content: '';
            position: absolute;
            top: 40px;
            left: 40px;
            width: 100px;
            height: 1px;
            background-color: rgba(200, 0, 0, 0.5);
        }
        
        /* Welcome title with modern typography */
        .welcome-title {
            font-family: 'Bebas Neue', sans-serif;
            color: #ffffff;
            font-size: 42px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 5px;
            text-shadow: 2px 2px 8px rgba(200, 0, 0, 0.6);
            text-align: center;
            position: relative;
        }
        
        /* Adjust welcome title spacing when username wraps to multiple lines */
        .welcome-title.has-long-name {
            margin-bottom: 0;
        }
        
        /* Username with striking red styling */
        .user-name {
            font-family: 'Bebas Neue', sans-serif;
            color: #c80000;
            font-size: 46px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 5px;
            font-weight: 400;
            text-shadow: 0 0 15px rgba(200, 0, 0, 0.7);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: manual;
            line-height: 1.1;
        }
        
        /* Responsive font size for long usernames */
        .user-name[data-length="long"] {
            font-size: 38px;
            letter-spacing: 3px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 30px;
            letter-spacing: 2px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 24px;
            letter-spacing: 1px;
            line-height: 1.3;
        }
        
        /* Minimal red divider */
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 2px;
            background: #c80000;
        }
        
        /* Welcome message with modern minimal design */
        .welcome-message {
            font-family: 'Raleway', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.6;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border-left: 3px solid rgba(200, 0, 0, 0.7);
            background-color: rgba(200, 0, 0, 0.05);
            position: relative;
        }
        
        /* Red corner accents */
        .welcome-message::before,
        .welcome-message::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 1px;
            background-color: #c80000;
        }
        
        .welcome-message::before {
            top: 0;
            left: 0;
        }
        
        .welcome-message::after {
            bottom: 0;
            left: 0;
        }
        
        /* Modern decoration */
        .modern-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .modern-line {
            position: absolute;
            background-color: rgba(200, 0, 0, 0.5);
        }
        
        .modern-line-1 {
            top: 0;
            left: 0;
            width: 100%;
            height: 1px;
        }
        
        .modern-line-2 {
            top: 0;
            left: 0;
            width: 1px;
            height: 100%;
        }
        
        .modern-line-3 {
            bottom: 0;
            right: 0;
            width: 70%;
            height: 1px;
        }
        
        .modern-line-4 {
            bottom: 0;
            right: 0;
            width: 1px;
            height: 70%;
        }
        
        .modern-square {
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: #c80000;
            box-shadow: 0 0 8px rgba(200, 0, 0, 0.8);
        }
        
        .modern-square-1 { top: -5px; left: -5px; }
        .modern-square-2 { bottom: -5px; right: -5px; }
        
        /* Footer with minimal design */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: rgba(10, 10, 10, 0.9);
            border-top: 1px solid rgba(200, 0, 0, 0.6);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Fira Code', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 20px;
            width: 1px;
            height: 5px;
            background-color: rgba(200, 0, 0, 0.7);
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #c80000;
        }
        
        /* Modern red glitch effect */
        .glitch-effect {
            position: absolute;
            top: 50%;
            right: 40px;
            width: 100px;
            height: 2px;
            background-color: rgba(200, 0, 0, 0.8);
            z-index: 1;
            transform: translateY(-50%);
            animation: glitch 4s infinite;
        }
        
        .glitch-effect::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 20px;
            width: 20px;
            height: 2px;
            background-color: rgba(200, 0, 0, 0.8);
        }
        
        .glitch-effect::after {
            content: '';
            position: absolute;
            top: 10px;
            right: 30px;
            width: 40px;
            height: 2px;
            background-color: rgba(200, 0, 0, 0.8);
        }
        
        @keyframes glitch {
            0% { opacity: 1; }
            7% { opacity: 0.75; }
            10% { opacity: 1; }
            27% { opacity: 1; }
            30% { opacity: 0.75; }
            35% { opacity: 1; }
            52% { opacity: 1; }
            55% { opacity: 0.75; }
            60% { opacity: 1; }
            85% { opacity: 1; }
            88% { opacity: 0.75; }
            93% { opacity: 1; }
            100% { opacity: 1; }
        }
        
        /* Red scanline effect */
        .scanline {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, transparent, transparent 50%, rgba(200, 0, 0, 0.05) 50%, rgba(200, 0, 0, 0.05));
            background-size: 100% 4px;
            z-index: 2;
            pointer-events: none;
            opacity: 0.15;
        }
    </style>
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </script>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="noise-overlay"></div>
        <div class="slash-overlay"></div>
        <div class="scanline"></div>
        <div class="glow-border"></div>
        
        <!-- Corner accents -->
        <div class="corner-accent top-left"></div>
        <div class="corner-accent top-right"></div>
        <div class="corner-accent bottom-left"></div>
        <div class="corner-accent bottom-right"></div>
        
        <!-- Glitch effect -->
        <div class="glitch-effect"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <!-- Avatar and frame with modern design -->
                <div class="avatar-container">
                    <div class="modern-frame">
                        <div class="red-accent red-accent-1"></div>
                        <div class="red-accent red-accent-2"></div>
                    </div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <!-- User information with modern styling -->
                <div class="user-status">STATUS: ${status}</div>
                <div class="user-status">ID: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="modern-decoration">
                    <div class="modern-line modern-line-1"></div>
                    <div class="modern-line modern-line-2"></div>
                    <div class="modern-line modern-line-3"></div>
                    <div class="modern-line modern-line-4"></div>
                    <div class="modern-square modern-square-1"></div>
                    <div class="modern-square modern-square-2"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gundam Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Rajdhani:wght@400;600&family=Share+Tech+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Rajdhani', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, #0a0e1a 0%, #1a1e2e 100%);
            border-radius: 2px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.3);
            border: 1px solid rgba(255, 0, 0, 0.7);
        }
        
        /* Gundam-style grid overlay */
        .grid-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(255, 0, 0, 0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 0, 0, 0.07) 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 1;
        }
        
        /* Mechanical circuit pattern */
        .circuit-overlay {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23FF0000' stroke-width='1' opacity='0.15'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.2;
            z-index: 1;
        }
        
        /* Gundam-style corner accents */
        .corner-accent {
            position: absolute;
            width: 50px;
            height: 50px;
            z-index: 2;
        }
        
        .top-left {
            top: 0;
            left: 0;
            border-top: 2px solid #ff0000;
            border-left: 2px solid #ff0000;
        }
        
        .top-right {
            top: 0;
            right: 0;
            border-top: 2px solid #ff0000;
            border-right: 2px solid #ff0000;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            border-bottom: 2px solid #ff0000;
            border-left: 2px solid #ff0000;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            border-bottom: 2px solid #ff0000;
            border-right: 2px solid #ff0000;
        }
        
        .glow-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.4);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Gundam-style header with mechanical elements */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background-color: rgba(10, 14, 26, 0.9);
            border-bottom: 1px solid rgba(255, 0, 0, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(255, 0, 0, 0.7), transparent);
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.7));
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 3px;
            border: 1px solid #ff0000;
            overflow: hidden;
            margin-right: 15px;
            background-color: #1e2535;
            position: relative;
        }
        
        .group-avatar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.5);
        }
        
        .group-name {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 500;
            text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #ff0000;
            font-size: 14px;
            font-family: 'Share Tech Mono', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #ff0000;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px #ff0000;
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Gundam-style left panel with mechanical frame */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(255, 0, 0, 0.5);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background-color: rgba(10, 14, 26, 0.6);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.5), transparent);
        }
        
        /* Gundam-style avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        /* Gundam-style digital frame */
        .digital-frame {
            position: absolute;
            width: 150px;
            height: 150px;
            top: 0;
            left: 0;
            border: 1px solid rgba(255, 0, 0, 0.5);
            border-radius: 50%;
            z-index: 1;
        }
        
        .digital-frame::before {
            content: '';
            position: absolute;
            top: -3px;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: #ff0000;
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #ff0000;
        }
        
        .digital-frame::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: #ff0000;
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px #ff0000;
        }
        
        /* Gundam-style user avatar */
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid #ff0000;
            overflow: hidden;
            background-color: #1e2535;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        .user-status {
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 3px 8px;
            border: 1px solid rgba(255, 0, 0, 0.5);
            background-color: rgba(255, 0, 0, 0.1);
            margin-top: 8px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            color: #ff0000;
        }
        
        /* Gundam-style right panel with mechanical elements */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .right-panel::before {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 50px;
            height: 1px;
            background-color: rgba(255, 0, 0, 0.5);
        }
        
        .right-panel::after {
            content: '';
            position: absolute;
            top: 50px;
            left: 50px;
            width: 1px;
            height: 50px;
            background-color: rgba(255, 0, 0, 0.5);
        }
        
        .welcome-title {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 12px rgba(255, 0, 0, 0.6);
            text-align: center;
            position: relative;
        }
        
        /* Adjust welcome title spacing when username wraps to multiple lines */
        .welcome-title.has-long-name {
            margin-bottom: 0;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            height: 2px;
            width: 40px;
            background-color: #ff0000;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -50px;
        }
        
        .welcome-title::after {
            right: -50px;
        }
        
        .user-name {
            font-family: 'Orbitron', sans-serif;
            color: #ff0000;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: manual;
            line-height: 1.1;
        }
        
        /* Responsive font size for long usernames */
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.7), transparent);
        }
        
        .welcome-message {
            font-family: 'Rajdhani', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(255, 0, 0, 0.3);
            background-color: rgba(255, 0, 0, 0.05);
            position: relative;
        }
        
        .welcome-message::before,
        .welcome-message::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border-style: solid;
            border-color: #ff0000;
            border-width: 0;
        }
        
        .welcome-message::before {
            top: -1px;
            left: -1px;
            border-top-width: 1px;
            border-left-width: 1px;
        }
        
        .welcome-message::after {
            bottom: -1px;
            right: -1px;
            border-bottom-width: 1px;
            border-right-width: 1px;
        }
        
        /* Gundam-style decoration */
        .cyber-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .cyber-circle {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(255, 0, 0, 0.5);
            border-radius: 50%;
        }
        
        .cyber-circle-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            height: 70%;
            border: 1px solid rgba(255, 0, 0, 0.5);
            border-radius: 50%;
        }
        
        .cyber-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #ff0000;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
        }
        
        .cyber-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .cyber-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Gundam-style footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: rgba(10, 14, 26, 0.9);
            border-top: 1px solid rgba(255, 0, 0, 0.7);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(255, 0, 0, 0.7);
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: 0;
            right: 20px;
            width: 1px;
            height: 10px;
            background-color: rgba(255, 0, 0, 0.7);
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #ff0000;
        }
        
        /* Gundam-style holographic elements */
        .holo-element {
            position: absolute;
            background-color: rgba(255, 0, 0, 0.05);
            border: 1px solid rgba(255, 0, 0, 0.3);
            z-index: 1;
        }
        
        .holo-1 {
            top: 100px;
            right: 50px;
            width: 100px;
            height: 30px;
        }
        
        .holo-2 {
            bottom: 80px;
            left: 280px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
        }
        
        /* Gundam-style hexagon pattern */
        .hexagon-bg {
            position: absolute;
            bottom: -50px;
            right: -50px;
            width: 300px;
            height: 300px;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M29.13 5a2 2 0 0 1 1.74 1l13.856 24a2 2 0 0 1 0 2l-13.856 24a2 2 0 0 1-1.74 1H12.87a2 2 0 0 1-1.74-1L-2.725 32a2 2 0 0 1 0-2L11.13 6a2 2 0 0 1 1.74-1H29.13z' stroke='%23FF0000' stroke-width='.5' fill='none' opacity='.2'/%3E%3C/svg%3E");
            opacity: 0.6;
            z-index: 1;
        }
        
        /* Gundam-specific elements */
        .gundam-v-fin {
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 30px;
            z-index: 4;
        }
        
        .gundam-v-fin::before,
        .gundam-v-fin::after {
            content: '';
            position: absolute;
            top: 0;
            width: 40px;
            height: 4px;
            background-color: #ffcc00;
            box-shadow: 0 0 10px rgba(255, 204, 0, 0.7);
        }
        
        .gundam-v-fin::before {
            left: 10px;
            transform: rotate(-30deg);
        }
        
        .gundam-v-fin::after {
            right: 10px;
            transform: rotate(30deg);
        }
        
        .gundam-shield {
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 40px;
            height: 60px;
            background-color: rgba(0, 0, 255, 0.1);
            border: 1px solid rgba(0, 0, 255, 0.5);
            z-index: 4;
        }
        
        .gundam-shield::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background-color: rgba(255, 204, 0, 0.2);
            border: 1px solid rgba(255, 204, 0, 0.5);
        }
        
        .gundam-beam-saber {
            position: absolute;
            top: 80px;
            right: 30px;
            width: 4px;
            height: 60px;
            background: linear-gradient(to bottom, rgba(255, 0, 255, 0.8), rgba(255, 0, 255, 0.2));
            box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
            z-index: 4;
        }
        
        .gundam-beam-saber::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 10px;
            background-color: #ffffff;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="grid-overlay"></div>
        <div class="circuit-overlay"></div>
        <div class="hexagon-bg"></div>
        <div class="glow-border"></div>
        
        <!-- Corner accents -->
        <div class="corner-accent top-left"></div>
        <div class="corner-accent top-right"></div>
        <div class="corner-accent bottom-left"></div>
        <div class="corner-accent bottom-right"></div>
        
        <!-- Holographic elements -->
        <div class="holo-element holo-1"></div>
        <div class="holo-element holo-2"></div>
        
        <!-- Gundam-specific elements -->
        <div class="gundam-v-fin"></div>
        <div class="gundam-shield"></div>
        <div class="gundam-beam-saber"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <!-- Fixed avatar and frame positioning -->
                <div class="avatar-container">
                    <div class="digital-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <!-- User information properly positioned below avatar -->
                <div class="user-status">STATUS: ${status}</div>
                <div class="user-status">ID: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="cyber-decoration">
                    <div class="cyber-circle">
                        <div class="cyber-dot cyber-dot-1"></div>
                        <div class="cyber-dot cyber-dot-2"></div>
                        <div class="cyber-dot cyber-dot-3"></div>
                        <div class="cyber-dot cyber-dot-4"></div>
                    </div>
                    <div class="cyber-circle-inner"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tech Welcome Template - New Style</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Space+Mono&family=Quicksand:wght@400;600&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Quicksand', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-container {
            width: 800px;
            height: 400px;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            background: linear-gradient(135deg, #0c1023 0%, #171d36 100%);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(110, 231, 183, 0.5);
        }
        
        /* Digital particles effect */
        .particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(110, 231, 183, 0.03) 1px, transparent 1px),
                radial-gradient(circle at 75% 75%, rgba(110, 231, 183, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 1;
        }
        
        /* Animated circuit lines */
        .circuit-lines {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(90deg, transparent 49%, rgba(110, 231, 183, 0.06) 50%, transparent 51%),
                linear-gradient(180deg, transparent 49%, rgba(110, 231, 183, 0.06) 50%, transparent 51%);
            background-size: 40px 40px;
            opacity: 0.6;
            z-index: 1;
        }
        
        /* Animated glow effect */
        .glow-effect {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 70px rgba(110, 231, 183, 0.2);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Tech rings decorations */
        .tech-ring {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(110, 231, 183, 0.3);
            opacity: 0.7;
            z-index: 1;
        }
        
        .ring-1 {
            width: 200px;
            height: 200px;
            top: -100px;
            right: -50px;
        }
        
        .ring-2 {
            width: 150px;
            height: 150px;
            bottom: -75px;
            left: 50px;
        }
        
        .ring-3 {
            width: 100px;
            height: 100px;
            top: 50%;
            right: 50px;
            transform: translateY(-50%);
        }
        
        /* Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 25px;
            border-bottom: 1px solid rgba(110, 231, 183, 0.3);
            position: relative;
            z-index: 5;
            background: rgba(12, 16, 35, 0.8);
        }
        
        .server-info {
            display: flex;
            align-items: center;
        }
        
        .server-icon {
            width: 36px;
            height: 36px;
            background-color: rgba(110, 231, 183, 0.2);
            border: 1px solid rgba(110, 231, 183, 0.6);
            border-radius: 6px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        
        .server-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .server-icon::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 5px rgba(110, 231, 183, 0.5);
        }
        
        .server-name {
            font-family: 'Exo 2', sans-serif;
            font-weight: 600;
            color: #ffffff;
            font-size: 16px;
            letter-spacing: 1px;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            font-family: 'Space Mono', monospace;
            font-size: 12px;
            color: #6ee7b7;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            background-color: #6ee7b7;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px rgba(110, 231, 183, 0.7);
        }
        
        /* Main Content Area */
        .content {
            display: flex;
            height: calc(100% - 61px);
            position: relative;
            z-index: 5;
        }
        
        /* Profile Side Panel */
        .profile-panel {
            width: 250px;
            background: rgba(12, 16, 35, 0.5);
            border-right: 1px solid rgba(110, 231, 183, 0.3);
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .profile-picture {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: 20px;
        }
        
        .profile-frame {
            position: absolute;
            width: 140px;
            height: 140px;
            border: 2px solid rgba(110, 231, 183, 0.7);
            border-radius: 16px;
            box-shadow: 0 0 15px rgba(110, 231, 183, 0.3);
            overflow: hidden;
        }
        
        .profile-frame::before {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(110, 231, 183, 0.7);
            top: -2px;
            left: 55px;
        }
        
        .profile-frame::after {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(110, 231, 183, 0.7);
            bottom: -2px;
            right: 55px;
        }
        
        .profile-image {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 16px;
            overflow: hidden;
            background-color: rgba(12, 16, 35, 0.8);
        }
        
        .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .user-details {
            width: 100%;
            text-align: center;
        }
        
        .user-id {
            font-family: 'Space Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .user-role {
            display: inline-block;
            padding: 3px 10px;
            background-color: rgba(110, 231, 183, 0.1);
            border: 1px solid rgba(110, 231, 183, 0.4);
            color: #6ee7b7;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 5px;
            font-family: 'Space Mono', monospace;
        }
        
        /* Welcome Message Area */
        .welcome-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
        }
        
        .welcome-heading {
            font-family: 'Exo 2', sans-serif;
            font-weight: 700;
            color: #ffffff;
            font-size: 32px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-align: center;
            position: relative;
        }
        
        .welcome-heading::after {
            content: '';
            position: absolute;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, transparent, rgba(110, 231, 183, 0.7), transparent);
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .username-display {
            font-family: 'Exo 2', sans-serif;
            font-weight: 600;
            color: #6ee7b7;
            font-size: 38px;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-align: center;
            text-shadow: 0 0 10px rgba(110, 231, 183, 0.4);
            max-width: 90%;
            overflow-wrap: break-word;
            line-height: 1.2;
        }
        
        .message {
            font-family: 'Quicksand', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            text-align: center;
            line-height: 1.6;
            margin-top: 20px;
            max-width: 80%;
            padding: 15px 20px;
            background-color: rgba(110, 231, 183, 0.05);
            border: 1px solid rgba(110, 231, 183, 0.2);
            border-radius: 6px;
            position: relative;
        }
        
        /* Tech Decorations */
        .tech-corners {
            position: absolute;
            width: 20px;
            height: 20px;
            border-style: solid;
            border-color: rgba(110, 231, 183, 0.5);
            border-width: 0;
        }
        
        .corner-tl {
            top: 20px;
            left: 20px;
            border-top-width: 2px;
            border-left-width: 2px;
        }
        
        .corner-tr {
            top: 20px;
            right: 20px;
            border-top-width: 2px;
            border-right-width: 2px;
        }
        
        .corner-bl {
            bottom: 20px;
            left: 20px;
            border-bottom-width: 2px;
            border-left-width: 2px;
        }
        
        .corner-br {
            bottom: 20px;
            right: 20px;
            border-bottom-width: 2px;
            border-right-width: 2px;
        }
        
        /* Animated tech element */
        .tech-element {
            position: absolute;
            right: 30px;
            bottom: 30px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 1px solid rgba(110, 231, 183, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .tech-element::before {
            content: '';
            position: absolute;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 1px dashed rgba(110, 231, 183, 0.5);
        }
        
        .tech-element::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: rgba(110, 231, 183, 0.7);
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(110, 231, 183, 0.7);
        }
        
        /* Footer */
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: rgba(12, 16, 35, 0.8);
            border-top: 1px solid rgba(110, 231, 183, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            font-family: 'Space Mono', monospace;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            z-index: 5;
        }
        
        /* Responsive adjustments for long usernames */
        @media (max-width: 800px) {
            .username-display {
                font-size: 30px;
            }
        }
        
        /* JavaScript to handle long usernames */
        function adjustUsername() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 15) {
                username.style.fontSize = '30px';
            }
            
            if (usernameLength > 20) {
                username.style.fontSize = '24px';
            }
            
            if (usernameLength > 25) {
                username.style.fontSize = '20px';
                
                // Add line breaks for very long names
                const midpoint = Math.floor(usernameText.length / 2);
                let breakpoint = usernameText.lastIndexOf('_', midpoint);
                if (breakpoint === -1) breakpoint = midpoint;
                
                const firstPart = usernameText.substring(0, breakpoint);
                const secondPart = usernameText.substring(breakpoint);
                
                username.innerHTML = firstPart + '<br>' + secondPart;
            }
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <!-- Background Elements -->
        <div class="particles"></div>
        <div class="circuit-lines"></div>
        <div class="glow-effect"></div>
        
        <!-- Tech Decorative Elements -->
        <div class="tech-ring ring-1"></div>
        <div class="tech-ring ring-2"></div>
        <div class="tech-ring ring-3"></div>
        
        <div class="tech-corners corner-tl"></div>
        <div class="tech-corners corner-tr"></div>
        <div class="tech-corners corner-bl"></div>
        <div class="tech-corners corner-br"></div>
        
        <!-- Header -->
        <div class="header">
            <div class="server-info">
                <div class="server-icon">
                    <img src="${group_avatar}" alt="Server Icon">
                </div>
                <div class="server-name">${group_name}</div>
            </div>
            <div class="connection-status">
                <div class="status-indicator"></div>
                ${status_dot}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <!-- Profile Panel -->
            <div class="profile-panel">
                <div class="profile-picture">
                    <div class="profile-frame"></div>
                    <div class="profile-image">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-id">ID: #${userid}</div>
                    <div class="user-id">STATUS: ${status}</div>
                    <div class="user-role">${usertype}</div>
                </div>
            </div>
            
            <!-- Welcome Message Panel -->
            <div class="welcome-panel">
                <h1 class="welcome-heading">${title}</h1>
                <h2 class="username-display" id="username">${username}</h2>
                <p class="message">${message}</p>
                
                <div class="tech-element"></div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${foot_up}</span>
            <span>${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 15) {
                username.style.fontSize = '30px';
            }
            
            if (usernameLength > 20) {
                username.style.fontSize = '24px';
            }
            
            if (usernameLength > 25) {
                username.style.fontSize = '20px';
                
                // Add line breaks for very long names
                const midpoint = Math.floor(usernameText.length / 2);
                let breakpoint = usernameText.lastIndexOf('_', midpoint);
                if (breakpoint === -1) breakpoint = midpoint;
                
                const firstPart = usernameText.substring(0, breakpoint);
                const secondPart = usernameText.substring(breakpoint);
                
                username.innerHTML = firstPart + '<br>' + secondPart;
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tech Welcome Template - Futuristic Dark Theme</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Syncopate:wght@400;700&family=Roboto+Mono:wght@300;400;500&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Roboto Mono', monospace;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-panel {
            width: 800px;
            height: 400px;
            position: relative;
            overflow: hidden;
            background: linear-gradient(45deg, #0a0a0a 0%, #1f1f1f 100%);
            box-shadow: 0 0 40px rgba(255, 85, 85, 0.2);
            border-radius: 4px;
        }
        
        /* Base glitch effect */
        .glitch-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(255, 85, 85, 0.03), rgba(131, 56, 236, 0.03));
            opacity: 0.7;
            z-index: 1;
        }
        
        /* Digital noise effect */
        .noise {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
            opacity: 0.08;
            z-index: 1;
        }
        
        /* Tech lines */
        .tech-lines {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: 50px 50px;
            background-image: 
                linear-gradient(to right, rgba(255, 85, 85, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(131, 56, 236, 0.03) 1px, transparent 1px);
            z-index: 1;
        }
        
        /* Border effects */
        .border-fx {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 1px solid rgba(255, 85, 85, 0.3);
            z-index: 9;
            pointer-events: none;
        }
        
        .border-fx::before {
            content: '';
            position: absolute;
            top: -1px;
            left: 0;
            width: 100px;
            height: 1px;
            background: linear-gradient(90deg, rgba(255, 85, 85, 0.7), transparent);
        }
        
        .border-fx::after {
            content: '';
            position: absolute;
            bottom: -1px;
            right: 0;
            width: 100px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(131, 56, 236, 0.7));
        }
        
        /* Header bar */
        .header {
            position: relative;
            z-index: 10;
            height: 50px;
            display: flex;
            align-items: center;
            padding: 0 20px;
            background: rgba(15, 15, 15, 0.9);
            border-bottom: 1px solid rgba(255, 85, 85, 0.3);
        }
        
        .header-left {
            display: flex;
            align-items: center;
        }
        
        .server-icon {
            width: 32px;
            height: 32px;
            border-radius: 4px;
            overflow: hidden;
            background-color: #1a1a1a;
            border: 1px solid rgba(255, 85, 85, 0.5);
            margin-right: 12px;
            position: relative;
        }
        
        .server-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .server-name {
            font-family: 'Syncopate', sans-serif;
            font-size: 14px;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .header-right {
            margin-left: auto;
            display: flex;
            align-items: center;
            font-family: 'Roboto Mono', monospace;
            font-size: 12px;
            color: rgba(255, 85, 85, 0.8);
        }
        
        .status-light {
            width: 8px;
            height: 8px;
            background-color: #ff5555;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 5px rgba(255, 85, 85, 0.7);
        }
        
        /* Main container layout */
        .container {
            display: flex;
            height: calc(100% - 80px);
            position: relative;
            z-index: 5;
        }
        
        /* User profile section */
        .user-profile {
            width: 270px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(20, 20, 20, 0.6);
            border-right: 1px solid rgba(255, 85, 85, 0.2);
            position: relative;
        }
        
        .profile-border {
            position: absolute;
            top: 20px;
            bottom: 20px;
            right: 0;
            width: 1px;
            background: linear-gradient(to bottom, 
                transparent, 
                rgba(255, 85, 85, 0.5),
                rgba(131, 56, 236, 0.5),
                transparent);
        }
        
        .avatar-wrapper {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: 25px;
        }
        
        .avatar-box {
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: rgba(20, 20, 20, 0.8);
            clip-path: polygon(
                10% 0, 
                90% 0, 
                100% 10%, 
                100% 90%, 
                90% 100%, 
                10% 100%, 
                0 90%, 
                0 10%
            );
            overflow: hidden;
            border: 1px solid rgba(255, 85, 85, 0.5);
        }
        
        .avatar-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .avatar-corner {
            position: absolute;
            width: 10px;
            height: 10px;
            z-index: 2;
        }
        
        .corner-tl {
            top: -2px;
            left: -2px;
            border-top: 2px solid rgba(255, 85, 85, 0.8);
            border-left: 2px solid rgba(255, 85, 85, 0.8);
        }
        
        .corner-tr {
            top: -2px;
            right: -2px;
            border-top: 2px solid rgba(255, 85, 85, 0.8);
            border-right: 2px solid rgba(255, 85, 85, 0.8);
        }
        
        .corner-bl {
            bottom: -2px;
            left: -2px;
            border-bottom: 2px solid rgba(255, 85, 85, 0.8);
            border-left: 2px solid rgba(255, 85, 85, 0.8);
        }
        
        .corner-br {
            bottom: -2px;
            right: -2px;
            border-bottom: 2px solid rgba(255, 85, 85, 0.8);
            border-right: 2px solid rgba(255, 85, 85, 0.8);
        }
        
        .user-info {
            width: 100%;
            text-align: center;
        }
        
        .user-status {
            font-family: 'Roboto Mono', monospace;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .user-status::before {
            content: '//';
            color: rgba(255, 85, 85, 0.8);
            margin-right: 5px;
        }
        
        .user-role {
            display: inline-block;
            padding: 4px 12px;
            font-family: 'Roboto Mono', monospace;
            font-size: 11px;
            color: #ffffff;
            background: linear-gradient(90deg, rgba(255, 85, 85, 0.2), rgba(131, 56, 236, 0.2));
            border: 1px solid rgba(255, 85, 85, 0.3);
            border-radius: 2px;
            margin-top: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Welcome message section */
        .welcome-message {
            flex: 1;
            padding: 30px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
        }
        
        .welcome-title {
            font-family: 'Audiowide', cursive;
            font-size: 28px;
            color: #ffffff;
            margin: 0 0 10px 0;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: 2px;
            text-shadow: 0 0 10px rgba(255, 85, 85, 0.3);
            position: relative;
        }
        
        .welcome-title::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 150px;
            height: 1px;
            background: linear-gradient(90deg, 
                transparent, 
                rgba(255, 85, 85, 0.7),
                rgba(131, 56, 236, 0.7),
                transparent);
        }
        
        .user-name {
            font-family: 'Audiowide', cursive;
            font-size: 36px;
            color: #ff5555;
            text-shadow: 0 0 15px rgba(255, 85, 85, 0.5);
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-align: center;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            position: relative;
        }
        
        .welcome-text {
            font-family: 'Roboto Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
            max-width: 80%;
            padding: 15px 20px;
            border: 1px solid rgba(255, 85, 85, 0.2);
            background: rgba(20, 20, 20, 0.5);
            position: relative;
        }
        
        .welcome-text::before {
            content: '<';
            position: absolute;
            left: 10px;
            top: 8px;
            color: rgba(255, 85, 85, 0.7);
        }
        
        .welcome-text::after {
            content: '/>';
            position: absolute;
            right: 10px;
            bottom: 8px;
            color: rgba(255, 85, 85, 0.7);
        }
        
        /* Tech elements */
        .tech-circle {
            position: absolute;
            bottom: 30px;
            right: 30px;
            width: 80px;
            height: 80px;
            border: 1px dashed rgba(131, 56, 236, 0.5);
            border-radius: 50%;
            opacity: 0.6;
        }
        
        .tech-circle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border: 1px solid rgba(255, 85, 85, 0.5);
            border-radius: 50%;
        }
        
        .tech-circle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            background-color: #ff5555;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255, 85, 85, 0.7);
        }
        
        /* Footer */
        .footer {
            position: relative;
            z-index: 10;
            height: 30px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 15, 15, 0.9);
            border-top: 1px solid rgba(255, 85, 85, 0.3);
            font-family: 'Roboto Mono', monospace;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
        }
        
        /* Adaptive username handling */
        .user-name[data-length="long"] {
            font-size: 28px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 22px;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="welcome-panel">
        <!-- Background elements -->
        <div class="glitch-overlay"></div>
        <div class="noise"></div>
        <div class="tech-lines"></div>
        <div class="border-fx"></div>
        
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="server-icon">
                    <img src="${group_avatar}" alt="Server Icon">
                </div>
                <div class="server-name">${group_name}</div>
            </div>
            <div class="header-right">
                <div class="status-light"></div>
                <span>${status_dot}</span>
            </div>
        </div>
        
        <!-- Main content -->
        <div class="container">
            <!-- User profile section -->
            <div class="user-profile">
                <div class="profile-border"></div>
                <div class="avatar-wrapper">
                    <div class="avatar-box">
                        <img class="avatar-image" src="${avatar}" alt="User Avatar">
                    </div>
                    <div class="avatar-corner corner-tl"></div>
                    <div class="avatar-corner corner-tr"></div>
                    <div class="avatar-corner corner-bl"></div>
                    <div class="avatar-corner corner-br"></div>
                </div>
                
                <div class="user-info">
                    <div class="user-status">ID: #${userid}</div>
                    <div class="user-status">STATUS: ${status}</div>
                    <div class="user-role">${usertype}</div>
                </div>
            </div>
            
            <!-- Welcome message -->
            <div class="welcome-message">
                <h1 class="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-text">${message}</p>
                
                <div class="tech-circle"></div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${foot_up}</span>
            <span>${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Love Welcome Template - Feminine Style</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Poppins:wght@300;400;600&family=Quicksand:wght@400;600&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Quicksand', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-container {
            width: 800px;
            height: 400px;
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            background: linear-gradient(135deg, #fff0f6 0%, #fff0f9 100%);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(253, 183, 215, 0.7);
        }
        
        /* Floating hearts background */
        .hearts-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(253, 183, 215, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 75% 75%, rgba(253, 183, 215, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 1;
        }
        
        /* Subtle pattern overlay */
        .pattern-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(90deg, transparent 49%, rgba(253, 183, 215, 0.08) 50%, transparent 51%),
                linear-gradient(180deg, transparent 49%, rgba(253, 183, 215, 0.08) 50%, transparent 51%);
            background-size: 40px 40px;
            opacity: 0.6;
            z-index: 1;
        }
        
        /* Subtle glow effect */
        .glow-effect {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 70px rgba(253, 183, 215, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Decorative elements */
        .heart-decoration {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(253, 183, 215, 0.5);
            opacity: 0.7;
            z-index: 1;
        }
        
        .heart-1 {
            width: 200px;
            height: 200px;
            top: -100px;
            right: -50px;
        }
        
        .heart-2 {
            width: 150px;
            height: 150px;
            bottom: -75px;
            left: 50px;
        }
        
        .heart-3 {
            width: 100px;
            height: 100px;
            top: 50%;
            right: 50px;
            transform: translateY(-50%);
        }
        
        /* Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 25px;
            border-bottom: 1px solid rgba(253, 183, 215, 0.5);
            position: relative;
            z-index: 5;
            background: rgba(255, 240, 246, 0.9);
        }
        
        .server-info {
            display: flex;
            align-items: center;
        }
        
        .server-icon {
            width: 36px;
            height: 36px;
            background-color: rgba(253, 183, 215, 0.2);
            border: 1px solid rgba(253, 183, 215, 0.6);
            border-radius: 50%;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        
        .server-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .server-icon::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 5px rgba(253, 183, 215, 0.5);
        }
        
        .server-name {
            font-family: 'Dancing Script', cursive;
            font-weight: 700;
            color: #e64980;
            font-size: 20px;
            letter-spacing: 1px;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            font-family: 'Poppins', sans-serif;
            font-size: 12px;
            color: #e64980;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            background-color: #e64980;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px rgba(230, 73, 128, 0.7);
        }
        
        /* Main Content Area */
        .content {
            display: flex;
            height: calc(100% - 61px);
            position: relative;
            z-index: 5;
        }
        
        /* Profile Side Panel */
        .profile-panel {
            width: 250px;
            background: rgba(255, 240, 246, 0.5);
            border-right: 1px solid rgba(253, 183, 215, 0.5);
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .profile-picture {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: 20px;
        }
        
        .profile-frame {
            position: absolute;
            width: 140px;
            height: 140px;
            border: 2px solid rgba(253, 183, 215, 0.8);
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(253, 183, 215, 0.5);
            overflow: hidden;
        }
        
        .profile-frame::before {
            content: "♡";
            position: absolute;
            color: rgba(253, 183, 215, 0.9);
            font-size: 20px;
            top: 5px;
            left: 60px;
        }
        
        .profile-frame::after {
            content: "♡";
            position: absolute;
            color: rgba(253, 183, 215, 0.9);
            font-size: 20px;
            bottom: 5px;
            right: 60px;
        }
        
        .profile-image {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            background-color: rgba(255, 240, 246, 0.8);
        }
        
        .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .user-details {
            width: 100%;
            text-align: center;
        }
        
        .user-id {
            font-family: 'Poppins', sans-serif;
            color: #e64980;
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .user-role {
            display: inline-block;
            padding: 3px 10px;
            background-color: rgba(253, 183, 215, 0.2);
            border: 1px solid rgba(253, 183, 215, 0.6);
            color: #e64980;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 5px;
            font-family: 'Poppins', sans-serif;
        }
        
        /* Welcome Message Area */
        .welcome-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
        }
        
        .welcome-heading {
            font-family: 'Dancing Script', cursive;
            font-weight: 700;
            color: #e64980;
            font-size: 36px;
            margin-bottom: 5px;
            text-align: center;
            position: relative;
        }
        
        .welcome-heading::after {
            content: '';
            position: absolute;
            width: 60px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(253, 183, 215, 0.9), transparent);
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .username-display {
            font-family: 'Dancing Script', cursive;
            font-weight: 700;
            color: #d6336c;
            font-size: 40px;
            margin: 20px 0;
            letter-spacing: 1px;
            text-align: center;
            text-shadow: 0 0 10px rgba(253, 183, 215, 0.5);
            max-width: 90%;
            overflow-wrap: break-word;
            line-height: 1.2;
        }
        
        .message {
            font-family: 'Quicksand', sans-serif;
            color: #e64980;
            font-size: 16px;
            text-align: center;
            line-height: 1.6;
            margin-top: 20px;
            max-width: 80%;
            padding: 15px 20px;
            background-color: rgba(253, 183, 215, 0.1);
            border: 1px solid rgba(253, 183, 215, 0.3);
            border-radius: 20px;
            position: relative;
        }
        
        /* Decorative corners */
        .love-corners {
            position: absolute;
            width: 20px;
            height: 20px;
            font-size: 20px;
            color: rgba(253, 183, 215, 0.7);
        }
        
        .corner-tl {
            top: 10px;
            left: 10px;
            content: "♡";
        }
        
        .corner-tr {
            top: 10px;
            right: 10px;
            content: "♡";
        }
        
        .corner-bl {
            bottom: 10px;
            left: 10px;
            content: "♡";
        }
        
        .corner-br {
            bottom: 10px;
            right: 10px;
            content: "♡";
        }
        
        /* Animated love element */
        .love-element {
            position: absolute;
            right: 30px;
            bottom: 30px;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: rgba(253, 183, 215, 0.7);
            text-shadow: 0 0 10px rgba(253, 183, 215, 0.5);
            animation: pulse 2s infinite ease-in-out;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        /* Footer */
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: rgba(255, 240, 246, 0.9);
            border-top: 1px solid rgba(253, 183, 215, 0.5);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            color: #e64980;
            z-index: 5;
        }
        
        /* Responsive adjustments for long usernames */
        @media (max-width: 800px) {
            .username-display {
                font-size: 32px;
            }
        }
        
        /* Additional floating hearts animation */
        .floating-heart {
            position: absolute;
            font-size: 20px;
            color: rgba(253, 183, 215, 0.6);
            animation: float 10s infinite linear;
            z-index: 2;
        }
        
        .heart-float-1 {
            top: 20%;
            left: 10%;
            animation-duration: 12s;
        }
        
        .heart-float-2 {
            top: 15%;
            right: 20%;
            animation-duration: 15s;
            animation-delay: 1s;
        }
        
        .heart-float-3 {
            bottom: 30%;
            left: 15%;
            animation-duration: 10s;
            animation-delay: 2s;
        }
        
        .heart-float-4 {
            bottom: 20%;
            right: 25%;
            animation-duration: 14s;
            animation-delay: 3s;
        }
        
        @keyframes float {
            0% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
            50% { transform: translateY(-30px) rotate(180deg); opacity: 0.8; }
            100% { transform: translateY(0) rotate(360deg); opacity: 0.6; }
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <!-- Background Elements -->
        <div class="hearts-bg"></div>
        <div class="pattern-overlay"></div>
        <div class="glow-effect"></div>
        
        <!-- Decorative Elements -->
        <div class="heart-decoration heart-1"></div>
        <div class="heart-decoration heart-2"></div>
        <div class="heart-decoration heart-3"></div>
        
        <div class="love-corners corner-tl">♡</div>
        <div class="love-corners corner-tr">♡</div>
        <div class="love-corners corner-bl">♡</div>
        <div class="love-corners corner-br">♡</div>
        
        <!-- Floating Hearts -->
        <div class="floating-heart heart-float-1">♡</div>
        <div class="floating-heart heart-float-2">♡</div>
        <div class="floating-heart heart-float-3">♡</div>
        <div class="floating-heart heart-float-4">♡</div>
        
        <!-- Header -->
        <div class="header">
            <div class="server-info">
                <div class="server-icon">
                    <img src="${group_avatar}" alt="Server Icon">
                </div>
                <div class="server-name">${group_name}</div>
            </div>
            <div class="connection-status">
                <div class="status-indicator"></div>
                ${status_dot}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <!-- Profile Panel -->
            <div class="profile-panel">
                <div class="profile-picture">
                    <div class="profile-frame"></div>
                    <div class="profile-image">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-id">ID: #${userid}</div>
                    <div class="user-id">STATUS: ${status}</div>
                    <div class="user-role">${usertype}</div>
                </div>
            </div>
            
            <!-- Welcome Message Panel -->
            <div class="welcome-panel">
                <h1 class="welcome-heading">${title}</h1>
                <h2 class="username-display" id="username">${username}</h2>
                <p class="message">${message}</p>
                
                <div class="love-element">♡</div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${foot_up}</span>
            <span>${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 15) {
                username.style.fontSize = '32px';
            }
            
            if (usernameLength > 20) {
                username.style.fontSize = '26px';
            }
            
            if (usernameLength > 25) {
                username.style.fontSize = '22px';
                
                // Add line breaks for very long names
                const midpoint = Math.floor(usernameText.length / 2);
                let breakpoint = usernameText.lastIndexOf('_', midpoint);
                if (breakpoint === -1) breakpoint = midpoint;
                
                const firstPart = usernameText.substring(0, breakpoint);
                const secondPart = usernameText.substring(breakpoint);
                
                username.innerHTML = firstPart + '<br>' + secondPart;
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blue Sea Welcome Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Montserrat:wght@400;600;700&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Poppins', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-container {
            width: 800px;
            height: 400px;
            position: relative;
            overflow: hidden;
            border-radius: 20px;
            background: linear-gradient(180deg, #1a6baa 0%, #3498db 40%, #f08a5d 85%, #f9ed69 100%);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Sunset particles effect */
        .particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 25% 85%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 75% 88%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 1;
        }
        
        /* Animated waves */
        .waves {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 80px;
            background-image: 
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z' opacity='.25' fill='%23ffffff'/%3E%3Cpath d='M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z' opacity='.5' fill='%23ffffff'/%3E%3Cpath d='M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z' fill='%23ffffff'/%3E%3C/svg%3E");
            background-size: cover;
            background-repeat: no-repeat;
            opacity: 0.8;
            z-index: 2;
            animation: wave 15s linear infinite;
        }
        
        @keyframes wave {
            0% {
                background-position-x: 0;
            }
            100% {
                background-position-x: 1000px;
            }
        }
        
        /* Sun glow effect */
        .sun {
            position: absolute;
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, #ffeb3b 20%, #ff9800 60%, transparent 80%);
            border-radius: 50%;
            right: 80px;
            bottom: 60px;
            opacity: 0.8;
            box-shadow: 0 0 60px rgba(255, 152, 0, 0.6);
            z-index: 1;
        }
        
        /* Flying birds animation */
        .birds {
            position: absolute;
            top: 80px;
            left: 0;
            width: 100%;
            height: 40px;
            z-index: 3;
            overflow: hidden;
        }
        
        .bird {
            position: absolute;
            background-image: 
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6L12 12L6 6'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            width: 20px;
            height: 20px;
            opacity: 0.7;
            animation: fly linear infinite;
        }
        
        .bird-1 {
            top: 10px;
            left: -20px;
            animation-duration: 15s;
            animation-delay: 0s;
        }
        
        .bird-2 {
            top: 30px;
            left: -20px;
            animation-duration: 18s;
            animation-delay: 2s;
        }
        
        .bird-3 {
            top: 5px;
            left: -20px;
            animation-duration: 14s;
            animation-delay: 5s;
        }
        
        .bird-4 {
            top: 20px;
            left: -20px;
            animation-duration: 17s;
            animation-delay: 7s;
        }
        
        @keyframes fly {
            0% {
                transform: translateX(0) translateY(0) scale(0.5);
                opacity: 0;
            }
            10% {
                opacity: 0.7;
            }
            90% {
                opacity: 0.7;
            }
            100% {
                transform: translateX(820px) translateY(-40px) scale(1);
                opacity: 0;
            }
        }
        
        /* Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 25px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.3);
            position: relative;
            z-index: 5;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
        }
        
        .server-info {
            display: flex;
            align-items: center;
        }
        
        .server-icon {
            width: 36px;
            height: 36px;
            background-color: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 12px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        
        .server-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .server-icon::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.5);
        }
        
        .server-name {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            color: #ffffff;
            font-size: 16px;
            letter-spacing: 1px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            font-family: 'Poppins', sans-serif;
            font-size: 12px;
            color: #ffffff;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            background-color: #4ecca3;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 8px rgba(78, 204, 163, 0.7);
        }
        
        /* Main Content Area */
        .content {
            display: flex;
            height: calc(100% - 61px);
            position: relative;
            z-index: 5;
        }
        
        /* Profile Side Panel */
        .profile-panel {
            width: 250px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-right: 1px solid rgba(255, 255, 255, 0.3);
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .profile-picture {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: 20px;
        }
        
        .profile-frame {
            position: absolute;
            width: 140px;
            height: 140px;
            border: 2px solid rgba(255, 255, 255, 0.7);
            border-radius: 24px;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
            overflow: hidden;
        }
        
        .profile-frame::before {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(255, 255, 255, 0.7);
            top: -2px;
            left: 55px;
        }
        
        .profile-frame::after {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(255, 255, 255, 0.7);
            bottom: -2px;
            right: 55px;
        }
        
        .profile-image {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 24px;
            overflow: hidden;
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .user-details {
            width: 100%;
            text-align: center;
        }
        
        .user-id {
            font-family: 'Poppins', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .user-role {
            display: inline-block;
            padding: 3px 10px;
            background-color: rgba(78, 204, 163, 0.2);
            border: 1px solid rgba(78, 204, 163, 0.4);
            color: #ffffff;
            border-radius: 12px;
            font-size: 12px;
            margin-top: 5px;
            font-family: 'Poppins', sans-serif;
        }
        
        /* Welcome Message Area */
        .welcome-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .welcome-heading {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            color: #ffffff;
            font-size: 32px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-align: center;
            position: relative;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .welcome-heading::after {
            content: '';
            position: absolute;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .username-display {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            color: #4ecca3;
            font-size: 38px;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-align: center;
            text-shadow: 0 0 10px rgba(78, 204, 163, 0.4);
            max-width: 90%;
            overflow-wrap: break-word;
            line-height: 1.2;
        }
        
        .message {
            font-family: 'Poppins', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            text-align: center;
            line-height: 1.6;
            margin-top: 20px;
            max-width: 80%;
            padding: 15px 20px;
            background-color: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            position: relative;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        
        /* Beach decorations */
        .palm-tree {
            position: absolute;
            bottom: 0;
            left: 20px;
            width: 60px;
            height: 100px;
            background-image: 
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 200'%3E%3Cpath d='M55,200 L55,100 C55,100 45,80 45,60 C45,40 55,30 55,30 C55,30 65,40 65,60 C65,80 55,100 55,100 Z' fill='%23795548'/%3E%3Cpath d='M55,30 C55,30 30,40 20,30 C10,20 15,10 25,15 C35,20 55,30 55,30 Z' fill='%234CAF50'/%3E%3Cpath d='M55,30 C55,30 80,40 90,30 C100,20 95,10 85,15 C75,20 55,30 55,30 Z' fill='%234CAF50'/%3E%3Cpath d='M55,50 C55,50 30,60 15,55 C0,50 5,40 20,45 C35,50 55,50 55,50 Z' fill='%234CAF50'/%3E%3Cpath d='M55,50 C55,50 80,60 95,55 C110,50 105,40 90,45 C75,50 55,50 55,50 Z' fill='%234CAF50'/%3E%3Cpath d='M55,70 C55,70 35,85 20,80 C5,75 10,65 25,70 C40,75 55,70 55,70 Z' fill='%234CAF50'/%3E%3Cpath d='M55,70 C55,70 75,85 90,80 C105,75 100,65 85,70 C70,75 55,70 55,70 Z' fill='%234CAF50'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            background-position: bottom;
            z-index: 3;
            opacity: 0.8;
        }
        
        .seashell {
            position: absolute;
            width: 30px;
            height: 30px;
            background-image: 
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M95,70 C95,85 80,95 50,95 C20,95 5,85 5,70 C5,55 20,45 50,45 C80,45 95,55 95,70 Z' fill='%23FFCCBC'/%3E%3Cpath d='M50,45 C50,45 60,30 50,15 C40,0 20,5 20,20 C20,35 35,45 50,45 Z' fill='%23FFCCBC'/%3E%3Cpath d='M50,45 C50,45 40,30 50,15 C60,0 80,5 80,20 C80,35 65,45 50,45 Z' fill='%23FFCCBC'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            z-index: 3;
            opacity: 0.7;
        }
        
        .seashell-1 {
            bottom: 20px;
            right: 30px;
            transform: rotate(15deg);
        }
        
        .seashell-2 {
            bottom: 40px;
            right: 70px;
            transform: rotate(-10deg) scale(0.7);
        }
        
        /* Footer */
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            z-index: 5;
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
        }
        
        /* Responsive adjustments for long usernames */
        @media (max-width: 800px) {
            .username-display {
                font-size: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <!-- Background Elements -->
        <div class="particles"></div>
        <div class="waves"></div>
        <div class="sun"></div>
        
        <!-- Flying Birds -->
        <div class="birds">
            <div class="bird bird-1"></div>
            <div class="bird bird-2"></div>
            <div class="bird bird-3"></div>
            <div class="bird bird-4"></div>
        </div>
        
        <!-- Beach Decorations -->
        <div class="palm-tree"></div>
        <div class="seashell seashell-1"></div>
        <div class="seashell seashell-2"></div>
        
        <!-- Header -->
        <div class="header">
            <div class="server-info">
                <div class="server-icon">
                    <img src="${group_avatar}" alt="Server Icon">
                </div>
                <div class="server-name">${group_name}</div>
            </div>
            <div class="connection-status">
                <div class="status-indicator"></div>
                ${status_dot}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <!-- Profile Panel -->
            <div class="profile-panel">
                <div class="profile-picture">
                    <div class="profile-frame"></div>
                    <div class="profile-image">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-id">ID: #${userid}</div>
                    <div class="user-id">STATUS: ${status}</div>
                    <div class="user-role">${usertype}</div>
                </div>
            </div>
            
            <!-- Welcome Message Panel -->
            <div class="welcome-panel">
                <h1 class="welcome-heading">${title}</h1>
                <h2 class="username-display" id="username">${username}</h2>
                <p class="message">${message}</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${foot_up}</span>
            <span>${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 15) {
                username.style.fontSize = '30px';
            }
            
            if (usernameLength > 20) {
                username.style.fontSize = '24px';
            }
            
            if (usernameLength > 25) {
                username.style.fontSize = '20px';
                
                // Add line breaks for very long names
                const midpoint = Math.floor(usernameText.length / 2);
                let breakpoint = usernameText.lastIndexOf('_', midpoint);
                if (breakpoint === -1) breakpoint = midpoint;
                
                const firstPart = usernameText.substring(0, breakpoint);
                const secondPart = usernameText.substring(breakpoint);
                
                username.innerHTML = firstPart + '<br>' + secondPart;
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gundam Futuristic Welcome Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Rajdhani', sans-serif;
            background-color: transparent;
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-container {
            width: 800px;
            height: 400px;
            position: relative;
            overflow: hidden;
            border-radius: 2px;
            background: linear-gradient(135deg, #0a0e17 0%, #1a1f2e 100%);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(65, 132, 255, 0.5);
        }
        
        /* Mecha panel lines */
        .panel-lines {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(90deg, transparent 49.5%, rgba(65, 132, 255, 0.15) 49.8%, rgba(65, 132, 255, 0.15) 50.2%, transparent 50.5%),
                linear-gradient(180deg, transparent 49.5%, rgba(65, 132, 255, 0.15) 49.8%, rgba(65, 132, 255, 0.15) 50.2%, transparent 50.5%);
            background-size: 100px 100px;
            opacity: 0.5;
            z-index: 1;
        }
        
        /* Scanning grid effect */
        .scanning-grid {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 50% 50%, rgba(65, 132, 255, 0.03) 1px, transparent 1px);
            background-size: 15px 15px;
            z-index: 1;
        }
        
        /* Animated scan line */
        .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, transparent, rgba(65, 132, 255, 0.5), transparent);
            opacity: 0.7;
            z-index: 2;
            animation: scan 3s linear infinite;
        }
        
        @keyframes scan {
            0% {
                top: 0;
            }
            100% {
                top: 100%;
            }
        }
        
        /* Mecha decorative elements */
        .mecha-part {
            position: absolute;
            z-index: 1;
        }
        
        .part-1 {
            width: 100px;
            height: 100px;
            top: -30px;
            right: -30px;
            border: 2px solid rgba(65, 132, 255, 0.5);
            border-radius: 50%;
            transform: rotate(45deg);
        }
        
        .part-1::before {
            content: '';
            position: absolute;
            width: 80px;
            height: 80px;
            top: 10px;
            left: 10px;
            border: 1px solid rgba(255, 59, 59, 0.5);
            border-radius: 50%;
        }
        
        .part-2 {
            width: 150px;
            height: 30px;
            bottom: 50px;
            left: -75px;
            border: 2px solid rgba(65, 132, 255, 0.5);
            transform: rotate(90deg);
            clip-path: polygon(0 0, 100% 0, 80% 100%, 20% 100%);
            background: rgba(65, 132, 255, 0.1);
        }
        
        .part-3 {
            width: 60px;
            height: 60px;
            bottom: -30px;
            right: 100px;
            border: 2px solid rgba(255, 59, 59, 0.5);
            transform: rotate(45deg);
        }
        
        /* Targeting reticle */
        .targeting-reticle {
            position: absolute;
            width: 100px;
            height: 100px;
            border: 1px solid rgba(255, 59, 59, 0.7);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            z-index: 3;
            animation: target 5s ease-in-out infinite;
        }
        
        .targeting-reticle::before, .targeting-reticle::after {
            content: '';
            position: absolute;
            background-color: rgba(255, 59, 59, 0.7);
        }
        
        .targeting-reticle::before {
            width: 100%;
            height: 1px;
            top: 50%;
            left: 0;
        }
        
        .targeting-reticle::after {
            width: 1px;
            height: 100%;
            top: 0;
            left: 50%;
        }
        
        @keyframes target {
            0%, 100% {
                opacity: 0;
                width: 100px;
                height: 100px;
            }
            50% {
                opacity: 0.5;
                width: 150px;
                height: 150px;
            }
        }
        
        /* Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 25px;
            border-bottom: 1px solid rgba(65, 132, 255, 0.5);
            position: relative;
            z-index: 5;
            background: rgba(10, 14, 23, 0.9);
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #ff3b3b, #4184ff);
        }
        
        .server-info {
            display: flex;
            align-items: center;
        }
        
        .server-icon {
            width: 36px;
            height: 36px;
            background-color: rgba(65, 132, 255, 0.2);
            border: 1px solid rgba(65, 132, 255, 0.6);
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        
        .server-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .server-icon::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 5px rgba(65, 132, 255, 0.5);
        }
        
        .server-name {
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            color: #ffffff;
            font-size: 16px;
            letter-spacing: 1px;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            color: #4184ff;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            background-color: #4184ff;
            border-radius: 0;
            margin-right: 8px;
            box-shadow: 0 0 8px rgba(65, 132, 255, 0.7);
            animation: blink 2s infinite;
        }
        
        @keyframes blink {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
        
        /* Main Content Area */
        .content {
            display: flex;
            height: calc(100% - 61px);
            position: relative;
            z-index: 5;
        }
        
        /* Profile Side Panel */
        .profile-panel {
            width: 250px;
            background: rgba(10, 14, 23, 0.7);
            border-right: 1px solid rgba(65, 132, 255, 0.5);
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        
        .profile-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                linear-gradient(90deg, transparent 49.5%, rgba(65, 132, 255, 0.2) 49.8%, rgba(65, 132, 255, 0.2) 50.2%, transparent 50.5%),
                linear-gradient(180deg, transparent 49.5%, rgba(65, 132, 255, 0.2) 49.8%, rgba(65, 132, 255, 0.2) 50.2%, transparent 50.5%);
            background-size: 30px 30px;
            z-index: -1;
        }
        
        .profile-picture {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: 20px;
        }
        
        .profile-frame {
            position: absolute;
            width: 140px;
            height: 140px;
            border: 2px solid rgba(65, 132, 255, 0.7);
            clip-path: polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%);
            box-shadow: 0 0 15px rgba(65, 132, 255, 0.3);
            overflow: hidden;
        }
        
        .profile-frame::before {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(255, 59, 59, 0.7);
            top: 10px;
            left: 55px;
        }
        
        .profile-frame::after {
            content: '';
            position: absolute;
            width: 30px;
            height: 2px;
            background-color: rgba(255, 59, 59, 0.7);
            bottom: 10px;
            right: 55px;
        }
        
        .profile-image {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            clip-path: polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%);
            background-color: rgba(10, 14, 23, 0.8);
        }
        
        .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .user-details {
            width: 100%;
            text-align: center;
        }
        
        .user-id {
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .user-role {
            display: inline-block;
            padding: 3px 10px;
            background-color: rgba(255, 59, 59, 0.1);
            border: 1px solid rgba(255, 59, 59, 0.4);
            color: #ff3b3b;
            font-size: 12px;
            margin-top: 5px;
            font-family: 'Share Tech Mono', monospace;
            clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%);
        }
        
        /* Welcome Message Area */
        .welcome-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            background: rgba(10, 14, 23, 0.5);
        }
        
        .welcome-heading {
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            color: #ffffff;
            font-size: 32px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-align: center;
            position: relative;
        }
        
        .welcome-heading::after {
            content: '';
            position: absolute;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, transparent, rgba(255, 59, 59, 0.7), transparent);
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .username-display {
            font-family: 'Orbitron', sans-serif;
            font-weight: 600;
            color: #4184ff;
            font-size: 38px;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-align: center;
            text-shadow: 0 0 10px rgba(65, 132, 255, 0.4);
            max-width: 90%;
            overflow-wrap: break-word;
            line-height: 1.2;
        }
        
        .message {
            font-family: 'Rajdhani', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            text-align: center;
            line-height: 1.6;
            margin-top: 20px;
            max-width: 80%;
            padding: 15px 20px;
            background-color: rgba(65, 132, 255, 0.05);
            border: 1px solid rgba(65, 132, 255, 0.2);
            position: relative;
            clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
        }
        
        .message::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, rgba(65, 132, 255, 0.1) 0%, transparent 20%, transparent 80%, rgba(65, 132, 255, 0.1) 100%);
            pointer-events: none;
        }
        
        /* Gundam-style corners */
        .mecha-corners {
            position: absolute;
            width: 20px;
            height: 20px;
            border-style: solid;
            border-color: rgba(65, 132, 255, 0.5);
            border-width: 0;
        }
        
        .corner-tl {
            top: 20px;
            left: 20px;
            border-top-width: 2px;
            border-left-width: 2px;
        }
        
        .corner-tr {
            top: 20px;
            right: 20px;
            border-top-width: 2px;
            border-right-width: 2px;
        }
        
        .corner-bl {
            bottom: 20px;
            left: 20px;
            border-bottom-width: 2px;
            border-left-width: 2px;
        }
        
        .corner-br {
            bottom: 20px;
            right: 20px;
            border-bottom-width: 2px;
            border-right-width: 2px;
        }
        
        /* Animated mecha element */
        .mecha-element {
            position: absolute;
            right: 30px;
            bottom: 30px;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .mecha-circle {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(65, 132, 255, 0.5);
            animation: rotate 10s linear infinite;
        }
        
        .circle-1 {
            width: 80px;
            height: 80px;
        }
        
        .circle-2 {
            width: 60px;
            height: 60px;
            border-color: rgba(255, 59, 59, 0.5);
            animation-direction: reverse;
        }
        
        .circle-3 {
            width: 40px;
            height: 40px;
        }
        
        @keyframes rotate {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }
        
        /* Data readout */
        .data-readout {
            position: absolute;
            bottom: 20px;
            left: 20px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            color: rgba(65, 132, 255, 0.8);
            text-align: left;
            line-height: 1.4;
        }
        
        /* Footer */
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: rgba(10, 14, 23, 0.9);
            border-top: 1px solid rgba(65, 132, 255, 0.5);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            z-index: 5;
        }
        
        /* Responsive adjustments for long usernames */
        @media (max-width: 800px) {
            .username-display {
                font-size: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <!-- Background Elements -->
        <div class="panel-lines"></div>
        <div class="scanning-grid"></div>
        <div class="scan-line"></div>
        
        <!-- Mecha Decorative Elements -->
        <div class="mecha-part part-1"></div>
        <div class="mecha-part part-2"></div>
        <div class="mecha-part part-3"></div>
        
        <div class="targeting-reticle"></div>
        
        <div class="mecha-corners corner-tl"></div>
        <div class="mecha-corners corner-tr"></div>
        <div class="mecha-corners corner-bl"></div>
        <div class="mecha-corners corner-br"></div>
        
        <!-- Header -->
        <div class="header">
            <div class="server-info">
                <div class="server-icon">
                    <img src="${group_avatar}" alt="Server Icon">
                </div>
                <div class="server-name">${group_name}</div>
            </div>
            <div class="connection-status">
                <div class="status-indicator"></div>
                ${status_dot}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <!-- Profile Panel -->
            <div class="profile-panel">
                <div class="profile-picture">
                    <div class="profile-frame"></div>
                    <div class="profile-image">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-id">ID: #${userid}</div>
                    <div class="user-id">STATUS: ${status}</div>
                    <div class="user-role">${usertype}</div>
                </div>
            </div>
            
            <!-- Welcome Message Panel -->
            <div class="welcome-panel">
                <h1 class="welcome-heading">${title}</h1>
                <h2 class="username-display" id="username">${username}</h2>
                <p class="message">${message}</p>
                
                <div class="mecha-element">
                    <div class="mecha-circle circle-1"></div>
                    <div class="mecha-circle circle-2"></div>
                    <div class="mecha-circle circle-3"></div>
                </div>
                
                <div class="data-readout">
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${foot_up}</span>
            <span>${foot_end}</span>
        </div>
    </div>
    
    <script>
        // Function to adjust username font size based on length
        window.onload = function() {
            const username = document.getElementById('username');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            if (usernameLength > 15) {
                username.style.fontSize = '30px';
            }
            
            if (usernameLength > 20) {
                username.style.fontSize = '24px';
            }
            
            if (usernameLength > 25) {
                username.style.fontSize = '20px';
                
                // Add line breaks for very long names
                const midpoint = Math.floor(usernameText.length / 2);
                let breakpoint = usernameText.lastIndexOf('_', midpoint);
                if (breakpoint === -1) breakpoint = midpoint;
                
                const firstPart = usernameText.substring(0, breakpoint);
                const secondPart = usernameText.substring(breakpoint);
                
                username.innerHTML = firstPart + '<br>' + secondPart;
            }
        };
    </script>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cyberpunk Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&family=Share+Tech+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Rajdhani', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000428 100%);
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(16,8,32,0.9) 50%, rgba(0,0,0,0.9) 100%);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 40px rgba(255, 0, 255, 0.4), 
                        inset 0 0 20px rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(255, 0, 255, 0.3);
        }
        
        /* Cyber grid overlay */
        .cyber-grid {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(255, 0, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 0, 255, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            animation: grid-move 10s linear infinite;
            z-index: 1;
        }
        
        @keyframes grid-move {
            0% { transform: translate(0, 0); }
            100% { transform: translate(20px, 20px); }
        }
        
        /* Glitch effect overlay */
        .glitch-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 0, 255, 0.1) 50%, 
                transparent 100%);
            animation: glitch-scan 3s ease-in-out infinite;
            z-index: 2;
        }
        
        @keyframes glitch-scan {
            0%, 100% { transform: translateY(-100%); }
            50% { transform: translateY(100%); }
        }
        
        /* Corner circuits */
        .circuit-corner {
            position: absolute;
            width: 80px;
            height: 80px;
            z-index: 3;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0 L20 0 L20 10 L40 10 L40 20 L60 20 L60 30 L80 30 M0 0 L0 20 L10 20 L10 40 L20 40 L20 60 L30 60 L30 80' stroke='%2300ffff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M80 0 L60 0 L60 10 L40 10 L40 20 L20 20 L20 30 L0 30 M80 0 L80 20 L70 20 L70 40 L60 40 L60 60 L50 60 L50 80' stroke='%23ff00ff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 80 L20 80 L20 70 L40 70 L40 60 L60 60 L60 50 L80 50 M0 80 L0 60 L10 60 L10 40 L20 40 L20 20 L30 20 L30 0' stroke='%2300ffff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M80 80 L60 80 L60 70 L40 70 L40 60 L20 60 L20 50 L0 50 M80 80 L80 60 L70 60 L70 40 L60 40 L60 20 L50 20 L50 0' stroke='%23ff00ff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .neon-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 30px rgba(255, 0, 255, 0.3),
                        inset 0 0 30px rgba(0, 255, 255, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background: linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(16,8,32,0.95) 50%, rgba(0,0,0,0.95) 100%);
            border-bottom: 1px solid rgba(255, 0, 255, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(255, 0, 255, 0.7), rgba(0, 255, 255, 0.7), transparent);
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            border: 1px solid #00ffff;
            overflow: hidden;
            margin-right: 15px;
            background-color: #0a0a0a;
            position: relative;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }
        
        .group-name {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #00ffff;
            font-size: 14px;
            font-family: 'Share Tech Mono', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #00ffff;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 15px #00ffff;
            animation: blink 1s ease-in-out infinite;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with holographic effects */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(255, 0, 255, 0.3);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(16,8,32,0.6) 100%);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 255, 0.5), rgba(0, 255, 255, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), rgba(255, 0, 255, 0.5), transparent);
        }
        
        /* Holographic avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        .holographic-frame {
            position: absolute;
            width: 166px;
            height: 166px;
            top: -8px;
            left: -8px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='166' height='166'%3E%3Crect x='8' y='8' width='150' height='150' fill='none' stroke='%23ff00ff' stroke-width='2'/%3E%3Crect x='3' y='3' width='160' height='160' fill='none' stroke='%2300ffff' stroke-width='1' stroke-dasharray='5,5'/%3E%3C/svg%3E");
            z-index: 4;
            animation: hologram-pulse 3s ease-in-out infinite;
        }
        
        @keyframes hologram-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 4px;
            border: 2px solid #00ffff;
            overflow: hidden;
            background-color: #0a0a0a;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: contrast(1.2) saturate(1.5);
        }
        
        .user-status {
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .status-box {
            padding: 5px 15px;
            border: 1px solid rgba(255, 0, 255, 0.5);
            background: linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%);
            margin-top: 8px;
            font-family: 'Orbitron', sans-serif;
            font-size: 12px;
            color: #ff00ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        
        .status-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: scan-line 2s linear infinite;
        }
        
        @keyframes scan-line {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        /* Right panel with neon effects */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-title {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 900;
            text-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
            text-align: center;
            position: relative;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            color: #00ffff;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Orbitron', sans-serif;
            color: #ff00ff;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 25px rgba(255, 0, 255, 0.8);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
        }
        
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ff00ff, #00ffff, transparent);
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .welcome-message {
            font-family: 'Rajdhani', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(255, 0, 255, 0.3);
            background: linear-gradient(135deg, rgba(255, 0, 255, 0.05) 0%, rgba(0, 255, 255, 0.05) 100%);
            position: relative;
            font-weight: 300;
        }
        
        /* Cyber decoration */
        .cyber-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .cyber-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(255, 0, 255, 0.5);
            border-radius: 50%;
            animation: rotate-cyber 4s linear infinite;
        }
        
        @keyframes rotate-cyber {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .cyber-ring::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            border: 1px solid rgba(0, 255, 255, 0.5);
            border-radius: 50%;
            animation: rotate-cyber-reverse 3s linear infinite;
        }
        
        @keyframes rotate-cyber-reverse {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        
        .cyber-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #00ffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        }
        
        .cyber-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .cyber-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(16,8,32,0.95) 50%, rgba(0,0,0,0.95) 100%);
            border-top: 1px solid rgba(255, 0, 255, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 20px;
            color: rgba(255, 0, 255, 0.7);
            font-size: 14px;
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: -10px;
            right: 20px;
            color: rgba(0, 255, 255, 0.7);
            font-size: 14px;
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #00ffff;
            text-transform: uppercase;
        }
        
        /* Glitch effects for title */
        .glitch {
            position: relative;
            animation: glitch-skew 1s infinite linear alternate-reverse;
        }
        
        .glitch::before,
        .glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        .glitch::before {
            animation: glitch-1 0.5s infinite;
            color: #ff00ff;
            z-index: -1;
        }
        
        .glitch::after {
            animation: glitch-2 0.5s infinite;
            color: #00ffff;
            z-index: -2;
        }
        
        @keyframes glitch-1 {
            0%, 100% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
            20% {
                clip-path: inset(20% 0 30% 0);
                transform: translate(-2px, 2px);
            }
            40% {
                clip-path: inset(50% 0 20% 0);
                transform: translate(2px, -2px);
            }
            60% {
                clip-path: inset(10% 0 60% 0);
                transform: translate(-2px, 1px);
            }
            80% {
                clip-path: inset(80% 0 5% 0);
                transform: translate(1px, -1px);
            }
        }
        
        @keyframes glitch-2 {
            0%, 100% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
            20% {
                clip-path: inset(60% 0 10% 0);
                transform: translate(2px, -1px);
            }
            40% {
                clip-path: inset(20% 0 50% 0);
                transform: translate(-2px, 1px);
            }
            60% {
                clip-path: inset(30% 0 40% 0);
                transform: translate(1px, -2px);
            }
            80% {
                clip-path: inset(5% 0 80% 0);
                transform: translate(-1px, 2px);
            }
        }
        
        @keyframes glitch-skew {
            0%, 100% {
                transform: skew(0deg);
            }
            20% {
                transform: skew(-2deg);
            }
            40% {
                transform: skew(1deg);
            }
            60% {
                transform: skew(-1deg);
            }
            80% {
                transform: skew(2deg);
            }
        }

        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }

            // Add glitch effect to username
            username.classList.add('glitch');
            username.setAttribute('data-text', username.textContent);
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="cyber-grid"></div>
        <div class="glitch-overlay"></div>
        <div class="neon-border"></div>
        
        <!-- Corner circuits -->
        <div class="circuit-corner top-left"></div>
        <div class="circuit-corner top-right"></div>
        <div class="circuit-corner bottom-left"></div>
        <div class="circuit-corner bottom-right"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="holographic-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">ID: ${status}</div>
                <div class="user-status">CODE: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="cyber-decoration">
                    <div class="cyber-ring">
                        <div class="cyber-dot cyber-dot-1"></div>
                        <div class="cyber-dot cyber-dot-2"></div>
                        <div class="cyber-dot cyber-dot-3"></div>
                        <div class="cyber-dot cyber-dot-4"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cyberpunk Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&family=Share+Tech+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Rajdhani', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000428 100%);
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(16,8,32,0.9) 50%, rgba(0,0,0,0.9) 100%);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 40px rgba(255, 0, 255, 0.4), 
                        inset 0 0 20px rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(255, 0, 255, 0.3);
        }
        
        /* Cyber grid overlay */
        .cyber-grid {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(255, 0, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 0, 255, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            animation: grid-move 10s linear infinite;
            z-index: 1;
        }
        
        @keyframes grid-move {
            0% { transform: translate(0, 0); }
            100% { transform: translate(20px, 20px); }
        }
        
        /* Glitch effect overlay */
        .glitch-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 0, 255, 0.1) 50%, 
                transparent 100%);
            animation: glitch-scan 3s ease-in-out infinite;
            z-index: 2;
        }
        
        @keyframes glitch-scan {
            0%, 100% { transform: translateY(-100%); }
            50% { transform: translateY(100%); }
        }
        
        /* Corner circuits */
        .circuit-corner {
            position: absolute;
            width: 80px;
            height: 80px;
            z-index: 3;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0 L20 0 L20 10 L40 10 L40 20 L60 20 L60 30 L80 30 M0 0 L0 20 L10 20 L10 40 L20 40 L20 60 L30 60 L30 80' stroke='%2300ffff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M80 0 L60 0 L60 10 L40 10 L40 20 L20 20 L20 30 L0 30 M80 0 L80 20 L70 20 L70 40 L60 40 L60 60 L50 60 L50 80' stroke='%23ff00ff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 80 L20 80 L20 70 L40 70 L40 60 L60 60 L60 50 L80 50 M0 80 L0 60 L10 60 L10 40 L20 40 L20 20 L30 20 L30 0' stroke='%2300ffff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M80 80 L60 80 L60 70 L40 70 L40 60 L20 60 L20 50 L0 50 M80 80 L80 60 L70 60 L70 40 L60 40 L60 20 L50 20 L50 0' stroke='%23ff00ff' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
        }
        
        .neon-border {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 30px rgba(255, 0, 255, 0.3),
                        inset 0 0 30px rgba(0, 255, 255, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background: linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(16,8,32,0.95) 50%, rgba(0,0,0,0.95) 100%);
            border-bottom: 1px solid rgba(255, 0, 255, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            width: 150px;
            height: 2px;
            background: linear-gradient(90deg, rgba(255, 0, 255, 0.7), rgba(0, 255, 255, 0.7), transparent);
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            border: 1px solid #00ffff;
            overflow: hidden;
            margin-right: 15px;
            background-color: #0a0a0a;
            position: relative;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }
        
        .group-name {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #00ffff;
            font-size: 14px;
            font-family: 'Share Tech Mono', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #00ffff;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 15px #00ffff;
            animation: blink 1s ease-in-out infinite;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with holographic effects */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(255, 0, 255, 0.3);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(16,8,32,0.6) 100%);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 255, 0.5), rgba(0, 255, 255, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), rgba(255, 0, 255, 0.5), transparent);
        }
        
        /* Holographic avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        .holographic-frame {
            position: absolute;
            width: 166px;
            height: 166px;
            top: -8px;
            left: -8px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='166' height='166'%3E%3Crect x='8' y='8' width='150' height='150' fill='none' stroke='%23ff00ff' stroke-width='2'/%3E%3Crect x='3' y='3' width='160' height='160' fill='none' stroke='%2300ffff' stroke-width='1' stroke-dasharray='5,5'/%3E%3C/svg%3E");
            z-index: 4;
            animation: hologram-pulse 3s ease-in-out infinite;
        }
        
        @keyframes hologram-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 4px;
            border: 2px solid #00ffff;
            overflow: hidden;
            background-color: #0a0a0a;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: contrast(1.2) saturate(1.5);
        }
        
        .user-status {
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .status-box {
            padding: 5px 15px;
            border: 1px solid rgba(255, 0, 255, 0.5);
            background: linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%);
            margin-top: 8px;
            font-family: 'Orbitron', sans-serif;
            font-size: 12px;
            color: #ff00ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        
        .status-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: scan-line 2s linear infinite;
        }
        
        @keyframes scan-line {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        /* Right panel with neon effects */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-title {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 900;
            text-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
            text-align: center;
            position: relative;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            color: #00ffff;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Orbitron', sans-serif;
            color: #ff00ff;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 25px rgba(255, 0, 255, 0.8);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
        }
        
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ff00ff, #00ffff, transparent);
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .welcome-message {
            font-family: 'Rajdhani', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(255, 0, 255, 0.3);
            background: linear-gradient(135deg, rgba(255, 0, 255, 0.05) 0%, rgba(0, 255, 255, 0.05) 100%);
            position: relative;
            font-weight: 300;
        }
        
        /* Cyber decoration */
        .cyber-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .cyber-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(255, 0, 255, 0.5);
            border-radius: 50%;
            animation: rotate-cyber 4s linear infinite;
        }
        
        @keyframes rotate-cyber {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .cyber-ring::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            border: 1px solid rgba(0, 255, 255, 0.5);
            border-radius: 50%;
            animation: rotate-cyber-reverse 3s linear infinite;
        }
        
        @keyframes rotate-cyber-reverse {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        
        .cyber-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #00ffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        }
        
        .cyber-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .cyber-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .cyber-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(16,8,32,0.95) 50%, rgba(0,0,0,0.95) 100%);
            border-top: 1px solid rgba(255, 0, 255, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Share Tech Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 20px;
            color: rgba(255, 0, 255, 0.7);
            font-size: 14px;
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: -10px;
            right: 20px;
            color: rgba(0, 255, 255, 0.7);
            font-size: 14px;
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #00ffff;
            text-transform: uppercase;
        }
        
        /* Glitch effects for title */
        .glitch {
            position: relative;
            animation: glitch-skew 1s infinite linear alternate-reverse;
        }
        
        .glitch::before,
        .glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        .glitch::before {
            animation: glitch-1 0.5s infinite;
            color: #ff00ff;
            z-index: -1;
        }
        
        .glitch::after {
            animation: glitch-2 0.5s infinite;
            color: #00ffff;
            z-index: -2;
        }
        
        @keyframes glitch-1 {
            0%, 100% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
            20% {
                clip-path: inset(20% 0 30% 0);
                transform: translate(-2px, 2px);
            }
            40% {
                clip-path: inset(50% 0 20% 0);
                transform: translate(2px, -2px);
            }
            60% {
                clip-path: inset(10% 0 60% 0);
                transform: translate(-2px, 1px);
            }
            80% {
                clip-path: inset(80% 0 5% 0);
                transform: translate(1px, -1px);
            }
        }
        
        @keyframes glitch-2 {
            0%, 100% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
            20% {
                clip-path: inset(60% 0 10% 0);
                transform: translate(2px, -1px);
            }
            40% {
                clip-path: inset(20% 0 50% 0);
                transform: translate(-2px, 1px);
            }
            60% {
                clip-path: inset(30% 0 40% 0);
                transform: translate(1px, -2px);
            }
            80% {
                clip-path: inset(5% 0 80% 0);
                transform: translate(-1px, 2px);
            }
        }
        
        @keyframes glitch-skew {
            0%, 100% {
                transform: skew(0deg);
            }
            20% {
                transform: skew(-2deg);
            }
            40% {
                transform: skew(1deg);
            }
            60% {
                transform: skew(-1deg);
            }
            80% {
                transform: skew(2deg);
            }
        }

        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }

            // Add glitch effect to username
            username.classList.add('glitch');
            username.setAttribute('data-text', username.textContent);
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="cyber-grid"></div>
        <div class="glitch-overlay"></div>
        <div class="neon-border"></div>
        
        <!-- Corner circuits -->
        <div class="circuit-corner top-left"></div>
        <div class="circuit-corner top-right"></div>
        <div class="circuit-corner bottom-left"></div>
        <div class="circuit-corner bottom-right"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="holographic-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">ID: ${status}</div>
                <div class="user-status">CODE: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="cyber-decoration">
                    <div class="cyber-ring">
                        <div class="cyber-dot cyber-dot-1"></div>
                        <div class="cyber-dot cyber-dot-2"></div>
                        <div class="cyber-dot cyber-dot-3"></div>
                        <div class="cyber-dot cyber-dot-4"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Space Galaxy Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&family=Space+Mono&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Exo 2', sans-serif;
            background: linear-gradient(135deg, #000428 0%, #004e92 50%, #000428 100%);
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, rgba(0, 4, 40, 0.95) 0%, rgba(0, 78, 146, 0.95) 100%);
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 50px rgba(100, 149, 237, 0.4),
                        inset 0 0 30px rgba(147, 112, 219, 0.2);
            border: 1px solid rgba(100, 149, 237, 0.5);
        }
        
        /* Starfield background */
        .starfield {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(2px 2px at 20px 30px, white, transparent),
                radial-gradient(2px 2px at 40px 70px, white, transparent),
                radial-gradient(1px 1px at 50px 50px, white, transparent),
                radial-gradient(1px 1px at 80px 10px, white, transparent),
                radial-gradient(2px 2px at 130px 80px, white, transparent),
                radial-gradient(1px 1px at 110px 40px, white, transparent);
            background-repeat: repeat;
            background-size: 200px 100px;
            animation: stars-move 60s linear infinite;
            opacity: 0.3;
            z-index: 1;
        }
        
        @keyframes stars-move {
            from { transform: translateX(0); }
            to { transform: translateX(-200px); }
        }
        
        /* Nebula overlay */
        .nebula-overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, 
                rgba(147, 112, 219, 0.1) 0%, 
                rgba(100, 149, 237, 0.1) 50%, 
                transparent 100%);
            animation: nebula-pulse 8s ease-in-out infinite;
            z-index: 1;
        }
        
        @keyframes nebula-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
        }
        
        /* Constellation corners */
        .constellation-corner {
            position: absolute;
            width: 80px;
            height: 80px;
            z-index: 3;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 10 L30 10 M30 10 L30 30 M30 30 L50 30 M50 30 L50 10 M50 10 L70 10 M10 10 L10 30 M10 30 L20 40 M20 40 L40 40 M40 40 L40 60 M40 60 L20 60 M20 60 L20 40' stroke='%236495ed' stroke-width='1' fill='none' opacity='0.6'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%236495ed'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%236495ed'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%236495ed'/%3E%3Ccircle cx='50' cy='30' r='2' fill='%236495ed'/%3E%3Ccircle cx='50' cy='10' r='2' fill='%236495ed'/%3E%3Ccircle cx='70' cy='10' r='2' fill='%236495ed'/%3E%3Ccircle cx='10' cy='30' r='2' fill='%236495ed'/%3E%3Ccircle cx='20' cy='40' r='2' fill='%236495ed'/%3E%3Ccircle cx='40' cy='40' r='2' fill='%236495ed'/%3E%3Ccircle cx='40' cy='60' r='2' fill='%236495ed'/%3E%3Ccircle cx='20' cy='60' r='2' fill='%236495ed'/%3E%3C/svg%3E");
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M70 10 L50 10 M50 10 L50 30 M50 30 L30 30 M30 30 L30 10 M30 10 L10 10 M70 10 L70 30 M70 30 L60 40 M60 40 L40 40 M40 40 L40 60 M40 60 L60 60 M60 60 L60 40' stroke='%239370db' stroke-width='1' fill='none' opacity='0.6'/%3E%3Ccircle cx='70' cy='10' r='2' fill='%239370db'/%3E%3Ccircle cx='50' cy='10' r='2' fill='%239370db'/%3E%3Ccircle cx='50' cy='30' r='2' fill='%239370db'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%239370db'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%239370db'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%239370db'/%3E%3Ccircle cx='70' cy='30' r='2' fill='%239370db'/%3E%3Ccircle cx='60' cy='40' r='2' fill='%239370db'/%3E%3Ccircle cx='40' cy='40' r='2' fill='%239370db'/%3E%3Ccircle cx='40' cy='60' r='2' fill='%239370db'/%3E%3Ccircle cx='60' cy='60' r='2' fill='%239370db'/%3E%3C/svg%3E");
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 70 L30 70 M30 70 L30 50 M30 50 L50 50 M50 50 L50 70 M50 70 L70 70 M10 70 L10 50 M10 50 L20 40 M20 40 L40 40 M40 40 L40 20 M40 20 L20 20 M20 20 L20 40' stroke='%236495ed' stroke-width='1' fill='none' opacity='0.6'/%3E%3Ccircle cx='10' cy='70' r='2' fill='%236495ed'/%3E%3Ccircle cx='30' cy='70' r='2' fill='%236495ed'/%3E%3Ccircle cx='30' cy='50' r='2' fill='%236495ed'/%3E%3Ccircle cx='50' cy='50' r='2' fill='%236495ed'/%3E%3Ccircle cx='50' cy='70' r='2' fill='%236495ed'/%3E%3Ccircle cx='70' cy='70' r='2' fill='%236495ed'/%3E%3Ccircle cx='10' cy='50' r='2' fill='%236495ed'/%3E%3Ccircle cx='20' cy='40' r='2' fill='%236495ed'/%3E%3Ccircle cx='40' cy='40' r='2' fill='%236495ed'/%3E%3Ccircle cx='40' cy='20' r='2' fill='%236495ed'/%3E%3Ccircle cx='20' cy='20' r='2' fill='%236495ed'/%3E%3C/svg%3E");
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M70 70 L50 70 M50 70 L50 50 M50 50 L30 50 M30 50 L30 70 M30 70 L10 70 M70 70 L70 50 M70 50 L60 40 M60 40 L40 40 M40 40 L40 20 M40 20 L60 20 M60 20 L60 40' stroke='%239370db' stroke-width='1' fill='none' opacity='0.6'/%3E%3Ccircle cx='70' cy='70' r='2' fill='%239370db'/%3E%3Ccircle cx='50' cy='70' r='2' fill='%239370db'/%3E%3Ccircle cx='50' cy='50' r='2' fill='%239370db'/%3E%3Ccircle cx='30' cy='50' r='2' fill='%239370db'/%3E%3Ccircle cx='30' cy='70' r='2' fill='%239370db'/%3E%3Ccircle cx='10' cy='70' r='2' fill='%239370db'/%3E%3Ccircle cx='70' cy='50' r='2' fill='%239370db'/%3E%3Ccircle cx='60' cy='40' r='2' fill='%239370db'/%3E%3Ccircle cx='40' cy='40' r='2' fill='%239370db'/%3E%3Ccircle cx='40' cy='20' r='2' fill='%239370db'/%3E%3Ccircle cx='60' cy='20' r='2' fill='%239370db'/%3E%3C/svg%3E");
        }
        
        .cosmic-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 40px rgba(100, 149, 237, 0.3),
                        inset 0 0 40px rgba(147, 112, 219, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background: linear-gradient(90deg, rgba(0, 4, 40, 0.95) 0%, rgba(0, 78, 146, 0.95) 50%, rgba(0, 4, 40, 0.95) 100%);
            border-bottom: 1px solid rgba(100, 149, 237, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            color: rgba(100, 149, 237, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: star-twinkle 2s ease-in-out infinite;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            color: rgba(147, 112, 219, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: star-twinkle 2s ease-in-out infinite 0.5s;
        }
        
        @keyframes star-twinkle {
            0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(1); }
            50% { opacity: 1; transform: translateY(-50%) scale(1.2); }
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid #6495ed;
            overflow: hidden;
            margin-right: 15px;
            background-color: #000428;
            position: relative;
            box-shadow: 0 0 15px rgba(100, 149, 237, 0.5);
        }
        
        .group-name {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(100, 149, 237, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #6495ed;
            font-size: 14px;
            font-family: 'Space Mono', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #6495ed;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 15px #6495ed;
            animation: signal-pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes signal-pulse {
            0%, 100% { box-shadow: 0 0 15px #6495ed; }
            50% { box-shadow: 0 0 25px #6495ed, 0 0 35px rgba(100, 149, 237, 0.5); }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with space elements */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(100, 149, 237, 0.3);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: linear-gradient(180deg, rgba(0, 4, 40, 0.6) 0%, rgba(0, 78, 146, 0.6) 100%);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.5), rgba(147, 112, 219, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(147, 112, 219, 0.5), rgba(100, 149, 237, 0.5), transparent);
        }
        
        /* Space avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        .space-frame {
            position: absolute;
            width: 170px;
            height: 170px;
            top: -10px;
            left: -10px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Ccircle cx='85' cy='85' r='80' fill='none' stroke='%236495ed' stroke-width='2' stroke-dasharray='5,5'/%3E%3Ccircle cx='85' cy='85' r='70' fill='none' stroke='%239370db' stroke-width='1'/%3E%3Ccircle cx='85' cy='85' r='60' fill='none' stroke='%236495ed' stroke-width='1' stroke-dasharray='3,3'/%3E%3C/svg%3E");
            z-index: 4;
            animation: orbit-rotate 15s linear infinite;
        }
        
        @keyframes orbit-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 2px solid #6495ed;
            overflow: hidden;
            background-color: #000428;
            box-shadow: 0 0 20px rgba(100, 149, 237, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: contrast(1.3) saturate(1.5) brightness(1.2);
        }
        
        .user-status {
            font-family: 'Space Mono', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .status-box {
            padding: 5px 15px;
            border: 1px solid rgba(147, 112, 219, 0.5);
            background: linear-gradient(135deg, rgba(147, 112, 219, 0.1) 0%, rgba(100, 149, 237, 0.1) 100%);
            margin-top: 8px;
            font-family: 'Orbitron', sans-serif;
            font-size: 12px;
            color: #9370db;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        
        .status-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: energy-scan 3s linear infinite;
        }
        
        @keyframes energy-scan {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        /* Right panel with space effects */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-title {
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 900;
            text-shadow: 0 0 20px rgba(100, 149, 237, 0.8);
            text-align: center;
            position: relative;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            color: #9370db;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Orbitron', sans-serif;
            color: #6495ed;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 25px rgba(100, 149, 237, 0.8);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
        }
        
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #6495ed, #9370db, transparent);
            animation: energy-flow 2s ease-in-out infinite;
        }
        
        @keyframes energy-flow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        
        .welcome-message {
            font-family: 'Exo 2', sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(100, 149, 237, 0.3);
            background: linear-gradient(135deg, rgba(100, 149, 237, 0.05) 0%, rgba(147, 112, 219, 0.05) 100%);
            position: relative;
            font-weight: 300;
        }
        
        /* Space decoration */
        .space-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .planet-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(100, 149, 237, 0.5);
            border-radius: 50%;
            animation: planet-rotate 8s linear infinite;
        }
        
        @keyframes planet-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .planet-ring::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotateX(60deg);
            width: 120%;
            height: 120%;
            border: 1px solid rgba(147, 112, 219, 0.3);
            border-radius: 50%;
            animation: planet-rotate-reverse 6s linear infinite;
        }
        
        @keyframes planet-rotate-reverse {
            from { transform: translate(-50%, -50%) rotateX(60deg) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotateX(60deg) rotate(-360deg); }
        }
        
        .planet-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #6495ed;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(100, 149, 237, 0.8);
        }
        
        .planet-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .planet-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .planet-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .planet-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(90deg, rgba(0, 4, 40, 0.95) 0%, rgba(0, 78, 146, 0.95) 50%, rgba(0, 4, 40, 0.95) 100%);
            border-top: 1px solid rgba(100, 149, 237, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Space Mono', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: -12px;
            left: 20px;
            color: rgba(100, 149, 237, 0.7);
            font-size: 14px;
            animation: star-twinkle 2s ease-in-out infinite;
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: -12px;
            right: 20px;
            color: rgba(147, 112, 219, 0.7);
            font-size: 14px;
            animation: star-twinkle 2s ease-in-out infinite 0.5s;
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #9370db;
            text-transform: uppercase;
        }

        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="starfield"></div>
        <div class="nebula-overlay"></div>
        <div class="cosmic-glow"></div>
        
        <!-- Corner constellations -->
        <div class="constellation-corner top-left"></div>
        <div class="constellation-corner top-right"></div>
        <div class="constellation-corner bottom-left"></div>
        <div class="constellation-corner bottom-right"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="space-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">ID: ${status}</div>
                <div class="user-status">CODE: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="space-decoration">
                    <div class="planet-ring">
                        <div class="planet-dot planet-dot-1"></div>
                        <div class="planet-dot planet-dot-2"></div>
                        <div class="planet-dot planet-dot-3"></div>
                        <div class="planet-dot planet-dot-4"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ocean Underwater Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Playfair+Display:wght@400;700&family=Bebas+Neue&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Merriweather', serif;
            background: linear-gradient(135deg, #006994 0%, #00526b 50%, #003d52 100%);
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, rgba(0, 105, 148, 0.95) 0%, rgba(0, 61, 82, 0.95) 100%);
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 40px rgba(64, 224, 208, 0.3),
                        inset 0 0 25px rgba(0, 119, 190, 0.2);
            border: 1px solid rgba(64, 224, 208, 0.4);
        }
        
        /* Wave animation background */
        .wave-background {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(ellipse at top, rgba(64, 224, 208, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at bottom, rgba(0, 119, 190, 0.1) 0%, transparent 50%);
            animation: wave-flow 8s ease-in-out infinite;
            z-index: 1;
        }
        
        @keyframes wave-flow {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-5px) scale(1.02); }
        }
        
        /* Bubbles animation */
        .bubbles {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
        }
        
        .bubble {
            position: absolute;
            bottom: -100px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(64, 224, 208, 0.2) 100%);
            border-radius: 50%;
            animation: bubble-rise 10s infinite linear;
        }
        
        @keyframes bubble-rise {
            0% {
                bottom: -100px;
                transform: translateX(0) scale(1);
                opacity: 0.8;
            }
            50% {
                transform: translateX(20px) scale(1.1);
                opacity: 0.6;
            }
            100% {
                bottom: 500px;
                transform: translateX(-20px) scale(0.8);
                opacity: 0;
            }
        }
        
        .bubble:nth-child(1) { width: 20px; height: 20px; left: 10%; animation-delay: 0s; animation-duration: 8s; }
        .bubble:nth-child(2) { width: 15px; height: 15px; left: 30%; animation-delay: 2s; animation-duration: 10s; }
        .bubble:nth-child(3) { width: 25px; height: 25px; left: 50%; animation-delay: 4s; animation-duration: 12s; }
        .bubble:nth-child(4) { width: 18px; height: 18px; left: 70%; animation-delay: 1s; animation-duration: 9s; }
        .bubble:nth-child(5) { width: 22px; height: 22px; left: 85%; animation-delay: 3s; animation-duration: 11s; }
        .bubble:nth-child(6) { width: 12px; height: 12px; left: 25%; animation-delay: 5s; animation-duration: 7s; }
        .bubble:nth-child(7) { width: 30px; height: 30px; left: 60%; animation-delay: 6s; animation-duration: 13s; }
        .bubble:nth-child(8) { width: 16px; height: 16px; left: 40%; animation-delay: 7s; animation-duration: 8s; }
        
        /* Seaweed corners */
        .seaweed-corner {
            position: absolute;
            width: 80px;
            height: 80px;
            z-index: 3;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 80 Q10 60 15 40 Q20 20 25 0 M25 80 Q25 60 30 40 Q35 20 40 0 M40 80 Q40 60 45 40 Q50 20 55 0' stroke='%2340e0d0' stroke-width='2' fill='none' opacity='0.6'/%3E%3C/svg%3E");
            animation: seaweed-sway 4s ease-in-out infinite;
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M70 80 Q70 60 65 40 Q60 20 55 0 M55 80 Q55 60 50 40 Q45 20 40 0 M40 80 Q40 60 35 40 Q30 20 25 0' stroke='%2340e0d0' stroke-width='2' fill='none' opacity='0.6'/%3E%3C/svg%3E");
            animation: seaweed-sway 4s ease-in-out infinite 1s;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 0 Q10 20 15 40 Q20 60 25 80 M25 0 Q25 20 30 40 Q35 60 40 80 M40 0 Q40 20 45 40 Q50 60 55 80' stroke='%2340e0d0' stroke-width='2' fill='none' opacity='0.6'/%3E%3C/svg%3E");
            animation: seaweed-sway 4s ease-in-out infinite 2s;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M70 0 Q70 20 65 40 Q60 60 55 80 M55 0 Q55 20 50 40 Q45 60 40 80 M40 0 Q40 20 35 40 Q30 60 25 80' stroke='%2340e0d0' stroke-width='2' fill='none' opacity='0.6'/%3E%3C/svg%3E");
            animation: seaweed-sway 4s ease-in-out infinite 3s;
        }
        
        @keyframes seaweed-sway {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(5px); }
        }
        
        .ocean-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 30px rgba(64, 224, 208, 0.2),
                        inset 0 0 30px rgba(0, 119, 190, 0.2);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background: linear-gradient(90deg, rgba(0, 105, 148, 0.95) 0%, rgba(0, 82, 107, 0.95) 50%, rgba(0, 105, 148, 0.95) 100%);
            border-bottom: 1px solid rgba(64, 224, 208, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            color: rgba(64, 224, 208, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: wave-motion 2s ease-in-out infinite;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            color: rgba(64, 224, 208, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: wave-motion 2s ease-in-out infinite 0.5s;
        }
        
        @keyframes wave-motion {
            0%, 100% { transform: translateY(-50%) rotate(0deg); }
            50% { transform: translateY(-50%) rotate(10deg); }
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #40e0d0;
            overflow: hidden;
            margin-right: 15px;
            background-color: #006994;
            position: relative;
            box-shadow: 0 0 15px rgba(64, 224, 208, 0.5);
        }
        
        .group-name {
            font-family: 'Bebas Neue', cursive;
            color: #ffffff;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 400;
            text-shadow: 0 0 10px rgba(64, 224, 208, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #40e0d0;
            font-size: 14px;
            font-family: 'Merriweather', serif;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #40e0d0;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 12px #40e0d0;
            animation: ocean-pulse 2s ease-in-out infinite;
        }
        
        @keyframes ocean-pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with ocean elements */
        .left-panel {
            width: 250px;
            border-right: 1px solid rgba(64, 224, 208, 0.3);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: linear-gradient(180deg, rgba(0, 105, 148, 0.6) 0%, rgba(0, 61, 82, 0.6) 100%);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(64, 224, 208, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(64, 224, 208, 0.5), transparent);
        }
        
        /* Ocean avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        .ocean-frame {
            position: absolute;
            width: 170px;
            height: 170px;
            top: -10px;
            left: -10px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Ccircle cx='85' cy='85' r='80' fill='none' stroke='%2340e0d0' stroke-width='2'/%3E%3Cpath d='M5 85 Q25 65 45 75 Q65 85 85 65 Q105 85 125 75 Q145 65 165 85' stroke='%2340e0d0' stroke-width='1' fill='none' opacity='0.6'/%3E%3Cpath d='M5 85 Q25 105 45 95 Q65 85 85 105 Q105 85 125 95 Q145 105 165 85' stroke='%2340e0d0' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
            z-index: 4;
            animation: ocean-rotate 15s linear infinite;
        }
        
        @keyframes ocean-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 3px solid #40e0d0;
            overflow: hidden;
            background-color: #006994;
            box-shadow: 0 0 20px rgba(64, 224, 208, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: hue-rotate(180deg) saturate(1.3) brightness(1.1);
        }
        
        .user-status {
            font-family: 'Merriweather', serif;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
        
        .status-box {
            padding: 8px 15px;
            border: 1px solid rgba(64, 224, 208, 0.5);
            background: linear-gradient(135deg, rgba(64, 224, 208, 0.1) 0%, rgba(0, 119, 190, 0.1) 100%);
            margin-top: 8px;
            font-family: 'Playfair Display', serif;
            font-size: 12px;
            color: #40e0d0;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        }
        
        .status-box::before {
            content: '';
            position: absolute;
            top: 50%;
            left: -20px;
            transform: translateY(-50%);
            font-size: 12px;
            animation: fish-swim 4s ease-in-out infinite;
        }
        
        @keyframes fish-swim {
            0%, 100% { left: -20px; opacity: 0; }
            50% { left: calc(100% + 20px); opacity: 1; }
        }
        
        /* Right panel with ocean effects */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-title {
            font-family: 'Playfair Display', serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(64, 224, 208, 0.6);
            text-align: center;
            position: relative;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            color: #40e0d0;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Playfair Display', serif;
            color: #40e0d0;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 700;
            text-shadow: 0 0 20px rgba(64, 224, 208, 0.8);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
        }
        
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(64, 224, 208, 0.7), transparent);
            animation: wave-flow 2s ease-in-out infinite;
        }
        
        .welcome-message {
            font-family: 'Merriweather', serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(64, 224, 208, 0.3);
            background: linear-gradient(135deg, rgba(64, 224, 208, 0.05) 0%, rgba(0, 119, 190, 0.05) 100%);
            position: relative;
            border-radius: 10px;
            font-style: italic;
        }
        
        /* Ocean decoration */
        .ocean-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .ocean-circle {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(64, 224, 208, 0.5);
            border-radius: 50%;
            animation: ocean-pulse-slow 4s ease-in-out infinite;
        }
        
        @keyframes ocean-pulse-slow {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        .ocean-circle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            border: 1px solid rgba(0, 119, 190, 0.5);
            border-radius: 50%;
            animation: ocean-pulse-slow 3s ease-in-out infinite reverse;
        }
        
        .ocean-dot {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: #40e0d0;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(64, 224, 208, 0.8);
        }
        
        .ocean-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .ocean-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .ocean-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .ocean-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(90deg, rgba(0, 105, 148, 0.95) 0%, rgba(0, 82, 107, 0.95) 50%, rgba(0, 105, 148, 0.95) 100%);
            border-top: 1px solid rgba(64, 224, 208, 0.5);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Merriweather', serif;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: -12px;
            left: 20px;
            color: rgba(64, 224, 208, 0.7);
            font-size: 14px;
            animation: wave-motion 2s ease-in-out infinite;
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: -12px;
            right: 20px;
            color: rgba(64, 224, 208, 0.7);
            font-size: 14px;
            animation: wave-motion 2s ease-in-out infinite 0.5s;
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #40e0d0;
        }

        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="wave-background"></div>
        <div class="bubbles">
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
        </div>
        <div class="ocean-glow"></div>
        
        <!-- Corner seaweed -->
        <div class="seaweed-corner top-left"></div>
        <div class="seaweed-corner top-right"></div>
        <div class="seaweed-corner bottom-left"></div>
        <div class="seaweed-corner bottom-right"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="ocean-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">TITLE: ${status}</div>
                <div class="user-status">SCROLL: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="ocean-decoration">
                    <div class="ocean-circle">
                        <div class="ocean-dot ocean-dot-1"></div>
                        <div class="ocean-dot ocean-dot-2"></div>
                        <div class="ocean-dot ocean-dot-3"></div>
                        <div class="ocean-dot ocean-dot-4"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}, {
  html: (group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steampunk Victorian Welcome Bot Template</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:wght@400;600&family=Special+Elite&display=swap');
        
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Crimson Text', serif;
            background: linear-gradient(135deg, #3d2914 0%, #5c4033 50%, #3d2914 100%);
            height: 100%;
            overflow: hidden;
        }
        
        .welcome-card {
            width: 800px;
            height: 400px;
            background: linear-gradient(180deg, rgba(61, 41, 20, 0.95) 0%, rgba(92, 64, 51, 0.95) 100%);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 40px rgba(205, 127, 50, 0.4),
                        inset 0 0 25px rgba(139, 69, 19, 0.3);
            border: 2px solid rgba(205, 127, 50, 0.6);
        }
        
        /* Brass texture overlay */
        .brass-texture {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E");
            opacity: 0.3;
            z-index: 1;
        }
        
        /* Gear pattern overlay */
        .gear-pattern {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 15 L35 20 L40 15 L40 20 L45 25 L50 20 L55 25 L50 30 L55 35 L50 40 L45 35 L40 40 L40 45 L35 40 L30 45 L25 40 L20 45 L20 40 L15 35 L10 40 L5 35 L10 30 L5 25 L10 20 L15 25 L20 20 L20 15 L25 20 Z' fill='none' stroke='%23cd7f32' stroke-width='1' opacity='0.3'/%3E%3Ccircle cx='30' cy='30' r='10' fill='none' stroke='%23cd7f32' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E");
            background-size: 60px 60px;
            opacity: 0.2;
            z-index: 1;
            animation: gear-rotate 30s linear infinite;
        }
        
        @keyframes gear-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        /* Corner gears */
        .corner-gear {
            position: absolute;
            width: 80px;
            height: 80px;
            z-index: 3;
        }
        
        .top-left {
            top: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M20 10 L25 15 L30 10 L35 15 L40 10 L45 15 L50 10 L50 15 L55 20 L60 15 L65 20 L60 25 L65 30 L60 35 L55 30 L50 35 L50 40 L45 35 L40 40 L35 35 L30 40 L25 35 L20 40 L20 35 L15 30 L10 35 L5 30 L10 25 L5 20 L10 15 L15 20 L20 15 Z' fill='none' stroke='%23cd7f32' stroke-width='2' opacity='0.7'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%23cd7f32' stroke-width='2' opacity='0.7'/%3E%3C/svg%3E");
            animation: gear-spin 8s linear infinite;
        }
        
        .top-right {
            top: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M60 10 L55 15 L50 10 L45 15 L40 10 L35 15 L30 10 L30 15 L25 20 L20 15 L15 20 L20 25 L15 30 L20 35 L25 30 L30 35 L30 40 L35 35 L40 40 L45 35 L50 40 L55 35 L60 40 L60 35 L65 30 L70 35 L75 30 L70 25 L75 20 L70 15 L65 20 L60 15 Z' fill='none' stroke='%238b4513' stroke-width='2' opacity='0.7'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%238b4513' stroke-width='2' opacity='0.7'/%3E%3C/svg%3E");
            animation: gear-spin-reverse 10s linear infinite;
        }
        
        .bottom-left {
            bottom: 0;
            left: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M20 70 L25 65 L30 70 L35 65 L40 70 L45 65 L50 70 L50 65 L55 60 L60 65 L65 60 L60 55 L65 50 L60 45 L55 50 L50 45 L50 40 L45 45 L40 40 L35 45 L30 40 L25 45 L20 40 L20 45 L15 50 L10 45 L5 50 L10 55 L5 60 L10 65 L15 60 L20 65 Z' fill='none' stroke='%23cd7f32' stroke-width='2' opacity='0.7'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%23cd7f32' stroke-width='2' opacity='0.7'/%3E%3C/svg%3E");
            animation: gear-spin 12s linear infinite;
        }
        
        .bottom-right {
            bottom: 0;
            right: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M60 70 L55 65 L50 70 L45 65 L40 70 L35 65 L30 70 L30 65 L25 60 L20 65 L15 60 L20 55 L15 50 L20 45 L25 50 L30 45 L30 40 L35 45 L40 40 L45 45 L50 40 L55 45 L60 40 L60 45 L65 50 L70 45 L75 50 L70 55 L75 60 L70 65 L65 60 L60 65 Z' fill='none' stroke='%238b4513' stroke-width='2' opacity='0.7'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%238b4513' stroke-width='2' opacity='0.7'/%3E%3C/svg%3E");
            animation: gear-spin-reverse 9s linear infinite;
        }
        
        @keyframes gear-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes gear-spin-reverse {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
        }
        
        .steampunk-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 30px rgba(205, 127, 50, 0.3),
                        inset 0 0 30px rgba(139, 69, 19, 0.3);
            z-index: 2;
            pointer-events: none;
        }
        
        /* Enhanced header */
        .header {
            position: relative;
            z-index: 3;
            height: 60px;
            background: linear-gradient(90deg, rgba(61, 41, 20, 0.95) 0%, rgba(139, 69, 19, 0.95) 50%, rgba(61, 41, 20, 0.95) 100%);
            border-bottom: 2px solid rgba(205, 127, 50, 0.6);
            display: flex;
            align-items: center;
            padding: 0 20px;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 30px;
            color: rgba(205, 127, 50, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: gear-wiggle 3s ease-in-out infinite;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 30px;
            color: rgba(139, 69, 19, 0.7);
            font-size: 16px;
            transform: translateY(-50%);
            animation: gear-wiggle 3s ease-in-out infinite 1.5s;
        }
        
        @keyframes gear-wiggle {
            0%, 100% { transform: translateY(-50%) rotate(0deg); }
            50% { transform: translateY(-50%) rotate(180deg); }
        }
        
        .group-avatar {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            border: 2px solid #cd7f32;
            overflow: hidden;
            margin-right: 15px;
            background-color: #3d2914;
            position: relative;
            box-shadow: 0 0 15px rgba(205, 127, 50, 0.5);
        }
        
        .group-name {
            font-family: 'Cinzel', serif;
            color: #ffffff;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
            text-shadow: 0 0 10px rgba(205, 127, 50, 0.5);
        }
        
        .status-indicator {
            margin-left: auto;
            color: #cd7f32;
            font-size: 14px;
            font-family: 'Special Elite', monospace;
            display: flex;
            align-items: center;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #cd7f32;
            border-radius: 50%;
            margin-right: 8px;
            box-shadow: 0 0 12px #cd7f32;
            animation: steam-pulse 2s ease-in-out infinite;
        }
        
        @keyframes steam-pulse {
            0%, 100% { box-shadow: 0 0 12px #cd7f32; }
            50% { box-shadow: 0 0 20px #cd7f32, 0 0 30px rgba(205, 127, 50, 0.5); }
        }
        
        .main-content {
            display: flex;
            height: calc(100% - 90px);
            position: relative;
            z-index: 3;
        }
        
        /* Left panel with steampunk elements */
        .left-panel {
            width: 250px;
            border-right: 2px solid rgba(205, 127, 50, 0.4);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: linear-gradient(180deg, rgba(61, 41, 20, 0.6) 0%, rgba(92, 64, 51, 0.6) 100%);
            position: relative;
            overflow: visible;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(205, 127, 50, 0.5), rgba(139, 69, 19, 0.5), transparent);
        }
        
        .left-panel::after {
            content: '';
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(139, 69, 19, 0.5), rgba(205, 127, 50, 0.5), transparent);
        }
        
        /* Steampunk avatar container */
        .avatar-container {
            position: relative;
            width: 150px;
            height: 150px;
            margin-bottom: 30px;
        }
        
        .victorian-frame {
            position: absolute;
            width: 170px;
            height: 170px;
            top: -10px;
            left: -10px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Crect x='10' y='10' width='150' height='150' fill='none' stroke='%23cd7f32' stroke-width='3'/%3E%3Crect x='5' y='5' width='160' height='160' fill='none' stroke='%238b4513' stroke-width='1' stroke-dasharray='5,5'/%3E%3Cpath d='M20 20 L150 20 M20 150 L150 150 M20 20 L20 150 M150 20 L150 150' stroke='%23cd7f32' stroke-width='2'/%3E%3C/svg%3E");
            z-index: 4;
        }
        
        .user-avatar {
            position: absolute;
            top: 0;
            left: 0;
            width: 150px;
            height: 150px;
            border-radius: 4px;
            border: 2px solid #cd7f32;
            overflow: hidden;
            background-color: #3d2914;
            box-shadow: 0 0 20px rgba(205, 127, 50, 0.5);
            z-index: 2;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: sepia(0.5) contrast(1.2) brightness(0.9);
        }
        
        .user-status {
            font-family: 'Special Elite', monospace;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .status-box {
            padding: 5px 15px;
            border: 1px solid rgba(139, 69, 19, 0.5);
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(139, 69, 19, 0.1) 100%);
            margin-top: 8px;
            font-family: 'Cinzel', serif;
            font-size: 12px;
            color: #cd7f32;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        
        .status-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(205, 127, 50, 0.2), transparent);
            animation: steam-scan 3s linear infinite;
        }
        
        @keyframes steam-scan {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        /* Right panel with steampunk effects */
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .welcome-title {
            font-family: 'Cinzel', serif;
            color: #ffffff;
            font-size: 38px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(205, 127, 50, 0.6);
            text-align: center;
            position: relative;
        }
        
        .welcome-title::before,
        .welcome-title::after {
            content: '';
            position: absolute;
            color: #cd7f32;
            font-size: 24px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .welcome-title::before {
            left: -40px;
        }
        
        .welcome-title::after {
            right: -40px;
        }
        
        .user-name {
            font-family: 'Cinzel', serif;
            color: #cd7f32;
            font-size: 42px;
            margin: 5px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 700;
            text-shadow: 0 0 20px rgba(205, 127, 50, 0.8);
            text-align: center;
            position: relative;
            max-width: 90%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
        }
        
        .user-name[data-length="long"] {
            font-size: 36px;
            letter-spacing: 2px;
        }
        
        .user-name[data-length="very-long"] {
            font-size: 28px;
            letter-spacing: 1px;
            line-height: 1.2;
        }
        
        .user-name[data-length="extra-long"] {
            font-size: 22px;
            letter-spacing: 0px;
            line-height: 1.3;
        }
        
        .user-name::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #cd7f32, #8b4513, transparent);
            animation: steam-flow 2s ease-in-out infinite;
        }
        
        @keyframes steam-flow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        
        .welcome-message {
            font-family: 'Crimson Text', serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 18px;
            text-align: center;
            line-height: 1.5;
            margin: 20px 0 0 0;
            max-width: 400px;
            padding: 15px;
            border: 1px solid rgba(205, 127, 50, 0.3);
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.05) 0%, rgba(139, 69, 19, 0.05) 100%);
            position: relative;
            font-style: italic;
        }
        
        /* Steampunk decoration */
        .steampunk-decoration {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
        }
        
        .gear-wheel {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2px solid rgba(205, 127, 50, 0.5);
            border-radius: 50%;
            animation: gear-rotate 8s linear infinite;
        }
        
        .gear-wheel::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            border: 1px solid rgba(139, 69, 19, 0.5);
            border-radius: 50%;
            animation: gear-rotate-reverse 6s linear infinite;
        }
        
        @keyframes gear-rotate-reverse {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        
        .gear-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #cd7f32;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(205, 127, 50, 0.8);
        }
        
        .gear-dot-1 { top: 0; left: 50%; transform: translateX(-50%); }
        .gear-dot-2 { top: 50%; right: 0; transform: translateY(-50%); }
        .gear-dot-3 { bottom: 0; left: 50%; transform: translateX(-50%); }
        .gear-dot-4 { top: 50%; left: 0; transform: translateY(-50%); }
        
        /* Enhanced footer */
        .footer {
            position: relative;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(90deg, rgba(61, 41, 20, 0.95) 0%, rgba(139, 69, 19, 0.95) 50%, rgba(61, 41, 20, 0.95) 100%);
            border-top: 2px solid rgba(205, 127, 50, 0.6);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 3;
            font-family: 'Special Elite', monospace;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: -12px;
            left: 20px;
            color: rgba(205, 127, 50, 0.7);
            font-size: 14px;
            animation: gear-wiggle 3s ease-in-out infinite;
        }
        
        .footer::after {
            content: '';
            position: absolute;
            top: -12px;
            right: 20px;
            color: rgba(139, 69, 19, 0.7);
            font-size: 14px;
            animation: gear-wiggle 3s ease-in-out infinite 1.5s;
        }
        
        .footer-status {
            margin-left: auto;
            margin-right: 25px;
            color: #cd7f32;
            text-transform: uppercase;
        }

        /* Script to adjust username font size */
        window.onload = function() {
            const username = document.getElementById('username');
            const welcomeTitle = document.getElementById('welcome-title');
            const usernameText = username.textContent;
            const usernameLength = usernameText.length;
            
            // Handle long usernames
            if (usernameLength > 10 && usernameLength <= 15) {
                username.setAttribute('data-length', 'long');
            } else if (usernameLength > 15 && usernameLength <= 20) {
                username.setAttribute('data-length', 'very-long');
                welcomeTitle.classList.add('has-long-name');
            } else if (usernameLength > 20) {
                username.setAttribute('data-length', 'extra-long');
                welcomeTitle.classList.add('has-long-name');
                
                // Add line breaks for very long names
                if (usernameLength > 25) {
                    const midpoint = Math.floor(usernameText.length / 2);
                    let breakpoint = usernameText.lastIndexOf('_', midpoint);
                    if (breakpoint === -1) breakpoint = midpoint;
                    
                    const firstPart = usernameText.substring(0, breakpoint);
                    const secondPart = usernameText.substring(breakpoint);
                    
                    username.innerHTML = firstPart + '<br>' + secondPart;
                }
            }
        };
    </style>
</head>
<body>
    <div class="welcome-card">
        <!-- Background elements -->
        <div class="brass-texture"></div>
        <div class="gear-pattern"></div>
        <div class="steampunk-glow"></div>
        
        <!-- Corner gears -->
        <div class="corner-gear top-left"></div>
        <div class="corner-gear top-right"></div>
        <div class="corner-gear bottom-left"></div>
        <div class="corner-gear bottom-right"></div>
        
        <div class="header">
            <div class="group-avatar">
                <img src="${group_avatar}" alt="Group Avatar">
            </div>
            <div class="group-name">${group_name}</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                ${status_dot}
            </div>
        </div>
        
        <div class="main-content">
            <div class="left-panel">
                <div class="avatar-container">
                    <div class="victorian-frame"></div>
                    <div class="user-avatar">
                        <img src="${avatar}" alt="User Avatar">
                    </div>
                </div>
                
                <div class="user-status">TITLE: ${status}</div>
                <div class="user-status">SERIAL: #${userid}</div>
                <div class="status-box">${usertype}</div>
            </div>
            
            <div class="right-panel">
                <h1 class="welcome-title" id="welcome-title">${title}</h1>
                <h2 class="user-name" id="username">${username}</h2>
                <p class="welcome-message">${message}</p>
                
                <div class="steampunk-decoration">
                    <div class="gear-wheel">
                        <div class="gear-dot gear-dot-1"></div>
                        <div class="gear-dot gear-dot-2"></div>
                        <div class="gear-dot gear-dot-3"></div>
                        <div class="gear-dot gear-dot-4"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <span>${foot_up}</span>
            <span class="footer-status">${foot_end}</span>
        </div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  group_avatar,
  group_name,
  status_dot,
  avatar,
  status,
  userid,
  usertype,
  title,
  username,
  message,
  foot_up,
  foot_end
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(group_avatar, group_name, status_dot, avatar, status, userid, usertype, title, username, message, foot_up, foot_end) || "Template tidak ditemukan";
};
export default getTemplate;