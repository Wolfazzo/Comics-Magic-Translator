import { PathPoint } from '../types';

function colorDistanceSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    return Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
}

/**
 * Performs a flood fill on image data based on color similarity.
 * @param imageData The raw image data.
 * @param startX The starting X coordinate.
 * @param startY The starting Y coordinate.
 * @param tolerance A value from 0-255 indicating color similarity tolerance.
 * @param contiguous If true, only fills connected pixels. If false, fills all matching pixels in the image.
 * @returns A Uint8Array mask where 1 represents a selected pixel.
 */
export function floodFill(
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  startX: number,
  startY: number,
  tolerance: number,
  contiguous: boolean
): Uint8Array {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  
  const toleranceSq = tolerance * tolerance;

  // Non-contiguous mode: check every pixel in the image.
  if (!contiguous) {
    for (let i = 0; i < data.length; i += 4) {
      if (colorDistanceSq(startR, startG, startB, data[i], data[i+1], data[i+2]) <= toleranceSq) {
        mask[i / 4] = 1;
      }
    }
    return mask;
  }

  // Contiguous mode: use a queue-based (BFS) approach to find connected pixels.
  // This is much faster than recursion and avoids stack overflow errors.
  const queue: number[] = [startY * width + startX];
  if (mask[startY * width + startX] === 1) return mask; // Already visited

  mask[startY * width + startX] = 1;
  let head = 0;
  
  while(head < queue.length) {
    const pixelPos = queue[head++];
    const x = pixelPos % width;
    const y = Math.floor(pixelPos / width);

    // North
    if (y > 0) {
        const nextPos = (y - 1) * width + x;
        if (mask[nextPos] === 0 && colorDistanceSq(startR, startG, startB, data[nextPos*4], data[nextPos*4+1], data[nextPos*4+2]) <= toleranceSq) {
            mask[nextPos] = 1;
            queue.push(nextPos);
        }
    }
    // South
    if (y < height - 1) {
        const nextPos = (y + 1) * width + x;
        if (mask[nextPos] === 0 && colorDistanceSq(startR, startG, startB, data[nextPos*4], data[nextPos*4+1], data[nextPos*4+2]) <= toleranceSq) {
            mask[nextPos] = 1;
            queue.push(nextPos);
        }
    }
    // West
    if (x > 0) {
        const nextPos = y * width + (x - 1);
        if (mask[nextPos] === 0 && colorDistanceSq(startR, startG, startB, data[nextPos*4], data[nextPos*4+1], data[nextPos*4+2]) <= toleranceSq) {
            mask[nextPos] = 1;
            queue.push(nextPos);
        }
    }
    // East
    if (x < width - 1) {
        const nextPos = y * width + (x + 1);
        if (mask[nextPos] === 0 && colorDistanceSq(startR, startG, startB, data[nextPos*4], data[nextPos*4+1], data[nextPos*4+2]) <= toleranceSq) {
            mask[nextPos] = 1;
            queue.push(nextPos);
        }
    }
  }
  return mask;
}


function getSqSegDist(p: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}): number {
    let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
    if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = p2.x; y = p2.y;
        } else if (t > 0) {
            x += dx * t; y += dy * t;
        }
    }
    dx = p.x - x; dy = p.y - y;
    return dx * dx + dy * dy;
}


