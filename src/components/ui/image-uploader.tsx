"use client";

import React, { useRef, useState } from "react";
import { resizeImageToMaxDimension } from "@/lib/image-utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  label: string;
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  maxDimension?: number;
  aspectRatio?: "square" | "wide";
  placeholderText?: string;
}

export function ImageUploader({
  label,
  value,
  onChange,
  maxDimension = 1024,
  aspectRatio = "square",
  placeholderText = "Upload image (Max 1024x1024)",
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const resized = await resizeImageToMaxDimension(file, maxDimension);
      onChange(resized);
      toast.success("Image processed and scaled to max 1024x1024!");
    } catch (err: any) {
      toast.error(err.message || "Failed to process image");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-muted-foreground font-normal">Max 1024×1024</span>
      </label>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition bg-muted/30 overflow-hidden flex flex-col items-center justify-center p-3 group ${
          aspectRatio === "wide" ? "h-36" : "h-28"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {value ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={value}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow transition"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
              {processing ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {processing ? "Optimizing image..." : placeholderText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generic Fallback Icon / Avatar for Brands, Products, and Categories
 */
export function GenericProduceImage({
  src,
  alt,
  className = "h-12 w-12 rounded-2xl object-cover",
  fallbackType = "product",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: "product" | "brand" | "category";
}) {
  const [imgError, setImgError] = useState(false);

  if (src && src.trim() !== "" && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback Generic Placeholder
  const bgColor =
    fallbackType === "brand"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : fallbackType === "category"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className={`flex items-center justify-center font-bold text-xs shadow-inner border ${bgColor} ${className}`}>
      {alt ? alt.charAt(0).toUpperCase() : <ImageIcon className="h-4 w-4" />}
    </div>
  );
}
