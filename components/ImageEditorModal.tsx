import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, History } from '../types';
import { drawStrokesOnCanvas } from '../services/canvasUtils';
import { useTranslation } from '../services/i18n';
import ColorPicker from './ColorPicker';

interface ImageEditorModalProps {
  imageDataUrl: string;
  backgroundImageUrl?: string;
  backgroundBounds?: { x: number; y: number; width: number; height: number };
  onApply: (newImageDataUrl: string, transform: { x: number; y: number; scale: number; rotation: number }, magicBrushStrokes?: Stroke[]) => void;
  onClose: () => void;
}

const BrushIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 2.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-11 11a1 1 0 01-.707.293H3a1 1 0 01-1-1v-2.414a1 1 0 01.293-.707l11-11zM14 4l2 2-9 9H5v-2l9-9z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M15 8a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
    </svg>
);

const EraserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M15.206 2.343a1.5 1.5 0 012.122 0l1.414 1.414a1.5 1.5 0 010 2.121L8.343 18.278a1.5 1.5 0 01-2.122 0l-4.242-4.242a1.5 1.5 0 010-2.121L15.206 2.343zM7.28 9.28L3.037 13.523l4.243 4.243 4.242-4.243-4.242-4.243z" clipRule="evenodd" />
    </svg>
);

const EyedropperIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.5a1.5 1.5 0 011.06.44l3.536 3.535a1.5 1.5 0 010 2.122L6.12 18.07a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121L11.061 4.44A1.5 1.5 0 0110 3.5zM12 7.5a1 1 0 11-2 0 1 1 0 012 0z" />
        <path d="M4.343 14.343l1.414 1.414-2.121 2.122a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121l2.121-2.121z" />
    </svg>
);

const LassoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.261 13.739c-1.683-2.185-1.986-5.11-.79-7.595c1.47-3.052 4.935-4.223 7.987-2.753c2.44, 1.176, 4.01, 3.522, 4.29, 6.13" />
        <path d="M19.739 10.261c1.683 2.185, 1.986, 5.11,.79, 7.595c-1.47, 3.052-4.935, 4.223-7.987, 2.753c-2.44-1.176-4.01-3.522-4.29-6.13" />
        <path d="M12 22v-5" />
        <path d="M10 17h4" />
    </svg>
);

const UndoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const RedoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const MagicBrushIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
        <path d="M18.5 2.5a.5.5 0 00-1 0 .5.5 0 001 0zM20 5a.5.5 0 00-1 0 .5.5 0 001 0zM16 6a.5.5 0 00-1 0 .5.5 0 001 0z" />
    </svg>
);

const MoveIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v2.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 6.586V4a1 1 0 011-1zM10 17a1 1 0 01-1-1v-2.586l-1.293 1.293a1 1 0 11-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414L11 13.414V16a1 1 0 01-1-1zM3 10a1 1 0 011-1h2.586l-1.293-1.293a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L6.586 11H4a1 1 0 01-1-1zm14 0a1 1 0 01-1 1h-2.586l1.293 1.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 111.414 1.414L13.414 9H16a1 1 0 011 1z" clipRule="evenodd" />
  </svg>
);

type WindowInteractionType = 'drag' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | 'resize-b' | 'resize-t' | 'resize-r' | 'resize-l';
type Tool = 'brush' | 'eraser' | 'eyedropper' | 'lasso' | 'magic-brush' | 'move-image';
type ImageInteractionType = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

const HANDLE_SIZE = 10;

// --- Helper Functions ---
const rotatePoint = ({ x, y }: { x: number, y: number }, angleRad: number) => ({
  x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
  y: x * Math.sin(angleRad) + y * Math.cos(angleRad),
});

