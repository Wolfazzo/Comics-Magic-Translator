import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import FilePanel from './components/FilePanel';
import CanvasPanel from './components/CanvasPanel';
import ToolsPanel from './components/ToolsPanel';
import LayersPanel from './components/LayersPanel';
import SettingsModal from './components/SettingsModal';
import OriginalImageViewer from './components/OriginalImageViewer';
import ImageEditorModal from './components/ImageEditorModal';
import NotesModal from './components/NotesModal';
import { Note, TextBox, AppStatus, PanelWidths, ImageData, Stroke, SettingsProfile, AppSettings, TextFormatSettings, PathPoint, TextAreaHeights, Tool, AppState, Style, StyleSpan, BrushShape, History, ProjectFile, ProjectFileManifestItem } from './types';
import { extractTextsFromImage, translateText, translateMultipleTexts, ApiKeyError } from './services/geminiService';
import { drawStrokesOnCanvas, drawWrappedTextOnCanvas } from './services/canvasUtils';
import * as imageProcessing from './services/imageProcessing';
import * as settingsService from './services/settingsService';
import * as apiCounterService from './services/apiCounterService';
import * as notesService from './services/notesService';
import * as fontDbService from './services/fontDbService';
import { Language, LanguageContext, translations, useTranslation } from './services/i18n';
import './index.css'

declare const JSZip: any;
declare const jspdf: any;

interface FileWithUrl {
  file: File;
  url: string;
}

// Helper types for the new flexible formatting
type StyleChange = Partial<Style>;
interface Selection {
  start: number;
  end: number;
}

// --- START: Text Formatting Logic ---

// This function parses a string with our custom <style> tags and returns plain text and an array of style spans.
// It's used to upgrade text boxes from the old format to the new one.
function parseTaggedText(text: string | undefined): { plainText: string; styleSpans: StyleSpan[] } {
    if (!text) return { plainText: '', styleSpans: [] };

    const upgradedText = text
        .replace(/<sup>/g, '<style isSuperscript="true">')
        .replace(/<\/sup>/g, '</style>')
        .replace(/<color value="([^"]+)">/g, '<style color="$1">')
        .replace(/<\/color>/g, '</style>');

    let plainText = '';
    const spans: StyleSpan[] = [];
    const styleStack: Style[] = [{}];
    const tokenizer = /(<style [^>]*>|<\/style>|[^<>]+)/g;
    const tokens = upgradedText.match(tokenizer) || [];
    const attrParser = /(\w+)="([^"]+)"/g;

    for (const token of tokens) {
        if (token.startsWith('<style')) {
            const newStyle = { ...styleStack[styleStack.length - 1] };
            let match;
            while ((match = attrParser.exec(token)) !== null) {
                const key = match[1] as keyof Style;
                let value: any = match[2];
                if (key === 'fontSize' || key === 'strokeWidth' || key === 'lineHeight' || key === 'wordSpacing') value = parseFloat(value);
                else if (key === 'isSuperscript') value = value === 'true';
                (newStyle as any)[key] = value;
            }
            styleStack.push(newStyle);
        } else if (token === '</style>') {
            if (styleStack.length > 1) styleStack.pop();
        } else {
            if (token.length > 0) {
                const currentStyle = styleStack[styleStack.length - 1];
                if (Object.keys(currentStyle).length > 0) {
                    spans.push({
                        start: plainText.length,
                        end: plainText.length + token.length,
                        style: currentStyle,
                    });
                }
                plainText += token;
            }
        }
    }
    return { plainText, styleSpans: spans };
}

// This function takes plain text and style spans and reconstructs the string with <style> tags,
// which is what the canvas rendering function expects.
function serializeSpansToTaggedText(plainText: string, spans: StyleSpan[]): string {
    if (!spans || spans.length === 0) return plainText;

    const events: { index: number; type: 'start' | 'end'; style?: Style }[] = [];
    spans.forEach(span => {
        events.push({ index: span.start, type: 'start', style: span.style });
        events.push({ index: span.end, type: 'end' });
    });
    events.sort((a, b) => a.index - b.index || (a.type === 'end' ? -1 : 1));

    let result = '';
    let lastIndex = 0;
    const openTags: Style[] = [];

    events.forEach(event => {
        if (event.index > lastIndex) {
            result += plainText.substring(lastIndex, event.index);
        }
        if (event.type === 'start' && event.style) {
            const attrs = Object.entries(event.style)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
            result += `<style ${attrs}>`;
            openTags.push(event.style);
        } else if (event.type === 'end') {
            if (openTags.length > 0) {
                result += `</style>`;
                openTags.pop();
            }
        }
        lastIndex = event.index;
    });
    
    if (lastIndex < plainText.length) {
        result += plainText.substring(lastIndex);
    }

    while (openTags.length > 0) {
        result += `</style>`;
        openTags.pop();
    }
    
    return result;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- END: Text Formatting Logic ---

// --- START: OCR Sprite Sheet Generation ---

// Helper function to create a masked canvas for a single crop if it has a path.
const getMaskedCropCanvas = (crop: { box: TextBox, sx: number, sy: number, sw: number, sh: number }, originalImage: HTMLImageElement): HTMLCanvasElement => {
    const { box, sx, sy, sw, sh } = crop;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, sw);
    cropCanvas.height = Math.max(1, sh);
    const ctx = cropCanvas.getContext('2d');
    
    if (!ctx) { // Fallback if context fails
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 1;
        fallbackCanvas.height = 1;
        return fallbackCanvas;
    }

    if (!box.path || box.path.length < 3) {
        // No path, just draw the rectangular crop
        ctx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, sw, sh);
        return cropCanvas;
    }

    // Path exists, so create a masked image.
    // Everything outside the path will be white, preventing OCR from picking up underlying text.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, sw, sh);
    
    ctx.save();
    ctx.beginPath();

    // The path is normalized to the full image. We need to translate it to be relative to the crop's top-left corner.
    const firstPoint = box.path[0];
    const translatedFirstX = (firstPoint.anchor.x * originalImage.width) - sx;
    const translatedFirstY = (firstPoint.anchor.y * originalImage.height) - sy;
    ctx.moveTo(translatedFirstX, translatedFirstY);

    for (let i = 0; i < box.path.length - 1; i++) {
        const p1 = box.path[i];
        const p2 = box.path[i + 1];
        const cp1x = (p1.handle2.x * originalImage.width) - sx;
        const cp1y = (p1.handle2.y * originalImage.height) - sy;
        const cp2x = (p2.handle1.x * originalImage.width) - sx;
        const cp2y = (p2.handle1.y * originalImage.height) - sy;
        const endx = (p2.anchor.x * originalImage.width) - sx;
        const endy = (p2.anchor.y * originalImage.height) - sy;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endx, endy);
    }
    ctx.closePath();
    ctx.clip();

    // Draw the original image content, which will only be visible inside the clipped path.
    ctx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, sw, sh);
    
    ctx.restore();

    return cropCanvas;
};

interface OcrRequestData {
    spriteBase64: string;
    boxesForApi: {id: number, x: number, y: number, width: number, height: number}[];
}

// Generates an efficient, two-column sprite sheet with masked crops for an OCR API request.
const generateOcrRequestDataForChunk = (
    chunk: TextBox[], 
    img: HTMLImageElement, 
    fileType: string
): OcrRequestData | null => {
    
    if (chunk.length === 0) return null;

    const crops = chunk.map(box => ({
        box,
        sx: box.x * img.width,
        sy: box.y * img.height,
        sw: Math.max(1, box.width * img.width),
        sh: Math.max(1, box.height * img.height),
    }));

    // Distribute crops into two columns, balancing by total height for a more compact result.
    const columns = [
        { width: 0, height: 0, crops: [] as typeof crops },
        { width: 0, height: 0, crops: [] as typeof crops }
    ];

    for (const crop of crops) {
        if (columns[0].height <= columns[1].height) {
            columns[0].crops.push(crop);
            columns[0].height += crop.sh;
            columns[0].width = Math.max(columns[0].width, crop.sw);
        } else {
            columns[1].crops.push(crop);
            columns[1].height += crop.sh;
            columns[1].width = Math.max(columns[1].width, crop.sw);
        }
    }
    
    const spriteCanvas = document.createElement('canvas');
    const spriteCtx = spriteCanvas.getContext('2d');
    if (!spriteCtx) throw new Error("Could not create sprite sheet context.");

    spriteCanvas.width = Math.max(1, columns[0].width + columns[1].width);
    spriteCanvas.height = Math.max(1, Math.max(columns[0].height, columns[1].height));
    spriteCtx.fillStyle = 'white';
    spriteCtx.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);

    const boxesForApi = [];
    
    // Process Column 1
    let currentYCol0 = 0;
    for (const crop of columns[0].crops) {
        const maskedCropCanvas = getMaskedCropCanvas(crop, img);
        spriteCtx.drawImage(maskedCropCanvas, 0, currentYCol0);

        boxesForApi.push({
            id: crop.box.id,
            x: 0,
            y: currentYCol0 / spriteCanvas.height,
            width: crop.sw / spriteCanvas.width,
            height: crop.sh / spriteCanvas.height,
        });
        currentYCol0 += crop.sh;
    }

    // Process Column 2
    let currentYCol1 = 0;
    for (const crop of columns[1].crops) {
        const maskedCropCanvas = getMaskedCropCanvas(crop, img);
        spriteCtx.drawImage(maskedCropCanvas, columns[0].width, currentYCol1);
        
        boxesForApi.push({
            id: crop.box.id,
            x: columns[0].width / spriteCanvas.width,
            y: currentYCol1 / spriteCanvas.height,
            width: crop.sw / spriteCanvas.width,
            height: crop.sh / spriteCanvas.height,
        });
        currentYCol1 += crop.sh;
    }

    if (boxesForApi.length === 0) return null;

    const spriteBase64 = spriteCanvas.toDataURL(fileType).split(',')[1];
    
    return { spriteBase64, boxesForApi };
};

// --- END: OCR Sprite Sheet Generation ---


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SettingsIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { t } = useTranslation();
    return (
        <button onClick={onClick} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title={t('settings')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    );
}

const WindowIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { t } = useTranslation();
    return (
        <button onClick={onClick} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title={t('compareOriginal')}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm12 1a1 1 0 011 1v2H3V5a1 1 0 011-1h12zM3 9h14v7a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
            </svg>
        </button>
    );
}

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Japanese', 'Korean', 'Chinese (Simplified)', 'Russian', 'Arabic'
];

const GOOGLE_FONTS = [
    'Architects Daughter',
    'Bangers',
    'Fredoka',
    'Indie Flower',
    'Kaushan Script',
    'Luckiest Guy',
    'Patrick Hand',
    'Permanent Marker',
];

const getInitialHistory = (): History<AppState> => ({
    past: [],
    present: { textBoxes: [], strokes: [], cleanedImageDataUrl: null },
    future: [],
});

interface ImageEditorState {
  isOpen: boolean;
  source?: 'selection' | 'imageBox';
  imageDataUrl?: string;
  targetBoxId?: number;
  selectionBounds?: { x: number; y: number; width: number; height: number; }; // In world coordinates (0-1)
  backgroundImageUrl?: string;
  backgroundBounds?: { x: number; y: number; width: number; height: number; };
}

const rotatePoint = ({ x, y }: { x: number, y: number }, angleRad: number) => ({
  x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
  y: x * Math.sin(angleRad) + y * Math.cos(angleRad),
});


