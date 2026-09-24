// Runs the real, unmodified nested-tabs.js against real Material-rendered
// HTML (built via `mkdocs build`, not hand-written) using jsdom instead of a
// full browser — enough to catch DOM-shape/selector mismatches (the actual
// bug class found when adding navigation.indexes support: Material wraps a
// merged-index label in an extra <div class="md-nav__container">, which the
// original selector didn't account for) without needing a browser binary.
//
// Doesn't cover visual/CSS rendering — that's what a Playwright tier would
// be for, not this one.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "..", "fixture_site_indexes");
const SCRIPT_PATH = join(__dirname, "..", "..", "mkdocs_nested_tabs", "static", "nested-tabs.js");
const SCRIPT_SOURCE = readFileSync(SCRIPT_PATH, "utf8");

let siteDir;

before(() => {
  siteDir = mkdtempSync(join(tmpdir(), "nested-tabs-idx-site-"));
  execFileSync(process.env.PYTHON ?? "python3", ["-m", "mkdocs", "build", "--site-dir", siteDir], {
    cwd: FIXTURE_DIR,
    stdio: "inherit",
  });
});

after(() => {
  rmSync(siteDir, { recursive: true, force: true });
});

// Loads one built page, runs nested-tabs.js against it exactly as a real
// page load would (script tag execution + DOMContentLoaded), and returns
// the rendered .nested-tabs__group elements for assertions.
function renderGroups(pagePath) {
  const html = readFileSync(join(siteDir, pagePath), "utf8");
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  const { window } = dom;

  // window.document$ (Material's instant-loading observable) doesn't exist
  // here since we're not loading Material's own bundle — nested-tabs.js
  // falls back to a plain DOMContentLoaded listener in that case, so fire
  // one explicitly; dispatchEvent invokes listeners for that event type
  // regardless of the document's actual readyState.
  window.eval(SCRIPT_SOURCE);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true, cancelable: true }));

  return [...window.document.querySelectorAll(".nested-tabs__group")].map((group) => {
    const label = group.querySelector(".nested-tabs__label");
    return {
      labelTag: label.tagName,
      labelText: label.textContent.trim(),
      labelClass: label.className,
      labelHref: label.getAttribute("href"),
      ariaCurrent: label.getAttribute("aria-current"),
      links: [...group.querySelectorAll(".nested-tabs__link")].map((a) => ({
        text: a.textContent.trim(),
        active: a.classList.contains("nested-tabs__link--active"),
      })),
    };
  });
}

function findGroup(groups, labelText) {
  const group = groups.find((g) => g.labelText === labelText);
  assert.ok(group, `expected a "${labelText}" group, got: ${groups.map((g) => g.labelText).join(", ")}`);
  return group;
}

test("flat category with a merged index page (Section A, on its own index page)", () => {
  const groups = renderGroups("a/index.html");

  const sectionA = findGroup(groups, "Section A");
  assert.equal(sectionA.labelTag, "A", "label should be a real link, not an inert span");
  assert.equal(sectionA.labelHref, "./");
  assert.match(sectionA.labelClass, /\bnested-tabs__label--active\b/);
  assert.equal(sectionA.ariaCurrent, "page");
  // The merged index page must not also appear as a duplicate child link.
  assert.deepEqual(
    sectionA.links.map((l) => l.text),
    ["Page A2"]
  );

  const sectionB = findGroup(groups, "Section B");
  assert.equal(sectionB.labelTag, "SPAN", "a category with no index page keeps a plain, inert label");
  assert.equal(sectionB.labelClass, "nested-tabs__label");
});

test("flat category with a merged index page (Section A, on a sibling page)", () => {
  const groups = renderGroups("a/a2/index.html");

  const sectionA = findGroup(groups, "Section A");
  assert.equal(sectionA.labelTag, "A");
  // The label goes active whenever any of its pages does, sibling or not —
  // matching this plugin's existing "active parent" behavior for the
  // non-merged case. aria-current="page" is the narrower signal: only the
  // label's own merged page should claim that, not a sibling.
  assert.match(sectionA.labelClass, /\bnested-tabs__label--active\b/);
  assert.equal(sectionA.ariaCurrent, null);

  const page = sectionA.links.find((l) => l.text === "Page A2");
  assert.ok(page);
  assert.equal(page.active, true);
});

test("category with a nested sub-category AND a merged index page (Section C)", () => {
  // Section C has both a further-nested "Sub" sub-category (which alone
  // would take the "not flat" single-link fallback branch) and its own
  // merged index page — the exact combination that broke the fallback
  // branch's separate "find an overview link among descendants" search,
  // since navigation.indexes removes that overview page from the
  // descendants entirely.
  const onOwnIndex = findGroup(renderGroups("c/index.html"), "Section C");
  assert.equal(onOwnIndex.labelTag, "A");
  assert.ok(onOwnIndex.labelHref);
  assert.match(onOwnIndex.labelClass, /\bnested-tabs__link--active\b/);
  assert.equal(onOwnIndex.ariaCurrent, "page");

  const elsewhere = findGroup(renderGroups("index.html"), "Section C");
  assert.equal(elsewhere.labelTag, "A");
  // mkdocs emits page-relative hrefs, so the exact string differs by source
  // page (e.g. "../c/" from /a/ vs "c/" from the site root) — just assert
  // it resolved to something, not a specific literal.
  assert.ok(elsewhere.labelHref);
  assert.doesNotMatch(elsewhere.labelClass, /\bnested-tabs__link--active\b/);
  assert.equal(elsewhere.ariaCurrent, null);
});
