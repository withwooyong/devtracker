"use client";

import { useCallback, useRef } from "react";

/**
 * Tilt + Magnetic 효과 — 카드 위에서 마우스 위치를 감지해
 * 3D 회전(--tilt-x/--tilt-y)과 자석(--mag-x/--mag-y),
 * 스포트라이트(--pointer-x/--pointer-y, --tilt-glow)를 CSS 변수로 내보낸다.
 *
 * DnD 중에는 비활성화 (아래에서 `active`로 제어).
 */
export function useTilt(options?: {
  max?: number; // 최대 회전 각도 (deg)
  magnet?: number; // 자석 변위 (px)
  active?: boolean;
}) {
  const { max = 6, magnet = 4, active = true } = options ?? {};
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nx = (px - cx) / cx; // -1..1
      const ny = (py - cy) / cy; // -1..1

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        node.style.setProperty("--tilt-y", `${nx * max}deg`);
        node.style.setProperty("--tilt-x", `${-ny * max}deg`);
        node.style.setProperty("--mag-x", `${nx * magnet}px`);
        node.style.setProperty("--mag-y", `${ny * magnet}px`);
        node.style.setProperty("--pointer-x", `${(px / rect.width) * 100}%`);
        node.style.setProperty("--pointer-y", `${(py / rect.height) * 100}%`);
        node.style.setProperty("--tilt-glow", "1");
      });
    },
    [active, max, magnet]
  );

  const reset = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--mag-x", "0px");
    node.style.setProperty("--mag-y", "0px");
    node.style.setProperty("--tilt-glow", "0");
  }, []);

  return { ref, onPointerMove, onPointerLeave: reset, onPointerDown: reset };
}
