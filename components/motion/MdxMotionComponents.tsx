"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { Variants } from "framer-motion";
import { itemRevealVariants } from "@/components/motion/MotionPage";

const mdxGroupVariants: Variants = {
  initial: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export function MdxDiv(props: HTMLMotionProps<"div">) {
  return <motion.div variants={mdxGroupVariants} {...props} />;
}

export function MdxH2(props: HTMLMotionProps<"h2">) {
  return <motion.h2 variants={itemRevealVariants} {...props} />;
}

export function MdxH3(props: HTMLMotionProps<"h3">) {
  return <motion.h3 variants={itemRevealVariants} {...props} />;
}

export function MdxP(props: HTMLMotionProps<"p">) {
  return <motion.p variants={itemRevealVariants} {...props} />;
}

export function MdxUl(props: HTMLMotionProps<"ul">) {
  return <motion.ul variants={mdxGroupVariants} {...props} />;
}

export function MdxOl(props: HTMLMotionProps<"ol">) {
  return <motion.ol variants={mdxGroupVariants} {...props} />;
}

export function MdxLi(props: HTMLMotionProps<"li">) {
  return <motion.li variants={itemRevealVariants} {...props} />;
}

export function MdxBlockquote(props: HTMLMotionProps<"blockquote">) {
  return <motion.blockquote variants={mdxGroupVariants} {...props} />;
}

export function MdxSection(props: HTMLMotionProps<"section">) {
  return <motion.section variants={mdxGroupVariants} {...props} />;
}

export function MdxMediaBlock(props: HTMLMotionProps<"div">) {
  return <motion.div variants={itemRevealVariants} {...props} />;
}
