import argparse
import copy

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from flask import Flask

"""
This is a utility script that can be used to update the schema of the database when
necessary. Because each case will be different it is left as unimplemented with just
the example of an identity transformation over the system info DB.
"""


def modify_entry(entry_in):
    entry_out = copy.deepcopy(entry_in)
    entry_out["metric_stats"] = []
    print(entry_out)
    # Make any modifications here
    return entry_out


def main():
    parser = argparse.ArgumentParser("Make systematic modifications to the DB")
    parser.add_argument("--uri", help="URI of the database")
    parser.add_argument("--username", required=True, type=str, help="DB username")
    parser.add_argument("--password", required=True, type=str, help="DB password")
    parser.add_argument(
        "--actually_update",
        action="store_true",
        help="Whether to actually update or not",
    )
    args = parser.parse_args()

    app = Flask(__name__)
    with app.app_context():
        app.config["DATABASE_URI"] = args.uri
        app.config["DB_USERNAME"] = args.username
        app.config["DB_PASSWORD"] = args.password
        entries, total = DBUtils.find(DBUtils.DEV_SYSTEM_METADATA, limit=0)
        for entry in entries:
            new_entry = modify_entry(entry)
            # print(new_entry)
            if args.actually_update:
                DBUtils.replace_one_by_id(DBUtils.DEV_SYSTEM_METADATA, new_entry)


if __name__ == "__main__":
    main()
