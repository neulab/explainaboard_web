# reference: https://stackoverflow.com/a/47554626

mkdir -p src-gen/explainaboard && \
cd src-gen/explainaboard/ && \
ln -sf src/server_impl/ && \
cd ../../ && \
java -jar swagger-codegen-cli.jar generate \
    -i ../src/openapi.yaml \
    -l python-flask \
    -o src-gen \
    -t templates \
    -DpackageName=explainaboard
