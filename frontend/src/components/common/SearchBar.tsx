import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
  debounceMs?: number;
}

export function SearchBar({ placeholder = 'Rechercher…', onSearch, defaultValue = '', debounceMs = 400 }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (val: string) => {
      setValue(val);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => onSearch(val), debounceMs);
    },
    [onSearch, debounceMs]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        type="text"
        className="input pl-10 pr-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      {value && (
        <button onClick={() => handleChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
