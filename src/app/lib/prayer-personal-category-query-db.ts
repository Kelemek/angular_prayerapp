import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryDisplayOrderRange } from "./prayer-personal-category";
import {
  countPersonalPrayersInCategory,
  mapAllCategoryDisplayOrders,
  personalCategoryRangeForUncategorized,
  personalCategoryRangeFromQueryState,
  shouldFetchAllCategoryDisplayOrders,
} from "./prayer-personal-category-query";

export type PersonalCategoryDisplayOrderRow = {
  display_order?: number | null;
};

export type PersonalCategoryAllDisplayOrderRow = {
  category?: string | null;
  display_order: number;
};

export type PersonalCategoryIdRow = { id: string };

export function personalCategoryDbEqValue(
  category: string | null | undefined
): string | null {
  return category || null;
}

type PersonalCategoryMatchQuery<T> = {
  eq: (column: "category", value: string) => T;
  is: (column: "category", value: null) => T;
};

/** PostgREST matches SQL NULL with `.is`, not `.eq`. */
export function applyPersonalCategoryFilter<T>(
  query: PersonalCategoryMatchQuery<T>,
  category: string | null
): T {
  if (category === null) {
    return query.is("category", null);
  }
  return query.eq("category", category);
}

function personalCategoryMatchQuery<T>(query: T): PersonalCategoryMatchQuery<T> {
  return query as PersonalCategoryMatchQuery<T>;
}

export async function resolvePersonalCategoryRangeWithDb(
  category: string | null | undefined,
  userEmail: string | null,
  fetchCategoryPrayers: (
    userEmail: string,
    categoryEq: string | null
  ) => Promise<{
    data: PersonalCategoryDisplayOrderRow[] | null;
    error: unknown;
  }>,
  fetchAllCategoryDisplayOrders: (
    userEmail: string,
    minDisplayOrder: number
  ) => Promise<{
    data: PersonalCategoryAllDisplayOrderRow[] | null;
    error: unknown;
  }>,
  uncategorizedMaxPlusOne: number
): Promise<CategoryDisplayOrderRange> {
  const uncategorizedRange = personalCategoryRangeForUncategorized(category);
  if (uncategorizedRange) {
    return uncategorizedRange;
  }

  if (!userEmail) {
    throw new Error("User email not available");
  }

  const categoryEq = personalCategoryDbEqValue(category);
  const { data: categoryPrayers, error } = await fetchCategoryPrayers(
    userEmail,
    categoryEq
  );
  if (error) {
    throw error;
  }

  let allCategoryDisplayOrders: number[] = [];
  if (shouldFetchAllCategoryDisplayOrders(categoryPrayers)) {
    const { data: allCategoryData, error: allError } =
      await fetchAllCategoryDisplayOrders(userEmail, uncategorizedMaxPlusOne);
    if (allError) {
      throw allError;
    }
    allCategoryDisplayOrders = mapAllCategoryDisplayOrders(allCategoryData);
  }

  return personalCategoryRangeFromQueryState(
    category,
    categoryPrayers,
    allCategoryDisplayOrders
  );
}

export async function fetchPersonalCategoryPrayerCountWithDb(
  userEmail: string | null,
  category: string | null | undefined,
  fetchCategoryIds: (
    userEmail: string,
    categoryEq: string | null
  ) => Promise<{ data: PersonalCategoryIdRow[] | null; error: unknown }>
): Promise<number> {
  if (!userEmail) {
    return 0;
  }

  const { data: prayers, error } = await fetchCategoryIds(
    userEmail,
    personalCategoryDbEqValue(category)
  );
  if (error) {
    console.error("Error counting category prayers:", error);
    return 0;
  }

  return countPersonalPrayersInCategory(prayers);
}

export async function fetchPersonalCategoryDisplayOrderRows(
  client: SupabaseClient,
  email: string,
  categoryEq: string | null
): Promise<{ data: PersonalCategoryDisplayOrderRow[] | null; error: unknown }> {
  const result = await applyPersonalCategoryFilter(
    personalCategoryMatchQuery(
      client
        .from("personal_prayers")
        .select("display_order")
        .eq("user_email", email)
    ),
    categoryEq
  );
  return { data: result.data, error: result.error };
}

export async function fetchAllPersonalCategoryDisplayOrderRows(
  client: SupabaseClient,
  email: string,
  minDisplayOrder: number
): Promise<{
  data: PersonalCategoryAllDisplayOrderRow[] | null;
  error: unknown;
}> {
  const result = await client
    .from("personal_prayers")
    .select("category, display_order")
    .eq("user_email", email)
    .not("category", "is", null)
    .gte("display_order", minDisplayOrder);
  return { data: result.data, error: result.error };
}

export async function fetchPersonalCategoryIdRows(
  client: SupabaseClient,
  email: string,
  categoryEq: string | null
): Promise<{ data: PersonalCategoryIdRow[] | null; error: unknown }> {
  const result = await applyPersonalCategoryFilter(
    personalCategoryMatchQuery(
      client.from("personal_prayers").select("id").eq("user_email", email)
    ),
    categoryEq
  );
  return { data: result.data, error: result.error };
}

export async function queryMaxDisplayOrderInPersonalCategoryRange(
  client: SupabaseClient,
  userEmail: string,
  category: string | null,
  range: CategoryDisplayOrderRange
): Promise<{
  data: { display_order?: number | null } | null;
  error: unknown;
}> {
  const result = await applyPersonalCategoryFilter(
    personalCategoryMatchQuery(
      client
        .from("personal_prayers")
        .select("display_order")
        .eq("user_email", userEmail)
    ),
    category ?? null
  )
    .gte("display_order", range.min)
    .lte("display_order", range.max)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();
  return { data: result.data, error: result.error };
}
