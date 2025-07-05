const templates = [{
  html: ({
    theme,
    flagId,
    profileUrl,
    gradient,
    pattern
  }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flag & Profile</title>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const flag = document.querySelector('.flag');
            const profile = document.querySelector('.profile');
            
            const config = {
                theme: "${theme}", 
                flagId: "${flagId}", 
                profileUrl: "${profileUrl}", 
                gradient: "${gradient}", 
                pattern: "${pattern}"
            };
            
            function applyTheme() {
                if (config.theme === "flag") {
                    flag.style.background = "url('https://flagcdn.com/w1280/" + config.flagId + ".png') no-repeat center/cover";
                } else if (config.theme === "gradient") {
                    const gradientWithHash = config.gradient.split(',').map(function(color) {
                        return color.trim().startsWith('#') ? color : "#" + color;
                    }).join(', ');
                    flag.style.background = "linear-gradient(" + gradientWithHash + ")";
                } else if (config.theme === "pattern") {
                    flag.style.background = "url('" + config.pattern + "') repeat";
                } else if (config.theme === "nature") {
                    flag.style.background = "url('https://source.unsplash.com/1280x1280/?nature') no-repeat center/cover";
                }
                profile.style.background = "url('" + config.profileUrl + "') no-repeat center/cover";
            }
            
            applyTheme();
        });
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f4f4f4;
        }
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
        }
        .flag {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            position: absolute;
            z-index: 0;
        }
        .profile {
            width: 90%;
            height: 90%;
            border-radius: 50%;
            position: absolute;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="flag"></div>
        <div class="profile"></div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  theme,
  flagId,
  profileUrl,
  gradient,
  pattern
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    theme: theme,
    flagId: flagId,
    profileUrl: profileUrl,
    gradient: gradient,
    pattern: pattern
  }) || "Template tidak ditemukan";
};
export default getTemplate;