// One-time upgrade function for text boxes using the old tag-based system.
const upgradeTextBox = (box: TextBox, defaultSettings: TextFormatSettings): TextBox => {
    if (box.type === 'text' && box.translatedText && box.plainText === undefined) {
        const { plainText, styleSpans } = parseTaggedText(box.translatedText);
        const newBox: TextBox = {
            ...box,
            plainText,
            styleSpans,
            fontFamily: box.fontFamily || defaultSettings.fontFamily,
            fontSize: box.fontSize || defaultSettings.fontSize,
            textAlign: box.textAlign || defaultSettings.textAlign,
            fontWeight: box.fontWeight || 'normal',
            fontStyle: box.fontStyle || 'normal',
            lineHeight: box.lineHeight || 1.2,
            wordSpacing: box.wordSpacing || 0,
            color: box.color || '#000000',
            strokeColor: box.strokeColor || '#FFFFFF',
            strokeWidth: box.strokeWidth || 0,
        };
        delete newBox.translatedText; // Remove the old property
        return newBox;
    }
    // Ensure all required base properties exist even if not upgraded
    return {
        ...box,
        plainText: box.plainText ?? (box.type === 'text' ? box.translatedText || '' : ''),
        styleSpans: box.styleSpans ?? [],
        fontFamily: box.fontFamily || defaultSettings.fontFamily,
        fontSize: box.fontSize || defaultSettings.fontSize,
        textAlign: box.textAlign || defaultSettings.textAlign,
        fontWeight: box.fontWeight || 'normal',
        fontStyle: box.fontStyle || 'normal',
        lineHeight: box.lineHeight || 1.2,
        wordSpacing: box.wordSpacing || 0,
        color: box.color || '#000000',
        strokeColor: box.strokeColor || '#FFFFFF',
        strokeWidth: box.strokeWidth || 0,
    };
};

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileWithUrl | null>(null);
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string | null>(null);
  
  const [fileStates, setFileStates] = useState<Map<string, History<AppState>>>(new Map());
  
  const [history, setHistory] = useState<History<AppState>>(getInitialHistory());

  // FIX: Moved `setStateWithHistory` to be defined earlier in the component.
  // This allows other useCallback hooks that depend on it to be defined in any order without causing declaration-before-use errors.
  const setStateWithHistory = useCallback((updater: (prevState: AppState) => AppState, immediate = false) => {
    setHistory(currentHistory => {
      const newPresent = updater(currentHistory.present);
      if (JSON.stringify(newPresent) === JSON.stringify(currentHistory.present)) {
        return currentHistory;
      }
      const newPast = [...currentHistory.past, currentHistory.present];
      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const { present: appState } = history;
  const { textBoxes, strokes } = appState;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.READY);
  
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [eyedropperTarget, setEyedropperTarget] = useState<'color' | 'strokeColor' | 'brush' | 'eraser' | 'inpaint' | null>(null);
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveFormat, setSaveFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [saveQuality, setSaveQuality] = useState(92);
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);

  const [isExportAllModalOpen, setIsExportAllModalOpen] = useState(false);
  const [exportAllFormat, setExportAllFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportAllQuality, setExportAllQuality] = useState(92);
  const [estimatedZipSize, setEstimatedZipSize] = useState<string | null>(null);
  
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfExportFormat, setPdfExportFormat] = useState<'png' | 'jpg' | 'webp'>('jpg');
  const [pdfExportQuality, setPdfExportQuality] = useState(92);
  const [estimatedPdfSize, setEstimatedPdfSize] = useState<string | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<SettingsProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');

  const [targetLanguage, setTargetLanguage] = useState(settingsService.DEFAULT_SETTINGS.targetLanguage);
  const [defaultTextSettings, setDefaultTextSettings] = useState<TextFormatSettings>(settingsService.DEFAULT_SETTINGS.defaultTextFormat);
  const [brushColor, setBrushColor] = useState(settingsService.DEFAULT_SETTINGS.brushColor);
  const [paintBrushSize, setPaintBrushSize] = useState(settingsService.DEFAULT_SETTINGS.paintBrushSize);
  const [selectionEraserSize, setSelectionEraserSize] = useState(settingsService.DEFAULT_SETTINGS.selectionEraserSize);
  const [brushHardness, setBrushHardness] = useState(settingsService.DEFAULT_SETTINGS.brushHardness);
  const [brushOpacity, setBrushOpacity] = useState(1); // Default to 100%
  const [panelWidths, setPanelWidths] = useState<PanelWidths>(settingsService.DEFAULT_SETTINGS.panelWidths);
  const [textAreaHeights, setTextAreaHeights] = useState<TextAreaHeights>(settingsService.DEFAULT_SETTINGS.textAreaHeights);
  const [inpaintAutoColor, setInpaintAutoColor] = useState(settingsService.DEFAULT_SETTINGS.inpaintAutoColor);
  const [inpaintManualColor, setInpaintManualColor] = useState(settingsService.DEFAULT_SETTINGS.inpaintManualColor);

  const [isOriginalViewerOpen, setIsOriginalViewerOpen] = useState(false);
  const [selectionToRestore, setSelectionToRestore] = useState<(Selection & { trigger: number }) | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Batch Processing State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string | null>(null);
  
  // Dynamic Font Loading
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const availableFonts = useMemo(() => {
    const combined = new Set([...customFonts, ...systemFonts, ...GOOGLE_FONTS]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [customFonts, systemFonts]);
  const [visibleFonts, setVisibleFonts] = useState<string[]>([]);

  // Inline text editing state
  const [editingBoxId, setEditingBoxId] = useState<number | null>(null);
  
  const [apiCallCount, setApiCallCount] = useState(0);

  // Magic Wand state
  const [magicWandTolerance, setMagicWandTolerance] = useState(30);
  const [selectionMask, setSelectionMask] = useState<Uint8Array | null>(null);
  const [lastSelectionMask, setLastSelectionMask] = useState<Uint8Array | null>(null);
  const [selectionMaskUrl, setSelectionMaskUrl] = useState<string | null>(null);

  const [lastProcessTime, setLastProcessTime] = useState<number | null>(null);
  const processStartTimeRef = useRef<number | null>(null);

  const [imageEditorState, setImageEditorState] = useState<ImageEditorState>({ isOpen: false });
  const [styleSlots, setStyleSlots] = useState<(Style | null)[]>([null, null, null]);

  // Notes state
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [appVersion, setAppVersion] = useState('');


  const primarySelectedId = useMemo(() => selectedBoxIds.length > 0 ? selectedBoxIds[selectedBoxIds.length - 1] : null, [selectedBoxIds]);
  const primarySelectedBox = useMemo(() => textBoxes.find(b => b.id === primarySelectedId) || null, [textBoxes, primarySelectedId]);

  const selectedBoxIndex = useMemo(() => {
    if (!primarySelectedId) return -1;
    return textBoxes.findIndex(box => box.id === primarySelectedId);
  }, [textBoxes, primarySelectedId]);

  const canBringForward = selectedBoxIndex !== -1 && selectedBoxIndex < textBoxes.length - 1;
  const canSendBackward = selectedBoxIndex > 0;

  const { setLanguage } = useTranslation();

  // Load notes on mount
  useEffect(() => {
    setNotes(notesService.loadNotes());
  }, []);

  useEffect(() => {
    fetch('metadata.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setAppVersion(data.name);
        }
      })
      .catch(err => console.error("Could not load app version:", err));
  }, []);

  // Save notes whenever they change
  const handleNotesChange = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    notesService.saveNotes(updatedNotes);
  };
  
  // --- START: Magic Wand & Selection Logic ---

    // Generate a visual overlay for the selection mask
    useEffect(() => {
        if (!selectionMask || !displayedImageUrl) {
            setSelectionMaskUrl(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = displayedImageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const outputImageData = ctx.createImageData(img.width, img.height);
            for (let i = 0; i < selectionMask.length; i++) {
                if (selectionMask[i] === 1) {
                    // Using a semi-transparent purple (A78BFA) for the overlay
                    outputImageData.data[i * 4] = 167;
                    outputImageData.data[i * 4 + 1] = 139;
                    outputImageData.data[i * 4 + 2] = 250;
                    outputImageData.data[i * 4 + 3] = 150; // Alpha
                }
            }
            ctx.putImageData(outputImageData, 0, 0);
            
            setSelectionMaskUrl(canvas.toDataURL());
        };
    }, [selectionMask, displayedImageUrl]);
    
  
    const handleMagicWandSelect = useCallback(async (point: { x: number, y: number }, addToSelection: boolean, subtractFromSelection: boolean) => {
        if (!displayedImageUrl) return;
        setStatus(AppStatus.MAGIC_WAND);
        
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = displayedImageUrl;
            await new Promise((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror = reject; });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("Could not get context for magic wand");
            
            ctx.drawImage(img, 0, 0);
            
            // Draw strokes onto the canvas so the magic wand can "see" them
            const normToWorld = (pos: { x: number; y: number }) => ({ x: pos.x * img.width, y: pos.y * img.height });
            const strokesToDraw = strokes.filter(s => s.type === 'brush' || s.type === 'eraser');
            drawStrokesOnCanvas(ctx, strokesToDraw, normToWorld);

            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            const startX = Math.floor(point.x);
            const startY = Math.floor(point.y);

            const newMask = imageProcessing.floodFill(imageData, startX, startY, magicWandTolerance, true);
            
            if (subtractFromSelection && selectionMask) {
                const subtractedMask = new Uint8Array(selectionMask.length);
                for (let i = 0; i < subtractedMask.length; i++) {
                    // A pixel remains selected if it was previously selected AND is NOT in the new subtraction area.
                    subtractedMask[i] = (selectionMask[i] === 1 && newMask[i] === 0) ? 1 : 0;
                }
                setSelectionMask(subtractedMask);
            } else if (addToSelection && selectionMask) {
                const combinedMask = new Uint8Array(selectionMask.length);
                for (let i = 0; i < combinedMask.length; i++) {
                    combinedMask[i] = selectionMask[i] || newMask[i];
                }
                setSelectionMask(combinedMask);
            } else {
                setSelectionMask(newMask);
            }
        } catch (error) {
            console.error("Magic Wand failed:", error);
            setStatus(AppStatus.ERROR);
        } finally {
            setStatus(AppStatus.READY);
        }
    }, [displayedImageUrl, magicWandTolerance, selectionMask, strokes]);

    const handleManualSelection = useCallback(async (
        selectionData: { x: number; y: number; width: number; height: number; },
        addToSelection: boolean,
        subtractFromSelection: boolean
    ) => {
        if (!displayedImageUrl) return;

        // Deactivate tool unless Shift or Alt is held
        if (!addToSelection && !subtractFromSelection) {
            setActiveTool(null);
        }

        setStatus(AppStatus.MAGIC_WAND); // Re-use status for user feedback

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = displayedImageUrl;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror = reject; });
            const { width, height } = img;

            const newMask = new Uint8Array(width * height);
            const startX = Math.round(selectionData.x * width);
            const startY = Math.round(selectionData.y * height);
            const endX = Math.round((selectionData.x + selectionData.width) * width);
            const endY = Math.round((selectionData.y + selectionData.height) * height);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        newMask[y * width + x] = 1;
                    }
                }
            }

            if (subtractFromSelection && selectionMask) {
                const subtractedMask = new Uint8Array(selectionMask.length);
                for (let i = 0; i < subtractedMask.length; i++) {
                    subtractedMask[i] = (selectionMask[i] === 1 && newMask[i] === 0) ? 1 : 0;
                }
                setSelectionMask(subtractedMask);
            } else if (addToSelection && selectionMask) {
                const combinedMask = new Uint8Array(selectionMask.length);
                for (let i = 0; i < combinedMask.length; i++) {
                    combinedMask[i] = selectionMask[i] || newMask[i];
                }
                setSelectionMask(combinedMask);
            } else {
                setSelectionMask(newMask);
            }
        } catch (error) {
            console.error("Manual selection failed:", error);
            setStatus(AppStatus.ERROR);
        } finally {
            setStatus(AppStatus.READY);
        }
    }, [displayedImageUrl, selectionMask]);

    const handleClearSelection = useCallback(() => {
        if (selectionMask) {
            setLastSelectionMask(selectionMask);
        }
        setSelectionMask(null);
    }, [selectionMask]);

    const handleRecallSelection = useCallback(() => {
        if (lastSelectionMask) {
            setSelectionMask(lastSelectionMask);
        }
    }, [lastSelectionMask]);

    const handleSelectionErase = useCallback(async (points: {x: number, y: number}[], size: number, hardness: number) => {
        if (!selectionMask || !displayedImageUrl) return;
    
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = displayedImageUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror = reject; });
    
        const { width, height } = img;
    
        const eraseCanvas = document.createElement('canvas');
        eraseCanvas.width = width;
        eraseCanvas.height = height;
        const eraseCtx = eraseCanvas.getContext('2d');
        if (!eraseCtx) return;
    
        const strokeToDraw: Stroke = {
            id: 0,
            type: 'brush', 
            color: '#FFFFFF', 
            points,
            size,
            shape: 'round',
            hardness,
// FIX: Added missing 'opacity' property to conform to the Stroke type.
            opacity: 1,
        };
    
        // FIX: Removed extra argument from drawStrokesOnCanvas call, which expects 3 arguments but was given 4.
        drawStrokesOnCanvas(eraseCtx, [strokeToDraw], (p) => ({ x: p.x * width, y: p.y * height }));
    
        const eraseImageData = eraseCtx.getImageData(0, 0, width, height).data;
        const newMask = new Uint8Array(selectionMask);
    
        for (let i = 0; i < newMask.length; i++) {
            if (eraseImageData[i * 4 + 3] > 0) {
                newMask[i] = 0;
            }
        }
    
        setSelectionMask(newMask);
    
    }, [selectionMask, displayedImageUrl]);
    
    // --- END: Magic Wand & Selection Logic ---

  // --- START: Image Editor Logic ---
  const handleLaunchImageEditor = useCallback(async () => {
    if (!displayedImageUrl) return;

    if (primarySelectedBox?.type === 'image' && primarySelectedBox.imageDataUrl) {
      const bounds = { x: primarySelectedBox.x, y: primarySelectedBox.y, width: primarySelectedBox.width, height: primarySelectedBox.height };
      setImageEditorState({
        isOpen: true,
        source: 'imageBox',
        imageDataUrl: primarySelectedBox.imageDataUrl,
        targetBoxId: primarySelectedBox.id,
        backgroundImageUrl: displayedImageUrl,
        backgroundBounds: bounds,
      });
    } else if (selectionMask) {
      const img = new Image();
      img.src = displayedImageUrl;
      await new Promise(res => { img.onload = res });
      const { width, height } = img;

      let minX = width, minY = height, maxX = 0, maxY = 0;
      let hasSelection = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (selectionMask[y * width + x] === 1) {
            hasSelection = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!hasSelection) return;

      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;

      cropCtx.drawImage(img, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      const maskedImageData = cropCtx.getImageData(0, 0, cropWidth, cropHeight);
      for (let y = 0; y < cropHeight; y++) {
        for (let x = 0; x < cropWidth; x++) {
          if (selectionMask[(minY + y) * width + (minX + x)] !== 1) {
            maskedImageData.data[(y * cropWidth + x) * 4 + 3] = 0;
          }
        }
      }
      cropCtx.putImageData(maskedImageData, 0, 0);

      const selectionBounds = {
        x: minX / width, y: minY / height,
        width: cropWidth / width, height: cropHeight / height,
      };

      setImageEditorState({
        isOpen: true,
        source: 'selection',
        imageDataUrl: cropCanvas.toDataURL(),
        selectionBounds,
        backgroundImageUrl: displayedImageUrl,
        backgroundBounds: selectionBounds,
      });
    }
  }, [primarySelectedBox, selectionMask, displayedImageUrl]);

const handleApplyImageEdit = useCallback(async (
    newImageDataUrl: string, 
    transform: { x: number; y: number; scale: number; rotation: number }, 
    magicBrushStrokes?: Stroke[]
) => {
    if (!imageEditorState.isOpen) return;

    if (imageEditorState.source === 'imageBox' && imageEditorState.targetBoxId && imageEditorState.backgroundBounds) {
        const targetId = imageEditorState.targetBoxId;
        const originalBox = textBoxes.find(b => b.id === targetId);
        const originalBoxBounds = imageEditorState.backgroundBounds;

        if (!originalBox || !originalBox.imageDataUrl || !displayedImageUrl) return;

        const mainImage = new Image(); mainImage.src = displayedImageUrl;
        await new Promise(res => { mainImage.onload = res });
        const mainImageWidth = mainImage.width;
        const mainImageHeight = mainImage.height;

        const editedImage = new Image(); editedImage.src = originalBox.imageDataUrl;
        await new Promise(res => { editedImage.onload = res });
        const editedImageWidth = editedImage.width;
        const editedImageHeight = editedImage.height;

        const newRotation = originalBox.rotation + transform.rotation;
        const newWidthNorm = originalBoxBounds.width * transform.scale;
        const newHeightNorm = originalBoxBounds.height * transform.scale;
        
        const origCenterNorm = {
            x: originalBoxBounds.x + originalBoxBounds.width / 2,
            y: originalBoxBounds.y + originalBoxBounds.height / 2,
        };

        const newCenterModalPx = {
            x: transform.x + (editedImageWidth * transform.scale) / 2,
            y: transform.y + (editedImageHeight * transform.scale) / 2,
        };
        const origCenterModalPx = {
            x: editedImageWidth / 2,
            y: editedImageHeight / 2,
        };
        const deltaModalPx = {
            x: newCenterModalPx.x - origCenterModalPx.x,
            y: newCenterModalPx.y - origCenterModalPx.y,
        };

        const mapScaleX = (originalBoxBounds.width * mainImageWidth) / editedImageWidth;
        const mapScaleY = (originalBoxBounds.height * mainImageHeight) / editedImageHeight;
        const deltaNorm = {
            x: (deltaModalPx.x * mapScaleX) / mainImageWidth,
            y: (deltaModalPx.y * mapScaleY) / mainImageHeight,
        };

        const origAngleRad = originalBox.rotation * Math.PI / 180;
        const rotatedDeltaNorm = rotatePoint(deltaNorm, origAngleRad);

        const newCenterNorm = {
            x: origCenterNorm.x + rotatedDeltaNorm.x,
            y: origCenterNorm.y + rotatedDeltaNorm.y,
        };

        const newXNorm = newCenterNorm.x - newWidthNorm / 2;
        const newYNorm = newCenterNorm.y - newHeightNorm / 2;
        
        setStateWithHistory(prev => ({
            ...prev,
            textBoxes: prev.textBoxes.map(box =>
                box.id === targetId ? {
                    ...box,
                    imageDataUrl: newImageDataUrl,
                    x: newXNorm, y: newYNorm,
                    width: newWidthNorm, height: newHeightNorm,
                    rotation: newRotation,
                } : box
            )
        }));

    } else if (imageEditorState.source === 'selection' && imageEditorState.selectionBounds && displayedImageUrl) {
      const pasteBounds = imageEditorState.selectionBounds;
      const baseImage = new Image();
      baseImage.src = displayedImageUrl;
      await new Promise(res => baseImage.onload = res);
      
      const canvas = document.createElement('canvas');
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(baseImage, 0, 0);
      
      const editedChunk = new Image();
      editedChunk.src = newImageDataUrl;
      await new Promise(res => editedChunk.onload = res);

      ctx.drawImage(
        editedChunk,
        pasteBounds.x * baseImage.width,
        pasteBounds.y * baseImage.height,
        pasteBounds.width * baseImage.width,
        pasteBounds.height * baseImage.height
      );
      
      const finalUrl = canvas.toDataURL();
      
      if (history.present.cleanedImageDataUrl) {
        URL.revokeObjectURL(history.present.cleanedImageDataUrl);
      }

      setStateWithHistory(prev => ({
        ...prev,
        cleanedImageDataUrl: finalUrl
      }));
    }
    
    if (magicBrushStrokes && magicBrushStrokes.length > 0 && displayedImageUrl) {
        const mainImage = new Image();
        mainImage.src = displayedImageUrl;
        await new Promise(res => { mainImage.onload = res });
        const { width: mainWidth, height: mainHeight } = mainImage;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = mainWidth;
        maskCanvas.height = mainHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        let bounds = { x: 0, y: 0, width: 1, height: 1 };

        if (imageEditorState.source === 'selection' && imageEditorState.selectionBounds) {
            bounds = imageEditorState.selectionBounds;
        } else if (imageEditorState.source === 'imageBox' && imageEditorState.targetBoxId) {
            const targetBox = textBoxes.find(b => b.id === imageEditorState.targetBoxId);
            if (targetBox) {
                bounds = { x: targetBox.x, y: targetBox.y, width: targetBox.width, height: targetBox.height };
            }
        }

        const normToMainCanvasCoords = (normPos: { x: number, y: number }) => ({
            x: (bounds.x + normPos.x * bounds.width) * mainWidth,
            y: (bounds.y + normPos.y * bounds.height) * mainHeight,
        });
        
        const strokesForMask = magicBrushStrokes.map(s => ({
            ...s,
            type: 'brush' as const,
            color: '#FFFFFF',
            hardness: 1,
        }));

        // FIX: Removed extra argument from drawStrokesOnCanvas call, which expects 3 arguments but was given 4.
        drawStrokesOnCanvas(maskCtx, strokesForMask, normToMainCanvasCoords);

        const imageData = maskCtx.getImageData(0, 0, mainWidth, mainHeight);
        const newMask = new Uint8Array(mainWidth * mainHeight);
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || imageData.data[i + 2] > 0) {
                newMask[i / 4] = 1;
            }
        }
        
        setSelectionMask(newMask);
        setSelectionMaskUrl(null);
    }

    setImageEditorState({ isOpen: false });
  }, [imageEditorState, textBoxes, displayedImageUrl, setStateWithHistory, history.present.cleanedImageDataUrl]);
  // --- END: Image Editor Logic ---


  useEffect(() => {
    // Initialize count on load
    setApiCallCount(apiCounterService.getApiCount());

    // Listen for updates from the service
    const handleCountUpdate = (event: CustomEvent) => {
        if (event.detail && typeof event.detail.newCount === 'number') {
            setApiCallCount(event.detail.newCount);
        }
    };

    window.addEventListener('apiCallCountUpdated', handleCountUpdate as EventListener);

    return () => {
        window.removeEventListener('apiCallCountUpdated', handleCountUpdate as EventListener);
    };
  }, []);

  const applySettings = useCallback((settings: AppSettings) => {
    setTargetLanguage(settings.targetLanguage);
    setLanguage(settings.interfaceLanguage as Language || 'en');
    setDefaultTextSettings(settings.defaultTextFormat);
    setBrushColor(settings.brushColor);
    setPaintBrushSize(settings.paintBrushSize);
    setSelectionEraserSize(settings.selectionEraserSize || settingsService.DEFAULT_SETTINGS.selectionEraserSize);
    setBrushHardness(settings.brushHardness);
    setBrushOpacity((settings as any).brushOpacity ?? 1);
    setPanelWidths(settings.panelWidths || settingsService.DEFAULT_SETTINGS.panelWidths);
    setTextAreaHeights(settings.textAreaHeights || settingsService.DEFAULT_SETTINGS.textAreaHeights);
    setInpaintAutoColor(settings.inpaintAutoColor);
    setInpaintManualColor(settings.inpaintManualColor);
    setStyleSlots(settings.styleSlots || [null, null, null]);
  }, [setLanguage]);

  useEffect(() => {
    const loadedProfiles = settingsService.loadProfiles();
    const loadedActiveId = settingsService.loadActiveProfileId();
    setProfiles(loadedProfiles);

    const activeProfile = loadedProfiles.find(p => p.id === loadedActiveId) || loadedProfiles[0];
    if (activeProfile) {
      setActiveProfileId(activeProfile.id);
      applySettings(activeProfile.settings);
    }
  }, [applySettings]);
  
  const loadSystemFonts = useCallback(async (): Promise<{ status: 'success', count: number } | { status: 'unsupported' } | { status: 'error', message: string }> => {
    if (!('queryLocalFonts' in window)) {
        return { status: 'unsupported' };
    }
    try {
        const availableSystemFonts = await (window as any).queryLocalFonts();
        const fontNames = new Set<string>();
        for (const fontData of availableSystemFonts) {
            fontNames.add(fontData.fullName);
        }
        const sortedFonts = Array.from(fontNames).sort();
        setSystemFonts(sortedFonts);
        return { status: 'success', count: sortedFonts.length };
    } catch (err) {
        console.error('Error querying local fonts:', err);
        return { status: 'error', message: (err as Error).message };
    }
  }, []);

  const loadFontsFromFiles = useCallback(async (fileList: FileList): Promise<{ loaded: string[], failed: string[] }> => {
    const loaded: string[] = [];
    const failed: string[] = [];
    
    const knownFonts = new Set([...customFonts, ...systemFonts, ...GOOGLE_FONTS]);

    const fontPromises = Array.from(fileList).map(async (file) => {
        try {
            const fontName = file.name.split('.').slice(0, -1).join('.');
            if (knownFonts.has(fontName)) {
                return;
            }
            const arrayBuffer = await file.arrayBuffer();
            await fontDbService.saveFont(fontName, arrayBuffer.slice(0)); // Save to IndexedDB
            const fontFace = new FontFace(fontName, arrayBuffer);
            const loadedFont = await fontFace.load();
            document.fonts.add(loadedFont);
            loaded.push(fontName);
        } catch (err) {
            console.error(`Failed to load font from file: ${file.name}`, err);
            failed.push(file.name);
        }
    });

    await Promise.all(fontPromises);

    if (loaded.length > 0) {
        setCustomFonts(prev => [...new Set([...prev, ...loaded])].sort());
    }

    return { loaded, failed };
  }, [customFonts, systemFonts]);

    const handleClearCustomFonts = useCallback(async () => {
        try {
            await fontDbService.clearAllFonts();
            return true; // Indicate success
        } catch (error) {
            console.error("Failed to clear custom fonts:", error);
            return false; // Indicate failure
        }
    }, []);

  useEffect(() => {
    // Load persisted custom fonts from IndexedDB on startup
    const loadPersistedFonts = async () => {
        try {
            const savedFonts = await fontDbService.getAllFonts();
            if (savedFonts.length > 0) {
                const fontNames: string[] = [];
                const fontPromises = savedFonts.map(async (fontData) => {
                    try {
                        const fontFace = new FontFace(fontData.name, fontData.buffer);
                        await fontFace.load();
                        document.fonts.add(fontFace);
                        fontNames.push(fontData.name);
                    } catch (err) {
                        console.error(`Failed to load persisted font: ${fontData.name}`, err);
                    }
                });
                await Promise.all(fontPromises);
                setCustomFonts(prev => [...new Set([...prev, ...fontNames])].sort());
            }
        } catch (error) {
            console.error("Could not load fonts from IndexedDB:", error);
        }
    };
    
    const loadFontsFromManifest = async (manifest: { name: string; file: string }[]) => {
        const fontPromises = manifest.map(async (font) => {
            const fontFace = new FontFace(font.name, `url(/fonts/${font.file})`);
            try {
                const loadedFont = await fontFace.load();
                document.fonts.add(loadedFont);
                return font.name;
            } catch (err) {
                console.error(`Failed to load font: ${font.name} from ${font.file}`, err);
                return null;
            }
        });

        const loadedFonts = (await Promise.all(fontPromises)).filter((name): name is string => name !== null);
        setCustomFonts(prev => [...new Set([...prev, ...loadedFonts])].sort());
    };

    const loadInitialFonts = async () => {
        
        await loadPersistedFonts();
        await loadSystemFonts();
    };

    loadInitialFonts();
  }, [loadSystemFonts]);


  useEffect(() => {
    if (availableFonts.length > 0) {
      const savedVisible = settingsService.loadVisibleFonts();
      if (savedVisible) {
        const stillAvailable = savedVisible.filter(font => availableFonts.includes(font));
        setVisibleFonts(stillAvailable);
      } else {
        setVisibleFonts(availableFonts);
      }
    }
  }, [availableFonts]);

  const handleSaveSettings = (updatedProfiles: SettingsProfile[], newActiveProfileId: string, newVisibleFonts: string[]) => {
    settingsService.saveProfiles(updatedProfiles);
    settingsService.saveActiveProfileId(newActiveProfileId);
    settingsService.saveVisibleFonts(newVisibleFonts);
    
    setProfiles(updatedProfiles);
    setActiveProfileId(newActiveProfileId);
    setVisibleFonts(newVisibleFonts);

    const newActiveProfile = updatedProfiles.find(p => p.id === newActiveProfileId);
    if(newActiveProfile) {
        applySettings(newActiveProfile.settings);
    }
    setIsSettingsModalOpen(false);
  };

    const isResizing = useRef(false);
    const resizingPanel = useRef<'left' | 'right' | null>(null);
    const resizeStart = useRef({ x: 0, left: 0, right: 0 });
    const isResizingVertical = useRef(false);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const [leftPanelTopHeight, setLeftPanelTopHeight] = useState(50);
  
    useEffect(() => {
        if (!selectedFile) {
            setDisplayedImageUrl(null);
            return;
        }

        const presentUrl = history.present.cleanedImageDataUrl;
        if (presentUrl) {
            setDisplayedImageUrl(presentUrl);
        } else {
            // Fallback to original URL if history doesn't have a cleaned version
            setDisplayedImageUrl(selectedFile.url);
        }
    }, [history.present.cleanedImageDataUrl, selectedFile]);

  const handleUndo = useCallback(() => {
    setHistory(currentHistory => {
      if (currentHistory.past.length === 0) return currentHistory;
      const newPast = [...currentHistory.past];
      const newPresent = newPast.pop()!;
      return {
        past: newPast,
        present: newPresent,
        future: [currentHistory.present, ...currentHistory.future],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(currentHistory => {
      if (currentHistory.future.length === 0) return currentHistory;
      const newFuture = [...currentHistory.future];
      const newPresent = newFuture.shift()!;
      return {
        past: [...currentHistory.past, currentHistory.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (isBatchProcessing) return; 
    if (selectedFile) {
        setFileStates(prev => new Map(prev).set(selectedFile.file.name, history));
    }

    const fileWithUrl = files.find(f => f.file.name === file.name);
    if (fileWithUrl) {
      setSelectedFile(fileWithUrl);
      
      const savedHistory = fileStates.get(file.name) || getInitialHistory();
      // Upgrade any text boxes from the old format on load
      const upgradedPresent = {
        ...savedHistory.present,
        textBoxes: savedHistory.present.textBoxes.map(box => upgradeTextBox(box, defaultTextSettings)),
      };

      const newHistory = { ...savedHistory, present: upgradedPresent };

      setHistory(newHistory);
      setActiveTool(null);
      setEditingBoxId(null);
      setSelectionMask(null); // Clear selection when changing files
      setLastSelectionMask(null); // Clear recallable selection too

      setSelectedBoxIds([]);
      setStatus(AppStatus.READY);
      // FIX: Standardize on 'jpg' for state, converting from 'jpeg' file type.
      const fileType = file.type.split('/')[1] as 'png' | 'jpeg' | 'webp';
      setSaveFormat(fileType === 'jpeg' ? 'jpg' : fileType);
    }
  }, [selectedFile, files, fileStates, history, isBatchProcessing, defaultTextSettings]);

  const handleFilesChange = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    const newFilesWithUrls = newFiles.map(file => ({ file, url: URL.createObjectURL(file) }));
    setFiles(prev => [...prev, ...newFilesWithUrls]);
    if (!selectedFile && newFilesWithUrls.length > 0) {
      handleFileSelect(newFilesWithUrls[0].file);
    }
  };
  
  const handleFileDelete = (fileToDelete: File) => {
    const fileToRemove = files.find(f => f.file.name === fileToDelete.name);
    if (!fileToRemove) return;

    URL.revokeObjectURL(fileToRemove.url);
    setFiles(prev => prev.filter(f => f.file.name !== fileToDelete.name));
    
    if (fileStates.has(fileToDelete.name)) {
        const fileHistory = fileStates.get(fileToDelete.name);
        if (fileHistory?.present.cleanedImageDataUrl) {
            URL.revokeObjectURL(fileHistory.present.cleanedImageDataUrl);
        }
        const newStates = new Map(fileStates);
        newStates.delete(fileToDelete.name);
        setFileStates(newStates);
    }

    if (selectedFile?.file.name === fileToDelete.name) {
      setSelectedFile(null);
      setHistory(getInitialHistory());
      setSelectedBoxIds([]);
      setActiveTool(null);
      setEditingBoxId(null);
      setSelectionMask(null);
      setLastSelectionMask(null);
      setStatus(AppStatus.READY);
    }
  };
  
  const handleAddImage = useCallback((file: File) => {
    if (!selectedFile || !displayedImageUrl) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        if (!imageDataUrl) return;

        const img = new Image();
        img.onload = () => {
            const { naturalWidth, naturalHeight } = img;
            const aspectRatio = naturalWidth / naturalHeight;

            const mainImage = new Image();
            mainImage.src = displayedImageUrl;
            mainImage.onload = () => {
                const mainImageWidth = mainImage.width;
                const mainImageHeight = mainImage.height;

                let newWidthPixels = 0.3 * mainImageWidth;
                let newHeightPixels = newWidthPixels / aspectRatio;
                
                if (newHeightPixels > 0.5 * mainImageHeight) {
                    newHeightPixels = 0.5 * mainImageHeight;
                    newWidthPixels = newHeightPixels * aspectRatio;
                }

                const newId = Date.now();
                const newBox: TextBox = {
                    id: newId,
                    type: 'image',
                    x: 0.35,
                    y: 0.25,
                    width: newWidthPixels / mainImageWidth,
                    height: newHeightPixels / mainImageHeight,
                    rotation: 0,
                    imageDataUrl,
                    aspectRatio,
                    plainText: file.name,
                    ocrText: '',
                    styleSpans: [],
                    ...defaultTextSettings,
                };

                setStateWithHistory(prev => ({ ...prev, textBoxes: [...prev.textBoxes, newBox] }));
                setSelectedBoxIds([newId]);
            };
        };
        img.src = imageDataUrl;
    };
    reader.readAsDataURL(file);
  }, [selectedFile, displayedImageUrl, defaultTextSettings, setStateWithHistory]);

  const handleBoxSelection = useCallback((boxId: number, isMultiSelect: boolean) => {
    setEditingBoxId(null); // Stop inline editing when selecting another box
    if (isMultiSelect) {
        setSelectedBoxIds(prevIds => 
            prevIds.includes(boxId)
                ? prevIds.filter(id => id !== boxId)
                : [...prevIds, boxId]
        );
    } else {
        setSelectedBoxIds(prevIds => {
            if (prevIds.length === 1 && prevIds[0] === boxId) return prevIds;
            return [boxId];
        });
    }
    setActiveTool(null);
  }, []);
  
  const handleDeselectAllBoxes = () => {
    setSelectedBoxIds([]);
    setEditingBoxId(null);
  };

  const handleSelectAllBoxes = () => {
    setSelectedBoxIds(textBoxes.map(b => b.id));
    setEditingBoxId(null);
  };

  const handleRunOcr = useCallback(async (boxesToProcess?: TextBox[]) => {
    const boxesForOcr = boxesToProcess 
      ? boxesToProcess
      : textBoxes.filter(b => b.type === 'ocr' && !b.ocrText);
      
    if (!selectedFile || boxesForOcr.length === 0 || !displayedImageUrl) {
        if (boxesToProcess) setStatus(AppStatus.READY);
        return;
    }

    setStatus(AppStatus.OCR);
    try {
        const img = new Image();
        img.src = displayedImageUrl;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve(undefined);
            img.onerror = (err) => reject(new Error(`Failed to load image for OCR sprite sheet: ${err}`));
        });

        const OCR_CHUNK_SIZE = 24;
        const allOcrResults = [];

        for (let i = 0; i < boxesForOcr.length; i += OCR_CHUNK_SIZE) {
            const chunk = boxesForOcr.slice(i, i + OCR_CHUNK_SIZE);
            
            const requestData = generateOcrRequestDataForChunk(chunk, img, selectedFile.file.type);
            if (!requestData) {
                continue;
            }
            const { spriteBase64, boxesForApi } = requestData;
            
            if (boxesForApi.length === 0) {
                continue;
            }

            const results = await extractTextsFromImage(spriteBase64, selectedFile.file.type, boxesForApi);
            allOcrResults.push(...results);
        }

        const ocrResults = new Map<number, { text: string; detectedFontSize: number }>();
        allOcrResults.forEach(result => {
            const detectedPixelSize = Math.round((result.fontSizePercentage / 100) * img.height);
            ocrResults.set(result.id, { text: result.text, detectedFontSize: detectedPixelSize });
        });

        setStateWithHistory(prev => ({
            ...prev,
            textBoxes: prev.textBoxes.map(box => {
                if (ocrResults.has(box.id)) {
                    const result = ocrResults.get(box.id)!;
                    return { ...box, ocrText: result.text, detectedFontSize: result.detectedFontSize };
                }
                return box;
            })
        }));
    } catch (error: any) {
        console.error("[App] An error occurred during the OCR process:", error);
        if (error instanceof ApiKeyError) {
            setApiKeyError(error.message);
        }
        setStatus(AppStatus.ERROR);
        throw error; // Re-throw to be caught by batch processor
    } finally {
        setStatus(AppStatus.READY);
        setActiveTool(null);
    }
  }, [textBoxes, selectedFile, displayedImageUrl, setStateWithHistory]);


  const handleTranslateAll = useCallback(async () => {
    const boxesForTranslation = textBoxes.filter(box => box.type === 'ocr' && box.ocrText);
      
    if (boxesForTranslation.length === 0) return;

    setStatus(AppStatus.TRANSLATING);
    processStartTimeRef.current = performance.now();
    setLastProcessTime(null);
    try {
      const textsToTranslate = boxesForTranslation.map(box => ({ id: box.id, text: box.ocrText! }));
      const originalBoxesMap = new Map<number, TextBox>(textBoxes.map(box => [box.id, box]));

      const translations = await translateMultipleTexts(textsToTranslate, targetLanguage);
      
      const newBoxes: TextBox[] = translations.map((translation): TextBox | null => {
          const originalBox = originalBoxesMap.get(translation.id);
          if (!originalBox) return null;

          let translated = translation.translatedText;
          if (defaultTextSettings.textTransform === 'uppercase') {
              translated = translated.toUpperCase();
          }

          return {
              id: Date.now() + Math.random(),
              type: 'text',
              x: originalBox.x,
              y: originalBox.y,
              width: originalBox.width,
              height: originalBox.height,
              rotation: originalBox.rotation,
              ocrText: '',
              plainText: translated,
              styleSpans: [],
              fontFamily: defaultTextSettings.fontFamily,
              fontSize: defaultTextSettings.fontSize,
              textAlign: defaultTextSettings.textAlign,
              fontWeight: defaultTextSettings.fontWeight,
              fontStyle: defaultTextSettings.fontStyle,
              lineHeight: defaultTextSettings.lineHeight,
              wordSpacing: defaultTextSettings.wordSpacing,
              color: defaultTextSettings.color,
              strokeColor: defaultTextSettings.strokeColor,
              strokeWidth: defaultTextSettings.strokeWidth,
          };
      }).filter((box): box is TextBox => box !== null);

      setStateWithHistory(prev => ({
          ...prev,
          textBoxes: [
              ...prev.textBoxes.filter(b => b.type !== 'ocr'),
              ...newBoxes
          ]
      }));
      setSelectedBoxIds([]);

    } catch (error: any) {
      console.error(error);
      if (error instanceof ApiKeyError) {
          setApiKeyError(error.message);
      }
      setStatus(AppStatus.ERROR);
      throw error; // Re-throw to be caught by batch processor
    } finally {
      setStatus(AppStatus.READY);
      if (processStartTimeRef.current) {
        const duration = (performance.now() - processStartTimeRef.current) / 1000;
        setLastProcessTime(duration);
        processStartTimeRef.current = null;
      }
    }
  }, [textBoxes, targetLanguage, defaultTextSettings, setStateWithHistory]);
  
  const handleProcessCurrentPage = async () => {
    if (!selectedFile || isBatchProcessing) return;

    setIsBatchProcessing(true);
    processStartTimeRef.current = performance.now();
    setLastProcessTime(null);
    
    // Take a snapshot of state at the start
    const initialAppState = history.present;
    let tempImageUrl = initialAppState.cleanedImageDataUrl || selectedFile.url;
    let tempTextBoxes = initialAppState.textBoxes;
    const selectionForProcess = selectionMask;
    const hasSelection = !!selectionForProcess;

    const totalSteps = hasSelection ? 4 : 2;
    let currentStep = 1;

    try {
        // --- STEP 1: OCR (BOX CREATION & TEXT EXTRACTION) ---
        setBatchStatusMessage(`Step ${currentStep++}/${totalSteps}: Performing OCR...`);
        let newlyCreatedBoxes: TextBox[] = [];

        if (hasSelection) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = tempImageUrl;
            await new Promise<void>((resolve, reject) => {img.onload=() => resolve(undefined); img.onerror= (err) => reject(err);});
            const { width, height } = img;
            const paths = imageProcessing.traceAndVectorizeAll(selectionForProcess, width, height);

            if (paths && paths.length > 0) {
                paths.forEach(path => {
                    if (path.length < 3) return;
                    const normalizedPath = path.map(p => ({
                        anchor: { x: p.anchor.x / width, y: p.anchor.y / height },
                        handle1: { x: p.handle1.x / width, y: p.handle1.y / height },
                        handle2: { x: p.handle2.x / width, y: p.handle2.y / height },
                    }));
                    const allPoints = normalizedPath.map(p => p.anchor);
                    const minX = Math.min(...allPoints.map(p => p.x));
                    const minY = Math.min(...allPoints.map(p => p.y));
                    const maxX = Math.max(...allPoints.map(p => p.x));
                    const maxY = Math.max(...allPoints.map(p => p.y));
                    const newBox: TextBox = {
                       id: Date.now() + Math.random(), type: 'ocr',
                       x: minX, y: minY, width: maxX - minX, height: maxY - minY,
                       rotation: 0, ocrText: '', plainText: '', styleSpans: [], path: normalizedPath,
                       ...defaultTextSettings
                    };
                    if (newBox.width > 0.001 && newBox.height > 0.001) newlyCreatedBoxes.push(newBox);
                });
                tempTextBoxes = [...tempTextBoxes, ...newlyCreatedBoxes];
            }
        }
        
        const boxesForOcr = tempTextBoxes.filter(b => b.type === 'ocr' && !b.ocrText);
        
        if (boxesForOcr.length > 0) {
            const img = new Image();
            img.src = tempImageUrl;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror = (err) => reject(new Error(`Failed to load image for OCR sprite sheet: ${err}`)); });
            
            const OCR_CHUNK_SIZE = 24;
            const allOcrResults = [];

            for (let i = 0; i < boxesForOcr.length; i += OCR_CHUNK_SIZE) {
                const chunk = boxesForOcr.slice(i, i + OCR_CHUNK_SIZE);
                const requestData = generateOcrRequestDataForChunk(chunk, img, selectedFile.file.type);
                
                if (requestData && requestData.boxesForApi.length > 0) {
                    const { spriteBase64, boxesForApi } = requestData;
                    const results = await extractTextsFromImage(spriteBase64, selectedFile.file.type, boxesForApi);
                    allOcrResults.push(...results);
                }
            }
            
            const ocrResults = new Map<number, { text: string; detectedFontSize: number }>();
            allOcrResults.forEach(result => {
                const detectedPixelSize = Math.round((result.fontSizePercentage / 100) * img.height);
                ocrResults.set(result.id, { text: result.text, detectedFontSize: detectedPixelSize });
            });

            tempTextBoxes = tempTextBoxes.map(box => {
                if (ocrResults.has(box.id)) {
                    const result = ocrResults.get(box.id)!;
                    return { ...box, ocrText: result.text, detectedFontSize: result.detectedFontSize };
                }
                return box;
            });
        }
        
        if (!tempTextBoxes.some(b => b.type === 'ocr' && b.ocrText)) {
            setBatchStatusMessage('No text found to process. Process stopped.');
            await sleep(2000);
            if (hasSelection) {
                setStateWithHistory(prev => ({...prev, textBoxes: tempTextBoxes}));
                setSelectionMask(null);
            }
            throw new Error("No text found for translation.");
        }
        
        // --- STEP 2: INPAINT (if selection existed) ---
        if (hasSelection) {
            setBatchStatusMessage(`Step ${currentStep++}/${totalSteps}: Recalling selection...`);
            await sleep(500);
            setBatchStatusMessage(`Step ${currentStep++}/${totalSteps}: Cleaning background...`);
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = tempImageUrl;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror= (err) => reject(err); });

            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("Could not get context for inpainting");
            ctx.drawImage(img, 0, 0);
            const originalImageData = ctx.getImageData(0, 0, img.width, img.height);
            const resultImageData = imageProcessing.inpaint(originalImageData, selectionForProcess, inpaintAutoColor ? 'auto' : 'manual', inpaintManualColor);
            ctx.putImageData(resultImageData, 0, 0);
            
            const newImageUrl = canvas.toDataURL(selectedFile.file.type);
            if (initialAppState.cleanedImageDataUrl) {
                URL.revokeObjectURL(initialAppState.cleanedImageDataUrl);
            }
            tempImageUrl = newImageUrl;
        }

        // --- STEP 3: TRANSLATE ---
        setBatchStatusMessage(`Step ${currentStep++}/${totalSteps}: Translating text...`);
        const boxesForTranslation = tempTextBoxes.filter(b => b.type === 'ocr' && b.ocrText);
        if (boxesForTranslation.length > 0) {
            const textsToTranslate = boxesForTranslation.map(t => ({ id: t.id, text: t.ocrText! }));
            const translations = await translateMultipleTexts(textsToTranslate, targetLanguage);
            const originalBoxesMap = new Map<number, TextBox>(boxesForTranslation.map(box => [box.id, box]));
            const newTranslatedBoxes: TextBox[] = translations.map((translation): TextBox | null => {
                const originalBox = originalBoxesMap.get(translation.id);
                if (!originalBox) return null;
                let translated = translation.translatedText;
                if (defaultTextSettings.textTransform === 'uppercase') {
                    translated = translated.toUpperCase();
                }
                return {
                    id: Date.now() + Math.random(), type: 'text',
                    x: originalBox.x, y: originalBox.y, width: originalBox.width, height: originalBox.height,
                    rotation: originalBox.rotation, ocrText: '', plainText: translated, styleSpans: [],
                    fontFamily: defaultTextSettings.fontFamily,
                    fontSize: defaultTextSettings.fontSize,
                    textAlign: defaultTextSettings.textAlign,
                    fontWeight: defaultTextSettings.fontWeight, fontStyle: defaultTextSettings.fontStyle,
                    lineHeight: defaultTextSettings.lineHeight, wordSpacing: defaultTextSettings.wordSpacing,
                    color: defaultTextSettings.color, strokeColor: defaultTextSettings.strokeColor,
                    strokeWidth: defaultTextSettings.strokeWidth,
                };
            }).filter((box): box is TextBox => box !== null);

            const translatedIds = new Set(boxesForTranslation.map(b => b.id));
            tempTextBoxes = [
                ...tempTextBoxes.filter(b => !translatedIds.has(b.id)),
                ...newTranslatedBoxes
            ];
        }

        const finalState: AppState = {
            ...initialAppState,
            strokes: initialAppState.strokes,
            textBoxes: tempTextBoxes,
            cleanedImageDataUrl: tempImageUrl,
        };

        setStateWithHistory(() => finalState);
        if (hasSelection) {
            setSelectionMask(null);
        }
        
        handleClearAllStrokes();
        
        setBatchStatusMessage('Auto process complete!');
        await sleep(2000);

    } catch (error: any) {
        if (error.message === "No text found for translation.") {
            console.log(error.message);
        } else {
            console.error("Auto processing failed:", error);
            if (error instanceof ApiKeyError) setApiKeyError(error.message);
            setBatchStatusMessage(`Error: ${error.message || 'Unknown error'}.`);
            await sleep(5000);
        }
    } finally {
        setIsBatchProcessing(false);
        setBatchStatusMessage(null);
        setActiveTool(null);
        if (processStartTimeRef.current) {
            const duration = (performance.now() - processStartTimeRef.current) / 1000;
            setLastProcessTime(duration);
            processStartTimeRef.current = null;
        }
    }
  };


  const handlePlainTextChange = (newText: string, boxId: number) => {
    setStateWithHistory(prev => ({
        ...prev,
        textBoxes: prev.textBoxes.map(box => {
            if (box.id !== boxId || box.type !== 'text' || !box.plainText) {
                return box;
            }
            
            const oldText = box.plainText;
            const oldSpans = box.styleSpans || [];

            if (oldText === newText) return box;

            // --- 1. Find the changed range using a diffing algorithm ---
            let changeStart = 0;
            while (changeStart < oldText.length && changeStart < newText.length && oldText[changeStart] === newText[changeStart]) {
                changeStart++;
            }

            let oldEnd = oldText.length - 1;
            let newEnd = newText.length - 1;
            while (oldEnd >= changeStart && newEnd >= changeStart && oldText[oldEnd] === newText[newEnd]) {
                oldEnd--;
                newEnd--;
            }
            
            const insertedTextLength = newEnd - changeStart + 1;
            const deletedTextLength = oldEnd - changeStart + 1;
            const lengthDiff = insertedTextLength - deletedTextLength;

            // --- 2. Adjust existing spans based on the change ---
            const adjustedSpans = oldSpans.map(span => {
                const { start, end } = span;
                let newStart = start;
                let newEnd = end;

                // Adjust the start point of the span
                if (start > oldEnd) newStart = start + lengthDiff;
                else if (start > changeStart) newStart = changeStart;

                // Adjust the end point of the span
                if (end > oldEnd) newEnd = end + lengthDiff;
                else if (end > changeStart) newEnd = changeStart;

                return { ...span, start: newStart, end: newEnd };
            }).filter(span => span.start < span.end); // Remove any spans that have collapsed to zero length

            // --- 3. Create a new span for the inserted text if needed ---
            let finalSpans = adjustedSpans;
            if (insertedTextLength > 0) {
                const styleSourceIndex = changeStart > 0 ? changeStart - 1 : 0;
                
                const baseStyleForInheritance = { fontFamily: box.fontFamily, fontSize: box.fontSize };
                const sourceSpan = oldSpans.find(s => styleSourceIndex >= s.start && styleSourceIndex < s.end);
                const sourceStyle = sourceSpan ? { ...baseStyleForInheritance, ...sourceSpan.style } : baseStyleForInheritance;
                
                const newTextStyle: Style = {
                    fontFamily: sourceStyle.fontFamily,
                    fontSize: sourceStyle.fontSize
                };

                // Only create a new span if the inherited style differs from the box's base style
                if (newTextStyle.fontFamily !== box.fontFamily || newTextStyle.fontSize !== box.fontSize) {
                    const newSpan: StyleSpan = {
                        start: changeStart,
                        end: changeStart + insertedTextLength,
                        style: newTextStyle,
                    };
                    finalSpans.push(newSpan);
                }
            }

            // --- 4. Merge adjacent spans that have identical styles for optimization ---
            finalSpans.sort((a, b) => a.start - b.start);
            const mergedSpans: StyleSpan[] = [];
            if (finalSpans.length > 0) {
                let current = { ...finalSpans[0] };
                for (let i = 1; i < finalSpans.length; i++) {
                    const next = finalSpans[i];
                    // If spans are contiguous and have the exact same style object, merge them
                    if (current.end === next.start && JSON.stringify(current.style) === JSON.stringify(next.style)) {
                        current.end = next.end;
                    } else {
                        mergedSpans.push(current);
                        current = { ...next };
                    }
                }
                mergedSpans.push(current);
            }
            
            return { ...box, plainText: newText, styleSpans: mergedSpans };
        })
    }));
  };
    
    const handleFormatChange = useCallback((changes: StyleChange, selection: Selection | null) => {
        if (selectedBoxIds.length === 0) return;

        setStateWithHistory(prev => {
            const newBoxes = prev.textBoxes.map(box => {
                if (!selectedBoxIds.includes(box.id) || box.type !== 'text' || !box.plainText) {
                    return box;
                }
                
                let newBox = { ...box };

                // Case 1: A selection exists. All changes create/modify spans.
                if (selection && selection.start !== selection.end) {
                    const { plainText, styleSpans } = newBox;
                    const { textTransform, ...styleChanges } = changes;

                    // Handle text case transformation separately as it modifies the text itself
                    // FIX: Also check that textTransform is not 'none' to avoid incorrect case changes.
                    if (textTransform && textTransform !== 'none') {
                        const before = plainText.substring(0, selection.start);
                        let selectedText = plainText.substring(selection.start, selection.end);
                        const after = plainText.substring(selection.end);
                        selectedText = textTransform === 'uppercase' ? selectedText.toUpperCase() : selectedText.toLowerCase();
                        newBox.plainText = before + selectedText + after;
                    }

                    if (Object.keys(styleChanges).length > 0) {
                        // --- Start: Robust Character-Map Formatting ---
                        const baseStyle: Style = {
                            fontFamily: box.fontFamily, fontSize: box.fontSize, textAlign: box.textAlign,
                            fontWeight: box.fontWeight, fontStyle: box.fontStyle, lineHeight: box.lineHeight,
                            wordSpacing: box.wordSpacing, color: box.color, strokeColor: box.strokeColor,
                            strokeWidth: box.strokeWidth,
                        };

                        // 1. Create a style map for each character, applying base and span styles
                        const charStyles: Style[] = Array.from({ length: plainText.length }, () => ({ ...baseStyle }));
                        for (const span of styleSpans!) {
                            for (let i = span.start; i < span.end; i++) {
                                if (charStyles[i]) charStyles[i] = { ...charStyles[i], ...span.style };
                            }
                        }

                        // 2. Determine the new style to apply. The toggle logic is removed as it causes issues with applying absolute styles.
                        // The UI components now send the final desired value (e.g., 'bold' or 'normal').
                        const newAppliedStyle: Style = { ...styleChanges };


                        // 3. Apply the new changes to the selected range in the character map
                        for (let i = selection.start; i < selection.end; i++) {
                            if (charStyles[i]) {
                                // Clear undefined keys
                                Object.keys(newAppliedStyle).forEach(key => {
                                    if ((newAppliedStyle as any)[key] === undefined) {
                                        delete (charStyles[i] as any)[key];
                                    }
                                });
                                // Apply the rest
                                charStyles[i] = { ...charStyles[i], ...newAppliedStyle };
                            }
                        }

                        // 4. Convert the character map back into an optimized list of spans
                        const newSpans: StyleSpan[] = [];
                        if (plainText.length > 0) {
                            let currentSpan: StyleSpan | null = null;
                            for (let i = 0; i < plainText.length; i++) {
                                const optimizedStyle: Style = {};
                                let hasOverrides = false;
                                for (const key in charStyles[i]) {
                                    if (Object.prototype.hasOwnProperty.call(charStyles[i], key)) {
                                        const k = key as keyof Style;
                                        if ((charStyles[i] as any)[k] !== (baseStyle as any)[k] && (charStyles[i] as any)[k] !== undefined) {
                                            (optimizedStyle as any)[k] = (charStyles[i] as any)[k];
                                            hasOverrides = true;
                                        }
                                    }
                                }
                                
                                if (currentSpan && JSON.stringify(currentSpan.style) === JSON.stringify(optimizedStyle)) {
                                    currentSpan.end = i + 1;
                                } else {
                                    if (currentSpan) newSpans.push(currentSpan);
                                    
                                    if (hasOverrides) {
                                        currentSpan = { start: i, end: i + 1, style: optimizedStyle };
                                    } else {
                                        currentSpan = null;
                                    }
                                }
                            }
                            if (currentSpan) newSpans.push(currentSpan);
                        }
                        newBox.styleSpans = newSpans;
                        // --- End: Robust Character-Map Formatting ---
                    }
                } 
                // Case 2: No selection. Changes apply to the entire box's base style.
                else {
                    // FIX: Also check that textTransform is not 'none' to avoid incorrect case changes.
                    if (changes.textTransform && changes.textTransform !== 'none') {
                        newBox.plainText = changes.textTransform === 'uppercase'
                            ? newBox.plainText.toUpperCase()
                            : newBox.plainText.toLowerCase();
                    }
                    
                    const { textTransform, ...styleChanges } = changes;
                    const newBaseStyle = { ...newBox, ...styleChanges };

                    // When updating the base style, we must clean up spans that are now redundant
                    const cleanedSpans = (newBox.styleSpans || []).map(span => {
                        const newSpanStyle: Style = {};
                        let hasOverrides = false;
                        for(const key in span.style) {
                            if (Object.prototype.hasOwnProperty.call(span.style, key)) {
                                const k = key as keyof Style;
                                if ((span.style as any)[k] !== (newBaseStyle as any)[k]) {
                                    (newSpanStyle as any)[k] = (span.style as any)[k];
                                    hasOverrides = true;
                                }
                            }
                        }
                        return hasOverrides ? { ...span, style: newSpanStyle } : null;
                    }).filter((s): s is StyleSpan => s !== null);

                    newBox = { ...newBaseStyle, styleSpans: cleanedSpans };
                }

                return newBox;
            });
            return { ...prev, textBoxes: newBoxes };
        });

        if (selection) {
             setSelectionToRestore({ ...selection, trigger: Date.now() });
        }

    }, [selectedBoxIds, setStateWithHistory]);

    const handleSaveStyle = (slotIndex: number, style: Style) => {
        const newSlots = [...styleSlots];
        newSlots[slotIndex] = style;
        setStyleSlots(newSlots);
    };
    
    const handleBringForward = useCallback(() => {
        if (!canBringForward || !primarySelectedId) return;
        
        setStateWithHistory(prev => {
            const items = [...prev.textBoxes];
            const fromIndex = items.findIndex(item => item.id === primarySelectedId);
            if (fromIndex === -1 || fromIndex >= items.length - 1) return prev;
    
            const toIndex = fromIndex + 1;
            const element = items.splice(fromIndex, 1)[0];
            items.splice(toIndex, 0, element);
    
            return { ...prev, textBoxes: items };
        });
    }, [canBringForward, primarySelectedId, setStateWithHistory]);
    
    const handleSendBackward = useCallback(() => {
        if (!canSendBackward || !primarySelectedId) return;
    
        setStateWithHistory(prev => {
            const items = [...prev.textBoxes];
            const fromIndex = items.findIndex(item => item.id === primarySelectedId);
            if (fromIndex <= 0) return prev;
    
            const toIndex = fromIndex - 1;
            const element = items.splice(fromIndex, 1)[0];
            items.splice(toIndex, 0, element);
    
            return { ...prev, textBoxes: items };
        });
    }, [canSendBackward, primarySelectedId, setStateWithHistory]);

    const handleSplitTextBox = useCallback((boxId: number, splitAt: number) => {
        const boxToSplit = history.present.textBoxes.find(b => b.id === boxId);
        
        if (!boxToSplit || boxToSplit.type !== 'text' || !boxToSplit.plainText) {
            return;
        }

        // --- Calculate new text and styles ---
        const text1 = boxToSplit.plainText.substring(0, splitAt);
        const text2 = boxToSplit.plainText.substring(splitAt);

        const spans1 = (boxToSplit.styleSpans || []).map(span => ({
            ...span,
            style: { ...span.style },
            start: Math.min(span.start, splitAt),
            end: Math.min(span.end, splitAt),
        })).filter(span => span.start < span.end);

        const spans2 = (boxToSplit.styleSpans || []).map(span => ({
            ...span,
            style: { ...span.style },
            start: Math.max(0, span.start - splitAt),
            end: Math.max(0, span.end - splitAt),
        })).filter(span => span.start < span.end);

        // --- Calculate new dimensions and positions (proportional) ---
        const totalLength = boxToSplit.plainText.length;
        const splitRatio = totalLength > 0 ? splitAt / totalLength : 0.5;
        
        const box1NewWidth = boxToSplit.width * splitRatio;
        const box2Width = boxToSplit.width * (1 - splitRatio);

        const box1 = {
            ...boxToSplit,
            plainText: text1,
            styleSpans: spans1,
            width: box1NewWidth,
        };
        
        const box2Id = Date.now();
        const box2 = {
            ...boxToSplit,
            id: box2Id,
            plainText: text2,
            styleSpans: spans2,
            x: boxToSplit.x + box1NewWidth,
            width: box2Width,
        };

        // --- Update state ---
        setStateWithHistory(prev => {
            const newBoxes = prev.textBoxes.map(b => b.id === boxId ? box1 : b);
            const insertIndex = newBoxes.findIndex(b => b.id === box1.id);
            if (insertIndex > -1) {
                newBoxes.splice(insertIndex + 1, 0, box2);
            } else {
                newBoxes.push(box2); // Fallback
            }
            return { ...prev, textBoxes: newBoxes };
        });
        
        setSelectedBoxIds([box1.id, box2.id]);
        if (editingBoxId === boxId) {
            setEditingBoxId(null);
        }

    }, [history.present.textBoxes, setStateWithHistory, editingBoxId]);


    const handleColorPick = (color: string) => {
        if (eyedropperTarget) {
            if (eyedropperTarget === 'brush') {
                setBrushColor(color);
            } else if (eyedropperTarget === 'color' || eyedropperTarget === 'strokeColor') {
                const change: StyleChange = eyedropperTarget === 'color' ? { color } : { strokeColor: color };
                handleFormatChange(change, null);
            } else if (eyedropperTarget === 'inpaint') {
                setInpaintManualColor(color);
            }
        }
        setEyedropperTarget(null);
    };

  const handleTextBoxesUpdate = (updatedBoxes: TextBox[]) => {
    setStateWithHistory(prev => ({ ...prev, textBoxes: updatedBoxes }));
  };

  const handleStrokesUpdate = (updatedStrokes: Stroke[]) => {
    setStateWithHistory(prev => ({ ...prev, strokes: updatedStrokes }));
  };
  
  const handleAddFreeTextBox = () => {
    if (!selectedFile) return;

    // Deactivate any active tool, like the magic wand, to switch focus to text editing.
    setActiveTool(null);

    const newId = Date.now();
    let newBoxSettings: TextFormatSettings = defaultTextSettings;
    
    // Check for a selected text box to inherit styles from
    const lastSelectedBox = textBoxes.find(b => b.id === primarySelectedId);
    if (lastSelectedBox && lastSelectedBox.type === 'text') {
        newBoxSettings = {
            fontFamily: lastSelectedBox.fontFamily || defaultTextSettings.fontFamily,
            fontSize: lastSelectedBox.fontSize || defaultTextSettings.fontSize,
            textAlign: lastSelectedBox.textAlign || defaultTextSettings.textAlign,
            fontWeight: lastSelectedBox.fontWeight || defaultTextSettings.fontWeight,
            fontStyle: lastSelectedBox.fontStyle || defaultTextSettings.fontStyle,
            lineHeight: lastSelectedBox.lineHeight || defaultTextSettings.lineHeight,
            wordSpacing: lastSelectedBox.wordSpacing || defaultTextSettings.wordSpacing,
            color: lastSelectedBox.color || defaultTextSettings.color,
            strokeColor: lastSelectedBox.strokeColor || defaultTextSettings.strokeColor,
            strokeWidth: lastSelectedBox.strokeWidth || defaultTextSettings.strokeWidth,
            textTransform: 'none', // Don't inherit case transform by default
        };
    }

    const { textTransform, ...otherSettings } = newBoxSettings;
    const initialText = 'New Text';
    
    const newBox: TextBox = {
       id: newId,
       type: 'text',
       x: 0.4,
       y: 0.4,
       width: 0.2,
       height: 0.1,
       rotation: 0,
       ocrText: '',
       plainText: (textTransform === 'uppercase' || (lastSelectedBox && lastSelectedBox.plainText === lastSelectedBox.plainText?.toUpperCase()))
            ? initialText.toUpperCase()
            : initialText,
       styleSpans: [],
       ...otherSettings,
    };
    setStateWithHistory(prev => ({ ...prev, textBoxes: [...prev.textBoxes, newBox] }));
    setSelectedBoxIds([newId]);
  };

  const handleDeleteBox = useCallback(() => {
    if (selectedBoxIds.length === 0) return;
    setStateWithHistory(prev => ({ ...prev, textBoxes: prev.textBoxes.filter(box => !selectedBoxIds.includes(box.id))}));
    setSelectedBoxIds([]);
  }, [selectedBoxIds, setStateWithHistory]);

  const handleMoveBoxes = useCallback((dx: number, dy: number) => {
    if (selectedBoxIds.length === 0) return;

    setStateWithHistory(prev => ({
        ...prev,
        textBoxes: prev.textBoxes.map(box => {
            if (selectedBoxIds.includes(box.id)) {
                const newBox = { ...box };
                newBox.x += dx;
                newBox.y += dy;

                // Clamp position to stay within image bounds (0 to 1-size)
                newBox.x = Math.max(0, Math.min(newBox.x, 1 - newBox.width));
                newBox.y = Math.max(0, Math.min(newBox.y, 1 - newBox.height));
                
                // Also move path points if they exist
                if (newBox.path) {
                    newBox.path = newBox.path.map(p => ({
                        anchor: { x: p.anchor.x + dx, y: p.anchor.y + dy },
                        handle1: { x: p.handle1.x + dx, y: p.handle1.y + dy },
                        handle2: { x: p.handle2.x + dx, y: p.handle2.y + dy },
                    }));
                }
                return newBox;
            }
            return box;
        })
    }));
  }, [selectedBoxIds, setStateWithHistory]);

  const handleClearAllStrokes = useCallback(() => {
    if (history.present.strokes.some(s => s.type === 'brush' || s.type === 'eraser')) {
        setStateWithHistory(prev => ({
            ...prev,
            strokes: prev.strokes.filter(stroke => stroke.type !== 'brush' && stroke.type !== 'eraser'),
        }));
    }
  }, [setStateWithHistory, history]);

  const handleBoxDoubleClick = (boxId: number) => {
    setSelectedBoxIds([boxId]);
    setEditingBoxId(boxId);
  };

  const handleFinishEditing = () => {
    setEditingBoxId(null);
  };

    const generateImageBlob = useCallback(async (
    imageUrl: string,
    textBoxesToSave: TextBox[],
    strokesToSave: Stroke[],
    format: 'png' | 'jpeg' | 'webp',
    quality: number
  ): Promise<Blob | null> => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve(undefined);
          img.onerror = (err) => reject(new Error(`Failed to load image for saving`));
      });

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = img.naturalWidth;
      offscreenCanvas.height = img.naturalHeight;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not create offscreen canvas context");

      ctx.drawImage(img, 0, 0);

      const normToScreen = (pos: {x: number, y: number}) => ({ x: pos.x * img.naturalWidth, y: pos.y * img.naturalHeight });
      // FIX: Removed extra argument from drawStrokesOnCanvas call, which expects 3 arguments but was given 4.

      // --- Inizio del blocco di codice da inserire ---

