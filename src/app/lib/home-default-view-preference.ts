import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSessionService } from "../services/user-session.service";

export type HomeDefaultPrayerView = "current" | "personal";

export async function updateHomeDefaultViewPreference(
  client: SupabaseClient,
  userSessionService: UserSessionService,
  preference: HomeDefaultPrayerView
): Promise<boolean> {
  const email = userSessionService.getUserEmail();
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { data: existingRecord, error: fetchError } = await client
      .from("email_subscribers")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingRecord) {
      const { error: updateError } = await client
        .from("email_subscribers")
        .update({ default_prayer_view: preference })
        .eq("email", normalizedEmail);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await client
        .from("email_subscribers")
        .insert({
          email: normalizedEmail,
          default_prayer_view: preference,
        });

      if (insertError) {
        throw insertError;
      }
    }

    await userSessionService.updateUserSession({
      defaultPrayerView: preference,
    });

    return true;
  } catch (err) {
    console.error("Error updating default view preference:", err);
    return false;
  }
}
