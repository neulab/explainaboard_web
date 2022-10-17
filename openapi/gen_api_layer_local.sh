#!/bin/bash
set -e

readonly DOCKER_SWAGGER_CODEGEN_TAG="3.0.29"
readonly DOCKER_SWAGGER_CODEGEN="swaggerapi/swagger-codegen-cli-v3:${DOCKER_SWAGGER_CODEGEN_TAG}"

docker run -v "$(pwd)":/workspace -w /workspace --rm --entrypoint /bin/sh \
    $DOCKER_SWAGGER_CODEGEN openapi/gen_api_layer.sh
