# ExplainaBoard Web Backend

This folder includes code for backend of the ExplainaBoard web application. 

## Getting Started

1.  Project Structure

    ```
    - src/
        - gen/ # code generated using swagger. DO NOT edit anything here. gitignored.
        - impl/ # our own code and implementations.
    - templates # flask templates used by swagger to generate code under gen/.
    - gen.sh # handy script to generate code under gen/
    - openapi.yaml # backend api specifications
    - README.md
    - swagger-codegen-cli-3.0.29.jar # swagger codegen tool. auto-downloaded in gen.sh. gitignored.
    - swagger-codegen-config.json # swagger codegen config
    ```

2.  Usage

    1. Running `bash gen.sh` generates python flask server code under `src/gen/`

    2. Refer to `src/gen/README.md` to start the server. Alternatively, run `npm run start-backend` in the repo root directory (one level above here.)

## Developer Guide

### Swagger code generation process
There are three main components used in code generation:
1. swagger codegen cli (in `.jar` format): The swagger tool for code generation.

2. `openapi.yaml`: The api specification that swagger reads to generate corresponding code.

3. `.mustache` files under `templates/`: Template files are used to generate the actual files under `src/gen` by swagger. E.g., `templates/README.mustache` -> `src/gen/README.md`, `templates/model.mustache` -> the `.py` files under `src/gen/models.`

We can edit `openapi.yaml` and the template `.mustache` files to customize the generated code.

### Separation of generated code and our own code
**Issue:**

Because the generated code under `src/gen` is only a skeleton, it does not contain details such as core logic, db connections, etc. This means we must add our own code. However, after adding our code, if we modify the openapi schema (e.g. add a new api path) and re-generate, we will end up overwriting our existing code.

**Solution:**

To separate the generated code and our own code, we follow an approach similar to [this answer on stackoverflow](https://stackoverflow.com/questions/45680298/cleanest-way-to-glue-generated-flask-app-code-swagger-codegen-to-backend-imple/47554626#47554626):

1. store all generated code under `src/gen` and our own code under `src/impl`.
2. create a symbolic link to `src/impl` under `src/gen/explainaboard` every time in code generation. See `gen.sh` for details.
3. In `templates/controller.mustache`, add 

```import {{packageName}}.impl.default_controllers_impl as default_controllers_impl```  

to import `src/impl/default_controllers_impl.py`, which contains our own logic for handling requests. 

4. In `templates/controller.mustache`, add  

```return default_controllers_impl.{{operationId}}({{#parameters}}{{paramName}}{{^required}}=None{{/required}}{{#hasMore}}, {{/hasMore}}{{/parameters}})```

such that it calls our own function and passes in the request parameters.

### Design choices
1. swagger code generator
TBD
