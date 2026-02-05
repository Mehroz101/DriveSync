import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  selectedDrives: string[];
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  viewMode: 'list' | 'grid';
  searchQuery: string;
  isRefreshing: boolean;
}

const initialState: UIState = {
  selectedDrives: [],
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  viewMode: 'list',
  searchQuery: '',
  isRefreshing: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedDrives: (state, action: PayloadAction<string[]>) => {
      state.selectedDrives = action.payload;
    },
    toggleDriveSelection: (state, action: PayloadAction<string>) => {
      const driveId = action.payload;
      if (driveId === 'all') {
        state.selectedDrives = [];
      } else {
        if (state.selectedDrives.includes(driveId)) {
          state.selectedDrives = state.selectedDrives.filter(id => id !== driveId);
        } else {
          state.selectedDrives = [...state.selectedDrives, driveId];
        }
      }
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileSidebarOpen = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'list' | 'grid'>) => {
      state.viewMode = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setIsRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    resetUIState: () => initialState,
  },
});

export const {
  setSelectedDrives,
  toggleDriveSelection,
  setSidebarCollapsed,
  setMobileSidebarOpen,
  setViewMode,
  setSearchQuery,
  setIsRefreshing,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;