'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Play, MusicNote, ChevronUp, ArrowLeft } from 'react-bootstrap-icons';
import { Toast, ToastContainer } from 'react-bootstrap';
import 'styles/theme.scss';
import NavbarVertical from '/layouts/navbars/NavbarVertical';
import NavbarTop from '/layouts/navbars/NavbarTop';
import Image from 'next/image';

export default function DashboardLayout({ children }) {
    const [showMenu, setShowMenu] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [pathname, setPathname] = useState(''); // State untuk menyimpan path saat ini

    const audioRef = useRef(null);

    useEffect(() => {
        // Set `pathname` dari `window.location.pathname`
        setPathname(window.location.pathname);
    }, []);

    const toggleMenu = () => setShowMenu(!showMenu);
    const toggleDarkMode = () => setDarkMode(!darkMode);

    const fadeInAudio = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0;
            audioRef.current.play();
            const fadeInInterval = setInterval(() => {
                if (audioRef.current.volume < 1) {
                    audioRef.current.volume += 0.05;
                } else {
                    clearInterval(fadeInInterval);
                }
            }, 50);
        }
    };

    const fadeOutAudio = () => {
        if (audioRef.current) {
            const fadeOutInterval = setInterval(() => {
                if (audioRef.current.volume > 0) {
                    audioRef.current.volume -= 0.05;
                } else {
                    clearInterval(fadeOutInterval);
                    audioRef.current.pause();
                }
            }, 50);
        }
    };

    const toggleAudio = () => {
        if (audioPlaying) {
            fadeOutAudio();
        } else {
            changeAudio();
            fadeInAudio();
        }
        setAudioPlaying(!audioPlaying);
    };

    const changeAudio = () => {
        if (audioRef.current) {
            audioRef.current.src = getRandomAudioUrl();
            audioRef.current.load();
        }
    };

    const handleAudioEnd = () => {
        changeAudio();
        fadeInAudio();
    };

    const handleClick = (type) => {
        let message = '';
        switch (type) {
            case 'welcome':
                message = darkMode ? "Welcome 🌙" : "Welcome ☀️";
                break;
            case 'darkMode':
                message = darkMode ? "Light mode activated" : "Dark mode activated";
                break;
            case 'music':
                message = audioPlaying ? "Audio paused" : "Audio is playing";
                break;
            case 'back':
                message = "Navigating to dashboard...";
                break;
            case 'playground':
                message = "Navigating to playground...";
                break;
            default:
                break;
        }
        setToastMessage(message);
        setShowToast(true);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        document.body.className = darkMode ? 'bg-dark' : 'bg-light';
    }, [darkMode]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = (currentScrollY / documentHeight) * 100;

            setScrollProgress(scrolled);

            setShowHeader(currentScrollY > lastScrollY);
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const getRandomAudioUrl = () => {
        const randomNum = Math.floor(Math.random() * 119) + 1;
        return `https://raw.githubusercontent.com/AyGemuy/Sound/main/sound${randomNum}.mp3`;
    };

    const isDashboard = pathname === '/dashboard'; // Cek jika path adalah /dashboard
    const isPlayground = pathname === '/playground'; // Cek jika path adalah /playground

    return (
        <div id="db-wrapper" className={`${showMenu ? '' : 'toggled'}`}>
            <div className={`header-card ${showHeader ? 'fade-in' : 'fade-out'}`}>
                <div className="header-content">
                    <h5 className="header-title" onClick={() => handleClick('welcome')}>
                        {darkMode ? 'Welcome 🌙' : 'Welcome ☀️'}
                    </h5>
                </div>
            </div>

            <div className="scroll-progress" style={{ height: `${scrollProgress}%` }}></div>

            <div className="navbar-vertical navbar">
                <NavbarVertical showMenu={showMenu} onClick={(value) => setShowMenu(value)} />
            </div>

            <div id="page-content">
                <NavbarTop data={{ showMenu, SidebarToggleMenu: toggleMenu }} />
                {children}
            </div>

            <audio ref={audioRef} loop={false} hidden onEnded={handleAudioEnd}>
                <source src={getRandomAudioUrl()} type="audio/mp3" />
            </audio>

            <button onClick={() => { toggleAudio(); handleClick('music'); }} className="btn-toggle-mode left-up-one">
                <MusicNote size={20} />
            </button>

            <button onClick={() => { toggleDarkMode(); handleClick('darkMode'); }} className="btn-toggle-mode left">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {!isDashboard && (
                <Link href="/dashboard" passHref>
                    <button onClick={() => handleClick('back')} className="btn-toggle-mode right">
                        <ArrowLeft size={20} />
                    </button>
                </Link>
            )}

            {!isPlayground && (
                <Link href="/playground" passHref>
                    <button onClick={() => handleClick('playground')} className="btn-toggle-mode right">
                        <Play size={20} />
                    </button>
                </Link>
            )}

            <ToastContainer className="p-3" position="middle-center">
                <Toast show={showToast} onClose={() => setShowToast(false)} delay={2000} autohide>
                    <Toast.Header closeButton={false}>
                        <Image src="/images/avatar/avatar-1.jpg" className="rounded me-2 avatar-xs" alt="..." />
                        <strong className="me-auto">Notification</strong>
                        <small>Clicked.</small>
                    </Toast.Header>
                    <Toast.Body>{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    );
}
