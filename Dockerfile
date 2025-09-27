FROM node:22-alpine

# Work inside /app/server
WORKDIR /app/server

# Only copy server package files first (better layer caching)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Now copy the rest of the server code
COPY server/ .

# Railway provides PORT; your code already respects process.env.PORT
ENV PORT=8080
EXPOSE 8080

CMD ["npm","start"]
