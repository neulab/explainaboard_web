import { useState } from "react";

type Setter<T> = (value: T | ((oldValue: T) => T)) => void;

/**
 * Create a state in the same way as `useState` while binding the state with
 * `localStorage`. All stored objects will be serialized with `JSON.stringify`.
 * @param key the key associated with the value stored in `localStorage`
 * @param initialValue same as the initial value for `useState`
 * @returns
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Setter<T>] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: Setter<T> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage if do update
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };
  return [storedValue, setValue];
}
