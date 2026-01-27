FROM node:18-alpine AS base

RUN apk upgrade
RUN apk update
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json .
RUN npm install

COPY index.js .

CMD ["npm", "start"] 