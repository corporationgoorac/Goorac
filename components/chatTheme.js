// components/chatTheme.js
(function() {
    window.chatTheme = {
        bg: "#05080C",
        bgGradient: "radial-gradient(circle at 50% 30%, #111A26 0%, #05080C 70%)",
        headerBg: "#05080C",
        headerBlur: "blur(25px)",
        accent: "#4A6A8A",
        accentDark: "#1C2C3D",
        accentDim: "rgba(74, 106, 138, 0.2)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        border: "#0A1017",
        borderLight: "rgba(74, 106, 138, 0.15)",
        sentBg: "linear-gradient(135deg, #1C2C3D 0%, #304961 100%)",
        sentText: "#ffffff",
        sentShadow: "0 4px 15px rgba(28, 44, 61, 0.3)",
        receivedBg: "#0B121A",
        receivedText: "#ffffff",
        receivedShadow: "0 2px 5px rgba(0,0,0,0.4)",
        text: "#E5EDF5",
        textSecondary: "#86A0B8",
        textMuted: "#526B82",
        mobileToolbarBg: "#05080C",
        // SOLID HEX for Android Status Bar to remove the top border line
        statusBarColor: "#05080C"
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
