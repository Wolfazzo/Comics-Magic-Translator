import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { TextBox } from '../types';

interface InlineTextEditorProps {
  box: TextBox;
  style: React.CSSProperties;
  onTextChange: (text: string) => void;
  onFinish: () => void;
}

const InlineTextEditor: React.FC<InlineTextEditorProps> = ({ box, style, onTextChange, onFinish }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(box.plainText);

  // Auto-resize height to fit content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      // Temporarily shrink to get the correct scrollHeight, then set it.
      el.style.height = 'auto'; 
      el.style.height = `${el.scrollHeight}px`;

      // Vertically center the textarea content if it's smaller than the box
      const boxHeight = parseFloat(String(style.height || '0'));
      if (el.scrollHeight < boxHeight) {
          el.style.top = `${parseFloat(String(style.top || '0')) - (boxHeight - el.scrollHeight) / 2}px`;
      }
    }
  }, [text, style.height, style.top]);

  // Focus and select all text on initial mount.
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
        el.focus();
        el.select();
    }
  }, []);

  // Sync with external state changes (e.g., undo/redo, ToolsPanel edits).
  useEffect(() => {
      if (box.plainText !== text) {
          setText(box.plainText);
      }
  // Intentionally only listening to box.plainText to avoid loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.plainText]);


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTextChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Finish editing on Escape, but not on Enter.
    if (e.key === 'Escape') {
      e.preventDefault();
      onFinish();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={handleChange}
      onBlur={onFinish}
      onKeyDown={handleKeyDown}
      style={style}
      spellCheck="false"
    />
  );
};

export default InlineTextEditor;
