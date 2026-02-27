// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#000000",
        bgGradient: "radial-gradient(circle at 50% 30%, #061A10 0%, #000000 70%)",
        headerBg: "rgba(6, 18, 12, 0.90)",
        headerBlur: "blur(25px)",
        accent: "#10B981",
        accentDark: "#047857",
        accentDim: "rgba(16, 185, 129, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        border: "#12221A",
        borderLight: "rgba(16, 185, 129, 0.15)",
        sentBg: "linear-gradient(135deg, #047857 0%, #10B981 100%)",
        sentText: "#ffffff",
        sentShadow: "0 4px 15px rgba(16, 185, 129, 0.25)",
        receivedBg: "#1A2A22",
        receivedText: "#ffffff",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.2)",
        text: "#ffffff",
        textSecondary: "#A7B8B0",
        textMuted: "#5F7068",
        mobileToolbarBg: "rgba(6, 18, 12, 0.85)"
    };

    // Apply the theme directly to the root CSS variables
    const root = document.documentElement;
    root.style.setProperty('--bg', window.chatTheme.bg);
    root.style.setProperty('--bg-gradient', window.chatTheme.bgGradient);
    root.style.setProperty('--header-bg', window.chatTheme.headerBg);
    root.style.setProperty('--header-blur', window.chatTheme.headerBlur);
    root.style.setProperty('--accent', window.chatTheme.accent);
    root.style.setProperty('--accent-dark', window.chatTheme.accentDark);
    root.style.setProperty('--accent-dim', window.chatTheme.accentDim);
    root.style.setProperty('--glass-border', window.chatTheme.glassBorder);
    root.style.setProperty('--border', window.chatTheme.border);
    root.style.setProperty('--border-light', window.chatTheme.borderLight);
    root.style.setProperty('--sent-bg', window.chatTheme.sentBg);
    root.style.setProperty('--sent-text', window.chatTheme.sentText);
    root.style.setProperty('--sent-shadow', window.chatTheme.sentShadow);
    root.style.setProperty('--received-bg', window.chatTheme.receivedBg);
    root.style.setProperty('--received-text', window.chatTheme.receivedText);
    root.style.setProperty('--received-shadow', window.chatTheme.receivedShadow);
    root.style.setProperty('--text', window.chatTheme.text);
    root.style.setProperty('--text-secondary', window.chatTheme.textSecondary);
    root.style.setProperty('--text-muted', window.chatTheme.textMuted);
})();
