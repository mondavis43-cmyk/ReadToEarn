import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Search, X, ChevronDown } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
}

interface Props {
  // single select
  value?: string;
  onChange?: (title: string, id: string) => void;
  // multi select
  multiValue?: string[];
  onMultiChange?: (titles: string[], ids: string[]) => void;
  multi?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const BookSearchInput = ({
  value,
  onChange,
  multiValue = [],
  onMultiChange,
  multi = false,
  placeholder = 'Search your book title...',
  label = 'Book Title',
  required = false,
}: Props) => {
  const { isDark } = useTheme();
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Book[]>([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const containerRef              = useRef<HTMLDivElement>(null);

  // theme tokens
  const textPrimary = isDark ? 'text-[#F5F0E8]'      : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/60'   : 'text-[#1B2A4A]/60';
  const inputCls    = `w-full px-4 py-3 rounded-lg border text-sm transition focus:outline-none ${
    isDark
      ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20 text-[#F5F0E8] focus:border-[#D4A843]/60 placeholder:text-[#F5F0E8]/30'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843] placeholder:text-[#1B2A4A]/30'
  }`;
  const dropdownBg  = isDark ? 'bg-[#1B2A4A] border-[#D4A843]/20' : 'bg-white border-[#1B2A4A]/15';
  const hoverRow    = isDark ? 'hover:bg-[#D4A843]/10' : 'hover:bg-[#F5F0E8]';
  const pillBg      = isDark ? 'bg-[#D4A843]/15 border-[#D4A843]/40 text-[#D4A843]' : 'bg-[#D4A843]/10 border-[#D4A843]/50 text-[#1B2A4A]';

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // search supabase — standard listings only
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('books')
        .select('id, title, author, genre')
        .eq('listing_type', 'standard')
        .ilike('title', `%${query.trim()}%`)
        .order('title', { ascending: true })
        .limit(20);
      setResults(data || []);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const selectBook = (book: Book) => {
    if (multi) {
      if (selectedIds.includes(book.id)) return; // no dupes
      const newIds    = [...selectedIds, book.id];
      const newTitles = [...multiValue, book.title];
      setSelectedIds(newIds);
      onMultiChange?.(newTitles, newIds);
      setQuery('');
      setResults([]);
      setOpen(false);
    } else {
      onChange?.(book.title, book.id);
      setQuery(book.title);
      setOpen(false);
    }
  };

  const removeBook = (idx: number) => {
    const newIds    = selectedIds.filter((_, i) => i !== idx);
    const newTitles = multiValue.filter((_, i) => i !== idx);
    setSelectedIds(newIds);
    onMultiChange?.(newTitles, newIds);
  };

  const clearSingle = () => {
    onChange?.('', '');
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${textMuted}`}>
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Multi — selected pills */}
      {multi && multiValue.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {multiValue.map((title, idx) => (
            <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${pillBg}`}>
              {title}
              <button type="button" onClick={() => removeBook(idx)} className="hover:opacity-70 transition-opacity">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
        <input
          type="text"
          value={multi ? query : (query || value || '')}
          onChange={e => {
            setQuery(e.target.value);
            if (!multi && e.target.value === '') clearSingle();
          }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={multi && multiValue.length > 0 ? 'Add another book...' : placeholder}
          className={`${inputCls} pl-9 pr-9`}
        />
        {/* Clear / chevron */}
        {!multi && (value || query) ? (
          <button
            type="button"
            onClick={clearSingle}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:opacity-70`}
          >
            <X size={15} />
          </button>
        ) : (
          <ChevronDown size={15} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${dropdownBg}`}>
          {loading ? (
            <div className={`px-4 py-3 text-sm ${textMuted}`}>Searching...</div>
          ) : results.length === 0 ? (
            <div className={`px-4 py-3 text-sm ${textMuted}`}>
              {query.trim().length < 2 ? 'Type at least 2 characters' : 'No standard listings found'}
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {results.map(book => {
                const alreadySelected = multi && selectedIds.includes(book.id);
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      disabled={alreadySelected}
                      onClick={() => selectBook(book)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        alreadySelected
                          ? `opacity-40 cursor-not-allowed ${textMuted}`
                          : hoverRow
                      }`}
                    >
                      <p className={`text-sm font-medium ${textPrimary}`}>{book.title}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {book.author}{book.genre ? ` · ${book.genre}` : ''}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
