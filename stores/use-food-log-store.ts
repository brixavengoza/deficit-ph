import { create } from 'zustand';

export type LoggedFoodEntry = {
  id: string;
  foodName: string;
  kcalPer100g: number;
  quantity: number;
  unit: 'grams' | 'oz' | 'servings';
  gramsEquivalent: number;
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  logTime: string;
  totalKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  createdAtIso: string;
};

type AddLoggedFoodInput = Omit<LoggedFoodEntry, 'id' | 'createdAtIso'>;
type UpdateLoggedFoodPatch = Partial<
  Omit<LoggedFoodEntry, 'id' | 'createdAtIso' | 'kcalPer100g' | 'foodName'>
>;

type FoodLogStoreState = {
  loggedFoods: LoggedFoodEntry[];
  addLoggedFood: (input: AddLoggedFoodInput) => void;
  updateLoggedFood: (id: string, patch: UpdateLoggedFoodPatch) => void;
  removeLoggedFood: (id: string) => void;
  clearLoggedFoods: () => void;
};

export const useFoodLogStore = create<FoodLogStoreState>((set) => ({
  loggedFoods: [],
  addLoggedFood: (input) =>
    set((state) => ({
      loggedFoods: [
        {
          ...input,
          id: `food-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAtIso: new Date().toISOString(),
        },
        ...state.loggedFoods,
      ],
    })),
  updateLoggedFood: (id, patch) =>
    set((state) => ({
      loggedFoods: state.loggedFoods.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  removeLoggedFood: (id) =>
    set((state) => ({
      loggedFoods: state.loggedFoods.filter((item) => item.id !== id),
    })),
  clearLoggedFoods: () => set({ loggedFoods: [] }),
}));
