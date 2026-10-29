"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import tankPng from "@/public/brand/fiesta-gas-tank.png";

const MAX_TILT = 12;

type Tank3DProps = {
  className?: string;
};

export function Tank3D({ className }: Tank3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Normalized pointer position in [-1, 1]; 0,0 = centered / idle.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // Pointer presence, 1 while hovering so idle float pauses smoothly.
  const hover = useMotionValue(0);

  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);
  const sHover = useSpring(hover, { stiffness: 80, damping: 20 });

  const rotateY = useTransform(sx, [-1, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-1, 1], [MAX_TILT, -MAX_TILT]);

  // Specular highlight drifts opposite to the tilt so it reads as a light source.
  const glossX = useTransform(sx, [-1, 1], ["70%", "30%"]);
  const glossY = useTransform(sy, [-1, 1], ["55%", "15%"]);
  const gloss = useTransform(
    [glossX, glossY],
    ([x, y]) =>
      `radial-gradient(ellipse 38% 45% at ${x} ${y}, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 35%, rgba(255,255,255,0) 70%)`,
  );

  // Shadow slides slightly against the tilt and softens when hovering (tank lifts).
  const shadowX = useTransform(sx, [-1, 1], [14, -14]);
  const shadowScale = useTransform(sHover, [0, 1], [1, 0.9]);
  const shadowOpacity = useTransform(sHover, [0, 1], [0.55, 0.4]);
  const lift = useTransform(sHover, [0, 1], [0, -10]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      px.set(Math.max(-1, Math.min(1, x)));
      py.set(Math.max(-1, Math.min(1, y)));
      hover.set(1);
    },
    [px, py, hover],
  );

  const onPointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
    hover.set(0);
  }, [px, py, hover]);

  const floatAnim = reduceMotion
    ? undefined
    : { y: [0, -14, 0], rotate: [0, 0.8, 0, -0.8, 0] };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`relative select-none ${className ?? ""}`}
      style={{ perspective: 1100 }}
    >
      {/* Halo / glow ring behind the tank */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          className="h-[78%] w-[78%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(11,95,255,0.55) 0%, rgba(11,95,255,0.22) 45%, rgba(11,95,255,0) 72%)",
            filter: "blur(18px)",
          }}
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute h-[72%] w-[72%] rounded-full"
          style={{
            border: "1.5px solid rgba(11,95,255,0.45)",
            boxShadow:
              "0 0 40px rgba(11,95,255,0.45), inset 0 0 40px rgba(11,95,255,0.25)",
          }}
        />
        <div
          className="absolute h-[86%] w-[86%] rounded-full"
          style={{ border: "1px solid rgba(11,95,255,0.18)" }}
        />
      </div>

      {/* Ground shadow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[4%] h-[9%] w-[62%] -translate-x-1/2 rounded-[100%]"
        style={{
          x: shadowX,
          scaleX: shadowScale,
          opacity: shadowOpacity,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0) 72%)",
          filter: "blur(6px)",
        }}
        animate={reduceMotion ? undefined : { scaleY: [1, 0.78, 1], opacity: [0.55, 0.38, 0.55] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Tilting tank */}
      <motion.div
        className="relative h-full w-full"
        style={{
          rotateX,
          rotateY,
          y: lift,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <motion.div
          className="relative h-full w-full"
          animate={floatAnim}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <Image
            src={tankPng}
            alt="Fiesta Gas 11kg LPG tank"
            width={480}
            height={640}
            priority
            draggable={false}
            className="h-full w-full object-contain drop-shadow-[0_24px_40px_rgba(11,95,255,0.35)]"
          />
          {/* Specular highlight, masked to the tank silhouette */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: gloss,
              mixBlendMode: "screen",
              WebkitMaskImage: `url(${tankPng.src})`,
              maskImage: `url(${tankPng.src})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Tank3D;
