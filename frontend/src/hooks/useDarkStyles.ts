'use client';

import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { isDarkTheme } from '@/lib/themeUtils';

export interface DarkStyles {
    card: React.CSSProperties;
    modal: React.CSSProperties;
    tableText: React.CSSProperties;
    divider: string;
    noteTint: string;
    progressTrack: string;
    toggleOff: string;
    totalTint: string;
}

/**
 * Derives the full set of dark-mode-aware style overrides from the
 * current theme.  Returns both darkStyles and theme so consumers
 * skip a separate useTheme() call.
 */
export function useDarkStyles() {
    const { theme } = useTheme();
    const isDark = isDarkTheme(theme.colors.background);

    const darkStyles: DarkStyles = isDark
        ? {
            card:          { backgroundColor: 'rgba(255,255,255,0.08)', color: theme.colors.text },
            modal:         { backgroundColor: 'rgba(255,255,255,0.1)',  color: theme.colors.text },
            tableText:     { color: theme.colors.text },
            divider:       'rgba(255,255,255,0.1)',
            noteTint:      'rgba(255,255,255,0.06)',
            progressTrack: 'rgba(255,255,255,0.12)',
            toggleOff:     'rgba(255,255,255,0.15)',
            totalTint:     'rgba(255,255,255,0.08)',
        }
        : {
            card:          {} as React.CSSProperties,
            modal:         {} as React.CSSProperties,
            tableText:     {} as React.CSSProperties,
            divider:       '#e1e5e9',
            noteTint:      `${theme.colors.primary}12`,
            progressTrack: '#e1e5e9',
            toggleOff:     '#d1d5db',
            totalTint:     `${theme.colors.primary}1a`,
        };

    return { darkStyles, theme };
}
