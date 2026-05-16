import { create } from 'zustand';

export type SavedFood = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  servingSizeLabel?: string;
  source: 'user' | 'seed';
  createdAtIso: string;
  updatedAtIso: string;
};

type CreateSavedFoodInput = Omit<SavedFood, 'id' | 'createdAtIso' | 'updatedAtIso'>;
type UpdateSavedFoodInput = Partial<Omit<SavedFood, 'id' | 'createdAtIso' | 'source'>> & {
  id: string;
};

type SavedFoodStoreState = {
  savedFoods: SavedFood[];
  savedFoodsLimit: number | null;
  addSavedFood: (input: CreateSavedFoodInput) => SavedFood;
  upsertSavedFoodByName: (input: CreateSavedFoodInput) => SavedFood;
  updateSavedFood: (input: UpdateSavedFoodInput) => void;
  removeSavedFood: (id: string) => void;
  clearSavedFoods: () => void;
  hydrateSavedFoodsFromServer: (foods: SavedFood[]) => void;
};

function normalizeFoodName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function createSavedFoodRecord(input: CreateSavedFoodInput): SavedFood {
  const nowIso = new Date().toISOString();
  return {
    ...input,
    name: input.name.trim(),
    id: `saved-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

export const useSavedFoodStore = create<SavedFoodStoreState>((set) => ({
  savedFoods: [],
  savedFoodsLimit: null,

  addSavedFood: (input) => {
    let nextFood: SavedFood | null = null;
    set((state) => {
      nextFood = createSavedFoodRecord(input);
      return { savedFoods: [nextFood, ...state.savedFoods] };
    });
    return nextFood!;
  },

  upsertSavedFoodByName: (input) => {
    const normalizedName = normalizeFoodName(input.name);
    let result: SavedFood | null = null;

    set((state) => {
      const existing = state.savedFoods.find(
        (food) => normalizeFoodName(food.name) === normalizedName
      );
      if (!existing) {
        result = createSavedFoodRecord(input);
        return { savedFoods: [result, ...state.savedFoods] };
      }

      result = {
        ...existing,
        ...input,
        name: input.name.trim(),
        updatedAtIso: new Date().toISOString(),
      };

      return {
        savedFoods: state.savedFoods.map((food) => (food.id === existing.id ? result! : food)),
      };
    });

    return result!;
  },

  updateSavedFood: ({ id, ...patch }) =>
    set((state) => ({
      savedFoods: state.savedFoods.map((food) =>
        food.id === id ? { ...food, ...patch, updatedAtIso: new Date().toISOString() } : food
      ),
    })),

  removeSavedFood: (id) =>
    set((state) => ({
      savedFoods: state.savedFoods.filter((food) => food.id !== id),
    })),

  clearSavedFoods: () => set({ savedFoods: [] }),

  hydrateSavedFoodsFromServer: (foods) => set({ savedFoods: foods }),
}));
