# Pinned C Execution Image (FR-CODE-001, FR-CODE-007, SRS 10.4)
FROM alpine:3.19.1

RUN apk add --no-cache gcc=13.2.1_git20231014-r0 musl-dev=1.2.4_git20230717-r4 \
    && addgroup -g 10001 -S sandbox \
    && adduser -u 10001 -S sandbox -G sandbox -s /sbin/nologin

USER sandbox:sandbox
WORKDIR /tmp
