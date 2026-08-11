import { create } from "zustand";
import { TOTAL_STEPS } from "@/features/onboarding/constants";

export interface OnboardingData {
  username: string;
  bio: string;

  country: string;
  language: string;

  interests: string[];
  goals: string[];

  personality: string;
  personalityDescription: string;
}

interface OnboardingStore {
  step: number;
  data: OnboardingData;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;

  // Data
  updateData: (values: Partial<OnboardingData>) => void;

  updateField: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => void;

  getData: () => OnboardingData;

  // Helpers
  isComplete: () => boolean;
  getProgress: () => number;
  reset: () => void;
}

const initialData: OnboardingData = {
  username: "",
  bio: "",

  country: "",
  language: "",

  interests: [],
  goals: [],

  personality: "",
  personalityDescription: "",
};

const cloneInitialData = (): OnboardingData => ({
  ...initialData,
  interests: [...initialData.interests],
  goals: [...initialData.goals],
});

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  step: 1,

  data: cloneInitialData(),

  // ----------------------------
  // Navigation
  // ----------------------------

  nextStep: () =>
    set((state) => ({
      step: Math.min(state.step + 1, TOTAL_STEPS),
    })),

  previousStep: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 1),
    })),

  setStep: (step) =>
    set({
      step: Math.max(1, Math.min(step, TOTAL_STEPS)),
    }),

  // ----------------------------
  // Data
  // ----------------------------

  updateData: (values) =>
    set((state) => ({
      data: {
        ...state.data,
        ...values,
      },
    })),

  updateField: (field, value) =>
    set((state) => ({
      data: {
        ...state.data,
        [field]: value,
      },
    })),

  getData: () => get().data,

  // ----------------------------
  // Helpers
  // ----------------------------

  isComplete: () => {
    const { data } = get();

    return (
      data.username.trim().length > 0 &&
      data.country.trim().length > 0 &&
      data.language.trim().length > 0 &&
      data.interests.length > 0 &&
      data.goals.length > 0 &&
      data.personality.trim().length > 0
    );
  },

  getProgress: () => {
    const { step } = get();

    return Math.round((step / TOTAL_STEPS) * 100);
  },

  reset: () =>
    set({
      step: 1,
      data: cloneInitialData(),
    }),
}));