// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#000000",
        bgGradient: "radial-gradient(circle at 50% 30%, #111111 0%, #000000 70%)",
        headerBg: "rgba(10, 10, 10, 0.90)",
        headerBlur: "blur(25px)",
        accent: "#FF6D00",
        accentDark: "#E65100",
        accentDim: "rgba(255, 109, 0, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        border: "#1c1c1c",
        borderLight: "rgba(255,255,255,0.1)",
        sentBg: "linear-gradient(135deg, #E65100 0%, #FF6D00 100%)",
        sentText: "#ffffff",
        sentShadow: "0 4px 15px rgba(230, 81, 0, 0.25)",
        receivedBg: "#262626",
        receivedText: "#ffffff",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.2)",
        text: "#ffffff",
        textSecondary: "#a1a1a1",
        textMuted: "#666666",
        mobileToolbarBg: "rgba(15, 15, 15, 0.85)"
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