if (strokesToSave.length > 0) {
    // Crea un canvas temporaneo che funzionerà come un "livello" separato solo per i tratti.
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = offscreenCanvas.width;
    strokeCanvas.height = offscreenCanvas.height;
    const strokeCtx = strokeCanvas.getContext('2d');

    if (strokeCtx) {
        // Disegna TUTTI i tratti (pennelli, gomme, ecc.) sul canvas temporaneo.
        // La funzione `drawStrokesOnCanvas` gestisce già correttamente la logica
        // della gomma (usando 'destination-out'), quindi cancellerà solo gli altri
        // tratti disegnati su questo livello temporaneo.
        drawStrokesOnCanvas(strokeCtx, strokesToSave, normToScreen);

        // Ora, disegna il risultato del livello temporaneo (con i tratti e le cancellature)
        // sopra l'immagine principale. Le aree trasparenti create dalla gomma lasceranno
        // trasparire l'immagine di sfondo, che è esattamente l'effetto desiderato.
        ctx.drawImage(strokeCanvas, 0, 0);
    } else {
        // Fallback nel raro caso in cui il context non possa essere creato.
        console.error("Could not create temporary stroke canvas context for saving.");
        // Manteniamo il vecchio comportamento (con bug) solo come misura di sicurezza.
        drawStrokesOnCanvas(ctx, strokesToSave, normToScreen);
    }
}

