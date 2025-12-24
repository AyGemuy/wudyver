import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/ludo/list";
import connectMongo from "@/lib/mongoose";
import Ludo from "@/models/Ludo";
import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    bg,
    state,
    totalPlayers,
    model = 1,
    type = "v5"
  }) {
    const data = {
      html: Html({
        template: model,
        bg: bg,
        state: state,
        totalPlayers: totalPlayers
      })
    };
    if (data.html === "Template tidak ditemukan") {
      console.error("HTML generation failed: Template not found for model", model);
      throw new Error(`Template not found for model ${model}`);
    }
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data && response.data.url) {
        return response.data.url;
      } else {
        console.error("API call to html2img did not return a URL. Response:", response.data);
        throw new Error("Failed to generate image: No URL returned from service.");
      }
    } catch (error) {
      console.error("Error during html2img API call:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  await connectMongo();
  const {
    action,
    id,
    total,
    player,
    a,
    b,
    c,
    d,
    bg,
    model,
    type
  } = req.method === "GET" ? req.query : req.body;
  try {
    let ludoGame;
    const htmlToImg = new HtmlToImg();
    if (action === "create") {
      const totalPlayers = parseInt(total);
      if (isNaN(totalPlayers) || ![2, 3, 4].includes(totalPlayers)) {
        return res.status(400).json({
          success: false,
          message: "Total players must be 2, 3, or 4. Example: `/api/game/ludo?action=create&total=4`"
        });
      }
      const initialState = {
        p1: {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        },
        p2: {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        },
        p3: totalPlayers >= 3 ? {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        } : null,
        p4: totalPlayers === 4 ? {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        } : null
      };
      const ludoGameData = {
        _id: id || uuidv4(),
        bg: bg || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgj5U87p_gOoQMbnSE2dsIKJT7NuFaBg60ywFjmHGBT1zacSft5UY7jN4&s=10",
        totalPlayers: totalPlayers,
        state: initialState
      };
      try {
        ludoGame = await Ludo.create(ludoGameData);
      } catch (error) {
        if (error.code === 11e3 || error.code === 11001) {
          return res.status(409).json({
            success: false,
            message: `Game with ID '${ludoGameData._id}' already exists. Please choose a different ID.`
          });
        }
        console.error("Error creating Ludo game in DB:", error);
        throw error;
      }
      const boardUrl = await htmlToImg.generate({
        bg: ludoGame.bg,
        state: ludoGame.state,
        totalPlayers: ludoGame.totalPlayers,
        model: model,
        type: type
      });
      return res.status(201).json({
        success: true,
        message: "Ludo game created successfully.",
        game: {
          id: ludoGame._id,
          totalPlayers: ludoGame.totalPlayers,
          bg: ludoGame.bg,
          state: ludoGame.state.toObject ? ludoGame.state.toObject() : ludoGame.state,
          boardUrl: boardUrl,
          createdAt: ludoGame.createdAt,
          updatedAt: ludoGame.updatedAt
        }
      });
    } else if (action === "state" && id) {
      ludoGame = await Ludo.findById(id);
      if (!ludoGame) {
        return res.status(404).json({
          success: false,
          message: `No Ludo game found with ID '${id}'. Example: \`/api/game/ludo?action=state&id=YOUR_GAME_ID\``
        });
      }
      const boardUrl = await htmlToImg.generate({
        bg: ludoGame.bg,
        state: ludoGame.state,
        totalPlayers: ludoGame.totalPlayers,
        model: model,
        type: type
      });
      return res.status(200).json({
        success: true,
        game: {
          id: ludoGame._id,
          totalPlayers: ludoGame.totalPlayers,
          bg: ludoGame.bg,
          state: ludoGame.state.toObject ? ludoGame.state.toObject() : ludoGame.state,
          boardUrl: boardUrl,
          createdAt: ludoGame.createdAt,
          updatedAt: ludoGame.updatedAt
        }
      });
    } else if (action === "reset" && id) {
      ludoGame = await Ludo.findById(id);
      if (!ludoGame) {
        return res.status(404).json({
          success: false,
          message: `No Ludo game found with ID '${id}' for reset. Example: \`/api/game/ludo?action=reset&id=YOUR_GAME_ID\``
        });
      }
      const totalPlayersInGame = ludoGame.totalPlayers;
      const resetState = {
        p1: {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        },
        p2: {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        },
        p3: totalPlayersInGame >= 3 ? {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        } : null,
        p4: totalPlayersInGame === 4 ? {
          a: 0,
          b: 0,
          c: 0,
          d: 0
        } : null
      };
      ludoGame.state = resetState;
      await ludoGame.save();
      return res.status(200).json({
        success: true,
        message: `Ludo game with ID '${id}' has been reset.`,
        updatedState: ludoGame.state.toObject ? ludoGame.state.toObject() : ludoGame.state
      });
    } else if (action === "delete" && id) {
      const deletedGame = await Ludo.findByIdAndDelete(id);
      if (!deletedGame) {
        return res.status(404).json({
          success: false,
          message: `No Ludo game found with ID '${id}' to delete. Example: \`/api/game/ludo?action=delete&id=YOUR_GAME_ID\``
        });
      }
      return res.status(200).json({
        success: true,
        message: `Ludo game with ID '${id}' has been deleted.`
      });
    } else if (action === "clear") {
      const deleteResult = await Ludo.deleteMany({});
      return res.status(200).json({
        success: true,
        message: `All Ludo game sessions have been cleared. Count: ${deleteResult.deletedCount}`
      });
    } else if (action === "list") {
      const sessions = await Ludo.find({}, "_id totalPlayers bg createdAt state updatedAt").sort({
        createdAt: -1
      }).limit(50);
      if (sessions.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No active Ludo sessions found."
        });
      }
      return res.status(200).json({
        success: true,
        message: `List of ${sessions.length} active Ludo sessions:`,
        sessions: sessions.map(session => session.toObject())
      });
    } else if (action === "move" && id) {
      ludoGame = await Ludo.findById(id);
      if (!ludoGame) {
        return res.status(404).json({
          success: false,
          message: `No Ludo game found with ID '${id}' for move. Example: \`/api/game/ludo?action=move&id=YOUR_GAME_ID&player=1&a=1\``
        });
      }
      let updated = false;
      if (bg) {
        ludoGame.bg = bg;
        updated = true;
      }
      if (player) {
        const playerKey = `p${player}`;
        if (!ludoGame.state[playerKey] || typeof ludoGame.state[playerKey] !== "object" || ludoGame.state[playerKey] === null) {
          if (player === "3" && ludoGame.totalPlayers >= 3 || player === "4" && ludoGame.totalPlayers === 4) {
            ludoGame.state[playerKey] = {
              a: 0,
              b: 0,
              c: 0,
              d: 0
            };
            updated = true;
          } else if (player === "1" || player === "2") {
            if (!ludoGame.state[playerKey]) ludoGame.state[playerKey] = {
              a: 0,
              b: 0,
              c: 0,
              d: 0
            };
            updated = true;
          } else {
            return res.status(400).json({
              success: false,
              message: `Player ${player} (key: ${playerKey}) cannot be initialized or does not exist for this game configuration (Total Players: ${ludoGame.totalPlayers}).`
            });
          }
        }
        const pieceUpdates = {
          a: a,
          b: b,
          c: c,
          d: d
        };
        for (const piece in pieceUpdates) {
          if (pieceUpdates[piece] !== undefined) {
            const val = parseInt(pieceUpdates[piece]);
            if (isNaN(val)) {
              return res.status(400).json({
                success: false,
                message: `Invalid value for piece ${piece} of player ${player}. Must be a number. Received: '${pieceUpdates[piece]}'`
              });
            }
            ludoGame.state[playerKey][piece] = val;
            updated = true;
          }
        }
      } else {
        if (!bg) {
          return res.status(400).json({
            success: false,
            message: "For 'move' action, please provide 'player' and piece values (a, b, c, d) or a 'bg' URL to update. Example: `/api/game/ludo?action=move&id=YOUR_GAME_ID&player=1&a=1`"
          });
        }
      }
      if (updated) {
        await ludoGame.save();
      }
      const boardUrl = await htmlToImg.generate({
        bg: ludoGame.bg,
        state: ludoGame.state,
        totalPlayers: ludoGame.totalPlayers,
        model: model,
        type: type
      });
      return res.status(200).json({
        success: true,
        message: "Game state updated successfully.",
        game: {
          id: ludoGame._id,
          totalPlayers: ludoGame.totalPlayers,
          bg: ludoGame.bg,
          state: ludoGame.state.toObject ? ludoGame.state.toObject() : ludoGame.state,
          boardUrl: boardUrl,
          updatedAt: ludoGame.updatedAt
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid request. Please specify an **action** (`create`, `state`, `reset`, `delete`, `clear`, `list`, `move`) and relevant parameters. " + "**Examples (responses are JSON, `boardUrl` contains link to image):** \n" + "- Create new game (random ID): `/api/game/ludo?action=create&total=4&bg=YOUR_BG_URL&model=1&type=v5`\n" + "- Create new game (custom ID): `/api/game/ludo?action=create&total=4&id=MY_CUSTOM_ID&bg=YOUR_BG_URL&model=1&type=v5`\n" + "- Get game state & board URL: `/api/game/ludo?action=state&id=YOUR_GAME_ID&model=2`\n" + "- Update player state (move pieces): `/api/game/ludo?action=move&id=YOUR_GAME_ID&player=1&a=1&b=2&model=1`\n" + "- Reset game: `/api/game/ludo?action=reset&id=YOUR_GAME_ID`\n" + "- Delete game: `/api/game/ludo?action=delete&id=YOUR_GAME_ID`\n" + "- Clear all games: `/api/game/ludo?action=clear`\n" + "- List all sessions: `/api/game/ludo?action=list`"
      });
    }
  } catch (error) {
    console.error("API Handler Error:", error);
    const errorMessage = error.message || "Internal Server Error";
    const errorStatus = error.isAxiosError ? error.response?.status || 500 : error.status || 500;
    return res.status(errorStatus).json({
      success: false,
      message: errorMessage,
      ...error.response?.data && {
        details: error.response.data
      }
    });
  }
}