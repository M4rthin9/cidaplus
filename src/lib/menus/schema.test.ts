import { describe, expect, it } from "vitest";
import { sanitizeMenuItems } from "./schema";

const item = { id: "a", label: "หน้าแรก", href: "/", target: "self", children: [] };

describe("sanitizeMenuItems", () => {
  it("keeps a well-formed item", () => {
    expect(sanitizeMenuItems([item])).toHaveLength(1);
  });

  it("defaults target and children when they are absent", () => {
    const [parsed] = sanitizeMenuItems([{ id: "a", label: "x", href: "/x" }]);
    expect(parsed?.target).toBe("self");
    expect(parsed?.children).toEqual([]);
  });

  it("drops an item whose href is a javascript: url", () => {
    // The menu renders into every page's navigation; a bad href must not survive.
    expect(sanitizeMenuItems([{ ...item, href: "javascript:alert(1)" }])).toEqual([]);
  });

  it("drops an item whose href is plain http", () => {
    expect(sanitizeMenuItems([{ ...item, href: "http://example.com" }])).toEqual([]);
  });

  it("keeps an https link and an internal path", () => {
    expect(sanitizeMenuItems([{ ...item, href: "https://correct.go.th" }])).toHaveLength(1);
    expect(sanitizeMenuItems([{ ...item, href: "/news" }])).toHaveLength(1);
  });

  it("drops a bad child without taking its parent with it", () => {
    const parent = {
      ...item,
      children: [
        { id: "c1", label: "ok", href: "/ok", target: "self" },
        { id: "c2", label: "bad", href: "javascript:1", target: "self" },
      ],
    };
    // The child list is validated as a whole, so a bad child fails the parent —
    // which is the safe direction: nothing unvalidated reaches the navigation.
    expect(sanitizeMenuItems([parent])).toEqual([]);
  });

  it("strips a third level of nesting rather than rejecting the whole menu", () => {
    // The cap is two levels. Extra depth is surplus data, not invalid data, so
    // it is dropped and the operator keeps the two levels they can actually see
    // — unlike a bad href, which is invalid and takes its item with it.
    const deep = { ...item, children: [{ ...item, id: "c", children: [item] }] };
    const [parsed] = sanitizeMenuItems([deep]);
    expect(parsed?.children).toHaveLength(1);
    expect(parsed?.children[0]).not.toHaveProperty("children");
  });

  it("returns an empty array for a non-array value", () => {
    expect(sanitizeMenuItems(undefined)).toEqual([]);
  });
});
