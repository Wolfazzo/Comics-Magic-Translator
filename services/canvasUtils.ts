import { Stroke, TextBox, TextFormatSettings, Style, BrushShape } from "../types";

interface StyledSegment {
    text: string;
    style: Style;
}

// Upgrades legacy tags like <sup>, <s>, and <color> to the new generic <style> tag format.
function upgradeLegacyTags(text: string): string {
    if (!text) return '';
    return text
        .replace(/<sup>/g, '<style isSuperscript="true">')
        .replace(/<\/sup>/g, '</style>')
        .replace(/<color value="([^"]+)">/g, '<style color="$1">')
        .replace(/<\/color>/g, '</style>');
}

// Parses text containing <style> tags into an array of segments, each with its own style properties.
// It handles nested tags by maintaining a style stack and applies zoom consistently to all pixel values.
function parseStyledText(text: string, baseStyle: Style, zoom: number = 1): StyledSegment[] {
    const upgradedText = upgradeLegacyTags(text);
    const segments: StyledSegment[] = [];
    const tokenizer = /(<style [^>]*>|<\/style>|[^<>]+)/g;
    const tokens = upgradedText.match(tokenizer) || [];

    // The baseStyle passed in is UN-ZOOMED. We create a zoomed version for the stack.
    const zoomedBaseStyle = { ...baseStyle };
    zoomedBaseStyle.fontSize = (zoomedBaseStyle.fontSize ?? 0) * zoom;
    zoomedBaseStyle.strokeWidth = (zoomedBaseStyle.strokeWidth ?? 0) * zoom;
    zoomedBaseStyle.wordSpacing = (zoomedBaseStyle.wordSpacing ?? 0) * zoom;

    const styleStack: Style[] = [zoomedBaseStyle];
    const attrParser = /(\w+)="([^"]+)"/g;

    for (const token of tokens) {
        if (token.startsWith('<style')) {
            const newStyle = { ...styleStack[styleStack.length - 1] }; // Inherit from parent (already zoomed)
            let match;
            while ((match = attrParser.exec(token)) !== null) {
                const key = match[1] as keyof Style;
                let value: any = match[2];
                // Convert string values from attributes to their correct types AND APPLY ZOOM
                if (key === 'fontSize' || key === 'strokeWidth' || key === 'wordSpacing') {
                    value = parseFloat(value) * zoom;
                } else if (key === 'lineHeight') {
                    value = parseFloat(value); // Line height is a multiplier, do not scale by zoom.
                } else if (key === 'isSuperscript') {
                    value = value === 'true';
                }
                (newStyle as any)[key] = value;
            }
            styleStack.push(newStyle);
        } else if (token === '</style>') {
            if (styleStack.length > 1) styleStack.pop();
        } else { // It's a text node
            if (token.length > 0) {
                segments.push({ text: token, style: styleStack[styleStack.length - 1] });
            }
        }
    }

    // If parsing results in no segments (e.g., for plain text), create a single segment.
    if (segments.length === 0 && text) {
        return [{ text, style: zoomedBaseStyle }];
    }
    return segments;
}


