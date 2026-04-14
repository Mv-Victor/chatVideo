/**
 * MentionDropdown component - autocomplete dropdown for @ mentions in chat input.
 * Triggered by @ character, filters assets by typed characters, disambiguates duplicates
 * by appending HH:MM:SS of created_at timestamp.
 * Based on specs/001-chat-native-editor/spec.md (FR-009)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../../store';
import type { MediaAsset, AssetMention } from '../../types';

/**
 * Format ISO timestamp to HH:MM:SS for disambiguation
 */
function formatTimeForDisambiguation(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get display name for asset, with disambiguation for duplicates
 */
function getAssetDisplayName(asset: MediaAsset, allAssets: MediaAsset[]): string {
  const duplicates = allAssets.filter(a => a.name === asset.name && a.status === 'ready');
  
  if (duplicates.length > 1) {
    return `${asset.name} (${formatTimeForDisambiguation(asset.created_at)})`;
  }
  
  return asset.name;
}

export interface MentionDropdownProps {
  /** Whether the dropdown is visible */
  isOpen: boolean;
  /** The filter text typed after @ */
  filter: string;
  /** Callback when an asset is selected */
  onSelect: (assetId: string, assetName: string) => void;
  /** Callback when dropdown is closed */
  onClose: () => void;
  /** Current mentions array (to avoid duplicates in selection) */
  currentMentions?: AssetMention[];
}

/**
 * MentionDropdown - renders a filtered list of ready assets for @ mention.
 * Supports keyboard navigation (Up/Down/Enter/Tab/Escape) and real-time filtering.
 */
export function MentionDropdown({
  isOpen,
  filter,
  onSelect,
  onClose,
  currentMentions = [],
}: MentionDropdownProps) {
  const assets = useEditorStore((state) => state.assets);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter assets: only ready status, filtered by query text
  const filteredAssets = useMemo(() => {
    // Only show ready assets
    let readyAssets = assets.filter(asset => asset.status === 'ready');
    
    // Apply filter if there's text after @
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      readyAssets = readyAssets.filter(asset => 
        asset.name.toLowerCase().includes(lowerFilter)
      );
    }
    
    return readyAssets;
  }, [assets, filter]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredAssets]);

  // Scroll selected item into view
  useEffect(() => {
    const button = buttonRefs.current[selectedIndex];
    if (button && containerRef.current) {
      const container = containerRef.current;
      const buttonTop = button.offsetTop;
      const buttonBottom = buttonTop + button.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      
      if (buttonTop < containerTop) {
        container.scrollTop = buttonTop;
      } else if (buttonBottom > containerBottom) {
        container.scrollTop = buttonBottom - container.clientHeight;
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || filteredAssets.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredAssets.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedAsset = filteredAssets[selectedIndex];
        if (selectedAsset) {
          const displayName = getAssetDisplayName(selectedAsset, assets);
          onSelect(selectedAsset.id, displayName);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredAssets, selectedIndex, assets, onSelect, onClose]);

  // Attach keyboard handler
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Don't render if not open or no assets
  if (!isOpen || filteredAssets.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 bg-editor-surface border border-editor-border rounded-t-lg max-h-48 overflow-y-auto mb-1 shadow-lg z-50"
      role="listbox"
      aria-label="Select an asset to mention"
    >
      {/* Header */}
      <div className="p-2 text-xs text-editor-muted border-b border-editor-border sticky top-0 bg-editor-surface">
        {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} available
      </div>
      
      {/* Asset list */}
      {filteredAssets.map((asset, index) => {
        const displayName = getAssetDisplayName(asset, assets);
        const isSelected = index === selectedIndex;
        const isAlreadyMentioned = currentMentions.some(m => m.asset_id === asset.id);
        
        return (
          <button
            key={asset.id}
            ref={el => { buttonRefs.current[index] = el; }}
            onClick={() => {
              if (!isAlreadyMentioned) {
                onSelect(asset.id, displayName);
              }
            }}
            disabled={isAlreadyMentioned}
            className={`w-full text-left px-4 py-2 transition-colors flex items-center gap-3 ${
              isSelected 
                ? 'bg-zinc-700' 
                : 'hover:bg-zinc-800'
            } ${isAlreadyMentioned ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="option"
            aria-selected={isSelected}
          >
            {/* Thumbnail */}
            {asset.thumbnail_url ? (
              <img
                src={asset.thumbnail_url}
                alt={asset.name}
                className="w-10 h-10 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center flex-shrink-0">
                {/* Type-specific icon */}
                {asset.type.startsWith('video/') && (
                  <svg className="w-5 h-5 text-editor-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {asset.type.startsWith('audio/') && (
                  <svg className="w-5 h-5 text-editor-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                )}
                {asset.type.startsWith('image/') && (
                  <svg className="w-5 h-5 text-editor-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            )}
            
            {/* Asset info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-editor-text-bright truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-2 text-xs text-editor-muted">
                <span className="capitalize">{asset.type.split('/')[0]}</span>
                {asset.duration_ms && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(asset.duration_ms)}</span>
                  </>
                )}
                {asset.size && (
                  <>
                    <span>·</span>
                    <span>{formatFileSize(asset.size)}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Already mentioned indicator */}
            {isAlreadyMentioned && (
              <span className="text-xs text-editor-muted flex-shrink-0">
                (mentioned)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Format file size in bytes to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export default MentionDropdown;
