import { describe, expect, it } from "vitest";
import {
  addFriendUrl,
  goLinePath,
  normaliseOaId,
  oaMessageUrl,
  renderMessageTemplate,
} from "./line";

describe("normaliseOaId", () => {
  it("adds the leading @ when the operator omits it", () => {
    expect(normaliseOaId("355kxfoj")).toBe("@355kxfoj");
  });

  it("leaves an already-prefixed handle alone", () => {
    expect(normaliseOaId("@355kxfoj")).toBe("@355kxfoj");
  });

  it("trims surrounding whitespace, which a paste normally carries", () => {
    expect(normaliseOaId("  @355kxfoj \n")).toBe("@355kxfoj");
  });
});

describe("addFriendUrl", () => {
  it("matches the form SPEC.md §8 publishes", () => {
    expect(addFriendUrl("@355kxfoj")).toBe("https://line.me/ti/p/%40355kxfoj");
  });

  it("encodes the @, since LINE's own published link does", () => {
    expect(addFriendUrl("355kxfoj")).toContain("%40");
    expect(addFriendUrl("355kxfoj")).not.toContain("/@");
  });
});

describe("oaMessageUrl", () => {
  it("uses LINE's oaMessage form so the chat opens with the text already typed", () => {
    expect(oaMessageUrl("@355kxfoj", "สวัสดี")).toBe(
      "https://line.me/R/oaMessage/%40355kxfoj/?%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5",
    );
  });

  it("encodes a message containing the characters that would otherwise break the query", () => {
    const url = oaMessageUrl("@x", "a&b?c #d");
    expect(url.endsWith("/?a%26b%3Fc%20%23d")).toBe(true);
  });

  it("normalises a handle written without the @", () => {
    expect(oaMessageUrl("x", "hi")).toBe(oaMessageUrl("@x", "hi"));
  });
});

describe("renderMessageTemplate", () => {
  const vars = { product_name: "พวงหรีดทรงกลม", product_url: "https://cidapt.com/product/a" };

  it("fills the placeholders SPEC.md §8 defines", () => {
    expect(renderMessageTemplate("สนใจสอบถามสินค้า: {product_name} ({product_url})", vars)).toBe(
      "สนใจสอบถามสินค้า: พวงหรีดทรงกลม (https://cidapt.com/product/a)",
    );
  });

  it("leaves an unknown placeholder visible instead of blanking it", () => {
    // An operator who typo'd {product_nme} should see the typo in the chat and
    // fix it, not send a message with a silent hole in it.
    expect(renderMessageTemplate("ถาม {product_nme}", vars)).toBe("ถาม {product_nme}");
  });

  it("fills a placeholder used more than once", () => {
    expect(renderMessageTemplate("{product_name} / {product_name}", vars)).toBe(
      "พวงหรีดทรงกลม / พวงหรีดทรงกลม",
    );
  });

  it("returns a template with no placeholders unchanged", () => {
    expect(renderMessageTemplate("สอบถามสินค้า", vars)).toBe("สอบถามสินค้า");
  });
});

describe("goLinePath", () => {
  it("carries the product slug so the redirect can resolve the message", () => {
    expect(goLinePath("puangreed-1")).toBe("/go/line?p=puangreed-1");
  });

  it("percent-encodes a Thai slug", () => {
    // Slugs are Thai UTF-8 (§14 decision 17), so this is the normal case.
    expect(goLinePath("พวงหรีด")).toBe(
      "/go/line?p=%E0%B8%9E%E0%B8%A7%E0%B8%87%E0%B8%AB%E0%B8%A3%E0%B8%B5%E0%B8%94",
    );
  });

  it("omits the parameter entirely when there is no product", () => {
    // The header, footer, contact page and category band: still tracked, but
    // there is nothing to pre-fill a message about.
    expect(goLinePath()).toBe("/go/line");
  });
});

