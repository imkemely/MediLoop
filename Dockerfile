# Use a lightweight Node image
FROM node:22-alpine

# Work inside /app/server
WORKDIR /app/server

# Copy server package files and install prod deps
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the server code
COPY server/ .

# Set PORT and expose it (Railway also sets PORT)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["npm","start"]
