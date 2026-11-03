import React from 'react';
import {
  Code,
  Database,
  Globe,
  Brain,
  Cpu,
  Server,
  Terminal,
  Layers,
  BookOpen,
  Film,
  Zap,
  Shield,
  Boxes,
  GitBranch,
  Code2,
  HelpCircle,
  FileCode,
  FileText,
  Workflow,
  CpuIcon,
  Smartphone,
  Cloud,
  Network,
  Binary,
} from 'lucide-react';

import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';

export type IconCategory = 'Subjects' | 'Micro Subjects' | 'Technology' | 'General';
export type IconSourceType = 'lucide' | 'url' | 'upload';

export interface IconItem {
  id: string;
  name: string;
  category: IconCategory;
  sourceType: IconSourceType;
  iconKey?: string;
  imageUrl?: string;
  storagePath?: string;
  createdAt?: string;
  isSystem?: boolean;
}

// Built-in standard Lucide icon mappings
export const LUCIDE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code,
  Database,
  Globe,
  Brain,
  Cpu,
  Server,
  Terminal,
  Layers,
  BookOpen,
  Film,
  Zap,
  Shield,
  Boxes,
  GitBranch,
  Code2,
  FileCode,
  FileText,
  Workflow,
  Smartphone,
  Cloud,
  Network,
  Binary,
};

