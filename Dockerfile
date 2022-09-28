# This Dockerfile builds an image that serves both the
# frontend and the backend

# Step #1: build the React front end
FROM node:14-bullseye-slim as build-step
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
RUN apt-get update && apt-get install -y default-jre wget
RUN mkdir ./frontend
COPY ./frontend/package.json ./frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm install -g npm@8.5.4
RUN npm install

WORKDIR /app
COPY ./frontend ./frontend
COPY ./openapi ./openapi
RUN chmod a+x ./openapi/gen_api_layer.sh
RUN /bin/bash ./openapi/gen_api_layer.sh frontend

WORKDIR /app/frontend
RUN npm run build


# Step #2: build the API with the client as static files
FROM python:3.9-slim-bullseye
RUN apt-get update && apt-get install -y default-jre wget nginx

WORKDIR /app
RUN python3 -m pip install --upgrade pip
RUN pip install gunicorn

COPY ./backend ./backend
COPY ./openapi ./openapi
RUN chmod a+x ./openapi/gen_api_layer.sh
RUN /bin/bash ./openapi/gen_api_layer.sh backend

RUN pip install -r ./backend/requirements.txt

# Step #3: configure nginx and flask
WORKDIR /app/backend/src/gen
# Run app in production mode by default. Override this env to run in
# development or in staging
ENV FLASK_ENV production

COPY --from=build-step /app/frontend/build /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/sites-enabled/default
COPY deployment/serve.sh .
RUN chmod a+x ./serve.sh

# run server
EXPOSE 80
ENTRYPOINT ["./serve.sh"]
# Run with single core by default. Override this to run with more
# workers. It is also possible to pass it any number of gunicorn
# arguments.
CMD ["-w 1"]
