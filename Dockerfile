FROM node:20-alpine

WORKDIR /application

RUN apk update && apk upgrade && apk add git

RUN npm install -g npm pm2

ARG RUNTIME_USER=postlight

RUN adduser -D ${RUNTIME_USER}

RUN mkdir -p /home/${RUNTIME_USER} \
    && chown ${RUNTIME_USER}:${RUNTIME_USER} /home/${RUNTIME_USER} \
    && chown ${RUNTIME_USER}:${RUNTIME_USER} /application

USER ${RUNTIME_USER}

COPY package.json .

RUN npm install --no-devs \
    && npm cache clean --force

COPY pm2.json .
COPY src      src
COPY VERSION  .

CMD [ "pm2-runtime", "start", "pm2.json" ]
