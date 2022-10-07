# ExplainaBoard Web

This repository includes code for frontend and backend of the ExplainaBoard web
application. The frontend is built with React and the backend uses Flask.

[Contribution Guide](https://docs.google.com/document/d/1Pfpg1AnrrFHVBya2Io-W2a8wRFnY9V7nN8FEYSufqCE/edit#)

[Schema Design](https://docs.google.com/document/d/1my-zuIYosrXuoqOk1SvqZDsC2tdMgs_A7HTAtPYXKLI/edit?usp=sharing)

## Quick Start for Developers

> This step-by-step guide assumes a Linux environment. A MacOS environment will likely
  work similarly. For Windows users, the easiest way is to
> use a subsystem, for example [WSL](https://docs.microsoft.com/en-us/windows/wsl/about)
 (pre-installed since Windows 10).

1. Install `node` and `npm`

   - The recommended way is to install [nvm](https://github.com/nvm-sh/nvm) and use
     `nvm` to manage node versions. Run `nvm install` to install node and npm.

2. Install `java`. Verify that `java` is installed correctly in your environment by
   running `java --version`.

3. Generate code for API layer

   - Run `npm run gen-api-code` to generate code for api layer (both server and client).
     Please remember to run this whenever OpenAPI definition changes.

4. Setup dev environment for the frontend
   1. Install project dependencies `npm install`
   2. Install frontend dependencies `npm --prefix frontend install`. See
      [FAQ](#npm-install---prefix-frontend-says-we-have-x-vulnerabilities) when `npm`
      reports vulnerabilities.
5. Setup dev environment for the backend
   1. Install `python` version >= 3.9.7 and create a venv or conda environment for this project
   2. `pip install -r backend/src/gen/requirements.txt`
   3. Create `backend/src/impl/.env` to store all environment variables. An example has
      been provided in `.env.example`. Contact the dev team to get the credentials for
      dev and prod environments.
   4. Set up a GCP account and authenticate locally:
      - Contact the dev team to setup a GCP account with access to the dev bucket of
        Cloud Storage.
      - Install gcloud and then run `gcloud auth application-default login` to login to
        the user account locally. (for more information, see this
        [guide](https://cloud.google.com/docs/authentication/provide-credentials-adc#local-user-cred))
      - Set project by running `gcloud config set project inspired-app-eb-dev`
6. Install pre-commit hooks
   - Run `npm run prepare` to install the pre-commit hook via husky. The hook
     auto-checks both frontend and backend code before commits. Please do not skip it.
7. Launch explainaboard
   1. Run `npm run start` to start the frontend and backend server concurrently.
      - Both frontend and backend can be started independently as well. Check out
        "More details on frontend and backend".

## Important notes on local development

- As mentioned in quick start step 2, whenever the OpenAPI definition (`openapi.yaml`)
  changes, you must run `npm run gen-api-code` to regenerate code for the api layer.
- The frontend and backend dependencies must be reinstalled whenever the associated
  dependency files are changed, including `package.json`, `frontend/package.json`,
  `backend/requirements.txt`, `backend/src/gen/requirements.txt` (generated from
  `backend/templates/requirements.mustache`). `backend/requirements.txt` is the main
  requirements file to manage application specific dependencies.

- ExplainaBoard API client release depends on the API defined in `openapi.yaml`. If
  `openapi.yaml` is changed, remember to bump up the openapi version `0.2.x` as well.

## Deployment

- We use docker and gunicorn to deploy both frontend and backend. Frontend is built and
  copied into the static file folder of Flask. Please see `Dockerfile` for details.

- To build: `docker build --pull --rm -f "Dockerfile" -t explainaboard-web:0.2.0 "."`
- To run: `docker run --rm -p 5000:5000/tcp explainaboard-web:0.2.0`
- GCP:
  - For local development, developers should use their own user accounts to authenticate
    (please refer to quick start for details)
  - For staging and production environments, the service account credentials are passed
    into the containers as environment variables. The credentials are stored on AWS
    Secrets Manager.

## More details on frontend and backend

1. Frontend:

   1. To start frontend dev server only, run `npm run start-frontend`
      - Runs the app in the development mode. Open
        [http://localhost:3000](http://localhost:3000) to view it in the browser. The
        page will reload if you make edits. You will also see any lint errors in the
        console.
   2. linter and formatter
      - eslint is used for linting. Please install eslint VSCode extension to get
        immediate feedback while writing code.
        - configurations can be found in `.eslintignore` and `.eslintrc.json`
        - `npm run lint` runs eslint in the commandline
      - prettier is used for formatting. Please install prettier VSCode extension and
        enable format on save to get the best results.
        - configurations can be found in `.prettierignore` and `.prettierrc.json`
      - linting and formatting is enforced automatically at the "pre-commit" stage with
        husky. Please do not skip it. If you find a rule particularly annoying, please
        post in Slack and we can remove it.
      - eslint and prettier should not be applied on the python code (backend). I should
        have already configured both of the tools to ignore python. Please let me know
        if you think something isn't working properly.
   3. Testing
      - `npm test` launches the test runner in the interactive watch mode. See the
        section about
        [running tests](https://facebook.github.io/create-react-app/docs/running-tests)
        for more information.
   4. Build `npm run build`

      - You do not need to run this manually. It is handled automatically by the `Dockerfile`.
      - Builds the app for production to the `build` folder. It correctly bundles React
        in production mode and optimizes the build for the best performance.
      - See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment)
        for more information.

   5. Frontend is created with [Create React App](https://github.com/facebook/create-react-app).

      - A note about `npm run eject`
        **Note: this is a one-way operation. Once you `eject`, you can’t go back!**

        If you aren’t satisfied with the build tool and configuration choices, you can
        `eject` at any time. This command will remove the single build dependency from
        your project.

        Instead, it will copy all the configuration files and the transitive
        dependencies (webpack, Babel, ESLint, etc) right into your project so you have
        full control over them. All of the commands except `eject` will still work, but
        they will point to the copied scripts so you can tweak them. At this point
        you’re on your own.

        You don’t have to ever use `eject`. The curated feature set is suitable for
        small and middle deployments, and you shouldn’t feel obligated to use this
        feature. However we understand that this tool wouldn’t be useful if you couldn’t
        customize it when you are ready for it.

      - You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

      - To learn React, check out the [React documentation](https://reactjs.org/).

2. Backend

   1. To start backend server only, run `npm run start-backend`
      - Listens on port 5000. Frontend is configured to send all API requests to 5000
        via a proxy.
      - Any code not in `impl` is generated. If you want to modify the generated code,
        you need to modify the mustache templates.
   2. For details of the backend, please refer to [backend/README.md](backend/README.md).

## Project Structure

```text
- .husky # for running pre-commit checks
- openapi
   - openapi.yaml # api specifications
   - gen_api_layer.sh # script to generate client and server code according to openapi specifications
   - swagger-codegen-config.json # config file for swagger(openapi) code gen

- frontend
   - public # static resources for frontend
   - src    # frontend code
      - clients # all clients (backend, oauth login, etc.)
         - index.ts # all generated clients are exported here
   - .eslintignore
   - .eslintrc.json
   - .prettierrc.json
   - package-lock.json # lock file for frontend dependencies
   - package.json # package config file for frontend
   - tsconfig.json # typescript config

- backend
   - templates # mustache templates to generate template code
   - requirements.txt
   - src
      - gen # template code generated with openapi, code in this folder should not be
            # modified manually
         - requirements.txt
         - explainaboard
            - __main__.py
            - controllers
            - test
            - models
            - impl # a sympolic link to the impl folder, any edition made here will
                   # "reflect" on the impl folder
      - impl # our implementation of the apis

- .gitignore
- README.md
- Dockerfile
- package.json # package config file for global dependencies and commands
- package-lock.json # lock file for global dependencies
```

## FAQ

### `npm install --prefix frontend` says we have x vulnerabilities

Solution: Run `npm audit --prefix frontend --production`. If it says 0 vulnerabilities,
we are fine.

Reason: We use create react app for frontend, and the `react-scripts` dependency in
`frontend/package.json` is causing these false alarms.
[Here's](https://github.com/facebook/create-react-app/issues/11174) the moderator of
create react app explaining why 99.9% of the vulnerability reports in react-scripts are
false positives and how to fix them.

## Credits/Contributing

This software was initially developed by Lyuyang Hu, Chih-Hao Wang, Pengfei Liu, and
Graham Neubig, a collaborative effort of Carnegie Mellon University and Inspired
Cognition Inc.
We highly welcome questions, issues, and pull requests. Please get in contact through
github issues above.
