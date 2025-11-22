// src/contexts/ThemeContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ACCENT_COLORS, AccentColor, Theme, ThemeContextType, ThemeMode } from '../types/theme.types';

const THEME_STORAGE_KEY = '@elementar_theme_mode';
const ACCENT_STORAGE_KEY = '@elementar_accent_color';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Generate theme object based on mode and accent color
const generateTheme = (mode: ThemeMode, accentColor: AccentColor): Theme => {
    const accent = ACCENT_COLORS[accentColor];

    if (mode === 'light') {
        return {
            // Background colors
            background: '#f5f5f5',
            surface: '#ffffff',
            surfaceVariant: '#fafafa',

            // Text colors
            text: '#000000',
            textSecondary: '#666666',
            textTertiary: '#999999',

            // Accent colors
            primary: accent.main,
            primaryLight: accent.light,
            primaryDark: accent.dark,

            // Message bubble colors
            messageBubbleMe: '#dcf8c6',
            messageBubbleOther: '#ffffff',
            messageTextMe: '#000000',
            messageTextOther: '#333333',

            // Border and divider colors
            border: '#dddddd',
            divider: '#e0e0e0',

            // Status colors
            success: '#4CAF50',
            warning: '#ff9800',
            error: '#e74c3c',

            // Other UI elements
            shadow: '#000000',
            overlay: 'rgba(0, 0, 0, 0.5)',
            placeholder: '#e0e0e0',
        };
    } else {
        // Dark mode
        return {
            // Background colors
            background: '#121212',
            surface: '#1e1e1e',
            surfaceVariant: '#2d2d2d',

            // Text colors
            text: '#ffffff',
            textSecondary: '#b0b0b0',
            textTertiary: '#808080',

            // Accent colors
            primary: accent.light,
            primaryLight: accent.main,
            primaryDark: accent.dark,

            // Message bubble colors
            messageBubbleMe: '#005c4b',
            messageBubbleOther: '#2d2d2d',
            messageTextMe: '#ffffff',
            messageTextOther: '#e0e0e0',

            // Border and divider colors
            border: '#3d3d3d',
            divider: '#2d2d2d',

            // Status colors
            success: '#66BB6A',
            warning: '#FFA726',
            error: '#EF5350',

            // Other UI elements
            shadow: '#000000',
            overlay: 'rgba(0, 0, 0, 0.7)',
            placeholder: '#3d3d3d',
        };
    }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
    const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
    const [isLoading, setIsLoading] = useState(true);

    // Load theme preferences from storage
    useEffect(() => {
        const loadThemePreferences = async () => {
            try {
                const [savedMode, savedAccent] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(ACCENT_STORAGE_KEY),
                ]);

                if (savedMode === 'light' || savedMode === 'dark') {
                    setMode(savedMode);
                }

                if (savedAccent && savedAccent in ACCENT_COLORS) {
                    setAccentColorState(savedAccent as AccentColor);
                }
            } catch (error) {
                console.error('Error loading theme preferences:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadThemePreferences();
    }, []);

    const toggleTheme = async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
        } catch (error) {
            console.error('Error saving theme mode:', error);
        }
    };

    const setAccentColor = async (color: AccentColor) => {
        setAccentColorState(color);
        try {
            await AsyncStorage.setItem(ACCENT_STORAGE_KEY, color);
        } catch (error) {
            console.error('Error saving accent color:', error);
        }
    };

    const theme = generateTheme(mode, accentColor);

    // Don't render children until theme is loaded
    if (isLoading) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, mode, accentColor, toggleTheme, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
