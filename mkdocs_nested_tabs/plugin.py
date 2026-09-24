import os

from mkdocs.config import config_options
from mkdocs.plugins import BasePlugin
from mkdocs.structure.files import File

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
ASSET_NAMES = ("nested-tabs.js", "nested-tabs.css")


class NestedTabsPlugin(BasePlugin):
    """Shows every navigation.tabs category with all its child pages at once,
    instead of Material's hover-only dropdown. See README for background —
    this fills a gap explicitly declined in squidfunk/mkdocs-material#4765.
    """

    config_scheme = (
        ("enabled", config_options.Type(bool, default=True)),
    )

    def on_files(self, files, config):
        if not self.config["enabled"]:
            return files
        # Keeping the assets flat (no subfolder) means src_dir and dest_dir
        # share the same relative path, so File() needs no extra mapping.
        for name in ASSET_NAMES:
            files.append(
                File(name, src_dir=STATIC_DIR, dest_dir=config["site_dir"], use_directory_urls=False)
            )
        return files

    def on_config(self, config):
        if not self.config["enabled"]:
            return config
        config["extra_javascript"] = ["nested-tabs.js", *config["extra_javascript"]]
        config["extra_css"] = ["nested-tabs.css", *config["extra_css"]]
        return config
