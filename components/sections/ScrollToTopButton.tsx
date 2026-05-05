"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
            <rect className={styles.background} width="36" height="68" rx="18" />
            <path
              className={styles.head}
              clipRule="evenodd"
              d="M18.3332 13.3578L24.1971 19.4392C24.6452 19.9038 24.6452 20.6398 24.1971 21.1045C23.7254 21.5937 22.9418 21.5937 22.4701 21.1045L18.3332 16.8142L17.5 15.9501L16.6668 16.8142L12.5299 21.1045C12.0582 21.5937 11.2746 21.5937 10.8029 21.1045C10.3548 20.6398 10.3548 19.9038 10.8029 19.4392L16.6668 13.3578C16.8878 13.1287 17.1875 13 17.5 13C17.8125 13 18.1122 13.1287 18.3332 13.3578Z"
              fillRule="evenodd"
            />
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
