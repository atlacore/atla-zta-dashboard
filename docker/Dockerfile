FROM node:22-alpine AS builder

WORKDIR /src
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM alpine:3.21

RUN apk add --no-cache bash curl less ca-certificates git tzdata zip gettext \
    nginx curl supervisor certbot-nginx && \
    rm -rf /var/cache/apk/* && mkdir -p /run/nginx

STOPSIGNAL SIGINT
EXPOSE 80
EXPOSE 443
ENTRYPOINT ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]

WORKDIR /usr/share/nginx/html
# copy configuration files
COPY docker/default.conf /etc/nginx/http.d/default.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/init_cert.sh /usr/local/init_cert.sh
COPY docker/init_react_envs.sh /usr/local/init_react_envs.sh
RUN chmod +x /usr/local/init_cert.sh && rm /etc/crontabs/root
RUN chmod +x /usr/local/init_react_envs.sh

# configure supervisor
COPY docker/supervisord.conf /etc/supervisord.conf
# copy build files
COPY --from=builder /src/out/ /usr/share/nginx/html/
