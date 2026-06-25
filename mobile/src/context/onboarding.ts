import { createContext, useContext } from 'react';

export interface OnboardingCtx {
  completeOnboarding: () => Promise<void>;
}

export const OnboardingContext = createContext<OnboardingCtx>({
  completeOnboarding: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);
