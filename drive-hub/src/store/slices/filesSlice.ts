import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FileState {
  selectedFiles: { driveId: string; fileId: string }[];
  selectedTypes: string[];
  selectedTags: string[];
  selectedSize: string;
  selectedDatePreset: string;
  page: number;
}

const initialState: FileState = {
  selectedFiles: [],
  selectedTypes: [],
  selectedTags: [],
  selectedSize: 'all',
  selectedDatePreset: 'all',
  page: 1,
};

export const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setSelectedFiles: (state, action: PayloadAction<{ driveId: string; fileId: string }[]>) => {
      state.selectedFiles = action.payload;
    },
    toggleFileSelection: (state, action: PayloadAction<{ driveId: string; fileId: string }>) => {
      const file = action.payload;
      const exists = state.selectedFiles.some(
        f => f.fileId === file.fileId && f.driveId === file.driveId
      );
      
      if (exists) {
        state.selectedFiles = state.selectedFiles.filter(
          f => !(f.fileId === file.fileId && f.driveId === file.driveId)
        );
      } else {
        state.selectedFiles.push(file);
      }
    },
    toggleSelectAll: (state, action: PayloadAction<{ 
      files: { _id: string; driveAccountId?: string }[] 
    }>) => {
      const { files } = action.payload;
      if (state.selectedFiles.length === files.length) {
        state.selectedFiles = [];
      } else {
        state.selectedFiles = files.map(f => ({ 
          fileId: f._id, 
          driveId: f.driveAccountId || '' 
        }));
      }
    },
    setSelectedTypes: (state, action: PayloadAction<string[]>) => {
      state.selectedTypes = action.payload;
    },
    toggleFileType: (state, action: PayloadAction<string>) => {
      const type = action.payload;
      if (type === 'all') {
        state.selectedTypes = [];
      } else {
        if (state.selectedTypes.includes(type)) {
          state.selectedTypes = state.selectedTypes.filter(t => t !== type);
        } else {
          state.selectedTypes = [...state.selectedTypes, type];
        }
      }
    },
    setSelectedTags: (state, action: PayloadAction<string[]>) => {
      state.selectedTags = action.payload;
    },
    toggleTag: (state, action: PayloadAction<string>) => {
      const tag = action.payload;
      if (state.selectedTags.includes(tag)) {
        state.selectedTags = state.selectedTags.filter(t => t !== tag);
      } else {
        state.selectedTags = [...state.selectedTags, tag];
      }
    },
    setSelectedSize: (state, action: PayloadAction<string>) => {
      state.selectedSize = action.payload;
    },
    setSelectedDatePreset: (state, action: PayloadAction<string>) => {
      state.selectedDatePreset = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    clearAllFilters: (state) => {
      state.selectedTypes = [];
      state.selectedTags = [];
      state.selectedSize = 'all';
      state.selectedDatePreset = 'all';
      state.page = 1;
    },
    resetFileState: () => initialState,
  },
});

export const {
  setSelectedFiles,
  toggleFileSelection,
  toggleSelectAll,
  setSelectedTypes,
  toggleFileType,
  setSelectedTags,
  toggleTag,
  setSelectedSize,
  setSelectedDatePreset,
  setPage,
  clearAllFilters,
  resetFileState,
} = filesSlice.actions;

export default filesSlice.reducer;