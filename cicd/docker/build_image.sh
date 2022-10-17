#!/bin/bash

set -e
set -x

mkdir -p build
mkdir -p build/deployment
mkdir -p build/openapi
mkdir -p build/frontend
mkdir -p build/backend
#mkdir -p build/python_client

cp -a Dockerfile build
cp -a deployment/* build/deployment

cp -a openapi/* build/openapi
cp -a openapi/.swagger-codegen-ignore build/openapi

cp -a backend/* build/backend

# copy frontend files except node_modules
cp frontend/.eslint* build/frontend
cp frontend/.nvmrc build/frontend
cp frontend/.prettier* build/frontend
cp -a frontend/src build/frontend
cp -a frontend/public build/frontend
cp -a frontend/*.json build/frontend

# Step 2: Generate code.
(cd build && openapi/gen_api_layer_local.sh)

# Step 3: Build Docker image
DOCKER_BUILDKIT=1 docker build -t eb-web:0.1 build
