"use client";

import { motion } from "framer-motion";
import { itemRevealVariants } from "@/components/motion/MotionPage";

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
