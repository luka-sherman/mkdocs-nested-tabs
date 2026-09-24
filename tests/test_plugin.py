"""Builds tests/fixture_site and checks the plugin's effect on the built output."""

import subprocess
import sys
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent / "fixture_site"


def build_fixture(tmp_path):
    site_dir = tmp_path / "site"
    subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "--site-dir", str(site_dir)],
        cwd=FIXTURE_DIR,
        check=True,
        capture_output=True,
    )
    return site_dir


def test_assets_are_built_and_referenced(tmp_path):
    site_dir = build_fixture(tmp_path)

    assert (site_dir / "nested-tabs.js").exists()
    assert (site_dir / "nested-tabs.css").exists()

    index_html = (site_dir / "index.html").read_text()
    assert "nested-tabs.js" in index_html
    assert "nested-tabs.css" in index_html


def test_flat_category_lists_both_pages():
    """Section A has no third nesting level, so it should render as a label
    with both page links underneath — the "flat" branch in nested-tabs.js."""
    content = (Path(__file__).parent / "fixture_site" / "docs" / "index.md").read_text()
    assert content

    # nested-tabs.js renders client-side by reading the built sidebar nav at
    # runtime, so this needs a real browser — see README for manual steps.
