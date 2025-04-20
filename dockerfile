FROM node:23-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

RUN mkdir ./defaults/
RUN mkdir ./defaults/images

RUN mkdir -p ./defaults/template/default \
    && mkdir -p ./defaults/template/theme2 \
    && mkdir -p ./defaults/plugins

# Copy folders
COPY ./template/default ./defaults/template/default
COPY ./template/theme2 ./defaults/template/theme2
COPY ./plugins ./defaults/plugins
COPY ./dracula.css ./
# COPY ./blog.conf ./defaults/
COPY ./index.js ./
COPY ./parser.js ./
COPY ./utils.js ./
COPY ./pluginConfigInterface.js ./
COPY ./pluginInterface.js ./
COPY ./pluginLoader.js ./

RUN ls ./
RUN ls ./defaults

# Create necessary directories and files
RUN mkdir -p /app/builtFiles /app/files && \
    touch /app/checksums.json && \
    echo "{}" > /app/checksums.json


# Set permissions for the app directory and files directory
RUN chmod -R 775 /app/builtFiles && \
    chmod -R 775 /app/files && \
    # chmod 664 /app/defaults/blog.conf && \
    chmod 664 /app/checksums.json

# add the stupid init script
# COPY init.sh /usr/local/bin/init.sh
# RUN chmod +x /usr/local/bin/init.sh

# ENTRYPOINT ["/usr/local/bin/init.sh"]

EXPOSE 3001

CMD ["node", "index.js"]
