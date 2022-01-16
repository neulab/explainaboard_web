# Dockerfile to deploy frontend and backend

# Build step #1: build the React front end
FROM node:14-bullseye-slim as build-step
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
RUN apt-get update && apt-get install -y default-jre wget
RUN mkdir ./frontend
COPY ./frontend/package.json ./frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm install

WORKDIR /app
COPY ./frontend ./frontend
COPY ./openapi ./openapi
RUN chmod a+x ./openapi/gen_api_layer.sh
RUN /bin/bash ./openapi/gen_api_layer.sh frontend

WORKDIR /app/frontend
RUN npm run build


# Build step #2: build the API with the client as static files
FROM python:3.9-slim-bullseye
RUN apt-get update && apt-get install -y default-jre wget

WORKDIR /app
COPY ./backend ./backend
COPY ./openapi ./openapi
RUN chmod a+x ./openapi/gen_api_layer.sh
RUN /bin/bash ./openapi/gen_api_layer.sh backend

RUN pip install -r ./backend/src/gen/requirements.txt

WORKDIR /app/backend/src/gen
ENV FLASK_ENV production
COPY --from=build-step /app/frontend/build ./frontend

# run server
EXPOSE 5000
ENTRYPOINT ["python3"]
CMD ["-m", "explainaboard_web"]
