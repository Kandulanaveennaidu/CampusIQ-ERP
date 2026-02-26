import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { uploadToCloudinary, validateFile, parseFormData } from "@/lib/upload";
import { logRequest, logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("upload:write");
    if (error) return error;

    logRequest(
      "POST",
      "/api/upload",
      session!.user.id,
      session!.user.school_id,
    );

    const { fields, files } = await parseFormData(request);

    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const file = files[0];
    const validation = validateFile(file, {
      maxSizeMB: 5,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const folder = fields.folder || `campusiq/${session!.user.school_id}`;

    try {
      const result = await uploadToCloudinary(file.data, file.name, { folder });
      return NextResponse.json({
        success: true,
        data: {
          url: result.url,
          public_id: result.publicId,
          format: result.format,
          size: result.size,
          width: result.width,
          height: result.height,
        },
      });
    } catch (uploadErr) {
      // If Cloudinary is not configured, return error with guidance
      return NextResponse.json(
        {
          error:
            uploadErr instanceof Error ? uploadErr.message : "Upload failed",
          hint: "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env file",
        },
        { status: 500 },
      );
    }
  } catch (err) {
    logError("POST", "/api/upload", err);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
