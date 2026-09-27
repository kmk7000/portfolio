import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OP,
  SHAPE_STEPS,
  applyMask,
  decodePoints,
  floodMask,
  hexToRgb,
  parseReplay,
  polylinePrefix,
  rectPath,
  rgbToHex,
  segmentsOf,
  segmentsPerFrame,
  trackPoint
} from "../src/lib/oekaki/draw.ts";
import {
  OEKAKI_KEY,
  OEKAKI_LIMITS,
  addDrawing,
  addReply,
  deleteDrawing,
  deleteReply,
  loadDrawings
} from "../src/lib/oekaki/store.ts";
import { createMemoryStorage } from "../src/lib/storage.ts";

/* 5x5 흰 그림 가운데에 검은 세로줄(x=2)을 그어 좌우를 나눕니다. */
function splitImage() {
  const w = 5, h = 5;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) {
    const q = (y * w + 2) * 4;
    data[q] = data[q + 1] = data[q + 2] = 0;
  }
  return { width: w, height: h, data };
}

test("floodMask fills only the connected region", () => {
  const img = splitImage();
  const mask = floodMask(img, 0, 0);
  const filled = Array.from(mask).reduce((n, v) => n + v, 0);
  assert.equal(filled, 10); // 왼쪽 두 줄 x 5
  assert.equal(mask[0], 1);
  assert.equal(mask[2], 0); // 검은 선
  assert.equal(mask[3], 0); // 오른쪽
  assert.equal(Array.from(floodMask(img, -1, 0)).some(Boolean), false);
});

test("applyMask paints masked pixels opaque in the chosen colour", () => {
  const img = splitImage();
  applyMask(img, floodMask(img, 4, 4), "#dc2626");
  const q = (4 * 5 + 4) * 4;
  assert.deepEqual(Array.from(img.data.slice(q, q + 4)), [0xdc, 0x26, 0x26, 255]);
  assert.deepEqual(Array.from(img.data.slice(0, 4)), [255, 255, 255, 255]);
});

test("colour conversion round-trips", () => {
  assert.deepEqual(hexToRgb("#16a34a"), { r: 0x16, g: 0xa3, b: 0x4a });
  assert.equal(rgbToHex(0x16, 0xa3, 0x4a), "#16a34a");
});

test("trackPoint stores deltas, skips tiny moves, and decodePoints restores them", () => {
  const buf: number[] = [];
  trackPoint(buf, { x: 10, y: 10 });
  trackPoint(buf, { x: 11, y: 10 }); // 1px: 건너뜀
  trackPoint(buf, { x: 14, y: 10 });
  trackPoint(buf, { x: 14, y: 20 });
  assert.deepEqual(buf, [10, 10, 4, 0, 0, 10]);
  assert.deepEqual(decodePoints(buf), [[10, 10], [14, 10], [14, 20]]);
  assert.deepEqual(decodePoints([]), []);
});

test("rectPath and polylinePrefix trace shapes progressively", () => {
  assert.deepEqual(rectPath(10, 10, 0, 0), [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  const path = rectPath(0, 0, 10, 10); // 둘레 40
  assert.deepEqual(polylinePrefix(path, 0.25), [[0, 0], [10, 0]]);
  assert.deepEqual(polylinePrefix(path, 0.375), [[0, 0], [10, 0], [10, 5]]);
  assert.deepEqual(polylinePrefix(path, 1).at(-1), [0, 0]);
  assert.deepEqual(polylinePrefix([[1, 1], [1, 1]], 1), []);
});

test("replay segment counting and speed", () => {
  assert.equal(segmentsOf({ k: OP.blur, l: 0 }), 0);
  assert.equal(segmentsOf({ k: OP.fill, l: 0 }), 1);
  assert.equal(segmentsOf({ k: OP.pen, l: 0, p: [1, 1, 2, 2, 3, 3] }), 2);
  assert.equal(segmentsOf({ k: OP.pen, l: 0, p: [1, 1] }), 1);
  assert.equal(segmentsOf({ k: OP.rect, l: 0, p: [0, 0, 5, 5] }), SHAPE_STEPS);
  assert.equal(segmentsPerFrame([{ k: OP.rect, l: 0 }]), 1);
  const many = Array.from({ length: 100 }, () => ({ k: OP.ellipse, l: 0 }));
  assert.equal(segmentsPerFrame(many), Math.ceil((100 * SHAPE_STEPS) / 360));
});

test("parseReplay keeps only well-formed ops", () => {
  assert.deepEqual(parseReplay("oops"), []);
  assert.deepEqual(parseReplay("{}"), []);
  assert.deepEqual(parseReplay('[{"k":0,"l":0,"p":[1,2]},{"x":1},null]'), [{ k: 0, l: 0, p: [1, 2] }]);
});

const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("drawings are stored newest first with trimmed fields", () => {
  const storage = createMemoryStorage();
  addDrawing(storage, { image: PNG, comment: " 첫 그림 ", author: " 이나 " }, new Date(2026, 8, 7, 0, 49));
  const list = addDrawing(storage, { image: PNG, comment: "", author: "창욱", replay: "[]" }, new Date(2026, 8, 8, 12, 0));
  assert.deepEqual(list.map(d => d.author), ["창욱", "이나"]);
  assert.equal(list[1].comment, "첫 그림");
  assert.equal(list[1].date, "2026.09.07");
  assert.equal(list[1].time, "00:49");
  assert.equal(loadDrawings(storage).length, 2);
});

test("drawing validation rejects bad images, huge images and empty names", () => {
  const storage = createMemoryStorage();
  assert.throws(() => addDrawing(storage, { image: "data:image/jpeg;base64,xx", comment: "", author: "a" }), /그림을 만들지/);
  const huge = PNG + "A".repeat(OEKAKI_LIMITS.image);
  assert.throws(() => addDrawing(storage, { image: huge, comment: "", author: "a" }), /너무 복잡/);
  assert.throws(() => addDrawing(storage, { image: PNG, comment: "", author: "  " }), /이름을 적어/);
  const tooLongReplay = "x".repeat(OEKAKI_LIMITS.replay + 1);
  const [saved] = addDrawing(storage, { image: PNG, comment: "", author: "a", replay: tooLongReplay });
  assert.equal(saved.replay, undefined);
});

test("drawing replies and deletion", () => {
  const storage = createMemoryStorage();
  const [drawing] = addDrawing(storage, { image: PNG, comment: "", author: "창욱" });
  let list = addReply(storage, drawing.id, { author: "민규", text: "안돼 거울이다!" });
  assert.equal(list[0].replies.length, 1);
  assert.throws(() => addReply(storage, drawing.id, { author: "a", text: " " }), /댓글을 적어/);
  assert.throws(() => addReply(storage, drawing.id, { author: "a", text: "가".repeat(101) }), /100자/);
  list = deleteReply(storage, drawing.id, list[0].replies[0].id);
  assert.equal(list[0].replies.length, 0);
  assert.deepEqual(deleteDrawing(storage, drawing.id), []);
});

test("loadDrawings ignores corrupt entries", () => {
  const storage = createMemoryStorage();
  storage.setItem(OEKAKI_KEY, JSON.stringify([{ id: "x", author: "a", image: "http://evil", at: 1 }, "junk"]));
  assert.deepEqual(loadDrawings(storage), []);
  storage.setItem(OEKAKI_KEY, "not json");
  assert.deepEqual(loadDrawings(storage), []);
});
