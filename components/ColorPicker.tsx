import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from '../services/i18n';

// --- Color Picker Component ---
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  onActivateEyedropper: () => void;
  labelPrefix: string;
  triggerRef: React.RefObject<HTMLElement>;
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#808080', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4',
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#9E9E9E', '#607D8B',
  '#424242', '#E0E0E0', '#FF8A65', '#AED581', '#4FC3F7', '#7986CB', '#BA68C8', '#F06292',
  '#FFE082', '#A1887F', '#FFD180', '#8D6E63'
];

const EyedropperIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.5a1.5 1.5 0 011.06.44l3.536 3.535a1.5 1.5 0 010 2.122L6.12 18.07a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121L11.061 4.44A1.5 1.5 0 0110 3.5zM12 7.5a1 1 0 11-2 0 1 1 0 012 0z" />
        <path d="M4.343 14.343l1.414 1.414-2.121 2.122a1.5 1.5 0 01-2.121 0l-.707-.707a1.5 1.5 0 010-2.121l2.121-2.121z" />
    </svg>
);

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose, onActivateEyedropper, labelPrefix, triggerRef }) => {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number, left: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (triggerRef.current && pickerRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const pickerRect = pickerRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const margin = 8;
    
          let top = triggerRect.bottom + 4;
          let left = triggerRect.left;
    
          if (top + pickerRect.height > viewportHeight - margin) {
            top = triggerRect.top - pickerRect.height - 4;
          }
          if (left + pickerRect.width > viewportWidth - margin) {
            left = triggerRect.right - pickerRect.width;
          }
          if (left < margin) left = margin;
          if (top < margin) top = margin;
    
          setPosition({ top, left });
        }
    }, 60);

    return () => clearTimeout(timer);
  }, [triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const pickerContent = (
    <div
      ref={pickerRef}
      className="bg-gray-800 p-3 rounded-lg shadow-2xl border border-gray-600 w-56"
      style={position ? {
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      } : {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        zIndex: 50,
      }}
    >
      <div className="grid grid-cols-7 gap-1 mb-3">
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
        <button
            onClick={() => { onActivateEyedropper(); onClose(); }}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
            aria-label={t('pickColorFromCanvas')}
            title={t('pickColorFromCanvas')}
        >
            <EyedropperIcon />
        </button>
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
          aria-label={t('hexColorCode')}
        />
      </div>
    </div>
  );

  return ReactDOM.createPortal(pickerContent, document.body);
};

export default ColorPicker;