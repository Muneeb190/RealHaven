# Use the official Node.js runtime as parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install backend dependencies
COPY backend/package*.json ./backend/
RUN npm install --prefix backend

# Copy backend source code
COPY backend/ ./backend/

# Expose port (Hugging Face requires the app to listen on port 7860)
EXPOSE 7860
ENV PORT=7860

# Run the backend app
CMD ["npm", "start", "--prefix", "backend"]
