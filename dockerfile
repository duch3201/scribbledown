FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY /template ./template
COPY /plugins ./plugins
COPY dracula.css ./
COPY blog.conf ./
COPY index.js ./

# Create necessary directories and files
RUN mkdir -p /app/builtFiles /app/files && \
    touch /app/checksums.json && \
    echo "{}" > /app/checksums.json


# Set permissions for the app directory and files directory
RUN chmod -R 775 /app/builtFiles && \
    chmod -R 775 /app/files && \
    chmod 664 /app/blog.conf && \
    chmod 664 /app/checksums.json

RUN ls -l /app/files

RUN ls -l .


EXPOSE 3001

CMD ["node", "index.js"]