// Initial system icons available out of the box
const DEFAULT_SYSTEM_ICONS: IconItem[] = [
  { id: 'sys-1', name: 'Code & Syntax', category: 'Subjects', sourceType: 'lucide', iconKey: 'Code', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-2', name: 'Databases & SQL', category: 'Subjects', sourceType: 'lucide', iconKey: 'Database', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-3', name: 'Web Architecture', category: 'Subjects', sourceType: 'lucide', iconKey: 'Globe', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-4', name: 'AI & Neural Systems', category: 'Subjects', sourceType: 'lucide', iconKey: 'Brain', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-5', name: 'DSA & Hardware', category: 'Subjects', sourceType: 'lucide', iconKey: 'Cpu', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-6', name: 'DevOps & Cloud', category: 'Subjects', sourceType: 'lucide', iconKey: 'Server', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-7', name: 'CLI & Systems', category: 'Subjects', sourceType: 'lucide', iconKey: 'Terminal', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-8', name: 'Distributed Systems', category: 'Subjects', sourceType: 'lucide', iconKey: 'Layers', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-9', name: 'Computer Science Core', category: 'Subjects', sourceType: 'lucide', iconKey: 'BookOpen', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-10', name: 'Bite-Sized Concepts', category: 'Micro Subjects', sourceType: 'lucide', iconKey: 'Film', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-11', name: 'Rapid Algorithms', category: 'Micro Subjects', sourceType: 'lucide', iconKey: 'Zap', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-12', name: 'System Security', category: 'Technology', sourceType: 'lucide', iconKey: 'Shield', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-13', name: 'Data Structures', category: 'Technology', sourceType: 'lucide', iconKey: 'Boxes', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-14', name: 'Git & Pipelines', category: 'Technology', sourceType: 'lucide', iconKey: 'GitBranch', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
  { id: 'sys-15', name: 'Coding Arena', category: 'General', sourceType: 'lucide', iconKey: 'Code2', isSystem: true, createdAt: '2026-10-26T00:00:00Z' },
];

class IconLibraryServiceStore {
  private inMemoryIcons: IconItem[] = [...DEFAULT_SYSTEM_ICONS];
  private isLoadedFromDb = false;

  constructor() {
    try {
      const stored = localStorage.getItem('yogneet_custom_icons');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.inMemoryIcons = [...DEFAULT_SYSTEM_ICONS, ...parsed];
      }
    } catch {
      // fallback
    }
  }

  /**
   * Fetches the complete icon catalog from Supabase icon_library table.
   * Updates in-memory cache for high-performance synchronous reads.
   */
  async fetchIcons(): Promise<IconItem[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.inMemoryIcons;
    }

    try {
      const { data, error } = await (supabase.from('icon_library') as any)
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      if (data && data.length > 0) {
        this.inMemoryIcons = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category as IconCategory,
          sourceType: row.source_type as IconSourceType,
          iconKey: row.icon_key || undefined,
          imageUrl: row.image_url || undefined,
          storagePath: row.storage_path || undefined,
          isSystem: Boolean(row.is_system),
          createdAt: row.created_at,
        }));
        this.isLoadedFromDb = true;
      }

      return this.inMemoryIcons;
    } catch (err) {
      console.warn('[IconLibraryService.fetchIcons] Failed to fetch from database, using cached:', err);
      return this.inMemoryIcons;
    }
  }

  getAllIcons(): IconItem[] {
    return this.inMemoryIcons;
  }

  getIconsByCategory(category: IconCategory | 'All'): IconItem[] {
    if (category === 'All') return this.inMemoryIcons;
    return this.inMemoryIcons.filter(i => i.category === category);
  }

  getIconById(id: string): IconItem | undefined {
    return this.inMemoryIcons.find(i => i.id === id);
  }

  getIconByNameOrKey(nameOrKey: string): IconItem | undefined {
    const lower = nameOrKey.toLowerCase();
    return this.inMemoryIcons.find(
      i => i.name.toLowerCase() === lower || (i.iconKey && i.iconKey.toLowerCase() === lower)
    );
  }

  /**
   * Creates a new icon entry in Supabase icon_library and registers it locally.
   */
  async addCustomIconAsync(data: {
    name: string;
    category: IconCategory;
    sourceType: IconSourceType;
    iconKey?: string;
    imageUrl?: string;
    storagePath?: string;
  }): Promise<IconItem> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.addCustomIcon(data);
    }

    try {
      const { data: inserted, error } = await (supabase.from('icon_library') as any)
        .insert({
          name: data.name.trim(),
          category: data.category,
          source_type: data.sourceType,
          icon_key: data.iconKey || null,
          image_url: data.imageUrl || null,
          storage_path: data.storagePath || null,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const item: IconItem = {
        id: (inserted as any).id,
        name: (inserted as any).name,
        category: (inserted as any).category as IconCategory,
        sourceType: (inserted as any).source_type as IconSourceType,
        iconKey: (inserted as any).icon_key || undefined,
        imageUrl: (inserted as any).image_url || undefined,
        storagePath: (inserted as any).storage_path || undefined,
        createdAt: (inserted as any).created_at,
        isSystem: false,
      };

      this.inMemoryIcons.push(item);
      return item;
    } catch (err) {
      console.error('[IconLibraryService.addCustomIconAsync] Error creating icon:', err);
      throw err;
    }
  }

  /**
   * Synchronous fallback for local mock / rapid prototyping.
   */
  addCustomIcon(data: {
    name: string;
    category: IconCategory;
    sourceType: IconSourceType;
    iconKey?: string;
    imageUrl?: string;
  }): IconItem {
    const newItem: IconItem = {
      id: `custom-${Date.now()}`,
      name: data.name.trim(),
      category: data.category,
      sourceType: data.sourceType,
      iconKey: data.iconKey,
      imageUrl: data.imageUrl,
      createdAt: new Date().toISOString(),
      isSystem: false,
    };
    this.inMemoryIcons.push(newItem);
    return newItem;
  }

  /**
   * Updates an existing custom icon in Supabase icon_library.
   */
  async updateCustomIconAsync(
    id: string,
    updates: Partial<Pick<IconItem, 'name' | 'category' | 'sourceType' | 'iconKey' | 'imageUrl'>>
  ): Promise<IconItem> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.updateCustomIcon(id, updates);
    }

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.sourceType !== undefined) payload.source_type = updates.sourceType;
    if (updates.iconKey !== undefined) payload.icon_key = updates.iconKey || null;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl || null;

    const { data: updated, error } = await (supabase.from('icon_library') as any)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error));
    }

    const item: IconItem = {
      id: (updated as any).id,
      name: (updated as any).name,
      category: (updated as any).category as IconCategory,
      sourceType: (updated as any).source_type as IconSourceType,
      iconKey: (updated as any).icon_key || undefined,
      imageUrl: (updated as any).image_url || undefined,
      createdAt: (updated as any).created_at,
      isSystem: (updated as any).is_system,
    };

    const idx = this.inMemoryIcons.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.inMemoryIcons[idx] = item;
    }
    return item;
  }

  updateCustomIcon(
    id: string,
    updates: Partial<Pick<IconItem, 'name' | 'category' | 'sourceType' | 'iconKey' | 'imageUrl'>>
  ): IconItem {
    const idx = this.inMemoryIcons.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Icon not found.');
    const updated = { ...this.inMemoryIcons[idx], ...updates };
    this.inMemoryIcons[idx] = updated;
    return updated;
  }

  /**
   * Deletes an icon using the reference-aware RPC admin_delete_icon().
   * Guarantees that icons assigned to active curriculum content are protected from deletion.
   */
  async deleteCustomIconAsync(id: string): Promise<{ success: boolean; inUse?: boolean; message: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      const ok = this.deleteCustomIcon(id);
      return { success: ok, message: ok ? 'Deleted' : 'Failed' };
    }

    try {
      const { data, error } = await (supabase.rpc as any)('admin_delete_icon', {
        p_icon_id: id,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      if (data?.success) {
        this.inMemoryIcons = this.inMemoryIcons.filter(i => i.id !== id);
        return { success: true, inUse: false, message: data.message || 'Icon deleted successfully.' };
      } else {
        return { success: false, inUse: Boolean(data?.in_use), message: data?.message || 'Cannot delete icon in use.' };
      }
    } catch (err: any) {
      console.error('[IconLibraryService.deleteCustomIconAsync] Error:', err);
      throw err;
    }
  }

  deleteCustomIcon(id: string): boolean {
    const idx = this.inMemoryIcons.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.inMemoryIcons.splice(idx, 1);
    return true;
  }

  /**
   * Uploads an icon image asset to Supabase Storage (yogneet-public/icons)
   */
  async uploadIconAsset(file: File): Promise<{ publicUrl: string; storagePath: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        publicUrl: URL.createObjectURL(file),
        storagePath: `icons/${file.name}`,
      };
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `icons/${Date.now()}-${cleanName}`;

    const { error: uploadErr } = await supabase.storage
      .from('yogneet-public')
      .upload(storagePath, file, {
        upsert: true,
        cacheControl: '86400',
        contentType: file.type || 'image/png',
      });

    if (uploadErr) {
      throw new Error(formatSupabaseError(uploadErr));
    }

    const { data } = supabase.storage.from('yogneet-public').getPublicUrl(storagePath);
    return {
      publicUrl: data.publicUrl,
      storagePath,
    };
  }
}

