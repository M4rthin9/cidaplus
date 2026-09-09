# Production runtime image.
#
# This image does NOT build the app. It copies a standalone output produced
# beforehand, which is deliberate on two counts:
#
#  1. SPEC.md §2 and §11: "A production Next.js build alongside Postgres will
#     OOM on that box — build images in CI and pull them." Nothing on the VPS
#     ever runs `next build`.
#  2. `next build` prerenders pages that read the catalog, so it needs a
#     reachable database. In CI that is a service container the *job* can see;
#     a `docker build` runs in its own network and cannot. Building in the job
#     and packaging the result here avoids threading a database into the image
#     build at all.
#
# `.github/workflows/release.yml` is the only supported producer. Building by
# hand: `pnpm build` first, then `docker build .`.
FROM node:22-alpine AS runtime

# `output: "standalone"` bundles the server and its dependencies but does NOT
# copy `.next/static` or `public/` (measured in phase 3). Without both beside
# server.js every asset 404s and the app runs unhydrated.
ARG STANDALONE=.next/standalone
ARG STATIC=.next/static
ARG PUBLIC=public

WORKDIR /app

# sharp needs libc++ for its prebuilt binaries on alpine; without it the media
# pipeline throws on the first upload rather than at boot, which is worse.
RUN apk add --no-cache libstdc++ curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nextjs -G nodejs

COPY --chown=nextjs:nodejs ${STANDALONE} ./
COPY --chown=nextjs:nodejs ${STATIC} ./.next/static
COPY --chown=nextjs:nodejs ${PUBLIC} ./public

# The media volume is mounted here; the directory must exist and be writable by
# the app user before the volume is attached, or uploads fail with EACCES.
RUN mkdir -p /data/media && chown -R nextjs:nodejs /data

USER nextjs

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

# Not `pnpm start`: the standalone output is a self-contained server.js with its
# own node_modules, and pnpm is not installed in this image.
CMD ["node", "server.js"]
