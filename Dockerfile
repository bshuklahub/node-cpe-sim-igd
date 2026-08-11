# STAGE 1: Build the React Application
FROM node:24-slim AS builder
WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./
RUN npm install

# Copy all files and build the React app
COPY . .
RUN npm run build 
# This typically generates files in /app/dist

# STAGE 2: Production Server
FROM node:24-slim
WORKDIR /app

# Install only production dependencies for the Node server
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built React files from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the Node.js server source code
#COPY server.js ./
COPY . .

# Expose the application port
EXPOSE 5000

# Command to start your Node.js application
CMD ["npm", "start"]
