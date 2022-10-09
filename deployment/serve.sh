#!/bin/bash
# Starts nginx and gunicorn. It is meant for the explainaboard_web
# container only. The script takes any number of gunicorn arguments
# passed in as a string.

nohup nginx -g "daemon off;" & gunicorn -b 0.0.0.0:5000 -t 600 "explainaboard_web.__main__:create_app()" "$1"
