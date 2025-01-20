FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json .
ARG PORT
EXPOSE ${PORT}

FROM base AS prod
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm","run","start:prod"]

FROM base AS dev
RUN npm install
COPY . .
RUN npm run build
CMD ["npm","run","start:dev"]