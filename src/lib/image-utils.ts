/**
 * Client-side utility for processing, restricting dimensions (max 1024x1024),
 * and compressing images before saving/uploading.
 */
export async function resizeImageToMaxDimension(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (JPEG, PNG, WebP)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2D canvas context for image resizing."));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight Data URL (JPEG/WebP)
        const outputFormat = file.type === "image/png" && !hasTransparency(ctx, width, height)
          ? "image/jpeg"
          : file.type || "image/jpeg";

        const resizedDataUrl = canvas.toDataURL(outputFormat, quality);
        resolve(resizedDataUrl);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for processing."));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, Math.min(width, 50), Math.min(height, 50)).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 255) return true;
    }
  } catch {
    // Ignore error and default to false
  }
  return false;
}
