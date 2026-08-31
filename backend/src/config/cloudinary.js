/**
 * Cloudinary, used for lesson attachments (PDF, video, image).
 *
 * Files do NOT pass through this server. The browser asks for a short-lived
 * signature, then uploads straight to Cloudinary. A 200 MB lesson video would
 * otherwise occupy a Node process for minutes and can exhaust a small school
 * server's memory.
 *
 * The signature is what keeps this safe: only a signed-in teacher can obtain
 * one, it fixes the folder and expires, so nobody can upload into the account
 * freely.
 */
import { v2 as cloudinary } from "cloudinary";

import { env } from "./env.js";
import { HttpError } from "../utils/httpError.js";

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    "[cloudinary] not configured - lesson file upload is disabled. " +
      "Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET to enable it.",
  );
}

function assertConfigured() {
  if (!env.cloudinaryConfigured) {
    throw new HttpError(
      503,
      "ລະບົບອັບໂຫຼດໄຟລ໌ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ",
      "upload_not_configured",
    );
  }
}

/**
 * Build the parameters the browser must send to Cloudinary, plus the
 * signature that authorises them.
 *
 * Only the parameters signed here are accepted by Cloudinary, so pinning
 * `folder` means an upload cannot land anywhere else in the account.
 */
export function createUploadSignature({ userId }) {
  assertConfigured();

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    folder: env.CLOUDINARY_FOLDER,
    timestamp,
    // Recorded on the asset so an upload can be traced back to a teacher.
    context: `uploaded_by=${userId}`,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    // `auto` lets Cloudinary decide between image / video / raw itself.
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    maxBytes: env.UPLOAD_MAX_MB * 1024 * 1024,
    ...paramsToSign,
    signature,
  };
}

/**
 * Remove an asset. Called when a lesson is deleted or its file replaced, so
 * the Cloudinary account does not fill up with orphans.
 *
 * A failure here is logged and swallowed: losing the lesson row because the
 * file could not be deleted would be the worse outcome.
 */
export async function deleteAsset(publicId, resourceType = "image") {
  if (!publicId || !env.cloudinaryConfigured) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`[cloudinary] could not delete ${publicId}:`, err.message);
  }
}

export { cloudinary };
