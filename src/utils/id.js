export const generateId = (prefix = '') => {
    let id;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        id = window.crypto.randomUUID();
    } else {
        // Fallback based on high-precision time and randomness
        id = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    }
    return prefix ? `${prefix}-${id}` : id;
};
