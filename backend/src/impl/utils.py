import base64
import pickle
from typing import Any

from bson.binary import Binary
from flask import abort, jsonify


def abort_with_error_message(status_code: int, err_message: str, err_code=-1):
    """
    abort with a status code, an error code and a message
    Parameters:
      - status_code: HTTP status code
      - detail: error message
      - err_code: an error code to give more detailed information. Default is -1. An
      example usage is: return xxxxx as err_code when a username is taken. This allows
      the client to gracefully handle the exception.
    """
    response = jsonify({"error_code": err_code, "detail": err_message})
    response.status_code = status_code
    abort(response)


def decode_base64(encoded: str) -> str:
    """convert a base64 encoded string to string"""
    return base64.b64decode(encoded).decode("utf-8")


# TODO(chihhao) consider moving to SDK?
def binarize_bson(data: Any) -> Binary:
    """convert data to BSON binary data"""
    return Binary(pickle.dumps(data, protocol=2))


def unbinarize_bson(data: Binary) -> Any:
    return pickle.loads(data)
