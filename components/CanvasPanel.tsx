import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { TextBox, Stroke, PathPoint, Tool, BrushShape } from '../types';
import { drawStrokesOnCanvas, drawWrappedTextOnCanvas } from '../services/canvasUtils';
import InlineTextEditor from './InlineTextEditor';


const HANDLE_SIZE = 8;
const CLICK_DRAG_THRESHOLD = 5; // pixels in distance to differentiate a click from a drag

type InteractionType = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'rotate' | 'paint';

interface Handle {
  x: number;
  y: number;
  cursor: string;
}

interface InteractionState {
  type: InteractionType | null;
  boxId: number | null;
  startMouseX: number;
  startMouseY: number;
  currentMouseX?: number;
  currentMouseY?: number;
  startBox: TextBox | null;
  resizeOffset?: { x: number; y: number };
  isShiftDrawing?: boolean;
}

const initialInteractionState: InteractionState = {
  type: null,
  boxId: null,
  startMouseX: 0,
  startMouseY: 0,
  startBox: null,
  resizeOffset: { x: 0, y: 0 },
  isShiftDrawing: false,
};

interface CanvasPanelProps {
  imageUrl: string | null;
  textBoxes: TextBox[];
  strokes: Stroke[];
  selectedBoxIds: number[];
  editingBoxId: number | null;
  onBoxClick: (boxId: number, isMultiSelect: boolean) => void;
  onBoxDoubleClick: (boxId: number) => void;
  onFinishEditing: () => void;
  onPlainTextChange: (text: string, boxId: number) => void;
  onBackgroundClick: () => void;
  onTextBoxesUpdate: (boxes: TextBox[]) => void;
  onStrokesUpdate: (strokes: Stroke[]) => void;
  onManualSelection: (selectionData: { x: number; y: number; width: number; height: number; }, addToSelection: boolean, subtractFromSelection: boolean) => void;
  isEyedropperActive: boolean;
  onColorPick: (color: string) => void;
  activeTool: Tool;
  brushColor: string;
  paintBrushSize: number;
  selectionEraserSize: number;
  onSelectionErase: (points: {x: number, y: number}[], size: number, hardness: number) => void;
  brushShape: BrushShape;
  brushHardness: number;
  brushOpacity: number;
  onMagicWandSelect: (point: { x: number, y: number }, addToSelection: boolean, subtractFromSelection: boolean) => void;
  selectionMaskUrl: string | null;
  onToggleNotesModal: () => void;
}

const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rotatePoint = ({ x, y }: { x: number, y: number }, angleRad: number) => ({
  x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
  y: x * Math.sin(angleRad) + y * Math.cos(angleRad),
});

const NotesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M13 20l7 -7" />
      <path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7" />
    </svg>
);


