# reference: https://stackoverflow.com/a/47554626

# cd to the directory gen.sh lives in
cd "$(dirname "${BASH_SOURCE[0]}")" 

# download codegen cli if not exists
if [ ! -f swagger-codegen-cli-3.0.29.jar ]; then
    wget https://repo1.maven.org/maven2/io/swagger/codegen/v3/swagger-codegen-cli/3.0.29/swagger-codegen-cli-3.0.29.jar -O swagger-codegen-cli-3.0.29.jar
fi

# remove src/gen if exists and generate code
# we also create a link to src/impl in src/gen which contains our own implementation 
rm -rf src/gen && \
mkdir -p src/gen/explainaboard && \
cd src/gen/explainaboard/ && \
ln -sf ../../impl/ && \
cd ../../../ && \
java -jar swagger-codegen-cli-3.0.29.jar generate \
    -i openapi.yaml \
    -l python-flask \
    -o src/gen \
    -t templates \
    -c swagger-codegen-config.json