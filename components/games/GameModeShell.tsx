import type { GamesSession } from "./session";
import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GameProgress } from "./game-logic";
import { GameFrame } from "./GameFrame";
import { PixelPerfect, type PixelPerfectHandle } from "./PixelPerfect";
import { CharacterPlayground } from "./CharacterPlayground";
import styles from "./games-entry.module.css";
import { PIXEL_PERFECT_COPY } from "./pixel-perfect-copy";
import { AI_TUNING_FIELDS, BALANCE_TUNING_FIELDS, GAME_TUNING_FIELDS, LANDING_TUNING_FIELDS, SHADOW_TUNING_FIELDS, THRESHOLD_TUNING_FIELDS, TRAIL_TUNING_FIELDS, TRANSITION_TUNING_FIELDS, createCeoRuntimeTuning, normalizeCeoRuntimeTuning, type CeoRuntimeTuning, type NumberField } from "./ceo-simulator/runtime-tuning";

const GAME_SEQUENCE = ["pixel-perfect", "characters"] as const;

function TuningInput({ field, value, onValue }: { field: NumberField; value: number; onValue: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const commit = (text: string) => {
    setDraft(text);
    const parsed = Number(text);
    if (text.trim() && Number.isFinite(parsed)) onValue(parsed);
  };
  return <label className={styles.tuningField}><span>{field.label}</span><input type="number" min={field.min} max={field.max} step={field.step} value={focused ? draft : String(value)} onFocus={() => { setDraft(String(value)); setFocused(true); }} onChange={(event) => commit(event.target.value)} onBlur={() => setFocused(false)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
}

function TuningGroup({ title, fields, values, onValue }: { title: string; fields: readonly NumberField[]; values: Record<string, number>; onValue: (key: string, value: number) => void }) {
  return <fieldset className={styles.tuningGroup}><legend>{title}</legend>{fields.map((field) => <TuningInput key={field.key} field={field} value={values[field.key]} onValue={(value) => onValue(field.key, value)} />)}</fieldset>;
}

export function GameModeShell({ session, active, resetWhenHidden, onProgress, onResult, onGameChange, onSequenceComplete }: {
  session: GamesSession;
  active: boolean;
  resetWhenHidden: boolean;
  onProgress: (progress: GameProgress) => void;
  onResult: (outcome: "failure" | "win" | "out-of-bounds" | "overlap", gap?: number) => void;
  onGameChange?: (id: GamesSession["currentGameId"]) => void;
  onSequenceComplete?: () => void;
}) {
  const gameRef = useRef<PixelPerfectHandle>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [{ runtimeRef, initialTuning }] = useState(() => { const initial = createCeoRuntimeTuning(); return { runtimeRef: { current: initial }, initialTuning: initial }; });
  const [tuning, setTuning] = useState(initialTuning);
  const [restartCommand, setRestartCommand] = useState(0);
  const getTuning = useCallback(() => runtimeRef.current, [runtimeRef]);
  const updateTuning = (makeNext: (current: CeoRuntimeTuning) => CeoRuntimeTuning) => setTuning((current) => { const next = normalizeCeoRuntimeTuning(makeNext(current)); runtimeRef.current = next; return next; });
  const setGroupValue = (group: "game" | "shadow" | "ai" | "trail" | "landing" | "balance" | "thresholds" | "transition", key: string, value: number) => updateTuning((current) => ({ ...current, [group]: { ...current[group], [key]: value } } as CeoRuntimeTuning));
  if (resetWhenHidden && transitioning) setTransitioning(false);
  const currentIndex = GAME_SEQUENCE.indexOf(session.currentGameId);
  const nextGameId = GAME_SEQUENCE[currentIndex + 1] ?? null;
  const isPlayground = session.currentGameId === "characters";
  const showPlayground = isPlayground || (transitioning && active);
  const onNext = () => {
    if (!active || transitioning) return;
    if (nextGameId) setTransitioning(true);
    else onSequenceComplete?.();
  };
  const tuningPanel = <aside className={styles.tuningPanel} aria-label="Временные параметры CEO Simulator">
    <strong>Параметры игры</strong>
    <TuningGroup title="Физика" fields={GAME_TUNING_FIELDS} values={tuning.game} onValue={(key, value) => setGroupValue("game", key, value)} />
    <TuningGroup title="Тень" fields={SHADOW_TUNING_FIELDS} values={tuning.shadow} onValue={(key, value) => setGroupValue("shadow", key, value)} />
    <TuningGroup title="AI" fields={AI_TUNING_FIELDS} values={tuning.ai} onValue={(key, value) => setGroupValue("ai", key, value)} />
    <TuningGroup title="Баланс" fields={BALANCE_TUNING_FIELDS} values={tuning.balance} onValue={(key, value) => setGroupValue("balance", key, value)} />
    <TuningGroup title="Пороги зон" fields={THRESHOLD_TUNING_FIELDS} values={tuning.thresholds} onValue={(key, value) => setGroupValue("thresholds", key, value)} />
    <TuningGroup title="Переходы" fields={TRANSITION_TUNING_FIELDS} values={tuning.transition} onValue={(key, value) => setGroupValue("transition", key, value)} />
    <TuningGroup title="Trail" fields={TRAIL_TUNING_FIELDS} values={tuning.trail} onValue={(key, value) => setGroupValue("trail", key, value)} />
    <TuningGroup title="Landing" fields={LANDING_TUNING_FIELDS} values={tuning.landing} onValue={(key, value) => setGroupValue("landing", key, value)} />
    <div className={styles.tuningActions}><button type="button" onClick={() => setRestartCommand((value) => value + 1)}>Перезапустить игру</button><button type="button" onClick={() => { const defaults = createCeoRuntimeTuning(); runtimeRef.current = defaults; setTuning(defaults); setRestartCommand((value) => value + 1); }}>Сбросить параметры</button></div>
  </aside>;
  return (
    <GameFrame label={isPlayground ? "Симулятор руководителя" : "Pixel Perfect"} footer={isPlayground ? tuningPanel : <button className={styles.testWinButton} type="button" disabled={!active || transitioning} onClick={() => gameRef.current?.testWin()}>{PIXEL_PERFECT_COPY.testWin}</button>}>
      {!isPlayground && <PixelPerfect
        ref={gameRef}
        active={active}
        resetWhenHidden={resetWhenHidden}
        progress={session.games["pixel-perfect"]}
        title={PIXEL_PERFECT_COPY.title}
        description={PIXEL_PERFECT_COPY.description}
        onProgress={onProgress}
        onResult={onResult}
        onComplete={onNext}
      />}
      {showPlayground && <motion.div
        key="characters"
        style={{ position: "absolute", inset: 0, zIndex: 10, borderRadius: "inherit" }}
        initial={isPlayground ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onAnimationComplete={() => {
          if (!active || !transitioning || !nextGameId) return;
          onGameChange?.(nextGameId);
          setTransitioning(false);
        }}
      >
        <CharacterPlayground active={active && isPlayground} resetWhenHidden={resetWhenHidden} getTuning={getTuning} restartCommand={restartCommand} />
      </motion.div>}
    </GameFrame>
  );
}
