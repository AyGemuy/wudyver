const templates = [{
  html: ({
    name,
    message,
    avatar,
    media,
    replyName,
    replyMessage,
    replyMedia
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Bubble</title>
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
            background: transparent; 
        }
        .chat-box { display: flex; flex-direction: column; gap: 20px; }
        .chat-container { display: flex; align-items: flex-start; gap: 20px; }
        .chat-container img { 
            border-radius: 50%;  /* Make the avatar round */
            width: 50px;  /* Set small size */
            height: 50px;  /* Set small size */
            object-fit: cover;  /* Ensure the image maintains aspect ratio */
        }
        .chat-bubble { position: relative; background: white; color: black; padding: 28px; border-radius: 30px; max-width: 60%; font-size: 3vw; box-shadow: 0px 12px 24px rgba(0, 0, 0, 0.3); }
        .chat-bubble::before { content: ""; position: absolute; top: 28px; left: -20px; border-top: 16px solid transparent; border-bottom: 16px solid transparent; border-right: 20px solid white; }
        .message-name { font-weight: bold; color: orange; margin-bottom: 12px; font-size: 3.5vw; }
        .reply { font-size: 2.5vw; color: gray; font-weight: lighter; border-left: 4px solid orange; padding-left: 16px; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95%; }
        .reply-media img { border-radius: 10px; margin-top: 10px; }
        .media img { border-radius: 10px; margin-top: 12px; }
    </style>
</head>
<body>
    <div class="chat-box" id="chatBox"></div>

    <script>
        function isValid(value) {
            return value !== null && value !== undefined && value !== "null" && value.trim() !== "";
        }

        function renderChat(data) {
            var chatBox = document.getElementById("chatBox");

            var chatContainer = document.createElement("div");
            chatContainer.className = "chat-container";

            var avatarImg = document.createElement("img");
            avatarImg.src = data.avatar;
            chatContainer.appendChild(avatarImg);

            var chatBubble = document.createElement("div");
            chatBubble.className = "chat-bubble";

            var messageName = document.createElement("div");
            messageName.className = "message-name";
            messageName.innerText = data.name;
            chatBubble.appendChild(messageName);

            if (isValid(data.replyMessage) && isValid(data.replyName)) {
                var replyDiv = document.createElement("div");
                replyDiv.className = "reply";

                var replyBold = document.createElement("b");
                replyBold.innerText = data.replyName + ": ";
                replyDiv.appendChild(replyBold);

                var replyText = document.createTextNode(data.replyMessage);
                replyDiv.appendChild(replyText);

                if (isValid(data.replyMedia)) {
                    var replyMediaDiv = document.createElement("div");
                    replyMediaDiv.className = "reply-media";

                    var replyMediaImg = document.createElement("img");
                    replyMediaImg.src = data.replyMedia;
                    replyMediaDiv.appendChild(replyMediaImg);

                    replyDiv.appendChild(replyMediaDiv);
                }

                chatBubble.appendChild(replyDiv);
            }

            var messageContent = document.createElement("div");
            messageContent.className = "message-content";
            messageContent.innerText = data.message;
            chatBubble.appendChild(messageContent);

            if (isValid(data.media)) {
                var mediaDiv = document.createElement("div");
                mediaDiv.className = "media";

                var mediaImg = document.createElement("img");
                mediaImg.src = data.media;
                mediaDiv.appendChild(mediaImg);

                chatBubble.appendChild(mediaDiv);
            }

            chatContainer.appendChild(chatBubble);
            chatBox.appendChild(chatContainer);
        }

        var chatData = {
        name: "${name}",
        message: "${message}",
        avatar: "${avatar}",
        media: "${media}",
        replyName: "${replyName}",
        replyMessage: "${replyMessage}",
        replyMedia: "${replyMedia}"
    };

        renderChat(chatData);
    </script>
</body>
</html>`
}, {
  html: ({
    name,
    message,
    avatar,
    media,
    replyName,
    replyMessage,
    replyMedia
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Bubble HD</title>
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
            background: transparent; 
        }
        .chat-box { display: flex; flex-direction: column; gap: 40px; }
        .chat-container { display: flex; align-items: flex-start; gap: 20px; position: relative; }
        .chat-container img.avatar {
            width: 50px; /* Small size for the avatar */
            height: 50px;
            border-radius: 50%; /* Makes the avatar round */
            object-fit: cover; /* Ensures the image doesn't stretch */
        }
        .chat-bubble { 
            position: relative; 
            background: white; 
            color: black; 
            padding: 30px; 
            border-radius: 30px 30px 30px 30px; 
            max-width: 80%; 
            font-size: 32px; 
            box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.2); 
        }
        .chat-bubble::before {
            content: ""; 
            position: absolute; 
            top: 20px; 
            left: -20px; 
            width: 0; 
            height: 0; 
            border-top: 13px solid transparent; 
            border-bottom: 13px solid transparent; 
            border-right: 20px solid white; 
        }
        .message-name { font-weight: bold; color: orange; margin-bottom: 15px; font-size: 40px; }
        .reply { 
            font-size: 28px; 
            color: gray; 
            font-weight: lighter; 
            border-left: 5px solid; 
            padding-left: 15px; 
            margin-bottom: 15px; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            max-width: 95%; 
        }
        .reply-media img { border-radius: 10px; margin-top: 15px; }
        .media img { border-radius: 10px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="chat-box"></div>

    <script>
        function isValid(value) {
            return value && value !== "null";
        }

        function getRandomColor() {
            return '#' + Math.floor(Math.random()*16777215).toString(16);
        }

        function createChatBubble(data) {
            var chatBox = document.querySelector(".chat-box");
            var chatContainer = document.createElement("div");
            chatContainer.className = "chat-container";

            if (isValid(data.avatar)) {
                var avatarImg = document.createElement("img");
                avatarImg.src = data.avatar;
                avatarImg.className = "avatar";  // Add the avatar class for styling
                chatContainer.appendChild(avatarImg);
            }

            var chatBubble = document.createElement("div");
            chatBubble.className = "chat-bubble";

            if (isValid(data.name)) {
                var messageName = document.createElement("div");
                messageName.className = "message-name";
                messageName.textContent = data.name;
                chatBubble.appendChild(messageName);
            }

            if (isValid(data.replyMessage) && isValid(data.replyName)) {
                var reply = document.createElement("div");
                reply.className = "reply";
                reply.style.borderLeftColor = getRandomColor();

                var replyContent = document.createElement("div");
                replyContent.innerHTML = "<b>" + data.replyName + ":</b> " + data.replyMessage;
                reply.appendChild(replyContent);

                if (isValid(data.replyMedia)) {
                    var replyMediaDiv = document.createElement("div");
                    replyMediaDiv.className = "reply-media";
                    var replyMediaImg = document.createElement("img");
                    replyMediaImg.src = data.replyMedia;
                    replyMediaDiv.appendChild(replyMediaImg);
                    reply.appendChild(replyMediaDiv);
                }

                chatBubble.appendChild(reply);
            }

            if (isValid(data.message)) {
                var messageContent = document.createElement("div");
                messageContent.className = "message-content";
                messageContent.textContent = data.message;
                chatBubble.appendChild(messageContent);
            }

            if (isValid(data.media)) {
                var mediaDiv = document.createElement("div");
                mediaDiv.className = "media";
                var mediaImg = document.createElement("img");
                mediaImg.src = data.media;
                mediaDiv.appendChild(mediaImg);
                chatBubble.appendChild(mediaDiv);
            }

            chatContainer.appendChild(chatBubble);
            chatBox.appendChild(chatContainer);
        }

        var chatData = {
            name: "${name}",
            message: "${message}",
            avatar: "${avatar}",
            media: "${media}",
            replyName: "${replyName}",
            replyMessage: "${replyMessage}",
            replyMedia: "${replyMedia}"
        };

        createChatBubble(chatData);
    </script>
</body>
</html>`
}, {
  html: ({
    name,
    message,
    avatar,
    media,
    replyName,
    replyMessage,
    replyMedia
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Bubble Auto Size</title>
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
            background: transparent; 
        }
        .chat-box {
            display: inline-flex;
            justify-content: center;
            align-items: center;
        }
        .chat-container {
            display: flex;
            align-items: flex-start;
            max-width: 100%;
            padding: 20px;
        }
        .chat-container img.avatar {
            width: 50px;  /* Adjust the size as needed */
            height: 50px; /* Ensure it is square */
            border-radius: 50%; /* Make it round */
            object-fit: cover;
            margin-right: 15px; /* Reduced margin */
            box-shadow: none; /* Remove box shadow for avatars */
        }
        .chat-bubble {
            position: relative;
            background-color: #fff;
            padding: 30px;
            border-radius: 20px;
            max-width: 800px;
            word-wrap: break-word;
            box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
            font-size: 24px;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .chat-bubble::before {
            content: "";
            position: absolute;
            top: 20px;
            left: -15px;
            width: 0;
            height: 0;
            border-top: 10px solid transparent;
            border-right: 15px solid #fff;
            border-bottom: 10px solid transparent;
        }
        .message-name {
            font-size: 28px;
            font-weight: bold;
            color: orange;
            margin-bottom: 15px;
        }
        .message-content {
            font-size: 24px;
            color: #000;
            word-wrap: break-word;
        }
        .reply {
            display: flex;
            align-items: flex-start;
            background: #f0f0f0;
            padding: 20px;
            border-radius: 15px;
            font-size: 20px;
            margin-bottom: 15px;
            position: relative;
            flex-direction: column;
        }
        .reply-bar {
            width: 8px;
            border-radius: 4px;
            background-color: var(--reply-color, #777);
            position: absolute;
            top: 10px;
            bottom: 10px;
            left: 0;
        }
        .reply-content {
            flex: 1;
            margin-left: 16px;
        }
        .reply b {
            color: #555;
        }
        .reply-media img, .media img {
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="chat-box"></div>

<script>
    function isValid(value) {
        return value && value !== "null";
    }

    function createChatBubble(data) {
        var chatBox = document.querySelector(".chat-box");
        var chatContainer = document.createElement("div");
        chatContainer.className = "chat-container";

        if (isValid(data.avatar)) {
            let avatarImg = document.createElement("img");
            avatarImg.src = data.avatar;
            avatarImg.className = "avatar";  // Add the avatar class here
            chatContainer.appendChild(avatarImg);
        }

        var chatBubble = document.createElement("div");
        chatBubble.className = "chat-bubble";

        if (isValid(data.name)) {
            let nameDiv = document.createElement("div");
            nameDiv.className = "message-name";
            nameDiv.textContent = data.name;
            chatBubble.appendChild(nameDiv);
        }

        if (isValid(data.replyName) && isValid(data.replyMessage)) {
            var reply = document.createElement("div");
            reply.className = "reply";

            var replyBar = document.createElement("div");
            replyBar.className = "reply-bar";
            replyBar.style.backgroundColor = "hsl(" + (Math.random() * 360) + ", 70%, 50%)";
            reply.appendChild(replyBar);

            var replyContent = document.createElement("div");
            replyContent.className = "reply-content";
            replyContent.innerHTML = "<b>" + data.replyName + ":</b> " + (data.replyMessage.length > 200 ? data.replyMessage.substring(0, 200) + "..." : data.replyMessage);
            reply.appendChild(replyContent);

            if (isValid(data.replyMedia)) {
                let replyMediaDiv = document.createElement("div");
                replyMediaDiv.className = "reply-media";
                let replyImg = document.createElement("img");
                replyImg.src = data.replyMedia;
                replyMediaDiv.appendChild(replyImg);
                reply.appendChild(replyMediaDiv);
            }

            chatBubble.appendChild(reply);
        }

        if (isValid(data.message)) {
            let messageDiv = document.createElement("div");
            messageDiv.className = "message-content";
            messageDiv.textContent = data.message;
            chatBubble.appendChild(messageDiv);
        }

        if (isValid(data.media)) {
            let mediaDiv = document.createElement("div");
            mediaDiv.className = "media";
            let mediaImg = document.createElement("img");
            mediaImg.src = data.media;
            mediaDiv.appendChild(mediaImg);
            chatBubble.appendChild(mediaDiv);
        }

        chatContainer.appendChild(chatBubble);
        chatBox.appendChild(chatContainer);

        // Menyesuaikan ukuran body berdasarkan konten
        document.body.style.width = chatContainer.offsetWidth + "px";
        document.body.style.height = chatContainer.offsetHeight + "px";
    }

    var chatData = {
        name: "${name}",
        message: "${message}",
        avatar: "${avatar}",
        media: "${media}",
        replyName: "${replyName}",
        replyMessage: "${replyMessage}",
        replyMedia: "${replyMedia}"
    };

    createChatBubble(chatData);
</script>

</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  name,
  message,
  avatar,
  media,
  replyName,
  replyMessage,
  replyMedia
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    name: name,
    message: message,
    avatar: avatar,
    media: media,
    replyName: replyName,
    replyMessage: replyMessage,
    replyMedia: replyMedia
  }) || "Template tidak ditemukan";
};
export default getTemplate;