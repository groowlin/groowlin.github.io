"use client";

import { motion } from "framer-motion";
import { contentRevealVariants, itemRevealVariants } from "@/components/motion/MotionPage";

interface MotionItemProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionItem({ children, className }: MotionItemProps) {
  return (
    <motion.div className={className} variants={itemRevealVariants}>
      {children}
    </motion.div>
  );
}

export function MotionGroup({ children, className }: MotionItemProps) {
  return (
    <motion.div className={className} variants={contentRevealVariants}>
      {children}
    </motion.div>
  );
}
