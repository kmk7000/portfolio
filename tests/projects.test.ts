import { test } from "node:test";
import assert from "node:assert/strict";
import { findProject, projectSearch } from "../src/lib/projects.ts";
import type { Project } from "../src/config/site.ts";

const sample = (id: string): Project => ({
  id,
  title: id,
  category: "웹",
  status: "운영 중",
  period: "2026.09 ~",
  summary: "요약",
  tags: [],
  facts: [],
  links: [],
  body: [],
  shots: []
});

const list = [sample("sellitmate"), sample("welmes")];

test("findProject matches ids exactly after trimming and ignores unknown or empty values", () => {
  assert.equal(findProject(list, "welmes")?.id, "welmes");
  assert.equal(findProject(list, "  sellitmate ")?.id, "sellitmate");
  assert.equal(findProject(list, "WELMES"), null);
  assert.equal(findProject(list, "nope"), null);
  assert.equal(findProject(list, ""), null);
  assert.equal(findProject(list, null), null);
  assert.equal(findProject(list, undefined), null);
});

test("projectSearch sets tab and project, keeps other params and drops project for the list", () => {
  assert.equal(projectSearch("", "projects", "sellitmate"), "?tab=projects&project=sellitmate");
  assert.equal(projectSearch("?utm_source=x&tab=home", "projects", "welmes"), "?utm_source=x&tab=projects&project=welmes");
  assert.equal(projectSearch("?tab=projects&project=welmes", "projects", "sellitmate"), "?tab=projects&project=sellitmate");
  assert.equal(projectSearch("?tab=projects&project=welmes", "projects", null), "?tab=projects");
  assert.equal(projectSearch("?tab=projects&project=welmes&utm_source=x", "home", null), "?tab=home&utm_source=x");
});
