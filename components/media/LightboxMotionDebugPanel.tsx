"use client";

import styles from "@/components/media/lightbox-motion-debug-panel.module.css";

import { DEFAULT_LIGHTBOX_CONTEXT_MOTION, type LightboxContextMotionSettings } from "./lightbox-motion-settings";

const CONTROLS: ReadonlyArray<{
  key: keyof LightboxContextMotionSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  { key: "resizeStiffness", label: "Resize stiffness", min: 20, max: 500, step: 5 },
  { key: "resizeDamping", label: "Resize damping", min: 2, max: 60, step: 1 },
  { key: "resizeMass", label: "Resize mass", min: 0.2, max: 4, step: 0.1 },
  { key: "informerStiffness", label: "Informer stiffness", min: 100, max: 3000, step: 50 },
  { key: "informerDamping", label: "Informer damping", min: 1, max: 60, step: 1 },
  { key: "informerMass", label: "Informer mass", min: 0.05, max: 2, step: 0.05 },
  { key: "textTravel", label: "Text travel", min: 0, max: 160, step: 5, unit: "px" },
  { key: "textDelay", label: "Text rise delay", min: 0, max: 0.8, step: 0.01, unit: "s" },
  { key: "fadeDelay", label: "Fade delay", min: 0, max: 0.8, step: 0.01, unit: "s" },
  { key: "fadeDuration", label: "Fade duration", min: 0, max: 1.2, step: 0.01, unit: "s" },
  { key: "titleDuration", label: "Title crossfade", min: 0, max: 1.2, step: 0.01, unit: "s" },
  { key: "radiusDuration", label: "Radius duration", min: 0, max: 1.2, step: 0.01, unit: "s" }
];

interface LightboxMotionDebugPanelProps {
  settings: LightboxContextMotionSettings;
  onChange: (settings: LightboxContextMotionSettings) => void;
}

export function LightboxMotionDebugPanel({ settings, onChange }: LightboxMotionDebugPanelProps) {
  return (
    <section
      className={styles.panel}
      data-lightbox-debug-panel="true"
      aria-label="Настройка анимации текстового превью"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key.startsWith("Arrow")) event.stopPropagation();
      }}
    >
      <div className={styles.header}>
        <strong>Lightbox context motion</strong>
        <button type="button" className={styles.reset} onClick={() => onChange(DEFAULT_LIGHTBOX_CONTEXT_MOTION)}>
          Reset
        </button>
      </div>
      <div className={styles.controls}>
        {CONTROLS.map(({ key, label, min, max, step, unit }) => (
          <label className={styles.control} key={key}>
            <span className={styles.label}>
              <span>{label}</span>
              <output>{settings[key]}{unit}</output>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(event) => onChange({ ...settings, [key]: Number(event.currentTarget.value) })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
