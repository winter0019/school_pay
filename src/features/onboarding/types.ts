export interface OnboardingData {
  username: string;
  bio: string;

  country: string;
  language: string;

  interests: string[];

  goals: string[];

  personality: string;
}

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}