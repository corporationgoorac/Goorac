// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#000000",
        bgGradient: "radial-gradient(circle at 50% 30%, #061619 0%, #000000 70%)",
        headerBg: "#061619",
        headerBlur: "blur(25px)",
        accent: "#12434B",
        accentDark: "#0A282D",
        accentDim: "rgba(18, 67, 75, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        border: "#061A1F",
        borderLight: "rgba(18, 67, 75, 0.15)",
        sentBg: "linear-gradient(135deg, #0A282D 0%, #12434B 100%)",
        sentText: "#ffffff",
        sentShadow: "0 4px 15px rgba(18, 67, 75, 0.25)",
        receivedBg: "#081B1E",
        receivedText: "#ffffff",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.2)",
        text: "#ffffff",
        textSecondary: "#A2B5B8",
        textMuted: "#5A7377",
        mobileToolbarBg: "#061619",
        // SOLID HEX for Android Status Bar to remove the top border line
        statusBarColor: "#061619"
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