const CanvasPanel: React.FC<CanvasPanelProps> = ({
  imageUrl,
  textBoxes,
  strokes,
  selectedBoxIds,
  editingBoxId,
  onBoxClick,
  onBoxDoubleClick,
  onFinishEditing,
  onPlainTextChange,
  onBackgroundClick,
  onTextBoxesUpdate,
  onStrokesUpdate,
  onManualSelection,
  isEyedropperActive,
  onColorPick,
  activeTool,
  brushColor,
  paintBrushSize,
  selectionEraserSize,
  onSelectionErase,
  brushShape,
  brushHardness,
  brushOpacity,
  onMagicWandSelect,
  selectionMaskUrl,
  onToggleNotesModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const [interaction, setInteraction] = useState<InteractionState>(initialInteractionState);
  const interactionRef = useRef<InteractionState>(initialInteractionState);
  useEffect(() => {
    interactionRef.current = interaction;
  }, [interaction]);
  
  // Refs for fluid drawing
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Off-screen buffer for live drawing
  const currentStrokeData = useRef<Omit<Stroke, 'id' | 'points'> | null>(null);
  const strokePoints = useRef<{x: number; y: number}[]>([]); // Normalized points for the current stroke
  const lastDrawnWorldPoint = useRef<{x: number; y: number} | null>(null);
  const imageElementCache = useRef(new Map<string, HTMLImageElement>());
  const [imageLoadCounter, setImageLoadCounter] = useState(0);

  // State for creating a new OCR box
  const [newOcrBox, setNewOcrBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const creationStartPoint = useRef<{x: number, y: number} | null>(null);


  const [brushPreviewStyle, setBrushPreviewStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [localBoxes, setLocalBoxes] = useState<TextBox[]>([]);
  const imageDimensionsRef = useRef<{ width: number, height: number } | null>(null);
  const strokeCacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const [selectionMaskImage, setSelectionMaskImage] = useState<HTMLImageElement | null>(null);
  const [backgroundConfig, setBackgroundConfig] = useState<{ path: string; opacity: number } | null>(null);
  const [backgroundLogo, setBackgroundLogo] = useState<HTMLImageElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const straightLineOrigin = useRef<{x: number; y: number} | null>(null);

useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventBrowserZoom = (e: WheelEvent) => {
      // Preveniamo lo zoom del browser solo quando il tasto Ctrl è premuto,
      // che è ciò che il sistema simula durante il pinch-to-zoom.
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Aggiungiamo l'event listener nativo. { passive: false } è fondamentale
    // per comunicare al browser che potremmo annullare l'evento.
    canvas.addEventListener('wheel', preventBrowserZoom, { passive: false });

    // Rimuoviamo l'listener quando il componente viene smontato.
    return () => {
      canvas.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []); // L'array vuoto assicura che questo effetto venga eseguito solo una volta.
  
  useEffect(() => {
    if (selectionMaskUrl) {
      const img = new Image();
      img.src = selectionMaskUrl;
      img.onload = () => setSelectionMaskImage(img);
    } else {
      setSelectionMaskImage(null);
    }
  }, [selectionMaskUrl]);

  useEffect(() => {
    const fetchConfigAndLoadLogo = async () => {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                console.error(`config.json not found or failed to load: ${response.statusText}`);
                return;
            }
            const config = await response.json();

            if (config.backgroundLogoPath && typeof config.backgroundOpacity === 'number') {
                setBackgroundConfig({ path: config.backgroundLogoPath, opacity: config.backgroundOpacity });
                
                const img = new Image();
                img.src = config.backgroundLogoPath;  // ✅ Usa direttamente il percorso da config.json
                img.onload = () => {
                    setBackgroundLogo(img);
                };
                img.onerror = () => {
                    console.error(`Failed to load background logo from path: ${img.src}`);
                };
            } else {
                console.warn('config.json is missing backgroundLogoPath or backgroundOpacity properties.');
            }
        } catch (error) {
            console.error('Could not load or parse /config.json:', error);
        }
    };
    fetchConfigAndLoadLogo();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!backgroundLogo || !backgroundConfig || !canvas || !canvas.width || !canvas.height) {
        return;
    }
    
    if (!backgroundCanvasRef.current) {
        backgroundCanvasRef.current = document.createElement('canvas');
    }
    const bgCanvas = backgroundCanvasRef.current;
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    const canvasAspect = bgCanvas.width / bgCanvas.height;
    const logoAspect = backgroundLogo.width / backgroundLogo.height;
    let drawWidth, drawHeight, dx, dy;

    if (canvasAspect > logoAspect) {
        // Canvas is wider than logo, so fit to height
        drawHeight = bgCanvas.height;
        drawWidth = drawHeight * logoAspect;
        dx = (bgCanvas.width - drawWidth) / 2;
        dy = 0;
    } else {
        // Canvas is taller or same aspect as logo, so fit to width
        drawWidth = bgCanvas.width;
        drawHeight = drawWidth / logoAspect;
        dx = 0;
        dy = (bgCanvas.height - drawHeight) / 2;
    }
    
    ctx.globalAlpha = backgroundConfig.opacity;
    ctx.drawImage(backgroundLogo, dx, dy, drawWidth, drawHeight);
    ctx.globalAlpha = 1.0;

}, [backgroundLogo, backgroundConfig, canvasRef.current?.width, canvasRef.current?.height]);


  useEffect(() => {
    setLocalBoxes(textBoxes);
  }, [textBoxes]);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const isSameDimensions = imageDimensionsRef.current && img.width === imageDimensionsRef.current.width && img.height === imageDimensionsRef.current.height;
        
        setImage(img);
        imageDimensionsRef.current = { width: img.width, height: img.height };
        
        // Setup off-screen drawing canvas
        if (!drawingCanvasRef.current || drawingCanvasRef.current.width !== img.width || drawingCanvasRef.current.height !== img.height) {
            drawingCanvasRef.current = document.createElement('canvas');
            drawingCanvasRef.current.width = img.width;
            drawingCanvasRef.current.height = img.height;
        }

        if (!isSameDimensions) {
            const container = containerRef.current;
            if (container) {
                const { clientWidth, clientHeight } = container;
                const scale = Math.min(clientWidth / img.width, clientHeight / img.height);
                const initialZoom = scale * 0.95; 
                setZoom(initialZoom);
                
                const x = (clientWidth - img.width * initialZoom) / 2;
                const y = (clientHeight - img.height * initialZoom) / 2;
                setPanOffset({ x, y });
            }
        }
      }
    } else {
      setImage(null);
      imageDimensionsRef.current = null;
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [imageUrl]);

  const screenToWorldCoords = useCallback((screenX: number, screenY: number) => {
    if (!image) return { x: 0, y: 0 };
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
    };
  }, [panOffset, zoom, image]);
  
  const worldToScreenCoords = useCallback((worldX: number, worldY: number) => {
      return {
          x: worldX * zoom + panOffset.x,
          y: worldY * zoom + panOffset.y,
      };
  }, [panOffset, zoom]);
  
  const worldToNormalizedCoords = useCallback((worldPos: {x: number, y: number}) => {
      if (!image) return { x: 0, y: 0 };
      return { x: worldPos.x / image.width, y: worldPos.y / image.height };
  }, [image]);

  const normalizedToScreenCoords = useCallback((normPos: {x: number, y: number}) => {
      if (!image) return { x: 0, y: 0 };
      const worldX = normPos.x * image.width;
      const worldY = normPos.y * image.height;
      return worldToScreenCoords(worldX, worldY);
  }, [image, worldToScreenCoords]);

  const getBoxPixelCoords = useCallback((box: TextBox) => {
    if (!image) return { boxX: 0, boxY: 0, boxWidth: 0, boxHeight: 0 };
    
    const boxScreenWidth = box.width * image.width * zoom;
    const boxScreenHeight = box.height * image.height * zoom;
    const boxScreenX = box.x * image.width * zoom + panOffset.x;
    const boxScreenY = box.y * image.height * zoom + panOffset.y;

    return { boxX: boxScreenX, boxY: boxScreenY, boxWidth: boxScreenWidth, boxHeight: boxScreenHeight };
  }, [image, zoom, panOffset]);

  const getHandles = useCallback((box: TextBox) => {
    if (box.path) { // Disable resize/rotate for path-based shapes
        return {};
    }
    const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(box);
    const halfHandle = HANDLE_SIZE / 2;
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;
    const angleRad = box.rotation * Math.PI / 180;

    const localHandles = {
        'resize-tl': { x: -boxWidth / 2, y: -boxHeight / 2, cursor: 'nwse-resize' },
        'resize-tr': { x: boxWidth / 2, y: -boxHeight / 2, cursor: 'nesw-resize' },
        'resize-bl': { x: -boxWidth / 2, y: boxHeight / 2, cursor: 'nesw-resize' },
        'resize-br': { x: boxWidth / 2, y: boxHeight / 2, cursor: 'nwse-resize' },
        'rotate': { x: 0, y: -boxHeight / 2 - 20, cursor: 'grab' },
    };

    const worldHandles: { [key: string]: Handle } = {};
    for (const [key, val] of Object.entries(localHandles)) {
      const rotated = rotatePoint(val, angleRad);
      worldHandles[key] = {
        x: rotated.x + centerX - halfHandle,
        y: rotated.y + centerY - halfHandle,
        cursor: val.cursor
      };
    }
    return worldHandles;
  }, [getBoxPixelCoords]);


  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { clientWidth: containerWidth, clientHeight: containerHeight } = container;
    if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
        canvas.width = containerWidth;
        canvas.height = containerHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 0. Draw static background logo canvas
    if (backgroundCanvasRef.current) {
        ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

    if (!image) return;

    // 1. Draw image
    ctx.drawImage(image, panOffset.x, panOffset.y, image.width * zoom, image.height * zoom);
    
    // 1.5. Draw selection mask
    if (selectionMaskImage) {
      ctx.drawImage(selectionMaskImage, panOffset.x, panOffset.y, image.width * zoom, image.height * zoom);
    }
    
    // 2. Draw committed strokes from cache
    if (strokeCacheCanvasRef.current) {
        ctx.drawImage(strokeCacheCanvasRef.current, panOffset.x, panOffset.y, image.width * zoom, image.height * zoom);
    }

    // 3. Draw the current, in-progress stroke from its buffer
    if (drawingCanvasRef.current) {
        ctx.drawImage(drawingCanvasRef.current, panOffset.x, panOffset.y, image.width * zoom, image.height * zoom);
    }

    // 4. Draw the temporary OCR box being created
    if (newOcrBox && image) {
        const screenX = newOcrBox.x * image.width * zoom + panOffset.x;
        const screenY = newOcrBox.y * image.height * zoom + panOffset.y;
        const screenWidth = newOcrBox.width * image.width * zoom;
        const screenHeight = newOcrBox.height * image.height * zoom;

        ctx.save();
        ctx.strokeStyle = '#f59e0b'; // Amber color for OCR
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        ctx.restore();
    }

    // 5. Draw boxes
    const primarySelectedId = selectedBoxIds.length > 0 ? selectedBoxIds[selectedBoxIds.length - 1] : null;

    localBoxes.forEach(box => {
      // Hide the box if it's being edited inline
      if (box.id === editingBoxId) return;

      const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(box);
      const centerX = boxX + boxWidth / 2;
      const centerY = boxY + boxHeight / 2;
      
      const isPrimary = box.id === primarySelectedId;
      const isSelected = selectedBoxIds.includes(box.id);

      // Draw the main shape (path or rectangle)
      if (box.path && box.type === 'ocr') {
        const color = isPrimary ? '#f59e0b' : (isSelected ? '#38bdf8' : '#a16207');
        const fillColor = isSelected ? (isPrimary ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)') : 'transparent';
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = isPrimary ? 3 : 2;
        ctx.fillStyle = fillColor;

        ctx.beginPath();
        const firstPoint = normalizedToScreenCoords(box.path[0].anchor);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 0; i < box.path.length - 1; i++) {
            const p1 = box.path[i];
            const p2 = box.path[i + 1];
            const cp1 = normalizedToScreenCoords(p1.handle2);
            const cp2 = normalizedToScreenCoords(p2.handle1);
            const end = normalizedToScreenCoords(p2.anchor);
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        }
        const lastPoint = box.path[box.path.length - 1];
        if (box.path.length > 2 && lastPoint.anchor.x === box.path[0].anchor.x && lastPoint.anchor.y === box.path[0].anchor.y) {
            ctx.closePath();
        }
        ctx.stroke();
        if (isSelected) ctx.fill();
        ctx.restore();

      } else {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(box.rotation * Math.PI / 180);
        
        if(box.type === 'image' && box.imageDataUrl) {
            let imgElement = imageElementCache.current.get(box.imageDataUrl);
            if (!imgElement) {
                imgElement = new Image();
                imgElement.src = box.imageDataUrl;
                imgElement.onload = () => setImageLoadCounter(c => c + 1);
                imageElementCache.current.set(box.imageDataUrl, imgElement);
            }

            if (imgElement.complete && imgElement.naturalWidth > 0) {
                ctx.drawImage(imgElement, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            }
        }
        
        if (isPrimary) {
          const color = box.type === 'ocr' ? '#f59e0b' : (box.type === 'image' ? '#8b5cf6' : '#4ade80');
          const fillColor = box.type === 'ocr' ? 'rgba(245, 158, 11, 0.2)' : (box.type === 'image' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(74, 222, 128, 0.2)');
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.fillStyle = fillColor;
          if (box.type === 'ocr') ctx.setLineDash([6, 4]);
          ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          ctx.setLineDash([]);
        } else if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        } else if (box.type === 'ocr') {
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    });

    // 6. Draw text
    localBoxes.forEach(box => {
      if (box.id === editingBoxId) return;

      if (box.type === 'text') {
        const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(box);
        // Pass zoom to the rendering function so it can handle scaling internally.
        // This ensures font sizes defined in style spans are also scaled correctly.
        drawWrappedTextOnCanvas(ctx, box, boxX, boxY, boxWidth, boxHeight, zoom);
      }
    });

    // 7. Draw handles for primary selected box (on top of everything)
    const primarySelectedBox = localBoxes.find(b => b.id === primarySelectedId);
    if (primarySelectedBox && primarySelectedBox.id !== editingBoxId) {
        const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(primarySelectedBox);
        const centerX = boxX + boxWidth / 2;
        const centerY = boxY + boxHeight / 2;
        const handles = getHandles(primarySelectedBox);
        
        const color = primarySelectedBox.type === 'ocr' ? '#f59e0b' : (primarySelectedBox.type === 'image' ? '#8b5cf6' : '#4ade80');
        ctx.fillStyle = color;

        // Draw resize handles
        (Object.values(handles) as Handle[]).forEach(handle => {
            if (handle.cursor !== 'grab') { // Don't draw a square for the rotate handle
                ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
            }
        });

        // Draw line to rotation handle and the handle itself
        const rotationHandle = handles['rotate'];
        if (rotationHandle) {
            const topMiddleLocal = { x: 0, y: -boxHeight / 2 };
            const angleRad = primarySelectedBox.rotation * Math.PI / 180;
            const rotatedTopMiddle = rotatePoint(topMiddleLocal, angleRad);
            const screenTopMiddle = { x: rotatedTopMiddle.x + centerX, y: rotatedTopMiddle.y + centerY };
            
            ctx.beginPath();
            ctx.moveTo(screenTopMiddle.x, screenTopMiddle.y);
            ctx.lineTo(rotationHandle.x + HANDLE_SIZE / 2, rotationHandle.y + HANDLE_SIZE / 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(rotationHandle.x + HANDLE_SIZE / 2, rotationHandle.y + HANDLE_SIZE / 2, HANDLE_SIZE, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // 8. Draw straight line preview directly on the main canvas for responsiveness
    const currentInteraction = interactionRef.current;
    if (
        image &&
        currentInteraction.type === 'paint' &&
        currentInteraction.isShiftDrawing &&
        straightLineOrigin.current
    ) {
        ctx.save();
        const startPoint = normalizedToScreenCoords(straightLineOrigin.current);
        const endPoint = lastMousePos.current;

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);

        // A crisp, dashed line is a better preview than a fully rendered stroke
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.restore();
    }
    
  }, [image, localBoxes, strokes, selectedBoxIds, editingBoxId, getBoxPixelCoords, getHandles, panOffset, zoom, activeTool, paintBrushSize, brushHardness, brushColor, normalizedToScreenCoords, isEyedropperActive, newOcrBox, selectionMaskImage, imageLoadCounter]);

    // Effect for updating the stroke cache
    useEffect(() => {
        if (!image) return;

        if (!strokeCacheCanvasRef.current || strokeCacheCanvasRef.current.width !== image.width || strokeCacheCanvasRef.current.height !== image.height) {
            strokeCacheCanvasRef.current = document.createElement('canvas');
            strokeCacheCanvasRef.current.width = image.width;
            strokeCacheCanvasRef.current.height = image.height;
        }
        
        const cacheCtx = strokeCacheCanvasRef.current.getContext('2d');
        if (!cacheCtx) return;

        cacheCtx.clearRect(0, 0, image.width, image.height);

        const normToWorld = (pos: { x: number; y: number }) => ({ x: pos.x * image.width, y: pos.y * image.height });
        drawStrokesOnCanvas(cacheCtx, strokes, normToWorld);
        
    }, [strokes, image]);


    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            draw();
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [draw]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const isPointInBox = (point: {x: number, y: number}, box: TextBox) => {
    const canvas = canvasRef.current;
    if (box.path && box.type === 'ocr' && canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        ctx.beginPath();
        const firstPoint = normalizedToScreenCoords(box.path[0].anchor);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 0; i < box.path.length - 1; i++) {
            const p1 = box.path[i];
            const p2 = box.path[i + 1];
            const cp1 = normalizedToScreenCoords(p1.handle2);
            const cp2 = normalizedToScreenCoords(p2.handle1);
            const end = normalizedToScreenCoords(p2.anchor);
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        }
        
        const lastPoint = box.path[box.path.length - 1];
        if (box.path.length > 2 && lastPoint.anchor.x === box.path[0].anchor.x && lastPoint.anchor.y === box.path[0].anchor.y) {
            ctx.closePath();
        }

        return ctx.isPointInPath(point.x, point.y);
    }
    
    const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(box);
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;
    const translatedPoint = { x: point.x - centerX, y: point.y - centerY };
    const rotatedPoint = rotatePoint(translatedPoint, -box.rotation * Math.PI / 180);
    return (
      Math.abs(rotatedPoint.x) <= boxWidth / 2 &&
      Math.abs(rotatedPoint.y) <= boxHeight / 2
    );
  };
  
  const handleZoomTo100 = useCallback(() => {
    if (!image || !containerRef.current) return;
    
    const container = containerRef.current;
    const { clientWidth, clientHeight } = container;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;

    const centerWorld = screenToWorldCoords(centerX, centerY);
    
    const newZoom = 1;
    
    const newPanX = centerX - centerWorld.x * newZoom;
    const newPanY = centerY - centerWorld.y * newZoom;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [image, screenToWorldCoords]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!image) return;

      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      
      // --- INIZIO DELLA MODIFICA ---
      // Aggiungiamo un controllo prioritario per il pan forzato.
      // e.metaKey è per il tasto Command su Mac.
      // e.altKey è per il tasto Alt / Alt Gr su Windows/Linux.
      if (e.metaKey || e.altKey) {
          const PAN_SPEED_FACTOR = 0.5;
          setPanOffset(prev => ({
              x: prev.x - e.deltaX * PAN_SPEED_FACTOR,
              y: prev.y - e.deltaY * PAN_SPEED_FACTOR,
          }));
          // Usciamo dalla funzione per non eseguire la logica di zoom sottostante.
          return; 
      }
      // --- FINE DELLA MODIFICA ---

      // Logica per distinguere tra zoom e pan.
      // - Il pinch-to-zoom (pizzico) imposta e.ctrlKey a true.
      // - La rotellina del mouse di solito ha e.deltaX uguale a 0.
      // - Lo scorrimento a due dita sul trackpad ha valori sia per e.deltaX che per e.deltaY.
      const isZoomGesture = e.ctrlKey || e.deltaX === 0;

      if (isZoomGesture) {
          // Comportamento ZOOM (rotellina, pinch-to-zoom, o Ctrl + Rotellina)
          const zoomFactor = 1.1;
          const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
          const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
          
          if (clampedZoom === zoom) return;

          const mouseWorldBeforeZoom = screenToWorldCoords(mouseX, mouseY);
          
          const newPanX = mouseX - mouseWorldBeforeZoom.x * clampedZoom;
          const newPanY = mouseY - mouseWorldBeforeZoom.y * clampedZoom;

          setZoom(clampedZoom);
          setPanOffset({ x: newPanX, y: newPanY });

      } else {
          // Comportamento PAN (scorrimento a due dita sul trackpad)
          const PAN_SPEED_FACTOR = 0.5; // Puoi regolare questo valore (es. 0.3 per uno scorrimento più lento)
          setPanOffset(prev => ({
              x: prev.x - e.deltaX * PAN_SPEED_FACTOR,
              y: prev.y - e.deltaY * PAN_SPEED_FACTOR,
          }));
      }
  }, [image, getCanvasCoords, screenToWorldCoords, zoom, panOffset]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editingBoxId) return; // Already editing a box
    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    // Iterate in reverse to select the top-most box
    for (let i = localBoxes.length - 1; i >= 0; i--) {
        const box = localBoxes[i];
        if (box.type === 'text' && isPointInBox({ x: mouseX, y: mouseY }, box)) {
            onBoxDoubleClick(box.id);
            return; // Stop after finding the first one
        }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Prioritize panning when Ctrl key is held, regardless of active tool or what's under the cursor.
    if (e.ctrlKey || e.metaKey) { // MODIFICA: Aggiunto e.metaKey per il tasto Command su Mac
        isPanning.current = true;
        setInteraction(initialInteractionState);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
        }
        return; // This prevents any tool-specific or selection logic from running
    }
      
    if (isEyedropperActive) {
        const canvas = canvasRef.current;
        if (!canvas) {
            onColorPick('#000000'); // Default color if canvas not ready
            return;
        }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
         if (!ctx) {
            console.error("Could not get canvas context for eyedropper.");
            onColorPick('#000000');
            return;
        }

        const { x: screenX, y: screenY } = getCanvasCoords(e);
        const pixelData = ctx.getImageData(screenX, screenY, 1, 1).data;
        const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
        
        onColorPick(hexColor);
        return;
    }

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);

    if (activeTool === 'magic-wand') {
        const worldPos = screenToWorldCoords(mouseX, mouseY);
        onMagicWandSelect(worldPos, e.shiftKey, e.altKey);
        return;
    }
    
    if (activeTool === 'manual-selection') {
        const worldPos = screenToWorldCoords(mouseX, mouseY);
        const normPos = worldToNormalizedCoords(worldPos);

        creationStartPoint.current = normPos;
        setNewOcrBox({ x: normPos.x, y: normPos.y, width: 0, height: 0 });
        setInteraction(initialInteractionState); // Prevent other interactions
        return;
    }
    
    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'selection-eraser') {
        if (activeTool === 'selection-eraser' && !selectionMaskUrl) return;

        const isShift = e.shiftKey;
        setInteraction({ type: 'paint', boxId: null, startMouseX: mouseX, startMouseY: mouseY, startBox: null, isShiftDrawing: isShift });
        
        const worldPos = screenToWorldCoords(mouseX, mouseY);
        const normPos = worldToNormalizedCoords(worldPos);

        currentStrokeData.current = {
            type: activeTool === 'brush' ? 'brush' : 'eraser',
            color: activeTool === 'brush' ? brushColor : '#000000',
            size: activeTool === 'selection-eraser' ? selectionEraserSize : paintBrushSize,
            shape: brushShape,
            hardness: activeTool === 'selection-eraser' ? 1.0 : brushHardness,
            opacity: activeTool === 'brush' ? brushOpacity : 1.0,
        };
        
        if (isShift) {
            if (!straightLineOrigin.current) {
                straightLineOrigin.current = normPos;
            }
            strokePoints.current = [straightLineOrigin.current];
        } else {
            straightLineOrigin.current = null;
            strokePoints.current = [normPos];
        }
        
        lastDrawnWorldPoint.current = worldPos;

        const drawingCtx = drawingCanvasRef.current?.getContext('2d');
        if (drawingCtx && image) {
            drawingCtx.clearRect(0, 0, image.width, image.height);
            // Only draw initial point for freehand. Straight line preview is handled by `draw()`.
            if (!isShift) {
                const normToWorld = (p: {x:number, y:number}) => ({ x: p.x * image.width, y: p.y * image.height });
                drawStrokesOnCanvas(drawingCtx, [{ ...currentStrokeData.current, id: 0, points: strokePoints.current }], normToWorld);
            }
        }
        return;
    }
    
    const primarySelectedId = selectedBoxIds.length > 0 ? selectedBoxIds[selectedBoxIds.length - 1] : null;
    const primarySelectedBox = localBoxes.find(b => b.id === primarySelectedId);

    if (primarySelectedBox && primarySelectedBox.id !== editingBoxId) {
      const handles = getHandles(primarySelectedBox);
      for (const [type, handle] of Object.entries(handles) as [string, Handle][]) {
        if (mouseX >= handle.x && mouseX <= handle.x + HANDLE_SIZE && mouseY >= handle.y && mouseY <= handle.y + HANDLE_SIZE) {
          
          const interactionType = type as InteractionType;
          let resizeOffset = { x: 0, y: 0 };

          if (interactionType.startsWith('resize-')) {
            const cornerKey = interactionType.split('-')[1] as 'tl' | 'tr' | 'bl' | 'br';
            const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(primarySelectedBox);
            const centerX = boxX + boxWidth / 2;
            const centerY = boxY + boxHeight / 2;
            const angleRad = primarySelectedBox.rotation * Math.PI / 180;

            const localCorner = {
                x: (cornerKey.includes('l') ? -1 : 1) * boxWidth / 2,
                y: (cornerKey.includes('t') ? -1 : 1) * boxHeight / 2,
            };
            const rotatedCorner = rotatePoint(localCorner, angleRad);
            const cornerPos = { x: rotatedCorner.x + centerX, y: rotatedCorner.y + centerY };
            resizeOffset = { x: mouseX - cornerPos.x, y: mouseY - cornerPos.y };
          }

          setInteraction({ type: interactionType, boxId: primarySelectedId, startMouseX: mouseX, startMouseY: mouseY, startBox: { ...primarySelectedBox }, resizeOffset });
          return;
        }
      }
    }
    
    for (let i = localBoxes.length - 1; i >= 0; i--) {
      const box = localBoxes[i];
      if (isPointInBox({ x: mouseX, y: mouseY }, box)) {
        setInteraction({ type: 'move', boxId: box.id, startMouseX: mouseX, startMouseY: mouseY, startBox: { ...box } });
        return;
      }
    }

    // If nothing else, it's a background click/drag
    setInteraction({ type: null, boxId: null, startMouseX: mouseX, startMouseY: mouseY, startBox: null });
  };
  
    // Handles updating the brush preview's style.
    const updateBrushPreview = useCallback((mouseX: number, mouseY: number) => {
        if ((activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'selection-eraser') && !isEyedropperActive) {
            const isSelectionTool = activeTool === 'selection-eraser';
            const size = isSelectionTool ? selectionEraserSize : paintBrushSize;
            const radius = (size / 2) * zoom;
            const hardness = isSelectionTool ? 1.0 : brushHardness;

            let r = 0, g = 0, b = 0;
            const color = activeTool === 'brush' ? brushColor : 'rgba(255, 255, 255, 0.8)';

            if (color.startsWith('#')) {
                const int = parseInt(color.substring(1), 16);
                r = (int >> 16) & 255; g = (int >> 8) & 255; b = int & 255;
            } else if (color.startsWith('rgb')) {
                const parts = color.match(/(\d+(\.\d+)?)/g);
                if (parts) { [r, g, b] = parts.map(Number); }
            }
            const solidColor = `rgb(${r}, ${g}, ${b})`;
            const transparentColor = `rgba(${r}, ${g}, ${b}, 0)`;
            
            setBrushPreviewStyle({
                display: 'block',
                position: 'absolute',
                left: `${mouseX - radius}px`,
                top: `${mouseY - radius}px`,
                width: `${radius * 2}px`,
                height: `${radius * 2}px`,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${solidColor} ${hardness * 100}%, ${transparentColor} 100%)`,
                border: isSelectionTool ? '1px solid #a78bfa' : '1px solid red',
                pointerEvents: 'none',
                zIndex: 20,
            });
        } else {
            setBrushPreviewStyle({ display: 'none' });
        }
    }, [paintBrushSize, selectionEraserSize, brushHardness, brushColor, activeTool, zoom, isEyedropperActive]);

    // This effect runs when tool props (like size, hardness, zoom) change,
    // to update the preview at its last known position.
    useEffect(() => {
        updateBrushPreview(lastMousePos.current.x, lastMousePos.current.y);
    }, [paintBrushSize, selectionEraserSize, brushHardness, brushColor, activeTool, zoom, isEyedropperActive, updateBrushPreview]);


  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    lastMousePos.current = { x: mouseX, y: mouseY }; // Keep track of the last mouse position
    updateBrushPreview(mouseX, mouseY); // Update preview on every move

    if (creationStartPoint.current) {
        const worldPos = screenToWorldCoords(mouseX, mouseY);
        const normPos = worldToNormalizedCoords(worldPos);

        const start = creationStartPoint.current;
        const x = Math.min(start.x, normPos.x);
        const y = Math.min(start.y, normPos.y);
        const width = Math.abs(start.x - normPos.x);
        const height = Math.abs(start.y - normPos.y);
        
        setNewOcrBox({ x, y, width, height });
        return;
    }

    if (isEyedropperActive) {
        canvas.style.cursor = 'crosshair';
        return;
    }
    if (isPanning.current) {
        setPanOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        return;
    }
    
    if (interaction.type === 'paint') {
        if (currentStrokeData.current) {
            const worldPos = screenToWorldCoords(mouseX, mouseY);
            const normPos = worldToNormalizedCoords(worldPos);
            const drawingCtx = drawingCanvasRef.current?.getContext('2d');

            if (interaction.isShiftDrawing && straightLineOrigin.current) {
                // For straight lines, we only update the endpoint.
                // The responsive preview is now handled by the main `draw` loop.
                strokePoints.current = [straightLineOrigin.current, normPos];
                
                // Clear the dedicated drawing canvas to prevent stale previews.
                if (drawingCtx) {
                    drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);
                }
            } else {
                // For freehand drawing, continue adding points and drawing the full preview.
                const dist = Math.hypot(worldPos.x - (lastDrawnWorldPoint.current?.x || 0), worldPos.y - (lastDrawnWorldPoint.current?.y || 0));
                if (dist < 2) return;
                strokePoints.current.push(normPos);
                lastDrawnWorldPoint.current = worldPos;
                
                if (drawingCtx) {
                    const strokeToDrawForPreview = { ...currentStrokeData.current, points: strokePoints.current };
                    
                    if (strokeToDrawForPreview.type === 'eraser') {
                        strokeToDrawForPreview.type = 'brush';
                        strokeToDrawForPreview.color = activeTool === 'selection-eraser' ? 'rgba(167, 139, 250, 0.6)' : 'rgba(255, 255, 255, 0.5)';
                        strokeToDrawForPreview.hardness = 1;
                    }

                    const strokeToDraw: Stroke = { id: 0, ...strokeToDrawForPreview };
                    drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);
                    drawStrokesOnCanvas(drawingCtx, [strokeToDraw], (p) => ({ x: p.x * image.width, y: p.y * image.height }));
                }
            }
        }
        return;
    }

    if (!interaction.type) {
      canvas.style.cursor = e.ctrlKey ? 'grab' : (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'selection-eraser') ? 'none' : (activeTool === 'manual-selection' ? 'crosshair' : (activeTool === 'magic-wand' ? 'crosshair' : 'default'));
      
      const primarySelectedId = selectedBoxIds.length > 0 ? selectedBoxIds[selectedBoxIds.length - 1] : null;
      const primarySelectedBox = localBoxes.find(b => b.id === primarySelectedId);
      if (primarySelectedBox && primarySelectedBox.id !== editingBoxId) {
        const handles = getHandles(primarySelectedBox);
        for (const [type, handle] of Object.entries(handles) as [string, Handle][]) {
          if (mouseX >= handle.x && mouseX <= handle.x + HANDLE_SIZE && mouseY >= handle.y && mouseY <= handle.y + HANDLE_SIZE) {
            canvas.style.cursor = handle.cursor;
            return;
          }
        }
      }
      for (const box of localBoxes) {
        if (isPointInBox({ x: mouseX, y: mouseY }, box)) {
          canvas.style.cursor = 'move';
          return;
        }
      }
      return;
    }
        
    if (!interaction.startBox) return;
    
    const { startBox } = interaction;
    let newBox = { ...localBoxes.find(b => b.id === startBox.id)! };

    const dx = (mouseX - interaction.startMouseX);
    const dy = (mouseY - interaction.startMouseY);

    switch (interaction.type) {
      case 'move': {
          const normDx = dx / (image.width * zoom);
          const normDy = dy / (image.height * zoom);

          setLocalBoxes(prevBoxes => prevBoxes.map(b => {
              if (selectedBoxIds.includes(b.id)) {
                  const originalBox = textBoxes.find(tb => tb.id === b.id);
                  if (originalBox) {
                      const newB = { ...b };
                      newB.x = originalBox.x + normDx;
                      newB.y = originalBox.y + normDy;
                      
                      if (newB.path) {
                          newB.path = originalBox.path?.map(p => ({
                              anchor: { x: p.anchor.x + normDx, y: p.anchor.y + normDy },
                              handle1: { x: p.handle1.x + normDx, y: p.handle1.y + normDy },
                              handle2: { x: p.handle2.x + normDx, y: p.handle2.y + normDy },
                          }));
                      }

                      newB.x = Math.max(0, Math.min(newB.x, 1 - newB.width));
                      newB.y = Math.max(0, Math.min(newB.y, 1 - newB.height));
                      return newB;
                  }
              }
              return b;
          }));
          return;
      }
      case 'rotate': {
        const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(startBox);
        const centerX = boxX + boxWidth / 2;
        const centerY = boxY + boxHeight / 2;
        const startAngle = Math.atan2(interaction.startMouseY - centerY, interaction.startMouseX - centerX);
        const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
        const angleDiff = currentAngle - startAngle;
        newBox.rotation = startBox.rotation + angleDiff * 180 / Math.PI;
        break;
      }
      case 'resize-br': case 'resize-bl': case 'resize-tr': case 'resize-tl': {
        const { startBox, resizeOffset } = interaction;
        if (!startBox) break; 
        const angleRad = startBox.rotation * Math.PI / 180;
        const startBoxCoords = getBoxPixelCoords(startBox);
        const startCenterX = startBoxCoords.boxX + startBoxCoords.boxWidth / 2;
        const startCenterY = startBoxCoords.boxY + startBoxCoords.boxHeight / 2;
        const draggedCornerKey = interaction.type.split('-')[1] as 'tl' | 'tr' | 'bl' | 'br';
        const pivotCornerKey = ({ tl: 'br', tr: 'bl', bl: 'tr', br: 'tl' })[draggedCornerKey];

        const localPivot = {
            x: (pivotCornerKey.includes('l') ? -1 : 1) * startBoxCoords.boxWidth / 2,
            y: (pivotCornerKey.includes('t') ? -1 : 1) * startBoxCoords.boxHeight / 2,
        };
        const rotatedPivot = rotatePoint(localPivot, angleRad);
        const pivot = { x: rotatedPivot.x + startCenterX, y: rotatedPivot.y + startCenterY };

        const effectiveMouseX = mouseX - (resizeOffset?.x || 0);
        const effectiveMouseY = mouseY - (resizeOffset?.y || 0);
        const newDiagonalVec = { x: effectiveMouseX - pivot.x, y: effectiveMouseY - pivot.y };
        const localNewDiagonalVec = rotatePoint(newDiagonalVec, -angleRad);

        let newWidth, newHeight;
        
        if (startBox.type === 'image' && startBox.aspectRatio && startBox.aspectRatio > 0) {
            const ar = startBox.aspectRatio;
            const u = localNewDiagonalVec;
            
            // The aspect ratio vector must point into the same quadrant as the drag vector `u`.
            const signX = Math.sign(u.x) || 1;
            const signY = Math.sign(u.y) || 1;
            const d = { x: ar * signX, y: 1 * signY };

            // Project vector u (mouse drag) onto vector d (aspect ratio line)
            const dot_ud = u.x * d.x + u.y * d.y;
            const dot_dd = d.x * d.x + d.y * d.y;
            
            // This ensures we have a valid projection
            if (dot_dd > 0) {
                const scale = dot_ud / dot_dd;
                const projectedDiag = { x: d.x * scale, y: d.y * scale };
                
                // The new width/height are the components of the projected vector
                newWidth = Math.abs(projectedDiag.x);
                newHeight = Math.abs(projectedDiag.y);
            } else { // Fallback, should not happen if ar > 0
                newWidth = Math.abs(u.x);
                newHeight = Math.abs(u.y);
            }
        } else {
            // Original logic for non-image boxes or boxes without a valid aspect ratio
            newWidth = Math.abs(localNewDiagonalVec.x);
            newHeight = Math.abs(localNewDiagonalVec.y);
        }

        if (newWidth < 10) newWidth = 10;
        if (newHeight < 10) newHeight = 10;
        
        const finalDiagonalVec = {
            x: Math.sign(localNewDiagonalVec.x) * newWidth,
            y: Math.sign(localNewDiagonalVec.y) * newHeight
        };

        const rotatedFinalDiagonal = rotatePoint(finalDiagonalVec, angleRad);
        const newCenter = { x: pivot.x + rotatedFinalDiagonal.x / 2, y: pivot.y + rotatedFinalDiagonal.y / 2 };

        const worldCenter = screenToWorldCoords(newCenter.x, newCenter.y);
        const normWidth = newWidth / (image.width * zoom);
        const normHeight = newHeight / (image.height * zoom);

        newBox.width = normWidth;
        newBox.height = normHeight;
        newBox.x = (worldCenter.x / image.width) - (normWidth / 2);
        newBox.y = (worldCenter.y / image.height) - (normHeight / 2);
        newBox.rotation = startBox.rotation;
        break;
      }
    }
    
    if (newBox.width < 0.01) newBox.width = 0.01;
    if (newBox.height < 0.01) newBox.height = 0.01;
    newBox.x = Math.max(0, Math.min(newBox.x, 1 - newBox.width));
    newBox.y = Math.max(0, Math.min(newBox.y, 1 - newBox.height));

    setLocalBoxes(prevBoxes => prevBoxes.map(b => b.id === newBox.id ? newBox : b));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editingBoxId) return;
    if (isEyedropperActive) return;
    if (isPanning.current) {
        isPanning.current = false;
        if (canvasRef.current) {
            // Reset cursor. It will be updated correctly on the next mouse move.
            canvasRef.current.style.cursor = e.ctrlKey ? 'grab' : 'default';
        }
        return;
    }
    
    if (creationStartPoint.current && newOcrBox && image) {
        if (newOcrBox.width * image.width > 5 && newOcrBox.height * image.height > 5) {
            onManualSelection(newOcrBox, e.shiftKey, e.altKey);
        }
        setNewOcrBox(null);
        creationStartPoint.current = null;
        return;
    }

    if (interaction.type === 'paint') {
      if (currentStrokeData.current && strokePoints.current.length >= 1) {
        
        if (interaction.isShiftDrawing) {
            // Correctly get the final position on mouseUp
            const { x: endMouseX, y: endMouseY } = getCanvasCoords(e);
            const endWorldPos = screenToWorldCoords(endMouseX, endMouseY);
            const endNormPos = worldToNormalizedCoords(endWorldPos);
            
            if (straightLineOrigin.current) {
                strokePoints.current = [straightLineOrigin.current, endNormPos];
                // Update the origin for the next chained line
                straightLineOrigin.current = endNormPos;
            }
        } else {
            straightLineOrigin.current = null;
        }

        if (activeTool === 'selection-eraser') {
            onSelectionErase(strokePoints.current, currentStrokeData.current.size, currentStrokeData.current.hardness);
        } else {
            const finalStroke: Stroke = {
              id: Date.now(),
              ...currentStrokeData.current,
              points: strokePoints.current,
            };
            onStrokesUpdate([...strokes, finalStroke]);
        }
      }
      
      const drawingCtx = drawingCanvasRef.current?.getContext('2d');
      if (drawingCtx) {
          drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);
      }
      currentStrokeData.current = null;
      strokePoints.current = [];
      lastDrawnWorldPoint.current = null;
      setInteraction(initialInteractionState);
      return;
    }

    const { startMouseX, startMouseY, startBox, type } = interaction;
    const { x: endMouseX, y: endMouseY } = getCanvasCoords(e);
    
    const dist = Math.sqrt(Math.pow(endMouseX - startMouseX, 2) + Math.pow(endMouseY - startMouseY, 2));
    
    if (dist < CLICK_DRAG_THRESHOLD) { // It's a click
        if (type === 'move' && startBox) {
            onBoxClick(startBox.id, e.shiftKey);
        } else if (type === null) {
            onBackgroundClick();
        }
    } else { // It's a drag
        if ((type === 'move' || type?.startsWith('resize-') || type === 'rotate')) {
            onTextBoxesUpdate(localBoxes);
        }
    }
    
    setInteraction(initialInteractionState);
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setBrushPreviewStyle({ display: 'none' });
    if (creationStartPoint.current) {
        handleMouseUp(e);
    }
    if(interaction.type) {
        handleMouseUp(e);
    }
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
      e.preventDefault();
      handleZoomTo100();
    }
  }, [handleZoomTo100]);

  const editingBox = useMemo(() => textBoxes.find(b => b.id === editingBoxId), [textBoxes, editingBoxId]);

  const editorStyle = useMemo((): React.CSSProperties => {
    if (!editingBox || !image || !editingBox.fontFamily) return { display: 'none' };

    const { boxX, boxY, boxWidth, boxHeight } = getBoxPixelCoords(editingBox);

    return {
      position: 'absolute',
      left: `${boxX + boxWidth / 2}px`,
      top: `${boxY + boxHeight / 2}px`,
      width: `${boxWidth}px`,
      height: `${boxHeight}px`,
      transform: `translate(-50%, -50%) rotate(${editingBox.rotation}deg)`,
      fontFamily: editingBox.fontFamily,
      fontSize: `${(editingBox.fontSize || 0) * zoom}px`,
      color: editingBox.color,
      textAlign: editingBox.textAlign,
      lineHeight: editingBox.lineHeight,
      fontWeight: editingBox.fontWeight,
      fontStyle: editingBox.fontStyle,
      wordSpacing: `${(editingBox.wordSpacing || 0) * zoom}px`,
      background: 'rgba(28, 25, 23, 0.8)',
      border: '1px dashed #a78bfa',
      padding: `${((editingBox.fontSize || 0) * zoom) * 0.1}px`,
      margin: 0,
      resize: 'none',
      overflow: 'hidden',
      boxSizing: 'border-box',
      outline: 'none',
      whiteSpace: 'pre-wrap',
      colorScheme: 'dark',
      zIndex: 10,
    };
  }, [editingBox, image, getBoxPixelCoords, zoom]);


  return (
    <div ref={containerRef} className="relative h-full bg-gray-900 flex justify-center items-center p-4 overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={`${(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'selection-eraser') ? 'cursor-none' : ''} ${activeTool === 'manual-selection' ? 'cursor-crosshair' : ''} ${activeTool === 'magic-wand' ? 'cursor-crosshair' : ''} ${isEyedropperActive ? 'cursor-crosshair' : ''} outline-none`}
      />
      <button
        onClick={onToggleNotesModal}
        className="absolute top-4 left-4 bg-gray-800 bg-opacity-75 text-white p-2 rounded-full shadow-lg hover:bg-indigo-600 transition-colors z-10"
        title="Notes"
      >
        <NotesIcon />
      </button>
      <div style={brushPreviewStyle} />
      {editingBox && editingBox.type === 'text' && (
          <InlineTextEditor
            box={editingBox}
            style={editorStyle}
            onTextChange={(text) => onPlainTextChange(text, editingBox.id)}
            onFinish={onFinishEditing}
          />
      )}
      <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-75 text-white text-xs rounded-md p-2 flex items-center space-x-2 shadow-lg select-none">
        <span>{Math.round(zoom * 100)}%</span>
        <button 
          onClick={handleZoomTo100}
          className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md transition-colors"
          title="Zoom to 100% (Ctrl+1)"
        >
          100%
        </button>
      </div>
    </div>
  );
};

export default CanvasPanel;