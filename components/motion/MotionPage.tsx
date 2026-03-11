"use client";

import { motion, type Variants } from "framer-motion";

const springSoft = { type: "spring" as const, duration: 0.8, bounce: 0.3 };
const springLoose = { type: "spring" as const, duration: 1.4, bounce: 0.3 };

export const pageRevealVariants: Variants = {
  initial: { opacity: 0, filter: "blur(8px)", y: 16 },
  visible: {
    opacity: 1,
    filter: "blur(0)",
    y: 0,
    transition: {
      staggerChildren: 0.08,
      y: springLoose,
      opacity: { duration: 0.7 },
      filter: { duration: 0.7 }
    }
  }
};

export const itemRevealVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { y: springSoft } }
};

interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionPage({ children, className }: MotionPageProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="visible"
      variants={pageRevealVariants}
    >
      {children}
    </motion.div>
  );
}
