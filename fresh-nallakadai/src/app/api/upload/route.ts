import { NextRequest, NextResponse } from "next/server";
import { saveBase64ImageToUploads, saveUploadedImageBuffer } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON payload with dataUrl
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { dataUrl, prefix = "img" } = body;

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
      }

      const fileUrl = saveBase64ImageToUploads(dataUrl, prefix);
      if (!fileUrl) {
        return NextResponse.json({ error: "Failed to process image format" }, { status: 400 });
      }

      return NextResponse.json({ success: true, url: fileUrl });
    }

    // 2. FormData / Multipart upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const prefix = (formData.get("prefix") as string) || "img";

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "webp";

      const saved = saveUploadedImageBuffer(buffer, ext, prefix);
      return NextResponse.json({ success: true, url: saved.url });
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  } catch (err: any) {
    console.error("Upload API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload image" }, { status: 500 });
  }
}
