import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../services/i18n';

interface OriginalImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const DragHandleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-move" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const OriginalImageViewer: React.FC<OriginalImageViewerProps> = ({ imageUrl, onClose }) => {
    const { t } = useTranslation();
    const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 80 });
    const [size] = useState({ width: 500, height: 600 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);

    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            setImage(img);
            const container = containerRef.current;
            if (container) {
                const { clientWidth, clientHeight } = container;
                const scale = Math.min(clientWidth / img.width, clientHeight / img.height);
                const initialZoom = scale * 0.95;
                setZoom(initialZoom);
                setPanOffset({
                    x: (clientWidth - img.width * initialZoom) / 2,
                    y: (clientHeight - img.height * initialZoom) / 2,
                });
            }
        };
    }, [imageUrl]);

    const screenToWorldCoords = useCallback((screenX: number, screenY: number) => {
        return {
          x: (screenX - panOffset.x) / zoom,
          y: (screenY - panOffset.y) / zoom,
        };
    }, [panOffset, zoom]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, panOffset.x, panOffset.y, image.width * zoom, image.height * zoom);

    }, [image, panOffset, zoom]);

    useEffect(() => {
        draw();
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);
    
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDrag, handleDragEnd]);

    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isPanning.current = true;
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning.current) {
            setPanOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }
    };

    const handleCanvasMouseUp = () => {
        isPanning.current = false;
    };
    
    const handleCanvasMouseLeave = () => {
        isPanning.current = false;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!image) return;
        const { x: mouseX, y: mouseY } = getCanvasCoords(e);
        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
        const mouseWorldBeforeZoom = screenToWorldCoords(mouseX, mouseY);
        setZoom(clampedZoom);
        setPanOffset({
            x: mouseX - mouseWorldBeforeZoom.x * clampedZoom,
            y: mouseY - mouseWorldBeforeZoom.y * clampedZoom,
        });
    };

    useEffect(() => {
        draw();
    }, [panOffset, zoom, draw]);

    return (
        <div
            className="absolute bg-gray-800 border border-indigo-500 rounded-lg shadow-2xl flex flex-col z-40"
            style={{
                top: position.y,
                left: position.x,
                width: size.width,
                height: size.height,
            }}
        >
            <div
                className="bg-gray-900 p-2 flex justify-between items-center cursor-move"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center text-gray-300">
                    <DragHandleIcon />
                    <span className="ml-2 font-semibold">{t('originalImage')}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                    <CloseIcon />
                </button>
            </div>
            <div ref={containerRef} className="flex-grow bg-gray-900 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
                    onWheel={handleWheel}
                />
            </div>
        </div>
    );
};

export default OriginalImageViewer;