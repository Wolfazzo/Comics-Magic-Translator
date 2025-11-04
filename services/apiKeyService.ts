const API_KEY_STORAGE_KEY = 'gemini-api-key';

/**
 * Retrieves the API key, prioritizing the one stored in localStorage.
 * If not found, it falls back to the environment variable.
 * @returns The API key string or null if not found in either location.
 */
export const getApiKey = (): string | null => {
    try {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) {
            return storedKey;
        }
    } catch (error) {
        console.error("Failed to read API key from localStorage:", error);
    }
    
    // Fallback to environment variable
    return process.env.API_KEY || null;
};

/**
 * Retrieves the API key ONLY from localStorage.
 * This is useful for UI components that should not access environment variables directly.
 * @returns The stored API key string or null.
 */
export const getStoredApiKey = (): string | null => {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to read API key from localStorage:", error);
        return null;
    }
};

/**
 * Saves the API key to localStorage.
 * @param key The API key string to save.
 */
export const saveApiKey = (key: string): void => {
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch (error) {
        console.error("Failed to save API key to localStorage:", error);
    }
};

/**
 * Clears the API key from localStorage.
 */
export const clearApiKey = (): void => {
    try {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear API key from localStorage:", error);
    }
};
