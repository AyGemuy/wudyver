"use client";
import {
  useEffect,
  useCallback
} from "react";
import DisableDevtool from "disable-devtool";

const DevtoolDetector = () => {
  const freezeWebPage = useCallback(() => {
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "none";
      document.body.style.overflow = "hidden";

      const existingOverlay = document.getElementById("devtool-freeze-overlay");
      if (existingOverlay) existingOverlay.remove();

      const overlay = document.createElement("div");
      overlay.id = "devtool-freeze-overlay";

      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 5, 15, 0.85)",
        backgroundImage: `
          radial-gradient(circle at 15% 50%, rgba(18, 44, 113, 0.5), transparent 30%),
          radial-gradient(circle at 85% 30%, rgba(35, 0, 90, 0.4), transparent 30%),
          linear-gradient(to right, rgba(15, 10, 60, 0.3), rgba(40, 10, 80, 0.2))
        `,
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
        color: "white",
        zIndex: "99999",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Segoe UI', 'Roboto Mono', monospace",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden"
      });

      const glassContainer = document.createElement("div");
      Object.assign(glassContainer.style, {
        background: "rgba(10, 20, 50, 0.3)",
        backdropFilter: "blur(16px) saturate(200%)",
        WebkitBackdropFilter: "blur(16px) saturate(200%)",
        borderRadius: "20px",
        border: "1px solid rgba(100, 120, 255, 0.3)",
        boxShadow: `
          0 0 60px rgba(0, 50, 255, 0.2),
          inset 0 0 20px rgba(100, 150, 255, 0.15),
          inset 0 0 10px rgba(255, 255, 255, 0.1)
        `,
        padding: "40px",
        maxWidth: "800px",
        width: "90%",
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      });

      const topGlow = document.createElement("div");
      Object.assign(topGlow.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "2px",
        background: "linear-gradient(90deg, rgba(0, 100, 255, 0), rgba(0, 180, 255, 0.8), rgba(0, 100, 255, 0))",
        filter: "blur(2px)",
        animation: "scanline 3s linear infinite"
      });
      glassContainer.appendChild(topGlow);

      const header = document.createElement("div");
      header.style.marginBottom = "30px";

      const icon = document.createElement("div");
      icon.innerHTML = `
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
                stroke="rgba(0, 180, 255, 0.9)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      icon.style.marginBottom = "15px";
      icon.style.filter = "drop-shadow(0 0 10px rgba(0, 180, 255, 0.7))";

      const title = document.createElement("h1");
      title.textContent = "SYSTEM SECURITY ALERT";
      Object.assign(title.style, {
        fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
        fontWeight: "800",
        background: "linear-gradient(to right, #4facfe, #00f2fe)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        margin: "0 0 10px 0",
        textShadow: "0 0 15px rgba(0, 150, 255, 0.5)",
        letterSpacing: "1px"
      });

      header.appendChild(icon);
      header.appendChild(title);
      glassContainer.appendChild(header);

      const messageContainer = document.createElement("div");
      Object.assign(messageContainer.style, {
        minHeight: "200px",
        fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
        lineHeight: "1.6",
        textAlign: "left",
        padding: "20px",
        borderRadius: "10px",
        background: "rgba(0, 10, 30, 0.4)",
        border: "1px solid rgba(50, 100, 200, 0.2)",
        marginBottom: "30px",
        position: "relative",
        overflow: "hidden"
      });

      const scanline = document.createElement("div");
      Object.assign(scanline.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "2px",
        background: "linear-gradient(90deg, rgba(0, 200, 255, 0), rgba(0, 200, 255, 0.6), rgba(0, 200, 255, 0))",
        filter: "blur(1px)",
        animation: "scanline 5s linear infinite",
        opacity: "0.7"
      });
      messageContainer.appendChild(scanline);

      const messageText = document.createElement("div");
      messageText.id = "typewriter-text";
      messageText.style.fontFamily = "'Roboto Mono', monospace";
      messageText.style.whiteSpace = "pre-wrap";
      messageText.style.wordBreak = "break-word";
      messageContainer.appendChild(messageText);
      glassContainer.appendChild(messageContainer);

      const footer = document.createElement("div");
      footer.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
          <div style="display: flex; align-items: center;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff3b30; margin-right: 8px;"></span>
            <span>SECURITY BREACH</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ffcc00; margin-right: 8px;"></span>
            <span>CONNECTION TERMINATED</span>
          </div>
        </div>
      `;
      footer.style.fontSize = "0.9rem";
      footer.style.opacity = "0.8";
      glassContainer.appendChild(footer);

      overlay.appendChild(glassContainer);
      document.body.appendChild(overlay);

      const styleElement = document.createElement("style");
      styleElement.textContent = `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(calc(100% + 20px)); }
        }
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 24%, 55% { opacity: 0.5; }
        }
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        #typewriter-text::after {
          content: "▋";
          animation: blink 1s steps(1) infinite;
          color: #00f2fe;
          font-weight: bold;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `;
      document.head.appendChild(styleElement);

      const audioPlaylist = [
        "https://www.myinstants.com/media/sounds/oh-my-god-bro-oh-hell-nah-man.mp3",
        "https://www.myinstants.com/media/sounds/oh-ma-gaud-vine.mp3",
        "https://www.myinstants.com/media/sounds/wait-wait-wait-what-the-hell-from-lukas.mp3"
      ];

      let currentAudioIndex = 0;

      function playNextAudio() {
        if (currentAudioIndex < audioPlaylist.length) {
          const audio = new Audio(audioPlaylist[currentAudioIndex]);
          audio.volume = 0.7;
          audio.onended = () => {
            currentAudioIndex++;
            playNextAudio();
          };
          audio.play().catch(e => {
            console.log(`Autoplay for audio ${currentAudioIndex + 1} prevented: `, e);
            currentAudioIndex++;
            playNextAudio();
          });
        }
      }

      playNextAudio();

      const message = "!!! SYSTEM ALERT !!!\n\nAKSES TIDAK SAH: Developer Tools Terdeteksi.\n\nMemulai protokol keamanan: KONEKSI DIPUTUS.\n\nHarap nonaktifkan Developer Tools untuk melanjutkan.\n\nKegagalan untuk mematuhi dapat mengakibatkan pembatasan lebih lanjut.";
      const lines = message.split("\n");
      let i = 0;
      let line = 0;
      const typeSpeed = 40;
      const lineDelay = 500;
      const restartDelay = 3000; // Jeda sebelum mengulang

      function typeWriter() {
        if (line < lines.length) {
          if (i <= lines[line].length) {
            let currentLineText = lines[line].substring(0, i);
            messageText.innerHTML = lines.slice(0, line).join("<br>") +
              (line > 0 ? "<br>" : "") +
              currentLineText;
            i++;
            setTimeout(typeWriter, typeSpeed);
          } else {
            i = 0;
            line++;
            setTimeout(typeWriter, lineDelay);
          }
        } else {
          // Setelah semua baris selesai, atur ulang dan mulai lagi
          setTimeout(() => {
            i = 0;
            line = 0;
            messageText.innerHTML = "";
            typeWriter();
          }, restartDelay);
        }
      }

      typeWriter();

      if (typeof console !== "undefined") {
        console.clear();
        console.log("%c🔑🔐%c AKSES DITOLAK %c🔐🔑",
          "font-size: 25px; color: #00f2fe;",
          "font-size: 25px; font-weight: bold; color: #ff3b30; text-shadow: 0 0 5px rgba(255, 59, 48, 0.5);",
          "font-size: 25px; color: #00f2fe;");
        console.warn("%c⚠️ DEVELOPER TOOLS TERDETEKSI! KONEKSI DIPUTUS. ⚠️",
          "color: #ffcc00; font-weight: bold; font-size: 14px;");
        console.info("%cHarap matikan DevTools untuk melanjutkan. 🔌",
          "color: #4facfe; font-style: italic; font-size: 14px;");
      }

      debugger;
    }
  }, []);

  useEffect(() => {
    DisableDevtool({
      ondevtoolopen: freezeWebPage
    });

    const checkWindowSize = () => {
      const threshold = 160;
      if (typeof window !== "undefined" &&
        (window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold)) {
        freezeWebPage();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkWindowSize);
      checkWindowSize();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", checkWindowSize);
      }
      const overlay = document.getElementById("devtool-freeze-overlay");
      const styleElement = document.querySelector("style");
      if (overlay) overlay.remove();
      if (styleElement) styleElement.remove();
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    };
  }, [freezeWebPage]);

  return null;
};

export default DevtoolDetector;