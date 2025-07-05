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
            min-height: 100vh; /* Set minimum height to 100% of viewport height */
            width: 100vw; /* Set width to 100% of viewport width */
            background: transparent;
            overflow: auto; /* Allow scrolling if content overflows */
        }
        .chat-box {
            display: flex;
            flex-direction: column;
            gap: 2vh; /* Use viewport height for gap */
            width: 90vw; /* Occupy 90% of viewport width */
            max-width: 800px; /* Optional: Set a max-width for larger screens */
            padding: 2vh 0; /* Add some vertical padding */
        }
        .chat-container {
            display: flex;
            align-items: flex-start;
            gap: 2vw; /* Use viewport width for gap */
        }
        .chat-container img {
            border-radius: 50%;
            width: 8vw; /* Scale avatar with viewport width */
            height: 8vw; /* Keep avatar proportional */
            max-width: 50px; /* Set a max-width for the avatar */
            max-height: 50px; /* Set a max-height for the avatar */
            object-fit: cover;
            flex-shrink: 0; /* Prevent avatar from shrinking */
        }
        .chat-bubble {
            position: relative;
            background: white;
            color: black;
            padding: 3vw; /* Scale padding with viewport width */
            border-radius: 30px;
            max-width: 70%; /* Allow chat bubble to take more width */
            font-size: 3.5vw; /* Scale font size with viewport width */
            box-shadow: 0px 12px 24px rgba(0, 0, 0, 0.3);
            word-wrap: break-word; /* Ensure long words wrap */
        }
        .chat-bubble::before {
            content: "";
            position: absolute;
            top: 2.5vw; /* Adjust top position based on viewport width */
            left: -2.5vw; /* Adjust left position based on viewport width */
            border-top: 2vw solid transparent; /* Scale border with viewport width */
            border-bottom: 2vw solid transparent; /* Scale border with viewport width */
            border-right: 2.5vw solid white; /* Scale border with viewport width */
        }
        .message-name {
            font-weight: bold;
            color: orange;
            margin-bottom: 1.5vw; /* Scale margin with viewport width */
            font-size: 4vw; /* Scale font size with viewport width */
        }
        .reply {
            font-size: 3vw; /* Scale font size with viewport width */
            color: gray;
            font-weight: lighter;
            border-left: 0.5vw solid orange; /* Scale border with viewport width */
            padding-left: 2vw; /* Scale padding with viewport width */
            margin-bottom: 1.5vw; /* Scale margin with viewport width */
            white-space: normal; /* Allow reply text to wrap */
            overflow: visible; /* Ensure all content is visible */
            text-overflow: unset; /* Prevent text-overflow ellipsis from cutting off */
            max-width: 100%; /* Allow reply to take full width of bubble */
        }
        .reply-media img,
        .media img {
            border-radius: 10px;
            margin-top: 1.5vw; /* Scale margin with viewport width */
            max-width: 100%; /* Ensure media fits within the bubble */
            height: auto; /* Maintain aspect ratio */
        }
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
    <title>Chat Bubble HD Responsive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: flex-start; /* Align items to the start for chat flow */
            min-height: 100vh; /* Full viewport height */
            width: 100vw; /* Full viewport width */
            background: transparent;
            overflow-y: auto; /* Allow vertical scrolling */
            padding: 2vh 0; /* Add some vertical padding to the body */
        }
        .chat-box {
            display: flex;
            flex-direction: column;
            gap: 2.5vh; /* Responsive gap between chat containers */
            width: 90vw; /* Occupy 90% of viewport width */
            max-width: 800px; /* Optional: Set a max-width for larger screens */
            align-items: flex-start; /* Ensure chat containers align to the start */
        }
        .chat-container {
            display: flex;
            align-items: flex-start;
            gap: 2vw; /* Responsive gap between avatar and bubble */
            width: 100%; /* Ensure container takes full width of chat-box */
        }
        .chat-container img.avatar {
            width: 8vw; /* Scale avatar with viewport width */
            height: 8vw; /* Keep avatar proportional */
            max-width: 50px; /* Max size for avatar */
            max-height: 50px; /* Max size for avatar */
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0; /* Prevent avatar from shrinking */
        }
        .chat-bubble {
            position: relative;
            background: white;
            color: black;
            padding: 3vw; /* Responsive padding */
            border-radius: 30px;
            max-width: 75%; /* Allow chat bubble to take more width */
            font-size: 3.5vw; /* Responsive font size */
            box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.2);
            word-wrap: break-word; /* Ensure long words wrap */
        }
        .chat-bubble::before {
            content: "";
            position: absolute;
            top: 2.5vw; /* Responsive top position for the tail */
            left: -2.5vw; /* Responsive left position for the tail */
            width: 0;
            height: 0;
            border-top: 2vw solid transparent; /* Responsive border size */
            border-bottom: 2vw solid transparent; /* Responsive border size */
            border-right: 2.5vw solid white; /* Responsive border size */
        }
        .message-name {
            font-weight: bold;
            color: orange;
            margin-bottom: 1.5vw; /* Responsive margin */
            font-size: 4vw; /* Responsive font size */
        }
        .reply {
            font-size: 3vw; /* Responsive font size */
            color: gray;
            font-weight: lighter;
            border-left: 0.5vw solid; /* Responsive border thickness */
            padding-left: 2vw; /* Responsive padding */
            margin-bottom: 1.5vw; /* Responsive margin */
            white-space: normal; /* Allow reply text to wrap */
            overflow: visible; /* Ensure all content is visible */
            text-overflow: unset; /* Prevent ellipsis from cutting off text */
            max-width: 100%; /* Allow reply to take full width of bubble */
        }
        .reply-media img,
        .media img {
            border-radius: 10px;
            margin-top: 1.5vw; /* Responsive margin */
            max-width: 100%; /* Ensure media fits within the bubble */
            height: auto; /* Maintain aspect ratio */
            display: block; /* Ensures images are on their own line */
        }
    </style>
