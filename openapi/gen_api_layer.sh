# Generates API layer code for backend and frontend based on openapi.yaml
# reference: https://stackoverflow.com/a/47554626

# abort the script if any errors occur
set -e

# three modes: generate frontend only, backend only and both
mode=$1
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
project_root=`dirname $script_dir`

OPENAPI_PATH="openapi"
BACKEND_GEN_PATH="backend/src/gen"
FRONTEND_GEN_PATH="frontend/src/clients/openapi"

# download codegen cli if not exists
cd $script_dir
if [ ! -f swagger-codegen-cli-3.0.29.jar ]; then
    wget https://repo1.maven.org/maven2/io/swagger/codegen/v3/swagger-codegen-cli/3.0.29/swagger-codegen-cli-3.0.29.jar -O swagger-codegen-cli-3.0.29.jar
fi


# backend
if [[ $mode == "backend" || $mode == "project" ]]; then
    # remove src/gen if exists and generate code
    # we also create a link to src/impl in src/gen which contains our own implementation 
    cd $project_root && rm -rf $BACKEND_GEN_PATH && \
    mkdir -p $BACKEND_GEN_PATH/explainaboard_web && \
    cd $BACKEND_GEN_PATH/explainaboard_web/ && \
    ln -sf ../../impl/ && \
    cd ../../../.. && \
    java -jar $OPENAPI_PATH/swagger-codegen-cli-3.0.29.jar generate \
        -i $OPENAPI_PATH/openapi.yaml \
        -l python-flask \
        -o $BACKEND_GEN_PATH \
        -t backend/templates \
        -c $OPENAPI_PATH/swagger-codegen-config.json

    # Couldn't find a way to omit these default files from the templates so manully remove them
    cd $BACKEND_GEN_PATH && \
    rm Dockerfile .gitignore .travis.yml git_push.sh tox.ini test-requirements.txt .dockerignore setup.py
fi


# frontend
if [[ $mode == "frontend" || $mode == "project" ]]; then
    cd $project_root && rm -rf $FRONTEND_GEN_PATH && \
    java -jar $OPENAPI_PATH/swagger-codegen-cli-3.0.29.jar generate \
        -i $OPENAPI_PATH/openapi.yaml \
        -l typescript-fetch \
        -o $FRONTEND_GEN_PATH \
        -t $OPENAPI_PATH/ts_templates \
        -c $OPENAPI_PATH/swagger-codegen-config.json
    cd $FRONTEND_GEN_PATH && \
    rm git_push.sh .gitignore
fi