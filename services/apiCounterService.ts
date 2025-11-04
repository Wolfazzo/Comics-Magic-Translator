const COUNTER_KEY = 'comics-magic-translator-api-counter';

interface ApiCounter {
    count: number;
    date: string;
}

const getToday = (): string => new Date().toISOString().split('T')[0];

export const getApiCount = (): number => {
    try {
        const stored = localStorage.getItem(COUNTER_KEY);
        if (!stored) {
            return 0;
        }
        const data: ApiCounter = JSON.parse(stored);
        if (data.date !== getToday()) {
            // It's a new day, reset the counter.
            localStorage.setItem(COUNTER_KEY, JSON.stringify({ count: 0, date: getToday() }));
            return 0;
        }
        return data.count;
    } catch (error) {
        console.error("Failed to read API count from localStorage:", error);
        return 0;
    }
};

export const incrementApiCount = (): number => {
    const currentCount = getApiCount();
    const newCount = currentCount + 1;
    try {
        localStorage.setItem(COUNTER_KEY, JSON.stringify({ count: newCount, date: getToday() }));
        // Dispatch a custom event so the UI can react without prop drilling.
        window.dispatchEvent(new CustomEvent('apiCallCountUpdated', { detail: { newCount } }));
    } catch (error) {
        console.error("Failed to save API count to localStorage:", error);
    }
    return newCount;
};
