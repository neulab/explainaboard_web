# ExplainaBoard Web

This repository includes code for frontend and backend of the ExplainaBoard web application. The frontend is built with React and the backend uses Flask.

## Getting Started

> This step-by-step guide assumes a Linux environment. A MacOS environment will likely work similarly.

1.  Project Structure

    - frontend code structure is a lot more complicated than the backend so I decided to put all the backend code in an `api` directory. We can write scripts to start dev servers and build docker containers and run them with npm. That's another reason why I decided to put frontend code at the root and backend code in a folder.

    ```
    - api    # backend code (flask)
        - app # flask app
            - __init__.py  # flask app is initialized here
            - auth.py
            - config.py    # configuration goes here
            - db.py
        - tests
        - requirements.txt
    - public # static resources for frontend
    - src    # frontend code
        - haven't really written any frontend code so there is no structure for now
    - openapi
        - openapi.yaml # backend api specifications
    - .eslintignore
    - .eslintrc.json
    - .gitignore
    - .prettierignore
    - .prettierrc.json
    - package-lock.json # lock file for frontend dependencies
    - package.json # package config file for frontend
    - README.md
    - tsconfig.json # typescript config
    ```

2.  Setup dev environment for the frontend

    1. install `node v14.17.3`
       - The recommended way is to install [nvm](https://github.com/nvm-sh/nvm) ans use nvm to manage node versions.
       - Any v14+ should probably work fine.
       - Remember to run `nvm install-latest-npm` to get the latest version of npm.
       - verify the installation
       ```
       >> node --version
       >> v14.17.3
       >> npm --version
       >> 7.24.1
       ```
    2. install dependencies `npm install`
    3. start frontend dev server `npm start`
       - Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser. The page will reload if you make edits. You will also see any lint errors in the console.
    4. linter and formatter
       - eslint is used for linting. Please install eslint VSCode extension to get immediate feedback while writing code.
         - configurations can be found in `.eslintignore` and `.eslintrc.json`
         - `npm run lint` runs eslint in the commandline
       - prettier is used for formatting. Please install prettier VSCode extension and enable format on save to get the best results.
         - configurations can be found in `.prettierignore` and `.prettierrc.json`
       - linting and formatting is enforced automatically at the "pre-commit" stage with husky. Please do not skip it. If you find a rule particularly annoying, please post in Slack and we can remove it.
       - eslint and prettier should not be applied on the python code (backend). I should have already configured both of the tools to ignore python. Please let me know if you think something isn't working properly.
    5. testing
       - `npm test` Launches the test runner in the interactive watch mode. See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.
    6. build `npm run build`

       - You do not need to run this manually. It is handled automatically by the docker file.
       - Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.
       - See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

    7. Frontend is created with [Create React App](https://github.com/facebook/create-react-app).

       - a note about `npm run eject`
         **Note: this is a one-way operation. Once you `eject`, you can’t go back!**

         If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

         Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

         You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

       - You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

       - To learn React, check out the [React documentation](https://reactjs.org/).

3.  Setup dev environment for the backend
    1. install `python 3.9.7`
       - I just so happen to have this version, we can agree on another version if you think this is too low/high.
    2. `python -m venv api/venv`
    3. `pip install -r requirements.txt`
    4. enable pylint linting in IDE
    5. start backend server `npm run start-api`
       - Listens on port 5000. Frontend is configured to send all API requests to 5000 via a proxy.

## Deployment

- We use docker and gunicorn to deploy both frontend and backend. Frontend is built and copied into the static file folder of Flask. Please see Dockerfile for details.
- To build: `docker build --pull --rm -f "Dockerfile" -t explainaboard-web:0.1.0 "."`
- To run: `docker run --rm -p 3001:3001 explainaboard-web:0.1.0`
- We use 3001 to avoid conflict with dev server.