interface Handle {
  x: number;
  y: number;
  cursor: string;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageDataUrl, backgroundImageUrl, backgroundBounds, onApply, onClose }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);

  const [history, setHistory] = useState<History<Stroke[]>>({
    past: [],
    present: [],
    future: [],
  });
  const strokes = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([]);
  const lassoPoints = useRef<{ x: number; y: number }[]>([]);
  
  const [activeTool, setActiveTool] = useState<Tool>('move-image');
  const [brushSize, setBrushSize] = useState(15);
  const [brushHardness, setBrushHardness] = useState(0.5);
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [brushPreviewStyle, setBrushPreviewStyle] = useState<React.CSSProperties>({ display: 'none' });

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });

  const [showBackground, setShowBackground] = useState(true);
  const [imageOpacity, setImageOpacity] = useState(1.0);

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerButtonRef = useRef<HTMLButtonElement>(null);

  const imageInteractionRef = useRef<{
      type: ImageInteractionType;
      startMouseWorld: { x: number, y: number };
      startTransform: typeof imageTransform;
      pivotWorld?: { x: number, y: number };
  } | null>(null);

  const [size, setSize] = useState({
    width: Math.min(window.innerWidth * 0.8, 1200),
    height: window.innerHeight * 0.8,
  });
  const [position, setPosition] = useState({
    x: (window.innerWidth - Math.min(window.innerWidth * 0.8, 1200)) / 2,
    y: (window.innerHeight - window.innerHeight * 0.8) / 2,
  });
  const windowInteractionRef = useRef<{
    type: WindowInteractionType;
    startX: number; startY: number;
    startWidth: number; startHeight: number;
    startLeft: number; startTop: number;
  } | null>(null);


  useEffect(() => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      setImage(img);
      const container = containerRef.current;
      if (container) {
        const { clientWidth, clientHeight } = container;
        const scale = Math.min(clientWidth / img.width, clientHeight / img.height);
        const initialZoom = scale * 0.9;
        setZoom(initialZoom);
        setPanOffset({
          x: (clientWidth - img.width * initialZoom) / 2,
          y: (clientHeight - img.height * initialZoom) / 2,
        });
      }
    };
  }, [imageDataUrl]);

  useEffect(() => {
    if (backgroundImageUrl) {
      const img = new Image();
      img.src = backgroundImageUrl;
      img.onload = () => {
        setBackgroundImage(img);
      };
    }
  }, [backgroundImageUrl]);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

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

  const screenToWorldCoords = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  const worldToScreenCoords = useCallback((worldPos: { x: number; y: number }) => {
    return {
        x: worldPos.x * zoom + panOffset.x,
        y: worldPos.y * zoom + panOffset.y,
    };
  }, [zoom, panOffset]);

  const worldToNormalizedCoords = useCallback((worldPos: { x: number, y: number }) => {
      if (!image) return { x: 0, y: 0 };
      return { x: worldPos.x / image.width, y: worldPos.y / image.height };
  }, [image]);
  
  const normalizedToScreenCoords = useCallback((normPos: { x: number, y: number }) => {
    if (!image) return { x: 0, y: 0 };

    // Step 1: Convert normalized local coordinates to local pixel coordinates
    const localX = normPos.x * image.width;
    const localY = normPos.y * image.height;

    // Step 2: Apply image transform to get world coordinates
    const { x: tx, y: ty, scale, rotation } = imageTransform;
    const angleRad = rotation * Math.PI / 180;
    
    // Center of the image in its local coordinate system
    const localCenterX = image.width / 2;
    const localCenterY = image.height / 2;

    // Point relative to local center
    const dx_local = localX - localCenterX;
    const dy_local = localY - localCenterY;
    
    // Apply scale
    const scaled_dx = dx_local * scale;
    const scaled_dy = dy_local * scale;
    
    // Apply rotation
    const rotated = rotatePoint({ x: scaled_dx, y: scaled_dy }, angleRad);

    // Center of the transformed image in world coordinates
    const worldWidth = image.width * scale;
    const worldHeight = image.height * scale;
    const worldCenterX = tx + worldWidth / 2;
    const worldCenterY = ty + worldHeight / 2;

    const worldX = worldCenterX + rotated.x;
    const worldY = worldCenterY + rotated.y;

    // Step 3: Apply main canvas pan/zoom to get screen coordinates
    return worldToScreenCoords({ x: worldX, y: worldY });

  }, [image, imageTransform, worldToScreenCoords]);

  const getLocalImageCoords = useCallback((screenX: number, screenY: number): { x: number, y: number } | null => {
    if (!image) return null;
    
    // 1. Screen to World (the space transformed by pan/zoom)
    const worldX = (screenX - panOffset.x) / zoom;
    const worldY = (screenY - panOffset.y) / zoom;
    
    // 2. Inverse Image Transform (from world space to the image's local space)
    const { x: tx, y: ty, scale, rotation } = imageTransform;
    const angleRad = rotation * Math.PI / 180;
    
    const worldWidth = image.width * scale;
    const worldHeight = image.height * scale;
    const worldCenterX = tx + worldWidth / 2;
    const worldCenterY = ty + worldHeight / 2;
    
    // Translate point to be relative to the transformed image's center
    const dx = worldX - worldCenterX;
    const dy = worldY - worldCenterY;
    
    // Apply inverse rotation
    const rotated = rotatePoint({ x: dx, y: dy }, -angleRad);
    
    // Apply inverse scale and translate from local center to local top-left
    const localX = (rotated.x / scale) + (image.width / 2);
    const localY = (rotated.y / scale) + (image.height / 2);
    
    return { x: localX, y: localY };
  }, [image, panOffset, zoom, imageTransform]);

  const getHandles = useCallback(() => {
    if (!image) return {};

    const { x, y, scale, rotation } = imageTransform;
    const worldWidth = image.width * scale;
    const worldHeight = image.height * scale;
    const worldCenter = { x: x + worldWidth / 2, y: y + worldHeight / 2 };
    const angleRad = rotation * Math.PI / 180;
    
    const localHandles = {
        'resize-tl': { x: -worldWidth / 2, y: -worldHeight / 2, cursor: 'nwse-resize' },
        'resize-tr': { x: worldWidth / 2, y: -worldHeight / 2, cursor: 'nesw-resize' },
        'resize-bl': { x: -worldWidth / 2, y: worldHeight / 2, cursor: 'nesw-resize' },
        'resize-br': { x: worldWidth / 2, y: worldHeight / 2, cursor: 'nwse-resize' },
    };

    const screenHandles: { [key: string]: Handle } = {};
    for (const [key, val] of Object.entries(localHandles)) {
      const rotated = rotatePoint(val, angleRad);
      const worldPos = { x: rotated.x + worldCenter.x, y: rotated.y + worldCenter.y };
      const screenPos = worldToScreenCoords(worldPos);
      screenHandles[key] = {
        x: screenPos.x,
        y: screenPos.y,
        cursor: val.cursor
      };
    }
    return screenHandles;
  }, [image, imageTransform, worldToScreenCoords]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // 1. Draw edited image (with strokes, adjustments) to an offscreen canvas.
    if (!offscreenCanvasRef.current || offscreenCanvasRef.current.width !== image.width || offscreenCanvasRef.current.height !== image.height) {
        offscreenCanvasRef.current = document.createElement('canvas');
        offscreenCanvasRef.current.width = image.width;
        offscreenCanvasRef.current.height = image.height;
    }
    const offscreenCanvas = offscreenCanvasRef.current;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    offscreenCtx.clearRect(0, 0, image.width, image.height);
    offscreenCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    offscreenCtx.drawImage(image, 0, 0);
    offscreenCtx.filter = 'none';

    const normToWorld = (pos: { x: number, y: number }) => ({ x: pos.x * image.width, y: pos.y * image.height });

    const paintStrokes = strokes.filter(s => s.type === 'brush' || s.type === 'eraser');
    if (paintStrokes.length > 0) {
        drawStrokesOnCanvas(offscreenCtx, paintStrokes, normToWorld);
    }

    const magicStrokes = strokes.filter(s => s.type === 'magic-brush');
    if (magicStrokes.length > 0) {
        const purpleMagicStrokes = magicStrokes.map(s => ({...s, type: 'brush' as const, color: 'rgba(128, 0, 128, 0.6)', hardness: 1}));
        drawStrokesOnCanvas(offscreenCtx, purpleMagicStrokes, normToWorld);
    }

    if (imageInteractionRef.current?.type !== 'move' && currentStrokePoints.current.length > 0) {
        let currentStroke: Omit<Stroke, 'id'> | null = null;
        if (activeTool === 'brush' || activeTool === 'eraser') {
            currentStroke = { type: activeTool, color: brushColor, size: brushSize, hardness: brushHardness, shape: 'round', points: currentStrokePoints.current, opacity: 1 };
        } else if (activeTool === 'magic-brush') {
            currentStroke = { type: 'brush', color: 'rgba(128, 0, 128, 0.6)', size: brushSize, hardness: 1, shape: 'round', points: currentStrokePoints.current, opacity: 1 };
        }
        if (currentStroke) {
            drawStrokesOnCanvas(offscreenCtx, [currentStroke], normToWorld);
        }
    }

    // 2. Draw to the visible canvas
    const visibleCtx = canvas.getContext('2d');
    if (!visibleCtx) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    visibleCtx.fillStyle = '#1a202c'; // Dark background for the modal canvas area
    visibleCtx.fillRect(0, 0, canvas.width, canvas.height);

    // This is the main view transform for pan and zoom
    visibleCtx.save();
    visibleCtx.translate(panOffset.x, panOffset.y);
    visibleCtx.scale(zoom, zoom);

    // 3. Draw the background image for context, independent of foreground transforms
    if (showBackground && backgroundImage && backgroundBounds) {
        visibleCtx.save();
        visibleCtx.globalAlpha = 0.5; // Fixed opacity for context

        const sw = backgroundBounds.width * backgroundImage.width;
        if (sw > 0) { // Avoid division by zero
            // The scale needed to make the background's crop area match the foreground image's base size
            const scaleFactor = image.width / sw;
            
            const scaledBgWidth = backgroundImage.width * scaleFactor;
            const scaledBgHeight = backgroundImage.height * scaleFactor;

            // Center of the modal's world (which is the size of the foreground image)
            const worldCenterX = image.width / 2;
            const worldCenterY = image.height / 2;

            // Center of the crop area on the background image, in pixels
            const bgBoundsCenterX_pixels = (backgroundBounds.x + backgroundBounds.width / 2) * backgroundImage.width;
            const bgBoundsCenterY_pixels = (backgroundBounds.y + backgroundBounds.height / 2) * backgroundImage.height;

            // Calculate the top-left (x,y) in world coordinates to draw the full background image
            // such that the crop area is centered in the world.
            const bgWorldX = worldCenterX - (bgBoundsCenterX_pixels * scaleFactor);
            const bgWorldY = worldCenterY - (bgBoundsCenterY_pixels * scaleFactor);
            
            visibleCtx.drawImage(backgroundImage, bgWorldX, bgWorldY, scaledBgWidth, scaledBgHeight);
        }
        visibleCtx.restore();
    }

    // 4. Draw the transformed foreground image
    visibleCtx.save();
    visibleCtx.globalAlpha = imageOpacity;
    const { x, y, scale, rotation } = imageTransform;
    const worldWidth = image.width * scale;
    const worldHeight = image.height * scale;
    const worldCenterX = x + worldWidth / 2;
    const worldCenterY = y + worldHeight / 2;
    
    visibleCtx.translate(worldCenterX, worldCenterY);
    visibleCtx.rotate(rotation * Math.PI / 180);
    visibleCtx.translate(-worldCenterX, -worldCenterY);
    
    visibleCtx.drawImage(offscreenCanvas, x, y, worldWidth, worldHeight);
    visibleCtx.restore();
    
    // Restore from main view transform
    visibleCtx.restore();

    // 5. Draw UI elements on top (handles, lasso preview) in screen space
    if (activeTool === 'move-image') {
        const handles = getHandles();
        visibleCtx.fillStyle = '#8b5cf6';
        visibleCtx.strokeStyle = '#FFFFFF';
        visibleCtx.lineWidth = 1.5;
        // FIX: Cast Object.values to Handle[] to resolve type errors on `handle`.
        (Object.values(handles) as Handle[]).forEach(handle => {
            visibleCtx.beginPath();
            visibleCtx.rect(handle.x - HANDLE_SIZE/2, handle.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            visibleCtx.fill();
            visibleCtx.stroke();
        });
    }

    if (imageInteractionRef.current === null && lassoPoints.current.length > 1) {
        visibleCtx.save();
        visibleCtx.strokeStyle = '#03A9F4';
        visibleCtx.fillStyle = 'rgba(3, 169, 244, 0.25)';
        visibleCtx.lineWidth = 2;
        visibleCtx.beginPath();
        const firstPoint = normalizedToScreenCoords(lassoPoints.current[0]);
        visibleCtx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < lassoPoints.current.length; i++) {
            const point = normalizedToScreenCoords(lassoPoints.current[i]);
            visibleCtx.lineTo(point.x, point.y);
        }
        visibleCtx.closePath();
        visibleCtx.stroke();
        visibleCtx.fill();
        visibleCtx.restore();
    }

  }, [image, backgroundImage, backgroundBounds, panOffset, zoom, strokes, activeTool, brushSize, brushHardness, brushColor, brightness, contrast, normalizedToScreenCoords, showBackground, imageOpacity, imageTransform, getHandles]);

  useEffect(() => {
    draw();
  }, [draw, strokes, size]);

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  
  const updateBrushPreview = useCallback((mouseX: number, mouseY: number) => {
    const radius = (brushSize / 2) * zoom;
    if (activeTool === 'magic-brush') {
        setBrushPreviewStyle({
            display: 'block', position: 'absolute', left: `${mouseX - radius}px`, top: `${mouseY - radius}px`,
            width: `${radius * 2}px`, height: `${radius * 2}px`, borderRadius: '50%',
            background: 'transparent', border: '2px solid red', pointerEvents: 'none', zIndex: 100,
        });
        return;
    }
    const hardness = brushHardness;
    const color = activeTool === 'brush' ? brushColor : 'rgba(255, 0, 0, 0.5)';
    setBrushPreviewStyle({
        display: 'block', position: 'absolute', left: `${mouseX - radius}px`, top: `${mouseY - radius}px`,
        width: `${radius * 2}px`, height: `${radius * 2}px`, borderRadius: '50%',
        background: `radial-gradient(circle, ${color} ${hardness * 100}%, transparent 100%)`,
        border: '1px solid white', pointerEvents: 'none', zIndex: 100,
    });
  }, [brushSize, brushHardness, activeTool, zoom, brushColor]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    
    if (activeTool === 'eyedropper') {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const hexColor = `#${('00' + pixelData[0].toString(16)).slice(-2)}${('00' + pixelData[1].toString(16)).slice(-2)}${('00' + pixelData[2].toString(16)).slice(-2)}`;
        
        setBrushColor(hexColor);
        setActiveTool('brush');
        return;
    }
    
    if (e.ctrlKey || e.metaKey) {
        isPanning.current = true;
        return;
    }
    
    if (activeTool === 'move-image') {
        const worldPos = screenToWorldCoords(x, y);
        if (!worldPos) return;

        const handles = getHandles();
        for (const [type, handle] of Object.entries(handles) as [ImageInteractionType, Handle][]) {
            if (Math.hypot(x - handle.x, y - handle.y) < HANDLE_SIZE) {
                if (!image) return;
                const { x: tx, y: ty, scale, rotation } = imageTransform;
                const worldWidth = image.width * scale;
                const worldHeight = image.height * scale;
                const worldCenter = { x: tx + worldWidth / 2, y: ty + worldHeight / 2 };
                const angleRad = rotation * Math.PI / 180;
                
                const cornerKey = type.split('-')[1] as 'tl' | 'tr' | 'bl' | 'br';
                const pivotKey: keyof typeof handles = ({ tl: 'resize-br', tr: 'resize-bl', bl: 'resize-tr', br: 'resize-tl' })[cornerKey];

                const localPivot = {
                    x: (pivotKey.includes('l') ? -1 : 1) * worldWidth / 2,
                    y: (pivotKey.includes('t') ? -1 : 1) * worldHeight / 2,
                };
                const rotatedPivot = rotatePoint(localPivot, angleRad);
                const pivotWorld = { x: rotatedPivot.x + worldCenter.x, y: rotatedPivot.y + worldCenter.y };

                imageInteractionRef.current = {
                    type,
                    startMouseWorld: worldPos,
                    startTransform: imageTransform,
                    pivotWorld,
                };
                return;
            }
        }
        imageInteractionRef.current = { type: 'move', startMouseWorld: worldPos, startTransform: imageTransform };
    } else if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'magic-brush') {
      imageInteractionRef.current = null;
      const localPos = getLocalImageCoords(x, y);
      if (!localPos) return;
      const normPos = worldToNormalizedCoords(localPos);
      currentStrokePoints.current = [normPos];
    } else if (activeTool === 'lasso') {
        imageInteractionRef.current = null;
        const localPos = getLocalImageCoords(x, y);
        if (!localPos) return;
        const normPos = worldToNormalizedCoords(localPos);
        lassoPoints.current = [normPos];
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'magic-brush') {
        updateBrushPreview(x, y);
    } else {
        setBrushPreviewStyle({ display: 'none' });
    }

    if (isPanning.current) {
        setPanOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        draw();
        return;
    }

    if (imageInteractionRef.current) {
        const currentWorldPos = screenToWorldCoords(x, y);
        if (!currentWorldPos) return;
        const { type, startMouseWorld, startTransform, pivotWorld } = imageInteractionRef.current;

        if (type === 'move') {
            const dx = currentWorldPos.x - startMouseWorld.x;
            const dy = currentWorldPos.y - startMouseWorld.y;
            setImageTransform({ ...startTransform, x: startTransform.x + dx, y: startTransform.y + dy });
        } else if (type.startsWith('resize-') && pivotWorld) {
            const angleRad = startTransform.rotation * Math.PI / 180;
            const newDiagonalVecWorld = { x: currentWorldPos.x - pivotWorld.x, y: currentWorldPos.y - pivotWorld.y };
            const localNewDiagonalVec = rotatePoint(newDiagonalVecWorld, -angleRad);
            
            const ar = image.width / image.height;
            const u = localNewDiagonalVec;
            const signX = Math.sign(u.x) || 1;
            const signY = Math.sign(u.y) || 1;
            const d = { x: ar * signX, y: 1 * signY };
            const dot_ud = u.x * d.x + u.y * d.y;
            const dot_dd = d.x * d.x + d.y * d.y;
            
            let newWidthLocal = 0, newHeightLocal = 0;
            if (dot_dd > 0) {
                const scale = dot_ud / dot_dd;
                const projectedDiag = { x: d.x * scale, y: d.y * scale };
                newWidthLocal = Math.abs(projectedDiag.x);
                newHeightLocal = Math.abs(projectedDiag.y);
            }

            if (newWidthLocal < 10) newWidthLocal = 10;
            if (newHeightLocal < 10) newHeightLocal = 10;
            
            const finalDiagonalVecLocal = {
                x: Math.sign(localNewDiagonalVec.x) * newWidthLocal,
                y: Math.sign(localNewDiagonalVec.y) * newHeightLocal
            };
            const rotatedFinalDiagonal = rotatePoint(finalDiagonalVecLocal, angleRad);
            const newCenterWorld = { x: pivotWorld.x + rotatedFinalDiagonal.x / 2, y: pivotWorld.y + rotatedFinalDiagonal.y / 2 };
            
            const newScale = newWidthLocal / image.width;
            
            const newTopLeftLocal = { x: -newWidthLocal / 2, y: -newHeightLocal / 2 };
            const rotatedTopLeft = rotatePoint(newTopLeftLocal, angleRad);
            const newTopLeftWorld = { x: newCenterWorld.x + rotatedTopLeft.x, y: newCenterWorld.y + rotatedTopLeft.y };

            setImageTransform({
                scale: newScale,
                rotation: startTransform.rotation,
                x: newTopLeftWorld.x,
                y: newTopLeftWorld.y
            });
        }
    } else if (currentStrokePoints.current.length > 0) {
        const localPos = getLocalImageCoords(x, y);
        if (!localPos) return;
        const normPos = worldToNormalizedCoords(localPos);
        currentStrokePoints.current.push(normPos);
    } else if (lassoPoints.current.length > 0) {
        const localPos = getLocalImageCoords(x, y);
        if (!localPos) return;
        const normPos = worldToNormalizedCoords(localPos);
        lassoPoints.current.push(normPos);
    } else {
        if (activeTool === 'move-image') {
            const handles = getHandles();
            let cursorSet = false;
            // FIX: Cast Object.values to Handle[] to resolve type errors on `handle`.
            for (const handle of Object.values(handles) as Handle[]) {
                if (Math.hypot(x - handle.x, y - handle.y) < HANDLE_SIZE) {
                    canvas.style.cursor = handle.cursor;
                    cursorSet = true;
                    break;
                }
            }
            if (!cursorSet) canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = activeTool === 'eyedropper' || activeTool === 'lasso' ? 'crosshair' : (activeTool ? 'none' : 'grab');
        }
    }
    draw();
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    if (imageInteractionRef.current === null) {
        if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'magic-brush') {
            if (currentStrokePoints.current.length > 0) {
                const newStroke: Stroke = {
                    id: Date.now(),
                    type: activeTool,
                    color: brushColor,
                    size: brushSize,
                    hardness: activeTool === 'magic-brush' ? 1.0 : brushHardness,
                    shape: 'round',
                    points: [...currentStrokePoints.current],
                    opacity: 1,
                };
                setHistory(currentHistory => ({
                    past: [...currentHistory.past, currentHistory.present],
                    present: [...currentHistory.present, newStroke],
                    future: [],
                }));
            }
        } else if (activeTool === 'lasso' && lassoPoints.current.length > 2) {
            const newLassoEraseStroke: Stroke = {
                id: Date.now(),
                type: 'eraser',
                color: '#000000',
                size: 1,
                hardness: 1,
                shape: 'round',
                points: [...lassoPoints.current],
                isFill: true,
                opacity: 1,
            };
            setHistory(currentHistory => ({
                past: [...currentHistory.past, currentHistory.present],
                present: [...currentHistory.present, newLassoEraseStroke],
                future: [],
            }));
        }
    }
    imageInteractionRef.current = null;
    currentStrokePoints.current = [];
    lassoPoints.current = [];
  };
  
  const handleMouseLeave = () => {
    if (imageInteractionRef.current || isPanning.current || currentStrokePoints.current.length > 0 || lassoPoints.current.length > 0) {
        handleMouseUp();
    }
    setBrushPreviewStyle({ display: 'none' });
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!image) return;

    if (activeTool === 'move-image') {
        e.preventDefault();
        
        if (e.shiftKey) {
            const rotationAmount = e.deltaY > 0 ? 2 : -2;
            setImageTransform(prev => ({...prev, rotation: prev.rotation + rotationAmount}));
        } else {
            const { x: mouseX, y: mouseY } = getCanvasCoords(e);
            const scaleFactor = 1.05;
            const oldScale = imageTransform.scale;
            const newScale = e.deltaY < 0 ? oldScale * scaleFactor : oldScale / scaleFactor;
            const clampedScale = Math.max(0.1, Math.min(newScale, 10));

            const mouseWorld = screenToWorldCoords(mouseX, mouseY);
            if (!mouseWorld) return;
            
            const newX = mouseWorld.x - ((mouseWorld.x - imageTransform.x) * (clampedScale / oldScale));
            const newY = mouseWorld.y - ((mouseWorld.y - imageTransform.y) * (clampedScale / oldScale));

            setImageTransform(prev => ({ ...prev, scale: clampedScale, x: newX, y: newY }));
        }
        return;
    }

    e.preventDefault();
    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
    const mouseWorldBeforeZoom = screenToWorldCoords(mouseX, mouseY);
    if (!mouseWorldBeforeZoom) return;
    setZoom(clampedZoom);
    setPanOffset({
        x: mouseX - mouseWorldBeforeZoom.x * clampedZoom,
        y: mouseY - mouseWorldBeforeZoom.y * clampedZoom,
    });
    draw();
  };
  
  const handleApply = () => {
    if (!image) return;
    
    const magicStrokes = strokes.filter(s => s.type === 'magic-brush');

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = image.width;
    compositeCanvas.height = image.height;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (!compositeCtx) return;

    compositeCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    compositeCtx.drawImage(image, 0, 0);
    compositeCtx.filter = 'none';

    const paintStrokes = strokes.filter(s => s.type === 'brush' || s.type === 'eraser');
    const normToWorld = (pos: { x: number, y: number }) => ({ x: pos.x * image.width, y: pos.y * image.height });
    drawStrokesOnCanvas(compositeCtx, paintStrokes, normToWorld);
    
    onApply(compositeCanvas.toDataURL(), imageTransform, magicStrokes.length > 0 ? magicStrokes : undefined);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Undo/Redo
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
            e.preventDefault();
            if (canUndo) handleUndo();
        } else if (e.key === 'y') {
            e.preventDefault();
            if (canRedo) handleRedo();
        }
        return; // Prevent other shortcuts while Ctrl/Meta is down
    }

    // Handle modal close
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Handle image movement with arrow keys
    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
            case 'ArrowUp':
                dy = -step;
                break;
            case 'ArrowDown':
                dy = step;
                break;
            case 'ArrowLeft':
                dx = -step;
                break;
            case 'ArrowRight':
                dx = step;
                break;
        }

        if (dx !== 0 || dy !== 0) {
            setImageTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy,
            }));
        }
    }
  };

  const handleInteractionMove = useCallback((e: MouseEvent) => {
    if (!windowInteractionRef.current) return;
    const { type, startX, startY, startWidth, startHeight, startLeft, startTop } = windowInteractionRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const minWidth = 500;
    const minHeight = 400;

    if (type === 'drag') {
        setPosition({ x: startLeft + dx, y: startTop + dy });
    } else {
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (type.includes('r')) newWidth = startWidth + dx;
        if (type.includes('l')) {
            newWidth = startWidth - dx;
            newLeft = startLeft + dx;
        }
        if (type.includes('b')) newHeight = startHeight + dy;
        if (type.includes('t')) {
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        }

        if (newWidth < minWidth) {
            if (type.includes('l')) newLeft = startLeft + startWidth - minWidth;
            newWidth = minWidth;
        }
        if (newHeight < minHeight) {
            if (type.includes('t')) newTop = startTop + startHeight - minHeight;
            newHeight = minHeight;
        }
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newLeft, y: newTop });
    }
  }, []);

  const handleInteractionStart = useCallback((e: React.MouseEvent, type: WindowInteractionType) => {
    e.preventDefault();
    windowInteractionRef.current = {
      type,
      startX: e.clientX, startY: e.clientY,
      startWidth: size.width, startHeight: size.height,
      startLeft: position.x, startTop: position.y,
    };
    
    const handleMouseUp = () => {
        windowInteractionRef.current = null;
        window.removeEventListener('mousemove', handleInteractionMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [size, position, handleInteractionMove]);

  const handleResetTransform = () => {
    setImageTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  };

  const resizeHandles: WindowInteractionType[] = ['resize-tl', 'resize-t', 'resize-tr', 'resize-l', 'resize-r', 'resize-bl', 'resize-b', 'resize-br'];
  const handleCursors: Record<WindowInteractionType, string> = {
    'drag': 'move',
    'resize-tl': 'nwse-resize', 'resize-tr': 'nesw-resize',
    'resize-bl': 'nesw-resize', 'resize-br': 'nwse-resize',
    'resize-t': 'ns-resize', 'resize-b': 'ns-resize',
    'resize-l': 'ew-resize', 'resize-r': 'ew-resize',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 p-4">
        <div 
            ref={modalRef} 
            tabIndex={-1} 
            onKeyDown={handleKeyDown} 
            style={{
                position: 'absolute',
                top: position.y, left: position.x,
                width: size.width, height: size.height,
            }}
            className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 flex flex-col overflow-hidden outline-none"
        >
            <header
                onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                className="flex-shrink-0 p-3 bg-gray-900 flex justify-between items-center border-b border-gray-700 cursor-move"
            >
                <h2 className="text-xl font-bold text-indigo-400">{t('imageEditor')}</h2>
                 <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>
            <div className="flex-grow flex min-h-0">
                <aside className="w-16 flex-shrink-0 bg-gray-900 p-2 flex flex-col items-center space-y-2 border-r border-gray-700">
                    <button onClick={() => setActiveTool('move-image')} className={`p-2 rounded-lg ${activeTool === 'move-image' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={t('moveImage')}><MoveIcon /></button>
                    <button onClick={() => setActiveTool('brush')} className={`p-2 rounded-lg ${activeTool === 'brush' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={t('brush')}><BrushIcon /></button>
                    <button onClick={() => setActiveTool('eraser')} className={`p-2 rounded-lg ${activeTool === 'eraser' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={t('eraser')}><EraserIcon /></button>
                    <button onClick={() => setActiveTool('lasso')} className={`p-2 rounded-lg ${activeTool === 'lasso' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={t('lassoErase')}><LassoIcon /></button>
                    <button onClick={() => setActiveTool('magic-brush')} className={`p-2 rounded-lg ${activeTool === 'magic-brush' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title='Magic Brush'><MagicBrushIcon /></button>
                    <button onClick={() => setActiveTool('eyedropper')} className={`p-2 rounded-lg ${activeTool === 'eyedropper' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={t('eyedropper')}><EyedropperIcon /></button>
                </aside>
                <main ref={containerRef} className="flex-grow relative overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onWheel={handleWheel}
                    />
                    <div style={brushPreviewStyle} />
                    <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-75 text-white text-xs rounded-md p-2 shadow-lg select-none">
                        <span>{t('imageTransform')}: {Math.round(imageTransform.scale*100)}%</span> | <span>{t('zoom')}: {Math.round(zoom * 100)}%</span>
                    </div>
                </main>
                <aside className="w-64 flex-shrink-0 bg-gray-900 p-4 space-y-6 overflow-y-auto border-l border-gray-700">
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Actions</h3>
                        <div className="flex items-center space-x-1">
                            <button onClick={handleUndo} disabled={!canUndo} className="flex-1 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex justify-center" title={t('undo')}><UndoIcon /></button>
                            <button onClick={handleRedo} disabled={!canRedo} className="flex-1 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex justify-center" title={t('redo')}><RedoIcon /></button>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">{t('viewOptions')}</h3>
                        <div className="space-y-3 bg-gray-800 p-2 rounded-lg">
                            <label htmlFor="show-bg-toggle" className="flex items-center justify-between cursor-pointer text-sm">
                                <span className="text-gray-300">{t('showBackground')}</span>
                                <div className="relative">
                                    <input type="checkbox" id="show-bg-toggle" className="sr-only peer" checked={showBackground} onChange={e => setShowBackground(e.target.checked)} disabled={!backgroundImage}/>
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                                </div>
                            </label>
                            <div className="text-sm">
                                <label className="text-gray-300 whitespace-nowrap">{t('imageOpacity', { value: Math.round(imageOpacity * 100) })}</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.05" 
                                    value={imageOpacity} 
                                    onChange={e => setImageOpacity(parseFloat(e.target.value))} 
                                    className="w-full accent-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                    {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'magic-brush') && (
                        <div>
                            <h3 className="font-semibold text-gray-300 mb-2">Tool Options</h3>
                            <div className="space-y-3">
                                {activeTool === 'brush' && (
                                     <div className="flex items-center justify-between text-sm">
                                        <label className="text-gray-300 whitespace-nowrap">{t('color')}</label>
                                         <button
                                            ref={colorPickerButtonRef}
                                            onClick={() => setIsColorPickerOpen(p => !p)}
                                            className="w-24 h-8 rounded-md border-2 border-gray-500"
                                            style={{ backgroundColor: brushColor }}
                                            title={t('color') + `: ${brushColor}`}
                                        />
                                    </div>
                                )}
                                <div className="text-sm">
                                    <label className="text-gray-300 whitespace-nowrap">{t('size', { value: brushSize })}</label>
                                    <input type="range" min="1" max="300" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))} className="w-full accent-indigo-500" />
                                </div>
                                {(activeTool === 'brush' || activeTool === 'eraser') && (
                                <div className="text-sm">
                                    <label className="text-gray-300 whitespace-nowrap">{t('hardness', { value: Math.round(brushHardness * 100) })}</label>
                                    <input type="range" min="0" max="1" step="0.01" value={brushHardness} onChange={e => setBrushHardness(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                                </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">{t('imageTransform')}</h3>
                        <div className="space-y-2">
                             <p className="text-xs text-gray-400">{t('transformHelp')}</p>
                            <button onClick={handleResetTransform} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">{t('resetTransform')}</button>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Adjustments</h3>
                         <div className="space-y-3">
                            <div className="text-sm">
                                <label className="text-gray-300 whitespace-nowrap">{t('brightness', { value: brightness })}</label>
                                <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(parseInt(e.target.value, 10))} className="w-full accent-indigo-500" />
                            </div>
                            <div className="text-sm">
                                <label className="text-gray-300 whitespace-nowrap">{t('contrast', { value: contrast })}</label>
                                <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(parseInt(e.target.value, 10))} className="w-full accent-indigo-500" />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
            <footer className="flex-shrink-0 p-3 bg-gray-900 flex justify-end items-center space-x-3 border-t border-gray-700">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('cancel')}</button>
                <button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('apply')}</button>
            </footer>
            {resizeHandles.map(handle => (
                 <div
                    key={handle}
                    onMouseDown={(e) => handleInteractionStart(e, handle)}
                    className="absolute z-10"
                    style={{
                        top: handle.includes('t') ? '-4px' : handle.includes('b') ? undefined : '0px',
                        bottom: handle.includes('b') ? '-4px' : undefined,
                        left: handle.includes('l') ? '-4px' : handle.includes('r') ? undefined : '0px',
                        right: handle.includes('r') ? '-4px' : undefined,
                        width: handle.includes('l') || handle.includes('r') ? '8px' : 'auto',
                        height: handle.includes('t') || handle.includes('b') ? '8px' : 'auto',
                        cursor: handleCursors[handle],
                    }}
                />
            ))}
        </div>
        {isColorPickerOpen && (
            <ColorPicker
                triggerRef={colorPickerButtonRef}
                color={brushColor}
                onChange={setBrushColor}
                onClose={() => setIsColorPickerOpen(false)}
                onActivateEyedropper={() => {
                    setActiveTool('eyedropper');
                    setIsColorPickerOpen(false);
                }}
                labelPrefix="editor-brush"
            />
        )}
    </div>
  );
};

export default ImageEditorModal;
