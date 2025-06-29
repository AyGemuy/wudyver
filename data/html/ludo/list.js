const templates = [{
  html: (bg, state, totalPlayers) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Papan Ludo</title>
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        html, body { 
            height: 100%; 
            overflow: hidden; 
        }
        
        body { 
            background-color: #1a1a1a; 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
        }
        
        .board-container { 
            position: relative; 
            width: 100vmin; 
            height: 100vmin; 
            background-size: contain; 
            background-repeat: no-repeat; 
            background-position: center; 
            border: 3px solid #34495e; 
            border-radius: 10px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
            overflow: hidden; 
        }
        
        .piece { 
            position: absolute; 
            width: 4.0%; 
            height: 4.0%; 
            border-radius: 50%; 
            border: 2px solid #fff; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.6); 
            transition: all 0.3s ease; 
            z-index: 10; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold; 
            font-size: clamp(0.6em, 2vw, 0.9em); 
            color: white; 
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8); 
            cursor: pointer; 
        }
        
        .piece:hover { 
            transform: scale(1.2); 
            box-shadow: 0 4px 12px rgba(0,0,0,0.8); 
            z-index: 20; 
        }
        
        .piece.p1 { background-color: #e74c3c; }
        .piece.p2 { background-color: #f1c40f; color: #2c3e50; }
        .piece.p3 { background-color: #2ecc71; }
        .piece.p4 { background-color: #3498db; }
        
        @media (max-width: 480px) { 
            .piece { border-width: 1px; } 
        }
    </style>
</head>
<body>
    <div class="board-container" id="board"></div>
    
    <script>
        const BOARD_IMAGE = '${bg || ""}';
        const DEFAULT_STATE = ${state ? JSON.stringify(state) : "{}"};
        
        let gameConfig = {
            backgroundImage: BOARD_IMAGE,
            gameState: JSON.parse(JSON.stringify(DEFAULT_STATE)),
            totalPlayers: ${totalPlayers || 4}
        };
        
        const CELL_WIDTH = 100 / 15;
        const CELL_HEIGHT = 100 / 15;
        
        function getCellCoordinates(row, col) {
            return [(col + 0.5) * CELL_WIDTH, (row + 0.5) * CELL_HEIGHT];
        }
        
        let boardPath = [];
        
        function buildBoardPath() {
            boardPath = [];
            
            for (let c = 2; c <= 5; c++) boardPath.push(getCellCoordinates(6, c));
            for (let r = 5; r >= 1; r--) boardPath.push(getCellCoordinates(r, 6));
            boardPath.push(getCellCoordinates(0, 6));
            boardPath.push(getCellCoordinates(0, 7));
            boardPath.push(getCellCoordinates(0, 8));
            boardPath.push(getCellCoordinates(1, 8));
            for (let r = 2; r <= 5; r++) boardPath.push(getCellCoordinates(r, 8));
            boardPath.push(getCellCoordinates(6, 8));
            for (let c = 9; c <= 13; c++) boardPath.push(getCellCoordinates(6, c));
            boardPath.push(getCellCoordinates(6, 14));
            boardPath.push(getCellCoordinates(7, 14));
            boardPath.push(getCellCoordinates(8, 14));
            boardPath.push(getCellCoordinates(8, 13));
            for (let c = 12; c >= 9; c--) boardPath.push(getCellCoordinates(8, c));
            boardPath.push(getCellCoordinates(8, 8));
            for (let r = 9; r <= 13; r++) boardPath.push(getCellCoordinates(r, 8));
            boardPath.push(getCellCoordinates(14, 8));
            boardPath.push(getCellCoordinates(14, 7));
            boardPath.push(getCellCoordinates(14, 6));
            boardPath.push(getCellCoordinates(13, 6));
            for (let r = 12; r >= 9; r--) boardPath.push(getCellCoordinates(r, 6));
            boardPath.push(getCellCoordinates(8, 6));
            for (let c = 5; c >= 1; c--) boardPath.push(getCellCoordinates(8, c));
            boardPath.push(getCellCoordinates(8, 0));
            boardPath.push(getCellCoordinates(7, 0));
        }
        
        const homePositions = {
            p1: {
                pieces: {
                    a: getCellCoordinates(1.7, 1.6),
                    b: getCellCoordinates(1.7, 3.2),
                    c: getCellCoordinates(3.2, 1.6),
                    d: getCellCoordinates(3.2, 3.2)
                }
            },
            p2: {
                pieces: {
                    a: getCellCoordinates(10.8, 10.8),
                    b: getCellCoordinates(10.8, 12.3),
                    c: getCellCoordinates(12.3, 10.8),
                    d: getCellCoordinates(12.3, 12.3)
                }
            },
            p3: {
                pieces: {
                    a: getCellCoordinates(10.8, 1.6),
                    b: getCellCoordinates(10.8, 3.2),
                    c: getCellCoordinates(12.3, 1.6),
                    d: getCellCoordinates(12.3, 3.2)
                }
            },
            p4: {
                pieces: {
                    a: getCellCoordinates(1.7, 10.7),
                    b: getCellCoordinates(1.7, 12.3),
                    c: getCellCoordinates(3.2, 10.7),
                    d: getCellCoordinates(3.2, 12.3)
                }
            }
        };
        
        const playerStartIndices = { p1: 0, p4: 13, p2: 26, p3: 39 }; 

        function setBoardBackground(imageUrl) {
            const board = document.getElementById('board');
            if (board) {
                board.style.backgroundImage = 'url(' + imageUrl + ')';
            }
        }
        
        function getActivePlayers(totalPlayers) {
            const playerCount = Number(totalPlayers);
            switch (playerCount) {
                case 2: return ["p1", "p2"];
                case 3: return ["p1", "p4", "p3"];
                case 4: return ["p1", "p4", "p2", "p3"];
                default: return ["p1", "p4", "p2", "p3"];
            }
        }
        
        function getPieceCoordinates(player, position) {
            if (position === 0) {
                return null; 
            } else if (position >= 1 && position <= boardPath.length) {
                const startIndex = playerStartIndices[player];
                if (startIndex === undefined || startIndex >= boardPath.length) {
                    console.error("Invalid startIndex for player:", player, "startIndex:", startIndex, "boardPath.length:", boardPath.length);
                    return getCellCoordinates(7,7); 
                }

                const pathIndex = (startIndex + position - 1) % boardPath.length;
                if (pathIndex < 0 || pathIndex >= boardPath.length) {
                    console.error("Calculated pathIndex is out of bounds:", pathIndex, "boardPath.length:", boardPath.length);
                    return getCellCoordinates(7,7); 
                }
                return boardPath[pathIndex];
            } else if (position >= (boardPath.length + 1) && position <= (boardPath.length + 5)) {
                const safeStep = position - (boardPath.length + 1); 
                switch (player) {
                    case 'p1': return getCellCoordinates(7, 1 + safeStep);
                    case 'p4': return getCellCoordinates(1 + safeStep, 7);
                    case 'p2': return getCellCoordinates(7, 13 - safeStep);
                    case 'p3': return getCellCoordinates(13 - safeStep, 7);
                    default: return getCellCoordinates(7, 7);
                }
            } else if (position === (boardPath.length + 6)) {
                return getCellCoordinates(7, 7); 
            } else { 
                console.warn("Invalid piece position:", position, "for player:", player);
                return getCellCoordinates(7, 7); 
            }
        }
        
        function renderBoard(gameState) {
            const board = document.getElementById('board');
            if (!board) return;
            
            board.innerHTML = ''; 
            const activePlayers = getActivePlayers(gameConfig.totalPlayers);
            
            const piecesByPosition = {}; 
            const pieceSize = 4.0; 
            const pieceOffset = pieceSize / 2.0; 

            activePlayers.forEach(player => {
                if (!gameState || !gameState[player]) return;
                
                const playerNumber = player.slice(1); 
                const playerPieces = gameState[player]; 
                
                Object.keys(playerPieces).forEach(pieceKey => { 
                    const position = playerPieces[pieceKey]; 
                    const pieceElement = document.createElement('div');
                    
                    pieceElement.className = 'piece ' + player; 
                    pieceElement.id = 'piece_' + player + '_' + pieceKey;
                    pieceElement.textContent = pieceKey.toUpperCase();
                    pieceElement.title = 'Pemain ' + playerNumber + ' - Bidak ' + pieceKey.toUpperCase() + ' (Posisi: ' + position + ')';
                    
                    let coordinates;
                    let positionKey; 
                    
                    if (position === 0) { 
                        coordinates = homePositions[player].pieces[pieceKey];
                        positionKey = 'home_' + player + '_' + pieceKey; 
                    } else {
                        coordinates = getPieceCoordinates(player, position);
                        if (coordinates) {
                             positionKey = coordinates.join(',');
                        } else {
                            console.warn("Koordinat tidak ditemukan untuk", player, pieceKey, "di posisi", position);
                            coordinates = getCellCoordinates(7,7); 
                            positionKey = 'error_' + player + '_' + pieceKey;
                        }
                    }
                    
                    if (!coordinates) { 
                        console.error("Koordinat akhir null untuk bidak:", player, pieceKey, "posisi:", position);
                        coordinates = getCellCoordinates(7, 7); 
                        positionKey = 'fallback_' + player + '_' + pieceKey;
                    }
                    
                    if (!piecesByPosition[positionKey]) {
                        piecesByPosition[positionKey] = [];
                    }
                    
                    piecesByPosition[positionKey].push({
                        element: pieceElement,
                        coordinates: coordinates, 
                        player: player,
                        pieceKey: pieceKey
                    });
                });
            });
            
            Object.keys(piecesByPosition).forEach(positionKey => {
                const piecesAtPosition = piecesByPosition[positionKey];
                const pieceCount = piecesAtPosition.length;
                const baseCoords = piecesAtPosition[0].coordinates; 

                if (pieceCount === 1) {
                    const pieceData = piecesAtPosition[0];
                    pieceData.element.style.left = (baseCoords[0] - pieceOffset) + '%';
                    pieceData.element.style.top = (baseCoords[1] - pieceOffset) + '%';
                    board.appendChild(pieceData.element);
                } else { 
                    const clusterRadius = pieceSize * 0.3; 
                    
                    piecesAtPosition.forEach((pieceData, index) => {
                        const angle = (2 * Math.PI / pieceCount) * index - (Math.PI / 2); 
                        const offsetX = clusterRadius * Math.cos(angle);
                        const offsetY = clusterRadius * Math.sin(angle);
                        
                        pieceData.element.style.left = (baseCoords[0] + offsetX - pieceOffset) + '%';
                        pieceData.element.style.top = (baseCoords[1] + offsetY - pieceOffset) + '%';
                        pieceData.element.style.zIndex = 10 + index; 
                        board.appendChild(pieceData.element);
                    });
                }
            });
        }
        
        function updateGameConfig(config) {
            let needsRender = false;
            if (config.backgroundImage !== undefined && config.backgroundImage !== gameConfig.backgroundImage) {
                gameConfig.backgroundImage = config.backgroundImage;
                setBoardBackground(config.backgroundImage);
            }
            
            if (config.gameState !== undefined) {
                gameConfig.gameState = JSON.parse(JSON.stringify(config.gameState)); 
                needsRender = true;
            }
            
            if (config.totalPlayers !== undefined && config.totalPlayers !== gameConfig.totalPlayers) {
                gameConfig.totalPlayers = config.totalPlayers;
                needsRender = true;
            }
            
            if (needsRender || (!config.backgroundImage && !config.gameState && !config.totalPlayers)) {
                renderBoard(gameConfig.gameState);
            }
        }
        
        function initializeBoard() {
            buildBoardPath(); 
            
            if (gameConfig.backgroundImage) {
                setBoardBackground(gameConfig.backgroundImage);
            }
            
            let initialState = {};
            try {
                if (typeof DEFAULT_STATE === 'string' && DEFAULT_STATE !== "{}") {
                     initialState = JSON.parse(DEFAULT_STATE);
                } else if (typeof DEFAULT_STATE === 'object') {
                    initialState = DEFAULT_STATE;
                }
            } catch (e) {
                console.error("Gagal parse DEFAULT_STATE:", e, DEFAULT_STATE);
                initialState = {}; 
            }
             gameConfig.gameState = JSON.parse(JSON.stringify(initialState)); 


            if (Object.keys(gameConfig.gameState).length > 0) {
                renderBoard(gameConfig.gameState);
            } else {
                renderBoard({}); 
            }
        }
        
        document.addEventListener('DOMContentLoaded', initializeBoard);
        
        window.updateLudoBoard = updateGameConfig;
        
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  bg,
  state,
  totalPlayers
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(bg, state, totalPlayers) || "Template tidak ditemukan";
};
export default getTemplate;