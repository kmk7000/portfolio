import { test } from "node:test";
import assert from "node:assert/strict";
import { profile, profileBlocks, tabs } from "../src/config/site.ts";
import {
  OWNER_EMAILS,
  defaultContent,
  imageRef,
  isOwnerUser,
  isSafeHref,
  linesToItems,
  moveItem,
  normalizeContent,
  resolveImageSrc,
  uploadedIdsIn
} from "../src/lib/site-content.ts";

test("no saved document means the code content is shown as is", () => {
  const c = normalizeContent(undefined);
  assert.deepEqual(c, defaultContent());
  assert.equal(c.profile.ownerName, profile.ownerName);
  assert.deepEqual(c.tabs.map(t => t.id), tabs.map(t => t.id));
  assert.deepEqual(c.blocks.profile, profileBlocks);
});

test("saved values override defaults field by field; bad values are dropped", () => {
  const c = normalizeContent({
    profile: { ownerName: "새 이름", introTitle: 3, evil: "x" },
    tabs: [
      { id: "profile", label: "소개", kind: "profile" },
      { id: "t1", label: "여행", kind: "custom", view: "year" },
      { id: "bad", label: "?", kind: "script" },
      { id: "t1", label: "중복", kind: "custom" }
    ],
    blocks: { profile: [{ id: "a", type: "text", text: "hi" }, { id: "b", type: "html", text: "<b>" }], t1: "nope" },
    waveLinks: [{ id: "w", label: "블로그", href: "https://example.com" }, "junk"],
    furniture: { "lab-counter": { x: 150, y: -3, flip: true }, ghost: { x: 1, y: 1 } }
  });
  assert.equal(c.profile.ownerName, "새 이름");
  assert.equal(c.profile.introTitle, profile.introTitle);
  assert.equal("evil" in c.profile, false);
  assert.deepEqual(c.tabs.map(t => t.id), ["home", "profile", "t1", "projects", "oekaki"]);
  assert.equal(c.tabs.find(t => t.id === "t1")?.view, "year");
  assert.deepEqual(c.blocks.profile, [{ id: "a", type: "text", text: "hi" }]);
  assert.equal("t1" in c.blocks, false);
  assert.deepEqual(c.waveLinks, [{ id: "w", label: "블로그", href: "https://example.com" }]);
  assert.deepEqual(c.furniture["lab-counter"], { x: 100, y: 0, flip: true });
  assert.equal("ghost" in c.furniture, false);
});

test("uploaded image refs resolve from the image map; repo paths go through asset()", () => {
  const blocks = { photo: [{ id: "p", type: "image" as const, images: [imageRef("abc"), "/assets/a.webp"], caption: "" }] };
  assert.deepEqual(uploadedIdsIn(blocks), ["abc"]);
  assert.equal(resolveImageSrc(imageRef("abc"), { abc: "data:image/jpeg;base64,xx" }, p => p), "data:image/jpeg;base64,xx");
  assert.equal(resolveImageSrc(imageRef("zzz"), {}, p => p), "");
  assert.equal(resolveImageSrc("/assets/a.webp", {}, p => "/portfolio" + p), "/portfolio/assets/a.webp");
});

test("only the two verified Google owner accounts count as owner", () => {
  const google = [{ providerId: "google.com" }];
  assert.deepEqual(new Set(OWNER_EMAILS), new Set(["milk45453@gmail.com", "milk454537@gmail.com"]));
  assert.equal(isOwnerUser({ isAnonymous: false, email: "milk45453@gmail.com", emailVerified: true, providerData: google }), true);
  assert.equal(isOwnerUser({ isAnonymous: false, email: "Milk454537@gmail.com", emailVerified: true, providerData: google }), false, "rules compare exactly");
  assert.equal(isOwnerUser({ isAnonymous: false, email: "other@gmail.com", emailVerified: true, providerData: google }), false);
  assert.equal(isOwnerUser({ isAnonymous: false, email: "milk45453@gmail.com", emailVerified: false, providerData: google }), false);
  assert.equal(isOwnerUser({ isAnonymous: true, email: null, emailVerified: false, providerData: [] }), false);
  assert.equal(isOwnerUser(null), false);
});

test("editing helpers", () => {
  assert.deepEqual(moveItem([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.equal(isSafeHref("https://a.com"), true);
  assert.equal(isSafeHref("mailto:a@b.com"), true);
  assert.equal(isSafeHref("javascript:alert(1)"), false);
  assert.equal(isSafeHref("data:text/html,x"), false);
  assert.deepEqual(linesToItems(" 하나 \n\n 둘\n"), ["하나", "둘"]);
});