describe("renderMessageTemplate — product_sku", () => {
  const withSku = {
    product_name: "พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม",
    product_url: "https://cidapt.com/product/puangreed-1",
    product_sku: "PR-001",
  };

  it("fills the SKU when the product has one", () => {
    expect(
      renderMessageTemplate("สินค้า: {product_name}\nรหัส: {product_sku}\n{product_url}", withSku),
    ).toBe(
      "สินค้า: พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม\nรหัส: PR-001\nhttps://cidapt.com/product/puangreed-1",
    );
  });

  it("drops the whole line when the SKU is missing, label and all", () => {
    // The dangling "รหัส:" is the thing this rule exists to prevent.
    const out = renderMessageTemplate(
      "สินค้า: {product_name}\nรหัส: {product_sku}\n{product_url}",
      { ...withSku, product_sku: null },
    );
    expect(out).toBe(
      "สินค้า: พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม\nhttps://cidapt.com/product/puangreed-1",
    );
    expect(out).not.toContain("รหัส");
  });

  it("treats undefined and blank the same as missing", () => {
    for (const sku of [undefined, "", "   "]) {
      expect(
        renderMessageTemplate("รหัส: {product_sku}\n{product_url}", {
          ...withSku,
          product_sku: sku,
        }),
      ).toBe("https://cidapt.com/product/puangreed-1");
    }
  });

  it("keeps the line when something else on it was filled", () => {
    // Dropping this line would take the product name with it.
    expect(
      renderMessageTemplate("{product_name} ({product_sku})", { ...withSku, product_sku: null }),
    ).toBe("พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม ()");
  });

  it("still leaves an unknown placeholder visible so a typo is noticed", () => {
    expect(renderMessageTemplate("สินค้า: {product_nme}", withSku)).toBe("สินค้า: {product_nme}");
  });

  it("collapses the whitespace a removed placeholder leaves behind", () => {
    expect(renderMessageTemplate("{product_name}   {product_url}", withSku)).toBe(
      "พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม https://cidapt.com/product/puangreed-1",
    );
  });

  it("does not leave a run of blank lines behind a dropped one", () => {
    expect(
      renderMessageTemplate("{product_name}\n\n{product_sku}\n\n{product_url}", {
        ...withSku,
        product_sku: null,
      }),
    ).toBe("พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม\n\nhttps://cidapt.com/product/puangreed-1");
  });
});

describe("oaMessageUrl — encoding the awkward characters (§47)", () => {
  const url = (message: string) => oaMessageUrl("@355kxfoj", message);

  it("encodes the characters that would otherwise be URL syntax", () => {
    const out = url("A&B?C/D#E=F");
    expect(out).toContain("A%26B%3FC%2FD%23E%3DF");
    // Only the one separating the handle from the message may survive.
    expect(out.split("?").length - 1).toBe(1);
    expect(out).not.toMatch(/[#]/);
  });

  it("encodes a space rather than leaving the URL breakable", () => {
    expect(url("two words")).toContain("two%20words");
    expect(url("two words")).not.toContain("two words");
  });

  it("round-trips Thai, English and Simplified Chinese product names", () => {
    for (const name of ["พวงหรีดแบ่งปัน", "Shared Wreath", "共享花圈"]) {
      const out = url(`สินค้า: ${name}`);
      expect(decodeURIComponent(out.split("/?")[1] ?? "")).toBe(`สินค้า: ${name}`);
    }
  });

  it("round-trips a name full of URL metacharacters", () => {
    const nasty = 'ผ้า & "ไหม" 100% <ชุด> ?a=b#c/d\\e';
    const out = url(nasty);
    expect(decodeURIComponent(out.split("/?")[1] ?? "")).toBe(nasty);
  });

  it("encodes a very long title without corrupting it", () => {
    const long = "พวงหรีด".repeat(120);
    expect(decodeURIComponent(url(long).split("/?")[1] ?? "")).toBe(long);
  });

  it("encodes exactly once — a template is not pre-encoded", () => {
    const rendered = renderMessageTemplate("สินค้า: {product_name}\n{product_url}", {
      product_name: "ผ้า & ไหม",
      product_url: "https://cidapt.com/product/pha-mai?x=1",
    });
    const out = url(rendered);
    expect(out).not.toContain("%25"); // a double encoding would show as %25xx
    expect(decodeURIComponent(out.split("/?")[1] ?? "")).toBe(rendered);
  });
});

describe("goLinePath", () => {
  it("encodes a Thai slug", () => {
    expect(goLinePath("พวงหรีด-1")).toBe(
      "/go/line?p=%E0%B8%9E%E0%B8%A7%E0%B8%87%E0%B8%AB%E0%B8%A3%E0%B8%B5%E0%B8%94-1",
    );
  });

  it("encodes a slug containing URL syntax so it cannot add a parameter", () => {
    expect(goLinePath("a&b=c")).toBe("/go/line?p=a%26b%3Dc");
  });
});
