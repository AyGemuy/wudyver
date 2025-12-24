const templates = [{
  html: ({
    username,
    pesan,
    ppUrl
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Message</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }
        canvas {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <canvas id="messageCanvas" width="900" height="200"></canvas>

    <script>
        const canvas = document.getElementById('messageCanvas');
        const ctx = canvas.getContext('2d');
        
        const username = "${username}";
        const pesan = "${pesan}";
        const ppUrl = "${ppUrl}";

        function getCurrentTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            return hours + ':' + minutes + ':' + seconds;
        }

        function loadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Gagal memuat gambar'));
                img.src = url;
            });
        }

        async function drawMessage() {
            try {
                const avatar = await loadImage(ppUrl);
                const waktu = getCurrentTime();

                ctx.fillStyle = '#2f3136';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.save();
                ctx.beginPath();
                ctx.arc(60, 60, 40, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 20, 20, 80, 80);
                ctx.restore();

                ctx.font = 'bold 22px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(username, 120, 55);

                const usernameWidth = ctx.measureText(username).width;

                ctx.font = '12px Arial';
                ctx.fillStyle = '#72767d';
                ctx.fillText('Today at ' + waktu + ' WIB', 120 + usernameWidth + 10, 55);

                ctx.font = '20px Arial';
                ctx.fillStyle = '#dcddde';
                ctx.fillText(pesan, 120, 85);

            } catch (error) {
                console.error('Error:', error.message);
            }
        }

        drawMessage();
    </script>
</body>
</html>`
}, {
  html: ({
    username,
    pesan,
    ppUrl
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twitter Style Canvas</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        canvas {
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(29, 155, 240, 0.2);
        }
    </style>
</head>
<body>
    <canvas id="messageCanvas" width="600" height="300"></canvas>

    <script>
        const canvas = document.getElementById('messageCanvas');
        const ctx = canvas.getContext('2d');
        
        const username = "${username}";
        const displayName = "${username}";
        const pesan = "${pesan}";
        const ppUrl = "${ppUrl}";

        function getCurrentTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            return hours + ':' + minutes;
        }

        function getCurrentDate() {
            const now = new Date();
            const options = { month: 'short', day: 'numeric' };
            return now.toLocaleDateString('en-US', options);
        }

        function loadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Gagal memuat gambar'));
                img.src = url;
            });
        }

        async function drawMessage() {
            try {
                const avatar = await loadImage(ppUrl);
                const waktu = getCurrentTime();
                const tanggal = getCurrentDate();

                // Background Twitter dark mode
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Header dengan padding
                const padding = 20;

                // Avatar bulat
                ctx.save();
                ctx.beginPath();
                ctx.arc(50, 50, 25, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 25, 25, 50, 50);
                ctx.restore();

                // Nama display (bold)
                ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(displayName, 90, 45);

                // Username dan waktu
                ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.fillStyle = '#71767b';
                ctx.fillText('@' + username + ' · ' + waktu + ' · ' + tanggal, 90, 65);

                // Pesan/tweet
                ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.fillStyle = '#ffffff';
                
                // Wrap text untuk pesan panjang
                const maxWidth = canvas.width - 90 - padding;
                const lineHeight = 24;
                const words = pesan.split(' ');
                let line = '';
                let y = 100;

                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    if (testWidth > maxWidth && i > 0) {
                        ctx.fillText(line, 90, y);
                        line = words[i] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, 90, y);

                // Engagement metrics (likes, retweets)
                const metricsY = y + 40;
                ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI"';
                ctx.fillStyle = '#71767b';
                
                // Format angka dengan K/M
                function formatCount(num) {
                    if (num >= 1000000) {
                        return (num / 1000000).toFixed(1) + 'M';
                    } else if (num >= 1000) {
                        return (num / 1000).toFixed(1) + 'K';
                    }
                    return num.toString();
                }

                ctx.fillText('1.2K Replies · 5.8K Retweets · ' + formatCount(45200) + ' Likes', 90, metricsY);

                // Twitter logo kecil di kanan atas
                ctx.fillStyle = '#1d9bf0';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('𝕏', canvas.width - 30, 35);

            } catch (error) {
                console.error('Error:', error.message);
                
                // Fallback jika gambar gagal dimuat
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText('Error loading image', 50, 50);
            }
        }

        drawMessage();
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  username,
  pesan,
  ppUrl
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    username: username,
    pesan: pesan,
    ppUrl: ppUrl
  }) || "Template tidak ditemukan";
};
export default getTemplate;