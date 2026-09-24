(function () {
  // Reads Material's own primary sidebar nav, which already lists every
  // top-level category regardless of which page is active, so this stays
  // in sync with mkdocs.yml's nav: block with no separate config needed.
  // A category with a third nesting level doesn't fit the "label + page
  // list" shape this renders, so it falls back to a single link.

  function buildNestedTabs() {
    const primaryNav = document.querySelector(
      '[data-md-component="sidebar"][data-md-type="navigation"] .md-nav--primary'
    );
    if (!primaryNav) return null;

    const topList = primaryNav.querySelector(":scope > ul.md-nav__list");
    if (!topList) return null;

    const nav = document.createElement("nav");
    nav.className = "nested-tabs";
    nav.setAttribute("aria-label", "Categories");

    // Matches .md-tabs's own .md-grid wrapper so this row aligns with the
    // rest of the header instead of running edge-to-edge.
    const grid = document.createElement("div");
    grid.className = "md-grid nested-tabs__grid";

    const list = document.createElement("ul");
    list.className = "nested-tabs__list";

    topList.querySelectorAll(":scope > li.md-nav__item--nested").forEach(function (section) {
      // With navigation.indexes enabled, Material wraps the link version in
      // an extra <div class="md-nav__container"> instead of putting the <a>
      // directly on the <li> — without that third alternative here, labelEl
      // comes back null and the whole section silently disappears from this
      // row, not just its active-state handling.
      const labelEl = section.querySelector(
        ":scope > label.md-nav__link, :scope > a.md-nav__link, :scope > .md-nav__container > a.md-nav__link"
      );
      const nestedNav = section.querySelector(":scope > nav.md-nav");
      if (!labelEl || !nestedNav) return;

      const categoryLabel = labelEl.querySelector(".md-ellipsis")
        ? labelEl.querySelector(".md-ellipsis").textContent.trim()
        : labelEl.textContent.trim();

      // With navigation.indexes enabled, Material merges a section's own
      // index page into its label — labelEl becomes a real <a> (not a
      // <label> toggle) pointing at that page, and drops it from the child
      // list entirely. So the label itself, not just one of its children,
      // can be the active page.
      const labelIsLink = labelEl.tagName === "A";
      const labelIsActive = labelIsLink && labelEl.classList.contains("md-nav__link--active");

      const childItems = Array.from(nestedNav.querySelectorAll(":scope > ul.md-nav__list > li.md-nav__item"));
      const pageLinks = [];
      let flat = true;
      for (const pageItem of childItems) {
        // A sub-category has no direct link, only its own nested nav.
        const link = pageItem.querySelector(":scope > a.md-nav__link");
        if (!link) {
          flat = false;
          break;
        }
        pageLinks.push(link);
      }

      const group = document.createElement("li");
      group.className = "nested-tabs__group";

      if (flat && pageLinks.length > 0) {
        // labelIsLink means navigation.indexes merged this section's own
        // index page into the label — render it as a real, clickable <a>
        // (same shape as the fallback branch's label--link below) rather
        // than an inert <span>, so that page stays reachable from here.
        const label = document.createElement(labelIsLink ? "a" : "span");
        label.className = labelIsLink ? "nested-tabs__label nested-tabs__label--link" : "nested-tabs__label";
        if (labelIsLink) {
          label.href = labelEl.getAttribute("href");
        }
        label.textContent = categoryLabel;
        group.appendChild(label);

        const pages = document.createElement("ul");
        pages.className = "nested-tabs__pages";
        let groupHasActive = labelIsActive;
        pageLinks.forEach(function (link) {
          const item = document.createElement("li");
          const a = document.createElement("a");
          a.className = "nested-tabs__link";
          a.href = link.getAttribute("href");
          a.textContent = link.querySelector(".md-ellipsis")
            ? link.querySelector(".md-ellipsis").textContent.trim()
            : link.textContent.trim();
          if (link.classList.contains("md-nav__link--active")) {
            a.classList.add("nested-tabs__link--active");
            a.setAttribute("aria-current", "page");
            groupHasActive = true;
          }
          item.appendChild(a);
          pages.appendChild(item);
        });
        group.appendChild(pages);
        // Lets a consumer style the category label itself (e.g. "Flow") when
        // one of its own pages — or, with navigation.indexes, the label's
        // own merged index page — is the active one, without reaching for a
        // :has() selector from outside — see nested-tabs.css.
        if (groupHasActive) {
          label.classList.add("nested-tabs__label--active");
          // Only when the label's own page is the active one, not merely a
          // descendant's — aria-current="page" would misrepresent a parent
          // category as literally being the current page otherwise.
          if (labelIsActive) {
            label.setAttribute("aria-current", "page");
          }
        }
      } else {
        // navigation.indexes merges a section's own index page into its own
        // label (see labelIsLink above) before this branch ever sees its
        // children — so when that happened, labelEl already has everything
        // needed (href + active state) and searching descendants for an
        // "overview" page would find nothing, dropping the whole section.
        // Only fall back to that descendant search for the case with no
        // navigation.indexes merge, where a plain child page (e.g. an
        // explicit "All" entry) serves as the overview link instead.
        let overviewHref;
        let overviewIsActive;
        if (labelIsLink) {
          overviewHref = labelEl.getAttribute("href");
          overviewIsActive = labelIsActive;
        } else {
          const overviewLink = nestedNav.querySelector(
            ":scope > ul.md-nav__list > li.md-nav__item > a.md-nav__link"
          );
          if (!overviewLink) return;
          overviewHref = overviewLink.getAttribute("href");
          overviewIsActive = overviewLink.classList.contains("md-nav__link--active");
        }

        const label = document.createElement("a");
        label.className = "nested-tabs__label nested-tabs__label--link";
        label.href = overviewHref;
        label.textContent = categoryLabel;
        if (overviewIsActive) {
          label.classList.add("nested-tabs__link--active");
          label.setAttribute("aria-current", "page");
        }
        group.appendChild(label);
      }

      list.appendChild(group);
    });

    if (!list.children.length) return null;

    grid.appendChild(list);
    nav.appendChild(grid);
    return nav;
  }

  // .md-tabs lives inside .md-header, so inserting after it makes this row
  // a header child too and it inherits the header's sticky positioning for free.
  function render() {
    const existing = document.querySelector(".nested-tabs");
    if (existing) existing.remove();

    const nestedTabs = buildNestedTabs();
    const tabs = document.querySelector(".md-tabs");
    if (nestedTabs && tabs) {
      tabs.insertAdjacentElement("afterend", nestedTabs);
    }
  }

  if (window.document$) {
    window.document$.subscribe(render);
  } else {
    document.addEventListener("DOMContentLoaded", render);
  }
})();
