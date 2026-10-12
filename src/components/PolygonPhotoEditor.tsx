import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { NormalizedPoint } from "../services/polygonSelection";

export type SelectionTool = "pen" | "box";

type Props = {
  src: string;
  points: NormalizedPoint[];
  active: boolean;
  complete: boolean;
  tool: SelectionTool;
  onPointsChange: (points: NormalizedPoint[]) => void;
  onFinish: (points: NormalizedPoint[]) => void;
};

export function PolygonPhotoEditor({ src, points, active, complete, tool, onPointsChange, onFinish }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef(false);
  const startPointRef = useRef<NormalizedPoint | null>(null);
  const workingPointsRef = useRef<NormalizedPoint[]>([]);
  const [frameSize, setFrameSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function pointAt(event: PointerEvent<SVGSVGElement>, clamp = false): NormalizedPoint | null {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image?.naturalWidth || !image.naturalHeight) return null;
    const rect = frame.getBoundingClientRect();
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    const left = (width - imageWidth) / 2;
    const top = (height - imageHeight) / 2;
    const x = (event.clientX - rect.left - frame.clientLeft - left) / imageWidth;
    const y = (event.clientY - rect.top - frame.clientTop - top) / imageHeight;
    if (!clamp && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  function boxPoints(start: NormalizedPoint, end: NormalizedPoint): NormalizedPoint[] {
    return [
      start,
      { x: end.x, y: start.y },
      end,
      { x: start.x, y: end.y },
    ];
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!active || complete) return;
    const point = pointAt(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    startPointRef.current = point;
    const initial = tool === "box" ? boxPoints(point, point) : [point];
    workingPointsRef.current = initial;
    onPointsChange(initial);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    event.preventDefault();
    const point = pointAt(event, true);
    const start = startPointRef.current;
    if (!point || !start) return;
    if (tool === "box") {
      const next = boxPoints(start, point);
      workingPointsRef.current = next;
      onPointsChange(next);
      return;
    }
    const previous = workingPointsRef.current;
    const last = previous[previous.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 0.003) {
      const next = [...previous, point].slice(-1200);
      workingPointsRef.current = next;
      onPointsChange(next);
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    event.preventDefault();
    const point = pointAt(event, true);
    const start = startPointRef.current;
    if (point && start && tool === "box") workingPointsRef.current = boxPoints(start, point);
    else if (point && tool === "pen") {
      const previous = workingPointsRef.current;
      const last = previous[previous.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 0.0005) {
        workingPointsRef.current = [...previous, point].slice(-1200);
      }
    }
    const finished = workingPointsRef.current;
    draggingRef.current = false;
    startPointRef.current = null;
    onPointsChange(finished);
    if (tool === "pen" ? finished.length >= 3 : finished.length === 4 &&
      Math.abs(finished[0].x - finished[2].x) >= 0.02 && Math.abs(finished[0].y - finished[2].y) >= 0.02) {
      onFinish(finished);
    }
  }

  const image = imageRef.current;
  const scale = image?.naturalWidth && image.naturalHeight
    ? Math.min(frameSize.width / image.naturalWidth, frameSize.height / image.naturalHeight)
    : 1;
  const drawnWidth = (image?.naturalWidth ?? frameSize.width) * scale;
  const drawnHeight = (image?.naturalHeight ?? frameSize.height) * scale;
  const offsetX = (frameSize.width - drawnWidth) / 2;
  const offsetY = (frameSize.height - drawnHeight) / 2;
  const svgPoints = points.map(({ x, y }) => `${offsetX + x * drawnWidth},${offsetY + y * drawnHeight}`).join(" ");

  return (
    <div className={`polygon-photo-frame${active ? " is-drawing" : ""}`} ref={frameRef}>
      <img ref={imageRef} className="photo-preview polygon-photo" src={src} alt="Photo to turn into a sticker" onLoad={() => setFrameSize((size) => ({ ...size }))} />
      {(active || points.length > 0) && <svg
        className={`polygon-overlay${active ? " is-active" : ""}`}
        viewBox={`0 0 ${frameSize.width} ${frameSize.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={tool === "box" ? "Drag a rectangle around the object" : "Draw around the object with one continuous stroke"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {points.length > 0 && (complete
          ? <polygon className="selection-area" points={svgPoints} />
          : <polyline className="selection-line" points={svgPoints} />)}
      </svg>}
    </div>
  );
}
