"""A client for Cloud Storage. Cloud Storage is an object storage
and it's main use is to store system outputs.
"""
from __future__ import annotations

import json
import zlib
from collections.abc import Iterable

from flask import current_app, g
from google.cloud import storage as cloud_storage
from google.oauth2 import service_account


class Storage:
    """A Google Cloud Storage client that makes it easy to store and download
    objects from Cloud Storage. There's only one bucket used for each environment
    so this class doesn't provide a way to choose from different buckets.
    """

    def __init__(self) -> None:
        # If the app is running in an ECS container, the GCP credentials are
        # passed in as an environment variable and stored in config as a string.
        if current_app.config.get("GCP_SERVICE_CREDENTIALS"):
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(current_app.config["GCP_SERVICE_CREDENTIALS"])
            )
            client = cloud_storage.Client(credentials=credentials)
        # If the app is running locally, the developer should authenticate with
        # a user account and the client reads the credentials from its default
        # location on the FS.
        else:
            client = cloud_storage.Client()

        self._bucket_name = current_app.config["STORAGE_BUCKET_NAME"]
        self._bucket = client.bucket(self._bucket_name)

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

    def delete(self, blob_names: Iterable[str]) -> None:
        self._bucket.delete_blobs([self._bucket.blob(name) for name in blob_names])


def get_storage() -> Storage:
    """
    Returns the global Storage instance. A Storage object is created if not present
    in g.
    """
    if "_storage" not in g:
        g._storage = Storage()
    return g._storage
