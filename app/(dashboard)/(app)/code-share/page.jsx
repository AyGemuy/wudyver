"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import apiConfig from "@/configs/apiConfig";
import { useRouter } from 'next/navigation';

const WORDS_PER_SEGMENT = 50;
const DELETE_PASSWORD = apiConfig.PASSWORD;

const CodeSharePage = () => {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTag, setSelectedTag] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [showAddCodeModal, setShowAddCodeModal] = useState(false);
    const [expandedCodeSegments, setExpandedCodeSegments] = useState({});
    const [newCode, setNewCode] = useState({
        author: "",
        fileName: "",
        code: "",
        tag: ""
    });
    const [isDarkMode, setIsDarkMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(darkModeMediaQuery.matches);
        const handler = (e) => setIsDarkMode(e.matches);
        darkModeMediaQuery.addEventListener('change', handler);
        return () => darkModeMediaQuery.removeEventListener('change', handler);
    }, []);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedTag) params.append('tag', selectedTag);
            if (sortBy) params.append('sortBy', sortBy);

            const response = await fetch(`/api/code-share?${params.toString()}`);
            const data = await response.json();
            setCodes(data);
            setExpandedCodeSegments({});
        } catch (error) {
            toast.error("Gagal mengambil daftar kode");
            console.error("Error fetching codes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCode = async () => {
        if (!newCode.author || !newCode.fileName || !newCode.code) {
            toast.warn("Mohon isi semua kolom yang diperlukan (Penulis, Nama Berkas, Kode)");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('/api/code-share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCode),
            });
            if (response.ok) {
                toast.success("Kode berhasil dibagikan!");
                setNewCode({ author: "", fileName: "", code: "", tag: "" });
                setShowAddCodeModal(false);
                fetchCodes();
            } else {
                const error = await response.json();
                toast.error(error.message || "Gagal membagikan kode");
            }
        } catch (error) {
            toast.error("Gagal membagikan kode");
        } finally {
            setLoading(false);
        }
    };

    const updateCodeInteraction = async (id, actionType) => {
        try {
            const response = await fetch('/api/code-share', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: actionType }),
            });
            if (response.ok) {
                const updatedData = await response.json();
                setCodes(prevCodes =>
                    prevCodes.map(code =>
                        code._id === id ? { ...code, ...updatedData.code } : code
                    )
                );
            } else {
                const error = await response.json();
                toast.error(error.message || `Gagal ${actionType} kode`);
            }
        } catch (error) {
            toast.error(`Error saat ${actionType} kode.`);
        }
    };

    const handleLike = (id) => updateCodeInteraction(id, 'like');
    const handleDislike = (id) => updateCodeInteraction(id, 'dislike');
    const handleView = (id) => updateCodeInteraction(id, 'view');
    
    const handleViewCodePage = (id) => {
        handleView(id);
        router.push(`/code-share/${id}`);
    };

    const handleDeleteCode = async (id) => {
        if (!confirm("Apakah Anda yakin ingin menghapus kode ini?\nAnda akan diminta memasukkan password setelah ini.")) return;

        const enteredPassword = prompt(`Untuk menghapus kode ini, masukkan password:`);
        if (enteredPassword === null) {
            toast.info("Penghapusan kode dibatalkan.");
            return;
        }
        if (enteredPassword !== DELETE_PASSWORD) {
            toast.error("Password salah. Penghapusan kode dibatalkan.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/code-share', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (response.ok) {
                toast.success("Kode berhasil dihapus!");
                fetchCodes();
            } else {
                const error = await response.json();
                toast.error(error.message || "Gagal menghapus kode");
            }
        } catch (error) {
            toast.error("Gagal menghapus kode");
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm("Apakah Anda yakin ingin menghapus SEMUA kode? Tindakan ini tidak dapat diurungkan.\nAnda akan diminta memasukkan password setelah ini.")) return;

        const enteredPassword = prompt(`Untuk menghapus SEMUA kode, masukkan password:`);
        if (enteredPassword === null) {
            toast.info("Pembersihan semua kode dibatalkan.");
            return;
        }
        if (enteredPassword !== DELETE_PASSWORD) {
            toast.error("Password salah. Pembersihan semua kode dibatalkan.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/code-share', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true }),
            });
            if (response.ok) {
                toast.success("Semua kode berhasil dibersihkan!");
                setCodes([]);
                setExpandedCodeSegments({});
            } else {
                const error = await response.json();
                toast.error(error.message || "Gagal membersihkan kode");
            }
        } catch (error) {
            toast.error("Gagal membersihkan kode");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (codeText) => {
        navigator.clipboard.writeText(codeText)
            .then(() => toast.success("Kode disalin ke clipboard!"))
            .catch(() => toast.error("Gagal menyalin kode."));
    };

    const getCodeSegments = (codeText) => {
        const words = codeText.split(/\s+/);
        const segments = [];
        for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
            segments.push(words.slice(i, i + WORDS_PER_SEGMENT).join(' '));
        }
        return segments;
    };

    const showNextCodeSegment = (id) => {
        setExpandedCodeSegments(prevState => ({
            ...prevState,
            [id]: (prevState[id] || 1) + 1
        }));
    };

    const resetCodeView = (id) => {
        setExpandedCodeSegments(prevState => ({ ...prevState, [id]: 1 }));
    };

    const getLanguageFromFileName = (fileName) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const langMap = {
            js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
            json: 'json', html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
            py: 'python', rb: 'ruby', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c',
            php: 'php', go: 'go', rs: 'rust', swift: 'swift', kt: 'kotlin',
            md: 'markdown', yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell',
            log: 'text'
        };
        return langMap[extension] || 'plaintext';
    };

    useEffect(() => {
        fetchCodes();
    }, [searchTerm, selectedTag, sortBy]);

    const uniqueTags = [...new Set(codes.map(code => code.tag).filter(Boolean))];

    const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md shadow-sm text-sm p-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
    const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm";
    const buttonGradientBase = "text-white font-medium py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-md shadow-md text-xs sm:text-sm flex items-center justify-center transition-all duration-150 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed";
    const labelBaseClass = "block text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1 flex items-center";
    const syntaxHighlighterTheme = isDarkMode ? atomOneDark : atomOneLight;


    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                newestOnTop
                theme="colored"
                toastClassName={(o) =>
                    `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
                    ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-sky-500 text-white'}
                    dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
                }
            />
            <div className="w-full px-2 sm:px-4 py-4">
                <Card
                    bodyClass="relative p-0 h-full overflow-hidden"
                    className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
                >
                    <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
                        <div className="flex flex-col sm:flex-row items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                                <Icon icon="ph:code-block-duotone" className="text-xl sm:text-2xl" />
                            </div>
                            <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                                Manajer Berbagi Kode
                            </h1>
                        </div>
                        <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
                            Kelola dan bagikan cuplikan kode Anda!
                        </p>
                    </div>

                    <SimpleBar className="flex-grow overflow-y-auto">
                        <div className="p-3 sm:p-4">
                            <div className={`${sectionCardClass} mb-4`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                    <div>
                                        <label htmlFor="searchTermInput" className={labelBaseClass}>
                                            <Icon icon="ph:magnifying-glass-duotone" className="mr-1.5 text-sm sm:text-base" />
                                            Cari Berkas
                                        </label>
                                        <Textinput
                                            id="searchTermInput"
                                            type="text"
                                            placeholder="Cari nama berkas..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={inputBaseClass}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tagFilterSelect" className={labelBaseClass}>
                                            <Icon icon="ph:tag-duotone" className="mr-1.5 text-sm sm:text-base" />
                                            Filter Tag
                                        </label>
                                        <select id="tagFilterSelect" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className={inputBaseClass}>
                                            <option value="">Semua Tag</option>
                                            {uniqueTags.map(tag => (<option key={tag} value={tag}>{tag}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="sortBySelect" className={labelBaseClass}>
                                            <Icon icon="ph:sort-ascending-duotone" className="mr-1.5 text-sm sm:text-base" />
                                            Urutkan
                                        </label>
                                        <select id="sortBySelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inputBaseClass}>
                                            <option value="createdAt">Tanggal Dibuat</option>
                                            <option value="fileName">Nama Berkas</option>
                                            <option value="author">Penulis</option>
                                            <option value="likes">Suka</option>
                                            <option value="views">Dilihat</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                                <Button
                                    onClick={() => setShowAddCodeModal(true)}
                                    className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600`}
                                    disabled={loading}
                                    icon="ph:plus-circle-duotone"
                                    text="Tambah Kode Baru"
                                    iconPosition="left"
                                    iconClassName="text-sm sm:text-base mr-1.5"
                                />
                                <Button
                                    onClick={fetchCodes}
                                    className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600`}
                                    disabled={loading}
                                    icon="ph:arrow-clockwise-duotone"
                                    text="Segarkan"
                                    iconPosition="left"
                                    iconClassName="text-sm sm:text-base mr-1.5"
                                />
                                <Button
                                    onClick={handleClearAll}
                                    className={`${buttonGradientBase} bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600`}
                                    disabled={loading || codes.length === 0}
                                    icon="ph:trash-duotone"
                                    text="Bersihkan Semua"
                                    iconPosition="left"
                                    iconClassName="text-sm sm:text-base mr-1.5"
                                />
                            </div>

                            {loading && codes.length === 0 && (
                                <div className="text-center py-10 flex flex-col items-center justify-center min-h-[200px]">
                                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-emerald-500 mb-4" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Memuat daftar kode...</p>
                                </div>
                            )}

                            {!loading && codes.length === 0 && (
                                <div className={`${sectionCardClass} text-center py-10 sm:py-12`}>
                                    <Icon icon="ph:files-duotone" className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3" />
                                    <p className="text-base text-slate-500 dark:text-slate-400">Belum ada cuplikan kode.</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba tambahkan kode baru atau ubah filter Anda.</p>
                                </div>
                            )}

                            {!loading && codes.length > 0 && (
                                <div className="space-y-3 sm:space-y-4">
                                    {codes.map((code) => {
                                        const codeSegments = getCodeSegments(code.code);
                                        const segmentsToShow = expandedCodeSegments[code._id] || 1;
                                        const displayedCode = codeSegments.slice(0, segmentsToShow).join(' ');
                                        const hasMoreSegments = segmentsToShow < codeSegments.length;
                                        const codeLanguage = getLanguageFromFileName(code.fileName);

                                        return (
                                            <div key={code._id} className="bg-white dark:bg-slate-800/60 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-150">
                                                <div className="flex justify-between items-start mb-2 sm:mb-3">
                                                    <div className="flex-grow min-w-0">
                                                        <h6 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 flex items-center truncate">
                                                            <Icon icon="ph:file-code-duotone" className="mr-1.5 text-base sm:text-lg shrink-0" />
                                                            <span className="truncate" title={code.fileName}>{code.fileName}</span>
                                                        </h6>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center"><Icon icon="ph:identification-card-duotone" className="mr-0.5 sm:mr-1 text-xs sm:text-sm" /> ID: {code._id}</span>
                                                            <span className="flex items-center"><Icon icon="ph:user-circle-duotone" className="mr-0.5 sm:mr-1 text-xs sm:text-sm" /> {code.author}</span>
                                                            {code.tag && <span className="flex items-center bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded"><Icon icon="ph:tag-duotone" className="mr-0.5 sm:mr-1 text-xs sm:text-sm" />{code.tag}</span>}
                                                            <span className="flex items-center" title="Jumlah dilihat">
                                                                <Icon icon="ph:eye-duotone" className="mr-0.5 sm:mr-1 text-xs sm:text-sm" /> {code.views || 0} dilihat
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleDeleteCode(code._id)}
                                                        className="p-1 sm:p-1.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 dark:text-red-400 hover:text-red-600 ml-2 shrink-0"
                                                        disabled={loading}
                                                        icon="ph:trash-duotone"
                                                        iconClassName="text-sm sm:text-base"
                                                        title="Hapus Kode"
                                                    />
                                                </div>

                                                <div className="bg-slate-100 dark:bg-slate-900/70 rounded-md border border-slate-200 dark:border-slate-700/80 relative mt-1.5 overflow-hidden">
                                                    <SyntaxHighlighter
                                                        language={codeLanguage}
                                                        style={syntaxHighlighterTheme}
                                                        customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0px', maxHeight: '200px', fontSize: '13px' }}
                                                        showLineNumbers
                                                        wrapLines={true}
                                                        lineNumberStyle={{ color: '#9ca3af', fontSize: '0.7rem', userSelect: 'none', marginRight: '0.75em' }}
                                                        className="simple-scrollbar"
                                                    >
                                                        {displayedCode}
                                                    </SyntaxHighlighter>
                                                    <div className="flex flex-col sm:flex-row items-center justify-between mt-2.5 gap-1.5 sm:gap-2 p-2">
                                                        <Button
                                                            onClick={() => copyToClipboard(code.code)}
                                                            className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600`}
                                                            icon="ph:copy-duotone" text="Salin Kode" iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                                        />
                                                       <Button
                                                            onClick={() => handleViewCodePage(code._id)}
                                                            className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600`}
                                                            icon="ph:file-magnifying-glass-duotone" text="Lihat Kode" iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                                        />
                                                        {codeSegments.length > 1 && (
                                                            hasMoreSegments ? (
                                                                <Button
                                                                    onClick={() => showNextCodeSegment(code._id)}
                                                                    className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600`}
                                                                    icon="ph:caret-down-duotone" text={`Lanjut (${segmentsToShow * WORDS_PER_SEGMENT}/${code.code.split(/\s+/).length} kata)`} iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                                                />
                                                            ) : (
                                                                <Button
                                                                    onClick={() => resetCodeView(code._id)}
                                                                    className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600`}
                                                                    icon="ph:caret-up-duotone" text="Ringkas" iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center"><Icon icon="ph:calendar-duotone" className="mr-1 text-xs sm:text-sm" /> {new Date(code.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        <Button onClick={() => handleLike(code._id)} className="flex items-center gap-0.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors p-0.5 sm:p-1" disabled={loading}>
                                                            <Icon icon="ph:thumbs-up-duotone" className="text-xs sm:text-sm" /> <span className="font-medium">{code.likes || 0}</span>
                                                        </Button>
                                                        <Button onClick={() => handleDislike(code._id)} className="flex items-center gap-0.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-0.5 sm:p-1" disabled={loading}>
                                                            <Icon icon="ph:thumbs-down-duotone" className="text-xs sm:text-sm" /> <span className="font-medium">{code.dislikes || 0}</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SimpleBar>
                </Card>
            </div>

            <Modal
                title="Tambah Cuplikan Kode Baru"
                activeModal={showAddCodeModal}
                onClose={() => {
                    setShowAddCodeModal(false);
                    setNewCode({ author: "", fileName: "", code: "", tag: "" });
                }}
                className="max-w-xl border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
                footerContent={
                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button" text="Batal"
                            onClick={() => {
                                setShowAddCodeModal(false);
                                setNewCode({ author: "", fileName: "", code: "", tag: "" });
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150"
                            disabled={loading}
                        />
                        <Button
                            onClick={handleAddCode}
                            text="Simpan Kode"
                            className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600`}
                            disabled={loading || !newCode.author || !newCode.fileName || !newCode.code}
                            icon="ph:floppy-disk-back-duotone"
                            iconPosition="left"
                            iconClassName="text-sm sm:text-base mr-1.5"
                        />
                    </div>
                }
            >
                <div className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
                    <Textinput
                        label="Nama Penulis *"
                        placeholder="Nama Anda"
                        value={newCode.author}
                        onChange={(e) => setNewCode({ ...newCode, author: e.target.value })}
                        className={inputBaseClass}
                        labelClass={labelBaseClass}
                    />
                    <Textinput
                        label="Nama Berkas *"
                        placeholder="Contoh: script.js, style.css"
                        value={newCode.fileName}
                        onChange={(e) => setNewCode({ ...newCode, fileName: e.target.value })}
                        className={inputBaseClass}
                        labelClass={labelBaseClass}
                    />
                    <Textinput
                        label="Tag (Opsional)"
                        placeholder="Contoh: javascript, react, python"
                        value={newCode.tag}
                        onChange={(e) => setNewCode({ ...newCode, tag: e.target.value })}
                        className={inputBaseClass}
                        labelClass={labelBaseClass}
                    />
                    <div>
                        <label htmlFor="newCodeContent" className={labelBaseClass}>
                            Kode *
                        </label>
                        <Textinput
                            type="textarea" // Assuming Textinput component supports 'textarea' type
                            id="newCodeContent"
                            placeholder="Tulis atau tempel kode Anda di sini..."
                            value={newCode.code}
                            onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                            className={`${inputBaseClass} min-h-[150px]`}
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CodeSharePage;