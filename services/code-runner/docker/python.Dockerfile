# Pinned Python Execution Image (FR-CODE-001, FR-CODE-007, SRS 10.4)
FROM python:3.11.8-alpine3.19

RUN addgroup -g 10001 -S sandbox \
    && adduser -u 10001 -S sandbox -G sandbox -s /sbin/nologin

USER sandbox:sandbox
WORKDIR /tmp
