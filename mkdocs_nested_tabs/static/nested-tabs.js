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
      const labelEl = section.querySelector(":scope > label.md-nav__link, :scope > a.md-nav__link");
      const nestedNav = section.querySelector(":scope > nav.md-nav");
      if (!labelEl || !nestedNav) return;

      const categoryLabel = labelEl.querySelector(".md-ellipsis")
        ? labelEl.querySelector(".md-ellipsis").textContent.trim()
        : labelEl.textContent.trim();

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
        const label = document.createElement("span");
        label.className = "nested-tabs__label";
        label.textContent = categoryLabel;
        group.appendChild(label);

        const pages = document.createElement("ul");
        pages.className = "nested-tabs__pages";
        let groupHasActive = false;
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
        // one of its own pages is the active one, without reaching for a
        // :has() selector from outside — see nested-tabs.css.
        if (groupHasActive) {
          label.classList.add("nested-tabs__label--active");
        }
      } else {
        const overviewLink = nestedNav.querySelector(
          ":scope > ul.md-nav__list > li.md-nav__item > a.md-nav__link"
        );
        if (!overviewLink) return;

        const label = document.createElement("a");
        label.className = "nested-tabs__label nested-tabs__label--link";
        label.href = overviewLink.getAttribute("href");
        label.textContent = categoryLabel;
        if (overviewLink.classList.contains("md-nav__link--active")) {
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
