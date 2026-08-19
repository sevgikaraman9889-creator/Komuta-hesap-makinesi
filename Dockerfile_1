FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# npm bundles its own copy of the "tar" package, which on this base image
# contains a CRITICAL CVE (CVE-2026-59873). The app itself never uses npm at
# runtime (it's started directly with `node server.js`), so remove npm/npx
# and their bundled dependencies entirely to drop the vulnerable package from
# the final image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
USER 1001
CMD ["node", "server.js"]
