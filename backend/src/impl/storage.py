"""A client for Cloud Storage. Cloud Storage is an object storage
and it's main use is to store system outputs.
"""
from __future__ import annotations

import zlib

from flask import current_app, g
from google.cloud import storage as cloud_storage


class Storage:
    """A Google Cloud Storage client that makes it easy to store and download
    objects from Cloud Storage. There's only one bucket used for each environment
    so this class doesn't provide a way to choose from different buckets.
    """

    def __init__(self) -> None:
        self._bucket_name = current_app.config.get("STORAGE_BUCKET_NAME")
        self._bucket = cloud_storage.Client().bucket(self._bucket_name)

    def upload(self, blob_name: str, contents: str | bytes) -> None:
        blob = self._bucket.blob(blob_name)
        blob.upload_from_string(contents)

    def compress_and_upload(self, blob_name: str, contents: str) -> None:
        compressed_contents = zlib.compress(contents.encode())
        self.upload(blob_name, compressed_contents)

    def download(self, blob_name: str) -> bytes:
        blob = self._bucket.blob(blob_name)
        return blob.download_as_bytes()

    def download_and_decompress(self, blob_name: str) -> str:
        return zlib.decompress(self.download(blob_name)).decode()

    def delete(self, blob_names: list[str]) -> None:
        self._bucket.delete_blobs([self._bucket.blob(name) for name in blob_names])


def get_storage() -> Storage:
    """
    Returns the global Storage instance. A Storage object is created if not present
    in g.
    """
    if "_storage" not in g:
        g._storage = Storage()
    return g._storage
