import React, { useState, useRef, useLayoutEffect, useEffect, useMemo, useCallback } from 'react';
import { AppStatus, TextBox, Tool, Style, BrushShape } from '../types';
import FontSelector from './FontSelector';
import { useTranslation } from '../services/i18n';
import ColorPicker from './ColorPicker';

// Define a type for partial style changes to be passed up
// FIX: Changed type to Partial<Style> to resolve type conflict when applying saved styles
// which may contain `textTransform: 'none'`.
type StyleChange = Partial<Style>;

interface Selection {
  start: number;
  end: number;
}

interface ToolsPanelProps {
  status: AppStatus;
  ocrText: string;
  plainText: string;
  selectedFile: boolean;
  hasAnyBoxes: boolean;
  selectedBox: TextBox | null;
  onAddFreeTextBox: () => void;
  onSelectAllBoxes: () => void;
  onDeselectBox: () => void;
  onPlainTextChange: (text: string, boxId: number) => void;
  onFormatChange: (changes: StyleChange, selection: Selection | null) => void;
  onSplitBox: (splitAt: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onActivateEyedropper: (target: 'color' | 'strokeColor' | 'brush' | 'eraser' | 'inpaint') => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  paintBrushSize: number;
  onPaintBrushSizeChange: (size: number) => void;
  selectionEraserSize: number;
  onSelectionEraserSizeChange: (size: number) => void;
  brushHardness: number;
  onBrushHardnessChange: (hardness: number) => void;
  brushOpacity: number;
  onBrushOpacityChange: (opacity: number) => void;
  onSaveCurrentImage: () => void;
  onExportAll: () => void;
  onSaveAsPdf: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  canBringForward: boolean;
  canSendBackward: boolean;
  fonts: string[];
  selectionToRestore: (Selection & { trigger: number }) | null;
  onSelectionRestoreComplete: () => void;
  textAreaHeights: { source: number, display: number };
  onTextAreaHeightsChange: (heights: { source: number, display: number }) => void;
  textBoxes: TextBox[];
  magicWandTolerance: number;
  onMagicWandToleranceChange: (value: number) => void;
  isSelectionActive: boolean;
  onClearSelection: () => void;
  onRecallSelection: () => void;
  canRecallSelection: boolean;
  onInpaint: () => void;
  inpaintAutoColor: boolean;
  onInpaintAutoColorChange: (value: boolean) => void;
  inpaintManualColor: string;
  onInpaintManualColorChange: (value: string) => void;
  onLaunchImageEditor: () => void;
  styleSlots: (Style | null)[];
  onSaveStyle: (slotIndex: number, style: Style) => void;
  onExportOcr: () => void;
  onExportText: () => void;
  onImportText: (file: File) => void;
}

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const MagicWandIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path d="M6 21l15 -15l-3 -3l-15 15l3 3" />
       <path d="M15 6l3 3" />
       <path d="M9 17l-1.5 -1.5" />
       <path d="M12 14l-1.5 -1.5" />
       <path d="M15 11l-1.5 -1.5" />
       <path d="M18 8l-1.5 -1.5" />
    </svg>
);

const SelectionEraserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
        <path d="M13.5 6.5l4 4" />
        <path d="M19 19l1.5 -1.5" />
        <path d="M16 16l1.5 -1.5" />
        <path d="M13 13l1.5 -1.5" />
        <path d="M10 10l1.5 -1.5" />
    </svg>
);

const InpaintIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);


const BringForwardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 4.293a1 1 0 00-1.414 0l-4 4a1 1 0 001.414 1.414L10 6.414l3.293 3.293a1 1 0 001.414-1.414l-4-4z" />
      <path d="M3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
    </svg>
);

const SendBackwardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.293 15.707a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L10 13.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4z" />
      <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
    </svg>
);

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

const BrushIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 2.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-11 11a1 1 0 01-.707.293H3a1 1 0 01-1-1v-2.414a1 1 0 01.293-.707l11-11zM14 4l2 2-9 9H5v-2l9-9z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M15 8a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
    </svg>
);

const EraserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M15.206 2.343a1.5 1.5 0 012.122 0l1.414 1.414a1.5 1.5 0 010 2.121L8.343 18.278a1.5 1.5 0 01-2.122 0l-4.242-4.242a1.5 1.5 0 010-2.121L15.206 2.343zM7.28 9.28L3.037 13.523l4.243 4.243 4.242-4.243-4.242-4.243z" clipRule="evenodd" />
    </svg>
);

const SaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L10 12.001l2.293-2.294a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v8a1 1 0 11-2 0V3a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const ZipIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z"/>
      <path d="M9 8h2v2H9V8zm-2 2h2v2H7v-2zm4 0h2v2h-2v-2z"/>
      <path fillRule="evenodd" d="M8 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V2z" clipRule="evenodd"/>
    </svg>
);

const ScissorsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
        <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
        <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>
);

const FloppyDiskIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 2a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V6.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0011.586 2H5zm5 2.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 12a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" />
    </svg>
);

const PdfIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  status,
  ocrText,
  plainText,
  selectedFile,
  hasAnyBoxes,
  selectedBox,
  onAddFreeTextBox,
  onSelectAllBoxes,
  onDeselectBox,
  onPlainTextChange,
  onFormatChange,
  onSplitBox,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onActivateEyedropper,
  activeTool,
  onToolChange,
  brushColor,
  onBrushColorChange,
  paintBrushSize,
  onPaintBrushSizeChange,
  selectionEraserSize,
  onSelectionEraserSizeChange,
  brushHardness,
  onBrushHardnessChange,
  brushOpacity,
  onBrushOpacityChange,
  onSaveCurrentImage,
  onExportAll,
  onSaveAsPdf,
  onBringForward,
  onSendBackward,
  canBringForward,
  canSendBackward,
  fonts,
  selectionToRestore,
  onSelectionRestoreComplete,
  textAreaHeights,
  onTextAreaHeightsChange,
  textBoxes,
  magicWandTolerance,
  onMagicWandToleranceChange,
  isSelectionActive,
  onClearSelection,
  onRecallSelection,
  canRecallSelection,
  onInpaint,
  inpaintAutoColor,
  onInpaintAutoColorChange,
  inpaintManualColor,
  onInpaintManualColorChange,
  onLaunchImageEditor,
  styleSlots,
  onSaveStyle,
  onExportOcr,
  onExportText,
  onImportText,
}) => {
  const { t } = useTranslation();
  const isProcessing = status !== AppStatus.READY && status !== AppStatus.ERROR;
  const isTextBoxSelected = selectedBox?.type === 'text';
  const formattingDisabled = !isTextBoxSelected || isProcessing;
  const [activeColorPicker, setActiveColorPicker] = React.useState<'text' | 'stroke' | 'brush' | 'inpaint' | null>(null);
  
  const [selection, setSelection] = React.useState<Selection | null>(null);

  const resizingInfo = React.useRef<{
      type: 'source' | 'display' | null;
      startY: number;
      startHeight: number;
  }>({ type: null, startY: 0, startHeight: 0 });

  const translatedTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const importTextRef = useRef<HTMLInputElement>(null);
  
  const textColorButtonRef = useRef<HTMLButtonElement>(null);
  const strokeColorButtonRef = useRef<HTMLButtonElement>(null);
  const brushColorButtonRef = useRef<HTMLButtonElement>(null);
  const inpaintColorButtonRef = useRef<HTMLButtonElement>(null);

  // FIX: When the selected box changes, reset the text selection state
  // to prevent using a stale selection from a previous box, which could cause a crash.
  useEffect(() => {
    setSelection(null);
  }, [selectedBox?.id]);

  useLayoutEffect(() => {
    const textarea = translatedTextareaRef.current;
    if (textarea && selectionToRestore) {
        textarea.focus();
        textarea.setSelectionRange(selectionToRestore.start, selectionToRestore.end);
        onSelectionRestoreComplete();
    }
  }, [selectionToRestore, onSelectionRestoreComplete]);
  
  // This memoized value represents the combined style of the current text selection.
  // It allows the UI to reflect the true state of the text, enabling proper toggling of formats.
  const selectionStyle = useMemo(() => {
    if (!selectedBox || !selectedBox.plainText) {
        // If no box is selected, return a style object based on the box itself
        // to populate the UI with the base styles.
        return {
            fontFamily: selectedBox?.fontFamily,
            fontSize: selectedBox?.fontSize,
            textAlign: selectedBox?.textAlign,
            fontWeight: selectedBox?.fontWeight,
            fontStyle: selectedBox?.fontStyle,
            lineHeight: selectedBox?.lineHeight,
            wordSpacing: selectedBox?.wordSpacing,
            color: selectedBox?.color,
            strokeColor: selectedBox?.strokeColor,
            strokeWidth: selectedBox?.strokeWidth,
        };
    }

    const getStyleAt = (index: number): Style => {
        const base = {
            fontFamily: selectedBox.fontFamily, fontSize: selectedBox.fontSize, textAlign: selectedBox.textAlign,
            fontWeight: selectedBox.fontWeight, fontStyle: selectedBox.fontStyle, lineHeight: selectedBox.lineHeight,
            wordSpacing: selectedBox.wordSpacing, color: selectedBox.color, strokeColor: selectedBox.strokeColor,
            strokeWidth: selectedBox.strokeWidth
        };
        const span = selectedBox.styleSpans.find(s => index >= s.start && index < s.end);
        return { ...base, ...(span?.style || {}) };
    };

    if (!selection || selection.start === selection.end) {
        const cursorIndex = selection ? selection.start : selectedBox.plainText.length;
        return getStyleAt(Math.max(0, cursorIndex - 1));
    }

    // For a range, find the common style. If styles differ, the property is omitted (indeterminate).
    const firstCharStyle = getStyleAt(selection.start);
    const commonStyle: Style = { ...firstCharStyle };

    for (let i = selection.start + 1; i < selection.end; i++) {
        const currentCharStyle = getStyleAt(i);
        (Object.keys(commonStyle) as Array<keyof Style>).forEach(key => {
            if (commonStyle[key] !== currentCharStyle[key]) {
                delete commonStyle[key];
            }
        });
        if (Object.keys(commonStyle).length === 0) break; // No common styles left
    }
    return commonStyle;
}, [selectedBox, selection]);

  const handleResizeMove = React.useCallback((e: MouseEvent) => {
      if (!resizingInfo.current.type) return;
  
      const dy = e.clientY - resizingInfo.current.startY;
      const newHeight = resizingInfo.current.startHeight + dy;
      const clampedHeight = Math.max(60, newHeight); // Minimum height of 60px
  
      if (resizingInfo.current.type === 'source') {
          onTextAreaHeightsChange({ ...textAreaHeights, source: clampedHeight });
      } else {
          onTextAreaHeightsChange({ ...textAreaHeights, display: clampedHeight });
      }
  }, [resizingInfo, onTextAreaHeightsChange, textAreaHeights]);
  
  const handleResizeEnd = React.useCallback(() => {
      document.body.style.cursor = 'default';
      resizingInfo.current.type = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);
  
  const handleResizeStart = (e: React.MouseEvent, type: 'source' | 'display') => {
      e.preventDefault();
      resizingInfo.current = {
          type: type,
          startY: e.clientY,
          startHeight: type === 'source' ? textAreaHeights.source : textAreaHeights.display,
      };
      document.body.style.cursor = 'ns-resize';
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
  };


  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd } = e.currentTarget;
    setSelection({ start: selectionStart, end: selectionEnd });
  };
  
  const applyFormat = (changes: StyleChange) => {
    onFormatChange(changes, selection);
  };

  const handleCycleCase = () => {
    if (!selectedBox) return;
    const fullText = selectedBox.plainText || '';
    let isUpperCase = true;
    
    if (selection && selection.start !== selection.end) {
      const selectedText = fullText.substring(selection.start, selection.end);
      isUpperCase = selectedText.length > 0 && selectedText === selectedText.toUpperCase();
    } else {
      isUpperCase = fullText.length > 0 && fullText === fullText.toUpperCase();
    }
    
    applyFormat({ textTransform: isUpperCase ? 'lowercase' : 'uppercase' });
  };

  const handleSplitBoxClick = () => {
    if (selectedBox && translatedTextareaRef.current) {
        const splitAt = translatedTextareaRef.current.selectionStart;
        onSplitBox(splitAt);
    }
  };
  
    const getStyleAtSelectionStart = useCallback((): Style | null => {
        if (!selectedBox) return null;

        const getStyleAt = (index: number): Style => {
            const base: Style = {
                fontFamily: selectedBox.fontFamily, fontSize: selectedBox.fontSize, textAlign: selectedBox.textAlign,
                fontWeight: selectedBox.fontWeight, fontStyle: selectedBox.fontStyle, lineHeight: selectedBox.lineHeight,
                wordSpacing: selectedBox.wordSpacing, color: selectedBox.color, strokeColor: selectedBox.strokeColor,
                strokeWidth: selectedBox.strokeWidth
            };
            if (!selectedBox.plainText) return base;
            
            const effectiveIndex = Math.min(index, selectedBox.plainText.length - 1);
            if (effectiveIndex < 0) return base;

            const span = (selectedBox.styleSpans || []).find(s => effectiveIndex >= s.start && effectiveIndex < s.end);
            return { ...base, ...(span?.style || {}) };
        };

        const indexToSample = selection ? selection.start : 0;
        return getStyleAt(indexToSample);
    }, [selectedBox, selection]);

    const handleSaveClick = useCallback((slotIndex: number) => {
        if (formattingDisabled) return;
        const styleToSave = getStyleAtSelectionStart();
        if (styleToSave) {
            delete styleToSave.textAlign;
            onSaveStyle(slotIndex, styleToSave);
        }
    }, [formattingDisabled, getStyleAtSelectionStart, onSaveStyle]);

    const handleApplyClick = useCallback((slotIndex: number) => {
        if (formattingDisabled) return;
        const styleToApply = styleSlots[slotIndex];
        if (styleToApply) {
            onFormatChange(styleToApply, selection);
        }
    }, [formattingDisabled, styleSlots, onFormatChange, selection]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
              (e.target as HTMLElement).tagName === 'INPUT' ||
              ((e.target as HTMLElement).tagName === 'TEXTAREA' && (e.target as HTMLElement).id !== 'translated-text')
            ) {
              return;
            }

            if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
  if (formattingDisabled) return;
  e.preventDefault();
  const slotIndex = e.key === 'F1' ? 0 : (e.key === 'F2' ? 1 : 2);
  if (e.shiftKey) {
    handleSaveClick(slotIndex);
  } else {
    handleApplyClick(slotIndex);
  }
}
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSaveClick, handleApplyClick, formattingDisabled]);
    
    const handleImportTextClick = () => {
        importTextRef.current?.click();
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onImportText(e.target.files[0]);
            if (e.target) e.target.value = ''; // Reset input
        }
    };


  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col space-y-4 overflow-y-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="ocr-text" className="font-semibold text-gray-300 flex-grow">{t('sourceTextLabel')}</label>
            </div>
            <div className="relative">
              <textarea
                id="ocr-text"
                readOnly
                value={ocrText}
                placeholder={selectedBox?.type === 'ocr' ? t('sourceTextPlaceholder') : t('sourceTextPlaceholderNoSelection')}
                style={{ height: `${textAreaHeights.source}px` }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 pr-5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div
                  onMouseDown={(e) => handleResizeStart(e, 'source')}
                  className="absolute bottom-0 right-0 w-5 h-5 cursor-ns-resize flex items-end justify-end p-1 text-gray-500 hover:text-gray-300"
                  title={t('resize')}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 20L20 8M14 20l6-6" />
                  </svg>
              </div>
            </div>
        </div>

        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                <label htmlFor="translated-text" className="font-semibold text-gray-300 flex-grow">{t('displayTextLabel')}</label>
                <input
                    ref={importTextRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="hidden"
                />
                <button
                    onClick={onExportText}
                    disabled={!textBoxes.some(b => b.type === 'text')}
                    title="Export display texts as JSON"
                    className="p-1.5 rounded-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white transition-colors duration-200"
                >
                    <DownloadIcon />
                </button>
                <button
                    onClick={handleImportTextClick}
                    disabled={!textBoxes.some(b => b.type === 'text')}
                    title="Import display texts from JSON"
                    className="p-1.5 rounded-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white transition-colors duration-200"
                >
                    <UploadIcon />
                </button>
            </div>
            <div className="relative">
              <textarea
                ref={translatedTextareaRef}
                id="translated-text"
                value={plainText}
                onChange={(e) => selectedBox && onPlainTextChange(e.target.value, selectedBox.id)}
                onSelect={handleSelectionChange}
                onFocus={handleSelectionChange}
                onKeyUp={e => handleSelectionChange(e)}
                onClick={e => handleSelectionChange(e)}
                disabled={!isTextBoxSelected || isProcessing}
                placeholder={isTextBoxSelected ? t('displayTextPlaceholder') : t('displayTextPlaceholderNoSelection')}
                style={{ height: `${textAreaHeights.display}px` }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 pr-5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              <div
                  onMouseDown={(e) => handleResizeStart(e, 'display')}
                  className="absolute bottom-0 right-0 w-5 h-5 cursor-ns-resize flex items-end justify-end p-1 text-gray-500 hover:text-gray-300"
                  title={t('resize')}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 20L20 8M14 20l6-6" />
                  </svg>
              </div>
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 text-indigo-400">{t('editingTools')}</h3>
        <div className="bg-gray-700 p-3 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
                <button
                    onClick={onAddFreeTextBox}
                    disabled={!selectedFile || isProcessing}
                    className="flex-grow flex justify-center items-center bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                    {t('addBox')}
                </button>
                <button
                    onClick={() => onToolChange(activeTool === 'manual-selection' ? null : 'manual-selection')}
                    disabled={!selectedFile || isProcessing}
                    title={t('addOcrBoxTooltip')}
                    className={`flex-grow flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm ${
                        activeTool === 'manual-selection'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600'
                    } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                >
                    <span>{t('addOcrBox')}</span>
                </button>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo || isProcessing}
                        title={t('undo')}
                        className="flex justify-center items-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold p-2 rounded-lg transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo || isProcessing}
                        title={t('redo')}
                        className="flex justify-center items-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold p-2 rounded-lg transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <div className="col-span-2 grid grid-cols-5 gap-2">
                    <button
                        onClick={() => onToolChange(activeTool === 'magic-wand' ? null : 'magic-wand')}
                        disabled={!selectedFile || isProcessing}
                        title={t('magicWand')}
                        className={`flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm ${
                            activeTool === 'magic-wand'
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-500'
                        } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                    >
                        <MagicWandIcon />
                    </button>
                    <button
                        onClick={() => onToolChange(activeTool === 'selection-eraser' ? null : 'selection-eraser')}
                        disabled={!isSelectionActive || isProcessing}
                        title={t('selectionEraserTooltip')}
                        className={`flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm ${
                            activeTool === 'selection-eraser'
                            ? 'bg-fuchsia-700 text-white'
                            : 'bg-fuchsia-600 hover:bg-fuchsia-500'
                        } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                    >
                        <SelectionEraserIcon />
                    </button>
                    <button
                        onClick={onInpaint}
                        disabled={!isSelectionActive || isProcessing}
                        title={t('inpaintSelection')}
                        className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm bg-rose-600 hover:bg-rose-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <InpaintIcon />
                    </button>
                    <button
                        onClick={onLaunchImageEditor}
                        disabled={!isSelectionActive && !(selectedBox?.type === 'image')}
                        title={t('imageEditorTooltip')}
                        className="flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <EditIcon />
                    </button>
                    <button
                        onClick={handleSplitBoxClick}
                        disabled={!isTextBoxSelected}
                        title={t('splitBoxTooltip')}
                        className="flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <ScissorsIcon />
                    </button>
                </div>
                  <button
                    onClick={onSelectAllBoxes}
                    disabled={!hasAnyBoxes || isProcessing}
                    className="flex justify-center items-center bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    {t('selectAll')}
                  </button>
                  <button
                    onClick={onDeselectBox}
                    disabled={!selectedBox || isProcessing}
                    className="flex justify-center items-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    {t('deselect')}
                  </button>
                  <button
                    onClick={onRecallSelection}
                    disabled={!canRecallSelection || isProcessing}
                    className="flex justify-center items-center bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    {t('recallSelection')}
                  </button>
                  <button
                    onClick={onClearSelection}
                    disabled={!isSelectionActive || isProcessing}
                    className="flex justify-center items-center bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    {t('clearSelection')}
                  </button>
             </div>
             {(activeTool === 'magic-wand' || activeTool === 'selection-eraser') && (
                <div className="pt-3 border-t border-gray-600 space-y-3">
                    {activeTool === 'magic-wand' && (
                        <div>
                            <label className="text-sm text-gray-400 block truncate">{t('tolerance', { value: magicWandTolerance })}</label>
                            <input type="range" min="0" max="200" value={magicWandTolerance} onChange={(e) => onMagicWandToleranceChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    )}
                    {activeTool === 'selection-eraser' && (
                        <div>
                            <label className="text-sm text-gray-400 block truncate">{t('eraserSize', { value: selectionEraserSize })}</label>
                            <input type="range" min="1" max="300" value={selectionEraserSize} onChange={(e) => onSelectionEraserSizeChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    )}
                </div>
             )}
             {isSelectionActive && (
                <div className="pt-3 border-t border-gray-600 space-y-3">
                    {/* Inpainting controls */}
                    <div>
                        <h4 className="text-md font-semibold text-gray-200 -mb-1">{t('inpaint')}</h4>
                        <label htmlFor="auto-color-toggle" className="flex items-center justify-between cursor-pointer mt-3">
                            <span className="text-sm text-gray-200">{t('autoColor')}</span>
                            <div className="relative">
                                <input type="checkbox" id="auto-color-toggle" className="sr-only peer" checked={inpaintAutoColor} onChange={e => onInpaintAutoColorChange(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                        </label>
                        <div className={`flex items-center justify-between transition-opacity mt-3 ${inpaintAutoColor ? 'opacity-50' : 'opacity-100'}`}>
                            <label className="text-sm text-gray-200">{t('manualColor')}</label>
                            <button
                                ref={inpaintColorButtonRef}
                                onClick={() => !inpaintAutoColor && setActiveColorPicker(activeColorPicker === 'inpaint' ? null : 'inpaint')}
                                className="w-24 h-8 rounded-md border-2 border-gray-500 cursor-pointer disabled:cursor-not-allowed"
                                style={{ backgroundColor: inpaintManualColor }}
                                aria-label={t('manualColor')}
                                disabled={inpaintAutoColor}
                            />
                        </div>
                    </div>

                </div>
             )}
            
            {/* --- TEXT FORMATTING --- */}
            <div className="pt-3 border-t border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-gray-200">{t('textFormatting')}</h4>
                <div className="flex items-center space-x-1">
                    <button
                        disabled={formattingDisabled}
                        title={t('saveApplyStyle1')}
                        onClick={(e) => {
                            if (e.shiftKey) {
                                handleSaveClick(0);
                            } else {
                                handleApplyClick(0);
                            }
                        }}
                        className={`flex items-center justify-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold px-2 py-1 rounded-md transition-colors duration-200 text-xs border ${styleSlots[0] ? 'border-sky-400' : 'border-transparent'}`}
                    >
                        <span>1</span>
                        <FloppyDiskIcon />
                    </button>
                    <button
                        disabled={formattingDisabled}
                        title={t('saveApplyStyle2')}
                        onClick={(e) => {
                            if (e.shiftKey) {
                                handleSaveClick(1);
                            } else {
                                handleApplyClick(1);
                            }
                        }}
                        className={`flex items-center justify-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold px-2 py-1 rounded-md transition-colors duration-200 text-xs border ${styleSlots[1] ? 'border-sky-400' : 'border-transparent'}`}
                    >
                        <span>2</span>
                        <FloppyDiskIcon />
                    </button>
                    <button
    disabled={formattingDisabled}
    title={t('saveApplyStyle3')}
    onClick={(e) => {
        if (e.shiftKey) {
            handleSaveClick(2);
        } else {
            handleApplyClick(2);
        }
    }}
    className={`flex items-center justify-center bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold px-2 py-1 rounded-md transition-colors duration-200 text-xs border ${styleSlots[2] ? 'border-sky-400' : 'border-transparent'}`}
>
    <span>3</span>
    <FloppyDiskIcon />
</button>
                </div>
              </div>
              <div className={`space-y-3 ${formattingDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* FONT & SIZE */}
                <div className="grid grid-cols-2 gap-2">
                  <FontSelector
                    fonts={fonts}
                    selectedFont={selectionStyle.fontFamily || 'Patrick Hand'}
                    onFontChange={font => applyFormat({ fontFamily: font })}
                    disabled={formattingDisabled}
                    previewPosition="right"
                  />
                  <input 
                    type="number" 
                    value={selectionStyle.fontSize || ''}
                    placeholder={selectedBox ? String(selectedBox.fontSize) : '16'}
                    onChange={e => {
                        const newSize = parseInt(e.target.value, 10);
                        if (!isNaN(newSize)) {
                            applyFormat({ fontSize: newSize });
                        }
                    }}
                    disabled={formattingDisabled}
                    className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm w-full focus:ring-indigo-500 focus:border-indigo-500" />
                </div>

                {/* COLOR & STROKE */}
                <div className="grid grid-cols-2 gap-x-4 items-start pt-2 border-t border-gray-600">
                    <div>
                        <label className="text-sm text-gray-400">{t('textColor')}</label>
                        <button
                            ref={textColorButtonRef}
                            onClick={() => !formattingDisabled && setActiveColorPicker(activeColorPicker === 'text' ? null : 'text')}
                            className="w-full h-8 mt-1 rounded-md border-2 border-gray-500 cursor-pointer"
                            style={{ backgroundColor: selectionStyle.color || selectedBox?.color || '#000000' }}
                            aria-label={t('textColor')}
                            disabled={formattingDisabled}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">{t('stroke')}</label>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1">
                                <button
                                    ref={strokeColorButtonRef}
                                    onClick={() => !formattingDisabled && setActiveColorPicker(activeColorPicker === 'stroke' ? null : 'stroke')}
                                    className="w-full h-8 rounded-md border-2 border-gray-500 cursor-pointer"
                                    style={{ backgroundColor: selectionStyle.strokeColor || selectedBox?.strokeColor || '#FFFFFF' }}
                                    aria-label={t('stroke')}
                                    disabled={formattingDisabled}
                                />
                            </div>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={selectionStyle.strokeWidth ?? (selectedBox?.strokeWidth || 0)}
                                onChange={e => applyFormat({ strokeWidth: parseFloat(e.target.value) })}
                                disabled={formattingDisabled}
                                className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm w-20 focus:ring-indigo-500 focus:border-indigo-500 h-8"
                                title={t('strokeWidth')}
                            />
                        </div>
                    </div>
                </div>

                {/* STYLE & ALIGN BUTTONS */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
                        <button disabled={formattingDisabled} onClick={() => applyFormat({ fontWeight: selectionStyle.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`w-full p-1 rounded font-bold ${selectionStyle.fontWeight === 'bold' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>B</button>
                        <button disabled={formattingDisabled} onClick={() => applyFormat({ fontStyle: selectionStyle.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`w-full p-1 rounded italic ${selectionStyle.fontStyle === 'italic' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>I</button>
                        <button disabled={formattingDisabled} title={t('cycleCase')} onClick={handleCycleCase} className={`w-full p-1 rounded hover:bg-gray-700 font-serif flex justify-center items-center`}>Aa</button>
                        <button disabled={formattingDisabled} onClick={() => applyFormat({ isSuperscript: !(selectionStyle.isSuperscript) })} className={`w-full p-1 rounded ${selectionStyle.isSuperscript ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>A²</button>
                    </div>
                    <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
                        <button title={t('alignLeft')} disabled={formattingDisabled} onClick={() => applyFormat({ textAlign: 'left' })} className={`w-full p-1 rounded flex justify-center items-center ${selectionStyle.textAlign === 'left' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                            <TextAlignLeftIcon />
                        </button>
                        <button title={t('alignCenter')} disabled={formattingDisabled} onClick={() => applyFormat({ textAlign: 'center' })} className={`w-full p-1 rounded flex justify-center items-center ${selectionStyle.textAlign === 'center' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                            <TextAlignCenterIcon />
                        </button>
                        <button title={t('alignRight')} disabled={formattingDisabled} onClick={() => applyFormat({ textAlign: 'right' })} className={`w-full p-1 rounded flex justify-center items-center ${selectionStyle.textAlign === 'right' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                            <TextAlignRightIcon />
                        </button>
                        <div className="border-l border-gray-700 mx-1"></div>
                        <button title={t('bringForward')} disabled={formattingDisabled || !canBringForward} onClick={onBringForward} className={`w-full p-1 rounded hover:bg-gray-700 disabled:text-gray-600 disabled:hover:bg-gray-900 flex justify-center items-center`}><BringForwardIcon /></button>
                        <button title={t('sendBackward')} disabled={formattingDisabled || !canSendBackward} onClick={onSendBackward} className={`w-full p-1 rounded hover:bg-gray-700 disabled:text-gray-600 disabled:hover:bg-gray-900 flex justify-center items-center`}><SendBackwardIcon /></button>
                    </div>
                </div>

                {/* SPACING SLIDERS */}
                <div className="grid grid-cols-2 gap-x-4 pt-2 border-t border-gray-600">
                  <div>
                    <label className="text-sm text-gray-400 block truncate">{t('lineSpacing', { value: selectionStyle.lineHeight ?? (selectedBox?.lineHeight || 1.2) })}</label>
                    <input type="range" disabled={formattingDisabled} min="0.8" max="3" step="0.1" value={selectionStyle.lineHeight ?? (selectedBox?.lineHeight || 1.2)} onChange={(e) => applyFormat({ lineHeight: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block truncate">{t('wordSpacing', { value: selectionStyle.wordSpacing ?? (selectedBox?.wordSpacing || 0) })}</label>
                    <input type="range" disabled={formattingDisabled} min="-10" max="20" step="0.5" value={selectionStyle.wordSpacing ?? (selectedBox?.wordSpacing || 0)} onChange={(e) => applyFormat({ wordSpacing: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2 text-indigo-400">{t('paintingTools')}</h3>
        <div className={`space-y-3 p-3 rounded-lg bg-gray-700 ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex space-x-1 bg-gray-900 rounded-lg p-1">
              <button onClick={() => onToolChange(activeTool === 'brush' ? null : 'brush')} title={t('brush')} className={`w-full p-1 rounded flex justify-center items-center transition-colors ${activeTool === 'brush' ? 'bg-rose-600 text-white' : 'hover:bg-gray-700'}`}>
                <BrushIcon />
              </button>
              <button onClick={() => onToolChange(activeTool === 'eraser' ? null : 'eraser')} title={t('eraser')} className={`w-full p-1 rounded flex justify-center items-center transition-colors ${activeTool === 'eraser' ? 'bg-rose-600 text-white' : 'hover:bg-gray-700'}`}>
                <EraserIcon />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-end space-x-2">
               <label htmlFor="brush-color-picker" className="text-sm text-gray-400">{t('color')}</label>
               <button
                  id="brush-color-picker"
                  ref={brushColorButtonRef}
                  onClick={() => setActiveColorPicker(activeColorPicker === 'brush' ? null : 'brush')}
                  className="w-16 h-8 rounded-md border-2 border-gray-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: brushColor }}
                  aria-label={t('color')}
                  disabled={activeTool === 'eraser'}
                />
            </div>
          </div>

          {(activeTool === 'brush' || activeTool === 'eraser') && (
            <div className="pt-3 border-t border-gray-600 space-y-3">
                <div>
                    <label className="text-sm text-gray-400 block truncate">{t('hardness', { value: Math.round(brushHardness * 100) })}</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={brushHardness}
                        onChange={(e) => onBrushHardnessChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                {activeTool === 'brush' && (
                  <div>
                    <label className="text-sm text-gray-400 block truncate">{t('opacity', { value: Math.round(brushOpacity * 100) })}</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={brushOpacity}
                        onChange={(e) => onBrushOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
            </div>
          )}
          
          <div>
            <label className="text-sm text-gray-400 block truncate">{t('size', { value: paintBrushSize })}</label>
            <input type="range" min="1" max="300" value={paintBrushSize} onChange={(e) => onPaintBrushSizeChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
          </div>
        </div>
      </div>

       <div>
        <h3 className="text-lg font-semibold mb-2 text-indigo-400">{t('export')}</h3>
        <div className="bg-gray-700 p-3 rounded-lg grid grid-cols-3 gap-2">
            <button
              onClick={onSaveCurrentImage}
              disabled={!selectedFile || isProcessing}
              title={t('saveCurrentImage')}
              className="flex justify-center items-center w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200"
            >
              <SaveIcon />
            </button>
             <button
              onClick={onExportAll}
              disabled={!selectedFile || isProcessing}
              title={t('saveAllToZip')}
              className="flex justify-center items-center w-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200"
            >
              <ZipIcon />
            </button>
            <button
              onClick={onSaveAsPdf}
              disabled={!selectedFile || isProcessing}
              title={t('saveAsPdfTooltip')}
              className="flex justify-center items-center w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-4 rounded-lg transition-colors duration-200"
            >
              <PdfIcon />
            </button>
        </div>
      </div>
      
      {activeColorPicker === 'text' && (
        <ColorPicker 
            triggerRef={textColorButtonRef} 
            color={selectionStyle.color || selectedBox?.color || '#000000'} 
            onChange={c => applyFormat({ color: c })} 
            onClose={() => setActiveColorPicker(null)} 
            onActivateEyedropper={() => onActivateEyedropper('color')} 
            labelPrefix="text" 
        />
      )}
      {activeColorPicker === 'stroke' && (
        <ColorPicker 
            triggerRef={strokeColorButtonRef}
            color={selectionStyle.strokeColor || selectedBox?.strokeColor || '#FFFFFF'} 
            onChange={c => applyFormat({ strokeColor: c })} 
            onClose={() => setActiveColorPicker(null)} 
            onActivateEyedropper={() => onActivateEyedropper('strokeColor')} 
            labelPrefix="stroke" 
        />
      )}
      {activeColorPicker === 'brush' && (
        <ColorPicker 
            triggerRef={brushColorButtonRef}
            color={brushColor} 
            onChange={onBrushColorChange} 
            onClose={() => setActiveColorPicker(null)} 
            onActivateEyedropper={() => onActivateEyedropper('brush')} 
            labelPrefix="brush" 
        />
      )}
      {activeColorPicker === 'inpaint' && (
        <ColorPicker
            triggerRef={inpaintColorButtonRef}
            color={inpaintManualColor}
            onChange={onInpaintManualColorChange}
            onClose={() => setActiveColorPicker(null)}
            onActivateEyedropper={() => onActivateEyedropper('inpaint')}
            labelPrefix="inpaint"
        />
      )}
    </div>
  );
};

export default ToolsPanel;