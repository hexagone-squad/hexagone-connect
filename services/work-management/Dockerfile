# POC / TRAINING / NOT FOR PRODUCTION.
FROM node:22.23.2-alpine3.23@sha256:46825fbbd4e996a78b7a2cdc08d75e38a5a505bdab95dcda55605359bf124bc6
ENV NODE_ENV=production PORT=3000
# Runtime invokes Node directly; remove unused npm tooling and its dependency surface.
RUN apk upgrade --no-cache
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
COPY --chown=node:node container ./container
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=2s --start-period=3s --retries=5 CMD ["node", "container/healthcheck.mjs", "/health/ready"]
CMD ["node", "container/server.mjs"]
