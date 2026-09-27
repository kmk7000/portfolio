import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { characterModes } from "../src/config/character.ts";
import { furnitureItems } from "../src/config/furniture.ts";
import {
  contactEmail,
  guestbookSeed,
  photoBlocks,
  profile,
  profileBlocks,
  projects,
  tabs,
  waveLinks,
  type ContentBlock
} from "../src/config/site.ts";
import { findProject } from "../src/lib/projects.ts";

const publicFile = (src: string) => new URL(`../public/${src.replace(/^\//, "")}`, import.meta.url);
const imagesIn = (blocks: readonly ContentBlock[]) => blocks.flatMap(b => (b.type === "image" ? b.images : []));
const linksIn = (blocks: readonly ContentBlock[]) => blocks.flatMap(b => (b.type === "link" ? [b.href] : []));
const duplicates = (ids: readonly string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

test("every image the site references exists under public/", () => {
  const srcs = [
    profile.photo.src,
    profile.miniroom.src,
    "/assets/cyberpunk-pixel-bg.jpg",
    ...imagesIn(profileBlocks),
    ...imagesIn(photoBlocks),
    ...projects.flatMap(p => [...(p.cover ? [p.cover] : []), ...p.shots.map(s => s.src), ...imagesIn(p.body)]),
    ...characterModes.map(m => m.src),
    ...furnitureItems.map(f => f.src)
  ];
  assert.ok(srcs.length > 20);
  assert.deepEqual(srcs.filter(src => !existsSync(publicFile(src))), []);
});

test("ids are unique and project ids are safe to put in the address", () => {
  assert.deepEqual(duplicates(tabs.map(t => t.id)), []);
  assert.deepEqual(duplicates(projects.map(p => p.id)), []);
  assert.deepEqual(duplicates(photoBlocks.map(b => b.id)), []);
  assert.deepEqual(duplicates(profileBlocks.map(b => b.id)), []);
  assert.deepEqual(duplicates(waveLinks.map(w => w.id)), []);
  for (const project of projects) {
    assert.match(project.id, /^[a-z0-9-]+$/);
    assert.deepEqual(duplicates(project.body.map(b => b.id)), [], project.id);
  }
  assert.equal(tabs.filter(t => t.kind === "projects").length, 1);
});

test("every link is https or the contact mail address", () => {
  const hrefs = [
    ...waveLinks.map(w => w.href),
    ...linksIn(profileBlocks),
    ...projects.flatMap(p => [...p.links.map(l => l.href), ...linksIn(p.body)])
  ];
  for (const href of hrefs) {
    assert.ok(href.startsWith("https://") || href === `mailto:${contactEmail}`, href);
  }
  assert.ok(hrefs.includes(`mailto:${contactEmail}`));
  assert.equal(contactEmail, "milk45453@gmail.com");
});

test("projects are complete and the in-progress app is marked as such", () => {
  for (const project of projects) {
    assert.ok(project.title && project.summary && project.period && project.category, project.id);
    assert.ok(["운영 중", "개발 중"].includes(project.status), project.id);
    assert.ok(project.facts.length > 0, project.id);
    assert.ok(project.body.length > 0, project.id);
  }
  assert.equal(findProject(projects, "billionaire")?.status, "개발 중");
  assert.equal(findProject(projects, "sellitmate")?.status, "운영 중");
  assert.equal(findProject(projects, "welmes")?.status, "운영 중");
});

test("no text from the original owner's site is left", () => {
  const text = JSON.stringify({ profile, profileBlocks, photoBlocks, projects, waveLinks, guestbookSeed, characterModes, furnitureItems });
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const leftover of ["생명과학", "N의 ", "N이에요", "N-LAB", "n-lifescience.github.io", "수업"]) {
    assert.ok(!text.includes(leftover), `site config still contains "${leftover}"`);
    assert.ok(!html.includes(leftover), `index.html still contains "${leftover}"`);
  }
  assert.equal(profile.ownerName, "민규");
  assert.ok(html.includes("<title>민규의 AI 작업실</title>"));
});
