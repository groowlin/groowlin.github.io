export interface LightboxContextMotionSettings {
  resizeStiffness: number;
  resizeDamping: number;
  resizeMass: number;
  informerStiffness: number;
  informerDamping: number;
  informerMass: number;
  textTravel: number;
  textDelay: number;
  fadeDelay: number;
  fadeDuration: number;
  titleDuration: number;
  radiusDuration: number;
}

export const DEFAULT_LIGHTBOX_CONTEXT_MOTION: LightboxContextMotionSettings = {
  resizeStiffness: 420,
  resizeDamping: 36,
  resizeMass: 1.6,
  informerStiffness: 800,
  informerDamping: 40,
  informerMass: 1.2,
  textTravel: 80,
  textDelay: 0.12,
  fadeDelay: 0.16,
  fadeDuration: 0.2,
  titleDuration: 0.06,
  radiusDuration: 0.4
};

