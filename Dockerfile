# Dockerfile to deploy frontend and backend using gunicorn

# Build step #1: build the React front end
FROM node:14-alpine3.14 as build-step
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json package-lock.json ./
COPY ./src ./src
COPY ./public ./public
RUN npm install
RUN npm run build

# Build step #2: build the API with the client as static files
FROM python:3.9
WORKDIR /app
COPY --from=build-step /app/build ./frontend

RUN mkdir ./api
COPY api/requirements.txt ./api
RUN mkdir ./api/app
COPY api/app/* ./api/app
RUN pip install -r ./api/requirements.txt
RUN pip install gunicorn==20.1.0
ENV FLASK_ENV production

EXPOSE 3001
WORKDIR /app/api
# dev server uses 3000 so we use 3001 here to make it easier for developers to test locally
CMD ["gunicorn", "-b", ":3001", "app:create_app()"]
