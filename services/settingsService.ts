import { SettingsProfile, AppSettings, TextFormatSettings, PanelWidths, TextAreaHeights } from '../types';

const PROFILES_KEY = 'comic-translator-profiles';
const ACTIVE_PROFILE_KEY = 'comic-translator-active-profile-id';
const VISIBLE_FONTS_KEY = 'comic-translator-visible-fonts';

const DEFAULT_TEXT_FORMAT: TextFormatSettings = {
    fontFamily: 'Patrick Hand',
    fontSize: 50,
    textAlign: 'center',
    fontWeight: 'bold',
    fontStyle: 'normal',
    lineHeight: 1.2,
    wordSpacing: 0,
    color: '#000000',
    strokeColor: '#FFFFFF',
    strokeWidth: 0,
    textTransform: 'uppercase',
};

export const DEFAULT_SETTINGS: AppSettings = {
    targetLanguage: 'Italian',
    interfaceLanguage: 'en',
    defaultTextFormat: DEFAULT_TEXT_FORMAT,
    brushColor: '#FFFFFF',
    paintBrushSize: 15,
    selectionEraserSize: 15,
    // FIX: Added missing properties to satisfy the AppSettings type.
    brushShape: 'round',
    brushHardness: 1,
    brushOpacity: 1,
    panelWidths: { left: 20, center: 55, right: 25 },
    textAreaHeights: { source: 80, display: 120 },
    inpaintAutoColor: true,
    inpaintManualColor: '#FFFFFF',
    styleSlots: [null, null, null],
};

export const getDefaultProfile = (): SettingsProfile => ({
    id: 'default',
    name: 'Default',
    settings: DEFAULT_SETTINGS,
});


export const loadProfiles = (): SettingsProfile[] => {
    try {
        const data = localStorage.getItem(PROFILES_KEY);
        if (data) {
            const profiles = JSON.parse(data);
            if (Array.isArray(profiles) && profiles.every(p => p.id && p.name && p.settings)) {
                // Merge with defaults to handle users with old settings format
                return profiles.map(p => ({
                    ...p,
                    settings: {
                        ...DEFAULT_SETTINGS,
                        ...p.settings,
                        defaultTextFormat: {
                            ...DEFAULT_SETTINGS.defaultTextFormat,
                            ...(p.settings.defaultTextFormat || {}),
                        },
                    },
                }));
            }
        }
    } catch (error) {
        console.error("Failed to load or parse profiles from localStorage:", error);
    }
    return [getDefaultProfile()];
};

export const saveProfiles = (profiles: SettingsProfile[]): void => {
    try {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (error) {
        console.error("Failed to save profiles to localStorage:", error);
    }
};

export const loadActiveProfileId = (): string | null => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
};

export const saveActiveProfileId = (id: string): void => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
};

export const saveVisibleFonts = (fonts: string[]): void => {
    try {
        localStorage.setItem(VISIBLE_FONTS_KEY, JSON.stringify(fonts));
    } catch (error) {
        console.error("Failed to save visible fonts to localStorage:", error);
    }
};

export const loadVisibleFonts = (): string[] | null => {
    try {
        const data = localStorage.getItem(VISIBLE_FONTS_KEY);
        if (data) {
            const fonts = JSON.parse(data);
            if (Array.isArray(fonts)) {
                return fonts;
            }
        }
    } catch (error) {
        console.error("Failed to load or parse visible fonts from localStorage:", error);
    }
    return null;
};