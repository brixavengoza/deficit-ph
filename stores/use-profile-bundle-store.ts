import {
  loadProfileBundle,
  updateActivityLevel,
  updateBodyMeasurements,
  updateGoal,
  updateNotifications,
  updatePersonalInfo,
  updateProfilePhoto,
  updateTheme,
  updateUnits,
  type ProfileBundle,
} from '@/lib/local-data';
import { create } from 'zustand';

const DEFAULT_BUNDLE: ProfileBundle = {
  fullName: '',
  username: '',
  email: '',
  profilePhotoUri: '',
  age: '',
  height: '',
  weight: '',
  goalWeight: '',
  activityLevel: 'Moderate',
  goal: 'Lose Weight',
  units: 'Metric',
  theme: 'Auto',
  notifications: true,
  calorieGoal: '0',
  streakDays: '0',
};

type ProfileBundleState = {
  bundle: ProfileBundle;
  isLoading: boolean;
  isSaving: boolean;
  hasLoaded: boolean;
  error: string | null;
  ensureLoaded: () => Promise<void>;
  refresh: () => Promise<void>;
  savePersonalInfo: (values: {
    fullName: string;
    username: string;
  }) => Promise<void>;
  saveProfilePhoto: (profilePhotoUri: string) => Promise<void>;
  saveBodyMeasurements: (values: {
    height: string;
    weight: string;
    goalWeight: string;
  }) => Promise<void>;
  saveActivityLevel: (value: ProfileBundle['activityLevel']) => Promise<void>;
  saveGoal: (value: ProfileBundle['goal']) => Promise<void>;
  saveUnits: (value: ProfileBundle['units']) => Promise<void>;
  saveTheme: (value: ProfileBundle['theme']) => Promise<void>;
  saveNotifications: (value: boolean) => Promise<void>;
  reset: () => void;
};

export const useProfileBundleStore = create<ProfileBundleState>((set, get) => ({
  bundle: DEFAULT_BUNDLE,
  isLoading: false,
  isSaving: false,
  hasLoaded: false,
  error: null,

  ensureLoaded: async () => {
    if (get().hasLoaded || get().isLoading) return;
    await get().refresh();
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const bundle = await loadProfileBundle();
      set({ bundle, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load profile data.',
        hasLoaded: true,
        isLoading: false,
      });
    }
  },

  savePersonalInfo: async (values) => {
    set({ isSaving: true, error: null });
    try {
      await updatePersonalInfo(values);
      set((state) => ({
        bundle: { ...state.bundle, ...values },
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save personal info.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveProfilePhoto: async (profilePhotoUri) => {
    set({ isSaving: true, error: null });
    try {
      await updateProfilePhoto(profilePhotoUri);
      set((state) => ({
        bundle: { ...state.bundle, profilePhotoUri },
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save profile photo.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveBodyMeasurements: async (values) => {
    set({ isSaving: true, error: null });
    try {
      // Persist in the user's active units so local-data can convert Imperial → metric.
      await updateBodyMeasurements({ ...values, units: get().bundle.units });
      const bundle = await loadProfileBundle();
      set({ bundle, isSaving: false, hasLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save measurements.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveActivityLevel: async (value) => {
    set({ isSaving: true, error: null });
    try {
      await updateActivityLevel(value);
      const bundle = await loadProfileBundle();
      set({ bundle, isSaving: false, hasLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save activity level.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveGoal: async (value) => {
    set({ isSaving: true, error: null });
    try {
      await updateGoal(value);
      const bundle = await loadProfileBundle();
      set({ bundle, isSaving: false, hasLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save goal.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveUnits: async (value) => {
    set({ isSaving: true, error: null });
    try {
      await updateUnits(value);
      set((state) => ({
        bundle: { ...state.bundle, units: value },
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save units.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveTheme: async (value) => {
    set({ isSaving: true, error: null });
    try {
      await updateTheme(value);
      set((state) => ({
        bundle: { ...state.bundle, theme: value },
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save theme.',
        isSaving: false,
      });
      throw error;
    }
  },

  saveNotifications: async (value) => {
    set({ isSaving: true, error: null });
    try {
      await updateNotifications(value);
      set((state) => ({
        bundle: { ...state.bundle, notifications: value },
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save notification preference.',
        isSaving: false,
      });
      throw error;
    }
  },

  reset: () =>
    set({
      bundle: DEFAULT_BUNDLE,
      hasLoaded: false,
      isLoading: false,
      isSaving: false,
      error: null,
    }),
}));
