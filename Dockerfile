FROM node:22-alpine
WORKDIR /app
# Tahap 13: utilitas backup/pemulihan (age + klien PostgreSQL) dipasang di image.
RUN apk add --no-cache age postgresql17-client tar gzip
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
