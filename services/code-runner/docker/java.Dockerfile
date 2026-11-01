# Pinned Java Execution Image (FR-CODE-001, FR-CODE-007, SRS 10.4)
FROM eclipse-temurin:21.0.2_13-jdk-alpine

RUN addgroup -g 10001 -S sandbox \
    && adduser -u 10001 -S sandbox -G sandbox -s /sbin/nologin

USER sandbox:sandbox
WORKDIR /tmp
