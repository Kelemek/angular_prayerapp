import { Injectable } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import type { AllowanceLevel } from "../types/prayer";

@Injectable({
  providedIn: "root",
})
export class PrayerAllowancePolicyService {
  deletionsAllowed: AllowanceLevel = "everyone";
  updatesAllowed: AllowanceLevel = "everyone";

  constructor(private supabaseService: SupabaseService) {}

  async load(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from("admin_settings")
        .select("deletions_allowed, updates_allowed")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Error loading admin settings:", error);
        return;
      }

      if (data) {
        this.deletionsAllowed = data.deletions_allowed || "everyone";
        this.updatesAllowed = data.updates_allowed || "everyone";
      }
    } catch (err) {
      console.error("Error loading admin settings:", err);
    }
  }
}
