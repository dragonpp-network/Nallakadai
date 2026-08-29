"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LottiePlayer = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  ),
});

interface LottieAnimationProps {
  animationData?: any;
  src?: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LottieAnimation({
  animationData,
  src = "/lottie/shiksha-loading.json",
  loop = true,
  autoplay = true,
  className = "w-40 h-40",
  style,
}: LottieAnimationProps) {
  const [data, setData] = useState<any>(animationData || null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!animationData && src) {
      fetch(src)
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch((err) => console.error("Failed to load Lottie JSON:", err));
    }
  }, [animationData, src]);

  if (!mounted || !data) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} style={style}>
      <LottiePlayer animationData={data} loop={loop} autoplay={autoplay} />
    </div>
  );
}
