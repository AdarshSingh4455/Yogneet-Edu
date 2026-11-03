import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  IconLibraryService,
  IconItem,
  IconCategory,
  renderIconPreview,
} from '../../services/iconLibraryService';
import { Search, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { useClickOutside } from '../../utils/useClickOutside';

interface IconSelectorProps {
  value: string; // iconKey, iconName, or custom identifier
  onChange: (selectedIconKeyOrName: string) => void;
  categoryFilter?: IconCategory | 'All';
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onChange,
  categoryFilter = 'All',
  label = 'Select Icon',
  placeholder = 'Choose an icon...',
  allowClear = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory | 'All'>(categoryFilter);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useClickOutside([containerRef], () => setIsOpen(false), isOpen);

  const allIcons = useMemo(() => {
    return IconLibraryService.getAllIcons();
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    return allIcons.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.iconKey && item.iconKey.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allIcons, selectedCategory, searchQuery]);

  // Find currently selected icon object
  const currentSelectedIcon = useMemo(() => {
    if (!value) return null;
    return IconLibraryService.getIconByNameOrKey(value) || null;
  }, [value, allIcons]);

  const handleSelect = (item: IconItem) => {
    const returnVal = item.iconKey || item.name;
    onChange(returnVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('BookOpen');
  };

  const categories: (IconCategory | 'All')[] = ['All', 'Subjects', 'Micro Subjects', 'Technology', 'General'];

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Main trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-left text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            {renderIconPreview(value || 'BookOpen', 'w-4 h-4')}
          </div>
          <span className="font-semibold truncate">
            {currentSelectedIcon ? currentSelectedIcon.name : value || placeholder}
          </span>
          {currentSelectedIcon?.category && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-dark-sidebar">
              {currentSelectedIcon.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && value && (
            <span
              onClick={handleClear}
              className="p-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear icon"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[380px] flex flex-col">
          {/* Search box & Category tabs */}
          <div className="p-3 border-b border-light-border dark:border-dark-border bg-slate-50/60 dark:bg-dark-sidebar/40 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search icon name or technology..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-dark-cardHover'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Grid / List */}
          <div className="p-2 overflow-y-auto max-h-56 divide-y divide-light-border/40 dark:divide-dark-border/40">
            {filteredIcons.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <p>No matching icons found.</p>
                <p className="text-[11px] text-slate-500">Try searching for &quot;Code&quot;, &quot;Database&quot;, or &quot;Cpu&quot;</p>
              </div>
            ) : (
              filteredIcons.map(item => {
                const isSelected =
                  value === item.name ||
                  value === item.iconKey ||
                  (item.iconKey && value?.toLowerCase() === item.iconKey.toLowerCase());

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between gap-3 p-2 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-dark-selected text-brand-600 dark:text-cyan-300 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-dark-cardHover text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-dark-sidebar border border-light-border dark:border-dark-border flex items-center justify-center shrink-0">
                        {renderIconPreview(item, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs truncate block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize block">
                          {item.category} • {item.sourceType}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-500 dark:text-cyan-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
