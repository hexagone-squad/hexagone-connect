# POC / TRAINING / NOT FOR PRODUCTION.
FROM node:22.23.2-alpine3.23
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --chown=node:node container ./container
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=2s --start-period=3s --retries=5 CMD ["node", "container/healthcheck.mjs", "/health/ready"]
CMD ["node", "container/server.mjs"]
