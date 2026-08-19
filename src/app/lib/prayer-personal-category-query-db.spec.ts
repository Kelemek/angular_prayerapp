import { describe, expect, it, vi } from "vitest";
import {
  applyPersonalCategoryFilter,
  fetchPersonalCategoryDisplayOrderRows,
  fetchPersonalCategoryIdRows,
  fetchPersonalCategoryPrayerCountWithDb,
  personalCategoryDbEqValue,
  queryMaxDisplayOrderInPersonalCategoryRange,
  resolvePersonalCategoryRangeWithDb,
} from "./prayer-personal-category-query-db";

describe("prayer-personal-category-query-db", () => {
  it("personalCategoryDbEqValue normalizes empty to null", () => {
    expect(personalCategoryDbEqValue(null)).toBeNull();
    expect(personalCategoryDbEqValue("")).toBeNull();
    expect(personalCategoryDbEqValue("Family")).toBe("Family");
  });

  it("resolvePersonalCategoryRangeWithDb returns uncategorized range without DB", async () => {
    const fetchCategory = vi.fn();
    const fetchAll = vi.fn();
    const range = await resolvePersonalCategoryRangeWithDb(
      null,
      "me@test.com",
      fetchCategory,
      fetchAll,
      1000
    );
    expect(range).toEqual({ min: 0, max: 999 });
    expect(fetchCategory).not.toHaveBeenCalled();
    expect(fetchAll).not.toHaveBeenCalled();
  });

  it("resolvePersonalCategoryRangeWithDb fetches all orders when category empty", async () => {
    const fetchCategory = vi.fn().mockResolvedValue({ data: [], error: null });
    const fetchAll = vi.fn().mockResolvedValue({
      data: [{ category: "A", display_order: 1001 }],
      error: null,
    });

    const range = await resolvePersonalCategoryRangeWithDb(
      "NewCat",
      "me@test.com",
      fetchCategory,
      fetchAll,
      1000
    );

    expect(fetchCategory).toHaveBeenCalledWith("me@test.com", "NewCat");
    expect(fetchAll).toHaveBeenCalledWith("me@test.com", 1000);
    expect(range).toEqual({ min: 2000, max: 2999 });
  });

  it("fetchPersonalCategoryPrayerCountWithDb returns 0 without email", async () => {
    const count = await fetchPersonalCategoryPrayerCountWithDb(
      null,
      "Family",
      vi.fn()
    );
    expect(count).toBe(0);
  });

  it("fetchPersonalCategoryPrayerCountWithDb counts ids from fetch", async () => {
    const count = await fetchPersonalCategoryPrayerCountWithDb(
      "me@test.com",
      "Family",
      vi
        .fn()
        .mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], error: null })
    );
    expect(count).toBe(2);
  });

  it("applyPersonalCategoryFilter uses is for SQL NULL and eq for named categories", () => {
    const eq = vi.fn().mockReturnValue("eq-query");
    const is = vi.fn().mockReturnValue("is-query");

    expect(applyPersonalCategoryFilter({ eq, is }, null)).toBe("is-query");
    expect(is).toHaveBeenCalledWith("category", null);
    expect(eq).not.toHaveBeenCalled();

    eq.mockClear();
    is.mockClear();
    expect(applyPersonalCategoryFilter({ eq, is }, "Family")).toBe("eq-query");
    expect(eq).toHaveBeenCalledWith("category", "Family");
    expect(is).not.toHaveBeenCalled();
  });

  it("fetchPersonalCategoryDisplayOrderRows queries display_order by email and category", async () => {
    const result = { data: [{ display_order: 1001 }], error: null };
    const { client, eqEmail, eqCategory, isCategory } =
      mockCategorySelectClient(result);

    await expect(
      fetchPersonalCategoryDisplayOrderRows(
        client as never,
        "me@test.com",
        "Family"
      )
    ).resolves.toEqual(result);
    expect(client.from).toHaveBeenCalledWith("personal_prayers");
    expect(eqEmail).toHaveBeenCalledWith("user_email", "me@test.com");
    expect(eqCategory).toHaveBeenCalledWith("category", "Family");
    expect(isCategory).not.toHaveBeenCalled();
  });

  it("fetchPersonalCategoryIdRows uses is for uncategorized null category", async () => {
    const result = { data: [{ id: "a" }], error: null };
    const { client, eqCategory, isCategory } = mockCategorySelectClient(result);

    await expect(
      fetchPersonalCategoryIdRows(client as never, "me@test.com", null)
    ).resolves.toEqual(result);
    expect(isCategory).toHaveBeenCalledWith("category", null);
    expect(eqCategory).not.toHaveBeenCalled();
  });

  it("queryMaxDisplayOrderInPersonalCategoryRange uses is for uncategorized null category", async () => {
    const result = { data: { display_order: 3 }, error: null };
    const { client, eqCategory, isCategory, gte, lte } =
      mockMaxOrderQueryClient(result);

    await expect(
      queryMaxDisplayOrderInPersonalCategoryRange(
        client as never,
        "me@test.com",
        null,
        { min: 0, max: 999 }
      )
    ).resolves.toEqual(result);
    expect(isCategory).toHaveBeenCalledWith("category", null);
    expect(eqCategory).not.toHaveBeenCalled();
    expect(gte).toHaveBeenCalledWith("display_order", 0);
    expect(lte).toHaveBeenCalledWith("display_order", 999);
  });
});

function mockCategorySelectClient(result: unknown) {
  const isCategory = vi.fn().mockResolvedValue(result);
  const eqCategory = vi.fn().mockResolvedValue(result);
  const eqEmail = vi.fn().mockReturnValue({ eq: eqCategory, is: isCategory });
  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqEmail }),
    }),
  };
  return { client, eqEmail, eqCategory, isCategory };
}

function mockMaxOrderQueryClient(result: unknown) {
  const single = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ single });
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order });
  const gte = vi.fn().mockReturnValue({ lte });
  const isCategory = vi.fn().mockReturnValue({ gte });
  const eqCategory = vi.fn().mockReturnValue({ gte });
  const eqEmail = vi.fn().mockReturnValue({ eq: eqCategory, is: isCategory });
  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqEmail }),
    }),
  };
  return { client, eqEmail, eqCategory, isCategory, gte, lte };
}
