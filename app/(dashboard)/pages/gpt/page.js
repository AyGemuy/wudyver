// pages/index.js
'use client';

import { useState } from 'react';

const GptPage = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = async () => {
        if (message.trim()) {
            setMessages([...messages, { user: true, text: message }]);
            setMessage('');
            setIsTyping(true);
            try {
                const res = await fetch(`/api/ai/gpt4v?prompt=${encodeURIComponent(message)}`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch: ${res.status}`);
                }
                const data = (await res.json())?.result;
                const aiResponse = data?.message || "Gpt tidak memiliki respons.";
                setMessages(prevMessages => [
                    ...prevMessages,
                    { user: false, text: aiResponse },
                ]);
            } catch (error) {
                setMessages(prevMessages => [
                    ...prevMessages,
                    { user: false, text: 'Terjadi kesalahan saat mendapatkan respons.' },
                ]);
                console.error('Error fetching API:', error);
            } finally {
                setIsTyping(false);
            }
        }
    };

    return (
        <div style={styles.chatContainer}>
            <div style={styles.chatHeader}>
                <div style={styles.botAvatar}></div>
                <div style={styles.botStatus}>
                    <h2 style={styles.botName}>AI Assistant</h2>
                    <div style={styles.statusIndicator}>
                        <div style={styles.statusDot}></div>
                        <span style={styles.statusText}>
                            {isTyping ? 'Mengetik...' : 'Online - Ready to help'}
                        </span>
                    </div>
                </div>
            </div>

            <div style={styles.chatMessages}>
                {messages.length === 0 ? (
                    <div style={styles.emptyMessage}>Belum ada percakapan. Mulai chat sekarang!</div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                ...styles.messageGroup,
                                alignSelf: msg.user ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div style={styles.messageContainer}>
                                <div
                                    style={{
                                        ...styles.messageAvatar,
                                        backgroundColor: msg.user ? '#4F46E5' : '#1F2937',
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{msg.user ? '👤' : '🤖'}</span>
                                </div>
                                <div
                                    style={{
                                        ...styles.message,
                                        backgroundColor: msg.user ? '#4F46E5' : '#1F2937',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={styles.chatInput}>
                <div style={styles.inputContainer}>
                    <div style={styles.messageInputWrapper}>
                        <input
                            type="text"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Ketik pesan Anda di sini..."
                            style={styles.input}
                        />
                    </div>
                    <button onClick={sendMessage} style={styles.sendButton}>
                        <span>Kirim</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(31,41,55,1) 100%)',
        color: '#E5E7EB',
        fontFamily: 'Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    chatHeader: {
        padding: '12px 16px',
        background: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: '0',
        zIndex: '100',
    },
    botAvatar: {
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
    },
    botStatus: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    botName: {
        fontSize: '16px',
        fontWeight: '600',
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        color: '#9CA3AF',
    },
    statusDot: {
        width: '6px',
        height: '6px',
        background: '#10B981',
        borderRadius: '50%',
    },
    statusText: {
        transition: 'all 0.3s ease',
    },
    chatMessages: {
        flex: '1',
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    emptyMessage: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#6B7280',
        fontSize: '14px',
        textAlign: 'center',
        width: '100%',
        padding: '0 20px',
    },
    messageGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxWidth: '85%',
        opacity: 0,
        transform: 'translateY(10px)',
        animation: 'messageAppear 0.3s forwards',
    },
    messageContainer: {
        display: 'flex',
        gap: '8px',
    },
    messageAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
    },
    message: {
        padding: '10px 14px',
        borderRadius: '16px',
        fontSize: '14px',
        lineHeight: '1.4',
        wordWrap: 'break-word',
    },
    chatInput: {
        padding: '12px 16px',
        background: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        bottom: '0',
        zIndex: '100',
    },
    inputContainer: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
    },
    messageInputWrapper: {
        flex: '1',
        minWidth: '0',
    },
    input: {
        flex: '1',
        background: 'none',
        border: 'none',
        outline: 'none',
        color: '#E5E7EB',
        fontSize: '14px',
        padding: '8px 0',
    },
    sendButton: {
        background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '24px',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '40px',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
    },
};

export default GptPage;