// Ramer-Douglas-Peucker implementation for path simplification
function simplify(points: {x: number, y: number}[], sqTolerance: number): {x: number, y: number}[] {
    if (points.length <= 2) return points;

    const simplifyDPStep = (points: {x: number, y: number}[], start: number, end: number, sqTolerance: number, simplified: {x: number, y: number}[]) => {
        let maxSqDist = 0;
        let index = 0;

        for (let i = start + 1; i < end; i++) {
            const sqDist = getSqSegDist(points[i], points[start], points[end]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            if (index - start > 1) simplifyDPStep(points, start, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (end - index > 1) simplifyDPStep(points, index, end, sqTolerance, simplified);
        }
    };

    const last = points.length - 1;
    const simplified: {x: number, y: number}[] = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}


/**
 * Traces the contours of all distinct regions in a binary mask and converts them to simplified vector paths.
 * @param mask The binary mask (1s for selected, 0s for not).
 * @param width The width of the mask.
 * @param height The height of the mask.
 * @returns An array of paths, where each path is an array of PathPoints.
 */
export function traceAndVectorizeAll(mask: Uint8Array, width: number, height: number): PathPoint[][] {
    const allPaths: PathPoint[][] = [];
    const visited = new Uint8Array(mask.length);

    const findContour = (startPoint: {x: number, y: number}): {x: number, y: number}[] | null => {
        let borderStartPoint: {x: number, y: number} | null = null;
        const q = [startPoint.y * width + startPoint.x];
        const visitedForBorderSearch = new Uint8Array(mask.length);
        visitedForBorderSearch[startPoint.y * width + startPoint.x] = 1;
        let head = 0;
        
        while(head < q.length) {
            const pos = q[head++];
            const x = pos % width;
            const y = Math.floor(pos / width);
            
            let isBorder = false;
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                isBorder = true;
            } else if (!mask[pos - 1] || !mask[pos + 1] || !mask[pos - width] || !mask[pos + width]) {
                isBorder = true;
            }

            if (isBorder) {
                borderStartPoint = {x, y};
                break;
            }
            
            const neighbors = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
            for (const n of neighbors) {
                const nextX = x + n.dx;
                const nextY = y + n.dy;
                if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                    const nextPos = nextY * width + nextX;
                    if (mask[nextPos] && !visitedForBorderSearch[nextPos]) {
                        visitedForBorderSearch[nextPos] = 1;
                        q.push(nextPos);
                    }
                }
            }
        }

        if (!borderStartPoint) return null;

        const contour: {x: number, y: number}[] = [];
        let currentPoint = borderStartPoint;
        const mooreNeighbors = [
            {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
            {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
        ];
        
        // FIX: Determine the initial direction correctly instead of assuming 0.
        // We find an adjacent non-mask pixel (the "wall") and set our initial "last step"
        // direction based on that.
        let dir = 0;
        for (let i = 0; i < 8; i++) {
            const checkX = borderStartPoint.x + mooreNeighbors[i].x;
            const checkY = borderStartPoint.y + mooreNeighbors[i].y;
            if (checkX < 0 || checkY < 0 || checkX >= width || checkY >= height || !mask[checkY * width + checkX]) {
                 // The direction *from* the empty space *to* our start point is the opposite of i.
                 // This becomes the "previous direction" for the algorithm to start.
                 dir = (i + 4) % 8;
                 break;
            }
        }

        do {
            contour.push(currentPoint);
            let foundNext = false;
            for (let i = 0; i < 8; i++) {
                const checkDir = (dir + i + 5) % 8;
                const nextX = currentPoint.x + mooreNeighbors[checkDir].x;
                const nextY = currentPoint.y + mooreNeighbors[checkDir].y;
                
                if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height && mask[nextY * width + nextX]) {
                    currentPoint = {x: nextX, y: nextY};
                    dir = checkDir;
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) break;
        } while (currentPoint.x !== borderStartPoint.x || currentPoint.y !== borderStartPoint.y);

        return contour;
    };
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (mask[i] && !visited[i]) {
                const contourPoints = findContour({ x, y });
                
                if (contourPoints && contourPoints.length > 2) {
                    const simplified = simplify(contourPoints, 1.5);
                    const pathPoints: PathPoint[] = simplified.map(p => ({ anchor: p, handle1: p, handle2: p }));
                    if (pathPoints.length > 0) {
                        pathPoints.push({ ...pathPoints[0] });
                    }
                    allPaths.push(pathPoints);
                }

                const queue = [i];
                visited[i] = 1;
                let head = 0;
                while (head < queue.length) {
                    const pos = queue[head++];
                    const curX = pos % width;
                    const curY = Math.floor(pos / width);
                    const neighbors = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:1,dy:0}, {dx:-1,dy:0}];
                    for (const n of neighbors) {
                        const nextX = curX + n.dx;
                        const nextY = curY + n.dy;
                        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                            const nextPos = nextY * width + nextX;
                            if (mask[nextPos] && !visited[nextPos]) {
                                visited[nextPos] = 1;
                                queue.push(nextPos);
                            }
                        }
                    }
                }
            }
        }
    }
    return allPaths;
}

/**
 * Pre-processes a selection mask to fill any holes (unselected areas completely surrounded by selected areas).
 * @returns A new, cleaned Uint8Array mask.
 */
