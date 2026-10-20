import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, validateImageMagicBytes } from "./validations";

export interface StoredProofResult {
  storageKey: string;
  sizeBytes: number;
  detectedMime: string;
}

export class StorageError extends Error {
  constructor(message: string, public code: string = "STORAGE_ERROR") {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Validates and saves an uploaded proof file privately.
 * Strictly enforces size limits, magic bytes, safe generated filenames,
 * and environment-specific storage rules.
 */
export async function savePrivateProof(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<StoredProofResult> {
  // 1. Enforce size limit
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new StorageError("File size exceeds 5MB limit", "FILE_TOO_LARGE");
  }

  if (fileBuffer.length === 0) {
    throw new StorageError("File cannot be empty", "FILE_EMPTY");
  }

  // 2. Magic byte inspection (do not trust client content-type)
  const magicValidation = validateImageMagicBytes(fileBuffer);
  if (!magicValidation.valid || !magicValidation.detectedMime) {
    throw new StorageError("Unsupported or invalid image file content", "INVALID_FILE_TYPE");
  }

  const detectedMime = magicValidation.detectedMime;
  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw new StorageError(`File MIME type ${detectedMime} is not allowed`, "INVALID_FILE_TYPE");
  }

  // Determine safe extension
  let safeExt = ".jpg";
  if (detectedMime === "image/png") safeExt = ".png";
  if (detectedMime === "image/webp") safeExt = ".webp";

  // 3. Generate safe unique key with high entropy (random 24 bytes)
  const safeRandomId = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const storageKey = `proof_${timestamp}_${safeRandomId}${safeExt}`;

  const isProduction = process.env.NODE_ENV === "production";
  const provider = process.env.STORAGE_PROVIDER || (isProduction ? "supabase" : "local");

  // Correction 7: Production must refuse to start or accept uploads when required private-storage config is missing.
  if (isProduction && provider === "local") {
    throw new StorageError(
      "Local storage is strictly prohibited in production. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      "CONFIG_ERROR"
    );
  }

  if (provider === "supabase") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "task-proofs";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new StorageError(
        "Missing required Supabase private storage credentials in environment.",
        "CONFIG_ERROR"
      );
    }

    // Direct upload to Supabase Storage via REST API
    const uploadUrl = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${storageKey}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": detectedMime,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new StorageError(`Failed to upload to Supabase storage: ${errText}`, "UPLOAD_FAILED");
    }

    return {
      storageKey,
      sizeBytes: fileBuffer.length,
      detectedMime,
    };
  } else {
    // Development local private storage
    const storageDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || "./storage/private_proofs");

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const filePath = path.join(storageDir, storageKey);

    // Path traversal safety check
    if (!filePath.startsWith(storageDir)) {
      throw new StorageError("Invalid storage path target", "SECURITY_VIOLATION");
    }

    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      storageKey,
      sizeBytes: fileBuffer.length,
      detectedMime,
    };
  }
}

/**
 * Retrieves file buffer and content-type for an authorized request (e.g. admin review)
 */
export async function getPrivateProofBuffer(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Validate storageKey format to prevent directory traversal
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(storageKey)) {
    throw new StorageError("Invalid storage key format", "INVALID_KEY");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const provider = process.env.STORAGE_PROVIDER || (isProduction ? "supabase" : "local");

  if (provider === "supabase") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "task-proofs";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new StorageError("Missing Supabase credentials", "CONFIG_ERROR");
    }

    const downloadUrl = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${storageKey}`;
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new StorageError("File not found in storage", "FILE_NOT_FOUND");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    return { buffer, mimeType };
  } else {
    const storageDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || "./storage/private_proofs");
    const filePath = path.join(storageDir, storageKey);

    if (!filePath.startsWith(storageDir) || !fs.existsSync(filePath)) {
      throw new StorageError("File not found in local storage", "FILE_NOT_FOUND");
    }

    const buffer = await fs.promises.readFile(filePath);
    const magic = validateImageMagicBytes(buffer);
    const mimeType = magic.detectedMime || "image/jpeg";

    return { buffer, mimeType };
  }
}

/**
 * Generates an authorized, short-lived access URL for private proof preview (admin only)
 */
export async function getPrivateProofSignedUrl(
  storageKey: string,
  expiresInSeconds: number = 300
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(storageKey)) {
    throw new StorageError("Invalid storage key format", "INVALID_KEY");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const provider = process.env.STORAGE_PROVIDER || (isProduction ? "supabase" : "local");

  if (provider === "supabase") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "task-proofs";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new StorageError("Missing Supabase credentials for signed URL generation", "CONFIG_ERROR");
    }

    const signEndpoint = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/sign/${bucket}/${storageKey}`;
    const response = await fetch(signEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });

    if (!response.ok) {
      throw new StorageError("Failed to generate Supabase signed URL", "SIGN_FAILED");
    }

    const data = await response.json();
    return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1${data.signedURL}`;
  } else {
    // Development local storage: return authenticated admin stream endpoint
    return `/api/admin/proofs/${storageKey}`;
  }
}

