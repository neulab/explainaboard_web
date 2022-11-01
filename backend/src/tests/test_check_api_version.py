from unittest import TestCase

from explainaboard_web.__main__ import create_app
from explainaboard_web.impl.utils import get_api_version


class TestAPIVersion(TestCase):
    def setUp(self) -> None:
        app = create_app()
        self.client = app.app.test_client()
        self.api_path = "/api/tasks"
        self.api_version_header = "X-API-version"

    def test_check_api_version_not_provided(self):
        res = self.client.get(self.api_path)
        self.assertEqual(res.status_code, 200)

    def test_check_api_version_match(self):
        res = self.client.get(
            self.api_path, headers={self.api_version_header: get_api_version()}
        )
        self.assertEqual(res.status_code, 200)

    def test_check_api_version_mismatch(self):
        res = self.client.get(self.api_path, headers={self.api_version_header: "0.0.0"})
        self.assertEqual(res.status_code, 400)
