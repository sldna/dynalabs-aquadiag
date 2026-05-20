FROM golang:1.25-alpine AS build

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./

RUN CGO_ENABLED=0 go build -o /api ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget

COPY --from=build /api /usr/local/bin/api
COPY rules /app/rules
COPY backend/config /app/config

ENV BACKEND_PORT=8080
ENV RULES_PATH=/app/rules/aquarium-rules.yaml
ENV WATER_TEST_CONFIG_DIR=/app/config

EXPOSE 8080

USER nobody

ENTRYPOINT ["/usr/local/bin/api"]
