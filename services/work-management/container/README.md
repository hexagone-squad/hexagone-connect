# Work-management container POC

> **POC / TRAINING / NOT FOR PRODUCTION**

Build and smoke test from the repository root:

```bash
docker build --pull -t hexagone/work-management:poc services/work-management
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges -p 3000:3000 hexagone/work-management:poc
curl --fail http://127.0.0.1:3000/health/live
curl --fail http://127.0.0.1:3000/health/ready
```

## Refreshing the pinned base image

To refresh the base image, inspect the intended version with `docker buildx imagetools inspect node:22.23.2-alpine3.23` and record its manifest SHA-256 digest. Update the Dockerfile using both the readable version tag and verified digest.

Rebuild with `docker build --pull --no-cache -t hexagone/work-management:poc services/work-management`. Then run the focused governance tests, hardened runtime smoke test, SBOM generation, and HIGH/CRITICAL Trivy scan.

A digest update is a reviewed dependency change. Do not replace the digest with an unverified mutable tag.

This readiness-only process does not claim database or downstream readiness.
Production needs an approved registry, digest pinning, provenance/signing,
patching, secrets management, and centralized telemetry.
