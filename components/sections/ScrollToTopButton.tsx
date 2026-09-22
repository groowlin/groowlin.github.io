"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ScrollArrowHead } from "@/components/navigation/ScrollArrowHead";
import styles from "@/components/sections/scroll-to-top-button.module.css";

const VISIBILITY_VIEWPORT_RATIO = 0.5;

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  useEffect(() => {
    const updateVisibility = () => {
      const threshold = window.innerHeight * VISIBILITY_VIEWPORT_RATIO;
      setIsVisible(window.scrollY > threshold);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  if (!isHydrated) {
    return null;
  }

  return createPortal(
    <button
      aria-label="Прокрутить наверх"
      className={styles.button}
      data-visible={isVisible}
      onClick={handleClick}
      tabIndex={isVisible ? 0 : -1}
      type="button"
    >
      <span aria-hidden="true" className={styles.visual}>
        <span className={styles.iconFrame}>
          <svg
            className={styles.icon}
            fill="none"
            viewBox="0 0 36 68"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ScrollArrowHead backgroundClassName={styles.background} headClassName={styles.head} />
            <rect
              className={styles.shaft}
              height="38.6327"
              rx="1.12665"
              width="2.2533"
              x="16.3872"
              y="16.8668"
            />
          </svg>
        </span>
      </span>
    </button>,
    document.body
  );
}
