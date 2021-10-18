# Dockerfile to deploy frontend and backend using gunicorn
# FIX: This won't actually work in the deployment pipeline. We need to genearte 
# template code here. But I am leaving it for a future PR because we haven't 
# finished the code gen part for TS yet. 

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

RUN mkdir ./backend
COPY backend/src/gen/* ./backend/explainaboard
COPY backend/src/impl/* ./backend/explainaboard/impl
RUN pip install -r ./backend/explainaboard/requirements.txt

ENV FLASK_ENV production

# run server
EXPOSE 5000
WORKDIR /app/backend
ENTRYPOINT ["python3"]
CMD ["-m", "explainaboard"]
