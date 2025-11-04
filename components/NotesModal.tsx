import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '../types';
import { useTranslation } from '../services/i18n';

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const DragHandleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-move" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);


interface NotesModalProps {
  initialNotes: Note[];
  onSave: (notes: Note[]) => void;
  onClose: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ initialNotes, onSave, onClose }) => {
    const { t } = useTranslation();
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Draggable state
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const sorted = [...initialNotes].sort((a,b) => b.createdAt - a.createdAt);
        setNotes(sorted);
    }, [initialNotes]);

    const handleAddNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            content: '',
            importance: 'normal',
            createdAt: Date.now(),
        };
        setNotes(prev => [newNote, ...prev]);
    };
    
    const handleUpdateNote = (id: string, newContent?: string, newImportance?: Note['importance']) => {
        setNotes(prev => prev.map(note => {
            if (note.id === id) {
                return {
                    ...note,
                    content: newContent ?? note.content,
                    importance: newImportance ?? note.importance,
                };
            }
            return note;
        }));
    };

    const handleDeleteNote = (id: string) => {
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    const handleSaveAndClose = () => {
        onSave(notes);
        onClose();
    };

    const handleExport = () => {
        const sortedNotes = [...notes].sort((a,b) => b.createdAt - a.createdAt);
        const jsonString = JSON.stringify(sortedNotes, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comic-translator-notes.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const importedNotes: Note[] = JSON.parse(text);
                if (Array.isArray(importedNotes) && importedNotes.every(n => n.id && typeof n.content === 'string' && n.importance)) {
                    setNotes(importedNotes.sort((a,b) => b.createdAt - a.createdAt));
                } else {
                    throw new Error("Invalid notes file format.");
                }
            } catch (error) {
                alert(`Failed to import notes: ${error instanceof Error ? error.message : "Unknown error"}`);
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const importanceClasses: Record<Note['importance'], { bg: string, text: string, border: string }> = {
        normal: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600' },
        important: { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-600' },
        critical: { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-600' },
    };

    // --- Window Drag Logic ---
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
    // --- End Window Logic ---

    return (
        <div
            style={{
                position: 'fixed',
                top: position.y, left: position.x,
                width: 450,
                minHeight: 400,
                maxHeight: '80vh',
            }}
            className="bg-gray-800 rounded-lg shadow-xl border border-indigo-500 flex flex-col z-40"
        >
            <header onMouseDown={handleDragStart} className="flex-shrink-0 p-3 bg-gray-900 flex justify-between items-center border-b border-gray-700 cursor-move">
                <div className="flex items-center text-gray-300">
                    <DragHandleIcon />
                    <h2 className="ml-2 text-lg font-bold text-indigo-400">{t('notes')}</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><CloseIcon /></button>
            </header>
            
            <main className="flex-grow p-4 overflow-y-auto space-y-3">
                <button onClick={handleAddNote} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('addNote')}</button>
                {notes.map(note => {
                    const classes = importanceClasses[note.importance];
                    return (
                        <div key={note.id} className={`${classes.bg} p-3 rounded-lg space-y-2 border ${classes.border}`}>
                            <textarea
                                value={note.content}
                                onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                                placeholder={t('notePlaceholder')}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-y"
                            />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm text-gray-400">{t('importance')}:</label>
                                    <select
                                        value={note.importance}
                                        onChange={(e) => handleUpdateNote(note.id, undefined, e.target.value as Note['importance'])}
                                        className={`bg-gray-900 border border-gray-600 rounded-lg p-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${classes.text}`}
                                    >
                                        <option value="normal" className="text-gray-300">{t('normal')}</option>
                                        <option value="important" className="text-yellow-300">{t('important')}</option>
                                        <option value="critical" className="text-red-300">{t('critical')}</option>
                                    </select>
                                </div>
                                <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 rounded-full text-gray-400 hover:bg-red-600 hover:text-white" title={t('deleteNote')}><TrashIcon /></button>
                            </div>
                        </div>
                    )
                })}
            </main>

            <footer className="flex-shrink-0 p-3 bg-gray-900 flex justify-between items-center border-t border-gray-700">
                <div className="flex space-x-2">
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelected} className="hidden" />
                    <button onClick={handleImportClick} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-lg text-sm">{t('import')}</button>
                    <button onClick={handleExport} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg text-sm">{t('export')}</button>
                </div>
                <button onClick={handleSaveAndClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">{t('saveAndClose')}</button>
            </footer>
        </div>
    );
};

export default NotesModal;
