import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapid value changes (e.g. search input typing).
 * @param {any} value - The input value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default 300ms)
 * @returns {any} debouncedValue
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
