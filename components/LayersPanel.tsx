import React, { useState, useMemo } from 'react';
import { TextBox } from '../types';
import { useTranslation } from '../services/i18n';

interface LayersPanelProps {
  textBoxes: TextBox[];
  selectedBoxIds: number[];
  onBoxClick: (boxId: number, isMultiSelect: boolean) => void;
  onTextBoxesUpdate: (boxes: TextBox[]) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ textBoxes, selectedBoxIds, onBoxClick, onTextBoxesUpdate }) => {
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const { t } = useTranslation();

  // Filter for text and image boxes and reverse them for display.
  // The last item in the original array is rendered on top, so we want it first in our list.
  const displayLayers = useMemo(() =>
    textBoxes.filter(b => b.type === 'text' || b.type === 'image').reverse()
  , [textBoxes]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, boxId: number) => {
    e.dataTransfer.setData('text/plain', boxId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, boxId: number) => {
    e.preventDefault();
    if (dragOverId !== boxId) {
      setDragOverId(boxId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: number) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (draggedId === dropTargetId) return;

    // The full array of boxes, including OCR boxes, must be reordered
    const newBoxes = [...textBoxes];
    const fromIndex = newBoxes.findIndex(b => b.id === draggedId);
    
    if (fromIndex === -1) return;
    
    // The visual list is reversed, so find the target index in the non-reversed array
    const toIndexOriginal = newBoxes.findIndex(b => b.id === dropTargetId);
    if (toIndexOriginal === -1) return;

    const [movedItem] = newBoxes.splice(fromIndex, 1);
    
    // Recalculate 'to' index after splice, as it might have shifted
    const newToIndex = newBoxes.findIndex(b => b.id === dropTargetId);

    // If we drag an item from a lower position to a higher one (visually top to bottom),
    // we insert it before the target in the reversed list, which means after it in the original list.
    // If we drag from high to low (visually bottom to top), we insert it after, which means before.
    if (fromIndex > newToIndex) {
        newBoxes.splice(newToIndex + 1, 0, movedItem);
    } else {
        newBoxes.splice(newToIndex, 0, movedItem);
    }
    
    onTextBoxesUpdate(newBoxes);
  };

  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2 text-indigo-400 flex-shrink-0">{t('layers')}</h3>
      <div className="flex-grow space-y-1">
        {displayLayers.length > 0 ? (
          displayLayers.map(box => {
            const isSelected = selectedBoxIds.includes(box.id);
            const isDragOver = dragOverId === box.id;
            const content = box.type === 'image' && box.imageDataUrl ? (
                <div className="flex items-center min-w-0">
                    <img src={box.imageDataUrl} alt="layer thumbnail" className="w-8 h-8 object-contain rounded-sm mr-2 bg-gray-900" />
                    <span className="text-sm font-medium truncate text-gray-200 italic" title={box.plainText}>{box.plainText || '[Image]'}</span>
                </div>
            ) : (
                <span className="text-sm font-medium truncate text-gray-200">
                  {box.plainText || t('emptyTextBox')}
                </span>
            );
            
            return (
              <div
                key={box.id}
                draggable
                onDragStart={e => handleDragStart(e, box.id)}
                onDrop={e => handleDrop(e, box.id)}
                onDragOver={e => handleDragOver(e, box.id)}
                onDragLeave={handleDragLeave}
                onClick={e => onBoxClick(box.id, e.shiftKey)}
                className={`p-2 rounded-lg cursor-pointer transition-all duration-150 border ${
                    isSelected ? 'bg-indigo-700 border-indigo-500' : 'bg-gray-700 hover:bg-gray-600 border-transparent'
                } ${isDragOver ? 'border-dashed border-sky-400' : ''}`}
                title={box.plainText}
              >
               {content}
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 mt-8">
            <p>{t('noTextLayers')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayersPanel;