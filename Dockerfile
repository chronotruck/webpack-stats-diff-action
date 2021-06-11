FROM node:10.9.0 as base

WORKDIR /app

RUN npm install -g npm@6.9.0

COPY package.json package-lock.json ./

RUN npm ci

FROM base as build

COPY . .

RUN npm run build

FROM node:10.9.0-alpine as release

WORKDIR /

COPY --from=build /app/dist/index.js ./index.js

COPY package.json package-lock.json ./

RUN npm ci --production

ENTRYPOINT ["node", "/index.js"]
