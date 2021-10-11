# reference: https://stackoverflow.com/a/47554626

if [ ! -f swagger-codegen-cli-3.0.29.jar ]; then
    wget https://repo1.maven.org/maven2/io/swagger/codegen/v3/swagger-codegen-cli/3.0.29/swagger-codegen-cli-3.0.29.jar -O swagger-codegen-cli-3.0.29.jar
fi

mkdir -p src-gen/explainaboard && \
cd src-gen/explainaboard/ && \
ln -sf src/server_impl/ && \
cd ../../ && \
java -jar swagger-codegen-cli-3.0.29.jar generate \
    -i ../src/openapi.yaml \
    -l python-flask \
    -o src-gen \
    -t templates \
    -DpackageName=explainaboard
