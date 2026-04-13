/**
 * Media assets state management slice.
 * Manages the list of uploaded media assets with status tracking.
 * Based on specs/001-chat-native-editor/data-model.md
 */

import type { StateCreator } from 'zustand';
import type { MediaAsset } from '../types';

export interface MediaSlice {
  assets: MediaAsset[];
  /** Replace entire assets array (used for project load) */
  setAssets: (assets: MediaAsset[]) => void;
  /** Update a single asset by ID with partial fields */
  updateAsset: (id: string, patch: Partial<MediaAsset>) => void;
  /** Add a new asset to the list */
  addAsset: (asset: MediaAsset) => void;
  /** Remove an asset by ID */
  removeAsset: (id: string) => void;
  /** Get an asset by ID */
  getAsset: (id: string) => MediaAsset | undefined;
  /** Clear all assets */
  clearAssets: () => void;
}

export const createMediaSlice: StateCreator<MediaSlice, [], [], MediaSlice> = (set, get) => ({
  assets: [],

  setAssets: (assets: MediaAsset[]) => {
    set({ assets });
  },

  updateAsset: (id: string, patch: Partial<MediaAsset>) => {
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === id ? { ...asset, ...patch } : asset
      ),
    }));
  },

  addAsset: (asset: MediaAsset) => {
    set((state) => ({
      assets: [...state.assets, asset],
    }));
  },

  removeAsset: (id: string) => {
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== id),
    }));
  },

  getAsset: (id: string) => {
    return get().assets.find((asset) => asset.id === id);
  },

  clearAssets: () => {
    set({ assets: [] });
  },
});
