# ExplainaBoard Web Backend

This folder includes code for backend of the ExplainaBoard web application.

## Getting Started

1. Project Structure

    ```text
    - src/
        - gen/ # code generated using swagger. DO NOT edit anything here. gitignored.
        - impl/ # our own code and implementations.
    - templates # flask templates used by swagger to generate code under gen/.
    - README.md
    ```

2. Usage

    1. Run `npm run gen-api-code` to generate python flask server code under `src/gen/`

    2. Refer to `src/gen/README.md` to start the server. Alternatively, run
       `npm run start-backend` in the repo root directory (one level above here.)

## Developer Guide

### Swagger code generation process

There are three main components used in code generation:

1. swagger codegen cli (in `.jar` format): The swagger tool for code generation.

2. `openapi.yaml`: The api specification that swagger reads to generate corresponding code.

3. `.mustache` files under `templates/`: Template files are used to generate the actual
   files under `src/gen` by swagger. E.g.,
   `templates/README.mustache` -> `src/gen/README.md`,
   `templates/model.mustache` -> the `.py` files under `src/gen/models.`

We can edit `openapi.yaml` and the template `.mustache` files to customize the generated
code.

### Separation of generated code and our own code

**Issue:**

Because the generated code under `src/gen` is only a skeleton, it does not contain
details such as core logic, db connections, etc. This means we must add our own code.
However, after adding our code, if we modify the openapi schema
(e.g. add a new api path) and re-generate, we will end up overwriting our existing code.

**Solution:**

To separate the generated code and our own code, we follow an approach similar to
[this answer on stackoverflow](https://stackoverflow.com/questions/45680298/cleanest-way-to-glue-generated-flask-app-code-swagger-codegen-to-backend-imple/47554626#47554626):

1. store all generated code under `src/gen` and our own code under `src/impl`.
2. create a symbolic link to `src/impl` under `src/gen/explainaboard` every time in code
   generation. See `openapi/gen_api_layer.sh` for details.
3. In `templates/controller.mustache`, add
   ```import {{packageName}}.impl.default_controllers_impl as default_controllers_impl```
   to import `src/impl/default_controllers_impl.py`, which contains our own logic for
   handling requests.

4. In `templates/controller.mustache`, add

   ```python
   return default_controllers_impl.{{operationId}}(
       {{#parameters}}{{paramName}}{{^required}}=None{{/required}}{{#hasMore}}, {{/hasMore}}{{/parameters}}
   )
   ```

   such that it calls our own function and passes in the request parameters.

## Python Client

A python client is generated based on openapi.yaml and it is released as
`explainaboard_api_client` on PyPI. We also maintain a thin wrapper for the client
`explainaboard_client` ([source code](https://github.com/neulab/explainaboard_client)).
Users generally use the wrapper package because it handles low level configurations for
them.

- version: determined by `info.version` in openapi.yaml. Please remember to update the
  version whenever you change the openapi definition. If openapi.yaml is modified but
  the version number has been used in an old version, "Python API Client Release" will
  fail to flag that error.
- codegen tool: [openapi generator](https://github.com/OpenAPITools/openapi-generator)
  5.4.0. We use a different codegen tool for the python client from the backend (flask)
  and the TS client because openapi generator provides better support for generating
  python clients. We plan to migrate to openapi generator for all languages/frameworks
  in the future because it provides much better documentation and more features.
- template: stored in `openapi/python_client_urllib3_templates`. We only applied minor
  modifications (better type hint) to the template provided by openapi generator. The
  original template can be fetched with
  `java -jar openapi-generator-cli.jar author template -g python`. When openapi
  generator release a new version of the template, we can merge our version with theirs.
  - two options are available for python clients: `python` and `python-experimental`.
    `python-experimental` provides better typing but it is buggy and difficult to work
    with. So, currently, we use the `python` template. There's limited type hint but
    it's relatively easy to figure out the input and outputs from the docstrings.
  - generated code follows the following structure:

    ```text
    - /docs: documentation for each data structure and API
    - /explainaboard_api_client:
      - /api
        - default_api.py  # implements all the endpoints specified in openapi.yaml
      - /model            # implements all the data structures
      - /models           # exports all models defined in /model
      - api_client.py     # implements the base API client (async&sync requests, error
                          # handling, etc.); used by default_api.py
      - configuration.py  # configurations for api_client (auth, hostname, etc.)
      - exceptions.py     # client exceptions
    ```