export const IconLibraryService = new IconLibraryServiceStore();

/**
 * Resolves any icon name, iconKey, or image URL into an accessible React node.
 */
export function renderIconPreview(
  iconIdentifier?: string | IconItem | null,
  className: string = 'w-5 h-5'
): React.ReactNode {
  if (!iconIdentifier) {
    return React.createElement(BookOpen, { className });
  }

  if (typeof iconIdentifier === 'object') {
    if (iconIdentifier.sourceType === 'lucide' && iconIdentifier.iconKey && LUCIDE_ICON_MAP[iconIdentifier.iconKey]) {
      const LucideComponent = LUCIDE_ICON_MAP[iconIdentifier.iconKey];
      return React.createElement(LucideComponent, { className });
    }
    if ((iconIdentifier.sourceType === 'url' || iconIdentifier.sourceType === 'upload') && iconIdentifier.imageUrl) {
      return React.createElement('img', {
        src: iconIdentifier.imageUrl,
        alt: iconIdentifier.name,
        className: `${className} object-contain rounded-md`,
      });
    }
    return React.createElement(BookOpen, { className });
  }

  // String identifier: check if it's a URL
  if (iconIdentifier.startsWith('http://') || iconIdentifier.startsWith('https://') || iconIdentifier.startsWith('data:image/')) {
    return React.createElement('img', {
      src: iconIdentifier,
      alt: 'Custom icon',
      className: `${className} object-contain rounded-md`,
    });
  }

  // Check Lucide map
  if (LUCIDE_ICON_MAP[iconIdentifier]) {
    const LucideComponent = LUCIDE_ICON_MAP[iconIdentifier];
    return React.createElement(LucideComponent, { className });
  }

  // Check registered named icon
  const found = IconLibraryService.getIconByNameOrKey(iconIdentifier);
  if (found) {
    return renderIconPreview(found, className);
  }

  return React.createElement(BookOpen, { className });
}
