

export interface TextBox {
  id: number;
  type: 'ocr' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  
  // Image-specific properties
  imageDataUrl?: string;
  aspectRatio?: number;

  // OCR/Text-specific properties
  ocrText?: string;
  translatedText?: string; // Kept for backward compatibility during upgrade
  plainText?: string;
  styleSpans?: StyleSpan[];
  path?: PathPoint[]; // For custom-shaped OCR boxes
  isCleaned?: boolean;
  detectedFontSize?: number; // Stores the font size detected from the original image
  // Base formatting options applied to the whole box
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number; // multiplier, e.g., 1.2
  wordSpacing?: number; // in px
  color?: string; // e.g., '#000000'
  strokeColor?: string; // e.g., '#FFFFFF'
  strokeWidth?: number; // in px
}

export type BrushShape = 'round';

export interface Stroke {
  id: number;
  type: 'brush' | 'eraser' | 'magic-brush';
  color: string; // Only used for 'brush' type strokes
  size: number;
  points: { x: number; y: number }[]; // Normalized coordinates (0-1 relative to image dimensions)
  shape: BrushShape;
  hardness: number; // 0 (fully soft) to 1 (fully hard)
  opacity: number; // 0 (fully transparent) to 1 (fully opaque)
  isFill?: boolean;
}

// FIX: Added the SavedSelection interface which was missing and causing an error in SelectionsPanel.tsx.
export interface SavedSelection {
  id: string;
  name: string;
  thumbnail: string;
}

export interface PathPoint {
  anchor: { x: number; y: number };
  handle1: { x: number; y: number }; // Control point for the curve entering the anchor
  handle2: { x: number; y: number }; // Control point for the curve leaving the anchor
}


export enum AppStatus {
  READY = 'Ready',
  OCR = 'Extracting text from all boxes...',
  TRANSLATING = 'Translating all text...',
  SAVING = 'Saving all modified images...',
  PATH_TO_BOX = 'Finalizing path selection...',
  ERROR = 'An error occurred',
  MAGIC_WAND = 'Calculating selection...',
  INPAINTING = 'Inpainting selection...',
  SAVING_PROJECT = 'Saving project...',
  LOADING_PROJECT = 'Loading project...',
}

export interface PanelWidths {
  left: number;
  center: number;
  right: number;
}

export interface TextAreaHeights {
  source: number;
  display: number;
}

export interface ImageData {
  data: string;
  mimeType: string;
}

// Settings and Profiles
export interface TextFormatSettings {
  fontFamily: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  lineHeight: number;
  wordSpacing: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  // FIX: Added 'lowercase' to allow for case cycling in the ToolsPanel.
  textTransform?: 'uppercase' | 'lowercase' | 'none';
}

// Richer style for spans, can override base settings
export interface Style extends Partial<TextFormatSettings> {
    isSuperscript?: boolean;
}

export interface StyleSpan {
    start: number; // index in plainText
    end: number;   // index in plainText
    style: Style;
}

export interface AppSettings {
  targetLanguage: string;
  interfaceLanguage: string;
  defaultTextFormat: TextFormatSettings;
  brushColor: string;
  paintBrushSize: number;
  selectionEraserSize: number;
  brushShape: BrushShape;
  brushHardness: number; // 0 to 1
  brushOpacity: number; // 0 to 1
  panelWidths: PanelWidths;
  textAreaHeights: TextAreaHeights;
  inpaintAutoColor: boolean;
  inpaintManualColor: string;
  styleSlots?: (Style | null)[];
}

export interface SettingsProfile {
  id: string;
  name: string;
  settings: AppSettings;
}

export type Tool = 'brush' | 'eraser' | 'manual-selection' | 'magic-wand' | 'selection-eraser' | null;

// The state of the application for a single file, managed by the history system.
export interface AppState {
  textBoxes: TextBox[];
  strokes: Stroke[];
  cleanedImageDataUrl?: string | null; // Data URL of the image after cleaning
}

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface ProjectFileManifestItem {
    name: string;
    type: string;
}

export interface ProjectFile {
    version: string; // "2.0.0" for new ZIP format
    fileManifest: ProjectFileManifestItem[];
    fileStates: Record<string, History<AppState>>; // object literal for serialization
    profiles: SettingsProfile[];
    activeProfileId: string;
    selectedFileName: string | null;
    styleSlots?: (Style | null)[];
}

export interface Note {
  id: string;
  content: string;
  importance: 'normal' | 'important' | 'critical';
  createdAt: number;
}