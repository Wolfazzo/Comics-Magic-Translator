import React, { useState, useRef, useEffect } from 'react';

interface FontSelectorProps {
    selectedFont: string;
    onFontChange: (font: string) => void;
    fonts: string[];
    disabled?: boolean;
    previewPosition?: 'left' | 'right';
}

const FontSelector: React.FC<FontSelectorProps> = ({ selectedFont, onFontChange, fonts, disabled, previewPosition = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredFont, setHoveredFont] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (font: string) => {
        onFontChange(font);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            {/* The button showing current selection */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                style={{ fontFamily: selectedFont }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-left truncate focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
                {selectedFont}
            </button>

            {/* The dropdown list */}
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {fonts.map(font => (
                        <button
                            key={font}
                            onMouseEnter={() => setHoveredFont(font)}
                            onMouseLeave={() => setHoveredFont(null)}
                            onClick={() => handleSelect(font)}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-600"
                            style={{ fontFamily: font }}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            )}

            {/* The preview popup */}
            {isOpen && hoveredFont && (
                <div className="absolute z-30 p-2 bg-gray-900 border border-indigo-500 rounded-lg shadow-2xl pointer-events-none"
                     style={{ 
                         ...(previewPosition === 'right' ? { left: '102%' } : { right: '102%' }),
                         top: '0',
                         fontFamily: hoveredFont,
                         fontSize: '22px',
                         whiteSpace: 'nowrap'
                      }}>
                    {hoveredFont}
                </div>
            )}
        </div>
    );
};

export default FontSelector;