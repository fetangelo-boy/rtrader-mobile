import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadsRouter = router({
  /**
   * Upload subscription receipt image to Supabase Storage
   * Expects base64 encoded image data
   */
  uploadReceipt: protectedProcedure
    .input(
      z.object({
        base64Data: z.string(),
        fileName: z.string().optional(),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate base64 data
        if (!input.base64Data || input.base64Data.length === 0) {
          throw new Error("No image data provided");
        }

        // Generate unique file name
        const fileId = uuidv4();
        const timestamp = Date.now();
        const fileName = input.fileName || `receipt_${timestamp}.jpg`;
        const storagePath = `receipts/${ctx.user.id}/${fileId}_${fileName}`;

        // Convert base64 to buffer
        const buffer = Buffer.from(input.base64Data, "base64");

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (buffer.length > maxSize) {
          throw new Error("File size exceeds 5MB limit");
        }

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("receipts")
          .upload(storagePath, buffer, {
            contentType: input.mimeType,
            cacheControl: "3600",
            upsert: false,
          } as any);

        if (error) {
          console.error("Supabase upload error:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("receipts").getPublicUrl(storagePath);

        return {
          success: true,
          url: publicUrl,
          path: storagePath,
          fileId: fileId,
          message: "Receipt uploaded successfully",
        };
      } catch (error) {
        console.error("Upload error:", error);
        throw new Error(error instanceof Error ? error.message : "Upload failed");
      }
    }),

  /**
   * Upload receipt image from URL (for testing)
   */
  uploadReceiptFromUrl: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch image from URL
        const response = await fetch(input.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "image/jpeg";

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (buffer.byteLength > maxSize) {
          throw new Error("File size exceeds 5MB limit");
        }

        // Generate unique file name
        const fileId = uuidv4();
        const timestamp = Date.now();
        const fileName = input.fileName || `receipt_${timestamp}.jpg`;
        const storagePath = `receipts/${ctx.user.id}/${fileId}_${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("receipts")
          .upload(storagePath, new Uint8Array(buffer), {
            contentType: contentType,
            cacheControl: "3600",
            upsert: false,
          } as any);

        if (error) {
          console.error("Supabase upload error:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("receipts").getPublicUrl(storagePath);

        return {
          success: true,
          url: publicUrl,
          path: storagePath,
          fileId: fileId,
          message: "Receipt uploaded successfully",
        };
      } catch (error) {
        console.error("Upload error:", error);
        throw new Error(error instanceof Error ? error.message : "Upload failed");
      }
    }),

  /**
   * Delete receipt image from Supabase Storage
   */
  deleteReceipt: protectedProcedure
    .input(
      z.object({
        storagePath: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify the path belongs to the current user
        if (!input.storagePath.includes(String(ctx.user.id))) {
          throw new Error("Unauthorized: Cannot delete other user's files");
        }

        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from("receipts")
          .remove([input.storagePath]);

        if (error) {
          console.error("Supabase delete error:", error);
          throw new Error(`Delete failed: ${error.message}`);
        }

        return {
          success: true,
          message: "Receipt deleted successfully",
        };
      } catch (error) {
        console.error("Delete error:", error);
        throw new Error(error instanceof Error ? error.message : "Delete failed");
      }
    }),

  /**
   * Get signed URL for receipt image (for private access)
   */
  getSignedUrl: protectedProcedure
    .input(
      z.object({
        storagePath: z.string(),
        expiresIn: z.number().default(3600), // 1 hour default
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify the path belongs to the current user
        if (!input.storagePath.includes(String(ctx.user.id))) {
          throw new Error("Unauthorized: Cannot access other user's files");
        }

        // Get signed URL
        const { data, error } = await supabase.storage
          .from("receipts")
          .createSignedUrl(input.storagePath, input.expiresIn);

        if (error) {
          console.error("Supabase signed URL error:", error);
          throw new Error(`Failed to get signed URL: ${error.message}`);
        }

        return {
          success: true,
          signedUrl: data.signedUrl,
          expiresIn: input.expiresIn,
        };
      } catch (error) {
        console.error("Signed URL error:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to get signed URL");
      }
    }),
});
