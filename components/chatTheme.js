// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#050709",
        bgGradient: "radial-gradient(circle at 50% 30%, #0B1014 0%, #050709 70%)",
        headerBg: "#0B1014",
        headerBlur: "blur(25px)",
        accent: "#2A3F4C",
        accentDark: "#1D2C36",
        accentDim: "rgba(42, 63, 76, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.05)",
        border: "#151D24",
        borderLight: "rgba(255, 255, 255, 0.06)",
        sentBg: "linear-gradient(135deg, #1D2C36 0%, #2A3F4C 100%)",
        sentText: "#F0F4F8",
        sentShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
        receivedBg: "#121A21",
        receivedText: "#E2E8F0",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.5)",
        text: "#F0F4F8",
        textSecondary: "#94A3B8",
        textMuted: "#475569",
        mobileToolbarBg: "#0B1014",
        // SOLID HEX for Android Status Bar to remove the top border line
        statusBarColor: "#0B1014"
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
    root.style.setProperty('--mobileToolbarBg', window.chatTheme.mobileToolbarBg);

    // DYNAMIC META TAG INJECTION
    // This forces the Android system bar to match your theme color automatically
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", window.chatTheme.statusBarColor);
    } else {
        // Create the tag if it doesn't exist in the HTML head
        const meta = document.createElement('meta');
        meta.name = "theme-color";
        meta.content = window.chatTheme.statusBarColor;
        document.getElementsByTagName('head')[0].appendChild(meta);
    }
})();
