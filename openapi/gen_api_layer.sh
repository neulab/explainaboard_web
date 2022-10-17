#!/bin/sh

# Generates API layer code for backend and frontend based on openapi.yaml

# abort the script if any errors occur
set -e
set -x

OPENAPI_PATH="openapi"
BACKEND_GEN_PATH="backend/src/gen"
FRONTEND_GEN_PATH="frontend/src/clients/openapi"

codegen_backend() {
    mkdir -p $BACKEND_GEN_PATH/explainaboard_web
    # we also create a link to src/impl in src/gen which contains our own implementation
    cd $BACKEND_GEN_PATH/explainaboard_web
    ln -sf ../../impl/ .
    cd ../../../..

    cp -f $OPENAPI_PATH/.swagger-codegen-ignore $BACKEND_GEN_PATH

    java -jar /opt/swagger-codegen-cli/swagger-codegen-cli.jar generate \
        -i $OPENAPI_PATH/openapi.yaml \
        -l python-flask \
        -o $BACKEND_GEN_PATH \
        -t backend/templates \
        -c $OPENAPI_PATH/swagger-codegen-config.json
}

codegen_frontend() {
    mkdir -p $FRONTEND_GEN_PATH
    cp -f $OPENAPI_PATH/.swagger-codegen-ignore $FRONTEND_GEN_PATH
    java -jar /opt/swagger-codegen-cli/swagger-codegen-cli.jar generate \
        -i $OPENAPI_PATH/openapi.yaml \
        -l typescript-fetch \
        -o $FRONTEND_GEN_PATH \
        -t $OPENAPI_PATH/ts_templates \
        -c $OPENAPI_PATH/swagger-codegen-config.json
}

codegen_backend
codegen_frontend
