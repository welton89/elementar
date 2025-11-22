// src/types/theme.types.ts

export type ThemeMode = 'light' | 'dark';

export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'teal' | 'indigo';

export interface Theme {
    // Background colors
    background: string;
    surface: string;
    surfaceVariant: string;

    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;

    // Accent colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Message bubble colors
    messageBubbleMe: string;
    messageBubbleOther: string;
    messageTextMe: string;
    messageTextOther: string;

    // Border and divider colors
    border: string;
    divider: string;

    // Status colors
    success: string;
    warning: string;
    error: string;

    // Other UI elements
    shadow: string;
    overlay: string;
    placeholder: string;
}

export interface ThemeContextType {
    theme: Theme;
    mode: ThemeMode;
    accentColor: AccentColor;
    toggleTheme: () => void;
    setAccentColor: (color: AccentColor) => void;
}

// Accent color palette
export const ACCENT_COLORS: Record<AccentColor, { light: string; main: string; dark: string }> = {
    blue: {
        light: '#64B5F6',
        main: '#007bff',
        dark: '#1976D2',
    },
    purple: {
        light: '#BA68C8',
        main: '#9C27B0',
        dark: '#7B1FA2',
    },
    green: {
        light: '#81C784',
        main: '#4CAF50',
        dark: '#388E3C',
    },
    orange: {
        light: '#FFB74D',
        main: '#FF9800',
        dark: '#F57C00',
    },
    red: {
        light: '#E57373',
        main: '#F44336',
        dark: '#D32F2F',
    },
    pink: {
        light: '#F06292',
        main: '#E91E63',
        dark: '#C2185B',
    },
    teal: {
        light: '#4DB6AC',
        main: '#009688',
        dark: '#00796B',
    },
    indigo: {
        light: '#7986CB',
        main: '#3F51B5',
        dark: '#303F9F',
    },
};
