import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLOOR_EDGE_MARGIN,
  FLOOR_MAX_Y,
  FLOOR_MIN_Y,
  START_POSITION,
  clampToFloor,
  findNearby,
  isArrowKey,
  isEditableTarget,
  pointToPercent,
  stepCharacter
} from "../src/lib/miniroom.ts";

test("clampToFloor keeps y inside the floor band", () => {
  assert.equal(clampToFloor(50, 0).y, FLOOR_MIN_Y);
  assert.equal(clampToFloor(50, 200).y, FLOOR_MAX_Y);
  assert.equal(clampToFloor(50, 60).y, 60);
});

test("clampToFloor narrows x near the apex and respects the edge margin", () => {
  // y=43: half width = 1.07 * 3 = 3.21 -> x in [46.79, 53.21]
  const nearApex = clampToFloor(0, 43);
  assert.ok(Math.abs(nearApex.x - (50 - 1.07 * 3)) < 1e-9);
  const nearApexRight = clampToFloor(100, 43);
  assert.ok(Math.abs(nearApexRight.x - (50 + 1.07 * 3)) < 1e-9);
  // y=88: half width = 51.36 -> limited by the 5% margin
  assert.equal(clampToFloor(-20, 88).x, FLOOR_EDGE_MARGIN);
  assert.equal(clampToFloor(120, 88).x, 100 - FLOOR_EDGE_MARGIN);
});

test("the start position is already on the floor", () => {
  assert.deepEqual(clampToFloor(START_POSITION.x, START_POSITION.y), START_POSITION);
});

test("stepCharacter moves 3% per key press and stays on the floor", () => {
  assert.deepEqual(stepCharacter({ x: 50, y: 70 }, "ArrowUp"), { x: 50, y: 67 });
  assert.deepEqual(stepCharacter({ x: 50, y: 70 }, "ArrowLeft"), { x: 47, y: 70 });
  assert.deepEqual(stepCharacter({ x: 50, y: 88 }, "ArrowDown"), { x: 50, y: 88 });
  let pos = { x: 50, y: 60 };
  for (let i = 0; i < 50; i++) pos = stepCharacter(pos, "ArrowRight");
  assert.equal(pos.x, clampToFloor(1000, 60).x);
});

test("isArrowKey only accepts the four arrow keys", () => {
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) assert.ok(isArrowKey(key));
  for (const key of ["Enter", "a", "Arrow", "arrowup"]) assert.equal(isArrowKey(key), false);
});

test("findNearby returns the closest item within range, or null", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const layout = { a: { x: 10, y: 80 }, b: { x: 60, y: 80 }, c: { x: 64, y: 84 } };
  assert.equal(findNearby({ x: 65, y: 88 }, items, layout)?.id, "c");
  assert.equal(findNearby({ x: 30, y: 45 }, items, layout), null);
  assert.equal(findNearby({ x: 65, y: 88 }, items, {}), null);
});

test("pointToPercent converts and clamps client coordinates", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(pointToPercent(200, 100, rect), { x: 50, y: 50 });
  assert.deepEqual(pointToPercent(0, 0, rect), { x: 0, y: 0 });
  assert.deepEqual(pointToPercent(999, 999, rect), { x: 100, y: 100 });
  assert.deepEqual(pointToPercent(133.33, 50, rect), { x: 16.7, y: 0 });
});

test("isEditableTarget detects form fields and ignores plain elements", () => {
  const fake = (match: boolean, editable = false) =>
    ({ isContentEditable: editable, closest: () => (match ? {} : null) }) as unknown as EventTarget;
  assert.equal(isEditableTarget(fake(true)), true);
  assert.equal(isEditableTarget(fake(false, true)), true);
  assert.equal(isEditableTarget(fake(false)), false);
  assert.equal(isEditableTarget(null), false);
  assert.equal(isEditableTarget({} as EventTarget), false);
});