// --- Fine del blocco di codice da inserire ---
      
      const imageElementMap = new Map<string, HTMLImageElement>();
      const imageLoadPromises = textBoxesToSave
        .filter(box => box.type === 'image' && box.imageDataUrl)
        .map(box => {
            const imageEl = new Image();
            imageEl.crossOrigin = "anonymous";
            const promise = new Promise<void>((resolve, reject) => {
                imageEl.onload = () => {
                    imageElementMap.set(box.imageDataUrl!, imageEl);
                    resolve();
                };
                imageEl.onerror = reject;
            });
            imageEl.src = box.imageDataUrl!;
            return promise;
        });

      await Promise.all(imageLoadPromises);

      textBoxesToSave.forEach(box => {
          const boxX = box.x * img.naturalWidth;
          const boxY = box.y * img.naturalHeight;
          const boxWidth = box.width * img.naturalWidth;
          const boxHeight = box.height * img.naturalHeight;

          if (box.type === 'image' && box.imageDataUrl) {
                const imageElement = imageElementMap.get(box.imageDataUrl);
                if (imageElement) {
                    const centerX = boxX + boxWidth / 2;
                    const centerY = boxY + boxHeight / 2;
            
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate(box.rotation * Math.PI / 180);
                    ctx.drawImage(imageElement, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
                    ctx.restore();
                }
          } else if (box.type === 'text') {
              const textToRender = serializeSpansToTaggedText(box.plainText || '', box.styleSpans || []);
              const renderableBox = { ...box, translatedText: textToRender };
              drawWrappedTextOnCanvas(ctx, renderableBox, boxX, boxY, boxWidth, boxHeight);
          }
      });

      const mimeType = `image/${format}`;
      const blob = await new Promise<Blob | null>(resolve => offscreenCanvas.toBlob(resolve, mimeType, quality / 100));
      return blob;
  }, []);

  const saveImageFile = useCallback(async (
    imageUrl: string,
    file: File,
    textBoxesToSave: TextBox[],
    strokesToSave: Stroke[],
    format: 'png' | 'jpeg' | 'webp',
    quality: number
  ) => {
      const blob = await generateImageBlob(imageUrl, textBoxesToSave, strokesToSave, format, quality);
      if (!blob) {
        throw new Error(`Failed to generate image blob for ${file.name}`);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // FIX: The extension should be 'jpg' when the format is 'jpeg'.
      const extension = format === 'jpeg' ? 'jpg' : format;
      a.download = `${file.name.split('.').slice(0, -1).join('.')}-translated.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }, [generateImageBlob]);


  const handleSaveCurrentImage = useCallback(async () => {
      if (!displayedImageUrl || !selectedFile) return;
      // FIX: Convert 'jpg' state to 'jpeg' for the save function.
      await saveImageFile(displayedImageUrl, selectedFile.file, textBoxes, strokes, saveFormat === 'jpg' ? 'jpeg' : saveFormat, saveQuality);
      setIsSaveModalOpen(false);
  }, [displayedImageUrl, selectedFile, textBoxes, strokes, saveFormat, saveQuality, saveImageFile]);

  const handleExportAll = useCallback(async () => {
    setIsExportAllModalOpen(false);
    if (typeof JSZip === 'undefined') {
        alert('Could not create zip file. JSZip library is missing. Please check your internet connection or the app configuration.');
        return;
    }
    if (files.length === 0) {
        alert('No pages to export.');
        return;
    }

    setStatus(AppStatus.SAVING);
    try {
        const zip = new JSZip();
        const allStates = new Map<string, History<AppState>>(fileStates);
        if (selectedFile) {
            allStates.set(selectedFile.file.name, history);
        }

        for (const fileData of files) {
            // Get state for the file. If it doesn't exist, use an initial empty state.
            const fileHistory = allStates.get(fileData.file.name) || getInitialHistory();
            const { textBoxes: fileTextBoxes, strokes: fileStrokes, cleanedImageDataUrl } = fileHistory.present;
            
            // The base image is either the cleaned version or the original.
            const baseImageUrl = cleanedImageDataUrl || fileData.url;
            
            // FIX: Use 'jpg' for state but 'jpeg' for API/blob generation.
            const format = exportAllFormat;
            const quality = exportAllQuality;
            
            // The new file name depends on the selected export format.
            const extension = format;
            const newFileName = `${fileData.file.name.split('.').slice(0, -1).join('.')}.${extension}`;
            
            const mimeTypeFormat = format === 'jpg' ? 'jpeg' : format;
            // Always generate a new blob to ensure consistent format and quality.
            const blob = await generateImageBlob(baseImageUrl, fileTextBoxes, fileStrokes, mimeTypeFormat, quality);
            if (blob) {
                zip.file(newFileName, blob);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comic-translation.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error creating zip file:", error);
        setStatus(AppStatus.ERROR);
        alert("An error occurred while creating the zip file. Check the console for details.");
    } finally {
        setStatus(AppStatus.READY);
    }
  }, [files, fileStates, selectedFile, history, generateImageBlob, exportAllFormat, exportAllQuality]);

    const handleSaveAsPdf = useCallback(async () => {
    setIsPdfModalOpen(false);
    if (typeof jspdf === 'undefined') {
        alert('Could not create PDF file. jsPDF library is missing.');
        return;
    }
    if (files.length === 0) {
        alert('No pages to export.');
        return;
    }

    setStatus(AppStatus.SAVING);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });

        const allStates = new Map<string, History<AppState>>(fileStates);
        if (selectedFile) {
            allStates.set(selectedFile.file.name, history);
        }

        for (let i = 0; i < files.length; i++) {
            const fileData = files[i];
            const fileHistory = allStates.get(fileData.file.name) || getInitialHistory();
            const { textBoxes: fileTextBoxes, strokes: fileStrokes, cleanedImageDataUrl } = fileHistory.present;
            
            const baseImageUrl = cleanedImageDataUrl || fileData.url;
            
            const format = pdfExportFormat;
            const quality = pdfExportQuality;
            const mimeTypeFormat = format === 'jpg' ? 'jpeg' : format;

            const blob = await generateImageBlob(baseImageUrl, fileTextBoxes, fileStrokes, mimeTypeFormat, quality);
            if (!blob) continue;

            if (i > 0) {
                doc.addPage();
            }

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const img = new Image();
            const url = URL.createObjectURL(blob);
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = url;
            });
            
            const imgWidth = img.width;
            const imgHeight = img.height;
            URL.revokeObjectURL(url);

            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            const w = imgWidth * ratio;
            const h = imgHeight * ratio;
            const x = (pageWidth - w) / 2;
            const y = (pageHeight - h) / 2;

            const imgData = new Uint8Array(await blob.arrayBuffer());
            doc.addImage(imgData, (format === 'jpg' ? 'JPEG' : format.toUpperCase()), x, y, w, h);
        }

        doc.save('comic-export.pdf');

    } catch (error) {
        console.error("Error creating PDF file:", error);
        setStatus(AppStatus.ERROR);
        alert("An error occurred while creating the PDF file. Check the console for details.");
    } finally {
        setStatus(AppStatus.READY);
    }
  }, [files, fileStates, selectedFile, history, generateImageBlob, pdfExportFormat, pdfExportQuality]);

  const handleInpaint = useCallback(async () => {
    if (!selectionMask || !displayedImageUrl) return;

    setStatus(AppStatus.INPAINTING);
    // Allow UI to update before heavy processing
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = displayedImageUrl;
        await new Promise((resolve, reject) => { img.onload = () => resolve(undefined); img.onerror = reject; });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get canvas context for inpainting");
        
        ctx.drawImage(img, 0, 0);
        const originalImageData = ctx.getImageData(0, 0, img.width, img.height);

        const resultImageData = imageProcessing.inpaint(
            originalImageData,
            selectionMask,
            inpaintAutoColor ? 'auto' : 'manual',
            inpaintManualColor
        );
        
        ctx.putImageData(resultImageData, 0, 0);
        const newImageUrl = canvas.toDataURL(selectedFile?.file.type || 'image/png');

        // Revoke old object URL if it exists
        if (history.present.cleanedImageDataUrl) {
            URL.revokeObjectURL(history.present.cleanedImageDataUrl);
        }

        setStateWithHistory(prev => ({
            ...prev,
            cleanedImageDataUrl: newImageUrl
        }));
        
        setLastSelectionMask(selectionMask); // Save for recall
        setSelectionMask(null); // Consume the selection
    } catch (error) {
        console.error("Inpainting failed:", error);
        setStatus(AppStatus.ERROR);
    } finally {
        setStatus(AppStatus.READY);
    }
}, [selectionMask, displayedImageUrl, inpaintAutoColor, inpaintManualColor, selectedFile, history.present.cleanedImageDataUrl, setStateWithHistory]);

const isProcessing = status !== AppStatus.READY && status !== AppStatus.ERROR || isBatchProcessing;

const handleOcr = useCallback(async () => {
    if (isProcessing) return;

    processStartTimeRef.current = performance.now();
    setLastProcessTime(null);

    try {
        // Case 1: Magic wand selection exists. Create boxes, then run OCR on them.
        if (selectionMask) {
            setStatus(AppStatus.PATH_TO_BOX);
            try {
                setLastSelectionMask(selectionMask); // Save for recall

                if (!displayedImageUrl) {
                    setStatus(AppStatus.READY);
                    return;
                }

                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = displayedImageUrl;
                // FIX: Explicitly call resolve with 'undefined' to satisfy TypeScript in some strict configurations
                // where resolve() might be misinterpreted as having 0 arguments when 1 is expected for Promise<void>.
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve(undefined);
                    img.onerror = (err) => reject(new Error('Image load failed for selection finalization'));
                });

                const { width, height } = img;
                const paths = imageProcessing.traceAndVectorizeAll(selectionMask, width, height);

                const newlyCreatedBoxes: TextBox[] = [];
                if (paths && paths.length > 0) {
                    paths.forEach(path => {
                        if (path.length < 3) return;

                        const normalizedPath = path.map(p => ({
                            anchor: { x: p.anchor.x / width, y: p.anchor.y / height },
                            handle1: { x: p.handle1.x / width, y: p.handle1.y / height },
                            handle2: { x: p.handle2.x / width, y: p.handle2.y / height },
                        }));

                        const allPoints = normalizedPath.map(p => p.anchor);
                        const minX = Math.min(...allPoints.map(p => p.x));
                        const minY = Math.min(...allPoints.map(p => p.y));
                        const maxX = Math.max(...allPoints.map(p => p.x));
                        const maxY = Math.max(...allPoints.map(p => p.y));
                        
                        const newId = Date.now() + Math.random();
                        const newBox: TextBox = {
                        id: newId,
                        type: 'ocr',
                        x: minX, y: minY, width: maxX - minX, height: maxY - minY,
                        rotation: 0, ocrText: '', plainText: '', styleSpans: [],
                        path: normalizedPath,
                        ...defaultTextSettings
                        };
                    
                        if (newBox.width > 0.001 && newBox.height > 0.001) {
                            newlyCreatedBoxes.push(newBox);
                        }
                    });
                }
                
                setSelectionMask(null); // Consume the selection

                if (newlyCreatedBoxes.length > 0) {
                    const newBoxIds = newlyCreatedBoxes.map(b => b.id);
                    setStateWithHistory(prev => ({
                        ...prev,
                        textBoxes: [...prev.textBoxes, ...newlyCreatedBoxes]
                    }));
                    setSelectedBoxIds(newBoxIds);
                    
                    // Now, call the OCR function on these specific new boxes
                    await handleRunOcr(newlyCreatedBoxes);
                } else {
                    setStatus(AppStatus.READY);
                }
            } catch (error: any) {
                console.error("Error during selection finalization or OCR:", error);
                if (error instanceof ApiKeyError) {
                    setApiKeyError(error.message);
                }
                setStatus(AppStatus.ERROR);
            }
        // Case 2: No selection, but existing OCR boxes need text extraction.
        } else if (textBoxes.some(b => b.type === 'ocr' && !b.ocrText)) {
            await handleRunOcr();
        }
    } finally {
        if (processStartTimeRef.current) {
            const duration = (performance.now() - processStartTimeRef.current) / 1000;
            setLastProcessTime(duration);
            processStartTimeRef.current = null;
        }
    }
}, [isProcessing, selectionMask, displayedImageUrl, defaultTextSettings, textBoxes, setStateWithHistory, handleRunOcr, setApiKeyError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isProcessing = status !== AppStatus.READY && status !== AppStatus.ERROR || isBatchProcessing;

      if (e.key === 'Escape') {
          if (editingBoxId) {
              handleFinishEditing();
          }
          if (eyedropperTarget) {
              setEyedropperTarget(null);
          }
          if (selectionMask) {
              handleClearSelection();
          }
      }
      
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        if (!isProcessing) {
            e.preventDefault();
            handleClearAllStrokes();
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionMask && !isProcessing) {
          e.preventDefault();
          handleInpaint();
        } else {
          handleDeleteBox();
        }
      }

      if (e.key.startsWith('Arrow')) {
        if (selectedBoxIds.length > 0) {
            e.preventDefault();
            // Using a small normalized step. 1/1000 is a good "pixel" on a 1000px image.
            const step = 0.001; 
            const shiftStep = 0.01; // 10x faster with shift
            const moveAmount = e.shiftKey ? shiftStep : step;

            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case 'ArrowUp': dy = -moveAmount; break;
                case 'ArrowDown': dy = moveAmount; break;
                case 'ArrowLeft': dx = -moveAmount; break;
                case 'ArrowRight': dx = moveAmount; break;
            }
            
            if (dx !== 0 || dy !== 0) {
                handleMoveBoxes(dx, dy);
            }
        }
        return; // Prevent other handlers like delete from firing.
      }


      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
        return;
      }
      
      if (e.altKey) {
        e.preventDefault(); // Prevent default browser actions for Alt+Key combinations
        switch (e.key.toLowerCase()) {
            case 'b':
                setActiveTool(prevTool => prevTool === 'brush' ? null : 'brush');
                break;
                case 'r':
                if (activeTool === 'brush') {
                    setBrushColor('#FF0000'); // Imposta il colore del pennello su rosso
                }
                break;
            case 'w':
                if (activeTool === 'brush') {
                    setBrushColor('#FFFFFF'); // Imposta il colore del pennello su bianco
                }
                break;
            // FINE --->
            case 't':
                if (textBoxes.some(box => box.type === 'ocr' && box.ocrText && box.ocrText.length > 0) && !isProcessing) {
                    handleTranslateAll();
                }
                break;
            case 'o':
                if (!isProcessing && selectedFile && (selectionMask || textBoxes.some(b => b.type === 'ocr' && !b.ocrText))) {
                    handleOcr();
                }
                break;
            case 'a':
                if (!isProcessing && selectedFile) {
                    handleProcessCurrentPage();
                }
                break;
            default:
                break; // Do nothing for other Alt combinations
        }
        return;
      }

      if (e.key === '\\') {
        if (selectionMask) {
          e.preventDefault();
          handleClearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDeleteBox, handleUndo, handleRedo, eyedropperTarget, editingBoxId, selectedBoxIds, handleMoveBoxes, activeTool, status, isBatchProcessing, textBoxes, handleTranslateAll, selectionMask, handleClearSelection, handleInpaint, handleOcr, handleProcessCurrentPage, selectedFile, handleClearAllStrokes]);

  const handleMouseDown = (e: React.MouseEvent, panel: 'left' | 'right') => {
    e.preventDefault();
    isResizing.current = true;
    resizingPanel.current = panel;
    resizeStart.current = { x: e.clientX, left: panelWidths.left, right: panelWidths.right };
  };
  
  const handleVerticalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingVertical.current = true;
  };

  const handleMouseUp = useCallback(() => {
    if (isResizing.current || isResizingVertical.current) {
        isResizing.current = false;
        resizingPanel.current = null;
        isResizingVertical.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
    }
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const dx = e.clientX - resizeStart.current.x;
        const totalWidth = window.innerWidth;
        const deltaPercent = (dx / totalWidth) * 100;

        let newLeft = resizeStart.current.left;
        let newRight = resizeStart.current.right;
        
        if (resizingPanel.current === 'left') {
            newLeft += deltaPercent;
        } else {
            newRight -= deltaPercent;
        }

        // Clamp individual values
        if (newLeft < 15) newLeft = 15;
        if (newRight < 20) newRight = 20;

        // Clamp the sum
        const maxCombined = 70;
        if (newLeft + newRight > maxCombined) {
            if (resizingPanel.current === 'left') {
                newRight = maxCombined - newLeft;
            } else {
                newLeft = maxCombined - newRight;
            }
        }
        
        setPanelWidths({
            left: newLeft,
            center: 100 - newLeft - newRight,
            right: newRight
        });
    }
    if (isResizingVertical.current) {
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        if (leftPanelRef.current) {
            const panelRect = leftPanelRef.current.getBoundingClientRect();
            const newHeight = ((e.clientY - panelRect.top) / panelRect.height) * 100;
            const clampedHeight = Math.max(10, Math.min(90, newHeight));
            setLeftPanelTopHeight(clampedHeight);
        }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isSaveModalOpen) {
        setEstimatedSize(null);
        return;
    }
    // FIX: Compare against 'jpg' instead of 'jpeg' to match state type.
    if ((saveFormat !== 'jpg' && saveFormat !== 'webp') || !displayedImageUrl) {
        setEstimatedSize(null);
        return;
    }

    // Debounced estimation
    const handler = setTimeout(async () => {
        try {
            // FIX: Convert 'jpg' state to 'jpeg' for blob generation.
            const blob = await generateImageBlob(displayedImageUrl, textBoxes, strokes, saveFormat === 'jpg' ? 'jpeg' : saveFormat, saveQuality);
            if (blob) {
                setEstimatedSize(formatFileSize(blob.size));
            }
        } catch (error) {
            console.error("Error estimating file size:", error);
            setEstimatedSize("Error");
        }
    }, 250); // 250ms debounce

    return () => {
        clearTimeout(handler);
    };
  }, [isSaveModalOpen, saveFormat, saveQuality, displayedImageUrl, textBoxes, strokes, generateImageBlob]);

  useEffect(() => {
    if (!isExportAllModalOpen) {
        setEstimatedZipSize(null);
        return;
    }
    // FIX: Compare against 'jpg' instead of 'jpeg' to match state type.
    if ((exportAllFormat !== 'jpg' && exportAllFormat !== 'webp') || files.length === 0) {
        setEstimatedZipSize(null);
        return;
    }

    // Debounced estimation
    const handler = setTimeout(async () => {
        try {
            let totalSize = 0;
            const allStates = new Map<string, History<AppState>>(fileStates);
            if (selectedFile) {
                allStates.set(selectedFile.file.name, history);
            }

            for (const fileData of files) {
                const fileHistory = allStates.get(fileData.file.name) || getInitialHistory();
                const { textBoxes: fileTextBoxes, strokes: fileStrokes, cleanedImageDataUrl } = fileHistory.present;
                const baseImageUrl = cleanedImageDataUrl || fileData.url;
                
                // FIX: Convert 'jpg' state to 'jpeg' for blob generation.
                const blob = await generateImageBlob(baseImageUrl, fileTextBoxes, fileStrokes, exportAllFormat === 'jpg' ? 'jpeg' : exportAllFormat, exportAllQuality);
                if (blob) {
                    totalSize += blob.size;
                }
            }

            if (totalSize > 0) {
                setEstimatedZipSize(formatFileSize(totalSize));
            } else {
                setEstimatedZipSize(null);
            }

        } catch (error) {
            console.error("Error estimating zip file size:", error);
            setEstimatedZipSize("Error");
        }
    }, 250); // 250ms debounce

    return () => {
        clearTimeout(handler);
    };
  }, [isExportAllModalOpen, exportAllFormat, exportAllQuality, files, fileStates, history, selectedFile, generateImageBlob]);

  useEffect(() => {
    if (!isPdfModalOpen) {
        setEstimatedPdfSize(null);
        return;
    }
    if ((pdfExportFormat !== 'jpg' && pdfExportFormat !== 'webp') || files.length === 0) {
        setEstimatedPdfSize(null);
        return;
    }

    const handler = setTimeout(async () => {
        try {
            let totalSize = 0;
            const allStates = new Map<string, History<AppState>>(fileStates);
            if (selectedFile) {
                allStates.set(selectedFile.file.name, history);
            }

            // Estimate based on the first page only for performance
            if (files.length > 0) {
                const fileData = files[0];
                const fileHistory = allStates.get(fileData.file.name) || getInitialHistory();
                const { textBoxes: fileTextBoxes, strokes: fileStrokes, cleanedImageDataUrl } = fileHistory.present;
                const baseImageUrl = cleanedImageDataUrl || fileData.url;
                
                const blob = await generateImageBlob(baseImageUrl, fileTextBoxes, fileStrokes, pdfExportFormat === 'jpg' ? 'jpeg' : pdfExportFormat, pdfExportQuality);
                if (blob) {
                    totalSize = blob.size * files.length; // rough estimate
                }
            }

            if (totalSize > 0) {
                setEstimatedPdfSize(formatFileSize(totalSize));
            } else {
                setEstimatedPdfSize(null);
            }

        } catch (error) {
            console.error("Error estimating PDF file size:", error);
            setEstimatedPdfSize("Error");
        }
    }, 250); // 250ms debounce

    return () => {
        clearTimeout(handler);
    };
  }, [isPdfModalOpen, pdfExportFormat, pdfExportQuality, files, fileStates, history, selectedFile, generateImageBlob]);

  const currentUnsavedSettings: AppSettings = {
    targetLanguage,
    interfaceLanguage: useTranslation().language,
    defaultTextFormat: defaultTextSettings,
    brushColor,
    paintBrushSize,
    selectionEraserSize,
    brushShape: 'round',
    brushHardness,
    brushOpacity,
    panelWidths,
    textAreaHeights,
    inpaintAutoColor,
    inpaintManualColor,
    styleSlots: styleSlots,
  };
  
  const isGenerallyProcessing = status !== AppStatus.READY && status !== AppStatus.ERROR;

    const canvasTextBoxes = useMemo(() => {
        return textBoxes.map(box => {
            if (box.type === 'text') {
                const textToRender = serializeSpansToTaggedText(box.plainText || '', box.styleSpans || []);
                // Create a temporary object for rendering with the old 'translatedText' property
                const renderableBox = { ...box, translatedText: textToRender };
                return renderableBox;
            }
            return box;
        });
    }, [textBoxes]);
    
    const handleSplitSelectedBox = (splitAt: number) => {
        if (selectedBoxIds.length !== 1) return;
        handleSplitTextBox(selectedBoxIds[0], splitAt);
    };

    // --- START: Project Save/Load Logic ---
    const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
        const res = await fetch(dataUrl);
        return await res.blob();
    };

    const handleSaveProject = useCallback(async () => {
        if (files.length === 0) {
            alert("Nothing to save.");
            return;
        }
        setStatus(AppStatus.SAVING_PROJECT);
        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder("images");
            if (!imagesFolder) throw new Error("Could not create images folder in zip.");

            const currentFileStates = new Map(fileStates);
            if (selectedFile) {
                currentFileStates.set(selectedFile.file.name, history);
            }

            const projectFileStates: Record<string, History<AppState>> = {};
            const fileManifest: ProjectFileManifestItem[] = [];

            for (const { file } of files) {
                fileManifest.push({ name: file.name, type: file.type });
                imagesFolder.file(file.name, file);
                
                const state = currentFileStates.get(file.name);
                if (state) {
                    // Deep copy the entire history object to avoid unintended mutations.
                    const stateToSave: History<AppState> = JSON.parse(JSON.stringify(state));

                    // Process the 'present' state's cleaned image.
// This now handles both data:URLs (newly cleaned images) and blob:URLs (images loaded from a previous project).
const cleanedUrl = stateToSave.present.cleanedImageDataUrl;
if (cleanedUrl && (cleanedUrl.startsWith('data:') || cleanedUrl.startsWith('blob:'))) {
    const cleanFileName = `${file.name.split('.').slice(0, -1).join('.')}_clean.png`;
    
    let imageBlob: Blob;
    // Se è un blob:URL, usa fetch per recuperare i dati.
    if (cleanedUrl.startsWith('blob:')) {
        const response = await fetch(cleanedUrl);
        imageBlob = await response.blob();
    } else { // Altrimenti, è un data:URL, usa la funzione esistente.
        imageBlob = await dataUrlToBlob(cleanedUrl);
    }
    
    // Salva il blob nel file zip e aggiorna il riferimento al nome del file.
    imagesFolder.file(cleanFileName, imageBlob);
    stateToSave.present.cleanedImageDataUrl = cleanFileName;
}

                    // To keep project files small, we don't save multiple versions of the cleaned image.
                    // We nullify the cleaned image data in past/future states.
                    stateToSave.past.forEach(s => { if (s.cleanedImageDataUrl) s.cleanedImageDataUrl = null; });
                    stateToSave.future.forEach(s => { if (s.cleanedImageDataUrl) s.cleanedImageDataUrl = null; });

                    // Limita la cronologia per risparmiare spazio
                if (stateToSave.past.length > 4) {
                    stateToSave.past = stateToSave.past.slice(-4);
                    }
                if (stateToSave.future.length > 4) {
                    stateToSave.future = stateToSave.future.slice(0, 4);
                    }
                    
                    projectFileStates[file.name] = stateToSave;
                }
            }
            
            const projectData: ProjectFile = {
                version: "2.0.0",
                fileManifest,
                fileStates: projectFileStates,
                profiles,
                activeProfileId,
                selectedFileName: selectedFile?.file.name || null,
                styleSlots: styleSlots,
            };
            
            zip.file("project.json", JSON.stringify(projectData));
            
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: "DEFLATE", compressionOptions: { level: 6 } });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project.cmt.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Failed to save project:", error);
            setStatus(AppStatus.ERROR);
            alert("An error occurred while saving the project.");
        } finally {
            setStatus(AppStatus.READY);
        }
    }, [files, fileStates, selectedFile, history, profiles, activeProfileId]);

    const handleLoadProject = useCallback(async (fileList: FileList) => {
        const file = fileList[0];
        if (!file) return;

        setStatus(AppStatus.LOADING_PROJECT);
        try {
            const zip = await JSZip.loadAsync(file);
            const projectJsonFile = zip.file("project.json");
            if (!projectJsonFile) throw new Error("Invalid project file: project.json not found.");
            
            const text = await projectJsonFile.async("string");
            const projectData: ProjectFile = JSON.parse(text);

            if (projectData.version !== "2.0.0") throw new Error(`Unsupported project version: ${projectData.version || 'unknown'}. Expected 2.0.0.`);
            if (!projectData.fileManifest || !projectData.fileStates) throw new Error("Invalid project file format: missing manifest or states.");

            // 1. Clean up old state and object URLs
            files.forEach(f => URL.revokeObjectURL(f.url));
            fileStates.forEach(historyItem => {
                if (historyItem.present.cleanedImageDataUrl) URL.revokeObjectURL(historyItem.present.cleanedImageDataUrl);
            });
            if (history.present.cleanedImageDataUrl) URL.revokeObjectURL(history.present.cleanedImageDataUrl);

            // 2. Reset application state completely before loading
            setFiles([]);
            setFileStates(new Map());
            setSelectedFile(null);
            setHistory(getInitialHistory());
            setSelectedBoxIds([]);
            setSelectionMask(null);
            setLastSelectionMask(null);
            
            // 3. Load new state from project file
            const newFileStates = new Map<string, History<AppState>>();
            const newFilesWithUrls: FileWithUrl[] = [];
            const imagesFolder = zip.folder("images");
            if (!imagesFolder) throw new Error("Invalid project file: images folder not found.");

            for (const fileInfo of projectData.fileManifest) {
                const imageFile = imagesFolder.file(fileInfo.name);
                if (!imageFile) {
                    console.warn(`Image ${fileInfo.name} not found in project file manifest.`);
                    continue;
                }

                const blob = await imageFile.async("blob");
                const newFile = new File([blob], fileInfo.name, { type: fileInfo.type });
                const url = URL.createObjectURL(newFile);
                newFilesWithUrls.push({ file: newFile, url });

                const rawState: History<AppState> | undefined = projectData.fileStates[fileInfo.name];
                if (rawState) {
                    const state = JSON.parse(JSON.stringify(rawState));
                    if (state.present.cleanedImageDataUrl && typeof state.present.cleanedImageDataUrl === 'string') {
                        const cleanImageFile = imagesFolder.file(state.present.cleanedImageDataUrl);
                        if (cleanImageFile) {
                            const cleanBlob = await cleanImageFile.async("blob");
                            state.present.cleanedImageDataUrl = URL.createObjectURL(cleanBlob);
                        } else {
                            state.present.cleanedImageDataUrl = null;
                        }
                    }
                    newFileStates.set(fileInfo.name, state);
                }
            }
            
            // 4. Set state variables that will be used in the next render
            setFiles(newFilesWithUrls);
            setFileStates(newFileStates);
            
            // 5. Restore profiles and settings
            const newProfiles = projectData.profiles || [settingsService.getDefaultProfile()];
            const newActiveProfileId = projectData.activeProfileId || newProfiles[0].id;
            setProfiles(newProfiles);
            setActiveProfileId(newActiveProfileId);
            const activeProfile = newProfiles.find(p => p.id === newActiveProfileId);
            if (activeProfile) {
                applySettings(activeProfile.settings);
                setStyleSlots(projectData.styleSlots || [null, null]);
            }
            
            // Use settings from the just-loaded profile for upgrading any legacy text boxes.
            const newDefaultTextSettings = activeProfile 
                ? activeProfile.settings.defaultTextFormat 
                : defaultTextSettings; // Fallback to current state

            // 6. Determine which file to select and load its state directly.
            // This replaces the problematic call to handleFileSelect to avoid using stale state.
            let fileToSelect: FileWithUrl | undefined;
            const selectedFileName = projectData.selectedFileName;
            if (selectedFileName) {
                fileToSelect = newFilesWithUrls.find(f => f.file.name === selectedFileName);
            }
            if (!fileToSelect && newFilesWithUrls.length > 0) {
                fileToSelect = newFilesWithUrls[0];
            }

            if (fileToSelect) {
                const savedHistory = newFileStates.get(fileToSelect.file.name) || getInitialHistory();
                const upgradedPresent = {
                    ...savedHistory.present,
                    textBoxes: savedHistory.present.textBoxes.map(box => upgradeTextBox(box, newDefaultTextSettings)),
                };
                const newHistory = { ...savedHistory, present: upgradedPresent };

                setHistory(newHistory);
                setSelectedFile(fileToSelect);
                
                setActiveTool(null);
                setEditingBoxId(null);
                setSelectedBoxIds([]);
                // FIX: Standardize on 'jpg' for state, converting from 'jpeg' file type.
                const fileType = fileToSelect.file.type.split('/')[1] as 'png' | 'jpeg' | 'webp';
                setSaveFormat(fileType === 'jpeg' ? 'jpg' : fileType);
            } else {
                setSelectedFile(null);
                setHistory(getInitialHistory());
                setSelectedBoxIds([]);
            }
        } catch (error) {
            console.error("Failed to load project:", error);
            setStatus(AppStatus.ERROR);
            alert(t('projectLoadError'));
        } finally {
            setStatus(AppStatus.READY);
        }
    }, [files, fileStates, history, applySettings, t, defaultTextSettings]);
    // --- END: Project Save/Load Logic ---

    const downloadJson = (data: any, filename: string) => {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportOcr = useCallback(() => {
        if (!selectedFile) return;

        // Accede direttamente allo stato attuale per assicurarsi di avere tutti i box
        const allBoxesOnPage = history.present.textBoxes;

        const ocrBoxes = allBoxesOnPage
            .filter(b => b.type === 'ocr')
            .map(({ id, ocrText, x, y, width, height, rotation, path }) => ({
                id,
                ocrText: ocrText || '',
                x,
                y,
                width,
                height,
                rotation,
                path: path || null,
            }));
        
        if (ocrBoxes.length === 0) {
            alert("Nessun box OCR trovato in questa pagina da esportare.");
            return;
        }

        const filename = `${selectedFile.file.name.split('.').slice(0, -1).join('.')}_ocr.json`;
        downloadJson(ocrBoxes, filename);
    }, [selectedFile, history]); // Aggiornata la dipendenza per usare lo stato più recente

    const handleExportText = useCallback(() => {
        if (!selectedFile) return;
        
        // Accede direttamente allo stato attuale per avere la lista completa dei box
        const allBoxesOnPage = history.present.textBoxes;

        const textBoxtesToExport = allBoxesOnPage
            .filter(b => b.type === 'text')
            .map(({ id, plainText, x, y, width, height, rotation }) => ({
                id,
                text: plainText || '',
                x,
                y,
                width,
                height,
                rotation,
            }));
        
        if (textBoxtesToExport.length === 0) {
            alert("Nessun box di testo da esportare in questa pagina.");
            return;
        }

        const filename = `${selectedFile.file.name.split('.').slice(0, -1).join('.')}_text.json`;
        downloadJson(textBoxtesToExport, filename);
    }, [selectedFile, history]); // Aggiornata la dipendenza

    const handleImportText = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const importedData: { id: number; text: string, x?: number, y?: number, width?: number, height?: number, rotation?: number }[] = JSON.parse(text);

                if (!Array.isArray(importedData)) {
                    throw new Error("Invalid format: JSON is not an array.");
                }
                
                let updatedTextCount = 0;
                let translatedOcrCount = 0;

                setStateWithHistory(prev => {
                    let currentBoxes = [...prev.textBoxes];
                    const newTextBoxes: TextBox[] = [];
                    const ocrIdsToRemove = new Set<number>();

                    const originalOcrBoxes = new Map(
                        prev.textBoxes
                            .filter(b => b.type === 'ocr')
                            .map(b => [b.id, b])
                    );

                    for (const item of importedData) {
                        const existingTextIndex = currentBoxes.findIndex(b => b.id === item.id && b.type === 'text');
                        
                        // Scenario 1: Aggiorna un box di testo esistente.
                        if (existingTextIndex !== -1) {
                            currentBoxes[existingTextIndex] = {
                                ...currentBoxes[existingTextIndex],
                                plainText: item.text,
                            };
                            updatedTextCount++;
                        } 
                        // Scenario 2: Trova un box OCR corrispondente da "tradurre".
                        else if (originalOcrBoxes.has(item.id)) {
                            const sourceOcrBox = originalOcrBoxes.get(item.id)!;
                            
                            let translated = item.text;
                            if (defaultTextSettings.textTransform === 'uppercase') {
                               translated = translated.toUpperCase();
                            }
                            
                            const newTextBox: TextBox = {
                                id: Date.now() + Math.random(),
                                type: 'text',
                                // Usa le coordinate dal JSON se presenti, altrimenti quelle del box OCR originale.
                                x: item.x ?? sourceOcrBox.x,
                                y: item.y ?? sourceOcrBox.y,
                                width: item.width ?? sourceOcrBox.width,
                                height: item.height ?? sourceOcrBox.height,
                                rotation: item.rotation ?? sourceOcrBox.rotation,
                                plainText: translated,
                                styleSpans: [],
                                ocrText: '',
                                // Eredita lo stile dalle impostazioni predefinite
                                fontFamily: defaultTextSettings.fontFamily,
                                fontSize: defaultTextSettings.fontSize,
                                textAlign: defaultTextSettings.textAlign,
                                fontWeight: defaultTextSettings.fontWeight,
                                fontStyle: defaultTextSettings.fontStyle,
                                lineHeight: defaultTextSettings.lineHeight,
                                wordSpacing: defaultTextSettings.wordSpacing,
                                color: defaultTextSettings.color,
                                strokeColor: defaultTextSettings.strokeColor,
                                strokeWidth: defaultTextSettings.strokeWidth,
                            };
                            
                            newTextBoxes.push(newTextBox);
                            ocrIdsToRemove.add(sourceOcrBox.id);
                            translatedOcrCount++;
                        }
                    }
                    
                    // Filtra i box OCR che sono stati tradotti e aggiungi i nuovi box di testo.
                    const finalBoxes = [
                        ...currentBoxes.filter(box => !ocrIdsToRemove.has(box.id)),
                        ...newTextBoxes
                    ];
                    
                    return { ...prev, textBoxes: finalBoxes };
                });

                let successMessage = "Importazione completata. ";
                if (updatedTextCount > 0) {
                    successMessage += `Aggiornati ${updatedTextCount} box di testo. `;
                }
                if (translatedOcrCount > 0) {
                    successMessage += `Tradotti ${translatedOcrCount} box OCR.`;
                }
                if (updatedTextCount === 0 && translatedOcrCount === 0) {
                    successMessage = "Importazione terminata, ma nessun box corrispondente è stato trovato per l'aggiornamento o la traduzione.";
                }

                alert(successMessage);

            } catch (error) {
                alert(`Impossibile importare il testo: ${error instanceof Error ? error.message : "Errore sconosciuto"}`);
            }
        };
        reader.readAsText(file);
    }, [setStateWithHistory, defaultTextSettings]);


  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
        <header className="w-full bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between z-10">
            <div className="flex items-center flex-shrink-0">
                <SettingsIcon onClick={() => setIsSettingsModalOpen(true)} />
                <h1 className="text-xl font-bold text-gray-200 ml-4">Comics Magic Translator</h1>
            </div>
            
            <div className="flex-grow flex justify-center items-center px-4">
                {(isGenerallyProcessing && !isBatchProcessing) && (
                    <div className="flex justify-center items-center text-amber-400 font-semibold">
                        <LoadingSpinner />
                        <span className="ml-2">{status}</span>
                    </div>
                )}
                {isBatchProcessing && batchStatusMessage && (
                    <div className="flex justify-center items-center text-amber-400 font-semibold">
                        <LoadingSpinner />
                        <span className="ml-2">{batchStatusMessage}</span>
                    </div>
                )}
                {!isGenerallyProcessing && !isBatchProcessing && lastProcessTime !== null && (
                    <div 
                        className="text-sm font-mono p-2 rounded-md bg-gray-900 text-gray-400"
                        title={t('lastProcessTimeTooltip')}
                    >
                        {t('lastProcessTime', { time: lastProcessTime.toFixed(1) })}
                    </div>
                )}
            </div>

             <div className="flex items-center space-x-3 flex-shrink-0">
                <div 
                    className={`text-sm font-mono p-2 rounded-md bg-gray-900 ${apiCallCount >= 240 ? 'text-red-500' : 'text-gray-400'}`}
                    title={t('apiCallsTooltip')}
                >
                    {t('apiCalls', { count: apiCallCount })}
                </div>
                <select
                    id="language-select-header"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isProcessing || !selectedFile}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                    title={t('translateTo')}
                >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{t(lang)}</option>)}
                </select>
                <button
                    onClick={handleProcessCurrentPage}
                    disabled={isProcessing || !selectedFile}
                    className="flex justify-center items-center bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-sm"
                    title={t('autoTooltip')}
                >
                    {t('auto')}
                </button>

                <button
                    onClick={handleOcr}
                    disabled={isProcessing || !selectedFile || (!selectionMask && !textBoxes.some(b => b.type === 'ocr' && !b.ocrText))}
                    className="flex justify-center items-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-sm"
                    title={t('ocrTooltip')}
                >
                    {(status === AppStatus.OCR || status === AppStatus.PATH_TO_BOX) && !isBatchProcessing ? <LoadingSpinner /> : null}
                    {t('ocr')}
                </button>

                <button
                    onClick={handleTranslateAll}
                    disabled={!textBoxes.some(box => box.type === 'ocr' && box.ocrText && box.ocrText.length > 0) || isProcessing}
                    className="flex justify-center items-center bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-sm"
                    title={t('translateTooltip')}
                >
                    {status === AppStatus.TRANSLATING && !isBatchProcessing ? <LoadingSpinner /> : null}
                    {t('translate')}
                </button>

                {selectedFile && (
                    <WindowIcon onClick={() => setIsOriginalViewerOpen(prev => !prev)} />
                )}
            </div>
        </header>
        <div className="flex-grow flex overflow-hidden">
          <div ref={leftPanelRef} style={{ width: `${panelWidths.left}%` }} className="h-full flex-shrink-0 flex flex-col">
            <div style={{ height: `${leftPanelTopHeight}%` }} className="flex-shrink-0 overflow-hidden">
                <FilePanel 
                  files={files} 
                  selectedFile={selectedFile?.file || null} 
                  onFilesChange={handleFilesChange} 
                  onFileSelect={handleFileSelect}
                  onFileDelete={handleFileDelete}
                  onSaveProject={handleSaveProject}
                  onLoadProject={handleLoadProject}
                  onAddImage={handleAddImage}
                />
            </div>
            <div
              onMouseDown={handleVerticalResizeStart}
              className="relative h-2 bg-gray-700 hover:bg-indigo-500 cursor-ns-resize flex-shrink-0 group z-10"
              title={t('resize')}
            >
                <div
                    className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-4 w-16 bg-gray-600 rounded-full border-2 border-gray-800 transition-colors group-hover:bg-indigo-500 flex items-center justify-center"
                >
                   <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    </div>
                </div>
            </div>
            <div style={{ height: `calc(${100 - leftPanelTopHeight}% - 8px)` }} className="flex-grow overflow-hidden">
                <LayersPanel
                    textBoxes={textBoxes}
                    selectedBoxIds={selectedBoxIds}
                    onBoxClick={handleBoxSelection}
                    onTextBoxesUpdate={handleTextBoxesUpdate}
                />
            </div>
          </div>
          
          <div
            onMouseDown={(e) => handleMouseDown(e, 'left')}
            className="relative w-2 h-full bg-gray-700 hover:bg-indigo-500 cursor-col-resize flex-shrink-0 group z-10"
            title={t('resize')}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4 h-16 bg-gray-600 rounded-full border-2 border-gray-800 transition-colors group-hover:bg-indigo-500 flex items-center justify-center"
            >
               <div className="flex flex-col space-y-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                </div>
            </div>
          </div>

          <div style={{ width: `${panelWidths.center}%` }} className="h-full flex-shrink-0">
            <CanvasPanel
              imageUrl={displayedImageUrl}
              textBoxes={canvasTextBoxes}
              strokes={strokes}
              selectedBoxIds={selectedBoxIds}
              editingBoxId={editingBoxId}
              onBoxClick={handleBoxSelection}
              onBoxDoubleClick={handleBoxDoubleClick}
              onFinishEditing={handleFinishEditing}
              onPlainTextChange={handlePlainTextChange}
              onBackgroundClick={handleDeselectAllBoxes}
              onTextBoxesUpdate={handleTextBoxesUpdate}
              onStrokesUpdate={handleStrokesUpdate}
              onManualSelection={handleManualSelection}
              isEyedropperActive={!!eyedropperTarget}
              onColorPick={handleColorPick}
              activeTool={activeTool}
              brushColor={brushColor}
              paintBrushSize={paintBrushSize}
              selectionEraserSize={selectionEraserSize}
              onSelectionErase={handleSelectionErase}
              brushShape="round"
              brushHardness={brushHardness}
              brushOpacity={brushOpacity}
              onMagicWandSelect={handleMagicWandSelect}
              selectionMaskUrl={selectionMaskUrl}
              onToggleNotesModal={() => setIsNotesModalOpen(prev => !prev)}
            />
          </div>

          <div
            onMouseDown={(e) => handleMouseDown(e, 'right')}
            className="relative w-2 h-full bg-gray-700 hover:bg-indigo-500 cursor-col-resize flex-shrink-0 group z-10"
            title={t('resize')}
          >
             <div
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4 h-16 bg-gray-600 rounded-full border-2 border-gray-800 transition-colors group-hover:bg-indigo-500 flex items-center justify-center"
            >
               <div className="flex flex-col space-y-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                </div>
            </div>
          </div>
          
          <div style={{ width: `${panelWidths.right}%` }} className="h-full flex-shrink-0">
            <ToolsPanel
              status={status}
              ocrText={primarySelectedBox?.type === 'ocr' ? primarySelectedBox.ocrText || '' : ''}
              plainText={primarySelectedBox?.type === 'text' ? primarySelectedBox.plainText || '' : ''}
              selectedFile={!!selectedFile}
              hasAnyBoxes={textBoxes.length > 0}
              selectedBox={primarySelectedBox}
              onAddFreeTextBox={handleAddFreeTextBox}
              onSelectAllBoxes={handleSelectAllBoxes}
              onDeselectBox={handleDeselectAllBoxes}
              onPlainTextChange={handlePlainTextChange}
              onFormatChange={handleFormatChange}
              onSplitBox={handleSplitSelectedBox}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onActivateEyedropper={(target) => setEyedropperTarget(target)}
              activeTool={activeTool}
              onToolChange={setActiveTool}
              brushColor={brushColor}
              onBrushColorChange={setBrushColor}
              paintBrushSize={paintBrushSize}
              onPaintBrushSizeChange={setPaintBrushSize}
              selectionEraserSize={selectionEraserSize}
              onSelectionEraserSizeChange={setSelectionEraserSize}
              brushHardness={brushHardness}
              onBrushHardnessChange={setBrushHardness}
              brushOpacity={brushOpacity}
              onBrushOpacityChange={setBrushOpacity}
              onSaveCurrentImage={() => setIsSaveModalOpen(true)}
              onExportAll={() => setIsExportAllModalOpen(true)}
              onSaveAsPdf={() => setIsPdfModalOpen(true)}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              canBringForward={canBringForward}
              canSendBackward={canSendBackward}
              fonts={visibleFonts}
              selectionToRestore={selectionToRestore}
              onSelectionRestoreComplete={() => setSelectionToRestore(null)}
              textAreaHeights={textAreaHeights}
              onTextAreaHeightsChange={setTextAreaHeights}
              textBoxes={textBoxes}
              magicWandTolerance={magicWandTolerance}
              onMagicWandToleranceChange={setMagicWandTolerance}
              isSelectionActive={!!selectionMask}
              onClearSelection={handleClearSelection}
              onRecallSelection={handleRecallSelection}
              canRecallSelection={!!lastSelectionMask}
              onInpaint={handleInpaint}
              inpaintAutoColor={inpaintAutoColor}
              onInpaintAutoColorChange={setInpaintAutoColor}
              inpaintManualColor={inpaintManualColor}
              onInpaintManualColorChange={setInpaintManualColor}
              onLaunchImageEditor={handleLaunchImageEditor}
              styleSlots={styleSlots}
              onSaveStyle={handleSaveStyle}
              onExportOcr={handleExportOcr}
              onExportText={handleExportText}
              onImportText={handleImportText}
            />
          </div>
        </div>
        {isNotesModalOpen && (
            <NotesModal 
              initialNotes={notes}
              onSave={handleNotesChange}
              onClose={() => setIsNotesModalOpen(false)}
            />
        )}
        {imageEditorState.isOpen && imageEditorState.imageDataUrl && (
            <ImageEditorModal
                imageDataUrl={imageEditorState.imageDataUrl}
                backgroundImageUrl={imageEditorState.backgroundImageUrl}
                backgroundBounds={imageEditorState.backgroundBounds}
                onApply={handleApplyImageEdit}
                onClose={() => setImageEditorState({ isOpen: false })}
            />
        )}
        {isSaveModalOpen && selectedFile && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600 w-96 space-y-4">
                    <h2 className="text-xl font-bold text-white">{t('saveModalTitle')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">{t('format')}</label>
                            {/* FIX: Use 'jpg' for state management and UI, consistent with state type. */}
                            <select value={saveFormat} onChange={e => setSaveFormat(e.target.value as 'png' | 'jpg' | 'webp')} className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                                <option value="webp">WebP</option>
                            </select>
                        </div>
                        {/* FIX: Compare against 'jpg' to match the state type. */}
                        {(saveFormat === 'jpg' || saveFormat === 'webp') && (
                            <div>
                                <label className="text-sm font-medium text-gray-300">{t('quality', { quality: saveQuality })} {estimatedSize && <span className="text-gray-400">{t('estimatedSize', { size: estimatedSize })}</span>}</label>
                                <input type="range" min="1" max="100" value={saveQuality} onChange={e => setSaveQuality(parseInt(e.target.value))} className="w-full h-2 mt-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsSaveModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">{t('cancel')}</button>
                        <button onClick={handleSaveCurrentImage} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">{t('download')}</button>
                    </div>
                </div>
            </div>
        )}
        {isExportAllModalOpen && (
             <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600 w-96 space-y-4">
                    <h2 className="text-xl font-bold text-white">{t('exportAllModalTitle')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">{t('format')}</label>
                            {/* FIX: Use 'jpg' for state management and UI, consistent with state type. */}
                            <select value={exportAllFormat} onChange={e => setExportAllFormat(e.target.value as 'png' | 'jpg' | 'webp')} className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                                <option value="webp">WebP</option>
                            </select>
                        </div>
                        {/* FIX: Compare against 'jpg' to match the state type. */}
                        {(exportAllFormat === 'jpg' || exportAllFormat === 'webp') && (
                            <div>
                                <label className="text-sm font-medium text-gray-300">{t('quality', { quality: exportAllQuality })} {estimatedZipSize && <span className="text-gray-400">{t('estimatedSize', { size: estimatedZipSize })}</span>}</label>
                                <input type="range" min="1" max="100" value={exportAllQuality} onChange={e => setExportAllQuality(parseInt(e.target.value))} className="w-full h-2 mt-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsExportAllModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">{t('cancel')}</button>
                        <button onClick={handleExportAll} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">{t('exportAction')}</button>
                    </div>
                </div>
            </div>
        )}
        {isPdfModalOpen && (
             <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600 w-96 space-y-4">
                    <h2 className="text-xl font-bold text-white">{t('exportAsPdfModalTitle')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">{t('format')}</label>
                            <select value={pdfExportFormat} onChange={e => setPdfExportFormat(e.target.value as 'png' | 'jpg' | 'webp')} className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                                <option value="webp">WebP</option>
                            </select>
                        </div>
                        {(pdfExportFormat === 'jpg' || pdfExportFormat === 'webp') && (
                            <div>
                                <label className="text-sm font-medium text-gray-300">{t('quality', { quality: pdfExportQuality })} {estimatedPdfSize && <span className="text-gray-400">{t('estimatedSize', { size: estimatedPdfSize })}</span>}</label>
                                <input type="range" min="1" max="100" value={pdfExportQuality} onChange={e => setPdfExportQuality(parseInt(e.target.value))} className="w-full h-2 mt-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsPdfModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">{t('cancel')}</button>
                        <button onClick={handleSaveAsPdf} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">{t('exportAction')}</button>
                    </div>
                </div>
            </div>
        )}
        {isSettingsModalOpen && (
            <SettingsModal
                profiles={profiles}
                activeProfileId={activeProfileId}
                currentUnsavedSettings={currentUnsavedSettings}
                onSave={handleSaveSettings}
                onClose={() => setIsSettingsModalOpen(false)}
                fonts={availableFonts}
                visibleFonts={visibleFonts}
                appVersion={appVersion}
                onLoadSystemFonts={loadSystemFonts}
                onLoadFontsFromFiles={loadFontsFromFiles}
                onClearCustomFonts={handleClearCustomFonts}
            />
        )}
        {isOriginalViewerOpen && selectedFile && (
            <OriginalImageViewer imageUrl={selectedFile.url} onClose={() => setIsOriginalViewerOpen(false)} />
        )}
        {apiKeyError && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                 <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-red-500 w-96 space-y-4">
                     <h2 className="text-xl font-bold text-red-400">{t('apiKeyError')}</h2>
                     <p className="text-gray-300">{t('apiKeyErrorBody1')}</p>
                     <div className="flex justify-end">
                         <button onClick={() => setApiKeyError(null)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">{t('close')}</button>
                     </div>
                 </div>
            </div>
        )}
    </div>
  );
};

// FIX: Wrapped AppContent in a new 'App' component to provide the LanguageContext and to provide the named 'App' export required by index.tsx.
export const App: React.FC = () => {
    const [language, setLanguage] = useState<Language>('en');

    const t = useCallback((key: string, replacements?: Record<string, string | number>) => {
        let translation = (translations[language]?.[key]) ?? (translations['en']?.[key]) ?? key;
        if (replacements) {
            Object.entries(replacements).forEach(([r_key, r_value]) => {
                translation = translation.replace(`{${r_key}}`, String(r_value));
            });
        }
        return translation;
    }, [language]);
    
    const languageContextValue = useMemo(() => ({
        language,
        setLanguage,
        t,
    }), [language, t]);

    return (
        <LanguageContext.Provider value={languageContextValue}>
            <AppContent />
        </LanguageContext.Provider>
    );
};