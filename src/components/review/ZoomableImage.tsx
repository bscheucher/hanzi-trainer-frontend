"use client";

import { useState } from "react";

/** Page photo that toggles between fitting the column and its natural size (scrollable). */
export default function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <figure className="flex flex-col gap-2">
      <div className={`overflow-auto rounded border border-border ${zoomed ? "max-h-[80vh]" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimisable */}
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={zoomed ? "max-w-none cursor-zoom-out" : "w-full cursor-zoom-in"}
        />
      </div>
      <button onClick={() => setZoomed((z) => !z)} className="self-start text-sm text-muted hover:text-foreground">
        {zoomed ? "Fit to column" : "Zoom in"}
      </button>
    </figure>
  );
}
