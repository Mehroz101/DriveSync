import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import drivesReducer from './slices/drivesSlice';
import filesReducer from './slices/filesSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    drives: drivesReducer,
    files: filesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;