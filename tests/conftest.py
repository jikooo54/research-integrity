"""Windows compatibility for genlayer-test 0.29.2's direct-mode loader."""

import os

import pytest


@pytest.fixture(autouse=True)
def _genlayer_windows_tempfile_compat(monkeypatch):
    if os.name != "nt":
        yield
        return

    real_unlink = os.unlink

    def unlink_compat(path, *args, **kwargs):
        try:
            return real_unlink(path, *args, **kwargs)
        except PermissionError:
            return None

    monkeypatch.setattr(os, "unlink", unlink_compat)
    yield
