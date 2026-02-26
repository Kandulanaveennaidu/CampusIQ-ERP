/**
 * File Upload Utility
 * Supports Cloudinary and local fallback.
 * Configure via environment variables.
 */

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  transformation?: Record<string, unknown>;
}

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Upload a file to Cloudinary
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
  }

  const folder = options.folder || "campusiq";
  const timestamp = Math.round(Date.now() / 1000);

  // Create signature
  const crypto = await import("crypto");
  const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureStr)
    .digest("hex");

  // Upload via Cloudinary REST API
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append("file", blob, filename);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Cloudinary upload failed: ${errorData.error?.message || "Unknown error"}`,
    );
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format,
    size: data.bytes,
    width: data.width,
    height: data.height,
  };
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  const timestamp = Math.round(Date.now() / 1000);
  const crypto = await import("crypto");
  const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureStr)
    .digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { method: "POST", body: formData },
  );

  return response.ok;
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: { size: number; type: string; name: string },
  options: UploadOptions = {},
): { valid: boolean; error?: string } {
  const maxSize = (options.maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${options.maxSizeMB || DEFAULT_MAX_SIZE_MB}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Parse multipart form data from request
 */
export async function parseFormData(request: Request): Promise<{
  fields: Record<string, string>;
  files: Array<{ name: string; data: Buffer; type: string; size: number }>;
}> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const files: Array<{
    name: string;
    data: Buffer;
    type: string;
    size: number;
  }> = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        name: value.name,
        data: buffer,
        type: value.type,
        size: value.size,
      });
    } else {
      fields[key] = value;
    }
  }

  return { fields, files };
}
