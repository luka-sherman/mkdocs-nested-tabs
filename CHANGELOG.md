# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-09-24

### Added

- `--md-nested-tabs-label-active-color` / `--md-nested-tabs-link-active-color` — a flat group's
  label now gets a `.nested-tabs__label--active` class when one of its own pages is the active
  page, so the category name itself can be styled distinctly from its default color, not just
  the active page link beneath it. Both fall back to `--md-accent-fg-color`, matching prior
  behavior for consumers who don't set them.
- `--md-nested-tabs-label-hover-color` / `--md-nested-tabs-link-hover-color` — hover/focus-visible
  color hooks for the fallback-link label and page links, previously hardcoded to
  `--md-accent-fg-color` with no override.
- `navigation.indexes` support. Previously, enabling `navigation.indexes` alongside this plugin
  silently dropped any category whose own index page Material merges into its label — both a
  flat category with a `section/index.md` page and a category with a further-nested
  sub-category (the "Libraries"-style fallback case) — from this row entirely, with no error. A
  category's label is now rendered as a real link to its merged index page when one exists, with
  correct active/`aria-current` state.

## [0.1.0] - 2026-09-23

### Added

- Initial release. Renders a second header row showing every `navigation.tabs` category with
  all of its child pages at once, replacing Material's native hover-triggered tab dropdown.
- `--md-nested-tabs-label-color` / `--md-nested-tabs-link-color` theming hooks, falling back to
  Material's own `--md-default-fg-color--light` / `--md-default-fg-color`.
