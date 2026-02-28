// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#000000",
        bgGradient: "url('bg.png') center/cover no-repeat fixed",
        headerBg: "#030A06",
        headerBlur: "blur(25px)",
        accent: "#0D4020",
        accentDark: "#072411",
        accentDim: "rgba(13, 64, 32, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        border: "#051A0C",
        borderLight: "rgba(13, 64, 32, 0.15)",
        sentBg: "linear-gradient(135deg, #072411 0%, #0D4020 100%)",
        sentText: "#ffffff",
        sentShadow: "0 4px 15px rgba(13, 64, 32, 0.25)",
        receivedBg: "#041408",
        receivedText: "#ffffff",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.2)",
        text: "#ffffff",
        textSecondary: "#A2B8AA",
        textMuted: "#5A7765",
        mobileToolbarBg: "#030A06",
        // SOLID HEX for Android Status Bar to remove the top border line
        statusBarColor: "#030A06"
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
