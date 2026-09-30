import { useEffect, useState } from 'react';

/** Returns `value` after it has stopped changing for `delay` ms — keeps search boxes from firing a request per keystroke. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}
