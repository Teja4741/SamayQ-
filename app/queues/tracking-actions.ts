
"use server";

import { createClient } from "@/lib/supabase/server";
import { createHash, createHmac } from "crypto";

type TrackingLinkResult = {
  success: boolean;
  message?: string;
  trackingUrl?: string;
};

export async function getOrCreateQueueTrackingLink(
  queueEntryId: string
): Promise<TrackingLinkResult> {
  try {
    // 1. Validate queue entry ID
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        queueEntryId
      )
    ) {
      return {
        success: false,
        message: "Invalid queue entry ID.",
      };
    }

    // 2. Validate environment variables
    const secret = process.env.TRACKING_TOKEN_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret || secret.length < 32) {
      return {
        success: false,
        message: "Tracking token secret is not configured.",
      };
    }

    if (!baseUrl) {
      return {
        success: false,
        message: "Website URL is not configured.",
      };
    }

    // 3. Authenticate user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Tracking authentication error:", authError);

      return {
        success: false,
        message: "Please sign in to generate a tracking link.",
      };
    }

    // Temporary diagnostic log
    console.log("Tracking authenticated user:", user.id);
    console.log("Tracking queue entry:", queueEntryId);

    // 4. Generate a stable token for this queue entry
    const trackingToken = createHmac("sha256", secret)
      .update(`queue-tracking:${queueEntryId}`)
      .digest("hex");

    // 5. Hash token before storing it in Supabase
    const trackingTokenHash = createHash("sha256")
      .update(trackingToken)
      .digest("hex");

    // 6. Create or retrieve tracking record
    const { data, error } = await supabase.rpc(
      "create_queue_entry_tracking_link",
      {
        p_queue_entry_id: queueEntryId,
        p_tracking_token_hash: trackingTokenHash,
      }
    );

    if (error) {
      console.error("Queue tracking RPC error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return {
        success: false,
        message: "Unable to generate the tracking link.",
      };
    }

    if (!data?.success) {
      console.error("Queue tracking rejected:", data?.message);

      return {
        success: false,
        message: data?.message || "Unable to create tracking link.",
      };
    }

    // 7. Build public tracking URL
    const trackingUrl = new URL(
      `/track/${trackingToken}`,
      baseUrl
    ).toString();

    console.log("Queue tracking link generated successfully.");

    return {
      success: true,
      trackingUrl,
    };
  } catch (error) {
    console.error("Tracking action unexpected error:", error);

    return {
      success: false,
      message:
        "Something went wrong while generating the tracking link.",
    };
  }
}
