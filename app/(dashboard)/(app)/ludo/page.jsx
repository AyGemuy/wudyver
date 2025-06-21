"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";
import Tooltip from "@/components/ui/Tooltip";

const LUDO_API_BASE_URL = "/api/game/ludo";
const ITEMS_PER_PAGE_SESSIONS = 10;

const LudoPage = () => {
  const [gameSessions, setGameSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [searchTermSessions, setSearchTermSessions] = useState("");
  const [currentPageSessions, setCurrentPageSessions] = useState(1);

  const [activeGame, setActiveGame] = useState(null);
  const [loadingGameAction, setLoadingGameAction] = useState(false);
  const [gameActionError, setGameActionError] = useState(null);
  const [boardImageUrl, setBoardImageUrl] = useState("");

  const [newGameTotalPlayers, setNewGameTotalPlayers] = useState("4");
  const [newGameId, setNewGameId] = useState("");
  const [newGameBgUrl, setNewGameBgUrl] = useState("https://img.freepik.com/free-vector/green-nature-landscape-with-river-mountains-rural-scenery_107791-19930.jpg");
  const [newGameModel, setNewGameModel] = useState("1");
  const [newGameHtml2ImgType, setNewGameHtml2ImgType] = useState("v5");

  const [movePlayer, setMovePlayer] = useState("1");
  const [movePieceA, setMovePieceA] = useState("");
  const [movePieceB, setMovePieceB] = useState("");
  const [movePieceC, setMovePieceC] = useState("");
  const [movePieceD, setMovePieceD] = useState("");
  const [updateBgUrl, setUpdateBgUrl] = useState("");
  const [updateModel, setUpdateModel] = useState("");
  const [updateHtml2ImgType, setUpdateHtml2ImgType] = useState("");
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState(null);
  const [confirmModalMessage, setConfirmModalMessage] = useState("");

  const callLudoApi = async (dataForBody, method = "POST") => {
    setLoadingGameAction(true);
    setGameActionError(null);
    let url = LUDO_API_BASE_URL;
    
    try {
      const options = { 
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataForBody)
      };

      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Error ${res.status}`);
      }
      return data;
    } catch (err) {
      const action = dataForBody && dataForBody.action ? dataForBody.action : "unknown";
      console.error(`Error calling Ludo API (action: ${action}):`, err);
      setGameActionError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoadingGameAction(false);
    }
  };

  const fetchGameSessions = async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const data = await callLudoApi({ action: "list" }, "POST");
      if (!data.success) {
        throw new Error(data.message || "Gagal memuat sesi game.");
      }
      setGameSessions(data.sessions || []);
    } catch (err) {
      setSessionsError(err.message);
      setGameSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };
  
  useEffect(() => {
    fetchGameSessions();
  }, []);


  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      const bodyData = {
        action: "create",
        total: newGameTotalPlayers,
        id: newGameId || undefined,
        bg: newGameBgUrl,
        model: newGameModel,
        type: newGameHtml2ImgType,
      };
      const data = await callLudoApi(bodyData); 
      setActiveGame(data.game);
      setBoardImageUrl(data.game.boardUrl + `?t=${new Date().getTime()}`);
      setUpdateBgUrl(data.game.bg || newGameBgUrl);
      setUpdateModel(data.game.model || newGameModel);
      setUpdateHtml2ImgType(data.game.type || newGameHtml2ImgType);
      toast.success(data.message);
      fetchGameSessions();
      setNewGameId(""); 
    } catch (err) {
    }
  };

  const handleLoadGame = async (gameId, modelFromSession = "1", typeFromSession = "v5") => {
    try {
      const bodyData = { 
        action: "state", 
        id: gameId, 
        model: modelFromSession, 
        type: typeFromSession 
      };
      const data = await callLudoApi(bodyData, "POST"); 
      setActiveGame(data.game);
      setBoardImageUrl(data.game.boardUrl + `?t=${new Date().getTime()}`);
      setUpdateBgUrl(data.game.bg);
      setUpdateModel(data.game.model || modelFromSession);
      setUpdateHtml2ImgType(data.game.type || typeFromSession);

      const gameState = data.game.state;
      if (gameState) {
        const p1State = gameState.p1 || { a:0,b:0,c:0,d:0};
        const p2State = gameState.p2 || { a:0,b:0,c:0,d:0};
        const p3State = gameState.p3 || { a:0,b:0,c:0,d:0};
        const p4State = gameState.p4 || { a:0,b:0,c:0,d:0};

        let currentPlayerState = p1State;
        const currentMovePlayerStr = String(movePlayer);
        if (currentMovePlayerStr === "2" && data.game.totalPlayers >= 2) currentPlayerState = p2State;
        else if (currentMovePlayerStr === "3" && data.game.totalPlayers >= 3) currentPlayerState = p3State;
        else if (currentMovePlayerStr === "4" && data.game.totalPlayers >= 4) currentPlayerState = p4State;
        else if (String(data.game.totalPlayers) === "1" || (currentMovePlayerStr !== "1" && currentMovePlayerStr !== "2" && currentMovePlayerStr !== "3" && currentMovePlayerStr !== "4") ) {
             setMovePlayer("1");
        }


        setMovePieceA(String(currentPlayerState.a || "0"));
        setMovePieceB(String(currentPlayerState.b || "0"));
        setMovePieceC(String(currentPlayerState.c || "0"));
        setMovePieceD(String(currentPlayerState.d || "0"));

      } else {
        setMovePieceA("0"); setMovePieceB("0"); setMovePieceC("0"); setMovePieceD("0");
      }
      toast.success(`Game ${gameId} dimuat.`);
    } catch (err) {
      setActiveGame(null);
      setBoardImageUrl("");
    }
  };
  
  useEffect(() => {
    if (activeGame && activeGame.state) {
        const gameState = activeGame.state;
        let playerStateToUpdate = { a:0,b:0,c:0,d:0 };
        const currentMovePlayerInt = parseInt(movePlayer);

        if (currentMovePlayerInt >= 1 && currentMovePlayerInt <= activeGame.totalPlayers) {
            playerStateToUpdate = gameState[`p${currentMovePlayerInt}`] || { a:0,b:0,c:0,d:0};
        } else if (activeGame.totalPlayers > 0) {
            setMovePlayer("1"); 
            playerStateToUpdate = gameState.p1 || { a:0,b:0,c:0,d:0};
        }
        
        setMovePieceA(String(playerStateToUpdate.a || "0"));
        setMovePieceB(String(playerStateToUpdate.b || "0"));
        setMovePieceC(String(playerStateToUpdate.c || "0"));
        setMovePieceD(String(playerStateToUpdate.d || "0"));
    }
  }, [movePlayer, activeGame?.id]);


  const handleUpdateMove = async (e) => {
    e.preventDefault();
    if (!activeGame) return;
    try {
      const bodyData = {
        action: "move",
        id: activeGame.id,
        player: movePlayer,
        a: movePieceA,
        b: movePieceB,
        c: movePieceC,
        d: movePieceD,
        bg: updateBgUrl !== activeGame.bg ? updateBgUrl : undefined,
        model: updateModel || undefined,
        type: updateHtml2ImgType || undefined,
      };
      const data = await callLudoApi(bodyData, "POST");
      setActiveGame(data.game);
      setBoardImageUrl(data.game.boardUrl + `?t=${new Date().getTime()}`);
      setUpdateBgUrl(data.game.bg);
      if(data.game.model) setUpdateModel(data.game.model);
      if(data.game.type) setUpdateHtml2ImgType(data.game.type);

      toast.success(data.message);
      fetchGameSessions();  
    } catch (err) {}
  };

  const handleResetActiveGame = async () => {
    if (!activeGame) return;
    try {
      const data = await callLudoApi({ action: "reset", id: activeGame.id }, "POST");
      toast.success(data.message);
      handleLoadGame(activeGame.id, updateModel || activeGame.model, updateHtml2ImgType || activeGame.type);
      fetchGameSessions();
    } catch (err) {}
  };

  const handleDeleteActiveGame = async () => {
    if (!activeGame) return;
    try {
      const data = await callLudoApi({ action: "delete", id: activeGame.id }, "POST");
      toast.success(data.message);
      setActiveGame(null);
      setBoardImageUrl("");
      fetchGameSessions();
    } catch (err) {}
  };

  const handleClearAll = async () => {
    try {
      const data = await callLudoApi({ action: "clear" }, "POST");
      toast.success(data.message);
      setActiveGame(null);
      setBoardImageUrl("");
      setGameSessions([]);
      fetchGameSessions();  
    } catch (err) {}
  };
  
  const openConfirmModal = (actionFn, message) => {
    setConfirmModalAction(() => actionFn);  
    setConfirmModalMessage(message);
    setShowConfirmModal(true);
  };

  const executeConfirmedAction = async () => {
    setShowConfirmModal(false);
    if (confirmModalAction) {
        await confirmModalAction();
    }
    setConfirmModalAction(null);
  };

  const filteredSessions = gameSessions.filter(session =>
    session._id.toLowerCase().includes(searchTermSessions.toLowerCase())
  );
  const totalSessionPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE_SESSIONS);
  const paginatedSessions = filteredSessions.slice(
    (currentPageSessions - 1) * ITEMS_PER_PAGE_SESSIONS,
    currentPageSessions * ITEMS_PER_PAGE_SESSIONS
  );

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50";
  const buttonPrimaryClass = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  const renderPlayerStateInput = (playerNum) => {
    if (!activeGame || playerNum > activeGame.totalPlayers) return null;
    const playerKey = `p${playerNum}`;
    const state = activeGame.state && activeGame.state[playerKey] 
                  ? activeGame.state[playerKey] 
                  : { a: 0, b: 0, c: 0, d: 0 };
    return (
      <div className="text-xs space-y-0.5">
        <div>Pion A: <span className="font-semibold">{state.a}</span></div>
        <div>Pion B: <span className="font-semibold">{state.b}</span></div>
        <div>Pion C: <span className="font-semibold">{state.c}</span></div>
        <div>Pion D: <span className="font-semibold">{state.d}</span></div>
      </div>
    );
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />

      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:dice-five-duotone" className="text-2xl sm:text-3xl" /> 
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Ludo Game
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Jelajahi dunia Ludo Game Manager!
            </p>
          </div>

        <div className="md:flex md:min-h-[calc(100vh-200px)]">
          <div className="w-full md:w-2/5 lg:w-1/3 border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 flex flex-col p-1 sm:p-2">
            <form onSubmit={handleCreateGame} className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-300">Buat Game Baru</h3>
              <div>
                <label htmlFor="totalPlayers" className={labelClass}>Total Pemain (2-4):</label>
                <select id="totalPlayers" value={newGameTotalPlayers} onChange={(e) => setNewGameTotalPlayers(e.target.value)} className={inputBaseClass}>
                  <option value="2">2 Pemain</option>
                  <option value="3">3 Pemain</option>
                  <option value="4">4 Pemain</option>
                </select>
              </div>
              <div>
                <label htmlFor="newGameId" className={labelClass}>ID Game (Opsional):</label>
                <input type="text" id="newGameId" value={newGameId} onChange={(e) => setNewGameId(e.target.value)} placeholder="Kosongkan untuk ID acak" className={inputBaseClass} />
              </div>
              <div>
                <label htmlFor="newGameBgUrl" className={labelClass}>URL Background Papan (Opsional):</label>
                <input type="url" id="newGameBgUrl" value={newGameBgUrl} onChange={(e) => setNewGameBgUrl(e.target.value)} placeholder="URL gambar background" className={inputBaseClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                    <label htmlFor="newGameModel" className={labelClass}>Model Papan:</label>
                    <input type="number" id="newGameModel" value={newGameModel} onChange={(e) => setNewGameModel(e.target.value)} placeholder="1" min="1" className={inputBaseClass} />
                </div>
                <div>
                    <label htmlFor="newGameHtml2ImgType" className={labelClass}>Tipe Img API:</label>
                    <input type="text" id="newGameHtml2ImgType" value={newGameHtml2ImgType} onChange={(e) => setNewGameHtml2ImgType(e.target.value)} placeholder="v5" className={inputBaseClass} />
                </div>
              </div>
              <Button type="submit" text="Buat Game" icon="ph:game-controller-duotone" className={`${buttonPrimaryClass} w-full`} disabled={loadingGameAction && !activeGame} isLoading={loadingGameAction && !activeGame} />
            </form>

            {(gameSessions.length > 0 || loadingSessions || sessionsError) && (
                <div className="p-3 sm:p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-300">Sesi Aktif</h3>
                    {gameSessions.length > 0 && 
                        <Button onClick={() => openConfirmModal(handleClearAll, "Yakin ingin menghapus SEMUA sesi game Ludo? Aksi ini tidak dapat diurungkan.")} text="Hapus Semua" icon="ph:trash-duotone" className={`${buttonSecondaryClass} !text-xs !bg-red-500/20 hover:!bg-red-500/30 !text-red-600 dark:!text-red-400`} disabled={loadingGameAction || loadingSessions} />
                    }
                </div>
                {gameSessions.length > 0 &&
                    <input type="text" placeholder="Cari ID Sesi..." value={searchTermSessions} onChange={(e)=> setSearchTermSessions(e.target.value)} className={`${inputBaseClass} mb-2`} />
                }
                
                {loadingSessions && <div className="text-center py-4 text-slate-500 dark:text-slate-400"><Icon icon="svg-spinners:ring-resize" className="inline-block mr-2"/> Memuat sesi...</div>}
                {sessionsError && <div className="text-center py-4 text-red-500 dark:text-red-400">{sessionsError}</div>}
                
                {!loadingSessions && !sessionsError && gameSessions.length > 0 && (
                    <SimpleBar className="flex-grow -mx-1">
                    <div className="px-1 space-y-1">
                    {paginatedSessions.length > 0 ? paginatedSessions.map(session => (
                        <div key={session._id} className={`p-2 rounded-md border cursor-pointer hover:border-teal-500 dark:hover:border-teal-400 transition-all ${activeGame?.id === session._id ? "bg-teal-50 dark:bg-teal-700/30 border-teal-500 dark:border-teal-400" : "bg-slate-50 dark:bg-slate-700/20 border-slate-200 dark:border-slate-600/50"}`}
                                onClick={() => handleLoadGame(session._id, session.model, session.type)}>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-mono text-teal-700 dark:text-teal-300 truncate" title={session._id}>{session._id}</span>
                            <span className="text-xs py-0.5 px-1.5 bg-slate-200 dark:bg-slate-600 rounded">{session.totalPlayers}P</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Dibuat: {new Date(session.createdAt).toLocaleString()}
                        </div>
                        </div>
                    )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Tidak ada sesi game cocok dengan pencarian.</p>}
                    </div>
                    </SimpleBar>
                )}
                {!loadingSessions && !sessionsError && gameSessions.length === 0 && (
                    <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Belum ada sesi game. Buat game baru untuk memulai.</p>
                )}
                {totalSessionPages > 1 && gameSessions.length > 0 && (
                    <div className="pt-3 mt-auto border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center text-xs">
                        <Button onClick={() => setCurrentPageSessions(p => Math.max(1, p - 1))} disabled={currentPageSessions === 1} text="Prev" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} !px-2.5 !py-1`} />
                        <span>Hal {currentPageSessions} dari {totalSessionPages}</span>
                        <Button onClick={() => setCurrentPageSessions(p => Math.min(totalSessionPages, p + 1))} disabled={currentPageSessions === totalSessionPages} text="Next" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} !px-2.5 !py-1`} />
                    </div>
                )}
                </div>
            )}
          </div>
          
          <div className="w-full md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-900/30 flex flex-col p-4 sm:p-6 items-center justify-center">
            {!activeGame && !loadingGameAction && (
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Icon icon="ph:strategy-duotone" className="text-7xl mb-4 opacity-60 mx-auto" />
                <p className="text-lg">
                    {gameSessions.length === 0 && !loadingSessions ? "Buat game baru untuk memulai." : "Tidak ada game yang dimuat."}
                </p>
                <p className="text-sm mt-1">
                    {gameSessions.length > 0 && "Pilih dari sesi aktif di kiri atau buat game baru."}
                </p>
              </div>
            )}
            {loadingGameAction && activeGame && <div className="text-center text-slate-500 dark:text-slate-400"><Icon icon="svg-spinners:blocks-wave" className="text-5xl mb-3" /> Memproses Aksi Game...</div>}
            {gameActionError && !loadingGameAction && <div className="text-center text-red-500 dark:text-red-400 max-w-md"><Icon icon="ph:warning-octagon-duotone" className="text-5xl mb-2"/> <p className="font-semibold">Error:</p> {gameActionError}</div>}
            
            {activeGame && !loadingGameAction && !gameActionError && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-300">Game ID: <span className="font-mono text-sm">{activeGame.id}</span></h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Pemain: {activeGame.totalPlayers}</p>
                </div>

                {boardImageUrl ? (
                  <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-md shadow-lg aspect-square max-w-md mx-auto overflow-hidden">
                      <img src={boardImageUrl} alt="Ludo Board" className="w-full h-full object-contain" onError={(e) => { e.target.alt="Gagal memuat gambar papan"; e.target.src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";}}/>
                  </div>
                ) : (
                  <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md shadow aspect-square max-w-md mx-auto flex items-center justify-center text-slate-500">Papan tidak tersedia</div>
                )}
                
                <Card bodyClass="p-3" className="bg-opacity-50 dark:bg-opacity-50">
                    <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">Posisi Pion:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {renderPlayerStateInput(1)}
                        {renderPlayerStateInput(2)}
                        {activeGame.totalPlayers >= 3 && renderPlayerStateInput(3)}
                        {activeGame.totalPlayers >= 4 && renderPlayerStateInput(4)} 
                    </div>
                </Card>

                <form onSubmit={handleUpdateMove} className="space-y-3 p-3 border border-slate-200 dark:border-slate-700/50 rounded-md bg-white/50 dark:bg-slate-800/30">
                    <h4 className="text-md font-semibold text-teal-600 dark:text-teal-400">Update Visual Papan</h4>
                    <div>
                        <label htmlFor="updateBgUrl" className={labelClass}>URL Background Baru:</label>
                        <input type="url" id="updateBgUrl" value={updateBgUrl} onChange={(e) => setUpdateBgUrl(e.target.value)} placeholder="URL gambar" className={inputBaseClass}/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="updateModel" className={labelClass}>Model Papan:</label>
                            <input type="number" id="updateModel" value={updateModel} onChange={(e) => setUpdateModel(e.target.value)} min="1" className={inputBaseClass}/>
                        </div>
                        <div>
                            <label htmlFor="updateHtml2ImgType" className={labelClass}>Tipe Img API:</label>
                            <input type="text" id="updateHtml2ImgType" value={updateHtml2ImgType} onChange={(e) => setUpdateHtml2ImgType(e.target.value)} className={inputBaseClass}/>
                        </div>
                    </div>
                    <Button text="Refresh / Update BG" type="submit" icon="ph:image-duotone" className={`${buttonSecondaryClass} w-full`} isLoading={loadingGameAction} disabled={loadingGameAction} />
                </form>


                <form onSubmit={handleUpdateMove} className="space-y-3 p-3 border border-slate-200 dark:border-slate-700/50 rounded-md bg-white/50 dark:bg-slate-800/30">
                  <h4 className="text-md font-semibold text-teal-600 dark:text-teal-400">Gerakkan Pion</h4>
                  <div>
                    <label htmlFor="movePlayer" className={labelClass}>Pemain ke-</label>
                    <select id="movePlayer" value={movePlayer} onChange={(e) => setMovePlayer(e.target.value)} className={inputBaseClass} disabled={!activeGame || parseInt(movePlayer) > activeGame.totalPlayers && activeGame.totalPlayers > 0}>
                      <option value="1">1 (Merah)</option>
                      <option value="2" disabled={!activeGame || activeGame.totalPlayers < 2}>2 (Hijau)</option>
                      {activeGame && activeGame.totalPlayers >= 3 && <option value="3">3 (Kuning)</option>}
                      {activeGame && activeGame.totalPlayers >= 4 && <option value="4">4 (Biru)</option>}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><label className={labelClass}>Pion A:</label><input type="number" value={movePieceA} onChange={e => setMovePieceA(e.target.value)} className={inputBaseClass} placeholder="0" min="0"/></div>
                    <div><label className={labelClass}>Pion B:</label><input type="number" value={movePieceB} onChange={e => setMovePieceB(e.target.value)} className={inputBaseClass} placeholder="0" min="0"/></div>
                    <div><label className={labelClass}>Pion C:</label><input type="number" value={movePieceC} onChange={e => setMovePieceC(e.target.value)} className={inputBaseClass} placeholder="0" min="0"/></div>
                    <div><label className={labelClass}>Pion D:</label><input type="number" value={movePieceD} onChange={e => setMovePieceD(e.target.value)} className={inputBaseClass} placeholder="0" min="0"/></div>
                  </div>
                  <Button text="Update Pion" type="submit" icon="ph:person-simple-run-duotone" className={`${buttonPrimaryClass} w-full`} isLoading={loadingGameAction} disabled={loadingGameAction} />
                </form>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button text="Reset Game Ini" icon="ph:arrow-counter-clockwise-duotone" onClick={() => openConfirmModal(handleResetActiveGame, `Yakin ingin mereset game ID: ${activeGame.id}?`)} className={`${buttonSecondaryClass} w-full sm:w-auto`} disabled={loadingGameAction} />
                    <Button text="Hapus Game Ini" icon="ph:trash-simple-duotone" onClick={() => openConfirmModal(handleDeleteActiveGame, `Yakin ingin menghapus game ID: ${activeGame.id}?`)} className={`${buttonSecondaryClass} !bg-red-500/20 hover:!bg-red-500/30 !text-red-600 dark:!text-red-400 w-full sm:w-auto`} disabled={loadingGameAction} />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <Modal
        activeModal={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setConfirmModalAction(null); }}
        title="Konfirmasi Aksi"
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button text="Batal" onClick={() => { setShowConfirmModal(false); setConfirmModalAction(null); }} className={buttonSecondaryClass} />
            <Button text="Lanjutkan" onClick={executeConfirmedAction} className={`${buttonPrimaryClass} !bg-red-500 hover:!bg-red-600`} />
          </div>
        }
      >
        <p className="text-slate-600 dark:text-slate-300 text-sm">{confirmModalMessage}</p>
      </Modal>

    </div>
  );
};

export default LudoPage;