export const drawWrappedTextOnCanvas = (
    ctx: CanvasRenderingContext2D,
    box: TextBox,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number,
    zoom: number = 1
) => {
    // The App component now serializes plainText+styleSpans into translatedText for rendering.
    if (!box.translatedText || !box.fontSize || box.fontSize < 4) return;

    interface RenderChunk {
        text: string;
        style: Style;
        width: number;
    }
    
    // 1. Parse the text into styled segments.
    // All style properties that are pixel-based are passed UN-SCALED.
    // `parseStyledText` will handle all zoom scaling internally.
    const baseStyle: Style = {
        fontFamily: box.fontFamily,
        fontSize: box.fontSize,
        textAlign: box.textAlign,
        fontWeight: box.fontWeight,
        fontStyle: box.fontStyle,
        lineHeight: box.lineHeight,
        wordSpacing: box.wordSpacing,
        color: box.color,
        strokeColor: box.strokeColor,
        strokeWidth: box.strokeWidth,
    };
    const segments = parseStyledText(box.translatedText, baseStyle, zoom);

    // 2. Create a flat list of all words with their measured widths and styles
    const allWords: RenderChunk[] = [];
    segments.forEach(segment => {
        const { style } = segment;
        // The font size from the style object is now pre-zoomed by parseStyledText
        const effectiveFontSize = style.isSuperscript ? ((style.fontSize || 0) * 0.6) : (style.fontSize || 0);
        const effectiveWordSpacing = style.wordSpacing ?? baseStyle.wordSpacing ?? 0;
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${effectiveFontSize}px ${style.fontFamily}`;
        
        const wordsAndDelimiters = segment.text.split(/(\s+|\n)/);
        wordsAndDelimiters.forEach(word => {
            if (word) {
                let measuredWidth = ctx.measureText(word).width;
                // Add word spacing to the width of space characters for wrapping calculation
                if (word.trim() === '' && word !== '\n') {
                    measuredWidth += effectiveWordSpacing;
                }
                allWords.push({ text: word, style, width: measuredWidth });
            }
        });
    });

    // 3. Arrange words into lines for wrapping
    const padding = (box.fontSize || 0) * 0.2 * zoom; // Padding can be scaled here
    const maxWidth = boxWidth - padding * 2;
    if (maxWidth <= 0) return;

    const lines: RenderChunk[][] = [];
    let currentLine: RenderChunk[] = [];
    let currentLineWidth = 0;

    allWords.forEach(word => {
        if (word.text === '\n') {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
            return; 
        }
        
        if (currentLine.length === 0 && word.text.trim() === '') return;

        if (currentLineWidth + word.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word.text.trim() === '' ? [] : [word];
            currentLineWidth = currentLine.length > 0 ? word.width : 0;
        } else {
            currentLine.push(word);
            currentLineWidth += word.width;
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);
    
    // 4. Render the lines
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(box.rotation * Math.PI / 180);

    ctx.beginPath();
    ctx.rect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    ctx.clip();
    
    // --- START: Corrected Baseline Alignment Logic for Uniform Line Spacing ---

    // 1. Calculate a fixed line height, which represents the constant distance between baselines.
    const fixedLineHeight = (box.fontSize || 0) * (box.lineHeight || 1.2) * zoom;

    // 2. Approximate the total height of the text block for vertical centering.
    const totalTextBlockHeight = lines.length * fixedLineHeight;

    // 3. To correctly position the block, we need the ascent of the first line.
    //    Using a representative character ('M') with the base font style is a robust way to get this.
    let firstLineAscent = 0;
    const effectiveBaseFontSize = (box.fontSize || 0) * zoom;
    ctx.font = `${box.fontWeight} ${effectiveBaseFontSize}px ${box.fontFamily}`;
    firstLineAscent = ctx.measureText('M').actualBoundingBoxAscent;

    // If the first line is not empty, calculate its actual max ascent for more precise positioning.
    if (lines[0] && lines[0].length > 0) {
        let maxAscentInFirstLine = 0;
        lines[0].forEach(word => {
            const { style } = word;
            const effectiveFontSize = style.isSuperscript ? ((style.fontSize || 0) * 0.6) : (style.fontSize || 0);
            ctx.font = `${style.fontStyle} ${style.fontWeight} ${effectiveFontSize}px ${style.fontFamily}`;
            maxAscentInFirstLine = Math.max(maxAscentInFirstLine, ctx.measureText(word.text).actualBoundingBoxAscent);
        });
        firstLineAscent = maxAscentInFirstLine;
    }

    // 4. Calculate the baseline Y of the first line to center the block.
    //    Start from the vertical center, go up by half the block height, then come down by the first line's ascent.
    let currentBaselineY = -totalTextBlockHeight / 2 + firstLineAscent;

    // 5. Set text baseline for consistent drawing.
    ctx.textBaseline = 'alphabetic';

    // 6. Draw each line, advancing the baseline by the fixed line height each time to ensure a rigid vertical rhythm.
    lines.forEach((line) => {
        const totalLineWidth = line.reduce((sum, word) => sum + word.width, 0);
        let startX = -boxWidth / 2 + padding;
        if (box.textAlign === 'center') { startX = -totalLineWidth / 2; }
        else if (box.textAlign === 'right') { startX = boxWidth / 2 - padding - totalLineWidth; }
        
        let currentX = startX;
        
        line.forEach(word => {
            const { style } = word;
            const effectiveFontSize = style.isSuperscript ? ((style.fontSize || 0) * 0.6) : (style.fontSize || 0);
            const yOffset = style.isSuperscript ? -effectiveFontSize * 0.5 : 0; 
            
            ctx.font = `${style.fontStyle} ${style.fontWeight} ${effectiveFontSize}px ${style.fontFamily}`;
            
            const strokeWidth = style.strokeWidth || 0;
            const drawY = currentBaselineY + yOffset;
            
            if (strokeWidth > 0) {
                ctx.strokeStyle = style.strokeColor || '#FFFFFF';
                ctx.lineWidth = strokeWidth;
                ctx.strokeText(word.text, currentX, drawY);
            }
            
            ctx.fillStyle = style.color || '#000000';
            ctx.fillText(word.text, currentX, drawY);
            
            currentX += word.width;
        });
        
        // The crucial step: advance the baseline by a constant amount for the next line.
        currentBaselineY += fixedLineHeight;
    });

    // --- END: Corrected Baseline Alignment Logic ---

    ctx.restore();
};

const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
};


const drawStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, stroke: Omit<Stroke, 'id' | 'points'>) => {
    const { hardness, color } = stroke;
    // By squaring the hardness, we create a non-linear curve.
    // This makes the brush feel much softer at lower hardness values (e.g., slider at 0.5 becomes 0.25 hardness),
    // providing more fine-grained control over the feathering effect.
    const effectiveHardness = Math.pow(hardness, 2);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const transparentColor = hexToRgba(color, 0);
    gradient.addColorStop(effectiveHardness, color);
    gradient.addColorStop(1, transparentColor);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
};

export const drawStrokesOnCanvas = (
    ctx: CanvasRenderingContext2D,
    strokes: Stroke[] | (Omit<Stroke, 'id'>)[],
    normalizedToWorldCoords: (pos: { x: number; y: number }) => { x: number; y: number }
) => {
    strokes.forEach(stroke => {
        const { points, type, size, hardness, shape, isFill } = stroke;

        if (points.length === 0) return;
        
        ctx.save(); // Save context state (composite operation, alpha, etc.)
        
        ctx.globalCompositeOperation = type === 'eraser' ? 'destination-out' : 'source-over';
        
        // Apply opacity. The opacity property is guaranteed by the type definitions.
        // A fallback is included for safety. For erasers, this will be 1.
        ctx.globalAlpha = stroke.opacity ?? 1;

        if (isFill) {
            if (points.length >= 3) {
                ctx.beginPath();
                const startPoint = normalizedToWorldCoords(points[0]);
                ctx.moveTo(startPoint.x, startPoint.y);
                for (let i = 1; i < points.length; i++) {
                    const point = normalizedToWorldCoords(points[i]);
                    ctx.lineTo(point.x, point.y);
                }
                ctx.closePath();
                ctx.fillStyle = type === 'eraser' ? '#000' : stroke.color;
                ctx.fill();
            }
        } else {
            const radius = size / 2;
            if (radius > 0) {
                if (points.length < 2) {
                    const worldPoint = normalizedToWorldCoords(points[0]);
                    drawStamp(ctx, worldPoint.x, worldPoint.y, radius, stroke);
                } else {
                    let lastPoint = normalizedToWorldCoords(points[0]);
                    drawStamp(ctx, lastPoint.x, lastPoint.y, radius, stroke);

                    for (let i = 1; i < points.length; i++) {
                        const currentPoint = normalizedToWorldCoords(points[i]);
                        const dist = Math.hypot(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);
                        
                        const spacingFactor = (shape === 'round' && hardness < 0.5) ? 0.25 : 0.5;
                        const spacing = Math.max(1, radius * spacingFactor);
                        const steps = Math.ceil(dist / spacing);
                        
                        for (let step = 1; step <= steps; step++) {
                            const t = step / steps;
                            const x = lastPoint.x * (1 - t) + currentPoint.x * t;
                            const y = lastPoint.y * (1 - t) + currentPoint.y * t;
                            drawStamp(ctx, x, y, radius, stroke);
                        }
                        
                        lastPoint = currentPoint;
                    }
                }
            }
        }

        ctx.restore(); // Restore context to its original state before this stroke
    });
};