</head>
<body>
    <div class="chat-box"></div>

    <script>
        function isValid(value) {
            return value !== null && value !== undefined && value !== "null" && value.trim() !== "";
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
                avatarImg.className = "avatar";
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
    <title>Chat Bubble Auto Size (Responsive)</title>
    <style>
        /* Global reset for consistent styling */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Body styling for full-screen layout */
        body {
            display: flex;
            justify-content: center; /* Center the chat box horizontally */
            align-items: flex-start; /* Align content to the top (typical for chat) */
            min-height: 100vh; /* Ensure body takes at least full viewport height */
            width: 100vw; /* Ensure body takes full viewport width */
            background: transparent;
            overflow-y: auto; /* Allow vertical scrolling if content exceeds screen height */
            padding: 2vh 0; /* Add some vertical padding to the overall chat area */
        }

        /* Container for all chat messages */
        .chat-box {
            display: flex;
            flex-direction: column; /* Stack chat messages vertically */
            gap: 2.5vh; /* Responsive gap between individual chat containers */
            width: 90vw; /* Occupy 90% of the viewport width */
            max-width: 800px; /* Optional: Set a max-width for very large screens for readability */
            align-items: flex-start; /* Ensure chat containers are aligned to the left */
        }

        /* Individual chat message container (avatar + bubble) */
        .chat-container {
            display: flex;
            align-items: flex-start; /* Align avatar and bubble to the top */
            gap: 2vw; /* Responsive gap between avatar and chat bubble */
            width: 100%; /* Ensure container takes full width of chat-box */
        }

        /* Avatar styling */
        .chat-container img.avatar {
            width: 8vw; /* Responsive width based on viewport width */
            height: 8vw; /* Responsive height, ensuring it remains square */
            max-width: 50px; /* Maximum size for the avatar */
            max-height: 50px; /* Maximum size for the avatar */
            border-radius: 50%; /* Make the avatar perfectly round */
            object-fit: cover; /* Ensure image covers the area without distortion */
            flex-shrink: 0; /* Prevent the avatar from shrinking on smaller screens */
            box-shadow: none; /* Keep avatar clean, no box shadow */
        }

        /* Main chat bubble styling */
        .chat-bubble {
            position: relative;
            background-color: #fff;
            padding: 3vw; /* Responsive padding inside the bubble */
            border-radius: 20px;
            max-width: 75%; /* Allow the bubble to take more width relative to its container */
            word-wrap: break-word; /* Ensure long words wrap to the next line */
            box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
            font-size: 3.5vw; /* Responsive font size based on viewport width */
            line-height: 1.4; /* Standard line height for readability */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Speech bubble tail (pseudo-element) */
        .chat-bubble::before {
            content: "";
            position: absolute;
            top: 2.5vw; /* Responsive top position for the tail */
            left: -2.5vw; /* Responsive left position for the tail */
            width: 0;
            height: 0;
            border-top: 2vw solid transparent; /* Responsive border size */
            border-right: 2.5vw solid #fff; /* Responsive border size */
            border-bottom: 2vw solid transparent; /* Responsive border size */
        }

        /* Sender name styling */
        .message-name {
            font-size: 4vw; /* Responsive font size for the name */
            font-weight: bold;
            color: orange;
            margin-bottom: 1.5vw; /* Responsive margin below the name */
        }

        /* Main message content styling */
        .message-content {
            font-size: 3.5vw; /* Responsive font size for the message content */
            color: #000;
            word-wrap: break-word; /* Ensure content wraps */
        }

        /* Reply message container styling */
        .reply {
            display: flex;
            align-items: flex-start; /* Align reply content to the top */
            background: #f0f0f0;
            padding: 2.5vw; /* Responsive padding inside the reply box */
            border-radius: 15px;
            font-size: 3vw; /* Responsive font size for reply text */
            margin-bottom: 1.5vw; /* Responsive margin below the reply box */
            position: relative;
            flex-direction: column; /* Stack reply content vertically */
            word-wrap: break-word; /* Ensure reply content wraps */
            white-space: normal; /* Allow text to wrap naturally */
            overflow: visible; /* Ensure all content is visible */
            text-overflow: unset; /* Prevent ellipsis from truncating text */
        }

        /* Vertical bar for reply (dynamic color) */
        .reply-bar {
            width: 1vw; /* Responsive width for the reply bar */
            border-radius: 0.5vw; /* Responsive border-radius for the reply bar */
            background-color: var(--reply-color, #777); /* Fallback color */
            position: absolute;
            top: 1.5vw; /* Responsive top position */
            bottom: 1.5vw; /* Responsive bottom position */
            left: 0;
        }

        /* Content area within the reply box */
        .reply-content {
            flex: 1;
            margin-left: 2vw; /* Responsive left margin */
            width: calc(100% - 2vw); /* Adjust width to account for margin */
        }

        /* Bold text within reply (e.g., sender name) */
        .reply b {
            color: #555;
        }

        /* Styling for media (images) within replies and main messages */
        .reply-media img,
        .media img {
            border-radius: 10px;
            margin-top: 1.5vw; /* Responsive top margin for media */
            max-width: 100%; /* Ensure images fit within their parent container */
            height: auto; /* Maintain aspect ratio */
            display: block; /* Ensure images take full line */
        }
    </style>
</head>
<body>

<div class="chat-box"></div>

<script>
    // Helper function to check if a value is valid (not null, undefined, "null", or empty string)
    function isValid(value) {
        return value !== null && value !== undefined && value !== "null" && value.trim() !== "";
    }

    // Function to generate a random HSL color for the reply bar
    function getRandomColor() {
        return "hsl(" + (Math.random() * 360) + ", 70%, 50%)";
    }

    // Function to create and append a chat bubble to the chat box
    function createChatBubble(data) {
        var chatBox = document.querySelector(".chat-box");
        var chatContainer = document.createElement("div");
        chatContainer.className = "chat-container";

        // Add avatar if provided and valid
        if (isValid(data.avatar)) {
            let avatarImg = document.createElement("img");
            avatarImg.src = data.avatar;
            avatarImg.className = "avatar"; // Add the avatar class for styling
            // Add a fallback for broken image links
            avatarImg.onerror = function() {
                this.onerror = null; // Prevent infinite loop if fallback also fails
                this.src = "https://placehold.co/50x50/cccccc/ffffff?text=AV"; // Placeholder image
            };
            chatContainer.appendChild(avatarImg);
        }

        var chatBubble = document.createElement("div");
        chatBubble.className = "chat-bubble";

        // Add sender name if provided and valid
        if (isValid(data.name)) {
            let nameDiv = document.createElement("div");
            nameDiv.className = "message-name";
            nameDiv.textContent = data.name;
            chatBubble.appendChild(nameDiv);
        }

        // Add reply section if reply name and message are provided and valid
        if (isValid(data.replyName) && isValid(data.replyMessage)) {
            var reply = document.createElement("div");
            reply.className = "reply";

            // Create and style the reply bar with a random color
            var replyBar = document.createElement("div");
            replyBar.className = "reply-bar";
            replyBar.style.backgroundColor = getRandomColor(); // Set random color
            reply.appendChild(replyBar);

            // Create and append reply content (name + message)
            var replyContent = document.createElement("div");
            replyContent.className = "reply-content";
            // Truncate reply message if too long (optional, but in original code)
            replyContent.innerHTML = "<b>" + data.replyName + ":</b> " + (data.replyMessage.length > 200 ? data.replyMessage.substring(0, 200) + "..." : data.replyMessage);
            reply.appendChild(replyContent);

            // Add reply media (image) if provided and valid
            if (isValid(data.replyMedia)) {
                let replyMediaDiv = document.createElement("div");
                replyMediaDiv.className = "reply-media";
                let replyImg = document.createElement("img");
                replyImg.src = data.replyMedia;
                // Add a fallback for broken image links
                replyImg.onerror = function() {
                    this.onerror = null;
                    this.src = "https://placehold.co/150x100/cccccc/ffffff?text=No+Image";
                };
                replyMediaDiv.appendChild(replyImg);
                reply.appendChild(replyMediaDiv);
            }

            chatBubble.appendChild(reply);
        }

        // Add main message content if provided and valid
        if (isValid(data.message)) {
            let messageDiv = document.createElement("div");
            messageDiv.className = "message-content";
            messageDiv.textContent = data.message;
            chatBubble.appendChild(messageDiv);
        }

        // Add main media (image) if provided and valid
        if (isValid(data.media)) {
            let mediaDiv = document.createElement("div");
            mediaDiv.className = "media";
            let mediaImg = document.createElement("img");
            mediaImg.src = data.media;
            // Add a fallback for broken image links
            mediaImg.onerror = function() {
                this.onerror = null;
                this.src = "https://placehold.co/200x150/cccccc/ffffff?text=No+Image";
            };
            mediaDiv.appendChild(mediaImg);
            chatBubble.appendChild(mediaDiv);
        }

        chatContainer.appendChild(chatBubble);
        chatBox.appendChild(chatContainer);
    }

    // Example chat data (replace with actual data for dynamic content)
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