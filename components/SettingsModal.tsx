import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SettingsProfile, AppSettings, TextFormatSettings } from '../types';
import FontSelector from './FontSelector';
import * as settingsService from '../services/settingsService';
import * as apiKeyService from '../services/apiKeyService';
import { useTranslation, languageLabels, Language } from '../services/i18n';


const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Japanese', 'Korean', 'Chinese (Simplified)', 'Russian', 'Arabic'
];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#808080', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4',
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#9E9E9E', '#607D8B',
  // Secondary Colors
  '#424242', '#E0E0E0', '#FF8A65', '#AED581', '#4FC3F7', '#7986CB', '#BA68C8', '#F06292',
  '#FFE082', '#A1887F', '#FFD180', '#8D6E63'
];

const EyedropperIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.5a1.5 1.5 0 011.06.44l3.536 3.535a1.5 1.5 0 010 2.122L6.12 18.07a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121L11.061 4.44A1.5 1.5 0 0110 3.5zM12 7.5a1 1 0 11-2 0 1 1 0 012 0z" />
        <path d="M4.343 14.343l1.414 1.414-2.121 2.122a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121l2.121-2.121z" />
    </svg>
);

// --- Icons for Text Formatting ---
const TextAlignLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 9a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);
const TextAlignCenterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);
const TextAlignRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 9a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm-6 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6 4a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);


interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  labelPrefix: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose, labelPrefix }) => {
  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={pickerRef} className="absolute z-20 bg-gray-800 p-3 rounded-lg shadow-2xl border border-gray-600 w-64 right-0 mt-2">
      <div className="grid grid-cols-8 gap-1 mb-3">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-6 h-6 rounded-full cursor-pointer transition-transform transform hover:scale-110 border-2"
            style={{ backgroundColor: c, borderColor: color.toLowerCase() === c.toLowerCase() ? '#38bdf8' : 'transparent' }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor={`${labelPrefix}-color-picker-input`} className="relative w-10 h-10 rounded-md overflow-hidden cursor-pointer border-2 border-gray-500">
           <input
            id={`${labelPrefix}-color-picker-input`}
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer border-none p-0 m-0"
           />
        </label>
        <input
          type="text"
          value={color.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Hex color code"
        />
      </div>
    </div>
  );
};


interface SettingsModalProps {
    profiles: SettingsProfile[];
    activeProfileId: string;
    currentUnsavedSettings: AppSettings;
    onSave: (profiles: SettingsProfile[], activeProfileId: string, visibleFonts: string[]) => void;
    onClose: () => void;
    fonts: string[];
    visibleFonts: string[];
    appVersion: string;
    onLoadSystemFonts: () => Promise<{ status: 'success', count: number } | { status: 'unsupported' } | { status: 'error', message: string }>;
    onLoadFontsFromFiles: (fileList: FileList) => Promise<{ loaded: string[], failed: string[] }>;
    onClearCustomFonts: () => Promise<boolean>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ profiles: initialProfiles, activeProfileId: initialActiveProfileId, currentUnsavedSettings, onSave, onClose, fonts, visibleFonts, appVersion, onLoadSystemFonts, onLoadFontsFromFiles, onClearCustomFonts }) => {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('profiles');
    
    // Initialize profiles state by merging any unsaved settings from the app into the initially active profile.
    // This function only runs on the first render, capturing the app's state when the modal opens.
    const [profiles, setProfiles] = useState<SettingsProfile[]>(() => 
      initialProfiles.map(p => 
        p.id === initialActiveProfileId ? { ...p, settings: currentUnsavedSettings } : p
      )
    );
    const [activeProfileId, setActiveProfileId] = useState(initialActiveProfileId);
    
    const [newProfileName, setNewProfileName] = useState('');
    const [activeColorPicker, setActiveColorPicker] = useState<'text' | 'stroke' | 'inpaint' | null>(null);
    const [localVisibleFonts, setLocalVisibleFonts] = useState(new Set(visibleFonts));
    const profileImportInputRef = useRef<HTMLInputElement>(null);
    const fontFileInputRef = useRef<HTMLInputElement>(null);
    const [fontLoadingStatus, setFontLoadingStatus] = useState('');
    const isFontApiSupported = useMemo(() => 'queryLocalFonts' in window, []);
    const [localApiKey, setLocalApiKey] = useState('');

    useEffect(() => {
        setLocalApiKey(apiKeyService.getStoredApiKey() || '');
    }, []);

    const handleSaveApiKey = () => {
        apiKeyService.saveApiKey(localApiKey);
        alert('API Key saved successfully!');
    };

    const activeProfileSettings = useMemo(() => {
        return profiles.find(p => p.id === activeProfileId)?.settings;
    }, [profiles, activeProfileId]);

    const handleSettingsChange = (path: string, value: any) => {
        setProfiles(currentProfiles =>
            currentProfiles.map(p => {
                if (p.id === activeProfileId) {
                    const keys = path.split('.');
                    const newSettings = JSON.parse(JSON.stringify(p.settings)); // Deep copy
                    let currentLevel: any = newSettings;

                    for (let i = 0; i < keys.length - 1; i++) {
                        const key = keys[i];
                        currentLevel = currentLevel[key];
                    }

                    currentLevel[keys[keys.length - 1]] = value;

                    return { ...p, settings: newSettings };
                }
                return p;
            })
        );
    };

    const handlePanelWidthChange = (panel: 'left' | 'right', value: number) => {
        if (!activeProfileSettings) return;
        const currentWidths = { ...activeProfileSettings.panelWidths };
        if (isNaN(value) || value < 0) value = 0;
        
        let newLeft = currentWidths.left;
        let newRight = currentWidths.right;

        if (panel === 'left') {
            newLeft = value;
        } else { // panel === 'right'
            newRight = value;
        }
        
        if (newLeft + newRight > 100) {
            if (panel === 'left') {
                newRight = 100 - newLeft;
            } else {
                newLeft = 100 - newRight;
            }
        }

        const newCenter = 100 - newLeft - newRight;
        
        handleSettingsChange('panelWidths', { left: newLeft, center: newCenter, right: newRight });
    };
    
    const handleCreateProfile = () => {
        if (!newProfileName.trim()) {
            alert('Please enter a name for the new profile.');
            return;
        }
        const settingsToClone = profiles.find(p => p.id === activeProfileId)?.settings;
        if (!settingsToClone) return;

        const newProfile: SettingsProfile = {
            id: Date.now().toString(),
            name: newProfileName.trim(),
            settings: settingsToClone,
        };
        setProfiles(prev => [...prev, newProfile]);
        setActiveProfileId(newProfile.id);
        setNewProfileName('');
    };
    
    const handleDeleteProfile = () => {
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete the "${profiles.find(p=>p.id === activeProfileId)?.name}" profile?`)) {
            const newProfiles = profiles.filter(p => p.id !== activeProfileId);
            setProfiles(newProfiles);
            setActiveProfileId(newProfiles[0].id);
        }
    };
    
    const handleSaveAndClose = () => {
        onSave(profiles, activeProfileId, Array.from(localVisibleFonts));
    }

    const handleResetLayoutToDefaults = () => {
        const defaults = settingsService.DEFAULT_SETTINGS;
        handleSettingsChange('panelWidths', defaults.panelWidths);
        handleSettingsChange('textAreaHeights', defaults.textAreaHeights);
    };

    const handleExportProfile = () => {
        const activeProfile = profiles.find(p => p.id === activeProfileId);
        if (!activeProfile) {
            alert("Could not find the active profile to export.");
            return;
        }

        const jsonString = JSON.stringify(activeProfile, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = activeProfile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeName}.prof`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        profileImportInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                let importedProfile: SettingsProfile = JSON.parse(text);

                // Basic validation
                if (!importedProfile.id || !importedProfile.name || !importedProfile.settings) {
                    throw new Error("Invalid profile format.");
                }
                
                // Merge with defaults to ensure all keys exist, making it robust for older profile versions
                const defaults = settingsService.DEFAULT_SETTINGS;
                const completeSettings: AppSettings = {
                    ...defaults,
                    ...importedProfile.settings,
                    defaultTextFormat: {
                        ...defaults.defaultTextFormat,
                        ...(importedProfile.settings.defaultTextFormat || {}),
                    },
                    panelWidths: importedProfile.settings.panelWidths || defaults.panelWidths,
                    textAreaHeights: importedProfile.settings.textAreaHeights || defaults.textAreaHeights,
                };
                importedProfile.settings = completeSettings;


                const existingIndex = profiles.findIndex(p => p.id === importedProfile.id);
                if (existingIndex > -1) {
                    if (window.confirm(`A profile with the ID "${importedProfile.id}" (${profiles[existingIndex].name}) already exists. Do you want to overwrite it?`)) {
                        const newProfiles = [...profiles];
                        newProfiles[existingIndex] = importedProfile;
                        setProfiles(newProfiles);
                        setActiveProfileId(importedProfile.id);
                    }
                } else {
                    setProfiles(prev => [...prev, importedProfile]);
                    setActiveProfileId(importedProfile.id);
                }

            } catch (error) {
                alert(`Failed to import profile: ${error instanceof Error ? error.message : "Unknown error"}`);
            } finally {
                // Reset the input value to allow re-importing the same file
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const isDefaultProfile = activeProfileId === 'default';

    const menuItems = [
        { id: 'profiles', label: t('profiles') },
        { id: 'translation', label: t('translation') },
        { id: 'text', label: t('defaultTextStyle') },
        { id: 'inpainting', label: t('cleaningInpainting') },
        { id: 'layout', label: t('layout') },
        { id: 'fonts', label: t('fontVisibility') },
        { id: 'shortcuts', label: t('shortcuts') },
        { id: 'apiKey', label: t('apiKey') },
    ];
    
    const handleFontVisibilityChange = (font: string, isVisible: boolean) => {
        setLocalVisibleFonts(prev => {
            const newSet = new Set(prev);
            if (isVisible) {
                newSet.add(font);
            } else {
                newSet.delete(font);
            }
            return newSet;
        });
    };

    const handleSelectAllFonts = () => {
        setLocalVisibleFonts(new Set(fonts));
    };

    const handleDeselectAllFonts = () => {
        setLocalVisibleFonts(new Set());
    };
    
    const handleLoadSystemFonts = async () => {
      setFontLoadingStatus(t('loading'));
      const result = await onLoadSystemFonts();
      if (result.status === 'success') {
          setFontLoadingStatus(t('systemFontsLoaded', { count: result.count }));
      } else {
          setFontLoadingStatus(t('systemFontsPermissionDenied'));
      }
    };

    const handleLoadFontFilesClick = () => {
        fontFileInputRef.current?.click();
    };

    const handleFontFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setFontLoadingStatus(t('loading'));
        const result = await onLoadFontsFromFiles(files);
        let status = '';
        if (result.loaded.length > 0) {
            status += t('fontsLoaded', { count: result.loaded.length });
        }
        if (result.failed.length > 0) {
            status += (status ? ' ' : '') + t('fontsFailed', { count: result.failed.length });
        }
        setFontLoadingStatus(status);
        if (e.target) e.target.value = ''; // Reset file input
    };

    const handleClearFonts = async () => {
        if (window.confirm(t('clearStoredFontsConfirmation'))) {
            setFontLoadingStatus(t('loading'));
            const success = await onClearCustomFonts();
            if (success) {
                alert(t('fontsCleared'));
                window.location.reload();
            } else {
                setFontLoadingStatus('Failed to clear fonts.');
            }
        }
    };

    const shortcuts = useMemo(() => {
        return [
            { keyKey: 'shortcutCtrlDrag', descriptionKey: 'panCanvas' },
            { keyKey: 'shortcutMouseWheel', descriptionKey: 'zoomCanvas' },
            { keyKey: 'shortcutShiftClick', descriptionKey: 'addOrRemoveBoxSelection' },
            { keyKey: 'shortcutArrowKeys', descriptionKey: 'nudgeSelectedBox' },
            { keyKey: 'shortcutShiftArrowKeys', descriptionKey: 'nudgeSelectedBoxLarge' },
            { keyKey: 'shortcutDelBackspace', descriptionKey: 'deleteOrInpaint' },
            { keyKey: 'shortcutEsc', descriptionKey: 'deselectClearSelection' },
            { keyKey: 'shortcutCtrlZCtrlY', descriptionKey: 'undoRedo' },
            { keyKey: 'shortcutAltA', descriptionKey: 'runAuto' },
            { keyKey: 'shortcutAltO', descriptionKey: 'runOcr' },
            { keyKey: 'shortcutAltT', descriptionKey: 'runTranslate' },
            { keyKey: 'shortcutShiftF1', descriptionKey: 'saveStyle1' },
            { keyKey: 'shortcutShiftF2', descriptionKey: 'saveStyle2' },
            { keyKey: 'shortcutShiftF3', descriptionKey: 'saveStyle3' },
            { keyKey: 'shortcutF1', descriptionKey: 'applyStyle1' },
            { keyKey: 'shortcutF2', descriptionKey: 'applyStyle2' },
            { keyKey: 'shortcutF3', descriptionKey: 'applyStyle3' },
            { keyKey: 'shortcutShiftCtrlX', descriptionKey: 'removePaintStrokes' },
            { keyKey: 'shortcutCtrl1', descriptionKey: 'zoomTo100' },
            { keyKey: 'shortcutAltB', descriptionKey: 'toggleBrushTool' },
            { keyKey: 'shortcutAltR', descriptionKey: 'setBrushRed' },
            { keyKey: 'shortcutAltW', descriptionKey: 'setBrushWhite' },
        ];
    }, []);
    
    if (!activeProfileSettings) {
      return null; // Should not happen, but a good safeguard
    }

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-full max-h-[80vh] shadow-xl border border-gray-600 flex overflow-hidden">
                <aside className="w-1/4 bg-gray-900 p-4 border-r border-gray-700 flex flex-col">
                    <div>
                        <h2 className="text-xl font-bold mb-6 text-indigo-400">{t('preferences')}</h2>
                        <nav>
                            <ul>
                                {menuItems.map(item => (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full text-left p-2 rounded-md transition-colors text-lg ${activeSection === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                    <div className="mt-auto pt-4 text-xs text-gray-500 break-words">
                        {appVersion}
                    </div>
                </aside>
                <main className="w-3/4 p-6 overflow-y-auto">
                    {activeSection === 'profiles' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('manageProfiles')}</h3>
                            <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                                <div>
                                    <label htmlFor="profile-select" className="block text-sm font-medium text-gray-300 mb-1">{t('activeProfile')}</label>
                                    <select
                                        id="profile-select"
                                        value={activeProfileId}
                                        onChange={(e) => setActiveProfileId(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {t('activeProfileHelp')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-600">
                                    <input
                                        ref={profileImportInputRef}
                                        type="file"
                                        accept=".prof"
                                        onChange={handleFileSelected}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={handleImportClick}
                                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                                    >
                                        {t('importProfile')}
                                    </button>
                                    <button
                                        onClick={handleExportProfile}
                                        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                                    >
                                        {t('exportProfile')}
                                    </button>
                                </div>

                                <button
                                    onClick={handleDeleteProfile}
                                    disabled={isDefaultProfile}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                   {isDefaultProfile ? t('cannotDeleteDefault') : t('deleteProfile')}
                                </button>
                            </div>
                            <div className="mt-6 space-y-4 bg-gray-700 p-4 rounded-lg">
                               <h4 className="text-lg font-semibold text-white">{t('createNewProfile')}</h4>
                               <p className="text-sm text-gray-400">{t('createNewProfileHelp')}</p>
                               <input
                                   type="text"
                                   placeholder={t('newProfileNamePlaceholder')}
                                   value={newProfileName}
                                   onChange={e => setNewProfileName(e.target.value)}
                                   className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                               />
                               <button onClick={handleCreateProfile} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                  {t('saveAsNewProfile')}
                               </button>
                            </div>
                        </div>
                    )}
                    {activeSection === 'translation' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('translationSettings')}</h3>
                            <div className="space-y-6 bg-gray-700 p-4 rounded-lg">
                                <div>
                                    <label htmlFor="language-select-settings" className="block text-sm font-medium text-gray-300">{t('defaultTargetLanguage')}</label>
                                    <select
                                        id="language-select-settings"
                                        value={activeProfileSettings.targetLanguage}
                                        onChange={(e) => handleSettingsChange('targetLanguage', e.target.value)}
                                        className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{t(lang)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="interface-language-select" className="block text-sm font-medium text-gray-300">{t('interfaceLanguage')}</label>
                                    <select
                                        id="interface-language-select"
                                        value={activeProfileSettings.interfaceLanguage}
                                        onChange={(e) => handleSettingsChange('interfaceLanguage', e.target.value)}
                                        className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {Object.entries(languageLabels).map(([langCode, langLabel]) => (
                                            <option key={langCode} value={langCode}>{langLabel}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'text' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('defaultTextStyle')}</h3>
                            <div className="space-y-4 p-3 rounded-lg bg-gray-700">
                                <div className="grid grid-cols-2 gap-2">
                                    <FontSelector
                                        fonts={fonts}
                                        selectedFont={activeProfileSettings.defaultTextFormat.fontFamily}
                                        onFontChange={font => handleSettingsChange('defaultTextFormat.fontFamily', font)}
                                        previewPosition="right"
                                    />
                                    <input type="number" value={activeProfileSettings.defaultTextFormat.fontSize} onChange={e => handleSettingsChange('defaultTextFormat.fontSize', parseInt(e.target.value, 10))} className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
                                        <button onClick={() => handleSettingsChange('defaultTextFormat.fontWeight', activeProfileSettings.defaultTextFormat.fontWeight === 'bold' ? 'normal' : 'bold')} className={`w-full p-1 rounded font-bold ${activeProfileSettings.defaultTextFormat.fontWeight === 'bold' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>B</button>
                                        <button onClick={() => handleSettingsChange('defaultTextFormat.fontStyle', activeProfileSettings.defaultTextFormat.fontStyle === 'italic' ? 'normal' : 'italic')} className={`w-full p-1 rounded italic ${activeProfileSettings.defaultTextFormat.fontStyle === 'italic' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>I</button>
                                        <button 
                                            title={t('defaultToUppercase')}
                                            onClick={() => handleSettingsChange('defaultTextFormat.textTransform', (activeProfileSettings.defaultTextFormat.textTransform || 'none') === 'uppercase' ? 'none' : 'uppercase')} 
                                            className={`w-full p-1 rounded font-serif flex justify-center items-center ${(activeProfileSettings.defaultTextFormat.textTransform || 'none') === 'uppercase' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                                                Aa
                                        </button>
                                    </div>
                                    <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
                                        <button title={t('alignLeft')} onClick={() => handleSettingsChange('defaultTextFormat.textAlign', 'left')} className={`w-full p-1 rounded flex justify-center items-center ${activeProfileSettings.defaultTextFormat.textAlign === 'left' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                                            <TextAlignLeftIcon />
                                        </button>
                                        <button title={t('alignCenter')} onClick={() => handleSettingsChange('defaultTextFormat.textAlign', 'center')} className={`w-full p-1 rounded flex justify-center items-center ${activeProfileSettings.defaultTextFormat.textAlign === 'center' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                                            <TextAlignCenterIcon />
                                        </button>
                                        <button title={t('alignRight')} onClick={() => handleSettingsChange('defaultTextFormat.textAlign', 'right')} className={`w-full p-1 rounded flex justify-center items-center ${activeProfileSettings.defaultTextFormat.textAlign === 'right' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                                            <TextAlignRightIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative flex justify-between items-center">
                                    <label className="text-sm text-gray-400">{t('textColor')}</label>
                                    <button onClick={() => setActiveColorPicker(activeColorPicker === 'text' ? null : 'text')} className="w-24 h-8 rounded-md border-2 border-gray-500 cursor-pointer" style={{ backgroundColor: activeProfileSettings.defaultTextFormat.color }} />
                                    {activeColorPicker === 'text' && <ColorPicker color={activeProfileSettings.defaultTextFormat.color} onChange={c => handleSettingsChange('defaultTextFormat.color', c)} onClose={() => setActiveColorPicker(null)} labelPrefix="settings-text" />}
                                </div>
                                <div className="space-y-3 pt-3 border-t border-gray-600">
                                    <h4 className="text-sm font-medium text-gray-300 -mb-1">{t('stroke')}</h4>
                                    <div className="relative flex justify-between items-center">
                                        <label className="text-sm text-gray-400">{t('color')}</label>
                                        <button onClick={() => setActiveColorPicker(activeColorPicker === 'stroke' ? null : 'stroke')} className="w-24 h-8 rounded-md border-2 border-gray-500 cursor-pointer" style={{ backgroundColor: activeProfileSettings.defaultTextFormat.strokeColor }} />
                                        {activeColorPicker === 'stroke' && <ColorPicker color={activeProfileSettings.defaultTextFormat.strokeColor} onChange={c => handleSettingsChange('defaultTextFormat.strokeColor', c)} onClose={() => setActiveColorPicker(null)} labelPrefix="settings-stroke" />}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-gray-400">{t('strokeWidth')}</label>
                                        <input type="number" min="0" max="10" step="0.5" value={activeProfileSettings.defaultTextFormat.strokeWidth} onChange={e => handleSettingsChange('defaultTextFormat.strokeWidth', parseFloat(e.target.value))} className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm w-24 focus:ring-indigo-500 focus:border-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">{t('lineSpacing', { value: activeProfileSettings.defaultTextFormat.lineHeight })}</label>
                                    <input type="range" min="0.8" max="3" step="0.1" value={activeProfileSettings.defaultTextFormat.lineHeight} onChange={(e) => handleSettingsChange('defaultTextFormat.lineHeight', parseFloat(e.target.value))} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">{t('wordSpacing', { value: activeProfileSettings.defaultTextFormat.wordSpacing })}</label>
                                    <input type="range" min="-10" max="20" step="0.5" value={activeProfileSettings.defaultTextFormat.wordSpacing} onChange={(e) => handleSettingsChange('defaultTextFormat.wordSpacing', parseFloat(e.target.value))} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'inpainting' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('cleaningInpainting')}</h3>
                            <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    {t('inpaintingHelp')}
                                </p>
                                <div className="flex items-center justify-between pt-2">
                                    <label htmlFor="default-auto-color-toggle" className="text-sm font-medium text-gray-300">{t('defaultAutoColor')}</label>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="default-auto-color-toggle" className="sr-only peer" checked={activeProfileSettings.inpaintAutoColor} onChange={e => handleSettingsChange('inpaintAutoColor', e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </div>
                                <div className={`relative flex justify-between items-center transition-opacity ${activeProfileSettings.inpaintAutoColor ? 'opacity-50' : ''}`}>
                                    <label className="text-sm font-medium text-gray-300">{t('defaultManualColor')}</label>
                                    <button 
                                      onClick={() => !activeProfileSettings.inpaintAutoColor && setActiveColorPicker(activeColorPicker === 'inpaint' ? null : 'inpaint')} 
                                      className="w-24 h-8 rounded-md border-2 border-gray-500 cursor-pointer disabled:cursor-not-allowed" 
                                      style={{ backgroundColor: activeProfileSettings.inpaintManualColor }}
                                      disabled={activeProfileSettings.inpaintAutoColor}
                                    />
                                    {activeColorPicker === 'inpaint' && <ColorPicker color={activeProfileSettings.inpaintManualColor} onChange={c => handleSettingsChange('inpaintManualColor', c)} onClose={() => setActiveColorPicker(null)} labelPrefix="settings-inpaint" />}
                                </div>
                            </div>
                        </div>
                    )}
                     {activeSection === 'layout' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('defaultLayout')}</h3>
                            <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    {t('layoutHelp')}
                                </p>
                                
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-200 mb-2">{t('panelWidths')}</h4>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">{t('leftPanel')}</label>
                                            <input type="number" value={activeProfileSettings.panelWidths.left} onChange={e => handlePanelWidthChange('left', parseInt(e.target.value, 10))} className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">{t('centerPanel')}</label>
                                            <div className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-gray-400">{activeProfileSettings.panelWidths.center.toFixed(0)}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">{t('rightPanel')}</label>
                                            <input type="number" value={activeProfileSettings.panelWidths.right} onChange={e => handlePanelWidthChange('right', parseInt(e.target.value, 10))} className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold text-gray-200 mb-2">{t('textAreaHeights')}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">{t('sourceTextArea')}</label>
                                            <input type="number" value={activeProfileSettings.textAreaHeights.source} onChange={e => handleSettingsChange('textAreaHeights.source', parseInt(e.target.value, 10))} className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">{t('displayTextArea')}</label>
                                            <input type="number" value={activeProfileSettings.textAreaHeights.display} onChange={e => handleSettingsChange('textAreaHeights.display', parseInt(e.target.value, 10))} className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-600">
                                     <button onClick={handleResetLayoutToDefaults} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                        {t('resetLayout')}
                                     </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'fonts' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('fontVisibility')}</h3>
                            <p className="text-gray-400 mb-4">
                                {t('fontVisibilityHelp')}
                            </p>
                            <div className="flex space-x-2 mb-4">
                                <button onClick={handleSelectAllFonts} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('selectAllFonts')}</button>
                                <button onClick={handleDeselectAllFonts} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('deselectAllFonts')}</button>
                            </div>
                            <div className="bg-gray-700 p-4 rounded-lg max-h-72 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                {fonts.map(font => (
                                    <div key={font} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`font-toggle-${font}`}
                                            checked={localVisibleFonts.has(font)}
                                            onChange={(e) => handleFontVisibilityChange(font, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`font-toggle-${font}`} className="ml-2 text-sm text-gray-200 truncate" style={{ fontFamily: font }}>
                                            {font}
                                        </label>
                                    </div>
                                ))}
                            </div>
                             <div className="mt-6 pt-4 border-t border-gray-600">
                                <h4 className="text-lg font-semibold text-white mb-2">{t('systemFontsSectionTitle')}</h4>
                                {isFontApiSupported ? (
                                    <>
                                        <p className="text-gray-400 text-sm mb-2">{t('loadSystemFontsHelp')}</p>
                                        <button onClick={handleLoadSystemFonts} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('loadSystemFonts')}</button>
                                    </>
                                ) : (
                                    <>
                                        <input ref={fontFileInputRef} type="file" multiple accept=".ttf,.otf,.woff,.woff2" onChange={handleFontFilesSelected} className="hidden" />
                                        <p className="text-gray-400 text-sm mb-2">{t('fontApiNotSupportedFallback')}</p>
                                        <button onClick={handleLoadFontFilesClick} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('loadFontFiles')}</button>
                                    </>
                                )}
                                {fontLoadingStatus && <p className="text-gray-300 mt-2 text-sm">{fontLoadingStatus}</p>}
                                <div className="mt-4">
                                    <button 
                                        onClick={handleClearFonts} 
                                        className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                                    >
                                        {t('clearStoredFonts')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'shortcuts' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('shortcuts')}</h3>
                            <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                                <p className="text-gray-300 text-sm">
                                    {t('shortcutsHelp')}
                                </p>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                    {shortcuts.map(({ keyKey, descriptionKey }) => {
                                        const keyText = t(keyKey);
                                        return (
                                            <div key={keyKey} className="flex justify-between items-center bg-gray-800 p-3 rounded-md text-sm">
                                                <span className="text-gray-200">{t(descriptionKey)}</span>
                                                <div className="flex space-x-1">
                                                    {keyText.split(' / ').map(k_part => (
                                                        <code key={k_part} className="bg-gray-900 px-2 py-1 rounded text-indigo-400 font-mono border border-gray-700">{k_part}</code>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'apiKey' && (
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-white">{t('apiKey')}</h3>
                            <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                                <p className="text-gray-300">
                                    La chiave API verrà salvata nel browser. Se vuota, l'applicazione tenterà di utilizzare la chiave dal file `.env.local` come fallback.
                                </p>
                                <div>
                                    <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300 mb-1">Google Gemini API Key</label>
                                    <input
                                        id="api-key-input"
                                        type="password"
                                        value={localApiKey}
                                        onChange={e => setLocalApiKey(e.target.value)}
                                        placeholder="Enter your API Key here"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveApiKey}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    Salva Chiave API
                                </button>
                                <p className="text-gray-300 text-sm pt-2 border-t border-gray-600">
                                    Per ottenere una chiave, visita Google AI Studio.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
                <div className="absolute bottom-0 right-0 p-4 bg-gray-800 w-3/4 flex justify-end space-x-3 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('cancel')}</button>
                    <button onClick={handleSaveAndClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('saveAndClose')}</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;