export function cleanSelectionMask(mask: Uint8Array, width: number, height: number): Uint8Array {
    const cleanedMask = new Uint8Array(mask);
    const visited = new Uint8Array(mask.length);

    for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 0 && visited[i] === 0) {
            const component: number[] = [];
            const queue = [i];
            visited[i] = 1;
            let touchesBorder = false;
            let head = 0;

            while(head < queue.length) {
                const pos = queue[head++];
                component.push(pos);
                const x = pos % width;
                const y = Math.floor(pos / width);

                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    touchesBorder = true;
                }
                
                const neighbors = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
                for (const n of neighbors) {
                    const nextX = x + n.dx;
                    const nextY = y + n.dy;
                    if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                        const nextPos = nextY * width + nextX;
                        if (mask[nextPos] === 0 && visited[nextPos] === 0) {
                            visited[nextPos] = 1;
                            queue.push(nextPos);
                        }
                    }
                }
            }

            if (!touchesBorder) {
                for (const pos of component) {
                    cleanedMask[pos] = 1; // Fill the hole
                }
            }
        }
    }
    return cleanedMask;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

/**
 * Fills the selected area of an image with either an auto-detected dominant color or a specified manual color.
 */
export function inpaint(
    imageData: ImageData,
    selectionMask: Uint8Array,
    mode: 'auto' | 'manual',
    manualColor: string
): ImageData {
    const { data, width, height } = imageData;
    const cleanedMask = cleanSelectionMask(selectionMask, width, height);
    const outputData = new Uint8ClampedArray(data);

    if (mode === 'manual') {
        const rgb = hexToRgb(manualColor);
        if (!rgb) {
            console.error("Invalid manual color for inpainting:", manualColor);
            return new ImageData(outputData, width, height);
        }
        for (let i = 0; i < cleanedMask.length; i++) {
            if (cleanedMask[i] === 1) {
                const idx = i * 4;
                outputData[idx] = rgb.r;
                outputData[idx + 1] = rgb.g;
                outputData[idx + 2] = rgb.b;
                outputData[idx + 3] = 255;
            }
        }
    } else { // Auto mode
        const visited = new Uint8Array(cleanedMask.length);
        const QUANTIZATION_FACTOR = 32;

        for (let i = 0; i < cleanedMask.length; i++) {
            if (cleanedMask[i] === 1 && visited[i] === 0) {
                const component: number[] = [];
                const queue = [i];
                visited[i] = 1;
                let head = 0;

                // Find connected component
                while (head < queue.length) {
                    const pos = queue[head++];
                    component.push(pos);
                    const x = pos % width; const y = Math.floor(pos / width);
                    const neighbors = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
                    for (const n of neighbors) {
                        const nextX = x + n.dx; const nextY = y + n.dy;
                        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                            const nextPos = nextY * width + nextX;
                            if (cleanedMask[nextPos] === 1 && visited[nextPos] === 0) {
                                visited[nextPos] = 1;
                                queue.push(nextPos);
                            }
                        }
                    }
                }

                // Calculate dominant color for this component
                const colorBins = new Map<string, { r: number; g: number; b: number; count: number }>();
                for (const pos of component) {
                    const idx = pos * 4;
                    const r = data[idx]; const g = data[idx + 1]; const b = data[idx + 2];
                    const binKey = `${Math.floor(r / QUANTIZATION_FACTOR)},${Math.floor(g / QUANTIZATION_FACTOR)},${Math.floor(b / QUANTIZATION_FACTOR)}`;
                    
                    if (!colorBins.has(binKey)) {
                        colorBins.set(binKey, { r: 0, g: 0, b: 0, count: 0 });
                    }
                    const bin = colorBins.get(binKey)!;
                    bin.r += r; bin.g += g; bin.b += b; bin.count++;
                }

                let dominantBin = { r: 0, g: 0, b: 0, count: 0 };
                for (const bin of colorBins.values()) {
                    if (bin.count > dominantBin.count) {
                        dominantBin = bin;
                    }
                }

                const dominantColor = {
                    r: Math.round(dominantBin.r / dominantBin.count) || 255,
                    g: Math.round(dominantBin.g / dominantBin.count) || 255,
                    b: Math.round(dominantBin.b / dominantBin.count) || 255,
                };
                
                // Fill component with dominant color
                for (const pos of component) {
                    const idx = pos * 4;
                    outputData[idx] = dominantColor.r;
                    outputData[idx + 1] = dominantColor.g;
                    outputData[idx + 2] = dominantColor.b;
                    outputData[idx + 3] = 255;
                }
            }
        }
    }

    return new ImageData(outputData, width, height);
}