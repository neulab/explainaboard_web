#!/bin/bash

set -e
set -x

readonly DOCKER_SWAGGER_CODEGEN_TAG="3.0.29"
readonly DOCKER_SWAGGER_CODEGEN="swaggerapi/swagger-codegen-cli-v3:${DOCKER_SWAGGER_CODEGEN_TAG}"

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
docker run -v "$(pwd)"/build:/workspace -w /workspace --rm --entrypoint /bin/sh \
    $DOCKER_SWAGGER_CODEGEN openapi/gen_api_layer.sh

# Step 3: Build Docker image
DOCKER_BUILDKIT=1 docker build -t eb-web:0.1 build
