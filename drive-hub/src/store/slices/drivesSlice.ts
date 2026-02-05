import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DriveAccount } from '@/types';

// Define error types for better type safety
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Mock API functions - replace with actual imports
const getDriveAccountStats = async () => ({ data: [] });
const getDriveAccountsRefetch = async () => ({ data: [] });

interface DrivesState {
  drives: DriveAccount[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DrivesState = {
  drives: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunk for fetching drive stats
export const fetchDriveStats = createAsyncThunk(
  'drives/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getDriveAccountStats();
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message || 'Failed to fetch drive stats');
    }
  }
);

// Async thunk for refreshing drive stats
export const refreshDriveStats = createAsyncThunk(
  'drives/refreshStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getDriveAccountsRefetch();
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message || 'Failed to refresh drive stats');
    }
  }
);

export const drivesSlice = createSlice({
  name: 'drives',
  initialState,
  reducers: {
    clearDrives: (state) => {
      state.drives = [];
      state.error = null;
    },
    updateDriveStatus: (state, action: PayloadAction<{ 
      driveId: string; 
      status: 'active' | 'error' | 'revoked' 
    }>) => {
      const { driveId, status } = action.payload;
      const drive = state.drives.find(d => d._id === driveId);
      if (drive) {
        drive.connectionStatus = status;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch drive stats
    builder
      .addCase(fetchDriveStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriveStats.fulfilled, (state, action) => {
        state.loading = false;
        state.drives = Array.isArray(action.payload) ? action.payload : [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDriveStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Refresh drive stats
      .addCase(refreshDriveStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshDriveStats.fulfilled, (state, action) => {
        state.loading = false;
        state.drives = Array.isArray(action.payload) ? action.payload : [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(refreshDriveStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDrives, updateDriveStatus } = drivesSlice.actions;
export default drivesSlice.reducer;