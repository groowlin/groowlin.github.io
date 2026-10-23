"use client";

import { type ComponentProps, type ComponentType, type Ref, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { GameFrame } from "./GameFrame";
import { PIXEL_PERFECT_COPY } from "./pixel-perfect-copy";
import styles from "./games-entry.module.css";

type ShellProps = ComponentProps<typeof import("./GameModeShell").GameModeShell>;
export interface DeferredGameModeShellHandle { ensureReady: () => Promise<void>; }
let runtimePromise: Promise<ComponentType<ShellProps>> | null = null;
function loadRuntime() {
  runtimePromise ??= import("./GameModeShell").then((module) => module.GameModeShell).catch((error: unknown) => { runtimePromise = null; throw error; });
  return runtimePromise;
}

export function DeferredGameModeShell({ ref, ...props }: ShellProps & { ref: Ref<DeferredGameModeShellHandle> }) {
  const [Runtime, setRuntime] = useState<ComponentType<ShellProps> | null>(null);
  const mountedRef = useRef(false);
  const committedRef = useRef(false);
  const waitersRef = useRef(new Set<{ resolve: () => void; reject: (error: Error) => void }>());
  useLayoutEffect(() => {
    mountedRef.current = true;
    const waiters = waitersRef.current;
    return () => {
      mountedRef.current = false;
      committedRef.current = false;
      for (const waiter of waiters) waiter.reject(new DOMException("Games runtime unmounted", "AbortError"));
      waiters.clear();
    };
  }, []);
  useLayoutEffect(() => {
    if (!Runtime) return;
    committedRef.current = true;
    for (const waiter of waitersRef.current) waiter.resolve();
    waitersRef.current.clear();
  }, [Runtime]);
  const ensureReady = useCallback(async () => {
    if (committedRef.current) return;
    const Component = await loadRuntime();
    if (!mountedRef.current) throw new DOMException("Games runtime unmounted", "AbortError");
    if (committedRef.current) return;
    await new Promise<void>((resolve, reject) => {
      waitersRef.current.add({ resolve, reject });
      setRuntime(() => Component);
    });
  }, []);
  useImperativeHandle(ref, () => ({ ensureReady }), [ensureReady]);
  return Runtime ? <Runtime {...props} /> : (
    <GameFrame label={props.session.currentGameId === "characters" ? "Симулятор руководителя" : "Pixel Perfect"} footer={props.session.currentGameId === "characters" ? undefined : <button className={styles.testWinButton} type="button" disabled>{PIXEL_PERFECT_COPY.testWin}</button>}>
      {null}
    </GameFrame>
  );
}
