import { Note } from '../types';

const NOTES_KEY = 'comic-translator-notes';

export const loadNotes = (): Note[] => {
    try {
        const data = localStorage.getItem(NOTES_KEY);
        if (data) {
            const notes = JSON.parse(data);
            if (Array.isArray(notes)) {
                return notes;
            }
        }
    } catch (error) {
        console.error("Failed to load notes from localStorage:", error);
    }
    return [];
};

export const saveNotes = (notes: Note[]): void => {
    try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Failed to save notes to localStorage:", error);
    }
};
