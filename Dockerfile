# Two stages on Node LTS: build the web export (app + API routes), then run it with
# only production dependencies. All config comes from the environment (Fly secrets);
# expo-server does not load .env files.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server.js ./
USER node
EXPOSE 8080
CMD ["node", "server.js"]
